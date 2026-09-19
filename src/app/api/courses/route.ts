import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const level = searchParams.get("level")
  const q = searchParams.get("q")
  const vertical = searchParams.get("vertical")
  const enrolledOnly = searchParams.get("enrolled") === "true"
  const status = searchParams.get("status") || "all" // all | not-started | in-progress | completed
  const userIdParam = searchParams.get("userId")

  const currentUser = await getCurrentUser()
  // Session user is the source of truth: a stale client-supplied userId
  // (or a forged one — IDOR) must not be able to read someone else's
  // enrollments. The param remains a fallback for anonymous callers.
  const userId = currentUser?.id || userIdParam

  // Enrolled students must ALWAYS see their own courses, even if an admin
  // later unpublishes the course (published:true alone hid it from the
  // dashboard and broke "my courses").
  const where: any = enrolledOnly
    ? { OR: [{ published: true }, { enrollments: { some: { userId: userId || "__none__" } } }] }
    : { published: true }
  if (category && category !== "All") where.category = category
  if (level && level !== "All") where.level = level
  if (vertical && vertical !== "all") where.vertical = vertical
  if (q) {
    // AND-merged so we never clobber the enrolled/published OR above.
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { shortName: { contains: q } },
          { description: { contains: q } },
          { tags: { contains: q } },
        ],
      },
    ]
  }

  // Status-based filtering (requires auth)
  // Always include enrollments for the current user so we can show progress badges
  const includeEnrollments = !!userId
  if (enrolledOnly) {
    if (!userId) return NextResponse.json({ courses: [] })
    where.enrollments = { some: { userId } }
  } else if (status !== "all" && userId) {
    if (status === "not-started") {
      where.enrollments = { none: { userId } }
    } else if (status === "in-progress") {
      where.enrollments = { some: { userId, completed: false } }
    } else if (status === "completed") {
      where.enrollments = { some: { userId, completed: true } }
    }
  }

  const courses = await db.course.findMany({
    where,
    include: {
      instructor: { select: { id: true, name: true, title: true, avatar: true } },
      modules: { select: { id: true, lessons: { select: { id: true } } } },
      _count: { select: { enrollments: true } },
      ...(includeEnrollments
        ? { enrollments: { where: { userId }, select: { progress: true, completed: true, lastAccessed: true, enrolledAt: true } } }
        : {}),
    },
    orderBy: enrolledOnly ? { enrollments: { _count: "desc" } } : { studentsCount: "desc" },
  })

  const result = courses.map((c) => {
    const lessonCount = c.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const enrollment = includeEnrollments ? (c as any).enrollments?.[0] : null
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortName: c.shortName,
      description: c.description,
      category: c.category,
      level: c.level,
      durationHours: c.durationHours,
      price: c.price,
      rating: c.rating,
      studentsCount: c.studentsCount,
      color: c.color,
      thumbnail: c.thumbnail,
      tags: c.tags,
      certBody: c.certBody,
      instructor: c.instructor,
      lessonCount,
      moduleCount: c.modules.length,
      enrollment: enrollment
        ? {
            progress: enrollment.progress,
            completed: enrollment.completed,
            lastAccessed: enrollment.lastAccessed,
            enrolledAt: enrollment.enrolledAt,
          }
        : null,
    }
  })

  return NextResponse.json({ courses: result })
})
