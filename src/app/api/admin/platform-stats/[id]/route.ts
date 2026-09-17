import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* PATCH /api/admin/platform-stats/[id]
 * ADMIN-only. Update a stat's value, label, visibility, etc.
 */
export const PATCH = withErrorHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: any = {}
  if (body.label !== undefined) data.label = String(body.label).trim()
  if (body.value !== undefined) data.value = String(body.value)
  if (body.source !== undefined) data.source = String(body.source)
  if (body.displayStatus !== undefined) data.displayStatus = String(body.displayStatus)
  if (body.suffix !== undefined) data.suffix = body.suffix ? String(body.suffix) : null
  if (body.icon !== undefined) data.icon = String(body.icon)
  if (body.color !== undefined) data.color = String(body.color)
  data.updatedBy = currentUser.id

  if (Object.keys(data).length === 1 && data.updatedBy) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const stat = await db.platformStat.update({ where: { id }, data })
  return NextResponse.json({ ok: true, stat })
})

/* DELETE /api/admin/platform-stats/[id]
 * ADMIN-only. Hard-delete a stat.
 */
export const DELETE = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  await db.platformStat.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
