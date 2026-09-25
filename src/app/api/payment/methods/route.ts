import { NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { isPayPalConfiguredSync } from "@/lib/paypal"
import { getEmiConfig } from "@/lib/installments"

export const runtime = "nodejs"

/* GET /api/payment/methods
 * ------------------------
 * Public. Returns which payment providers are configured plus the
 * EMI plan configuration so the checkout dialog can show/hide the
 * options. Only booleans and plan shapes are exposed - never any
 * key material. Razorpay needs both key id and secret; PayPal needs
 * both client id and secret.
 */
export const GET = withErrorHandler(async () => {
  const [s, emi] = await Promise.all([
    getSettings(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"]),
    getEmiConfig(),
  ])

  const razorpay = !!(s.RAZORPAY_KEY_ID?.trim() && s.RAZORPAY_KEY_SECRET?.trim())
  const paypal = isPayPalConfiguredSync(s)

  return new NextResponse(
    JSON.stringify({ razorpay, paypal, emi }),
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
  )
})
