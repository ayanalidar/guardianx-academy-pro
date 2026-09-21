import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { db } from "@/lib/db"
import { ensureTable } from "@/lib/db-safe"

/**
 * Health endpoint - the single source of truth for "is the platform OK".
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

/**
 * One-shot schema self-sync (per serverless instance): sync the course
 * storage tables to the current Prisma schema (idempotent ADD COLUMN IF
 * NOT EXISTS / CREATE TABLE IF NOT EXISTS). Runs on the first health hit
 * after a deploy - monitors poll constantly, so production converges
 * within seconds of going live instead of failing on first write.
 */
let schemaSynced = false
async function syncSchemaOnce(): Promise<boolean> {
  if (schemaSynced) return true
  try {
    await Promise.all([
      ensureTable("Course"),
      ensureTable("Module"),
      ensureTable("Lesson"),
      ensureTable("AuthoredCourse"),
    ])
    schemaSynced = true
  } catch {
    // Never break health over a failed sync - the write paths retry it.
  }
  return schemaSynced
}

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

/**
 * Host-level self-healing state, written every cycle by watchdog v3
 * (scripts/watchdog.py). Surfaced here so /status and anyone can see the
 * platform is being actively supervised - probe results, repairs, sweep.
 * Missing/stale file simply means the watchdog is not running (or was
 * wiped); it must NEVER break the health response itself.
 */
async function readWatchdog(): Promise<Record<string, any> | null> {
  try {
    const raw = await fs.readFile("/home/z/my-project/watchdog-status.json", "utf8")
    const w = JSON.parse(raw)
    const ageSec = Math.max(0, Math.round(Date.now() / 1000 - (w.ts ?? 0)))
    const probes = (w.probes ?? {}) as Record<string, { ok?: boolean }>
    const probeEntries = Object.entries(probes)
    return {
      version: w.version ?? null,
      running: ageSec < 180,
      ageSec,
      startIso: w.startIso ?? null,
      cycle: w.cycle ?? 0,
      healthy: w.healthy ?? null,
      backoffSec: w.backoffSec ?? null,
      probesTotal: probeEntries.length,
      probesOk: probeEntries.filter(([, r]) => r?.ok).length,
      sweep: w.sweep ?? null,
      repairs: w.repairs ?? null,
      lastAction: Array.isArray(w.actions) && w.actions.length ? w.actions[w.actions.length - 1] : null,
    }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
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
    payload.schema = { synced: await syncSchemaOnce() }
  } catch (e: any) {
    payload.ok = false
    payload.db = { ok: false, error: String(e?.message ?? e).slice(0, 200) }
  }

  // ?probe=courses - deep diagnostic: run the EXACT query /api/courses uses
  // (take 1) and surface the raw Prisma error. Purpose: when production code
  // (auto-deployed latest) meets an older database schema, the catalog 500s
  // with a generic "Internal server error" and the real cause only shows in
  // host logs. This probe makes the cause visible from the outside so the
  // fix (schema sync) can be targeted. Prisma error codes: P2021 table
  // missing, P2022 column missing, P2023 relation issues.
  const url = new URL(req.url)
  if (url.searchParams.get("probe") === "courses") {
    try {
      const t0 = Date.now()
      const rows = await db.course.findMany({
        where: { published: true },
        include: {
          instructor: { select: { id: true, name: true, title: true, avatar: true } },
          modules: { select: { id: true, lessons: { select: { id: true } } } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { studentsCount: "desc" },
        take: 1,
      })
      payload.probe = { query: "courses", ok: true, ms: Date.now() - t0, rows: rows.length }
    } catch (e: any) {
      payload.probe = {
        query: "courses",
        ok: false,
        name: e?.name ?? null,
        code: e?.code ?? null,
        message: String(e?.message ?? e).slice(0, 500),
      }
    }
  }

  payload.watchdog = await readWatchdog()

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
}
