import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

/** Guard helper for school-admin access. */
async function schoolAdminGuard() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (user.role !== "SCHOOL_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden - SCHOOL_ADMIN only" }, { status: 403 }) }
  }
  if (!user.schoolId) {
    return { error: NextResponse.json({ error: "No school linked to this account" }, { status: 403 }) }
  }
  return { user, schoolId: user.schoolId }
}

export async function GET() {
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  // Gather students
  const studentMembers = await db.schoolMember.findMany({
    where: { schoolId, role: "STUDENT" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          title: true,
          xp: true,
          level: true,
          streak: true,
        },
      },
    },
  })
  const studentUserIds = studentMembers.map((m) => m.userId)
  const userMap = new Map(studentMembers.map((m) => [m.user.id, m.user]))

  // Batches
  const batches = await db.batch.findMany({
    where: { schoolId },
    include: {
      members: { select: { userId: true } },
    },
  })

  // Unique assigned courseIds across batches
  const courseIdSet = new Set<string>()
  for (const b of batches) {
    for (const cid of b.courseIds.split(",").map((s) => s.trim()).filter(Boolean)) courseIdSet.add(cid)
  }
  const assignedCourseIds = Array.from(courseIdSet)

  // Fetch enrollments for all school students (regardless of assigned courses)
  const enrollments = studentUserIds.length
    ? await db.enrollment.findMany({
        where: { userId: { in: studentUserIds } },
        include: { course: { select: { id: true, title: true, shortName: true, color: true, thumbnail: true, level: true } } },
      })
    : []
  // Filter to assigned courses only for engagement metrics
  const assignedEnrollments = enrollments.filter((e) => courseIdSet.has(e.courseId))

  // Fetch all attendance records for school students
  const attendanceRecords = studentUserIds.length
    ? await db.attendanceRecord.findMany({
        where: { userId: { in: studentUserIds } },
        select: { userId: true, status: true, courseId: true, date: true },
      })
    : []

  // Fetch all certificates for school students
  const certificates = studentUserIds.length
    ? await db.certificate.findMany({
        where: { userId: { in: studentUserIds } },
        select: { id: true, userId: true, courseId: true, issuedAt: true, score: true },
      })
    : []

  // --- studentProgress: per-student avg progress + completion rate
  const enrollByStudent = new Map<string, typeof enrollments>()
  for (const e of enrollments) {
    const arr = enrollByStudent.get(e.userId) || []
    arr.push(e)
    enrollByStudent.set(e.userId, arr)
  }
  const studentProgress = studentMembers.map((m) => {
    const userEnrollments = enrollByStudent.get(m.user.id) || []
    const avgProgress = userEnrollments.length
      ? Math.round(userEnrollments.reduce((a, e) => a + e.progress, 0) / userEnrollments.length)
      : 0
    const completedCount = userEnrollments.filter((e) => e.completed).length
    const completionRate = userEnrollments.length
      ? Math.round((completedCount / userEnrollments.length) * 100)
      : 0
    return {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      title: m.user.title,
      xp: m.user.xp,
      level: m.user.level,
      enrollmentCount: userEnrollments.length,
      avgProgress,
      completedCount,
      completionRate,
    }
  })

  // --- courseEngagement: per assigned course, count of activity (enrollments + attendance records)
  const courseEngagement = assignedCourseIds.length
    ? await Promise.all(
        assignedCourseIds.map(async (cid) => {
          const course = await db.course.findUnique({
            where: { id: cid },
            select: { id: true, title: true, shortName: true, color: true, thumbnail: true, level: true },
          })
          const enrolledSchoolStudents = assignedEnrollments.filter((e) => e.courseId === cid).length
          const attendanceCount = attendanceRecords.filter((r) => r.courseId === cid).length
          const certCount = certificates.filter((c) => c.courseId === cid).length
          return {
            course,
            enrolledSchoolStudents,
            attendanceRecords: attendanceCount,
            certificatesIssued: certCount,
            activityScore: enrolledSchoolStudents * 2 + attendanceCount + certCount * 3,
          }
        })
      ).then((arr) => arr.sort((a, b) => b.activityScore - a.activityScore))
    : []

  // --- topPerformers: top 5 students by XP/level
  const topPerformers = [...studentMembers]
    .sort((a, b) => (b.user.xp - a.user.xp) || (b.user.level - a.user.level))
    .slice(0, 5)
    .map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      title: m.user.title,
      xp: m.user.xp,
      level: m.user.level,
      streak: m.user.streak,
    }))

  // --- atRiskStudents: <30% attendance OR <20% progress
  // Build attendance-per-student map
  const attendanceByStudent = new Map<string, { present: number; total: number }>()
  for (const r of attendanceRecords) {
    const entry = attendanceByStudent.get(r.userId) || { present: 0, total: 0 }
    if (r.status === "present" || r.status === "late") entry.present++
    entry.total++
    attendanceByStudent.set(r.userId, entry)
  }

  const atRiskStudents = studentProgress
    .map((sp) => {
      const att = attendanceByStudent.get(sp.userId)
      const attendanceRate = att && att.total ? Math.round((att.present / att.total) * 100) : att && att.total === 0 ? 100 : 0
      const reasons: string[] = []
      // A student with no records at all is not flagged for attendance - only if records exist and rate is low
      if (att && att.total > 0 && attendanceRate < 30) reasons.push(`Low attendance (${attendanceRate}%)`)
      if (sp.enrollmentCount > 0 && sp.avgProgress < 20) reasons.push(`Low progress (${sp.avgProgress}%)`)
      return { ...sp, attendanceRate, atRisk: reasons.length > 0, reasons }
    })
    .filter((s) => s.atRisk)

  // --- batchPerformance: per-batch avg progress + attendance
  const batchPerformance = batches.map((b) => {
    const batchUserIds = b.members.map((m) => m.userId)
    const batchEnrollments = enrollments.filter((e) => batchUserIds.includes(e.userId))
    const avgProgress = batchEnrollments.length
      ? Math.round(batchEnrollments.reduce((a, e) => a + e.progress, 0) / batchEnrollments.length)
      : 0
    const completedCount = batchEnrollments.filter((e) => e.completed).length
    const completionRate = batchEnrollments.length
      ? Math.round((completedCount / batchEnrollments.length) * 100)
      : 0
    const batchAttendance = attendanceRecords.filter((r) => batchUserIds.includes(r.userId))
    const present = batchAttendance.filter((r) => r.status === "present" || r.status === "late").length
    const attendanceRate = batchAttendance.length ? Math.round((present / batchAttendance.length) * 100) : 0
    return {
      batchId: b.id,
      name: b.name,
      status: b.status,
      memberCount: batchUserIds.length,
      avgProgress,
      completionRate,
      attendanceRate,
      attendanceRecords: batchAttendance.length,
    }
  })

  // --- certificateStats: total certificates earned by school students
  const certificateStats = {
    total: certificates.length,
    byCourse: assignedCourseIds.length
      ? assignedCourseIds.map((cid) => {
          const course = courseEngagement.find((c) => c.course?.id === cid)?.course
          const count = certificates.filter((c) => c.courseId === cid).length
          return { courseId: cid, courseTitle: course?.title || null, count }
        }).filter((c) => c.count > 0)
      : [],
    uniqueStudentsWithCert: new Set(certificates.map((c) => c.userId)).size,
    averageScore: certificates.length
      ? Math.round(certificates.reduce((a, c) => a + (c.score || 0), 0) / certificates.length)
      : 0,
  }

  // Aggregate attendance summary across school
  const presentCount = attendanceRecords.filter((r) => r.status === "present").length
  const absentCount = attendanceRecords.filter((r) => r.status === "absent").length
  const lateCount = attendanceRecords.filter((r) => r.status === "late").length
  const excusedCount = attendanceRecords.filter((r) => r.status === "excused").length
  const attTotal = attendanceRecords.length
  const overallAttendanceRate = attTotal ? Math.round(((presentCount + lateCount) / attTotal) * 100) : 0

  return NextResponse.json({
    summary: {
      studentCount: studentMembers.length,
      assignedCourseCount: assignedCourseIds.length,
      batchCount: batches.length,
      totalEnrollments: enrollments.length,
      totalCertificates: certificates.length,
      totalAttendanceRecords: attTotal,
      overallAttendanceRate,
      overallAvgProgress: studentProgress.length
        ? Math.round(studentProgress.reduce((a, s) => a + s.avgProgress, 0) / studentProgress.length)
        : 0,
    },
    studentProgress,
    courseEngagement,
    topPerformers,
    atRiskStudents,
    batchPerformance,
    certificateStats,
    attendanceBreakdown: { present: presentCount, absent: absentCount, late: lateCount, excused: excusedCount },
  })
}
