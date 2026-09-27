import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { ensureTable } from "@/lib/db-safe"
import { getSettings } from "@/lib/settings"
import { sendEmailDetailed, isEmailConfigured } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"

/**
 * Watchdog v4 - autonomous platform supervision, serverless-safe.
 *
 * v3 was a host-level Python process (restart next/postgres + reseed). That
 * design cannot run on Vercel (no persistent process, no restart authority),
 * so v4 moves supervision INTO the app where it works everywhere:
 *
 *   - A sweep checks DB latency, schema drift (ensureTable self-healing DDL),
 *     data counts (courses/users/exams/admins), and self-fetches the key
 *     public routes. It repairs what is safe to repair in-process (schema
 *     drift, missing emergency admin) and escalates the rest (empty catalog,
 *     dead routes) via admin email + SystemEvent records.
 *   - Triggers: (a) opportunistic - /api/health runs a sweep via after() when
 *     the last one is >5 min stale, so any visitor/monitor keeps supervision
 *     alive; (b) daily Vercel cron backstop (/api/cron/watchdog, CRON_SECRET);
 *     (c) on-demand "Run sweep now" from the admin Watchdog card; (d) the
 *     sandbox host watchdog (ops/watchdog.py) still supervises the local
 *     preview and writes the same status file v3 did.
 *   - State lives in PlatformSetting (no schema changes); every sweep logs a
 *     SystemEvent (source "watchdog") so /status, the admin card and the
 *     /api/health board all show real supervision history.
 *
 * NEVER throws into callers beyond documented behavior - a broken watchdog
 * must not become the outage it is meant to prevent.
 */

export const WATCHDOG_VERSION = 4

// PlatformSetting keys (single source of truth for sweep state)
const K_ENABLED = "WATCHDOG_ENABLED" // "true" | "false" - absent = enabled
const K_LAST_SWEEP = "WATCHDOG_LAST_SWEEP" // ISO timestamp
const K_LAST_REPORT = "WATCHDOG_LAST_REPORT" // JSON SweepReport
const K_LAST_ALERT = "WATCHDOG_LAST_ALERT" // ISO timestamp
const K_CYCLE = "WATCHDOG_CYCLE" // monotonically increasing counter

const SWEEP_STALE_MS = 5 * 60 * 1000 // opportunistic trigger threshold
const ALERT_COOLDOWN_MS = 60 * 60 * 1000 // max 1 "unhealthy" email per hour
const ROUTE_TIMEOUT_MS = 3500
const CRITICAL_ALERT_COOLDOWN_MS = 5 * 60 * 1000 // data-loss alerts: 5 min

export type SweepCheck = { name: string; ok: boolean; detail: string; latencyMs?: number }
export type SweepReport = {
  ts: string
  trigger: "opportunistic" | "cron" | "manual"
  durationMs: number
  healthy: boolean
  checks: SweepCheck[]
  routes: { checked: number; bad: string[] }
  repairs: string[]
  alerts: string[]
  cycle: number
}

// ---------------------------------------------------------------------------
// State helpers (PlatformSetting-backed, all resilient)
// ---------------------------------------------------------------------------

async function readState(): Promise<Record<string, string | null>> {
  try {
    const rows = await db.platformSetting.findMany({
      where: { key: { in: [K_ENABLED, K_LAST_SWEEP, K_LAST_REPORT, K_LAST_ALERT, K_CYCLE] } },
      select: { key: true, value: true },
    })
    const out: Record<string, string | null> = {}
    for (const k of [K_ENABLED, K_LAST_SWEEP, K_LAST_REPORT, K_LAST_ALERT, K_CYCLE]) out[k] = null
    for (const r of rows) out[r.key] = r.value
    return out
  } catch {
    return { [K_ENABLED]: null, [K_LAST_SWEEP]: null, [K_LAST_REPORT]: null, [K_LAST_ALERT]: null, [K_CYCLE]: null }
  }
}

