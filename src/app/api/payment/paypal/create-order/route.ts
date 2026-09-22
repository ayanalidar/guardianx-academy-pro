import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, rateLimit } from "@/lib/session"
import { getPayPalConfig, inrToUsd, createPayPalOrder } from "@/lib/paypal"
import { resolveCourseAndCoupon } from "@/lib/order-fulfillment"

export const runtime = "nodejs"

/* POST /api/payment/paypal/create-order
 * -------------------------------------
 * Requires auth. Accepts { courseId, couponCode? } and creates:
 *   1. A local Order row (currency USD - PayPal cannot charge INR,
 *      so international clients pay the INR price converted at the
 *      admin-configurable PAYPAL_FX_RATE).
 *   2. A real PayPal checkout order via the REST API.
 *
 * Zero-schema note: the Order model predates multi-provider support,
 * so the paypal order id is stored in the `razorpayOrderId` column
 * (semantically "provider order id") and the Order.currency field
 * ("USD") distinguishes PayPal orders from Razorpay ones.
 *
 * Returns: { orderId, paypalOrderId, amount (USD), currency, clientId, courseTitle }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`paypal-order:${user.id}`, { max: 10, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many order attempts" }, { status: 429 })
  }

  const cfg = await getPayPalConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: "PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Admin → Settings." },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { courseId, couponCode } = body as { courseId?: string; couponCode?: string }

  // Resolve course price + validate coupon (same rules as the Razorpay path)
  const resolved = await resolveCourseAndCoupon(courseId, couponCode)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 400 })
  }
  const { courseTitle, appliedCouponCode } = resolved.data

  // Convert the INR payable amount to USD (rounded up to 2 decimals)
  const usdAmount = inrToUsd(resolved.data.finalAmount, cfg.fxRate)
  const usdOriginal = inrToUsd(resolved.data.amount, cfg.fxRate)

  // Local Order row first - its id rides along as the PayPal custom_id
  const order = await db.order.create({
    data: {
      userId: user.id,
      courseId: courseId ?? null,
      batchId: null,
      amount: usdOriginal,
      currency: "USD",
      status: "created",
      couponCode: appliedCouponCode,
      discount: Math.round((usdOriginal - usdAmount) * 100) / 100,
      finalAmount: usdAmount,
      razorpayOrderId: "pending", // replaced with the real PayPal order id below
      purpose: "COURSE",
    },
  })

  // Create the PayPal order
  let paypalOrderId: string
  try {
    const ppOrder = await createPayPalOrder(cfg, {
      usdAmount,
      description: `GuardianX Academy - ${courseTitle}`,
      customId: order.id,
    })
    if (!ppOrder?.id) throw new Error("No order id in PayPal response")
    paypalOrderId = ppOrder.id
  } catch (e: any) {
    // Mark the local order failed so it does not linger as "created"
    await db.order.update({ where: { id: order.id }, data: { status: "failed" } }).catch(() => {})
    console.error("[paypal/create-order] PayPal order creation failed:", e?.message)
    return NextResponse.json({ error: "Failed to create PayPal order. Please try again." }, { status: 502 })
  }

  await db.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: paypalOrderId },
  })

  return NextResponse.json({
    orderId: order.id,
    paypalOrderId,
    amount: usdAmount,
    currency: "USD",
    clientId: cfg.clientId,
    env: cfg.env,
    courseTitle,
  })
})
