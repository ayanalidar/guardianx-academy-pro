import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureInternshipTables } from "@/lib/internships-bootstrap"
import { projectsJson } from "@/lib/internship-projects"

export const runtime = "nodejs"

/* ============================================================
 * PATCH  /api/admin/internships/records/[id] - update a student
 *        internship record. Includes the showPublicly consent
 *        toggle. certificateId/verificationHash are NEVER editable
 *        here (certificate integrity) - DELETE + recreate instead.
 * DELETE /api/admin/internships/records/[id] - remove the record.
 * ADMIN-only. Every mutation is audit-logged.
 * ============================================================ */
function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

// String-array fields only (skills, tools) - projects must use projectsJson()
// from @/lib/internship-projects, which preserves { title, description } objects.
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
  const existing = await db.internshipRecord.findUnique({
    where: { id },
    select: { id: true, studentName: true, showPublicly: true },
  })
  if (!existing) return NextResponse.json({ error: "Internship record not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.studentName !== undefined) data.studentName = String(body.studentName).trim()
  if (body.photoUrl !== undefined) data.photoUrl = strOrNull(body.photoUrl)
  if (body.studentEmail !== undefined) data.studentEmail = strOrNull(body.studentEmail)
  if (body.role !== undefined) data.role = String(body.role).trim()
  if (body.mentorName !== undefined) data.mentorName = strOrNull(body.mentorName)
  // Structured { title, description } entries - never String()-flattened.
  if (body.projects !== undefined) data.projects = projectsJson(body.projects)
  if (body.skills !== undefined) data.skills = jsonArr(body.skills) ?? "[]"
  if (body.tools !== undefined) data.tools = jsonArr(body.tools) ?? "[]"
  if (body.testimonial !== undefined) data.testimonial = strOrNull(body.testimonial)
  if (body.grade !== undefined) data.grade = strOrNull(body.grade)
  if (body.status !== undefined) data.status = ["ongoing", "completed"].includes(String(body.status)) ? String(body.status) : "completed"
  if (body.showPublicly !== undefined) data.showPublicly = !!body.showPublicly
  if (body.isSample !== undefined) data.isSample = !!body.isSample
  if (body.sortOrder !== undefined) data.sortOrder = Number.isFinite(parseInt(String(body.sortOrder), 10)) ? parseInt(String(body.sortOrder), 10) : 0
  if (body.internshipId !== undefined) {
    const newInternshipId = String(body.internshipId).trim()
    const target = await db.internship.findUnique({ where: { id: newInternshipId }, select: { id: true } })
    if (!target) return NextResponse.json({ error: "Target internship not found" }, { status: 404 })
    data.internshipId = newInternshipId
  }
  if (body.startDate !== undefined) {
    const d = body.startDate ? new Date(String(body.startDate)) : null
    data.startDate = d && !isNaN(d.getTime()) ? d : null
  }
  if (body.endDate !== undefined) {
    const d = body.endDate ? new Date(String(body.endDate)) : null
    data.endDate = d && !isNaN(d.getTime()) ? d : null
  }

  const updated = await db.internshipRecord.update({ where: { id }, data })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.record.update", "internshipRecord", id, {
    studentName: updated.studentName,
    fields: Object.keys(data),
    showPubliclyChanged: body.showPublicly !== undefined ? updated.showPublicly : undefined,
  })

  return NextResponse.json({ ok: true, id: updated.id })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()
  const { id } = await params
  const existing = await db.internshipRecord.findUnique({
    where: { id },
    select: { id: true, studentName: true, certificateId: true },
  })
  if (!existing) return NextResponse.json({ error: "Internship record not found" }, { status: 404 })

  await db.internshipRecord.delete({ where: { id } })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.record.delete", "internshipRecord", id, {
    studentName: existing.studentName,
    certificateId: existing.certificateId,
  })

  return NextResponse.json({ ok: true })
})
