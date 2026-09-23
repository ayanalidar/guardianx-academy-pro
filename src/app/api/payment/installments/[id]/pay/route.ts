import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, rateLimit } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { getPayPalConfig, inrToUsd, createPayPalOrder } from "@/lib/paypal"
import { parseEmiPurpose } from "@/lib/installments"

export const runtime = "nodejs"

/* POST /api/payment/installments/[id]/pay
 * ---------------------------------------
 * Requires auth. Body: { provider: "razorpay" | "paypal" }.
 *
 * Attaches a fresh provider order to an existing pending EMI
 * installment order (created at plan checkout) and returns what the
 * client needs to open that provider's checkout:
 *   - razorpay: { orderId, razorpayOrderId, amount, currency, keyId, mock }
 *     → client opens Razorpay Checkout, then POSTs /api/payment/verify
 *   - paypal:   { orderId, paypalOrderId, amount (USD), currency, clientId }
 *     → client renders PayPal buttons, then POSTs /api/payment/paypal/capture
 *
 * Both verify endpoints mark the installment paid, fire the receipt
 * email and run idempotent fulfillment (enrollment stays a no-op for
 * installments after the first).
 */
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`emi-pay:${user.id}`, { max: 10, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const provider = body?.provider === "paypal" ? "paypal" : "razorpay"

  const order = await db.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: "Installment not found" }, { status: 404 })
  if (order.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden - order belongs to another user" }, { status: 403 })
  }
  const emi = parseEmiPurpose(order.purpose)
  if (!emi) return NextResponse.json({ error: "Not an installment order" }, { status: 400 })
  if (order.status === "paid") return NextResponse.json({ error: "Installment already paid" }, { status: 400 })
  if (order.status !== "created") {
    return NextResponse.json({ error: `Installment is ${order.status}` }, { status: 400 })
  }

  let courseTitle = "Course Enrollment"
  if (order.courseId) {
    const course = await db.course.findUnique({ where: { id: order.courseId }, select: { title: true } })
    if (course) courseTitle = course.title
  }

  if (provider === "razorpay") {
    const s = await getSettings(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"])
    const keyId = s.RAZORPAY_KEY_ID
    const keySecret = s.RAZORPAY_KEY_SECRET
    const isMock = !keyId || !keySecret

    let razorpayOrderId: string
    if (isMock) {
      razorpayOrderId = `order_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    } else {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(order.finalAmount * 100),
          currency: order.currency,
          receipt: `emi_${order.id.slice(-8)}_${Date.now()}`,
          notes: { orderId: order.id, userId: user.id, courseTitle, installment: `${emi.index}_of_${emi.total}` },
        }),
      })
      if (!res.ok) {
        console.error("[installments/pay] Razorpay order creation failed:", await res.text())
        return NextResponse.json({ error: "Failed to create payment order" }, { status: 502 })
      }
      const rzpOrder = await res.json()
      razorpayOrderId = rzpOrder.id
    }

    await db.order.update({ where: { id: order.id }, data: { razorpayOrderId } })

    return NextResponse.json({
      provider,
      orderId: order.id,
      razorpayOrderId,
      amount: order.finalAmount,
      currency: order.currency,
      courseTitle,
      installment: emi,
      keyId: keyId ?? null,
      mock: isMock,
    })
  }

  // PayPal
  const cfg = await getPayPalConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: "PayPal is not configured. Use Razorpay or add PAYPAL_CLIENT_ID/SECRET in Admin → Settings." },
      { status: 503 },
    )
  }
  const usdAmount = order.currency === "USD" ? order.finalAmount : inrToUsd(order.finalAmount, cfg.fxRate)

  let paypalOrderId: string
  try {
    const ppOrder = await createPayPalOrder(cfg, {
      usdAmount,
      description: `GuardianX Academy - ${courseTitle} (installment ${emi.index} of ${emi.total})`,
      customId: order.id,
    })
    if (!ppOrder?.id) throw new Error("No order id in PayPal response")
    paypalOrderId = ppOrder.id
  } catch (e: any) {
    console.error("[installments/pay] PayPal order creation failed:", e?.message)
    return NextResponse.json({ error: "Failed to create PayPal order. Please try again." }, { status: 502 })
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      razorpayOrderId: paypalOrderId,
      // track the USD charge so capture-side fulfillment stays consistent
      ...(order.currency === "USD" ? {} : { amount: usdAmount, finalAmount: usdAmount, currency: "USD" }),
    },
  })

  return NextResponse.json({
    provider,
    orderId: order.id,
    paypalOrderId,
    amount: usdAmount,
    currency: "USD",
    clientId: cfg.clientId,
    courseTitle,
    installment: emi,
  })
})
