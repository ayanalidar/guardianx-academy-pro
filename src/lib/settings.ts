import { db } from "@/lib/db"

/**
 * Platform Settings - admin-configurable values stored in the DB.
 *
 * The admin enters Razorpay keys, SMTP settings, CRM webhook token, etc.
 * via the Platform Settings admin page. This helper reads from the DB
 * first, falls back to env vars if not found.
 *
 * In-memory cache: 5 minutes - avoids hitting the DB on every request.
 */

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const _cache = new Map<string, { value: string | null; expiresAt: number }>()

/**
 * Get a single setting value by key.
 * Checks DB first → falls back to process.env → returns null.
 */
export async function getSetting(key: string): Promise<string | null> {
  // Check cache
  const cached = _cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  try {
    const row = await db.platformSetting.findUnique({
      where: { key },
      select: { value: true },
    })
    const value = row?.value || process.env[key] || null

    // Cache the result
    _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL })
    return value
  } catch {
    // DB not available - fall back to env var
    return process.env[key] || null
  }
}

/**
 * Get multiple settings at once (reduces DB round trips).
 */
export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  const uncached: string[] = []

  // Check cache first
  for (const key of keys) {
    const cached = _cache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
      result[key] = cached.value
    } else {
      uncached.push(key)
    }
  }

  if (uncached.length === 0) return result

  // Fetch uncached from DB
  try {
    const rows = await db.platformSetting.findMany({
      where: { key: { in: uncached } },
      select: { key: true, value: true },
    })
    const dbMap = new Map(rows.map((r) => [r.key, r.value]))

    for (const key of uncached) {
      const value = dbMap.get(key) || process.env[key] || null
      result[key] = value
      _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL })
    }
  } catch {
    // DB not available - fall back to env vars
    for (const key of uncached) {
      result[key] = process.env[key] || null
      _cache.set(key, { value: process.env[key] || null, expiresAt: Date.now() + CACHE_TTL })
    }
  }

  return result
}

/**
 * Check if a setting is configured (non-empty).
 */
export async function isSettingConfigured(key: string): Promise<boolean> {
  const v = await getSetting(key)
  return !!v && v.trim().length > 0
}

/**
 * Clear the in-memory cache (called when a setting is updated).
 */
export function clearSettingsCache(): void {
  _cache.clear()
}

/**
 * All known setting keys + their metadata (for the admin UI).
 */
