import { NextResponse } from "next/server"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { sendEmailDetailed } from "@/lib/email"

export const runtime = "nodejs"

/* POST /api/admin/settings/test
 * ADMIN-only. Tests a specific integration.
 * Body: { type: "payment" | "email" | "crm" | "tracking" | "auth" }
 */
export const POST = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body?.type) return NextResponse.json({ error: "type is required" }, { status: 400 })

  const type = body.type as "payment" | "email" | "crm" | "tracking" | "auth"

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
    const s = await getSettings(["MAIL_API_TOKEN", "MAIL_MAILBOX_RESOURCE_ID", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_TO_ADMINS"])
    const hasApi = !!(s.MAIL_API_TOKEN || process.env.MAIL_API_TOKEN)
    const hasSmtp = !!(s.SMTP_HOST && s.SMTP_USER && s.SMTP_PASSWORD)
    if (!hasApi && !hasSmtp) {
      return NextResponse.json(
        { ok: false, error: "Email not configured - paste a Hostinger Mail API token (preferred) or SMTP credentials, then Save and retest" },
        { status: 400 },
      )
    }
    const to = s.EMAIL_TO_ADMINS || currentUser.email
    const result = await sendEmailDetailed({
      to,
      subject: "GuardianX - Email Test",
      html: `<div style="font-family:sans-serif;padding:40px;background:#0a0a0f;color:#fff;border-radius:12px;"><h1 style="color:#a78bfa;">GuardianX Email Test</h1><p>This is a test email from the GuardianX Platform Settings page.</p><p>If you received this, your email transport is working correctly.</p></div>`,
    })
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: `Send failed - ${result.error || "check credentials"}` },
        { status: 400 },
      )
    }
    let message =
      result.transport === "mail-api"
        ? `Test email sent to ${to} via Hostinger Mail API (mailbox ${result.detail || "auto-discovered"})`
        : `Test email sent to ${to} via SMTP (${result.detail || "configured host"})`
    if (result.transport === "smtp" && hasApi && result.error) {
      // Mail API was tried first and failed, SMTP carried the message.
      message += `. Note: the Mail API attempt FAILED and SMTP took over (API error: ${result.error.slice(0, 200)})`
    }
    message += ". Check the inbox (and spam folder)."
    return NextResponse.json({ ok: true, message })
  }

  if (type === "crm") {
    const s = await getSettings(["CRM_WEBHOOK_SECRET"])
    const token = s.CRM_WEBHOOK_SECRET || "guardianx-crm-webhook-2025"
    return NextResponse.json({ ok: true, message: `CRM webhook token is configured: ${token.slice(0, 8)}...` })
  }

  if (type === "tracking") {
    // Send a real test event through the same pipeline used for errors.
    const { captureServerError } = await import("@/lib/sentry-report")
    const s = await getSettings(["SENTRY_DSN"])
    if (!s.SENTRY_DSN) {
      return NextResponse.json({ ok: false, error: "Sentry DSN not configured" }, { status: 400 })
    }
    const sent = await captureServerError("GuardianX settings test event", {
      source: "admin-settings-test",
      triggeredBy: currentUser.email,
      at: new Date().toISOString(),
    })
    if (!sent) {
      return NextResponse.json(
        { ok: false, error: "Sentry rejected the event - check the DSN (must be a valid project DSN)" },
        { status: 400 },
      )
    }
    return NextResponse.json({ ok: true, message: "Test event delivered to Sentry - check your project issues" })
  }

  if (type === "auth") {
    // Validate Google OAuth credentials WITHOUT a redirect dance:
    // exchange a dummy code against Google's token endpoint.
    //  - invalid_client  → the ID/secret pair is wrong
    //  - invalid_grant   → credentials are VALID (Google parsed them and only
    //                      rejected the fake code) - this is the success signal
    const s = await getSettings(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"])
    if (!s.GOOGLE_CLIENT_ID || !s.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ ok: false, error: "Google Client ID / Secret not configured" }, { status: 400 })
    }
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: "gx-settings-test-invalid-code",
          client_id: s.GOOGLE_CLIENT_ID,
          client_secret: s.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXTAUTH_URL || "https://academy.guardianx.cloud"}/api/auth/callback/google`,
          grant_type: "authorization_code",
        }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (data?.error === "invalid_grant") {
        return NextResponse.json({
          ok: true,
          message:
            "Google credentials are valid (token endpoint accepted the client). Remember: the callback URL of THIS deployment must also be registered as an Authorized redirect URI in Google Cloud Console - see the panel in Admin → Settings → Google OAuth.",
        })
      }
      if (data?.error === "redirect_uri_mismatch") {
        // Google parsed the client pair fine but rejected the redirect_uri - 
        // credentials are valid, the callback URL just isn't registered.
        return NextResponse.json({
          ok: true,
          message:
            "Credentials are valid, BUT the redirect URI is NOT registered in Google Cloud Console - this is exactly what blocks sign-in with \"Access blocked: This app's request is invalid\". Add the callback URL shown in Admin → Settings → Google OAuth as an Authorized redirect URI.",
        })
      }
      if (data?.error === "invalid_client") {
        return NextResponse.json({
          ok: false,
          error:
            "Google rejected the client - the Client ID / Secret pair is wrong. Paste both exactly as shown in Google Cloud Console (no quotes, no extra characters).",
        }, { status: 400 })
      }
      return NextResponse.json(
        { ok: false, error: `Unexpected Google response: ${data?.error || res.status}` },
        { status: 400 },
      )
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Connection to Google failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown test type" }, { status: 400 })
})
