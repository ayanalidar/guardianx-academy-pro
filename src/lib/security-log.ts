import { db } from "@/lib/db"
import { withDriftRetry } from "@/lib/db-safe"

/**
 * security-log - lightweight attack telemetry with CERT-In-aligned retention.
 * ============================================================================
 *
 * WHAT gets logged (and what must NEVER be logged):
 *   - login_failed / login_rate_limited : the ATTEMPTED email, IP, UA, reason.
 *   - login_success                     : who logged in (compromise forensics).
 *   - session_invalid                   : a session cookie was presented but
 *                                         NextAuth rejected it (expired OR
 *                                         tampered) - the forged-token signal.
 *   - rbac_denied                       : an authenticated user hit a role
 *                                         gate they don't hold.
 *   - honeypot_hit                      : a decoy endpoint was touched.
 *
 *   Passwords are NEVER persisted - not even failed-attempt values. People
 *   typo real passwords into wrong sites; storing them creates DPDPA
 *   liability without adding attribution value.
 *
 * HOW it stays safe:
 *   - logSecurityEvent() never throws (every failure is swallowed) and
 *     call sites use fire-and-forget, so a DB outage cannot take down the
 *     request it is observing.
 *   - Flood guards: max N events per (type, IP) per 5 min per instance and a
 *     hard per-instance per-minute cap, so a scanner spraying millions of
 *     requests generates bounded DB writes, not a self-DoS.
 *   - Storage self-heals via db-safe (CREATE TABLE IF NOT EXISTS on first
 *     drift error), so the feature works even before a manual db push.
 *   - Retention: /api/cron/retention purges rows older than 180 days
 *     (CERT-In 2022 log-retention prerequisite).
 *
 * An IP is NOT an identity - it is evidence. Attribution to a person
 * happens only through ISP/CERT-In legal process against preserved logs.
 */

export type SecurityEventType =
  | "login_failed"
  | "login_rate_limited"
  | "login_success"
  | "session_invalid"
  | "rbac_denied"
  | "honeypot_hit"

export type SecuritySeverity = "info" | "warning" | "critical"

const SEVERITY_BY_TYPE: Record<SecurityEventType, SecuritySeverity> = {
  login_failed: "warning",
  login_rate_limited: "warning",
  login_success: "info",
  session_invalid: "warning",
  rbac_denied: "warning",
  honeypot_hit: "warning",
}

export type SecurityEventInput = {
  type: SecurityEventType
  ip?: string | null
  country?: string | null
  city?: string | null
  userAgent?: string | null
  email?: string | null
  path?: string | null
  severity?: SecuritySeverity
  details?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Flood guards (per serverless instance; the DB write volume stays bounded
// even under an active scan). Keys expire lazily to keep the maps tiny.
// ---------------------------------------------------------------------------
const PER_KEY_WINDOW_MS = 5 * 60 * 1000
const PER_KEY_MAX = 12 // per (type, ip) per 5 min - normal attack noise
const PER_KEY_MAX_LOUD = 60 // honeypot hits + rate-limit hits carry more signal
const PROCESS_WINDOW_MS = 60_000
const PROCESS_MAX = 600 // absolute cap per instance per minute

const keyGuards = new Map<string, { count: number; resetAt: number }>()
let processCounter = { minute: 0, count: 0 }

function underFloodGuards(type: string, ip: string): boolean {
  const now = Date.now()
  const minute = Math.floor(now / PROCESS_WINDOW_MS)
  if (processCounter.minute !== minute) processCounter = { minute, count: 0 }
  processCounter.count++
  if (processCounter.count > PROCESS_MAX) return false

  const cap = type === "honeypot_hit" || type === "login_rate_limited" ? PER_KEY_MAX_LOUD : PER_KEY_MAX
  const key = `${type}:${ip}`
  const entry = keyGuards.get(key)
  if (!entry || now > entry.resetAt) {
    keyGuards.set(key, { count: 1, resetAt: now + PER_KEY_WINDOW_MS })
    if (keyGuards.size > 2000) {
      for (const [k, v] of keyGuards) if (v.resetAt <= now) keyGuards.delete(k)
    }
    return true
  }
  entry.count++
  return entry.count <= cap
}

function truncate(v: string | null | undefined, n: number): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s.slice(0, n) : null
}

/**
 * Record one security event. Fire-and-forget safe: this function resolves
 * to void and swallows every error - call sites typically use
 * `void logSecurityEvent(...)` so the observed request is never delayed.
 */
export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    const ip = truncate(input.ip, 64) || "unknown"
    if (!underFloodGuards(input.type, ip)) return
    const severity = input.severity ?? SEVERITY_BY_TYPE[input.type] ?? "info"
    await withDriftRetry("SecurityEvent", () =>
      db.securityEvent.create({
        data: {
          type: input.type,
          severity,
          ip,
          country: truncate(input.country, 8),
          city: truncate(input.city, 96),
          userAgent: truncate(input.userAgent, 200),
          email: truncate(input.email, 200),
          path: truncate(input.path, 200),
          details: JSON.stringify(input.details ?? {}).slice(0, 1500),
        },
      })
    )
  } catch {
    // Security logging must NEVER break the request it observes.
  }
}

// ---------------------------------------------------------------------------
// Request metadata extraction (works on Vercel: x-forwarded-for + geo headers)
// ---------------------------------------------------------------------------

export type SecurityMeta = {
  ip?: string
  country?: string
  city?: string
  userAgent?: string
  path?: string
}

/** Extract attacker/network metadata from a Headers object. */
export function securityMetaFromHeaders(h: Headers, path?: string): SecurityMeta {
  try {
    const xff = h.get("x-forwarded-for")
    return {
      ip: xff ? xff.split(",")[0].trim() : h.get("x-real-ip") || undefined,
      country: h.get("x-vercel-ip-country") || undefined,
      city: h.get("x-vercel-ip-city") || undefined,
      userAgent: h.get("user-agent") || undefined,
      path,
    }
  } catch {
    return { path }
  }
}

/** Extract metadata from a NextRequest (route handlers, honeypots). */
export function securityMetaFromRequest(req: {
  headers: Headers
  nextUrl?: { pathname?: string }
}): SecurityMeta {
  return securityMetaFromHeaders(req.headers, req.nextUrl?.pathname)
}