export const SETTING_DEFINITIONS = [
  // Payment (Razorpay)
  { key: "RAZORPAY_KEY_ID", label: "Razorpay Key ID", category: "payment", isSecret: false, placeholder: "rzp_live_xxxxxxxxxxxx", description: "From razorpay.com → API Keys" },
  { key: "RAZORPAY_KEY_SECRET", label: "Razorpay Key Secret", category: "payment", isSecret: true, placeholder: "••••••••••••••••", description: "From razorpay.com → API Keys" },

  // Payment (PayPal - international clients)
  { key: "PAYPAL_CLIENT_ID", label: "PayPal Client ID", category: "payment", isSecret: false, placeholder: "AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", description: "From developer.paypal.com → Apps & Credentials → Live (or Sandbox) → REST API credentials" },
  { key: "PAYPAL_CLIENT_SECRET", label: "PayPal Client Secret", category: "payment", isSecret: true, placeholder: "••••••••••••••••", description: "Paired with the Client ID from developer.paypal.com" },
  { key: "PAYPAL_ENV", label: "PayPal Environment", category: "payment", isSecret: false, placeholder: "live", description: "live or sandbox. Sandbox uses the test credentials and never charges real money" },
  { key: "PAYPAL_FX_RATE", label: "INR per 1 USD (PayPal FX rate)", category: "payment", isSecret: false, placeholder: "87", description: "Courses are priced in INR. International clients pay in USD converted at this rate (e.g. 87 means ₹4,350 becomes $50)" },

  // EMI / Installment plans (all values editable here - no redeploy needed)
  { key: "EMI_ENABLED", label: "EMI Plans Enabled", category: "payment", isSecret: false, placeholder: "true", description: "Show Pay in 2 / Pay in 3 installment options at checkout. Defaults to true when unset" },
  { key: "EMI_MIN_AMOUNT", label: "EMI Minimum Course Amount (₹)", category: "payment", isSecret: false, placeholder: "1000", description: "Installment options are hidden for courses whose final price is below this amount. Default 1000" },
  { key: "EMI_PLAN_2_SPLIT", label: "Pay in 2 - split %", category: "payment", isSecret: false, placeholder: "50,50", description: "Comma-separated percentages for the 2-installment plan. Defaults to 50,50" },
  { key: "EMI_PLAN_3_SPLIT", label: "Pay in 3 - split %", category: "payment", isSecret: false, placeholder: "40,30,30", description: "Comma-separated percentages for the 3-installment plan. Defaults to 40,30,30" },
  { key: "EMI_DUE_GAP_DAYS", label: "Days Between Installments", category: "payment", isSecret: false, placeholder: "30", description: "Each installment becomes due this many days after purchase. Default 30" },
  { key: "EMI_REMINDERS_ENABLED", label: "EMI Email Reminders", category: "payment", isSecret: false, placeholder: "true", description: "Daily cron emails students 3 days and 1 day before each installment is due, and 3 days after it becomes overdue. Default true" },

  // Receipts & tax (printed on payment receipts - email, receipt page and PDF)
  { key: "RECEIPT_COMPANY_NAME", label: "Receipt - Company Name", category: "payment", isSecret: false, placeholder: "GuardianX Academy", description: "Legal/trading name printed on receipts. Default GuardianX Academy" },
  { key: "RECEIPT_GSTIN", label: "Receipt - GSTIN", category: "payment", isSecret: false, placeholder: "01ABCDE1234F2Z5", description: "GSTIN printed on receipts. When set, a GST-included tax line is shown at the rate below; leave empty to omit tax lines" },
  { key: "RECEIPT_TAX_RATE", label: "Receipt - Tax Rate %", category: "payment", isSecret: false, placeholder: "18", description: "Rate used for the 'tax included' line on receipts (prices are tax-inclusive). Default 18" },
  { key: "RECEIPT_ADDRESS", label: "Receipt - Registered Address", category: "payment", isSecret: false, placeholder: "Nooripora, Baramulla, Kashmir 193401", description: "Address block printed on receipts" },
  { key: "RECEIPT_SUPPORT_EMAIL", label: "Receipt - Support Email", category: "payment", isSecret: false, placeholder: "academy@guardianx.in", description: "Contact email printed on receipts for billing queries" },
  { key: "RECEIPT_FOOTER_NOTE", label: "Receipt - Footer Note", category: "payment", isSecret: false, placeholder: "This is an electronically generated receipt...", description: "Small print at the bottom of every receipt" },

  // Email (SMTP)
  { key: "SMTP_HOST", label: "SMTP Host", category: "email", isSecret: false, placeholder: "smtp.hostinger.com", description: "Hostinger hPanel → Emails → SMTP config" },
  { key: "SMTP_PORT", label: "SMTP Port", category: "email", isSecret: false, placeholder: "465", description: "465 (SSL) or 587 (STARTTLS)" },
  { key: "SMTP_USER", label: "Sender Email", category: "email", isSecret: false, placeholder: "noreply@academy.guardianx.cloud", description: "The mailbox to send from" },
  { key: "SMTP_PASSWORD", label: "Sender Password", category: "email", isSecret: true, placeholder: "••••••••••", description: "The mailbox password" },
  { key: "EMAIL_FROM", label: "From Display", category: "email", isSecret: false, placeholder: "GuardianX Academy <noreply@academy.guardianx.cloud>", description: "How the sender name appears" },
  { key: "EMAIL_TO_ADMINS", label: "Admin Notification Emails", category: "email", isSecret: false, placeholder: "admin@academy.guardianx.cloud", description: "Where lead notifications are sent (comma-separated)" },

  // CRM Webhook
  { key: "CRM_WEBHOOK_SECRET", label: "CRM Webhook Token", category: "crm", isSecret: true, placeholder: "••••••••••••••••", description: "Token the Google Apps Scripts use (rotate it if it ever leaks)" },

  // Error Tracking (Sentry)
  { key: "SENTRY_DSN", label: "Sentry DSN", category: "tracking", isSecret: false, placeholder: "https://xxx@sentry.io/xxx", description: "From sentry.io → project settings" },

  // Google OAuth
  { key: "GOOGLE_CLIENT_ID", label: "Google Client ID", category: "auth", isSecret: false, placeholder: "xxx.apps.googleusercontent.com", description: "From Google Cloud Console → APIs & Services → Credentials (OAuth 2.0 Client ID)" },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google Client Secret", category: "auth", isSecret: true, placeholder: "••••••••••", description: "From Google Cloud Console → Credentials. The callback URL shown in the panel above must be registered as an Authorized redirect URI." },
]

export type SettingCategory = "payment" | "email" | "crm" | "tracking" | "auth"

export const CATEGORY_META: Record<SettingCategory, { label: string; icon: string; color: string; note?: string }> = {
  payment: { label: "Payments (Razorpay + PayPal)", icon: "💳", color: "text-emerald-300" },
  email: { label: "Email (SMTP)", icon: "📧", color: "text-cyan-300" },
  crm: { label: "CRM Webhook", icon: "🔗", color: "text-violet-300" },
  tracking: { label: "Error Tracking (Sentry)", icon: "🔴", color: "text-rose-300", note: "Requires redeploy to activate (Sentry loads at server start)" },
  auth: { label: "Google OAuth", icon: "🔵", color: "text-blue-300", note: "No redeploy needed. The callback URL shown in Admin → Settings → Google OAuth must be registered as an Authorized redirect URI in Google Cloud Console" },
}
