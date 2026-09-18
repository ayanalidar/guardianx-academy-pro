import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

// GET /api/admin/students — list all users with role STUDENT.
// Supports `?q=` search (by email/name) and `?page=` pagination (50/page).
// Returns each student with computed stats: enrollmentCount, completedCount,
// labCount, certCount, and avgProgress (across all their enrollments).
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() || undefined
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const pageSize = 50

  // Optional course filter (kept for backwards compat with the view's `course`
  // query param — we filter by enrollments.courseId when set).
  const course = url.searchParams.get("course")?.trim() || undefined

  const where: {
    role: string
    OR?: { email?: { contains: string }; name?: { contains: string } }[]
    enrollments?: { some: { courseId: string } }
  } = { role: "STUDENT" }
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
    ]
  }
  // Course filter: the param is a real Course id (the view's dropdown is fed
  // from /api/admin/courses). When set, only students actually enrolled in
  // that course are listed — previously the filter only zeroed stats while
  // still listing every student.
  if (course) {
    where.enrollments = { some: { courseId: course } }
  }

  const [total, students] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        title: true,
        xp: true,
        level: true,
        streak: true,
        createdAt: true,
        enrollments: {
          select: { id: true, progress: true, completed: true, courseId: true },
        },
        _count: {
          select: {
            enrollments: true,
            certificates: true,
            labProgress: true,
          },
        },
      },
    }),
  ])

  // Count completed enrollments (completed === true) and compute average progress
  // per student on the fly. SQLite doesn't support filtering inside `_count`, so
  // we derive these counts from the enrollments array we already fetched.
  const result = students.map((u) => {
    const filteredEnrollments = course
      ? u.enrollments.filter((e) => e.courseId === course)
      : u.enrollments
    const enrollmentCount = filteredEnrollments.length
    const completedCount = filteredEnrollments.filter((e) => e.completed).length
    const avgProgress = enrollmentCount > 0
      ? Math.round(
          filteredEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) /
            enrollmentCount,
        )
      : 0
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      title: u.title,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
      createdAt: u.createdAt,
      // Computed stats — the admin-student-progress view reads `enrollments`,
      // `labsCompleted`, `progress`. We expose both verbose (enrollmentCount,
      // completedCount, labCount, certCount) and view-friendly aliases.
      enrollmentCount,
      enrollments: enrollmentCount,
      completedCount,
      labCount: u._count.labProgress,
      labsCompleted: u._count.labProgress,
      certCount: u._count.certificates,
      progress: avgProgress,
    }
  })

  return NextResponse.json({
    students: result,
    count: result.length,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})
