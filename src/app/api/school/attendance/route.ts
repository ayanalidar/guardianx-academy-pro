import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

const VALID_STATUSES = new Set(["present", "absent", "late", "excused"])
const VALID_SESSION_TYPES = new Set(["live", "in-person", "exam"])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

export async function GET(req: NextRequest) {
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const url = new URL(req.url)
  const batchId = url.searchParams.get("batchId") || undefined
  const date = url.searchParams.get("date") || undefined
  if (date && !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 })
  }

  // Optionally validate batch belongs to school
  if (batchId) {
    const batch = await db.batch.findUnique({ where: { id: batchId }, select: { id: true, schoolId: true } })
    if (!batch || batch.schoolId !== schoolId) {
      return NextResponse.json({ error: "Batch not found in this school" }, { status: 404 })
    }
  }

  // Get the list of student userIds in the school (optionally filtered by batch)
  let studentUserIds: string[] = []
  if (batchId) {
    const batchMembers = await db.batchMember.findMany({
      where: { batchId },
      select: { userId: true },
    })
    studentUserIds = batchMembers.map((m) => m.userId)
  } else {
    const schoolMembers = await db.schoolMember.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { userId: true },
    })
    studentUserIds = schoolMembers.map((m) => m.userId)
  }

  if (studentUserIds.length === 0) {
    return NextResponse.json({
      summary: { totalRecords: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
      byDate: [],
      byStudent: [],
      studentCount: 0,
    })
  }

  // Fetch attendance records for these students (optionally for a specific date)
  const records = await db.attendanceRecord.findMany({
    where: {
      userId: { in: studentUserIds },
      ...(date ? { date } : {}),
    },
    select: {
      id: true,
      userId: true,
      courseId: true,
      date: true,
      sessionType: true,
      status: true,
      recordedAt: true,
    },
    orderBy: [{ date: "desc" }, { recordedAt: "desc" }],
  })

  // Summary
  const present = records.filter((r) => r.status === "present").length
  const absent = records.filter((r) => r.status === "absent").length
  const late = records.filter((r) => r.status === "late").length
  const excused = records.filter((r) => r.status === "excused").length
  const totalRecords = records.length
  const attendanceRate = totalRecords ? Math.round(((present + late) / totalRecords) * 100) : 0

  // byDate - group by `date|sessionType`, take 14 most recent
  const byDateMap = new Map<string, { date: string; sessionType: string; present: number; absent: number; late: number; excused: number; total: number; recordedAt: Date }>()
  for (const r of records) {
    const key = `${r.date}|${r.sessionType}`
    const entry = byDateMap.get(key) || {
      date: r.date,
      sessionType: r.sessionType,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
      recordedAt: r.recordedAt,
    }
    if (r.status === "present") entry.present++
    else if (r.status === "absent") entry.absent++
    else if (r.status === "late") entry.late++
    else if (r.status === "excused") entry.excused++
    entry.total++
    if (r.recordedAt > entry.recordedAt) entry.recordedAt = r.recordedAt
    byDateMap.set(key, entry)
  }
  const byDate = Array.from(byDateMap.values())
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 14)
    .map(({ recordedAt: _r, ...rest }) => rest)

  // byStudent - per-student attendance rate
  const byStudentMap = new Map<string, { userId: string; present: number; absent: number; late: number; excused: number; total: number }>()
  for (const r of records) {
    const entry = byStudentMap.get(r.userId) || { userId: r.userId, present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    if (r.status === "present") entry.present++
    else if (r.status === "absent") entry.absent++
    else if (r.status === "late") entry.late++
    else if (r.status === "excused") entry.excused++
    entry.total++
    byStudentMap.set(r.userId, entry)
  }

  // Fetch user info for the students in the result
  const userIdsInResults = Array.from(byStudentMap.keys())
  const users = userIdsInResults.length
    ? await db.user.findMany({
        where: { id: { in: userIdsInResults } },
        select: { id: true, name: true, email: true, avatar: true, title: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  // Also include students with no records (rate = 0)
  for (const uid of studentUserIds) {
    if (!byStudentMap.has(uid)) {
      byStudentMap.set(uid, { userId: uid, present: 0, absent: 0, late: 0, excused: 0, total: 0 })
    }
  }

  const byStudent = Array.from(byStudentMap.values()).map((s) => {
    const u = userMap.get(s.userId)
    const rate = s.total ? Math.round(((s.present + s.late) / s.total) * 100) : 0
    return {
      userId: s.userId,
      name: u?.name || "Unknown",
      email: u?.email || "",
      avatar: u?.avatar || null,
      title: u?.title || null,
      present: s.present,
      absent: s.absent,
      late: s.late,
      excused: s.excused,
      total: s.total,
      rate,
    }
  })

  return NextResponse.json({
    summary: { totalRecords, present, absent, late, excused, attendanceRate },
    byDate,
    byStudent,
    studentCount: studentUserIds.length,
    filters: { batchId: batchId ?? null, date: date ?? null },
  })
}

export async function POST(req: NextRequest) {
  try {
    const guard = await schoolAdminGuard()
    if ("error" in guard) return guard.error
    const { schoolId } = guard

    const body = await req.json()
    const { userId, date, sessionType = "live", status, notes = "", courseId } = body as {
      userId?: string
      date?: string
      sessionType?: string
      status?: string
      notes?: string
      courseId?: string
    }

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: "Valid date (YYYY-MM-DD) is required" }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status (present|absent|late|excused)" }, { status: 400 })
    }
    if (!VALID_SESSION_TYPES.has(sessionType)) {
      return NextResponse.json({ error: "Invalid sessionType (live|in-person|exam)" }, { status: 400 })
    }

    // Verify the user is a member of this school
    const member = await db.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId, userId } },
    })
    if (!member) {
      return NextResponse.json({ error: "Student is not a member of this school" }, { status: 400 })
    }

    // Resolve a courseId: explicit > first course from the student's batch courseIds > first course from any batch in school
    let finalCourseId = courseId
    if (!finalCourseId) {
      const batchMembers = await db.batchMember.findMany({
        where: { userId },
        include: { batch: { select: { courseIds: true, schoolId: true } } },
      })
      for (const bm of batchMembers) {
        if (bm.batch.schoolId !== schoolId) continue
        const ids = bm.batch.courseIds.split(",").map((s) => s.trim()).filter(Boolean)
        if (ids.length > 0) {
          finalCourseId = ids[0]
          break
        }
      }
    }
    if (!finalCourseId) {
      // fallback: pick the first course from any school batch
      const schoolBatches = await db.batch.findMany({ where: { schoolId }, select: { courseIds: true } })
      for (const b of schoolBatches) {
        const ids = b.courseIds.split(",").map((s) => s.trim()).filter(Boolean)
        if (ids.length > 0) {
          finalCourseId = ids[0]
          break
        }
      }
    }
    if (!finalCourseId) {
      return NextResponse.json(
        { error: "No courseId provided and no batch courses available to default to" },
        { status: 400 }
      )
    }

    // Verify the course exists
    const course = await db.course.findUnique({ where: { id: finalCourseId }, select: { id: true } })
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Upsert the attendance record
    const record = await db.attendanceRecord.upsert({
      where: {
        courseId_userId_date_sessionType: { courseId: finalCourseId, userId, date, sessionType },
      },
      create: { courseId: finalCourseId, userId, date, sessionType, status, notes },
      update: { status, notes },
    })

    return NextResponse.json({ record })
  } catch (e) {
    console.error("[school/attendance POST]", e)
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 })
  }
}
