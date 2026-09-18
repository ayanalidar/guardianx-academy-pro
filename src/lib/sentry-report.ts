import { getSetting } from "@/lib/settings"

/**
 * Lightweight Sentry reporter — no SDK required.
 *
 * The SENTRY_DSN platform setting (Admin → Settings → Error Tracking) is
 * consumed HERE, which makes the setting real: unhandled API-route errors
 * and client-side React errors are forwarded to Sentry's Envelope API.
 * Zero dependencies, fire-and-forget, hard timeout — reporting can never
 * break request handling.
 *
 * Server side: captureServerError() — called from withErrorHandler().
 * Client side: captureClientError() — POSTs a compact payload to
 *              /api/telemetry/client-error which forwards to Sentry with
 *              per-IP rate limiting (browsers can't hold the DSN secret).
 */

const SEND_TIMEOUT_MS = 2500
const MAX_EXTRA_BYTES = 4096

/** Parse a Sentry DSN into its Envelope endpoint + auth pieces. */
function parseDsn(dsn: string): { endpoint: string; publicKey: string } | null {
  try {
    const url = new URL(dsn)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    const publicKey = url.username
    const projectId = url.pathname.replace(/^\//, "")
    if (!publicKey || !projectId) return null
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/envelope/`
    return { endpoint, publicKey }
  } catch {
    return null
  }
}

function safeJson(value: unknown, maxBytes = MAX_EXTRA_BYTES): string {
  try {
    const str = JSON.stringify(value) ?? "null"
    return str.length > maxBytes ? str.slice(0, maxBytes) : str
  } catch {
    return '"[unserializable]"'
  }
}

/** POST a minimal event envelope to Sentry. Resolves true if accepted. */
async function sendEnvelope(
  dsn: string,
  payload: {
    message: string
    level: string
    platform: string
    environment: string
    extra?: Record<string, unknown>
  },
): Promise<boolean> {
  const parsed = parseDsn(dsn)
  if (!parsed) return false

  const eventId = generateEventId()
  const envelopeHeader = safeJson({
    event_id: eventId,
    sent_at: new Date().toISOString(),
    dsn,
  })
  const itemHeader = safeJson({ type: "event" })
  const eventBody = safeJson({
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: payload.platform,
    environment: payload.environment,
    level: payload.level,
    message: payload.message.slice(0, 2000),
    extra: payload.extra,
  })
  const body = `${envelopeHeader}\n${itemHeader}\n${eventBody}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const res = await fetch(parsed.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=guardianx-lite/1.0`,
      },
      body,
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function generateEventId(): string {
  // 32 hex chars (Sentry expects a uuid-shaped id). crypto.randomUUID is
  // available in Node 19+/all modern browsers — hex fallback covers the rest.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "")
  }
  let out = ""
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16)
  return out
}

/**
 * Server-side capture. Reads SENTRY_DSN from Platform Settings (DB → env).
 * Never throws, never blocks: call site does `void captureServerError(...)`.
 */
export async function captureServerError(
  message: string,
  extra?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const dsn = await getSetting("SENTRY_DSN")
    if (!dsn) return false
    return await sendEnvelope(dsn, {
      message,
      level: "error",
      platform: "node",
      environment: process.env.NODE_ENV || "development",
      extra,
    })
  } catch {
    return false
  }
}

/**
 * Client-side capture — relays to /api/telemetry/client-error (rate-limited
 * there). Fire-and-forget; silently ignores failures.
 */
export function captureClientError(
  message: string,
  extra?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return
  try {
    const body = safeJson({ message: message.slice(0, 1000), url: window.location?.pathname, extra })
    if (body.length > MAX_EXTRA_BYTES) return
    void fetch("/api/telemetry/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never surface reporting failures to the user
  }
}
