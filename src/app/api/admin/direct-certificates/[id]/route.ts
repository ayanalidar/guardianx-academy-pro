import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureDirectCertificateTables } from "@/lib/direct-certs-bootstrap"
import { generateDirectCertHash, mapDirectCertToAdminRow } from "@/lib/direct-certs"
import { projectsJson } from "@/lib/internship-projects"

export const runtime = "nodejs"

/* ============================================================
 * PATCH /api/admin/direct-certificates/[id]
 *   { resendEmail: true }        -> best-effort credential (re)send.
 *   { status: "revoked"|"valid" } -> revoke / restore. A revoked
 *       certificate still verifies - it renders its REVOKED status
 *       honestly (same policy as GuardianCredential).
 *   { showPublicly: boolean }     -> verification consent gate. Off =
 *       the id answers "not found" publicly (anti-enumeration).
 *   Editable: studentName, studentEmail, programTitle, collegeName,
 *       mentorName, durationWeeks, startDate, endDate, skills,
 *       projects, grade, score, remarks, programDirector.
 *       Editing the program re-binds the hash date? No - the hash
 *       covers certificateId|recordId|domain|issuedAt, none of which
 *       the editable fields touch. certificateId + verificationHash +
 *       certificateIssuedAt are NEVER editable here (certificate
 *       integrity).
 * DELETE /api/admin/direct-certificates/[id] - remove the record.
 * ADMIN-only. Every mutation is audit-logged.
 * ============================================================ */

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

function dateOrNull(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function intOrNull(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : null
}

function jsonArr(v: unknown): string | undefined {
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 25))
  if (typeof v === "string") return JSON.stringify(v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25))
  return undefined
}

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureDirectCertificateTables()
  const { id } = await params
  const existing = await db.directCertificate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Certificate not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  // ---- explicit credential (re)send (the "Resend email" button) ----
  if ((body as any).resendEmail === true) {
    const { emailDirectCertificate } = await import("@/lib/direct-cert-email")
    const result = await emailDirectCertificate(id)
    await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "direct-certificate.email.send", "directCertificate", id, {
      studentName: existing.studentName,
      emailed: result.ok,
      error: result.error,
    })
    return NextResponse.json({ ok: true, email: result })
  }

  const data: Record<string, unknown> = {}
  if ((body as any).studentName !== undefined) data.studentName = String((body as any).studentName).trim()
  if ((body as any).studentEmail !== undefined) data.studentEmail = strOrNull((body as any).studentEmail)?.toLowerCase() ?? null
  if ((body as any).programTitle !== undefined) data.programTitle = String((body as any).programTitle).trim()
  if ((body as any).collegeName !== undefined) data.collegeName = strOrNull((body as any).collegeName)
  if ((body as any).mentorName !== undefined) data.mentorName = strOrNull((body as any).mentorName)
  if ((body as any).durationWeeks !== undefined) data.durationWeeks = intOrNull((body as any).durationWeeks, 1, 104)
  if ((body as any).startDate !== undefined) data.startDate = dateOrNull((body as any).startDate)
  if ((body as any).endDate !== undefined) data.endDate = dateOrNull((body as any).endDate)
  if ((body as any).skills !== undefined) data.skills = jsonArr((body as any).skills) ?? "[]"
  if ((body as any).projects !== undefined) data.projects = projectsJson((body as any).projects)
  if ((body as any).grade !== undefined) data.grade = strOrNull((body as any).grade)?.slice(0, 60) ?? null
  if ((body as any).score !== undefined) data.score = intOrNull((body as any).score, 0, 100)
  if ((body as any).remarks !== undefined) data.remarks = strOrNull((body as any).remarks)?.slice(0, 400) ?? null
  if ((body as any).programDirector !== undefined) data.programDirector = strOrNull((body as any).programDirector)?.slice(0, 120) ?? null
  if ((body as any).showPublicly !== undefined) data.showPublicly = !!(body as any).showPublicly
  if ((body as any).status !== undefined) {
    const s = String((body as any).status)
    data.status = s === "revoked" ? "revoked" : "valid"
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const row = await db.directCertificate.update({ where: { id }, data })
  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "direct-certificate.update", "directCertificate", id, {
    studentName: row.studentName,
    fields: Object.keys(data),
    status: row.status,
    showPublicly: row.showPublicly,
  })
  return NextResponse.json({ ok: true, certificate: mapDirectCertToAdminRow(row) })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureDirectCertificateTables()
  const { id } = await params
  const existing = await db.directCertificate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Certificate not found" }, { status: 404 })

  await db.directCertificate.delete({ where: { id } })
  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "direct-certificate.delete", "directCertificate", id, {
    studentName: existing.studentName,
    certificateId: existing.certificateId,
  })
  return NextResponse.json({ ok: true })
})
