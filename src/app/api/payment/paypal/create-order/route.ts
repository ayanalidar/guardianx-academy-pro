import { NextRequest, NextResponse } from "next/server"
import type { Order } from "@prisma/client"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, rateLimit } from "@/lib/session"
import { getPayPalConfig, inrToUsd, createPayPalOrder } from "@/lib/paypal"
import { resolveCourseAndCoupon } from "@/lib/order-fulfillment"
import { getEmiConfig, computeShares, emiPurposeOf, emiDueDate, hasPendingEmiPlan } from "@/lib/installments"

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

  const { courseId, couponCode, installments } = body as { courseId?: string; couponCode?: string; installments?: number }
  const planCount = installments === 2 || installments === 3 ? installments : 1

  // Resolve course price + validate coupon (same rules as the Razorpay path)
  const resolved = await resolveCourseAndCoupon(courseId, couponCode)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 400 })
  }
  const { courseTitle, appliedCouponCode } = resolved.data

  // Convert the INR payable amount to USD (rounded up to 2 decimals),
  // then split the USD total into installment shares so they sum exactly.
  const usdAmount = inrToUsd(resolved.data.finalAmount, cfg.fxRate)
  const usdOriginal = inrToUsd(resolved.data.amount, cfg.fxRate)

  // --- EMI plan validation (mirrors the Razorpay path) ---
  let emiShares: number[] | null = null
  let emiGapDays = 30
  if (planCount > 1) {
    const emi = await getEmiConfig()
    if (!emi.enabled) {
      return NextResponse.json({ error: "Installment plans are currently disabled" }, { status: 400 })
    }
    if (resolved.data.finalAmount < emi.minAmount) {
      return NextResponse.json(
        { error: `Installment plans are available for courses of ₹${emi.minAmount.toLocaleString("en-IN")} or more` },
        { status: 400 },
      )
    }
    if (await hasPendingEmiPlan(user.id, courseId!)) {
      return NextResponse.json(
        { error: "You already have a pending installment plan for this course. Complete it from your dashboard first." },
        { status: 409 },
      )
    }
    const plan = emi.plans.find((p) => p.installments === planCount)
    if (!plan) return NextResponse.json({ error: "Installment plan unavailable" }, { status: 400 })
    emiShares = computeShares(usdAmount, plan) // split the USD total, not the INR
    emiGapDays = plan.dueDays[0] || 30
  }

  const payableNow = emiShares ? emiShares[0] : usdAmount

  // Local Order row(s) first - the first id rides along as the PayPal custom_id
  let order: Order
  let installmentPlan: { count: number; index: number; amounts: number[]; dueDates: (string | null)[] } | null = null

  if (emiShares) {
    const now = new Date()
    const created: Order[] = []
    for (let i = 1; i <= planCount; i++) {
      created.push(await db.order.create({
        data: {
          userId: user.id,
          courseId: courseId ?? null,
          batchId: null,
          amount: emiShares[i - 1],
          currency: "USD",
          status: "created",
          couponCode: i === 1 ? appliedCouponCode : null,
          discount: i === 1 ? Math.round((usdOriginal - usdAmount) * 100) / 100 : 0,
          finalAmount: emiShares[i - 1],
          razorpayOrderId: i === 1 ? "pending" : null, // replaced with the PayPal order id below
          purpose: emiPurposeOf(i, planCount),
          createdAt: now,
        },
      }))
    }
    order = created[0]
    installmentPlan = {
      count: planCount,
      index: 1,
      amounts: emiShares,
      dueDates: Array.from({ length: planCount }, (_, i) => {
        const due = emiDueDate(now, i + 1, emiGapDays)
        return due ? due.toISOString() : null
      }),
    }
  } else {
    order = await db.order.create({
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
  }

  // Create the PayPal order for the first installment
  let paypalOrderId: string
  try {
    const ppOrder = await createPayPalOrder(cfg, {
      usdAmount: payableNow,
      description: `GuardianX Academy - ${courseTitle}`,
      customId: order.id,
    })
    if (!ppOrder?.id) throw new Error("No order id in PayPal response")
    paypalOrderId = ppOrder.id
  } catch (e: any) {
    // Mark the local order(s) failed so they do not linger as "created"
    // (multi-installment plans create siblings that must also be cleaned up,
    // otherwise hasPendingEmiPlan would block future checkout attempts)
    await db.order.updateMany({
      where: {
        userId: user.id,
        courseId: courseId ?? null,
        status: "created",
        purpose: { startsWith: "COURSE_EMI" },
        createdAt: order.createdAt,
      },
      data: { status: "failed" },
    }).catch(() => {})
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
    amount: payableNow,
    currency: "USD",
    clientId: cfg.clientId,
    env: cfg.env,
    courseTitle,
    installmentPlan,
  })
})
