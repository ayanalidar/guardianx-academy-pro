import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Delete an entire quiz (cascade removes questions)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // quiz id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { lesson: { include: { module: { include: { course: { select: { instructorId: true } } } } } } },
  })
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  if (user.role !== "ADMIN" && quiz.lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  await db.quiz.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// Update quiz title/description
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { lesson: { include: { module: { include: { course: { select: { instructorId: true } } } } } } },
  })
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
  if (user.role !== "ADMIN" && quiz.lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json()
  const updated = await db.quiz.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
    },
  })
  return NextResponse.json({ quiz: updated })
}
