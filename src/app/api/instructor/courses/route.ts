import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

export async function GET() {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  // ADMIN sees all courses; INSTRUCTOR sees their own
  const where = user.role === "ADMIN" ? {} : { instructorId: user.id }
  const courses = await db.course.findMany({
    where,
    include: {
      _count: { select: { enrollments: true, modules: true } },
      modules: { select: { id: true, lessons: { select: { id: true } } } },
      enrollments: {
        select: {
          userId: true,
          progress: true,
          completed: true,
          lastAccessed: true,
          enrolledAt: true,
          user: { select: { id: true, name: true, avatar: true, title: true } },
        },
        orderBy: [{ lastAccessed: "desc" }, { enrolledAt: "desc" }],
        take: 100,
      },
    },
    orderBy: { studentsCount: "desc" },
  })

  const result = courses.map((c) => {
    const lessonCount = c.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const activeStudents = c.enrollments.filter((e) => !e.completed).length
    const completedStudents = c.enrollments.filter((e) => e.completed).length
    const avgProgress = c.enrollments.length
      ? Math.round(c.enrollments.reduce((a, e) => a + e.progress, 0) / c.enrollments.length)
      : 0
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortName: c.shortName,
      color: c.color,
      thumbnail: c.thumbnail,
      description: c.description,
      longDescription: c.longDescription,
      category: c.category,
      durationHours: c.durationHours,
      price: c.price,
      tags: c.tags,
      certBody: c.certBody,
      level: c.level,
      rating: c.rating,
      studentsCount: c.studentsCount,
      moduleCount: c.modules.length,
      lessonCount,
      enrollmentCount: c._count.enrollments,
      activeStudents,
      completedStudents,
      avgProgress,
      recentStudents: c.enrollments.slice(0, 8),
    }
  })

  const totals = {
    courses: result.length,
    students: result.reduce((a, c) => a + c.enrollmentCount, 0),
    completed: result.reduce((a, c) => a + c.completedStudents, 0),
    avgProgress: result.length ? Math.round(result.reduce((a, c) => a + c.avgProgress, 0) / result.length) : 0,
  }

  return NextResponse.json({ courses: result, totals })
}
