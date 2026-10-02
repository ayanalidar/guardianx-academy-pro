import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureInternshipTables } from "@/lib/internships-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * PATCH  /api/admin/internships/[id] - update an internship
 *        (fields, published flag, status, ordering)
 * DELETE /api/admin/internships/[id] - remove an internship AND
 *        its student records (cascade by design; audit-logged)
 * ADMIN-only.
 * ============================================================ */
function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

function jsonArr(v: unknown): string | undefined {
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => String(x).slice(0, 300)).slice(0, 25))
  if (typeof v === "string") return JSON.stringify(v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25))
  return undefined
}

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()
  const { id } = await params
  const existing = await db.internship.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!existing) return NextResponse.json({ error: "Internship not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.collegeName !== undefined) data.collegeName = String(body.collegeName).trim()
  if (body.collegeCity !== undefined) data.collegeCity = strOrNull(body.collegeCity)
  if (body.collegeLogo !== undefined) data.collegeLogo = strOrNull(body.collegeLogo)
  if (body.collegeId !== undefined) data.collegeId = strOrNull(body.collegeId)
  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.company !== undefined) data.company = String(body.company).trim() || "GuardianX Academy"
  if (body.domain !== undefined) data.domain = String(body.domain).trim() || "Cyber Security"
  if (body.mode !== undefined) data.mode = ["remote", "onsite", "hybrid"].includes(String(body.mode)) ? String(body.mode) : "remote"
  if (body.status !== undefined) data.status = ["upcoming", "ongoing", "completed"].includes(String(body.status)) ? String(body.status) : "upcoming"
  if (body.durationWeeks !== undefined) {
    const n = Number(body.durationWeeks)
    if (!Number.isFinite(n) || n < 1 || n > 52) {
      return NextResponse.json({ error: "durationWeeks must be 1-52" }, { status: 400 })
    }
    data.durationWeeks = Math.round(n)
  }
  if (body.seats !== undefined) {
    const n = Number(body.seats)
    if (!Number.isFinite(n) || n < 1 || n > 500) {
      return NextResponse.json({ error: "seats must be 1-500" }, { status: 400 })
    }
    data.seats = Math.round(n)
  }
  if (body.stipend !== undefined) data.stipend = strOrNull(body.stipend)
  if (body.description !== undefined) data.description = strOrNull(body.description)
  if (body.skills !== undefined) data.skills = jsonArr(body.skills) ?? "[]"
  if (body.featured !== undefined) data.featured = !!body.featured
  if (body.published !== undefined) data.published = !!body.published
  if (body.isSample !== undefined) data.isSample = !!body.isSample
  if (body.order !== undefined) data.order = Number.isFinite(parseInt(String(body.order), 10)) ? parseInt(String(body.order), 10) : 0
  if (body.startsAt !== undefined) {
    const d = body.startsAt ? new Date(String(body.startsAt)) : null
    data.startsAt = d && !isNaN(d.getTime()) ? d : null
  }
  if (body.endsAt !== undefined) {
    const d = body.endsAt ? new Date(String(body.endsAt)) : null
    data.endsAt = d && !isNaN(d.getTime()) ? d : null
  }

  const updated = await db.internship.update({ where: { id }, data })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.update", "internship", id, {
    title: updated.title,
    fields: Object.keys(data),
  })

  return NextResponse.json({ ok: true, id: updated.id })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()
  const { id } = await params
  const existing = await db.internship.findUnique({ where: { id }, select: { id: true, title: true, collegeName: true } })
  if (!existing) return NextResponse.json({ error: "Internship not found" }, { status: 404 })

  // Cascade by design: records without their internship have no context.
  const deleted = await db.internship.delete({ where: { id } })
  const records = await db.internshipRecord.deleteMany({ where: { internshipId: id } })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.delete", "internship", id, {
    title: existing.title,
    collegeName: existing.collegeName,
    cascadedRecords: records.count,
    cascade: deleted ? true : false,
  })

  return NextResponse.json({ ok: true })
})