async function writeSetting(key: string, value: string): Promise<void> {
  try {
    await db.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, category: "system", isSecret: false },
    })
  } catch {
    // State persistence failed - the sweep still happened and logged events.
  }
}

export async function isWatchdogEnabled(): Promise<boolean> {
  const s = await readState()
  return s[K_ENABLED] !== "false" // absent = enabled (secure default)
}

// ---------------------------------------------------------------------------
// Event logging + alerting
// ---------------------------------------------------------------------------

export async function logWatchdogEvent(
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.systemEvent.create({
      data: { level, source: "watchdog", message: message.slice(0, 500), meta: JSON.stringify(meta).slice(0, 2000) },
    })
  } catch {
    // Event log unavailable - never break the sweep over logging.
  }
}

async function maybeSendAlert(report: SweepReport, critical: boolean): Promise<boolean> {
  const s = await readState()
  const last = s[K_LAST_ALERT]
  const cooldown = critical ? CRITICAL_ALERT_COOLDOWN_MS : ALERT_COOLDOWN_MS
  if (last && Date.now() - new Date(last).getTime() < cooldown) return false
  await writeSetting(K_LAST_ALERT, new Date().toISOString())
  try {
    const cfg = await getSettings(["EMAIL_TO_ADMINS"])
    const to = cfg.EMAIL_TO_ADMINS || process.env.EMAIL_TO_ADMINS || ""
    if (!to) {
      report.alerts.push("alert skipped: no EMAIL_TO_ADMINS configured")
      return false
    }
    if (!(await isEmailConfigured().catch(() => false))) {
      report.alerts.push("alert skipped: no email transport configured")
      return false
    }
    const failed = report.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`)
    const rows = [
      ...failed.map((f) => `<li style="color:#f87171">${esc(f)}</li>`),
      ...report.repairs.map((r) => `<li style="color:#34d399">${esc(r)}</li>`),
      ...(report.routes.bad.length ? [`<li style="color:#f87171">Routes failing: ${esc(report.routes.bad.join(", "))}</li>`] : []),
    ]
      .join("")
    const res = await sendEmailDetailed({
      to,
      subject: `[GuardianX Watchdog v4] ${critical ? "CRITICAL" : "attention needed"} - ${hostLabel()}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;padding:32px;border-radius:12px">
  <h1 style="color:#fff;font-size:20px;margin:0 0 4px">Guardian<span style="color:#22d3ee">X</span> Watchdog v${WATCHDOG_VERSION}</h1>
  <p style="color:#6b7280;font-size:12px;margin:0 0 20px">${esc(report.trigger)} sweep · ${esc(hostLabel())} · ${esc(report.ts)}</p>
  <p style="color:#9ca3af;font-size:14px">Overall status: <b style="color:${report.healthy ? "#34d399" : "#f87171"}">${report.healthy ? "HEALTHY" : "UNHEALTHY"}</b></p>
  <ul style="padding-left:18px;font-size:13px;line-height:1.7">${rows || "<li style='color:#9ca3af'>no failing checks</li>"}</ul>
  <p style="color:#6b7280;font-size:11px;margin-top:24px">Full history: academy.guardianx.cloud → Admin → Platform Health · public board: /status</p>
</div>`,
      text: `Watchdog v${WATCHDOG_VERSION} ${report.trigger} sweep on ${hostLabel()}: ${report.healthy ? "HEALTHY" : "UNHEALTHY"}. ${failed.join(" | ")} ${report.repairs.join(" | ")}`,
    })
    if (res.ok) {
      report.alerts.push(`alert email sent to ${to.split(",")[0].trim()}`)
      return true
    }
    report.alerts.push(`alert email failed: ${String(res.error || "unknown").slice(0, 120)}`)
    return false
  } catch (e: any) {
    report.alerts.push(`alert error: ${String(e?.message ?? e).slice(0, 120)}`)
    return false
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function hostLabel(): string {
  try {
    return new URL(SITE_URL).host
  } catch {
    return SITE_URL || "localhost"
  }
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

const g = globalThis as unknown as { __gxWatchdogRunning?: boolean; __gxWdLastCheckMs?: number }

/**
 * Run one full supervision sweep. `manual` bypasses the enabled flag (the
 * admin explicitly asked for it). Returns the report; throws only on truly
 * unexpected bugs - callers should still wrap.
 */
export async function runWatchdogSweep(trigger: SweepReport["trigger"]): Promise<SweepReport> {
  if (g.__gxWatchdogRunning) {
    // Serialize sweeps across invocations on this instance; a concurrent
    // caller gets the last persisted report instead of stampeding the DB.
    const s = await readState()
    const last = s[K_LAST_REPORT]
    if (last) {
      try {
        return JSON.parse(last) as SweepReport
      } catch {
        /* fall through and run */
      }
    }
  }
  g.__gxWatchdogRunning = true
  const t0 = Date.now()
  const report: SweepReport = {
    ts: new Date().toISOString(),
    trigger,
    durationMs: 0,
    healthy: true,
    checks: [],
    routes: { checked: 0, bad: [] },
    repairs: [],
    alerts: [],
    cycle: 0,
  }

  try {
    const state = await readState()
    report.cycle = Number(state[K_CYCLE] || "0") + 1

    // Watchdog disabled? Persist nothing beyond a light audit trail.
    if (state[K_ENABLED] === "false" && trigger !== "manual") {
      report.checks.push({ name: "Watchdog", ok: true, detail: "paused by admin - sweep skipped" })
      report.healthy = true
      return report
    }

    // 1. DB liveness + latency
    {
      const c0 = Date.now()
      try {
        await db.$queryRaw`SELECT 1`
        report.checks.push({ name: "Database", ok: true, detail: "reachable", latencyMs: Date.now() - c0 })
      } catch (e: any) {
        report.checks.push({ name: "Database", ok: false, detail: String(e?.message ?? e).slice(0, 160) })
        report.healthy = false
      }
    }

    // 2. Schema drift self-heal (same tables the health endpoint syncs)
    {
      const c0 = Date.now()
      let synced = 0
      for (const t of ["Course", "Module", "Lesson", "AuthoredCourse"] as const) {
        try {
          await ensureTable(t)
          synced++
        } catch {
          /* ensureTable logs its own failure; count only successes */
        }
      }
      report.checks.push({
        name: "Schema sync",
        ok: synced === 4,
        detail: synced === 4 ? "4/4 storage tables verified" : `only ${synced}/4 tables verified`,
        latencyMs: Date.now() - c0,
      })
      if (synced !== 4) report.healthy = false
    }

    // 3. Data counts (+ data-loss repairs that are safe in-process)
    if (report.checks[0]?.ok) {
      try {
        const [courses, users, exams, admins] = await Promise.all([
          db.course.count(),
          db.user.count(),
          db.exam.count(),
          db.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
        ])
        report.checks.push({ name: "Data counts", ok: courses > 0 && users > 0, detail: `${courses} courses · ${users} users · ${exams} exams · ${admins} admins` })

        if (admins === 0 && users > 0) {
          // Catastrophic: nobody can administer the platform. Create an
          // emergency admin with a cryptographically random password and
          // email it to the ops inbox (same security posture as
          // prisma/ensure-accounts.ts: never weak defaults on prod).
          const pwd = randomBytes(18).toString("base64url")
          const { hashSync } = await import("bcryptjs")
          await db.user.create({
            data: {
              email: "admin@guardianx.io",
              name: "Emergency Admin (watchdog)",
              passwordHash: hashSync(pwd, 10),
              role: "ADMIN",
              title: "Emergency access - created by Watchdog v4",
              bio: "Auto-created because the platform had zero admin users.",
            },
          })
          const msg = `Emergency admin created (admin@guardianx.io) - password emailed to ops inbox`
          report.repairs.push(msg)
          await logWatchdogEvent("warn", msg, { kind: "repair", action: "emergency-admin" })
          console.log(`[watchdog] EMERGENCY ADMIN password (printed once): ${pwd}`)
          try {
            const cfg = await getSettings(["EMAIL_TO_ADMINS"])
            const to = cfg.EMAIL_TO_ADMINS || process.env.EMAIL_TO_ADMINS || ""
            if (to) {
              await sendEmailDetailed({
                to,
                subject: `[GuardianX Watchdog v4] EMERGENCY admin credentials - ${hostLabel()}`,
                html: `<p style="font-family:sans-serif">The platform had <b>zero admin users</b>. An emergency admin was created.</p><p style="font-family:monospace;background:#111;color:#0f0;padding:12px;border-radius:8px">admin@guardianx.io<br>${pwd}</p><p style="font-family:sans-serif;color:#888">Sign in and change this password immediately.</p>`,
                text: `EMERGENCY ADMIN - admin@guardianx.io / ${pwd} (change immediately)`,
              })
            }
          } catch {
            /* credential email best-effort; password is also in function logs */
          }
        }

        if (courses === 0) {
          // Data loss the serverless sweep cannot safely auto-repair (the
          // full course seed is a host-side script). Escalate immediately.
          report.healthy = false
          report.repairs.push("catalog EMPTY - reseed required (host ladder: bun run db:seed:full)")
          await logWatchdogEvent("error", "CATASTROPHIC: course catalog is empty - reseed required", { kind: "repair", action: "reseed-required", courses, users })
          await maybeSendAlert(report, true)
        }
      } catch (e: any) {
        report.checks.push({ name: "Data counts", ok: false, detail: String(e?.message ?? e).slice(0, 160) })
        report.healthy = false
      }
    }

    // 4. Route sweep - self-fetch the key public surfaces
    {
      const base = (process.env.WATCHDOG_SWEEP_BASE || SITE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "")
      const routes = ["/", "/courses", "/api/health", "/status"]
      for (const r of routes) {
        report.routes.checked++
        const c0 = Date.now()
        try {
          const res = await fetch(`${base}${r}`, {
            cache: "no-store",
            redirect: "manual",
            signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
            headers: { "user-agent": "GuardianX-Watchdog/4 (+health sweep)" },
          })
          const ok = res.status < 500
          report.checks.push({ name: `Route ${r}`, ok, detail: `HTTP ${res.status}`, latencyMs: Date.now() - c0 })
          if (!ok) report.routes.bad.push(`${r} (${res.status})`)
        } catch (e: any) {
          report.checks.push({ name: `Route ${r}`, ok: false, detail: String(e?.message ?? e).slice(0, 120), latencyMs: Date.now() - c0 })
          report.routes.bad.push(`${r} (error)`)
        }
      }
      if (report.routes.bad.length) report.healthy = false
    }

    // 5. Persist state + audit trail
    report.durationMs = Date.now() - t0
    await writeSetting(K_LAST_SWEEP, report.ts)
    await writeSetting(K_LAST_REPORT, JSON.stringify(report).slice(0, 8000))
    await writeSetting(K_CYCLE, String(report.cycle))
    await logWatchdogEvent(
      report.healthy ? "info" : "warn",
      `Watchdog v${WATCHDOG_VERSION} ${trigger} sweep #${report.cycle}: ${report.healthy ? "healthy" : "UNHEALTHY"} (${report.checks.filter((c) => !c.ok).length} failed, ${report.repairs.length} repairs, ${report.routes.bad.length} bad routes)`,
      { kind: "sweep", trigger, cycle: report.cycle, durationMs: report.durationMs }
    )

    // 6. Escalation email (rate-limited) when unhealthy or repairs happened
    if (!report.healthy || report.repairs.length) await maybeSendAlert(report, false)
  } catch (e: any) {
    report.healthy = false
    report.checks.push({ name: "Sweep itself", ok: false, detail: String(e?.message ?? e).slice(0, 200) })
    report.durationMs = Date.now() - t0
    await logWatchdogEvent("error", `Watchdog sweep crashed: ${String(e?.message ?? e).slice(0, 300)}`, { kind: "sweep", trigger })
  } finally {
    g.__gxWatchdogRunning = false
  }

  return report
}

