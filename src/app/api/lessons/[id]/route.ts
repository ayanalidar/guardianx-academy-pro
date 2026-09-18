import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      module: { select: { id: true, title: true, courseId: true, course: { select: { id: true, title: true, shortName: true, slug: true } } } },
      quiz: { include: { questions: { select: { id: true, text: true, options: true, explanation: true } } } },
    },
  })

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

  // Check access: preview lessons are open; otherwise need enrollment
  let hasAccess = lesson.preview
  let progress: any = null // findFirst/create shapes differ
  if (user) {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: lesson.module.courseId } },
    })
    if (enrollment) hasAccess = true
    progress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    })
  }

  // siblings for prev/next nav
  const siblings = await db.lesson.findMany({
    where: { moduleId: lesson.moduleId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  })
  const idx = siblings.findIndex((s) => s.id === lesson.id)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null

  // hide answers in quiz unless access
  const quiz = lesson.quiz
    ? {
        id: lesson.quiz.id,
        title: lesson.quiz.title,
        questions: lesson.quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options.split("|"),
        })),
      }
    : null

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      content: hasAccess ? lesson.content : lesson.preview ? lesson.content : "Enroll in this course to access the full lesson material.",
      pdfPages: lesson.pdfPages,
      durationMin: lesson.durationMin,
      preview: lesson.preview,
      module: lesson.module,
      hasAccess,
    },
    quiz,
    progress,
    prev,
    next,
  })
}
