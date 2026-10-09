import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* GET /api/status-history?days=90
 * --------------------------------
 * PUBLIC endpoint backing the uptime strip on /status (and safe for any
 * uptime checker to poll). Aggregates the watchdog's own sweep history
 * from SystemEvent (source "watchdog") into per-day liveness buckets:
 *
 *   - Sweep lines look like `Watchdog v4 <trigger> sweep #N: healthy|UNHEALTHY (...)`
 *   - Crashed sweeps log `Watchdog sweep crashed: ...` and count as bad.
 *   - Non-sweep watchdog events (repairs, reseeds) are ignored - a day
 *     with repairs but all-green sweeps stays green.
 *
 * Response contains NO private data: only dates, counts and the derived
 * per-day status. No auth by design (same class as /api/health counts);
 * add to PUBLIC_API_ROUTES in src/middleware.ts for the allowlist record.
 */

type DayBucket = { date: string; total: number; bad: number; status: "green" | "amber" | "red" | "nodata" }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const parsed = Number.parseInt(url.searchParams.get("days") || "90", 10)
    const window = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 7), 120) : 90

    const since = new Date(Date.now() - window * 86_400_000)

    // Only the two fields we need - keeps the payload small even when
    // opportunistic sweeps logged hundreds of rows per day.
    const events = await db.systemEvent.findMany({
      where: { source: "watchdog", timestamp: { gte: since } },
      select: { timestamp: true, message: true },
      orderBy: { timestamp: "asc" },
    })

    // Bucket by UTC calendar day. IST visitors see the same buckets the
    // uptime industry uses (UTC); the labels are explicit dates so no
    // timezone confusion is possible.
    const buckets = new Map<string, DayBucket>()
    const keyFor = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`

    for (let i = window - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const key = keyFor(d)
      buckets.set(key, { date: key, total: 0, bad: 0, status: "nodata" })
    }

    let totalSweeps = 0
    let totalBad = 0
    let lastSweepAt: string | null = null

    for (const ev of events) {
      const msg = ev.message
      const isSweep = msg.includes("sweep #")
      const isCrash = msg.startsWith("Watchdog sweep crashed")
      if (!isSweep && !isCrash) continue
      const key = keyFor(ev.timestamp)
      const bucket = buckets.get(key)
      if (!bucket) continue
      bucket.total++
      totalSweeps++
      lastSweepAt = ev.timestamp.toISOString()
      if (isCrash || msg.includes("UNHEALTHY")) {
        bucket.bad++
        totalBad++
      }
    }

    const days = Array.from(buckets.values()).map((b) => ({
      ...b,
      status:
        b.total === 0
          ? ("nodata" as const)
          : b.bad === 0
            ? ("green" as const)
            : b.bad / b.total < 0.5
              ? ("amber" as const)
              : ("red" as const),
    }))

    const uptimePct = totalSweeps > 0 ? Number((100 * (1 - totalBad / totalSweeps)).toFixed(2)) : null

    return NextResponse.json({
      ok: true,
      window,
      days,
      totalSweeps,
      totalBad,
      uptimePct,
      lastSweepAt,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 200), days: [], uptimePct: null },
      { status: 500 }
    )
  }
}
