import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { SETTING_DEFINITIONS, clearSettingsCache } from "@/lib/settings"
import { clearEmailCache } from "@/lib/email"

export const runtime = "nodejs"

/* GET /api/admin/settings
 * ADMIN-only. Returns all settings (with masked secrets).
 */
export const GET = withErrorHandler(async () => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const rows = await db.platformSetting.findMany()
  const dbMap = new Map(rows.map((r) => [r.key, r]))

  const settings = SETTING_DEFINITIONS.map((def) => {
    const row = dbMap.get(def.key)
    const dbValue = row?.value || null
    const envValue = process.env[def.key] || null
    const value = dbValue || envValue

    return {
      key: def.key,
      label: def.label,
      category: def.category,
      isSecret: def.isSecret,
      placeholder: def.placeholder,
      description: def.description,
      // For secrets: mask the value unless it's empty
      value: def.isSecret && value ? "••••••••" : value || "",
      // Whether the value comes from the DB or env var
      source: dbValue ? "db" : envValue ? "env" : "unset",
      configured: !!value && value.trim().length > 0,
    }
  })

  return NextResponse.json({ settings })
})

/* PUT /api/admin/settings
 * ADMIN-only. Save one or more settings. Body: { settings: { KEY: value, ... } }
 * Empty string or null deletes the DB row (falls back to env var).
 */
export const PUT = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body?.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "settings object is required" }, { status: 400 })
  }

  const validKeys = new Set(SETTING_DEFINITIONS.map((d) => d.key))
  const updates: { key: string; value: string; category: string; isSecret: boolean }[] = []

  for (const [key, rawValue] of Object.entries(body.settings)) {
    if (!validKeys.has(key)) continue
    // Skip masked secrets (the admin didn't change them)
    if (typeof rawValue === "string" && rawValue === "••••••••") continue

    const def = SETTING_DEFINITIONS.find((d) => d.key === key)!
    const value = String(rawValue || "").trim()

    if (value) {
      updates.push({ key, value, category: def.category, isSecret: def.isSecret })
    } else {
      // Empty value → delete the DB row (fall back to env var)
      await db.platformSetting.deleteMany({ where: { key } }).catch(() => {})
    }
  }

  for (const u of updates) {
    await db.platformSetting.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value, category: u.category, isSecret: u.isSecret },
    })
  }

  // Clear the in-memory cache so changes take effect immediately
  clearSettingsCache()
  clearEmailCache()

  return NextResponse.json({ ok: true, updated: updates.length })
})
