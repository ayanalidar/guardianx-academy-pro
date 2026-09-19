import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { db } from "@/lib/db"

/**
 * Health endpoint — the single source of truth for "is the platform OK".
 *
 * Used by two self-healing loops:
 *  - Host watchdog (scripts/watchdog.py): restarts next/postgres when this
 *    reports unhealthy, and re-seeds the DB when it reports zero courses.
 *  - Client VersionWatch: polls buildId so long-lived SPA tabs reload
 *    themselves after a redeploy instead of running stale code.
 *
 * Always answers 200 with { ok: true|false } so both watchers can parse the
 * body even when subsystems are down (a 5xx would tell them "down" without
 * telling them WHY).
 */

export const dynamic = "force-dynamic"

let cachedBuildId: string | null = null
let buildIdRead = false

async function readBuildId(): Promise<string | null> {
  if (buildIdRead) return cachedBuildId
  try {
    cachedBuildId = (await fs.readFile(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8")).trim()
  } catch {
    cachedBuildId = null
  }
  buildIdRead = true
  return cachedBuildId
}

export async function GET() {
  const payload: Record<string, any> = {
    ok: true,
    service: "guardianx-academy",
    buildId: await readBuildId(),
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  }

  try {
    const t0 = Date.now()
    await db.$queryRaw`SELECT 1`
    payload.db = { ok: true, latencyMs: Date.now() - t0 }
    // Row counts power the watchdog's auto-reseed trigger (empty DB → seed).
    const [courses, users, exams] = await Promise.all([
      db.course.count(),
      db.user.count(),
      db.exam.count(),
    ])
    payload.counts = { courses, users, exams }
  } catch (e: any) {
    payload.ok = false
    payload.db = { ok: false, error: String(e?.message ?? e).slice(0, 200) }
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
}
