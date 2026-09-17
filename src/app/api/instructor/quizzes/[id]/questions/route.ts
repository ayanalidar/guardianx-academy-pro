import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Add a question to a quiz (instructor only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const body = await req.json()
  const { text, options, answerIndex, explanation } = body
  if (!text?.trim()) return NextResponse.json({ error: "Question text required" }, { status: 400 })
  if (!Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: "At least 2 options required" }, { status: 400 })
  }
  const opts = options.map((o: any) => String(o).trim()).filter(Boolean)
  if (opts.length < 2) return NextResponse.json({ error: "At least 2 non-empty options required" }, { status: 400 })
  if (answerIndex < 0 || answerIndex >= opts.length) {
    return NextResponse.json({ error: "Invalid answer index" }, { status: 400 })
  }

  const question = await db.question.create({
    data: {
      quizId: id,
      text: text.trim(),
      options: opts.join("|"),
      answerIndex: Number(answerIndex),
      explanation: explanation || "",
    },
  })

  return NextResponse.json({ question: { ...question, options: opts } })
}
