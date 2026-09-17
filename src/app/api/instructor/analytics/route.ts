import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Returns analytics data for instructor analytics charts:
// - enrollment over time (last 30 days)
// - course completion breakdown
// - student progress distribution
export async function GET() {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const where = user.role === "ADMIN" ? {} : { instructorId: user.id }
  const courses = await db.course.findMany({
    where,
    select: {
      id: true, title: true, shortName: true, color: true,
      enrollments: { select: { id: true, progress: true, completed: true, enrolledAt: true } },
      certificates: { select: { issuedAt: true } },
    },
  })

  // enrollment over time (last 30 days, grouped by day)
  const days = 30
  const now = new Date()
  const enrollmentSeries: { date: string; count: number; label: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const count = courses.reduce((acc, c) => {
      return acc + c.enrollments.filter((e) => {
        const ea = new Date(e.enrolledAt)
        return ea >= d && ea < next
      }).length
    }, 0)
    enrollmentSeries.push({
      date: d.toISOString().slice(0, 10),
      count,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })
  }

  // course breakdown: per course [enrolled, active, completed]
  const courseBreakdown = courses.map((c) => {
    const enrolled = c.enrollments.length
    const completed = c.enrollments.filter((e) => e.completed).length
    const active = enrolled - completed
    return {
      shortName: c.shortName,
      title: c.title,
      color: c.color,
      enrolled,
      active,
      completed,
      certificates: c.certificates.length,
    }
  })

  // student progress distribution buckets
  const buckets = [
    { range: "0-20%", min: 0, max: 20, count: 0 },
    { range: "20-40%", min: 20, max: 40, count: 0 },
    { range: "40-60%", min: 40, max: 60, count: 0 },
    { range: "60-80%", min: 60, max: 80, count: 0 },
    { range: "80-100%", min: 80, max: 101, count: 0 },
  ]
  for (const c of courses) {
    for (const e of c.enrollments) {
      const b = buckets.find((b) => e.progress >= b.min && e.progress < b.max)
      if (b) b.count++
    }
  }

  // total stats
  const totalEnrollments = courses.reduce((a, c) => a + c.enrollments.length, 0)
  const totalCompleted = courses.reduce((a, c) => a + c.enrollments.filter((e) => e.completed).length, 0)
  const totalCertificates = courses.reduce((a, c) => a + c.certificates.length, 0)
  const avgProgress = totalEnrollments
    ? Math.round(courses.reduce((a, c) => a + c.enrollments.reduce((x, e) => x + e.progress, 0), 0) / totalEnrollments)
    : 0

  return NextResponse.json({
    enrollmentSeries,
    courseBreakdown,
    progressDistribution: buckets,
    totals: {
      courses: courses.length,
      enrollments: totalEnrollments,
      completed: totalCompleted,
      certificates: totalCertificates,
      avgProgress,
    },
  })
}
