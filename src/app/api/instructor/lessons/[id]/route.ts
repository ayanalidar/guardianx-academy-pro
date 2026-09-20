import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Update a lesson (instructor only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // lesson id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const lesson = await db.lesson.findUnique({ where: { id }, include: { module: { include: { course: { select: { instructorId: true } } } } } })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json()
  const { title, type, content, durationMin, pdfPages } = body

  const updated = await db.lesson.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(durationMin !== undefined && { durationMin }),
      ...(pdfPages !== undefined && { pdfPages }),
    },
  })
  return NextResponse.json({ lesson: updated })
}

// Delete a lesson
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const lesson = await db.lesson.findUnique({ where: { id }, include: { module: { include: { course: { select: { instructorId: true } } } } } })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  await db.lesson.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
