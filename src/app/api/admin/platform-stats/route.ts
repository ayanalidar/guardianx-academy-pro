import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/platform-stats
 * ADMIN-only. Returns ALL platform stats (including hidden ones) for
 * management - unlike the public /api/platform-stats which only returns
 * visible ones.
 */
export const GET = withErrorHandler(async () => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const stats = await db.platformStat.findMany({
    orderBy: [{ key: "asc" }],
  })

  return NextResponse.json({ stats, count: stats.length })
})

/* POST /api/admin/platform-stats
 * ADMIN-only. Create a new stat OR update an existing one (upsert by key).
 *
 * Body: { key, label, value, source?, displayStatus?, suffix?, icon?, color? }
 */
export const POST = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { key, label, value, source, displayStatus, suffix, icon, color } = body

  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return NextResponse.json({ error: "key is required" }, { status: 400 })
  }
  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "label is required" }, { status: 400 })
  }
  if (value === undefined || value === null) {
    return NextResponse.json({ error: "value is required" }, { status: 400 })
  }

  const stat = await db.platformStat.upsert({
    where: { key: key.trim() },
    update: {
      label: label.trim(),
      value: String(value),
      source: source || "manual",
      displayStatus: displayStatus || "visible",
      suffix: suffix ?? null,
      icon: icon || "Users",
      color: color || "text-violet-300",
      updatedBy: currentUser.id,
    },
    create: {
      key: key.trim(),
      label: label.trim(),
      value: String(value),
      source: source || "manual",
      displayStatus: displayStatus || "visible",
      suffix: suffix ?? null,
      icon: icon || "Users",
      color: color || "text-violet-300",
      updatedBy: currentUser.id,
    },
  })

  return NextResponse.json({ ok: true, stat })
})
