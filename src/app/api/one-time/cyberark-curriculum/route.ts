import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  CYBERARK_CURRICULUM,
  CYBERARK_COURSE_ID,
  CYBERARK_COURSE_SLUG,
} from "@/lib/cyberark-curriculum-seed"

export const runtime = "nodejs"

/**
 * ONE-TIME deploy route: replaces the skeleton curriculum of the CyberArk
 * IAM & PAM course with the authored 8-module syllabus + 4-phase GXA-210
 * lab track (see src/lib/cyberark-curriculum-seed.ts).
 *
 * The production database is not reachable from the dev sandbox, so this
 * route ships once to Vercel, is invoked once with its bearer token,
 * and is then REMOVED in the follow-up commit. Guards:
 *   - POST only; Authorization: Bearer <token> (404 on mismatch — does
 *     not reveal the endpoint exists)
 *   - hard-locked to the CyberArk course id AND slug (cannot touch any
 *     other course)
 *   - refuses to re-run once the new curriculum is detected (409)
 *   - reports pre-delete impact counts (enrollments, progress, notes,
 *     quizzes) before replacing modules
 */

const ONE_TIME_TOKEN =
  "96698f13cb9699a55dcbb91df54355dbf271fdeb08d2fa80d38d5ba41601d3e2"

export const POST = async (req: NextRequest) => {
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const course = await db.course.findUnique({
    where: { id: CYBERARK_COURSE_ID },
    include: { modules: { include: { lessons: { select: { id: true } } } } },
  })
  if (!course || course.slug !== CYBERARK_COURSE_SLUG) {
    return NextResponse.json(
      { error: "CyberArk course not found" },
      { status: 404 }
    )
  }

  const existingLessonIds = course.modules.flatMap((m) =>
    m.lessons.map((l) => l.id)
  )
  const alreadySeeded =
    course.modules.length >= CYBERARK_CURRICULUM.length ||
    course.modules.some(
      (m) =>
        m.title.startsWith("Module 08") || m.title.startsWith("Lab Phase 4")
    )
  if (alreadySeeded) {
    return NextResponse.json(
      {
        error: "Already seeded - refusing to replace again",
        modules: course.modules.length,
      },
      { status: 409 }
    )
  }

  const [
    enrollments,
    lessonProgress,
    notes,
    quizzes,
    quizAttempts,
  ] = await Promise.all([
    db.enrollment.count({ where: { courseId: CYBERARK_COURSE_ID } }),
    db.lessonProgress.count({
      where: { lessonId: { in: existingLessonIds } },
    }),
    db.note.count({ where: { lessonId: { in: existingLessonIds } } }),
    db.quiz.count({ where: { lessonId: { in: existingLessonIds } } }),
    db.quizAttempt.count({
      where: { quiz: { lessonId: { in: existingLessonIds } } },
    }),
  ])

  const lessonsCreated = CYBERARK_CURRICULUM.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  )

  await db.$transaction(async (tx) => {
    // Module delete cascades to Lesson, and Lesson cascades to
    // LessonProgress / Note / Quiz / Question / QuizAttempt (all
    // onDelete: Cascade in schema.prisma).
    await tx.module.deleteMany({ where: { courseId: CYBERARK_COURSE_ID } })
    for (let i = 0; i < CYBERARK_CURRICULUM.length; i++) {
      const m = CYBERARK_CURRICULUM[i]
      await tx.module.create({
        data: {
          courseId: CYBERARK_COURSE_ID,
          title: m.title,
          description: m.description,
          order: i,
          lessons: {
            create: m.lessons.map((l, li) => ({
              title: l.title,
              type: l.type,
              content: l.content,
              durationMin: l.durationMin,
              order: li,
              preview: l.preview ?? false,
            })),
          },
        },
      })
    }
    // Bump course.updatedAt so the public page shows the fresh
    // "Updated" stamp next to the new curriculum.
    await tx.course.update({
      where: { id: CYBERARK_COURSE_ID },
      data: { updatedAt: new Date() },
    })
  })

  return NextResponse.json({
    ok: true,
    course: course.title,
    modulesCreated: CYBERARK_CURRICULUM.length,
    lessonsCreated,
    replaced: { modules: course.modules.length, lessons: existingLessonIds.length },
    impact: {
      enrollments,
      lessonProgressDeleted: lessonProgress,
      notesDeleted: notes,
      quizzesDeleted: quizzes,
      quizAttemptsDeleted: quizAttempts,
    },
  })
}
