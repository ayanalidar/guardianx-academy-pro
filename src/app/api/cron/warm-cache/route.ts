import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { SITE_URL } from "@/lib/site-url"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/warm-cache - morning warm-up (server-side "Fast Load").
 * ----------------------------------------------------------------------------------
 * Daily Vercel Cron at 06:00 IST (see vercel.json). Self-fetches every key
 * public surface so the platform is hot for the first visitors of the day:
 * serverless lambdas are provisioned, DB connection pools are open, edge
 * caches hold fresh renders, and the data APIs the SPA calls on landing
 * have already paid their cold-start cost.
 *
 * This is the server-side counterpart of the admin panel's Fast Load
 * button (which warms per-browser JS chunks): the button makes NAVIGATION
 * instant for the admin, this route makes the FIRST page load of the
 * morning instant for everyone.
 *
 * Secured with CRON_SECRET (same model as /api/cron/watchdog):
 *   - Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"
 *   - external ping services may use "x-watchdog-token: <CRON_SECRET>"
 * Refuses to run unprotected when CRON_SECRET is not configured.
 */

const WARM_ROUTES = [
  // Public SPA entry points (highest morning traffic first)
  "/",
  "/courses",
  "/instructors",
  "/events",
  "/blog",
  "/pricing",
  "/verify",
  "/support",
  "/status",
  // Data APIs the catalog / landing views query immediately
  "/api/courses",
  "/api/instructors",
  "/api/health",
  // SEO surfaces
  "/sitemap.xml",
  "/robots.txt",
]

const WARM_TIMEOUT_MS = 8000

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // refuse to run unprotected
  const bearer = req.headers.get("authorization") || ""
  const token = req.headers.get("x-watchdog-token") || ""
  return safeEqual(bearer, `Bearer ${secret}`) || safeEqual(token, secret)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const base = (process.env.WATCHDOG_SWEEP_BASE || SITE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "")
  const results: { route: string; status: number; ms: number }[] = []
  const bad: string[] = []
  for (const r of WARM_ROUTES) {
    const t0 = Date.now()
    try {
      const res = await fetch(`${base}${r}`, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
        headers: { "user-agent": "GuardianX-WarmCache/1 (+morning warmup)" },
      })
      const status = res.status
      results.push({ route: r, status, ms: Date.now() - t0 })
      if (status >= 500) bad.push(`${r} (${status})`)
      // Drain the body so the socket is released back to the pool.
      try {
        await res.arrayBuffer()
      } catch {}
    } catch {
      results.push({ route: r, status: 0, ms: Date.now() - t0 })
      bad.push(`${r} (error)`)
    }
  }
  return NextResponse.json(
    { ok: bad.length === 0, warmed: results.length, bad, results },
    { headers: { "Cache-Control": "no-store" } },
  )
}
