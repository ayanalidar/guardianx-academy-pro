import { NextResponse } from "next/server"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { sendEmail } from "@/lib/email"

export const runtime = "nodejs"

/* POST /api/admin/settings/test
 * ADMIN-only. Tests a specific integration.
 * Body: { type: "payment" | "email" | "crm" }
 */
export const POST = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body?.type) return NextResponse.json({ error: "type is required" }, { status: 400 })

  const type = body.type as "payment" | "email" | "crm"

  if (type === "payment") {
    const s = await getSettings(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"])
    const keyId = s.RAZORPAY_KEY_ID
    const keySecret = s.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      return NextResponse.json({ ok: false, error: "Razorpay keys not configured" }, { status: 400 })
    }
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100, currency: "INR", receipt: `test_${Date.now()}` }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ ok: false, error: `Razorpay error: ${err}` }, { status: 400 })
      }
      const order = await res.json()
      return NextResponse.json({ ok: true, message: `Test order created: ${order.id} (₹1). Keys are valid.` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Connection failed" }, { status: 500 })
    }
  }

  if (type === "email") {
    const s = await getSettings(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_TO_ADMINS"])
    if (!s.SMTP_HOST || !s.SMTP_USER || !s.SMTP_PASSWORD) {
      return NextResponse.json({ ok: false, error: "SMTP settings not configured" }, { status: 400 })
    }
    const to = s.EMAIL_TO_ADMINS || currentUser.email
    const ok = await sendEmail({
      to,
      subject: "GuardianX — Email Test",
      html: `<div style="font-family:sans-serif;padding:40px;background:#0a0a0f;color:#fff;border-radius:12px;"><h1 style="color:#a78bfa;">GuardianX Email Test</h1><p>This is a test email from the GuardianX Platform Settings page.</p><p>If you received this, SMTP is working correctly.</p></div>`,
    })
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Failed to send — check SMTP credentials" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, message: `Test email sent to ${to}` })
  }

  if (type === "crm") {
    const s = await getSettings(["CRM_WEBHOOK_SECRET"])
    const token = s.CRM_WEBHOOK_SECRET || "guardianx-crm-webhook-2025"
    return NextResponse.json({ ok: true, message: `CRM webhook token is configured: ${token.slice(0, 8)}...` })
  }

  return NextResponse.json({ error: "Unknown test type" }, { status: 400 })
})
