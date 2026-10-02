import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

// Rate limiting - simple in-memory counter (per IP, per window)
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 5
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

/* ============================================================
 * POST /api/internships/apply - PUBLIC internship application.
 *
 * Flows straight into the existing Lead CRM (Admin -> Lead CRM)
 * as type "Individual", source "Internship Application", with a
 * LeadNote carrying the applicant's interest details so the CRM
 * conversation history starts populated.
 *
 * Always returns a neutral success (anti-enumeration: no hint
 * about duplicate emails or any validation specifics).
 * ============================================================ */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many applications. Please try again later." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : ""
    const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 32) : ""
    const college = typeof body?.college === "string" ? body.college.trim().slice(0, 160) : ""
    const interest = typeof body?.interest === "string" ? body.interest.trim().slice(0, 200) : ""
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : ""

    if (name.length < 2 || !email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "Please provide your name and a valid email." }, { status: 400 })
    }

    const lead = await db.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        organization: college || null,
        type: "Individual",
        status: "New",
        source: "Internship Application",
        score: interest ? 35 : 25, // engaged enough to pick a track
      },
      select: { id: true },
    })

    const noteLines = [
      `Internship application from /internships page.`,
      interest ? `Interest: ${interest}` : null,
      college ? `College: ${college}` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean)

    await db.leadNote.create({
      data: {
        leadId: lead.id,
        content: noteLines.join("\n"),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[internships/apply]", error)
    return NextResponse.json(
      { error: "Could not submit your application right now. Please try again." },
      { status: 500 }
    )
  }
}
