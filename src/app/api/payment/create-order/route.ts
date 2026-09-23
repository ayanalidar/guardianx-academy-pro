import { NextRequest, NextResponse } from "next/server"
import type { Order } from "@prisma/client"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, rateLimit } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { getEmiConfig, computeShares, emiPurposeOf, emiDueDate, hasPendingEmiPlan } from "@/lib/installments"

export const runtime = "nodejs"

/* POST /api/payment/create-order
 * -----------------------------
 * Requires auth. Accepts { courseId, couponCode? } and creates an Order
 * record + a real Razorpay order (when RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
 * are set). Falls back to mock mode if keys are not configured.
 *
 * Returns: { orderId, amount, currency, razorpayOrderId, keyId, mock }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`pay-order:${user.id}`, { max: 10, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many order attempts" }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { courseId, couponCode, installments } = body as { courseId?: string; couponCode?: string; installments?: number }
  // EMI plan: 1 (default) = pay in full; 2 or 3 = platform-managed installment plan
  const planCount = installments === 2 || installments === 3 ? installments : 1

  // Resolve the amount: either from a course price, or default to a small
  // test amount so the flow can be exercised end-to-end without a course.
  let amount = 0
  let courseTitle = "Course Enrollment"

  if (courseId) {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, shortName: true, price: true },
    })
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    amount = course.price ?? 0
    courseTitle = course.title
  }

  if (amount <= 0) {
    return NextResponse.json(
      { error: "This course is free - no payment required", free: true },
      { status: 400 },
    )
  }

  // Validate + apply coupon (if provided)
  let discount = 0
  let finalAmount = amount
  let appliedCouponCode: string | null = null

  if (couponCode && couponCode.trim()) {
    const code = couponCode.trim()
    const coupon = await db.coupon.findUnique({ where: { code } })
    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 })
    }
    if (!coupon.active) {
      return NextResponse.json({ error: "Coupon is no longer active" }, { status: 400 })
    }
    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 })
    }
    const now = new Date()
    if (now < coupon.validFrom) {
      return NextResponse.json({ error: "Coupon is not yet valid" }, { status: 400 })
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 })
    }
    if (coupon.courseId && coupon.courseId !== courseId) {
      return NextResponse.json({ error: "Coupon not valid for this course" }, { status: 400 })
    }

    if (coupon.type === "percentage") {
      discount = Math.round((amount * coupon.value) / 100 * 100) / 100
    } else {
      // fixed
      discount = Math.min(coupon.value, amount)
    }
    finalAmount = Math.max(0, Math.round((amount - discount) * 100) / 100)
    appliedCouponCode = code
  }

  // --- EMI plan validation (only for multi-installment plans) ---
  let emiShares: number[] | null = null
  let emiGapDays = 30
  if (planCount > 1) {
    const emi = await getEmiConfig()
    if (!emi.enabled) {
      return NextResponse.json({ error: "Installment plans are currently disabled" }, { status: 400 })
    }
    if (finalAmount < emi.minAmount) {
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
    emiShares = computeShares(finalAmount, plan)
    emiGapDays = plan.dueDays[0] || 30
  }

  // --- Create the Razorpay order (real or mock) for the FIRST installment ---
  const s = await getSettings(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"])
  const keyId = s.RAZORPAY_KEY_ID
  const keySecret = s.RAZORPAY_KEY_SECRET
  const isMock = !keyId || !keySecret

  const payableNow = emiShares ? emiShares[0] : finalAmount

  let razorpayOrderId: string

  if (isMock) {
    razorpayOrderId = `order_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  } else {
    // Real Razorpay - create order via REST API
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(payableNow * 100), // paise
        currency: "INR",
        receipt: `course_${courseId?.slice(-8) || "enroll"}_${Date.now()}`,
        notes: { courseId: courseId || "", userId: user.id, courseTitle, installments: String(planCount) },
      }),
    })
    if (!res.ok) {
      console.error("[payment] Razorpay order creation failed:", await res.text())
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 })
    }
    const rzpOrder = await res.json()
    razorpayOrderId = rzpOrder.id
  }

  // --- Persist order row(s). Multi-installment plans create one Order per
  //     installment (purpose COURSE_EMI_<i>_OF_<N>); the coupon rides on the
  //     first order only so usage increments exactly once. ---
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
          currency: "INR",
          status: "created",
          couponCode: i === 1 ? appliedCouponCode : null,
          discount: i === 1 ? discount : 0,
          finalAmount: emiShares[i - 1],
          razorpayOrderId: i === 1 ? razorpayOrderId : null, // later installments get theirs when paid
          purpose: emiPurposeOf(i, planCount),
          createdAt: now, // identical timestamps keep the sibling group together
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
        amount,
        currency: "INR",
        status: "created",
        couponCode: appliedCouponCode,
        discount,
        finalAmount,
        razorpayOrderId,
      },
    })
  }

  return NextResponse.json({
    orderId: order.id,
    razorpayOrderId: order.razorpayOrderId,
    amount: payableNow,
    currency: order.currency,
    courseTitle,
    keyId: keyId ?? null,
    mock: isMock,
    installmentPlan,
  })
})
