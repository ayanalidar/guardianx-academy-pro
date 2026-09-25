import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Returns course completion leaderboard:
// - top users by courses completed
// - most popular courses (by enrollment)
export async function GET() {
  // Top users by courses completed + certificates earned
  const enrollments = await db.enrollment.findMany({
    // audit fix D-07: cap response (was unpaginated full-table read)
    take: 50,
    where: { completed: true },
    include: {
      user: { select: { id: true, name: true, title: true, avatar: true, level: true, xp: true } },
      course: { select: { id: true, title: true, shortName: true, color: true, category: true } },
    },
  })

  const userMap = new Map<string, {
    user: any
    coursesCompleted: number
    certificates: number
    categories: Set<string>
  }>()

  for (const e of enrollments) {
    const existing = userMap.get(e.userId) ?? {
      user: e.user,
      coursesCompleted: 0,
      certificates: 0,
      categories: new Set<string>(),
    }
    existing.coursesCompleted++
    existing.categories.add(e.course.category)
    userMap.set(e.userId, existing)
  }

  // Count certificates per user
  const certCounts = await db.certificate.groupBy({
    by: ["userId"],
    _count: { id: true },
  })
  for (const c of certCounts) {
    const entry = userMap.get(c.userId)
    if (entry) entry.certificates = c._count.id
  }

  const topLearners = Array.from(userMap.values())
    .sort((a, b) => b.coursesCompleted - a.coursesCompleted || b.certificates - a.certificates)
    .slice(0, 10)
    .map((entry, i) => ({
      rank: i + 1,
      user: entry.user,
      coursesCompleted: entry.coursesCompleted,
      certificates: entry.certificates,
      categoriesCovered: entry.categories.size,
    }))

  // Most popular courses by enrollment count
  const courses = await db.course.findMany({
    where: { published: true },
    select: {
      id: true, title: true, shortName: true, color: true, category: true,
      level: true, rating: true, studentsCount: true,
      _count: { select: { enrollments: true, certificates: true } },
    },
    orderBy: { studentsCount: "desc" },
    take: 10,
  })

  const popularCourses = courses.map((c, i) => ({
    rank: i + 1,
    id: c.id,
    title: c.title,
    shortName: c.shortName,
    color: c.color,
    category: c.category,
    level: c.level,
    rating: c.rating,
    studentsCount: c.studentsCount,
    enrollments: c._count.enrollments,
    completions: c._count.certificates,
    completionRate: c._count.enrollments > 0 ? Math.round((c._count.certificates / c._count.enrollments) * 100) : 0,
  }))

  return NextResponse.json({
    topLearners,
    popularCourses,
    totalCompletions: enrollments.length,
    activeLearners: userMap.size,
  })
}
