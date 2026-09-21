import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"
import { notifyAdmins, leadNotificationEmailTemplate } from "@/lib/email"

export const runtime = "nodejs"

/* POST /api/corporate-training/leads
 * Public endpoint - anyone can submit a corporate training inquiry.
 * Rate-limited in-memory per IP (5 submissions per 10 minutes).
 *
 * Body: {
 *   companyName: string (required, min 2)
 *   contactName: string (required, min 2)
 *   workEmail: string (required, valid email)
 *   phone: string (required, 10-digit Indian mobile or +91)
 *   teamSize: "1-10" | "11-50" | "51-200" | "200+" (required)
 *   trainingInterest: string (required - comma-separated codes)
 *   timeline?: "immediate" | "1-3 months" | "exploring"
 *   message?: string
 * }
 */
const WINDOW = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW })
    return true
  }
  if (entry.count >= MAX_PER_WINDOW) return false
  entry.count++
  return true
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+91[\-\s]?)?[6-9]\d{9}$/
const TEAM_SIZES = ["1-10", "11-50", "51-200", "200+"]
const TIMELINES = ["immediate", "1-3 months", "exploring"]

export const POST = withErrorHandler(async (req) => {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    companyName,
    contactName,
    workEmail,
    phone,
    teamSize,
    trainingInterest,
    timeline,
    message,
  } = body ?? {}

  if (!companyName || typeof companyName !== "string" || companyName.trim().length < 2) {
    return NextResponse.json({ error: "Company name is required (min 2 characters)" }, { status: 400 })
  }
  if (!contactName || typeof contactName !== "string" || contactName.trim().length < 2) {
    return NextResponse.json({ error: "Contact name is required (min 2 characters)" }, { status: 400 })
  }
  if (!workEmail || typeof workEmail !== "string" || !EMAIL_RE.test(workEmail.trim())) {
    return NextResponse.json({ error: "A valid work email is required" }, { status: 400 })
  }
  const cleanPhone = String(phone || "").replace(/[\-\s]/g, "")
  if (!phone || !PHONE_RE.test(cleanPhone)) {
    return NextResponse.json({ error: "A valid 10-digit Indian mobile number is required" }, { status: 400 })
  }
  if (!teamSize || !TEAM_SIZES.includes(teamSize)) {
    return NextResponse.json({ error: "Team size must be one of: 1-10, 11-50, 51-200, 200+" }, { status: 400 })
  }
  if (!trainingInterest || typeof trainingInterest !== "string" || trainingInterest.trim().length === 0) {
    return NextResponse.json({ error: "Training interest is required" }, { status: 400 })
  }
  if (timeline && !TIMELINES.includes(timeline)) {
    return NextResponse.json({ error: "Timeline must be: immediate, 1-3 months, or exploring" }, { status: 400 })
  }

  const ip =
    (req as any)?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  const lead = await db.corporateLead.create({
    data: {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      workEmail: workEmail.trim().toLowerCase(),
      phone: cleanPhone,
      teamSize,
      trainingInterest: trainingInterest.trim(),
      timeline: timeline || null,
      message: message?.trim() || null,
      source: "WEBSITE",
    },
  })

  // --- email notification to admins ---
  await notifyAdmins(
    `New Corporate Training Lead - ${companyName}`,
    leadNotificationEmailTemplate("Corporate Training Lead", [
      { label: "Company", value: companyName.trim() },
      { label: "Contact", value: contactName.trim() },
      { label: "Email", value: workEmail.trim() },
      { label: "Phone", value: cleanPhone },
      { label: "Team size", value: teamSize },
      { label: "Interest", value: trainingInterest.trim() },
      { label: "Timeline", value: timeline || " - " },
      { label: "Message", value: message?.trim() || " - " },
    ])
  )

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
})
