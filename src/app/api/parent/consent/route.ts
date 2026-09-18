import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

/**
 * Parent-link consent — STUDENT side.
 *
 * GET  /api/parent/consent        → pending parent-link requests for the
 *                                   signed-in user (as the student).
 * POST /api/parent/consent        → approve or reject a pending request.
 *                                   Body: { parentId, action: "approve" | "reject" }
 *                                   Also accepts { token } to approve via the
 *                                   one-time consent token (emailed link).
 *
 * SECURITY: requires the STUDENT's own NextAuth session — the student whose
 * profile the parent wants to link to. This is the consent step that was
 * previously missing (a parent could previously link to any student by
 * knowing their email).
 */

const postSchema = z.object({
  parentId: z.string().min(1).optional(),
  token: z.string().min(10).optional(),
  action: z.enum(["approve", "reject"]),
}).refine((d) => d.parentId || d.token, { message: "parentId or token required" })

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requests = await db.parentAccount.findMany({
    where: { studentId: user.id, status: "PENDING" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      relationship: true,
      consentExpiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    )
  }
  const { parentId, token, action } = parsed.data

  // Locate the pending request — always scoped to the signed-in student
  const request = await db.parentAccount.findFirst({
    where: token
      ? { consentToken: token, studentId: user.id, status: "PENDING" }
      : { id: parentId, studentId: user.id, status: "PENDING" },
  })
  if (!request) {
    return NextResponse.json(
      { error: "No pending parent-link request found" },
      { status: 404 }
    )
  }

  // Expired consent window → auto-expire
  if (request.consentExpiresAt && request.consentExpiresAt < new Date()) {
    await db.parentAccount.update({
      where: { id: request.id },
      data: { status: "BLOCKED", consentToken: null, decidedAt: new Date() },
    })
    return NextResponse.json(
      { error: "This request expired. The parent must submit a new request." },
      { status: 410 }
    )
  }

  if (action === "reject") {
    await db.parentAccount.update({
      where: { id: request.id },
      data: { status: "BLOCKED", consentToken: null, decidedAt: new Date() },
    })
    return NextResponse.json({ ok: true, status: "rejected" })
  }

  // Approve — consume the one-time token, activate the link
  await db.parentAccount.update({
    where: { id: request.id },
    data: { status: "ACTIVE", consentToken: null, decidedAt: new Date() },
  })

  // Notify the parent (best-effort)
  try {
    const { sendEmail } = await import("@/lib/email")
    await sendEmail({
      to: request.email,
      subject: "Your GuardianX parent portal is now active",
      body: `Hi ${request.name},\n\nGood news — ${user.name} approved your parent/guardian link request. You can now log in to the GuardianX parent portal with the email and password you registered.\n\nThe GuardianX Team`,
      type: "notification",
    })
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, status: "active" })
}
