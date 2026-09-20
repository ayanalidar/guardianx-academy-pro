import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Update a question (instructor only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // question id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const question = await db.question.findUnique({
    where: { id },
    include: { quiz: { include: { lesson: { include: { module: { include: { course: { select: { instructorId: true } } } } } } } } },
  })
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && question.quiz.lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json()
  const { text, options, answerIndex, explanation } = body

  let optionsStr: string | undefined
  if (Array.isArray(options)) {
    const opts = options.map((o: any) => String(o).trim()).filter(Boolean)
    if (opts.length < 2) return NextResponse.json({ error: "At least 2 options required" }, { status: 400 })
    optionsStr = opts.join("|")
    if (answerIndex !== undefined && (answerIndex < 0 || answerIndex >= opts.length)) {
      return NextResponse.json({ error: "Invalid answer index" }, { status: 400 })
    }
  }

  const updated = await db.question.update({
    where: { id },
    data: {
      ...(text !== undefined && { text: String(text).trim() }),
      ...(optionsStr !== undefined && { options: optionsStr }),
      ...(answerIndex !== undefined && { answerIndex: Number(answerIndex) }),
      ...(explanation !== undefined && { explanation: String(explanation) }),
    },
  })

  return NextResponse.json({
    question: {
      ...updated,
      options: updated.options ? updated.options.split("|") : [],
    },
  })
}

// Delete a question
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const question = await db.question.findUnique({
    where: { id },
    include: { quiz: { include: { lesson: { include: { module: { include: { course: { select: { instructorId: true } } } } } } } } },
  })
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && question.quiz.lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  await db.question.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
