import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// PATCH /api/admin/certifications/[id] — update a certification
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const existing = await db.certification.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Certification not found" }, { status: 404 })

  const body = await req.json()
  const { short, full, body: certBody, level, category, color, duration, desc, popular, order } = body

  const patch: any = {}
  if (typeof short === "string" && short.trim()) patch.short = short.trim()
  if (typeof full === "string" && full.trim()) patch.full = full.trim()
  if (typeof certBody === "string") patch.body = certBody.trim()
  if (typeof level === "string") patch.level = level
  if (typeof category === "string") patch.category = category
  if (typeof color === "string") patch.color = color
  if (typeof duration === "string") patch.duration = duration
  if (typeof desc === "string") patch.desc = desc.trim()
  if (typeof popular === "boolean") patch.popular = popular
  if (typeof order === "number") patch.order = order

  const updated = await db.certification.update({
    where: { id },
    data: patch,
  })

  return NextResponse.json({ certification: updated })
}

// DELETE /api/admin/certifications/[id] — delete a certification
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const existing = await db.certification.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Certification not found" }, { status: 404 })

  await db.certification.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
