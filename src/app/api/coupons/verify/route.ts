import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* POST /api/coupons/verify  (PUBLIC - no auth required)
 * ----------------------------------------------------
 * Accepts: { code, courseId?, amount }
 *
 * Validates the coupon code against the Coupon table:
 *   - must exist
 *   - must be active
 *   - must not be exhausted (usedCount < maxUses)
 *   - must be in valid date range
 *   - if coupon.courseId is set, it must match the request's courseId
 *
 * Computes the discount and finalAmount:
 *   - percentage: discount = amount * value / 100
 *   - fixed: discount = min(value, amount)
 *   - finalAmount = max(0, amount - discount)
 *
 * Returns { valid: true, discount, finalAmount, type, value, code }
 *      or { valid: false, error }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { code, courseId, amount } = body as {
    code?: string
    courseId?: string
    amount?: number
  }

  if (!code || !code.trim()) {
    return NextResponse.json({ valid: false, error: "Coupon code is required" })
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ valid: false, error: "Amount is required" })
  }

  const coupon = await db.coupon.findUnique({ where: { code: code.trim() } })
  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid coupon code" })
  }
  if (!coupon.active) {
    return NextResponse.json({ valid: false, error: "Coupon is no longer active" })
  }
  if (coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "Coupon usage limit reached" })
  }
  const now = new Date()
  if (now < coupon.validFrom) {
    return NextResponse.json({ valid: false, error: "Coupon is not yet valid" })
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return NextResponse.json({ valid: false, error: "Coupon has expired" })
  }
  if (coupon.courseId && coupon.courseId !== courseId) {
    return NextResponse.json({ valid: false, error: "Coupon not valid for this course" })
  }

  let discount: number
  if (coupon.type === "percentage") {
    discount = Math.round((amount * coupon.value) / 100 * 100) / 100
  } else {
    // fixed
    discount = Math.min(coupon.value, amount)
  }
  const finalAmount = Math.max(0, Math.round((amount - discount) * 100) / 100)

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
    finalAmount,
  })
})
