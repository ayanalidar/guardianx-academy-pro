import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// Platform-wide analytics for the admin dashboard
export async function GET() {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const [
    totalUsers,
    totalStudents,
    totalInstructors,
    totalAdmins,
    totalCourses,
    totalLabs,
    totalEnrollments,
    totalCompletedEnrollments,
    totalCertificates,
    totalLabSolved,
    totalNotes,
    totalDiscussionThreads,
    totalDiscussionReplies,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "INSTRUCTOR" } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.course.count(),
    db.lab.count(),
    db.enrollment.count(),
    db.enrollment.count({ where: { completed: true } }),
    db.certificate.count(),
    db.labProgress.count({ where: { status: "completed" } }),
    db.note.count(),
    db.discussion.count(),
    db.discussionReply.count(),
  ])

  // Revenue approximation: sum of course.price for each enrollment
  const enrollmentsWithPrice = await db.enrollment.findMany({
    select: { course: { select: { price: true } } },
  })
  const totalRevenue = enrollmentsWithPrice.reduce((acc, e) => acc + (e.course?.price || 0), 0)

  // 30-day new-user signup series
  const days = 30
  const now = new Date()
  const signupSeries: { date: string; count: number; label: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const count = await db.user.count({
      where: { createdAt: { gte: d, lt: next } },
    })
    signupSeries.push({
      date: d.toISOString().slice(0, 10),
      count,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })
  }

  // Role distribution
  const roleDistribution = [
    { name: "Students", value: totalStudents, color: "#10b981" },
    { name: "Instructors", value: totalInstructors, color: "#06b6d4" },
    { name: "Admins", value: totalAdmins, color: "#f59e0b" },
  ]

  // Top 8 courses by enrollment count
  const topCoursesRaw = await db.course.findMany({
    take: 8,
    include: { _count: { select: { enrollments: true } } },
    orderBy: { studentsCount: "desc" },
  })
  const topCourses = topCoursesRaw.map((c) => ({
    id: c.id,
    shortName: c.shortName,
    title: c.title,
    color: c.color,
    enrollments: c._count.enrollments,
    rating: c.rating,
  }))

  // Top 8 labs by completion count
  const topLabsRaw = await db.lab.findMany({
    take: 8,
    include: { _count: { select: { progress: true } } },
    orderBy: { points: "desc" },
  })
  const topLabs = topLabsRaw.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    difficulty: l.difficulty,
    points: l.points,
    attempts: l._count.progress,
  }))

  // Course category distribution
  const categoryGroupsRaw = await db.course.groupBy({
    by: ["category"],
    _count: { _all: true },
  })
  const categoryDistribution = categoryGroupsRaw.map((g, i) => ({
    name: g.category,
    value: g._count._all,
    color: ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"][i % 7],
  }))

  return NextResponse.json({
    totals: {
      users: totalUsers,
      students: totalStudents,
      instructors: totalInstructors,
      admins: totalAdmins,
      courses: totalCourses,
      labs: totalLabs,
      enrollments: totalEnrollments,
      completedEnrollments: totalCompletedEnrollments,
      certificates: totalCertificates,
      labsSolved: totalLabSolved,
      notes: totalNotes,
      discussions: totalDiscussionThreads + totalDiscussionReplies,
      revenue: totalRevenue,
    },
    signupSeries,
    roleDistribution,
    topCourses,
    topLabs,
    categoryDistribution,
  })
}
