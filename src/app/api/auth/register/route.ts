import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { randomInt } from "crypto" // audit fix C-10: crypto-secure code generation
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { sendEmail, emailVerificationEmailTemplate } from "@/lib/email"
import { isDisposableEmail, createEmailVerificationLink } from "@/lib/email-security"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


// Rate limiting - simple in-memory counter (per IP, per window)
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 registrations per minute per IP
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

// Password must be at least 8 chars, contain uppercase, lowercase, and a number
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: passwordSchema,
  ref: z.string().max(64).optional(), // referral id (from ?ref= URL / localStorage)
  // DPDPA audit fixes D-01 + D-02: affirmative consent and a 16+ age
  // declaration are now REQUIRED (matching the platform's own Terms: "at
  // least 16 years old or parental consent for school cohorts").
  consent: z.boolean().refine((v) => v === true, {
    message: "DPDPA consent is required to create an account",
  }),
  age16: z.boolean().refine((v) => v === true, {
    message: "You must be at least 16 years old to create an account",
  }),
  // --- Bot defenses (hardening arc) -------------------------------
  // Honeypot: hidden field rendered off-screen. Humans never fill it;
  // naive bots autofill everything. max(0) means "must be empty".
  website: z.string().max(0).optional(),
  // Minimum fill time (ms between form mount and submit, measured
  // client-side). Real users need >1s to type/click through; bots
  // submit near-instantly. Optional so older clients stay valid.
  elapsedMs: z.number().int().nonnegative().optional(),
})

// Submissions faster than this are treated as bots (fake success below).
const MIN_FORM_FILL_MS = 1000

// DPDPA audit fix D-01: version of the notice/consent text shown at signup.
// Bump this whenever the privacy notice materially changes.
const NOTICE_VERSION = "dpdpa-notice-2026-09-v1"

// Reward config - duplicated from /api/referral/track to keep register
// self-contained (no cross-route import). See referral/track for full docs.
const REWARD_TYPE = "percentage"
const REWARD_VALUE = 15
const REWARD_MAX_USES = 1
const REWARD_VALID_DAYS = 90

function generateCouponCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 8; i++) suffix += alphabet[randomInt(alphabet.length)] // crypto-secure
  return `REF-${suffix}`
}

async function allocateCoupon() {
  const now = new Date()
  const validUntil = new Date(now.getTime() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCouponCode()
    const existing = await db.coupon.findUnique({ where: { code } })
    if (existing) continue
    return db.coupon.create({
      data: {
        code,
        type: REWARD_TYPE,
        value: REWARD_VALUE,
        maxUses: REWARD_MAX_USES,
        usedCount: 0,
        validFrom: now,
        validUntil,
        courseId: null,
        active: true,
      },
    })
  }
  throw new Error("Failed to allocate unique referral coupon")
}

/**
 * Track a referral after a successful signup. If the `ref` id resolves to a
 * PENDING Referral row owned by a different user, we materialise the reward:
 * stamp the referral with both coupon codes + status = REWARDED, and create a
 * second Coupon for the new (referred) user.
 *
 * Failures here are non-fatal - the account has already been created, so we
 * log and continue.
 */
