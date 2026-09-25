import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/* ============================================================
 * PUBLIC guest application - apply WITHOUT signing up.
 *
 * POST /api/hiring/jobs/[id]/apply
 * body: { name, email, phone?, linkedin?, note? }
 *
 * Guest applications are stored as Lead records (type
 * "Job Application", source "Hiring Page") so they flow into
 * the existing admin Lead CRM pipeline. The applied-for role,
 * LinkedIn/portfolio URL and the applicant's note are stored
 * as a LeadNote on the lead (with the job id embedded for
 * per-job de-duplication).
 *
 * No auth, no account required. Basic input validation +
 * best-effort in-memory IP rate limiting (per serverless
 * instance).
 * ============================================================ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Best-effort rate limit: max 12 applications per IP per rolling hour
// per serverless instance. Resets on cold start - acceptable as a spam
// speed bump, not a hard guarantee.
const RATE_LIMIT = 12
const RATE_WINDOW_MS = 60 * 60 * 1000
const rateBuckets = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_LIMIT) {
    rateBuckets.set(ip, hits)
    return true
  }
  hits.push(now)
  rateBuckets.set(ip, hits)
  if (rateBuckets.size > 5000) rateBuckets.clear()
  return false
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many applications from this network. Please try again later." },
        { status: 429 }
      )
    }

    const { id } = await params
    const job = await db.job.findUnique({
      where: { id },
      select: { id: true, title: true, company: true, location: true, status: true },
    })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (job.status !== "active") {
      return NextResponse.json(
        { error: "This role is no longer accepting applications" },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const name = String(body.name ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const phone = String(body.phone ?? "").trim().slice(0, 30)
    const linkedin = String(body.linkedin ?? "").trim().slice(0, 300)
    const note = String(body.note ?? "").trim().slice(0, 3000)

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Please enter your full name" }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }
    if (linkedin && !/^https?:\/\//i.test(linkedin)) {
      return NextResponse.json(
        { error: "The link must start with http:// or https://" },
        { status: 400 }
      )
    }

    // De-duplication: one guest application per (email, job). The job id
    // is embedded in the LeadNote content, so match on it.
    const duplicate = await db.lead.findFirst({
      where: {
        type: "Job Application",
        email,
        notes: { some: { content: { contains: id } } },
      },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: "You have already applied for this role with this email" },
        { status: 409 }
      )
    }

    const noteContent = [
      `Applied via the public Hiring page (guest application, no account).`,
      `Role: ${job.title}`,
      `Job ID: ${job.id}`,
      `Location: ${job.location}`,
      `LinkedIn / Portfolio: ${linkedin || "not provided"}`,
      "",
      "Applicant note:",
      note || "(none)",
    ].join("\n")

    const lead = await db.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        organization: job.company,
        type: "Job Application",
        source: "Hiring Page",
        status: "New",
        notes: { create: { content: noteContent } },
      },
      select: { id: true },
    })

    return NextResponse.json(
      { ok: true, message: "Application received", applicationId: lead.id },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[hiring/jobs/[id]/apply] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
