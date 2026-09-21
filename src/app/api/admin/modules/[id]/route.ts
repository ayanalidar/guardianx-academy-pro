import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// Update a module (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // module id
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const moduleData = await db.module.findUnique({ where: { id } })
  if (!moduleData) return NextResponse.json({ error: "Module not found" }, { status: 404 })

  const body = await req.json()
  const { title, description, order } = body
  const updated = await db.module.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(order !== undefined && { order: Number(order) }),
    },
  })
  return NextResponse.json({ module: updated })
}

// Delete a module (and all its lessons via cascade) - admin only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const moduleData = await db.module.findUnique({ where: { id } })
  if (!moduleData) return NextResponse.json({ error: "Module not found" }, { status: 404 })

  await db.module.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
