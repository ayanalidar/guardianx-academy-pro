import nodemailer, { type Transporter } from "nodemailer"
import { getSettings } from "@/lib/settings"

/**
 * GuardianX email service - dual-transport transactional email.
 *
 * Transports, in order of preference:
 *
 *   1. Hostinger Mail API  - settings MAIL_API_TOKEN (+ optional
 *      MAIL_MAILBOX_RESOURCE_ID). Plain HTTPS POST to
 *      https://api.mail.hostinger.com - the most reliable option from
 *      serverless (Vercel) and needs no mailbox password. If the mailbox
 *      Resource ID is not set, it is auto-discovered from the token via
 *      GET /api/v1/me and cached. Docs: https://api.mail.hostinger.com
 *
 *   2. SMTP via nodemailer - settings SMTP_HOST/PORT/USER/PASSWORD.
 *      Classic fallback; also used as an automatic fallback when the
 *      Mail API attempt fails.
 *
 * Settings are read from the Platform Settings DB (admin-configurable)
 * first, falling back to env vars. If no transport is configured, emails
 * are silently skipped (a warning is logged).
 */

const MAIL_API_BASE = "https://api.mail.hostinger.com"

export interface EmailAttachment {
  /** File name shown in the mail client */
  filename: string
  /** Buffer or base64-encoded string */
  content: string | Buffer
  contentType?: string
  /** Content-ID for inline images - reference from HTML as <img src="cid:logo"> */
  cid?: string
}

interface EmailSettings {
  api: { token: string; mailboxResourceId: string } | null
  smtp: { host: string; port: number; user: string; pass: string } | null
  from: string
  admins: string
}

interface OutgoingMessage {
  to: string
  subject: string
  html: string
  text: string
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  ok: boolean
  /** Which transport actually carried (or last-tried) the message */
  transport?: "mail-api" | "smtp"
  /** Transport-specific detail: mailbox resource id / smtp host */
  detail?: string
  /** Human-readable failure reason (last error when fallback was used) */
  error?: string
}

let _transporter: Transporter<any> | null = null
let _cachedSettings: EmailSettings | null = null
let _settingsCheckedAt = 0
let _mailboxIdCache: { id: string; address: string; at: number } | null = null
const SETTINGS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Fetch email transport settings from DB (via getSettings) → fall back to env vars */
async function getEmailSettings(): Promise<EmailSettings | null> {
  // Check cache
  if (_cachedSettings && Date.now() - _settingsCheckedAt < SETTINGS_CACHE_TTL) {
    return _cachedSettings
  }

  const s = await getSettings([
    "MAIL_API_TOKEN", "MAIL_MAILBOX_RESOURCE_ID",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD",
    "EMAIL_FROM", "EMAIL_TO_ADMINS",
  ])

  const apiToken = s.MAIL_API_TOKEN || process.env.MAIL_API_TOKEN || ""
  const apiMailbox = (s.MAIL_MAILBOX_RESOURCE_ID || process.env.MAIL_MAILBOX_RESOURCE_ID || "").trim()
  const host = s.SMTP_HOST || process.env.SMTP_HOST
  const port = parseInt(s.SMTP_PORT || process.env.SMTP_PORT || "465", 10)
  const user = s.SMTP_USER || process.env.SMTP_USER
  const pass = s.SMTP_PASSWORD || process.env.SMTP_PASSWORD
  const from = s.EMAIL_FROM || process.env.EMAIL_FROM || user || "noreply@guardianx.cloud"
  const admins = s.EMAIL_TO_ADMINS || process.env.EMAIL_TO_ADMINS || ""

  const api = apiToken ? { token: apiToken, mailboxResourceId: apiMailbox } : null
  const smtp = host && user && pass ? { host, port, user, pass } : null

  if (!api && !smtp) {
    _cachedSettings = null
    _settingsCheckedAt = Date.now()
    return null
  }

  _cachedSettings = { api, smtp, from, admins }
  _settingsCheckedAt = Date.now()
  return _cachedSettings
}