async function trackReferralOnSignup(referralId: string, newUser: { id: string; email: string }) {
  try {
    const referral = await db.referral.findUnique({ where: { id: referralId } })
    if (!referral) return
    if (referral.status !== "PENDING") return
    if (referral.referrerId === newUser.id) return // anti-self-referral

    const referrer = await db.user.findUnique({ where: { id: referral.referrerId } })
    if (!referrer) return
    if (referrer.email.toLowerCase() === newUser.email.toLowerCase()) return

    const [referrerCoupon, referredCoupon] = await Promise.all([
      allocateCoupon(),
      allocateCoupon(),
    ])

    await db.referral.update({
      where: { id: referral.id },
      data: {
        status: "REWARDED",
        referredEmail: newUser.email,
        referredUserId: newUser.id,
        couponCode: referrerCoupon.code,
      },
    })

    // The referred user's coupon is surfaced to them on first login via the
    // dashboard widget (we only persist the referrer's code on the Referral
    // row; the referred coupon is independently queryable from the Coupon
    // table by code).
    console.log(
      `[referral] rewarded: referrer=${referrer.email} (${referrerCoupon.code}), referred=${newUser.email} (${referredCoupon.code})`
    )
  } catch (e) {
    console.error("[referral] track on signup failed:", e)
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      )
    }

    const body = await req.json()

    // --- Bot defenses run on the RAW body, BEFORE zod validation ---
    // (so bots get the same fake-success a human would trigger, with no
    // schema-validation error leaking which fields we watch.)
    if (body && typeof body === "object") {
      const raw = body as Record<string, unknown>

      // Bot defense 1: honeypot filled -> silently fake success (a 200 with
      // no account created; the client's follow-up signIn will simply fail
      // for the bot. Never reveal the honeypot exists.)
      if (typeof raw.website === "string" && raw.website.length > 0) {
        return NextResponse.json({
          user: { id: "skipped", email: String(raw.email ?? ""), name: String(raw.name ?? ""), role: "STUDENT" },
        })
      }

      // Bot defense 2: inhuman submit speed -> silently fake success
      if (
        typeof raw.elapsedMs === "number" &&
        Number.isFinite(raw.elapsedMs) &&
        (raw.elapsedMs as number) < MIN_FORM_FILL_MS
      ) {
        return NextResponse.json({
          user: { id: "skipped", email: String(raw.email ?? ""), name: String(raw.name ?? ""), role: "STUDENT" },
        })
      }
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    const { name, email, password, ref } = parsed.data

    // --- Hardening: block disposable / temp-mail domains ---
    // Same message as the duplicate-email path (anti-enumeration: we must
    // not reveal WHICH validation failed).
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Registration failed. Please try with different details." },
        { status: 400 }
      )
    }

    // SECURITY: Always register as STUDENT. Instructor/Admin roles must be
    // assigned by an admin - never self-assigned via the registration API.
    const role = "STUDENT"

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      // SECURITY: Don't reveal that the email exists (prevents enumeration)
      return NextResponse.json(
        { error: "Registration failed. Please try with different details." },
        { status: 400 }
      )
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: bcrypt.hashSync(password, 12), // 12 rounds for better security
        role,
        title: "Student",
      },
      select: { id: true, email: true, name: true, role: true },
    })

    // DPDPA audit fix D-01: persist a consent record (version, timestamp,
    // source) as the legally-relevant proof of the notice accepted at
    // collection. Stored in AuditLog so no schema migration is required.
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          userName: email,
          action: "dpdpa.consent.capture",
          resource: "User",
          resourceId: user.id,
          details: JSON.stringify({
            noticeVersion: NOTICE_VERSION,
            consentAt: new Date().toISOString(),
            source: "web-signup",
            ageDeclared: "16+",
            granular: { marketing: false, proctoring: "on-exam", cookies: "essential-only" },
          }),
        },
      })
    } catch (e) {
      // Consent logging must never block account creation, but the failure
      // should be visible in server logs for compliance review.
      console.error("[register] consent record failed:", e)
    }

    // Referral tracking - only if a valid `ref` id was supplied (from the
    // ?ref= URL captured client-side and stored in localStorage).
    if (ref && ref.trim()) {
      await trackReferralOnSignup(ref.trim(), { id: user.id, email: user.email })
    }

    // --- Hardening: post-registration email confirmation ---
    // Sends a branded "confirm your email" mail whose button is a real
    // one-click sign-in link (next-auth EmailProvider flow). Proves mailbox
    // ownership without blocking anyone (email delivery failures must never
    // lock a user out - they can always use password login). Entirely
    // non-fatal: only minted when SMTP is configured (the same condition
    // under which the EmailProvider route exists), otherwise skipped.
    try {
      const s = await getSettings(["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"])
      if (s.SMTP_HOST && s.SMTP_USER && s.SMTP_PASSWORD) {
        const link = await createEmailVerificationLink(email)
        if (link) {
          await sendEmail({
            to: email,
            subject: "Confirm your email - GuardianX Academy",
            html: emailVerificationEmailTemplate(name, link),
          })
        }
      }
    } catch (e) {
      console.error("[register] confirmation email failed (non-fatal):", e)
    }

    return NextResponse.json({ user })
  } catch (e) {
    console.error("[register]", e)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}

