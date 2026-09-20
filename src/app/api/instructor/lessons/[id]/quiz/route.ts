import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Create (or fetch) a quiz for a lesson — instructor only
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // lesson id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { module: { include: { course: { select: { instructorId: true } } } } },
  })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const title = body.title?.trim() || `Quiz: ${lesson.title}`
  const description = body.description || ""

  // Quiz is 1:1 with lesson (lessonId is unique) — upsert
  const quiz = await db.quiz.upsert({
    where: { lessonId: id },
    update: { title, ...(description ? { description } : {}) },
    create: { lessonId: id, title, description },
    include: { questions: true },
  })

  return NextResponse.json({ quiz })
}

// Get quiz for a lesson (instructor view — includes answer indices)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { module: { include: { course: { select: { instructorId: true } } } } },
  })
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && lesson.module.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const quiz = await db.quiz.findUnique({
    where: { lessonId: id },
    include: { questions: { orderBy: { id: "asc" } } },
  })

  if (!quiz) return NextResponse.json({ quiz: null })

  return NextResponse.json({
    quiz: {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options ? q.options.split("|") : [],
      })),
    },
  })
}