/** Clear the cached transporter + settings (called when admin updates settings) */
export function clearEmailCache() {
  _transporter = null
  _cachedSettings = null
  _settingsCheckedAt = 0
  _mailboxIdCache = null
}

async function getTransporter(smtp: { host: string; port: number; user: string; pass: string }): Promise<Transporter<any>> {
  if (_transporter) return _transporter
  _transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  })
  return _transporter
}

/** Extract the bare address out of "Name <addr>" or "addr" */
function extractAddress(from: string): string {
  const m = from.match(/<([^>]+)>/)
  return (m ? m[1] : from).trim()
}

/** Extract the display name out of "Name <addr>" ("" when absent) */
function extractDisplayName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/)
  return m ? m[1].trim() : ""
}

/**
 * Auto-discover which mailbox the API token can send from (GET /api/v1/me).
 * Prefers the mailbox matching the configured From address; falls back to
 * the first mailbox. Result is cached for SETTINGS_CACHE_TTL.
 */
async function resolveMailboxResourceId(token: string, preferAddress: string): Promise<{ id: string; address: string; error?: string }> {
  if (_mailboxIdCache && Date.now() - _mailboxIdCache.at < SETTINGS_CACHE_TTL) {
    return { id: _mailboxIdCache.id, address: _mailboxIdCache.address }
  }
  try {
    const res = await fetch(`${MAIL_API_BASE}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { id: "", address: "", error: `Mail API /me failed (${res.status}): ${body.slice(0, 200)}` }
    }
    const json = await res.json().catch(() => null)
    // The /me schema is loosely typed ("data: object") - parse defensively.
    const root = json?.data ?? json ?? {}
    const list: { resourceId?: string; address?: string }[] = Array.isArray(root?.mailboxes)
      ? root.mailboxes
      : Array.isArray(root?.account?.mailboxes)
        ? root.account.mailboxes
        : []
    const mailboxes = list
      .filter((m) => m?.resourceId)
      .map((m) => ({ id: String(m.resourceId), address: String(m.address || "") }))
    if (mailboxes.length === 0) {
      return { id: "", address: "", error: "Mail API /me returned no mailboxes - paste the mailbox Resource ID in Settings" }
    }
    const preferred =
      mailboxes.find((m) => preferAddress && m.address.toLowerCase() === preferAddress.toLowerCase()) || mailboxes[0]
    _mailboxIdCache = { id: preferred.id, address: preferred.address, at: Date.now() }
    return preferred
  } catch (e: any) {
    return { id: "", address: "", error: e?.message || "Mail API /me request failed" }
  }
}

/** Send via the Hostinger Mail API (POST /api/v1/mailboxes/{id}/send) */
async function sendViaMailApi(settings: EmailSettings, msg: OutgoingMessage): Promise<SendEmailResult> {
  const api = settings.api!
  if (!api.mailboxResourceId) {
    const discovered = await resolveMailboxResourceId(api.token, extractAddress(settings.from))
    if (!discovered.id) return { ok: false, transport: "mail-api", error: discovered.error }
    api.mailboxResourceId = discovered.id
  }

  const payload: Record<string, unknown> = {
    to: [msg.to],
    subject: msg.subject,
  }
  const displayName = extractDisplayName(settings.from)
  if (displayName) payload.displayName = displayName
  if (msg.html) payload.html = msg.html
  if (msg.text) payload.text = msg.text
  if (msg.attachments?.length) {
    payload.attachments = msg.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
      ...(a.contentType ? { contentType: a.contentType } : {}),
      ...(a.cid ? { cid: a.cid } : {}),
    }))
  }

  try {
    const res = await fetch(
      `${MAIL_API_BASE}/api/v1/mailboxes/${encodeURIComponent(api.mailboxResourceId)}/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${api.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return {
        ok: false,
        transport: "mail-api",
        detail: api.mailboxResourceId,
        error: `Mail API ${res.status}: ${body.slice(0, 300)}`,
      }
    }
    return { ok: true, transport: "mail-api", detail: api.mailboxResourceId }
  } catch (e: any) {
    return { ok: false, transport: "mail-api", detail: api.mailboxResourceId, error: e?.message || "Mail API request failed" }
  }
}

/** Send via classic SMTP (nodemailer) */
async function sendViaSmtp(settings: EmailSettings, msg: OutgoingMessage): Promise<SendEmailResult> {
  const smtp = settings.smtp!
  try {
    const t = await getTransporter(smtp)
    await t.sendMail({
      from: settings.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        cid: a.cid,
        // nodemailer treats raw strings as utf8 - flag base64 strings explicitly
        ...(Buffer.isBuffer(a.content) ? {} : { encoding: "base64" as const }),
      })),
    })
    return { ok: true, transport: "smtp", detail: smtp.host }
  } catch (err: any) {
    return { ok: false, transport: "smtp", detail: smtp.host, error: err?.message || "SMTP send failed" }
  }
}

