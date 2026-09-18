import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody, rateLimit } from "@/lib/session"

export const runtime = "nodejs"

/**
 * POST /api/admin/email-campaign — send a campaign email to an audience.
 *
 * Replaces the previous fake client-side implementation (a setTimeout +
 * success toast in admin-email-campaign.tsx) with a real send:
 *   - Admin-gated + rate limited.
 *   - Audience query runs against the User table.
 *   - Sends via the shared SMTP transporter (lib/email) best-effort per
 *     recipient; every attempt is recorded in EmailLog (status sent/failed).
 *   - Template variables: {{name}}, {{email}}.
 *
 * Body: { subject, body, audience: "all" | "students" | "instructors" | "admins" | "school_admins", testMode?: boolean }
 *
 * Returns: { sent, failed, total, log: [{ email, status }] }
 */

const AUDIENCE_ROLES: Record<string, string[]> = {
  all: [],
  students: ["STUDENT"],
  instructors: ["INSTRUCTOR"],
  admins: ["ADMIN", "SUPER_ADMIN"],
  school_admins: ["SCHOOL_ADMIN"],
}

const MAX_RECIPIENTS = 5000

export const POST = withErrorHandler(async (req: NextRequest) => {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  if (!rateLimit(`email-campaign:${admin.id}`, { max: 5, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many campaign requests" }, { status: 429 })
  }

  const parsed = await readJsonBody<{
    subject?: string
    body?: string
    audience?: string
    testMode?: boolean
  }>(req, { maxBytes: 256 * 1024 })
  if (parsed.error || !parsed.data) return parsed.error ?? NextResponse.json({ error: "Invalid body" }, { status: 400 })
  const { subject, body, audience = "all", testMode } = parsed.data

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 })
  }
  const roles = AUDIENCE_ROLES[audience]
  if (!roles) {
    return NextResponse.json({ error: "Unknown audience" }, { status: 400 })
  }

  const where = roles.length ? { role: { in: roles } } : {}
  const recipients = await db.user.findMany({
    where,
    select: { id: true, email: true, name: true },
    take: MAX_RECIPIENTS,
  })

  if (testMode) {
    return NextResponse.json({ testMode: true, total: recipients.length })
  }

  const { sendEmail } = await import("@/lib/email")

  let sent = 0
  let failed = 0
  const log: Array<{ email: string; status: string }> = []

  // Sequential send — SMTP servers prefer steady paced sends over bursts.
  for (const r of recipients) {
    const rendered = body
      .replace(/\{\{name\}\}/g, r.name || "there")
      .replace(/\{\{email\}\}/g, r.email)
    let status = "failed"
    try {
      const ok = await sendEmail({
        to: r.email,
        subject: subject.trim(),
        body: rendered,
        type: "notification",
        userId: r.id,
      })
      status = ok ? "sent" : "skipped" // skipped = SMTP not configured
    } catch {
      status = "failed"
    }
    if (status === "sent") sent++
    else failed++
    log.push({ email: r.email, status })

    // Record in EmailLog (best-effort)
    await db.emailLog
      .create({
        data: {
          userId: r.id,
          toEmail: r.email,
          subject: subject.trim(),
          body: rendered.slice(0, 4000),
          type: "notification",
          status,
        },
      })
      .catch(() => {})
  }

  return NextResponse.json({ sent, failed, total: recipients.length })
})

// GET /api/admin/email-campaign — audience counts for the composer UI
export const GET = withErrorHandler(async () => {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  const counts = await db.user.groupBy({
    by: ["role"],
    _count: { role: true },
  })
  const byRole = new Map(counts.map((c) => [c.role, c._count.role]))
  const total = counts.reduce((acc, c) => acc + c._count.role, 0)

  return NextResponse.json({
    audiences: {
      all: total,
      students: byRole.get("STUDENT") || 0,
      instructors: byRole.get("INSTRUCTOR") || 0,
      admins: (byRole.get("ADMIN") || 0) + (byRole.get("SUPER_ADMIN") || 0),
      school_admins: byRole.get("SCHOOL_ADMIN") || 0,
    },
  })
})
