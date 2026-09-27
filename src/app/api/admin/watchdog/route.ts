import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { clearSettingsCache, getSettings } from "@/lib/settings"
import { isEmailConfigured, sendEmailDetailed } from "@/lib/email"
import { logWatchdogEvent, runWatchdogSweep, WATCHDOG_VERSION } from "@/lib/watchdog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Admin Watchdog API - backs the Watchdog card in Admin → Platform Health.
 *
 * GET  /api/admin/watchdog
 *        → { watchdogVersion, enabled, lastSweepAt, cycle, report, events,
 *            emailConfigured }
 * POST /api/admin/watchdog  { action: "set-enabled", enabled: boolean }
 *        → persist the master Enable/Pause toggle (admin action, audited)
 * POST /api/admin/watchdog  { action: "sweep" }
 *        → run one full supervision sweep NOW (bypasses the pause flag)
 * POST /api/admin/watchdog  { action: "test-alert" }
 *        → send a test escalation email to the ops inbox
 */

export const GET = withErrorHandler(async () => {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  let enabledRow: { value: string } | null = null
  let lastSweepRow: { value: string } | null = null
  let cycleRow: { value: string } | null = null
  let reportRow: { value: string } | null = null
  let events: Array<{ id: string; level: string; message: string; timestamp: Date; meta: string }> = []
  try {
    const [enabled, lastSweep, cycle, report, evs] = await Promise.all([
      db.platformSetting.findUnique({ where: { key: "WATCHDOG_ENABLED" }, select: { value: true } }),
      db.platformSetting.findUnique({ where: { key: "WATCHDOG_LAST_SWEEP" }, select: { value: true } }),
      db.platformSetting.findUnique({ where: { key: "WATCHDOG_CYCLE" }, select: { value: true } }),
      db.platformSetting.findUnique({ where: { key: "WATCHDOG_LAST_REPORT" }, select: { value: true } }),
      db.systemEvent.findMany({
        where: { source: "watchdog" },
        orderBy: { timestamp: "desc" },
        take: 15,
      }),
    ])
    enabledRow = enabled
    lastSweepRow = lastSweep
    cycleRow = cycle
    reportRow = report
    events = evs
  } catch {
    // DB hiccup - return defaults so the card still renders.
  }

  let report: unknown = null
  try {
    report = reportRow?.value ? JSON.parse(reportRow.value) : null
  } catch {
    report = null
  }

  const emailConfigured = await isEmailConfigured().catch(() => false)

  return NextResponse.json({
    watchdogVersion: WATCHDOG_VERSION,
    enabled: enabledRow?.value !== "false", // absent = enabled (secure default)
    lastSweepAt: lastSweepRow?.value ?? null,
    cycle: Number(cycleRow?.value || "0"),
    report,
    events,
    emailConfigured,
  })
})

export const POST = withErrorHandler(async (req: Request) => {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const who = (admin as any)?.email || (admin as any)?.id || "admin"

  let body: { action?: string; enabled?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  if (body.action === "set-enabled") {
    const enabled = !!body.enabled
    try {
      await db.platformSetting.upsert({
        where: { key: "WATCHDOG_ENABLED" },
        update: { value: enabled ? "true" : "false" },
        create: { key: "WATCHDOG_ENABLED", value: enabled ? "true" : "false", category: "system", isSecret: false },
      })
      // settings.ts caches reads for 5 min - flush so the change is immediate.
      clearSettingsCache()
      await logWatchdogEvent("info", `Watchdog ${enabled ? "ENABLED" : "PAUSED"} by ${who}`, {
        kind: "toggle",
        enabled,
        by: who,
      })
    } catch (e: any) {
      return NextResponse.json({ error: String(e?.message ?? e).slice(0, 200) }, { status: 500 })
    }
    return NextResponse.json({ ok: true, enabled })
  }

  if (body.action === "sweep") {
    // Manual sweeps bypass the pause flag - an admin asking for it is explicit.
    const report = await runWatchdogSweep("manual")
    return NextResponse.json({ ok: true, report })
  }

  if (body.action === "test-alert") {
    const cfg = await getSettings(["EMAIL_TO_ADMINS"])
    const to = cfg.EMAIL_TO_ADMINS || process.env.EMAIL_TO_ADMINS || ""
    if (!to) {
      return NextResponse.json(
        { ok: false, error: "No EMAIL_TO_ADMINS configured - set it in Admin → Settings (category: email)" },
        { status: 400 }
      )
    }
    const res = await sendEmailDetailed({
      to,
      subject: `[GuardianX Watchdog v${WATCHDOG_VERSION}] test alert - delivery OK`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0a0f;color:#e5e7eb;max-width:600px;margin:0 auto;padding:32px;border-radius:12px"><h1 style="color:#fff;font-size:20px;margin:0 0 8px">Guardian<span style="color:#22d3ee">X</span> Watchdog v${WATCHDOG_VERSION}</h1><p>This is a <b>test alert</b> triggered from Admin → Platform Health. If you can read this, the escalation path works end to end.</p></div>`,
      text: `GuardianX Watchdog v${WATCHDOG_VERSION} - test alert. Escalation path works.`,
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error || "send failed" }, { status: 502 })
    }
    await logWatchdogEvent("info", `Test alert email sent (triggered by ${who})`, { kind: "alert", by: who })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
})
