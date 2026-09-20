import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const template = await db.certificateTemplate.findUnique({
    where: { id },
    include: { _count: { select: { certificates: true } } },
  })
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })
  return NextResponse.json({ template })
}

const EDITABLE_FIELDS = [
  "name",
  "description",
  "primaryColor",
  "accentColor",
  "fontFamily",
  "borderStyle",
  "logoUrl",
  "signatureText",
  "sealStyle",
  "backgroundPattern",
  "isDefault",
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await db.certificateTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await db.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.certificateTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }
    return tx.certificateTemplate.update({
      where: { id },
      data,
      include: { _count: { select: { certificates: true } } },
    })
  })

  return NextResponse.json({ template: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await db.certificateTemplate.findUnique({
    where: { id },
    select: { id: true, _count: { select: { certificates: true } } },
  })
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  if (existing._count.certificates > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${existing._count.certificates} certificate(s) reference this template. Detach them first.`,
      },
      { status: 409 }
    )
  }

  await db.certificateTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