/**
 * Opportunistic trigger for /api/health: run a sweep if enabled and the last
 * one is stale. Cheap on the hot path - one combined state read, and an
 * in-process 60s memo so a burst of health polls costs at most one query/min.
 */
export async function maybeOpportunisticSweep(): Promise<void> {
  const now = Date.now()
  if (g.__gxWdLastCheckMs && now - g.__gxWdLastCheckMs < 60_000) return
  g.__gxWdLastCheckMs = now
  try {
    const s = await readState()
    if (s[K_ENABLED] === "false") return
    const last = s[K_LAST_SWEEP]
    if (last && now - new Date(last).getTime() < SWEEP_STALE_MS) return
    await runWatchdogSweep("opportunistic")
  } catch {
    // DB unreachable - supervision cannot run; the health response already
    // reports the DB failure. Nothing else to do here.
  }
}

// ---------------------------------------------------------------------------
// Board synthesis for /api/health + /status (v3-compatible shape)
// ---------------------------------------------------------------------------

/**
 * Build the watchdog supervision board from DB state. Produces the SAME
 * shape the v3 host-watchdog status file produced, so the public /status
 * page and the admin card render it unchanged. Returns null when state is
 * unavailable (fresh deploy, DB down) - callers treat that as "no board".
 */
export async function synthesizeWatchdogBoard(): Promise<Record<string, any> | null> {
  const s = await readState()
  if (!s[K_LAST_SWEEP]) return null
  const lastMs = new Date(s[K_LAST_SWEEP] as string).getTime()
  const ageSec = Math.max(0, Math.round(Date.now() / 1000 - lastMs / 1000))
  let report: SweepReport | null = null
  try {
    report = s[K_LAST_REPORT] ? (JSON.parse(s[K_LAST_REPORT] as string) as SweepReport) : null
  } catch {
    report = null
  }
  const checks = report?.checks ?? []
  // 10 min: opportunistic sweeps fire every ~5 min while there are visitors;
  // the daily cron backstop alone shows as "stale" - which is honest.
  const running = ageSec < 600
  let repairs15m = { reseeds: 0, total: 0, last: null as string | null }
  try {
    const evs = await db.systemEvent.findMany({
      where: { source: "watchdog", timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
      orderBy: { timestamp: "desc" },
      take: 50,
      select: { message: true, meta: true },
    })
    repairs15m.total = evs.filter((e) => {
      try {
        return JSON.parse(e.meta)?.kind === "repair"
      } catch {
        return false
      }
    }).length
    repairs15m.reseeds = evs.filter((e) => {
      try {
        const a = JSON.parse(e.meta)?.action
        return a === "reseed" || a === "reseed-required"
      } catch {
        return false
      }
    }).length
    repairs15m.last = evs.find((e) => {
      try {
        return JSON.parse(e.meta)?.kind === "repair"
      } catch {
        return false
      }
    })?.message ?? null
  } catch {
    /* event read failed - board still renders from state */
  }
  return {
    version: WATCHDOG_VERSION,
    running,
    ageSec,
    startIso: s[K_LAST_SWEEP],
    cycle: Number(s[K_CYCLE] || "0"),
    healthy: report ? report.healthy : null,
    backoffSec: null, // serverless has no restart backoff - host-only concept
    enabled: s[K_ENABLED] !== "false",
    probesTotal: checks.length,
    probesOk: checks.filter((c) => c.ok).length,
    sweep: report
      ? { checked: report.routes.checked, bad: report.routes.bad, ts: report.ts }
      : null,
    repairs: {
      restarts15m: 0, // host-only concept (v3); serverless cannot restart infra
      rebuilds: 0,
      reseeds: repairs15m.reseeds,
      totalActions: repairs15m.total,
    },
    lastAction: repairs15m.last ?? (report ? `sweep #${report.cycle} ${report.trigger} - ${report.healthy ? "healthy" : "unhealthy"}` : null),
  }
}
