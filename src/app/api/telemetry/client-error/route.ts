import { NextRequest, NextResponse } from "next/server"
import { captureServerError } from "@/lib/sentry-report"

export const runtime = "nodejs"

/**
 * POST /api/telemetry/client-error - public error relay.
 *
 * The browser can't hold the Sentry DSN (it's an admin secret), so client
 * errors (React error boundary, window handlers) are POSTed here and
 * forwarded to Sentry server-side when SENTRY_DSN is configured.
 *
 * Abuse hardening (this endpoint is unauthenticated by design):
 *  - body capped at 4 KB
 *  - per-IP in-memory rate limit: 10 events / minute
 *  - nothing is stored in the DB - forwarding + console only
 *  - always responds { ok: true } so probes learn nothing
 */

const WINDOW_MS = 60 * 1000
const MAX_PER_WINDOW = 10
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    // opportunistic cleanup so the map can't grow unbounded
    if (hits.size > 5000) {
      for (const [key, value] of hits) {
        if (now > value.resetAt) hits.delete(key)
      }
    }
    return false
  }
  entry.count++
  return entry.count > MAX_PER_WINDOW
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: true })
  }

  const raw = await req.text().catch(() => "")
  if (raw.length > 4096) {
    return NextResponse.json({ ok: true })
  }

  let message = "Client error"
  let url: string | undefined
  let stack: string | undefined
  try {
    const body = JSON.parse(raw)
    if (typeof body?.message === "string" && body.message.trim()) {
      message = body.message.trim().slice(0, 1000)
    }
    if (typeof body?.url === "string") url = body.url.slice(0, 300)
    if (typeof body?.extra?.stack === "string") stack = body.extra.stack.slice(0, 1500)
    else if (typeof body?.stack === "string") stack = body.stack.slice(0, 1500)
  } catch {
    return NextResponse.json({ ok: true })
  }

  console.warn("[client-error]", ip, url || "-", message)

  // Forward to Sentry when configured - fire-and-forget, never block.
  void captureServerError("client: " + message, {
    "client.url": url,
    "client.stack": stack,
    "client.ip": ip,
  })

  return NextResponse.json({ ok: true })
}
