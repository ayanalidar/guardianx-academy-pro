import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensurePlacementTable } from "@/lib/placements-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * PATCH  /api/admin/placements/[id] - update a placement record
 *        (fields, or status: published | draft)
 * DELETE /api/admin/placements/[id] - remove a record from the wall
 * ADMIN-only. Every mutation is audit-logged.
 * ============================================================ */
function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensurePlacementTable()
  const { id } = await params
  const existing = await db.placement.findUnique({ where: { id }, select: { id: true, studentName: true } })
  if (!existing) return NextResponse.json({ error: "Placement record not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.studentName !== undefined) data.studentName = String(body.studentName).trim()
  if (body.role !== undefined) data.role = String(body.role).trim()
  if (body.company !== undefined) data.company = String(body.company).trim()
  if (body.photoUrl !== undefined) data.photoUrl = strOrNull(body.photoUrl)
  if (body.companyLogo !== undefined) data.companyLogo = strOrNull(body.companyLogo)
  if (body.ctc !== undefined) data.ctc = strOrNull(body.ctc)
  if (body.track !== undefined) data.track = String(body.track).trim() || "General"
  if (body.year !== undefined) {
    const y = parseInt(String(body.year), 10)
    if (!Number.isFinite(y) || y < 2000 || y > 2100) {
      return NextResponse.json({ error: "year must be a valid 4-digit year" }, { status: 400 })
    }
    data.year = y
  }
  if (body.quote !== undefined) data.quote = strOrNull(body.quote)
  if (body.story !== undefined) data.story = strOrNull(body.story)
  if (body.linkedIn !== undefined) data.linkedIn = strOrNull(body.linkedIn)
  if (body.featured !== undefined) data.featured = !!body.featured
  if (body.verified !== undefined) data.verified = !!body.verified
  if (body.isSample !== undefined) data.isSample = !!body.isSample
  if (body.order !== undefined) data.order = Number.isFinite(parseInt(String(body.order), 10)) ? parseInt(String(body.order), 10) : 0
  if (body.status !== undefined) data.status = body.status === "draft" ? "draft" : "published"

  const updated = await db.placement.update({ where: { id }, data })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "placements.update", "placement", id, {
    studentName: updated.studentName,
    fields: Object.keys(data),
  })

  return NextResponse.json({ ok: true, id: updated.id })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensurePlacementTable()
  const { id } = await params
  const existing = await db.placement.findUnique({ where: { id }, select: { id: true, studentName: true, company: true } })
  if (!existing) return NextResponse.json({ error: "Placement record not found" }, { status: 404 })

  await db.placement.delete({ where: { id } })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "placements.delete", "placement", id, {
    studentName: existing.studentName,
    company: existing.company,
  })

  return NextResponse.json({ ok: true, id })
})
