import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* ============================================================
 * PATCH  /api/admin/hiring/jobs/[id] — update an opening
 *        (fields, or status: active | draft | closed)
 * DELETE /api/admin/hiring/jobs/[id] — delete an opening
 *        (cascades its applications)
 * ADMIN-only. Every mutation is audit-logged.
 * ============================================================ */

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const existing = await db.job.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!existing) return NextResponse.json({ error: "Job opening not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.company !== undefined) data.company = String(body.company).trim()
  if (body.companyLogo !== undefined) data.companyLogo = strOrNull(body.companyLogo)
  if (body.location !== undefined) data.location = String(body.location).trim()
  if (body.remote !== undefined) data.remote = !!body.remote
  if (body.type !== undefined) {
    const t = String(body.type).toLowerCase().trim()
    data.type = ["full-time", "part-time", "contract", "internship"].includes(t) ? t : "full-time"
  }
  if (body.salary !== undefined) data.salary = String(body.salary || "").trim()
  if (body.description !== undefined) data.description = String(body.description || "").trim()
  if (body.requirements !== undefined) data.requirements = String(body.requirements || "").trim()
  if (body.requiredCerts !== undefined) data.requiredCerts = JSON.stringify(toStrArray(body.requiredCerts))
  if (body.requiredSkills !== undefined) data.requiredSkills = JSON.stringify(toStrArray(body.requiredSkills))
  if (body.status !== undefined) {
    data.status = ["active", "draft", "closed"].includes(body.status) ? body.status : "active"
  }

  if (data.title === "") return NextResponse.json({ error: "Job title cannot be empty" }, { status: 400 })
  if (data.company === "") return NextResponse.json({ error: "Company cannot be empty" }, { status: 400 })

  const updated = await db.job.update({ where: { id }, data })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "hiring.job.update", "job", id, {
    title: updated.title,
    fields: Object.keys(data),
    status: updated.status,
  })

  return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const existing = await db.job.findUnique({ where: { id }, select: { title: true, company: true } })
  if (!existing) return NextResponse.json({ error: "Job opening not found" }, { status: 404 })

  await db.job.delete({ where: { id } })
  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "hiring.job.delete", "job", id, {
    title: existing.title,
    company: existing.company,
  })

  return NextResponse.json({ ok: true })
})

// ── helpers ──
function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s || null
}

function toStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean)
  return []
}
