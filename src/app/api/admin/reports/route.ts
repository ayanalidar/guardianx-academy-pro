import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/reports — ADMIN only.
 *
 * Query params:
 *   type          (required) — "enrollment" | "attendance" | "completion" | "revenue"
 *   institutionId (optional) — School.id to filter to a specific institution's students
 *   from          (optional) — ISO date string (defaults to 30 days ago)
 *   to            (optional) — ISO date string (defaults to now)
 *
 * Returns aggregated data for the selected report type + date range. The
 * response shape varies by type — see the per-type branches below.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const type = (url.searchParams.get("type") || "").toLowerCase()
  const institutionId = url.searchParams.get("institutionId") || null

  // Date range — default to last 30 days if not specified
  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 30)
  const fromParam = url.searchParams.get("from")
  const toParam = url.searchParams.get("to")
  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : now
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }
  if (from > to) {
    return NextResponse.json({ error: "From date cannot be after To date" }, { status: 400 })
  }

  // If filtering by institution, resolve the school's student user IDs up
  // front so every per-type query can re-use them.
  let institutionUserIds: string[] | null = null
  let institutionName: string | null = null
  if (institutionId) {
    const school = await db.school.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true },
    })
    if (!school) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 })
    }
    institutionName = school.name
    // SchoolMember rows link students to the school
    const members = await db.schoolMember.findMany({
      where: { schoolId: institutionId },
      select: { userId: true },
    })
    institutionUserIds = members.map((m) => m.userId)
  }

  /* ----------------------- ENROLLMENT ----------------------- */
  if (type === "enrollment") {
    const enrollments = await db.enrollment.findMany({
      where: {
        enrolledAt: { gte: from, lte: to },
        ...(institutionUserIds ? { userId: { in: institutionUserIds } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, schoolId: true } },
        course: { select: { id: true, title: true, shortName: true } },
      },
      orderBy: { enrolledAt: "desc" },
    })

    // Aggregate by course for a quick summary
    const byCourseMap = new Map<string, { courseId: string; courseTitle: string; courseShortName: string; count: number }>()
    for (const e of enrollments) {
      const key = e.courseId
      const existing = byCourseMap.get(key)
      if (existing) {
        existing.count++
      } else {
        byCourseMap.set(key, {
          courseId: key,
          courseTitle: e.course.title,
          courseShortName: e.course.shortName,
          count: 1,
        })
      }
    }

    return NextResponse.json({
      type: "enrollment",
      from: from.toISOString(),
      to: to.toISOString(),
      institutionId,
      institutionName,
      totalEnrollments: enrollments.length,
      byCourse: Array.from(byCourseMap.values()).sort((a, b) => b.count - a.count),
      rows: enrollments.map((e) => ({
        id: e.id,
        userName: e.user.name,
        userEmail: e.user.email,
        courseId: e.courseId,
        courseTitle: e.course.title,
        courseShortName: e.course.shortName,
        progress: e.progress,
        completed: e.completed,
        enrolledAt: e.enrolledAt,
      })),
    })
  }

  /* ----------------------- ATTENDANCE ----------------------- */
  if (type === "attendance") {
    // AttendanceRecord.date is a YYYY-MM-DD string, so we filter on
    // date >= fromYMD && date <= toYMD for range compatibility.
    const fromYMD = from.toISOString().slice(0, 10)
    const toYMD = to.toISOString().slice(0, 10)

    const records = await db.attendanceRecord.findMany({
      where: {
        date: { gte: fromYMD, lte: toYMD },
        ...(institutionUserIds ? { userId: { in: institutionUserIds } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, shortName: true } },
      },
      orderBy: { date: "desc" },
    })

    // Aggregate counts by status
    const statusCounts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    for (const r of records) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
    }
    const total = records.length
    const attendanceRate = total > 0
      ? Number(((statusCounts.present / total) * 100).toFixed(2))
      : 0

    return NextResponse.json({
      type: "attendance",
      from: from.toISOString(),
      to: to.toISOString(),
      institutionId,
      institutionName,
      totalRecords: total,
      attendanceRate,
      statusCounts,
      rows: records.map((r) => ({
        id: r.id,
        date: r.date,
        userName: r.user.name,
        userEmail: r.user.email,
        courseId: r.courseId,
        courseTitle: r.course.title,
        courseShortName: r.course.shortName,
        sessionType: r.sessionType,
        status: r.status,
      })),
    })
  }

  /* ----------------------- COMPLETION ----------------------- */
  if (type === "completion") {
    // Completion report = certificate issuance within the date range.
    // (We use Certificate.issuedAt as the proxy for completion date.)
    const certificates = await db.certificate.findMany({
      where: {
        issuedAt: { gte: from, lte: to },
        ...(institutionUserIds ? { userId: { in: institutionUserIds } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, shortName: true } },
      },
      orderBy: { issuedAt: "desc" },
    })

    // Compute completion rate: certificates vs. total enrollments in range
    // (a learner is "completed" if they have a certificate for the course
    // they enrolled in within the window).
    const totalEnrollments = await db.enrollment.count({
      where: {
        enrolledAt: { gte: from, lte: to },
        completed: true,
        ...(institutionUserIds ? { userId: { in: institutionUserIds } } : {}),
      },
    })
    const completionRate = totalEnrollments > 0
      ? Number(((certificates.length / totalEnrollments) * 100).toFixed(2))
      : 0

    // Aggregate by course
    const byCourseMap = new Map<string, { courseId: string; courseTitle: string; courseShortName: string; count: number; avgScore: number }>()
    for (const c of certificates) {
      const key = c.courseId
      const existing = byCourseMap.get(key)
      if (existing) {
        existing.count++
        existing.avgScore = (existing.avgScore + c.score) / 2
      } else {
        byCourseMap.set(key, {
          courseId: key,
          courseTitle: c.course.title,
          courseShortName: c.course.shortName,
          count: 1,
          avgScore: c.score,
        })
      }
    }

    return NextResponse.json({
      type: "completion",
      from: from.toISOString(),
      to: to.toISOString(),
      institutionId,
      institutionName,
      totalCertificates: certificates.length,
      totalCompletedEnrollments: totalEnrollments,
      completionRate,
      byCourse: Array.from(byCourseMap.values())
        .map((c) => ({ ...c, avgScore: Math.round(c.avgScore) }))
        .sort((a, b) => b.count - a.count),
      rows: certificates.map((c) => ({
        id: c.id,
        certificateId: c.certificateId,
        userName: c.user.name,
        userEmail: c.user.email,
        courseId: c.courseId,
        courseTitle: c.course.title,
        courseShortName: c.course.shortName,
        score: c.score,
        issuedAt: c.issuedAt,
      })),
    })
  }

  /* ----------------------- REVENUE ----------------------- */
  if (type === "revenue") {
    const orders = await db.order.findMany({
      where: {
        status: "paid",
        createdAt: { gte: from, lte: to },
        ...(institutionUserIds ? { userId: { in: institutionUserIds } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, shortName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + o.finalAmount, 0)
    const totalOrders = orders.length
    const avgOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0
    const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0)

    // Aggregate by course
    const byCourseMap = new Map<string, { courseId: string; courseTitle: string; courseShortName: string; revenue: number; orders: number }>()
    for (const o of orders) {
      const key = o.courseId ?? "—"
      const existing = byCourseMap.get(key)
      if (existing) {
        existing.revenue += o.finalAmount
        existing.orders++
      } else {
        byCourseMap.set(key, {
          courseId: key,
          courseTitle: o.course?.title ?? "—",
          courseShortName: o.course?.shortName ?? "—",
          revenue: o.finalAmount,
          orders: 1,
        })
      }
    }

    return NextResponse.json({
      type: "revenue",
      from: from.toISOString(),
      to: to.toISOString(),
      institutionId,
      institutionName,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalDiscount,
      byCourse: Array.from(byCourseMap.values())
        .map((c) => ({ ...c, revenue: Number(c.revenue.toFixed(2)) }))
        .sort((a, b) => b.revenue - a.revenue),
      rows: orders.map((o) => ({
        id: o.id,
        userName: o.user.name,
        userEmail: o.user.email,
        courseId: o.courseId,
        courseTitle: o.course?.title ?? "—",
        courseShortName: o.course?.shortName ?? "—",
        amount: o.amount,
        discount: o.discount,
        finalAmount: o.finalAmount,
        couponCode: o.couponCode,
        status: o.status,
        createdAt: o.createdAt,
      })),
    })
  }

  /* ----------------------- Unknown type ----------------------- */
  return NextResponse.json(
    { error: "Invalid report type. Use one of: enrollment, attendance, completion, revenue" },
    { status: 400 },
  )
})
