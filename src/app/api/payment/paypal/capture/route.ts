import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, rateLimit } from "@/lib/session"
import { getPayPalConfig, capturePayPalOrder } from "@/lib/paypal"
import { fulfillOrderAfterPayment } from "@/lib/order-fulfillment"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* POST /api/payment/paypal/capture
 * --------------------------------
 * Requires auth. Accepts { orderId } (the local Order id).
 *
 * Captures the approved PayPal order server-to-server. A COMPLETED
 * status returned by PayPal IS the verification - no client-supplied
 * signature is trusted, unlike the Razorpay flow which verifies an
 * HMAC over client-provided values.
 *
 * On success: order → paid, fulfillment (coupon, enrollment, XP,
 * welcome email) runs exactly like the Razorpay path.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`paypal-capture:${user.id}`, { max: 12, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many capture attempts" }, { status: 429 })
  }

  const cfg = await getPayPalConfig()
  if (!cfg) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  const orderId = body?.orderId
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 })
  }

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (order.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden - order belongs to another user" }, { status: 403 })
  }
  if (order.status === "paid") {
    return NextResponse.json({ error: "Order already paid" }, { status: 400 })
  }
  if (order.currency !== "USD" || !order.razorpayOrderId) {
    return NextResponse.json({ error: "Order is not a PayPal order" }, { status: 400 })
  }

  // Capture server-side (idempotent on PayPal's side for the same order;
  // a repeat capture of an already-captured order returns ORDER_ALREADY_APPROVED
  // or COMPLETED - both non-fatal, we simply do not double-enroll).
  let capture
  try {
    capture = await capturePayPalOrder(cfg, order.razorpayOrderId)
  } catch (e: any) {
    console.error("[paypal/capture] PayPal capture failed:", e?.message)
    return NextResponse.json({ error: "PayPal capture failed. If you were charged, contact support with this order id." }, { status: 502 })
  }

  if (capture.status !== "COMPLETED" || !capture.captureId) {
    return NextResponse.json(
      { error: `PayPal payment not completed (status: ${capture.status || "UNKNOWN"})` },
      { status: 400 },
    )
  }

  // Mark paid + record provider ids (columns are provider-agnostic in practice)
  await db.order.update({
    where: { id: order.id },
    data: {
      status: "paid",
      razorpayPaymentId: capture.captureId,
      razorpaySignature: `paypal:${capture.status}`,
    },
  })

  // Automated payment receipt (best-effort - must never fail a completed payment)
  try {
    const { sendPaymentReceipt } = await import("@/lib/receipt")
    await sendPaymentReceipt({
      order: { ...order, razorpayPaymentId: capture.captureId },
      user,
      provider: "PayPal",
      paymentId: capture.captureId,
    })
  } catch (e) {
    console.error("[paypal/capture] receipt email failed:", e)
  }

  try {
    await logAction(user.id, user.email ?? user.name ?? "user", "payment.paypal.captured", "order", order.id, {
      paypalOrderId: order.razorpayOrderId,
      captureId: capture.captureId,
      amount: order.finalAmount,
      currency: order.currency,
      payerEmail: capture.payerEmail,
    })
  } catch {
    // audit log is best-effort
  }

  const { enrollment } = await fulfillOrderAfterPayment(order, user)

  return NextResponse.json({ success: true, enrollment })
})
