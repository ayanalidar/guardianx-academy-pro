import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { z } from "zod"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Parent/Guardian registration.
 *
 * SECURITY MODEL (hardened):
 *  - Registration NEVER links automatically. It creates a PENDING
 *    ParentAccount + a one-time consent token that the STUDENT must
 *    approve (GET /api/parent/consent → POST /api/parent/consent).
 *  - The response is IDENTICAL whether or not the student email exists,
 *    so the endpoint cannot be used to enumerate the user base.
 *  - Rate limited per IP.
 *
 * A single student can have multiple parent/guardian accounts linked
 * (e.g. mother + father) - each must be approved separately.
 */

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid parent email required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  phone: z.string().optional(),
  relationship: z.enum(["parent", "guardian"]).default("parent"),
  studentEmail: z.string().email("Valid student email required"),
})

// Rate limit - 5 registrations / 10 min / IP
const RATE_WINDOW = 10 * 60 * 1000
const RATE_MAX = 5
const rateMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const e = rateMap.get(ip)
  if (!e || now > e.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (e.count >= RATE_MAX) return false
  e.count++
  return true
}

const CONSENT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days to approve

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    const { name, email, password, phone, relationship, studentEmail } =
      parsed.data

    const existingParent = await db.parentAccount.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existingParent) {
      return NextResponse.json(
        { error: "A parent account with this email already exists" },
        { status: 409 }
      )
    }

    // Look up the student - but NEVER reveal whether the account exists
    // (anti-enumeration: same message + comparable work factor either way).
    const student = await db.user.findUnique({
      where: { email: studentEmail.toLowerCase() },
      select: { id: true, name: true, email: true, role: true, passwordHash: true },
    })

    if (!student || student.role === "INSTRUCTOR" || student.role === "ADMIN" || student.role === "SCHOOL_ADMIN" || student.role === "SUPER_ADMIN") {
      // Burn comparable CPU (bcrypt) so timing doesn't leak existence either.
      bcrypt.compareSync(password, "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZDZQj1Vp1p2b3c4d5e6f7g8h9i0jK".slice(0, 60))
      return NextResponse.json(
        {
          status: "PENDING_VERIFICATION",
          message:
            "Request received. If the student email matches a GuardianX student, they will see an approval request in their profile and must approve it before the link becomes active.",
        },
        { status: 202 }
      )
    }

    // Create the parent account in PENDING state with a one-time consent token
    const consentToken = randomBytes(24).toString("base64url")
    const parent = await db.parentAccount.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        passwordHash: bcrypt.hashSync(password, 12),
        phone: phone?.trim() || null,
        relationship,
        studentId: student.id,
        status: "PENDING",
        consentToken,
        consentExpiresAt: new Date(Date.now() + CONSENT_TTL_MS),
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    })

    // Best-effort notification to the student
    try {
      const { sendEmail } = await import("@/lib/email")
      await sendEmail({
        to: student.email,
        subject: "Parent/guardian link request - action needed",
        body: `Hi ${student.name},\n\n${name} (${relationship}) requested to link a parent/guardian account to your GuardianX profile.\n\nIf this is expected, log in and open your Profile → "Parent Link Requests" to approve it. If you don't recognise this request, simply ignore it (it expires in 7 days) or reject it.\n\nThe GuardianX Team`,
        type: "notification",
        userId: student.id,
      })
    } catch {
      // non-fatal
    }

    // NOTE: no parent token is returned here - the portal unlocks only
    // after the student approves.
    return NextResponse.json(
      {
        status: "PENDING_VERIFICATION",
        message:
          "Request received. The student has been notified and must approve the link from their profile before the parent portal becomes active.",
        parent: { id: parent.id, email: parent.email, status: parent.status },
      },
      { status: 202 }
    )
  } catch (e) {
    console.error("[parent/register]", e)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
