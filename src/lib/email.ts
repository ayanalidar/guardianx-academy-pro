import nodemailer from "nodemailer"
import { createHash } from "crypto"
import { getSettings } from "@/lib/settings"

/**
 * GuardianX email service — sends transactional emails via SMTP.
 *
 * Reads SMTP settings from the Platform Settings DB (admin-configurable)
 * first, falls back to env vars. If neither is configured, emails are
 * silently skipped.
 *
 * Settings: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM, EMAIL_TO_ADMINS
 */

let _transporter: nodemailer.Transporter | null = null
let _cachedSettings: { host: string; port: number; user: string; pass: string; from: string; admins: string } | null = null
let _settingsCheckedAt = 0
const SETTINGS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Fetch SMTP settings from DB (via getSetting) → fall back to env vars */
async function getEmailSettings() {
  // Check cache
  if (_cachedSettings && Date.now() - _settingsCheckedAt < SETTINGS_CACHE_TTL) {
    return _cachedSettings
  }

  const s = await getSettings([
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD",
    "EMAIL_FROM", "EMAIL_TO_ADMINS",
  ])

  const host = s.SMTP_HOST || process.env.SMTP_HOST
  const port = parseInt(s.SMTP_PORT || process.env.SMTP_PORT || "465", 10)
  const user = s.SMTP_USER || process.env.SMTP_USER
  const pass = s.SMTP_PASSWORD || process.env.SMTP_PASSWORD
  const from = s.EMAIL_FROM || process.env.EMAIL_FROM || user || "noreply@guardianx.cloud"
  const admins = s.EMAIL_TO_ADMINS || process.env.EMAIL_TO_ADMINS || ""

  if (!host || !user || !pass) {
    _cachedSettings = null
    _settingsCheckedAt = Date.now()
    return null
  }

  _cachedSettings = { host, port, user, pass, from, admins }
  _settingsCheckedAt = Date.now()
  return _cachedSettings
}

/** Clear the cached transporter + settings (called when admin updates settings) */
export function clearEmailCache() {
  _transporter = null
  _cachedSettings = null
  _settingsCheckedAt = 0
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (_transporter) return _transporter
  const settings = await getEmailSettings()
  if (!settings) return null
  _transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.pass },
  })
  return _transporter
}

/** Check if email is configured (checks DB first, then env) */
export async function isEmailConfigured(): Promise<boolean> {
  const settings = await getEmailSettings()
  return !!settings
}

export async function sendEmail({
  to, subject, html, text, body, type: _t, userId: _u,
}: {
  to: string; subject: string; html?: string; text?: string; body?: string; type?: string; userId?: string
}): Promise<boolean> {
  const [t, settings] = await Promise.all([getTransporter(), getEmailSettings()])
  if (!t || !settings) {
    console.warn("[email] SMTP not configured — skipping email to:", to)
    return false
  }
  try {
    await t.sendMail({
      from: settings.from,
      to,
      subject,
      html: html || (body ? `<pre style="white-space: pre-wrap;">${body}</pre>` : ""),
      text: text || body || (html ? html.replace(/<[^>]*>/g, "") : ""),
    })
    return true
  } catch (err) {
    console.error("[email] Failed to send email:", err)
    return false
  }
}

/** Send a notification email to the admin team */
export async function notifyAdmins(subject: string, html: string): Promise<boolean> {
  const settings = await getEmailSettings()
  if (!settings?.admins) return false
  return sendEmail({ to: settings.admins, subject, html })
}

/**
 * Generate a magic-link email HTML template.
 */
export function magicLinkEmailTemplate(name: string, link: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; padding: 40px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Guardian<span style="color: #a78bfa;">X</span> Academy</h1>
    <p style="color: #6b7280; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px;">Secure · Learn · Defend</p>
  </div>
  <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 16px;">Sign in to GuardianX</h2>
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">Hi ${name},</p>
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">Click the button below to sign in to your GuardianX Academy account. This link expires in 24 hours and can only be used once.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">Sign in to GuardianX</a>
  </div>
  <p style="color: #6b7280; font-size: 12px; line-height: 1.6;">If you didn't request this login link, you can safely ignore this email. Your account is safe.</p>
  <hr style="border: none; border-top: 1px solid #1f2937; margin: 32px 0;" />
  <p style="color: #4b5563; font-size: 11px;">GuardianX Academy · Cyber Security Training in India<br>academy.guardianx.cloud</p>
</div>
`
}

/**
 * Generate a lead notification email HTML template.
 */
export function leadNotificationEmailTemplate(type: string, fields: { label: string; value: string }[]): string {
  const rows = fields.map(f => `<tr><td style="color: #6b7280; font-size: 12px; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.1em;">${f.label}</td><td style="color: #ffffff; font-size: 14px; padding: 4px 0 4px 16px;">${f.value}</td></tr>`).join("")
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; padding: 40px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Guardian<span style="color: #a78bfa;">X</span> Academy</h1>
  </div>
  <h2 style="color: #a78bfa; font-size: 18px; margin-bottom: 16px;">New ${type}</h2>
  <table style="width: 100%; border-collapse: collapse;">${rows}</table>
  <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">View this lead in the admin panel at academy.guardianx.cloud</p>
</div>
`
}

/**
 * Generate a tamper-evident verification hash for a certificate.
 * Used by the certificate issuance + verification endpoints.
 *
 * Hash = SHA-256(credentialId | userId | courseId | issuedAt)
 */
export function generateVerificationHash(
  credentialId: string,
  userId: string,
  courseId: string,
  issuedAt: Date | string
): string {
  const iso = typeof issuedAt === "string" ? issuedAt : issuedAt.toISOString()
  return createHash("sha256")
    .update(`${credentialId}|${userId}|${courseId}|${iso}`)
    .digest("hex")
}
