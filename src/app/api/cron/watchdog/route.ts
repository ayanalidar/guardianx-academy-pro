import { NextRequest, NextResponse } from "next/server"
import { runWatchdogSweep, WATCHDOG_VERSION } from "@/lib/watchdog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/watchdog - Watchdog v4 supervision sweep (cron trigger).
 * ----------------------------------------------------------------------------------
 * Daily Vercel Cron backstop (see vercel.json) PLUS an external-pinger target:
 * point any free uptime/cron service at this URL with the secret header for
 * 5-minute supervision granularity on top of the opportunistic sweeps that
 * /api/health triggers while the platform has visitors.
 *
 * Secured with CRON_SECRET (same model as /api/cron/retention):
 *   - Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"
 *   - the sandbox host watchdog may use "x-watchdog-token: <CRON_SECRET>"
 * Refuses to run unprotected when CRON_SECRET is not configured.
 */

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // refuse to run unprotected
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true
  if (req.headers.get("x-watchdog-token") === secret) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const report = await runWatchdogSweep("cron")
  return NextResponse.json(
    { ok: true, watchdogVersion: WATCHDOG_VERSION, healthy: report.healthy, report },
    { headers: { "Cache-Control": "no-store" } }
  )
}
