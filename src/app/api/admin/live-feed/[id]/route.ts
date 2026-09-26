import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureLiveFeedTable } from "@/lib/live-feed-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * PATCH  /api/admin/live-feed/[id] - update a curated feed entry
 *        (fields, or active: true | false to hide/show it)
 * DELETE /api/admin/live-feed/[id] - remove the entry
 * ADMIN-only. Every mutation is audit-logged.
 * ============================================================ */
const ALLOWED_COLORS = new Set(["emerald", "violet", "cyan", "amber", "rose"])

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureLiveFeedTable()
  const { id } = await params
  const existing = await db.liveFeedEntry.findUnique({ where: { id }, select: { id: true, displayName: true } })
  if (!existing) return NextResponse.json({ error: "Live feed entry not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.displayName !== undefined) {
    const v = String(body.displayName).trim()
    if (!v) return NextResponse.json({ error: "displayName cannot be empty" }, { status: 400 })
    data.displayName = v
  }
  if (body.city !== undefined) data.city = strOrNull(body.city)
  if (body.courseTitle !== undefined) {
    const v = String(body.courseTitle).trim()
    if (!v) return NextResponse.json({ error: "courseTitle cannot be empty" }, { status: 400 })
    data.courseTitle = v
  }
  if (body.courseShortName !== undefined) data.courseShortName = strOrNull(body.courseShortName)
  if (body.color !== undefined) {
    data.color = ALLOWED_COLORS.has(String(body.color)) ? String(body.color) : "emerald"
  }
  if (body.occurredAt !== undefined) {
    const d = new Date(String(body.occurredAt))
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "occurredAt must be a valid date" }, { status: 400 })
    }
    data.occurredAt = d
  }
  if (body.active !== undefined) data.active = !!body.active
  if (body.isSample !== undefined) data.isSample = !!body.isSample
  if (body.order !== undefined) {
    data.order = Number.isFinite(parseInt(String(body.order), 10)) ? parseInt(String(body.order), 10) : 0
  }

  const updated = await db.liveFeedEntry.update({ where: { id }, data })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "live-feed.update", "live-feed-entry", id, {
    displayName: updated.displayName,
    fields: Object.keys(data),
  })

  return NextResponse.json({ ok: true, id: updated.id })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureLiveFeedTable()
  const { id } = await params
  const existing = await db.liveFeedEntry.findUnique({ where: { id }, select: { id: true, displayName: true, courseTitle: true } })
  if (!existing) return NextResponse.json({ error: "Live feed entry not found" }, { status: 404 })

  await db.liveFeedEntry.delete({ where: { id } })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "live-feed.delete", "live-feed-entry", id, {
    displayName: existing.displayName,
    courseTitle: existing.courseTitle,
  })

  return NextResponse.json({ ok: true, id })
})
