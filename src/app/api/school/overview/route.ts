import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

/** Shared guard for SCHOOL_ADMIN access - returns user + school, or an error response. */
export async function getSchoolAdminContext() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (user.role !== "SCHOOL_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden - SCHOOL_ADMIN only" }, { status: 403 }) }
  }
  if (!user.schoolId) {
    return { error: NextResponse.json({ error: "No school linked to this account" }, { status: 403 }) }
  }
  const school = await db.school.findUnique({
    where: { id: user.schoolId },
    select: {
      id: true,
      schoolCode: true,
      name: true,
      type: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      country: true,
      logoUrl: true,
      website: true,
      adminName: true,
      adminEmail: true,
      status: true,
      maxStudents: true,
      createdAt: true,
    },
  })
  if (!school) {
    return { error: NextResponse.json({ error: "School not found" }, { status: 404 }) }
  }
  return { user, school }
}

export async function GET() {
  const ctx = await getSchoolAdminContext()
  if ("error" in ctx) return ctx.error
  const { school } = ctx

  // Gather members with user info
  const members = await db.schoolMember.findMany({
    where: { schoolId: school.id },
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
          createdAt: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  const studentMembers = members.filter((m) => m.role === "STUDENT")
  const instructorMembers = members.filter((m) => m.role === "INSTRUCTOR")
  const studentUserIds = studentMembers.map((m) => m.userId)

  // Batches
  const batches = await db.batch.findMany({
    where: { schoolId: school.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Unique courseIds across all batches
  const courseIdSet = new Set<string>()
  for (const b of batches) {
    for (const cid of b.courseIds.split(",").map((s) => s.trim()).filter(Boolean)) {
      courseIdSet.add(cid)
    }
  }

  // Active students (joined in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const activeStudents = studentMembers.filter((m) => m.joinedAt >= thirtyDaysAgo).length

  // Attendance summary across school students
  let attendanceSummary = { totalRecords: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 }
  if (studentUserIds.length > 0) {
    const records = await db.attendanceRecord.findMany({
      where: { userId: { in: studentUserIds } },
      select: { status: true },
    })
    const present = records.filter((r) => r.status === "present").length
    const absent = records.filter((r) => r.status === "absent").length
    const late = records.filter((r) => r.status === "late").length
    const excused = records.filter((r) => r.status === "excused").length
    const total = records.length
    const rate = total ? Math.round(((present + late) / total) * 100) : 0
    attendanceSummary = { totalRecords: total, present, absent, late, excused, rate }
  }

  // Enrollment trend - last 6 months (students joined per month)
  const now = new Date()
  const months: { key: string; label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleString("default", { month: "short" })
    months.push({ key, label, count: 0 })
  }
  for (const m of studentMembers) {
    const joined = new Date(m.joinedAt)
    const key = `${joined.getFullYear()}-${String(joined.getMonth() + 1).padStart(2, "0")}`
    const slot = months.find((mm) => mm.key === key)
    if (slot) slot.count++
  }

  // Recent activity
  const recentStudents = studentMembers.slice(0, 10).map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatar: m.user.avatar,
    title: m.user.title,
    joinedAt: m.joinedAt,
  }))
  const recentBatches = batches.slice(0, 5).map((b) => ({
    id: b.id,
    name: b.name,
    status: b.status,
    memberCount: b._count.members,
    createdAt: b.createdAt,
  }))

  return NextResponse.json({
    school: {
      id: school.id,
      name: school.name,
      type: school.type,
      schoolCode: school.schoolCode,
      city: school.city,
      state: school.state,
      maxStudents: school.maxStudents,
      logoUrl: school.logoUrl,
      website: school.website,
      status: school.status,
    },
    counts: {
      totalStudents: studentMembers.length,
      totalInstructors: instructorMembers.length,
      totalBatches: batches.length,
      totalCoursesAssigned: courseIdSet.size,
      activeStudents,
    },
    recentActivity: {
      recentStudents,
      recentBatches,
    },
    attendanceSummary,
    enrollmentTrend: months,
  })
}
