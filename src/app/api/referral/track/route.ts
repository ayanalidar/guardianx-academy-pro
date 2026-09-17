import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

// Reward config — both referrer & referred receive a 15% discount coupon,
// valid for 90 days, single use.
const REWARD_TYPE = "percentage" // percentage | fixed
const REWARD_VALUE = 15 // 15% off
const REWARD_MAX_USES = 1
const REWARD_VALID_DAYS = 90

function generateCouponCode(prefix: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no I, O, 0, 1
  let suffix = ""
  for (let i = 0; i < 8; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${prefix}-${suffix}`
}

/* POST /api/referral/track — PUBLIC (no auth).
 * ---------------------------------------------------------------
 * Body: { referralId, email, userId? }
 *
 * Called when someone signs up or enrolls via a referral link.
 * - Looks up the PENDING referral by referralId.
 * - Validates the referrer exists and isn't self-referring.
 * - Marks the referral status = ENROLLED, stores referredEmail + referredUserId.
 * - Generates a reward Coupon for BOTH the referrer and the referred user,
 *   stores the coupon code on the referral row, and marks status = REWARDED.
 *
 * Response: { ok: true, status, referrerCouponCode, referredCouponCode }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const { referralId, email, userId } = body as {
    referralId?: string
    email?: string
    userId?: string
  }

  if (!referralId || typeof referralId !== "string") {
    return NextResponse.json({ error: "referralId is required" }, { status: 400 })
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }

  const referral = await db.referral.findUnique({ where: { id: referralId } })
  if (!referral) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 })
  }
  // Only PENDING referrals can be tracked. Idempotent for repeat calls.
  if (referral.status === "REWARDED" || referral.status === "ENROLLED") {
    return NextResponse.json({
      ok: true,
      status: referral.status,
      referrerCouponCode: referral.couponCode,
      referredCouponCode: null,
      alreadyTracked: true,
    })
  }
  if (referral.status === "EXPIRED") {
    return NextResponse.json({ error: "Referral has expired" }, { status: 410 })
  }

  const referrer = await db.user.findUnique({ where: { id: referral.referrerId } })
  if (!referrer) {
    return NextResponse.json({ error: "Referrer not found" }, { status: 404 })
  }
  // Anti-abuse: cannot refer yourself.
  if (referrer.email.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 })
  }
  if (userId && userId === referrer.id) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 })
  }

  // Generate two unique coupon codes (retry on collision).
  const now = new Date()
  const validUntil = new Date(now.getTime() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000)

  async function createCoupon(ownerLabel: string, ownerEmail: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCouponCode("REF")
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
          courseId: null, // applies to any course
          active: true,
        },
      })
    }
    throw new Error(`Failed to allocate unique coupon for ${ownerLabel} (${ownerEmail})`)
  }

  const [referrerCoupon, referredCoupon] = await Promise.all([
    createCoupon("referrer", referrer.email),
    createCoupon("referred", email),
  ])

  // Materialise the reward: stamp the referral with the referrer's coupon code,
  // mark it REWARDED, and record the referred user.
  await db.referral.update({
    where: { id: referral.id },
    data: {
      status: "REWARDED",
      referredEmail: email,
      referredUserId: userId ?? null,
      couponCode: referrerCoupon.code,
    },
  })

  return NextResponse.json({
    ok: true,
    status: "REWARDED",
    referrerCouponCode: referrerCoupon.code,
    referredCouponCode: referredCoupon.code,
  })
})
