import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// GET /api/admin/overview — platform-wide stats (ADMIN only)
export async function GET() {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  // Run independent counts in parallel
  const [
    totalUsers,
    roleCounts,
    totalCourses,
    totalLabs,
    totalCertificates,
    totalLiveSessions,
    totalEnrollments,
    completedEnrollments,
    activeLabs,
    recentSignups,
    enrollmentsLast6Months,
    coursesForRevenue,
  ] = await Promise.all([
    db.user.count(),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.course.count(),
    db.lab.count(),
    db.certificate.count(),
    db.liveSession.count(),
    db.enrollment.count(),
    db.enrollment.count({ where: { completed: true } }),
    db.labProgress.findMany({
      where: { status: "in_progress" },
      include: {
        lab: { select: { id: true, title: true, slug: true, difficulty: true, category: true, color: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    }),
    db.enrollment.findMany({
      where: {
        enrolledAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 5) - 15 * 24 * 60 * 60 * 1000) },
      },
      select: { enrolledAt: true },
    }),
    db.course.findMany({
      where: { published: true },
      select: { id: true, price: true, _count: { select: { enrollments: true } } },
    }),
  ])

  // Map roles to counts (zero-fill missing roles)
  const roleMap: Record<string, number> = {
    STUDENT: 0,
    INSTRUCTOR: 0,
    ADMIN: 0,
    SCHOOL_ADMIN: 0,
  }
  for (const r of roleCounts) roleMap[r.role] = r._count._all

  // Compute revenue: sum(price * enrollments) — free courses contribute 0
  const revenue = coursesForRevenue.reduce(
    (acc, c) => acc + (c.price || 0) * (c._count.enrollments || 0),
    0,
  )

  // Growth data: enrollments per month for last 6 months
  const months: { label: string; key: string; count: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleString("en-US", { month: "short" })
    months.push({ label, key, count: 0 })
  }
  for (const e of enrollmentsLast6Months) {
    const k = `${e.enrolledAt.getFullYear()}-${String(e.enrolledAt.getMonth() + 1).padStart(2, "0")}`
    const m = months.find((x) => x.key === k)
    if (m) m.count += 1
  }

  return NextResponse.json({
    totals: {
      users: totalUsers,
      roles: roleMap,
      courses: totalCourses,
      labs: totalLabs,
      certificates: totalCertificates,
      liveSessions: totalLiveSessions,
      enrollments: totalEnrollments,
      completedEnrollments,
      revenue,
    },
    recentSignups,
    growth: months.map((m) => ({ month: m.label, enrollments: m.count })),
    activeLabs: activeLabs.map((p) => ({
      id: p.id,
      status: p.status,
      startedAt: p.startedAt,
      updatedAt: p.updatedAt,
      lab: p.lab,
      user: p.user,
    })),
  })
}
