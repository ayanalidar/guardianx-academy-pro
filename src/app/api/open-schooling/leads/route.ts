import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"
import { notifyAdmins, leadNotificationEmailTemplate } from "@/lib/email"

export const runtime = "nodejs"

/* POST /api/open-schooling/leads
 * Public endpoint - anyone can submit a lead to register for 10th/12th via open schooling.
 * Rate-limited in-memory per IP (5 submissions per 10 minutes) to prevent spam.
 *
 * Body: {
 *   name: string (required, min 2 chars)
 *   email: string (required, valid email)
 *   phone: string (required, 10-digit Indian mobile or with country code)
 *   course: "10th" | "12th" (required)
 *   dateOfBirth?: string (YYYY-MM-DD)
 *   city?: string
 *   state?: string
 *   qualification?: string
 *   message?: string
 * }
 *
 * Returns: { ok: true, id } on success
 * Returns: 400 with { error } on validation error
 * Returns: 429 on rate limit */
const WINDOW = 10 * 60 * 1000 // 10 minutes
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

export const POST = withErrorHandler(async (req) => {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    name,
    email,
    phone,
    course,
    dateOfBirth,
    city,
    state,
    qualification,
    message,
  } = body ?? {}

  // --- validation ---
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 400 })
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  const cleanPhone = String(phone || "").replace(/[\-\s]/g, "")
  if (!phone || !PHONE_RE.test(cleanPhone)) {
    return NextResponse.json({ error: "A valid 10-digit Indian mobile number is required" }, { status: 400 })
  }
  if (course !== "10th" && course !== "12th") {
    return NextResponse.json({ error: "Course must be '10th' or '12th'" }, { status: 400 })
  }

  // --- rate limit ---
  const ip =
    (req as any)?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  // --- persist ---
  const lead = await db.openSchoolingLead.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      course,
      dateOfBirth: dateOfBirth || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      qualification: qualification?.trim() || null,
      message: message?.trim() || null,
      source: "WEBSITE",
    },
  })

  // --- email notification to admins ---
  await notifyAdmins(
    `New Open Schooling Lead - ${course} - ${name}`,
    leadNotificationEmailTemplate("Open Schooling Lead", [
      { label: "Name", value: name.trim() },
      { label: "Email", value: email.trim() },
      { label: "Phone", value: cleanPhone },
      { label: "Course", value: course },
      { label: "City", value: city?.trim() || " - " },
      { label: "State", value: state?.trim() || " - " },
      { label: "Qualification", value: qualification?.trim() || " - " },
      { label: "Message", value: message?.trim() || " - " },
    ])
  )

  return NextResponse.json(
    { ok: true, id: lead.id },
    { status: 201 }
  )
})
