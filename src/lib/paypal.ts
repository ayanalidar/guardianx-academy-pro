import { getSettings } from "@/lib/settings"

/* ============================================================
   PayPal REST helper - international course payments
   ------------------------------------------------------------
   Courses are priced in INR in the database. PayPal cannot
   charge in INR, so international clients pay a USD equivalent
   converted at the admin-configurable PAYPAL_FX_RATE
   (INR per 1 USD, default 87).

   Configuration (Admin → Settings → Payments, or env vars):
     PAYPAL_CLIENT_ID      - REST API client id
     PAYPAL_CLIENT_SECRET  - REST API secret
     PAYPAL_ENV            - "live" (default) or "sandbox"
     PAYPAL_FX_RATE        - INR per 1 USD, default "87"

   Flow (server-side verification by construction):
     1. /api/payment/paypal/create-order → PayPal v2/checkout/orders
     2. Client renders PayPal Smart Buttons with that order id
     3. /api/payment/paypal/capture → v2/checkout/orders/{id}/capture.
        The capture call is made server-to-server with our OAuth
        token; a COMPLETED status from PayPal IS the verification.
        No client-supplied signature is ever trusted.
   ============================================================ */

const DEFAULT_FX_RATE = 87
const TOKEN_TTL_MS = 55 * 60 * 1000 // PayPal tokens live ~9h; refresh sooner

export interface PayPalConfig {
  clientId: string
  clientSecret: string
  base: string // https://api-m.paypal.com or https://api-m.sandbox.paypal.com
  env: "live" | "sandbox"
  fxRate: number
}

// Module-level OAuth token cache (per secret hash to survive config swaps)
let _tokenCache: { key: string; token: string; expiresAt: number } | null = null

export async function getPayPalConfig(): Promise<PayPalConfig | null> {
  const s = await getSettings(["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_ENV", "PAYPAL_FX_RATE"])
  const clientId = s.PAYPAL_CLIENT_ID?.trim()
  const clientSecret = s.PAYPAL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null

  const env = s.PAYPAL_ENV?.trim().toLowerCase() === "sandbox" ? "sandbox" : "live"
  const parsedRate = Number.parseFloat(s.PAYPAL_FX_RATE || "")
  const fxRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : DEFAULT_FX_RATE

  return {
    clientId,
    clientSecret,
    base: env === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com",
    env,
    fxRate,
  }
}

export function isPayPalConfiguredSync(s: { PAYPAL_CLIENT_ID?: string | null; PAYPAL_CLIENT_SECRET?: string | null }): boolean {
  return !!(s.PAYPAL_CLIENT_ID?.trim() && s.PAYPAL_CLIENT_SECRET?.trim())
}

/**
 * Convert an INR amount to the USD charge amount.
 * Rounds UP to 2 decimals so FX rounding never eats margin,
 * with a $1 floor (PayPal rejects smaller amounts for USD).
 */
export function inrToUsd(inrAmount: number, fxRate: number): number {
  const safeRate = fxRate > 0 ? fxRate : DEFAULT_FX_RATE
  const usd = Math.ceil((Number(inrAmount) / safeRate) * 100) / 100
  return Math.max(1, usd)
}

/** OAuth2 client-credentials token (cached). */
async function getAccessToken(cfg: PayPalConfig): Promise<string> {
  const cacheKey = `${cfg.base}:${cfg.clientSecret.slice(-8)}`
  if (_tokenCache && _tokenCache.key === cacheKey && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token
  }

  const res = await fetch(`${cfg.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`PayPal auth failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = await res.json() as { access_token: string; expires_in: number }
  _tokenCache = {
    key: cacheKey,
    token: json.access_token,
    expiresAt: Date.now() + Math.min(TOKEN_TTL_MS, (json.expires_in - 300) * 1000),
  }
  return _tokenCache.token
}

/** Small REST wrapper with auth + JSON handling. */
export async function paypalRest<T = any>(
  cfg: PayPalConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken(cfg)
  const res = await fetch(`${cfg.base}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      // PayPal requires a unique idempotency key on unsafe calls
      ...(method === "POST" ? { "PayPal-Request-Id": `gx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = (json as any)?.message || JSON.stringify(json).slice(0, 300)
    throw new Error(`PayPal ${path} failed (${res.status}): ${detail}`)
  }
  return json as T
}

export interface CreatedPayPalOrder {
  id: string
  status: string
}

/** Create a PayPal checkout order for a single purchase unit. */
export async function createPayPalOrder(
  cfg: PayPalConfig,
  params: { usdAmount: number; description: string; customId: string },
): Promise<CreatedPayPalOrder> {
  return paypalRest<CreatedPayPalOrder>(cfg, "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        description: params.description.slice(0, 127),
        custom_id: params.customId,
        amount: { currency_code: "USD", value: params.usdAmount.toFixed(2) },
      },
    ],
    application_context: {
      brand_name: "GuardianX Academy",
      locale: "en-US",
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
    },
  })
}

export interface CapturedPayPalOrder {
  status: string
  captureId: string | null
  payerEmail: string | null
}

/** Capture an approved PayPal order (this is the server-side verification). */
export async function capturePayPalOrder(cfg: PayPalConfig, paypalOrderId: string): Promise<CapturedPayPalOrder> {
  const res = await paypalRest<any>(cfg, "POST", `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {})
  const unit = res?.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  return {
    status: String(res?.status || ""),
    captureId: capture?.id || null,
    payerEmail: res?.payer?.email_address || null,
  }
}
