import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await getCurrentUser()

  // ── Tier 1 — full detail query (current schema: instructor relation,
  // modules→lessons with pdfPages, labs, counts). On deployments whose DB
  // predates the course-extras columns (e.g. Vercel auto-deploying fresh
  // code against a stale remote DB) this throws P2022/P2021 — degrade
  // instead of returning a blank page.
  let course: any = null
  let degraded = false
  try {
    course = await db.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true, title: true, avatar: true, bio: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                type: true,
                durationMin: true,
                order: true,
                preview: true,
                pdfPages: true,
              },
            },
          },
        },
        labs: { select: { id: true, title: true, slug: true, difficulty: true, category: true, points: true } },
        _count: { select: { enrollments: true, discussions: true } },
      },
    })
  } catch {
    degraded = true

    // ── Tier 2 — schema discovery. Select only Course columns that actually
    // exist in the remote DB, and attach relations conditionally.
    let cols = new Set<string>()
    try {
      const rows = await db.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'Course'`
      cols = new Set(rows.map((r) => r.column_name))
    } catch {
      // information_schema unavailable → tier 3 covers it.
    }

    const WANTED = [
      "slug", "shortName", "description", "longDescription", "category", "level",
      "durationHours", "price", "rating", "studentsCount", "color", "thumbnail",
      "tags", "certBody", "published", "createdAt", "updatedAt",
      "whatYouWillLearn", "prerequisites", "whoShouldAttend", "toolsCovered", "careerOutcomes",
    ]
    const select: Record<string, true> = {
      // v1-era columns — present in every schema version this project had.
      id: true, title: true,
    }
    for (const k of WANTED) if (cols.has(k)) select[k] = true

    const rel: Record<string, any> = {}
    if (cols.has("instructorId")) {
      rel.instructor = { select: { id: true, name: true, title: true, avatar: true, bio: true } }
    }
    // Include the curriculum only when the Module/Lesson tables actually
    // exist on the remote DB. pdfPages is intentionally omitted from the
    // lesson select — it is a newer column and may not exist there.
    try {
      const tbl = await db.$queryRaw<{ ok: number | null }[]>`
        SELECT to_regclass('public."Module"') IS NOT NULL
           AND to_regclass('public."Lesson"') IS NOT NULL AS ok`
      if (tbl[0]?.ok) {
        rel.modules = {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, type: true, durationMin: true, order: true, preview: true },
            },
          },
        }
      }
    } catch {
      // Discovery failed → skip the curriculum; tier 3 still renders the page.
    }

    try {
      // Relations ride INSIDE select (Prisma forbids select+include together).
      const selectFull = Object.keys(rel).length ? { ...select, ...rel } : select
      course = await db.course.findUnique({ where: { id }, select: selectFull })
    } catch {
      // ── Tier 3 — bare minimum, guaranteed columns only.
      try {
        course = await db.course.findUnique({
          where: { id },
          select: { id: true, title: true, slug: true, description: true, category: true, level: true, price: true },
        })
      } catch {
        course = null
      }
    }
  }

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  // Degraded rows may lack modules/labs/_count — normalize so the client
  // can never crash on missing arrays.
  if (!Array.isArray(course.modules)) course.modules = []
  if (!Array.isArray(course.labs)) course.labs = []
  if (!course._count) course._count = { enrollments: 0, discussions: 0 }
  for (const m of course.modules) {
    if (!Array.isArray(m.lessons)) m.lessons = []
  }

  let enrollment: any = null
  let lessonProgress: Record<string, { completed: boolean; position: number }> = {}
  if (user) {
    try {
      enrollment = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      })
      const progress = await db.lessonProgress.findMany({
        where: { userId: user.id, lesson: { module: { courseId: course.id } } },
      })
      for (const p of progress) {
        lessonProgress[p.lessonId] = { completed: p.completed, position: p.position }
      }
    } catch {
      // Progress read failure must not blank the page — degrade to anonymous view.
      enrollment = null
      lessonProgress = {}
    }
  }

  const totalLessons = course.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0)
  const completedLessons = Object.values(lessonProgress).filter((p) => p.completed).length

  return NextResponse.json({
    course,
    enrollment,
    lessonProgress,
    totalLessons,
    completedLessons,
    progressPct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    degraded,
  })
})