/** Check if email is configured (checks DB first, then env) */
export async function isEmailConfigured(): Promise<boolean> {
  const settings = await getEmailSettings()
  return !!settings && (!!settings.api || !!settings.smtp)
}

/**
 * Send an email with detailed transport reporting. Prefers the Hostinger
 * Mail API when MAIL_API_TOKEN is set; automatically falls back to SMTP on
 * API failure when SMTP credentials exist.
 */
export async function sendEmailDetailed({
  to, subject, html, text, body, attachments, type: _t, userId: _u,
}: {
  to: string; subject: string; html?: string; text?: string; body?: string
  attachments?: EmailAttachment[]; type?: string; userId?: string
}): Promise<SendEmailResult> {
  const settings = await getEmailSettings()
  if (!settings || (!settings.api && !settings.smtp)) {
    console.warn("[email] No transport configured (Mail API / SMTP) - skipping email to:", to)
    return { ok: false, error: "No email transport configured" }
  }

  const msg: OutgoingMessage = {
    to,
    subject,
    html: html || (body ? `<pre style="white-space: pre-wrap;">${body}</pre>` : ""),
    text: text || body || (html ? html.replace(/<[^>]*>/g, "") : ""),
    attachments,
  }

  if (settings.api) {
    const apiResult = await sendViaMailApi(settings, msg)
    if (apiResult.ok) return apiResult
    console.error("[email] Mail API send failed:", apiResult.error)
    if (!settings.smtp) return apiResult
    console.warn("[email] Falling back to SMTP")
    const smtpResult = await sendViaSmtp(settings, msg)
    return smtpResult.ok
      ? { ...smtpResult, error: apiResult.error }
      : { ok: false, error: `Mail API: ${apiResult.error} | SMTP: ${smtpResult.error}` }
  }

  return sendViaSmtp(settings, msg)
}

/** Send an email (boolean convenience wrapper around sendEmailDetailed) */
export async function sendEmail({
  to, subject, html, text, body, type: _t, userId: _u,
}: {
  to: string; subject: string; html?: string; text?: string; body?: string; type?: string; userId?: string
}): Promise<boolean> {
  const result = await sendEmailDetailed({ to, subject, html, text, body })
  return result.ok
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
 * SECURITY (hardened): now a keyed HMAC-SHA256 (was an unkeyed SHA-256 over
 * guessable fields, which anyone could forge). Re-exported from
 * @/lib/credentials so issuance and verification always share one
 * implementation. verifyVerificationHash() accepts legacy unkeyed hashes
 * for certificates issued before this change.
 */
export {
  generateVerificationHash,
  verifyVerificationHash,
  legacyVerificationHash,
  generateCredentialId,
  isPlausibleCredentialId,
  getSigningSecret,
} from "@/lib/credentials"
