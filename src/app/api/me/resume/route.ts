import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Returns the best "continue where you left off" lesson - the most recently
// accessed lesson that isn't complete, falling back to the first incomplete
// lesson in the most-recently-accessed enrolled course.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ resume: null })

  // 1. Most recently updated lesson progress (position saved while reading PDFs)
  const recentProgress = await db.lessonProgress.findFirst({
    where: { userId: user.id, completed: false },
    orderBy: { updatedAt: "desc" },
    include: {
      lesson: {
        select: {
          id: true, title: true, type: true, durationMin: true,
          module: { select: { id: true, title: true, courseId: true, course: { select: { id: true, title: true, shortName: true, color: true } } } },
        },
      },
    },
  })

  if (recentProgress) {
    return NextResponse.json({
      resume: {
        lessonId: recentProgress.lessonId,
        lessonTitle: recentProgress.lesson.title,
        lessonType: recentProgress.lesson.type,
        durationMin: recentProgress.lesson.durationMin,
        position: recentProgress.position,
        courseId: recentProgress.lesson.module.courseId,
        courseTitle: recentProgress.lesson.module.course.title,
        courseShortName: recentProgress.lesson.module.course.shortName,
        courseColor: recentProgress.lesson.module.course.color,
        moduleTitle: recentProgress.lesson.module.title,
        reason: "in-progress" as const,
      },
    })
  }

  // 2. Fall back: first incomplete lesson in the most recently accessed enrolled course
  const enrollment = await db.enrollment.findFirst({
    where: { userId: user.id, completed: false },
    orderBy: [{ lastAccessed: "desc" }, { enrolledAt: "desc" }],
    include: {
      course: {
        select: {
          id: true, title: true, shortName: true, color: true,
          modules: { orderBy: { order: "asc" }, select: { id: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, type: true, durationMin: true } } } },
        },
      },
    },
  })

  if (!enrollment) return NextResponse.json({ resume: null })

  // find first incomplete lesson
  const completed = await db.lessonProgress.findMany({
    where: { userId: user.id, lesson: { module: { courseId: enrollment.courseId } }, completed: true },
    select: { lessonId: true },
  })
  const completedSet = new Set(completed.map((c) => c.lessonId))

  let nextLesson: any = null
  for (const m of enrollment.course.modules) {
    for (const l of m.lessons) {
      if (!completedSet.has(l.id)) {
        nextLesson = { ...l, moduleTitle: m.title, moduleId: m.id }
        break
      }
    }
    if (nextLesson) break
  }

  if (!nextLesson) return NextResponse.json({ resume: null })

  return NextResponse.json({
    resume: {
      lessonId: nextLesson.id,
      lessonTitle: nextLesson.title,
      lessonType: nextLesson.type,
      durationMin: nextLesson.durationMin,
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title,
      courseShortName: enrollment.course.shortName,
      courseColor: enrollment.course.color,
      moduleTitle: nextLesson.moduleTitle,
      reason: "next-up" as const,
    },
  })
}
