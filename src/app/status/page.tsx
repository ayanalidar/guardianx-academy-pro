"use client"

import { useEffect, useState } from "react"

/**
 * GuardianX System Status - live self-healing dashboard.
 *
 * Public page that renders /api/health every 15s: platform health, DB,
 * data counts, build, and the watchdog v3 supervision matrix (feature
 * probes, route sweep, repairs, recent self-healing actions).
 */

type Health = {
  ok: boolean
  time?: string
  buildId?: string | null
  uptimeSec?: number
  db?: { ok: boolean; latencyMs?: number; error?: string }
  counts?: { courses?: number; users?: number; exams?: number }
  watchdog?: {
    version?: number | null
    running?: boolean
    ageSec?: number
    startIso?: string | null
    cycle?: number
    healthy?: boolean | null
    backoffSec?: number | null
    probesTotal?: number
    probesOk?: number
    sweep?: { checked?: number; bad?: string[]; ts?: string } | null
    repairs?: { restarts15m?: number; rebuilds?: number; reseeds?: number; totalActions?: number }
    lastAction?: string | null
  } | null
}

const OK = "#34d399"
const BAD = "#f87171"
const WARN = "#fbbf24"

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-lg font-semibold" style={{ color: color ?? "#e2e8f0" }}>{value}</div>
    </div>
  )
}

export default function StatusPage() {
  const [h, setH] = useState<Health | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" })
        const j = (await r.json()) as Health
        if (alive) { setH(j); setErr(null) }
      } catch {
        if (alive) setErr("Cannot reach /api/health - the watchdog will restart the platform automatically if it is down.")
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const w = h?.watchdog
  const overall: "ok" | "healing" | "down" =
    err || !h ? "down" : h.ok && (w?.running ?? false) && (w?.healthy ?? true) ? "ok" : "healing"

  const banner =
    overall === "ok"
      ? { text: "ALL SYSTEMS OPERATIONAL - SELF-HEALING ACTIVE", c: OK }
      : overall === "healing"
        ? { text: "SELF-HEALING IN PROGRESS - WATCHDOG IS REPAIRING THE PLATFORM", c: WARN }
        : { text: "PLATFORM UNREACHABLE - WATCHDOG WILL RESTORE IT AUTOMATICALLY", c: BAD }

  return (
    <div className="min-h-screen bg-[#0B0F1A] px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Guardian<span className="text-cyan-400">X</span> System Status
            </h1>
            <p className="text-sm text-slate-500">Live self-healing monitor - refreshes every 15s</p>
          </div>
          <a href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-500 hover:text-cyan-300">
            ← Back to Academy
          </a>
        </header>

        <div
          className="mb-6 rounded-xl border px-5 py-4 text-sm font-semibold tracking-wide"
          style={{ borderColor: banner.c, color: banner.c, background: `${banner.c}14` }}
        >
          ● {banner.text}
        </div>

        {err && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-5 text-sm text-red-300">{err}</div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Application">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Platform" value={h ? (h.ok ? "Healthy" : "Degraded") : " - "} color={h?.ok ? OK : BAD} />
              <Stat label="Database" value={h?.db ? (h.db.ok ? `OK ${h.db.latencyMs ?? "?"}ms` : "Down") : " - "} color={h?.db?.ok ? OK : BAD} />
              <Stat label="Uptime" value={h?.uptimeSec != null ? `${Math.floor(h.uptimeSec / 60)}m` : " - "} />
              <div className="col-span-2 sm:col-span-3">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Build</div>
                <div className="truncate font-mono text-sm text-cyan-300">{h?.buildId ?? "unknown"}</div>
              </div>
            </div>
          </Card>

          <Card title="Data Integrity (auto-reseeded if empty)">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Courses" value={h?.counts?.courses ?? " - "} color={(h?.counts?.courses ?? 0) > 0 ? OK : BAD} />
              <Stat label="Exams" value={h?.counts?.exams ?? " - "} color={(h?.counts?.exams ?? 0) > 0 ? OK : BAD} />
              <Stat label="Users" value={h?.counts?.users ?? " - "} color={(h?.counts?.users ?? 0) > 0 ? OK : BAD} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              If any counter hits zero (data loss), the watchdog reseeds the platform automatically and verifies recovery.
            </p>
          </Card>

          <Card title={`Watchdog v${w?.version ?? 3} - Supervision`}>
            {w ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Running" value={w.running ? "Yes" : `Stale ${w.ageSec}s`} color={w.running ? OK : BAD} />
                <Stat label="Cycles" value={w.cycle ?? 0} />
                <Stat label="Probes OK" value={`${w.probesOk ?? 0}/${w.probesTotal ?? 0}`} color={w.probesOk === w.probesTotal ? OK : WARN} />
                <Stat label="Backoff" value={w.backoffSec != null ? `${w.backoffSec}s` : " - "} />
                <div className="col-span-2 sm:col-span-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    Route sweep (every 2.5 min)
                  </div>
                  <div className="text-sm" style={{ color: (w.sweep?.bad?.length ?? 0) === 0 ? OK : BAD }}>
                    {w.sweep
                      ? `${w.sweep.checked ?? 0} routes checked${w.sweep.bad?.length ? ` - FAILING: ${w.sweep.bad.join(", ")}` : " - all responding"}`
                      : "first sweep pending"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Watchdog state unavailable - the nurse process will (re)start it within 60s.</p>
            )}
          </Card>

          <Card title="Repairs (15-minute window)">
            <div className="grid grid-cols-4 gap-4">
              <Stat label="Restarts" value={w?.repairs?.restarts15m ?? 0} />
              <Stat label="Rebuilds" value={w?.repairs?.rebuilds ?? 0} />
              <Stat label="Reseeds" value={w?.repairs?.reseeds ?? 0} />
              <Stat label="Actions" value={w?.repairs?.totalActions ?? 0} />
            </div>
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Last self-healing action</div>
              <div className="mt-1 font-mono text-xs text-cyan-300">{w?.lastAction ?? "no repairs needed - all cycles green"}</div>
            </div>
          </Card>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-600">
          Self-healing stack: client (retry + VersionWatch auto-reload) · app (/api/health) · host (watchdog v3 + nurse) - 
          repairs are verified after every action; failures escalate automatically.
        </footer>
      </div>
    </div>
  )
}
