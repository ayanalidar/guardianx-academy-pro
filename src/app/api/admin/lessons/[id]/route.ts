import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// Update a lesson (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // lesson id
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const lesson = await db.lesson.findUnique({ where: { id } })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

  const body = await req.json()
  const { title, type, content, durationMin, order, preview, pdfUrl, pdfPages } = body

  const updated = await db.lesson.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(durationMin !== undefined && { durationMin: Number(durationMin) }),
      ...(order !== undefined && { order: Number(order) }),
      ...(preview !== undefined && { preview: !!preview }),
      ...(pdfUrl !== undefined && { pdfUrl: pdfUrl || null }),
      ...(pdfPages !== undefined && { pdfPages: Number(pdfPages) }),
    },
  })
  return NextResponse.json({ lesson: updated })
}

// Delete a lesson (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const lesson = await db.lesson.findUnique({ where: { id } })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

  await db.lesson.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
