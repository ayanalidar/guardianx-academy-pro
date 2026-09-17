import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

const VALID_STATUSES = new Set(["present", "absent", "late", "excused"])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Verify the caller owns (or admin-bypasses) the course. Returns the course or an error response. */
async function getOwnedCourse(courseId: string, user: { id: string; role: string }) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, shortName: true, instructorId: true },
  })
  if (!course) return { error: NextResponse.json({ error: "Course not found" }, { status: 404 }) }
  if (user.role !== "ADMIN" && course.instructorId !== user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { course }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const { error, course } = await getOwnedCourse(id, user)
  if (error || !course) return error!

  const url = new URL(req.url)
  const date = url.searchParams.get("date") || undefined
  const sessionType = url.searchParams.get("sessionType") || undefined

  const where: { courseId: string; date?: string; sessionType?: string } = { courseId: id }
  if (date) where.date = date
  if (sessionType) where.sessionType = sessionType

  const [records, enrollments] = await Promise.all([
    db.attendanceRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, title: true } },
      },
      orderBy: [{ date: "desc" }, { recordedAt: "desc" }],
    }),
    db.enrollment.findMany({
      where: { courseId: id },
      select: {
        user: { select: { id: true, name: true, email: true, avatar: true, title: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  const roster = enrollments.map((e) => e.user)

  // Group records by `date|sessionType` for instructor session view
  const byDate: Record<string, typeof records> = {}
  for (const r of records) {
    const key = `${r.date}|${r.sessionType}`
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(r)
  }

  return NextResponse.json({
    course: { id: course.id, title: course.title, shortName: course.shortName },
    records,
    byDate,
    roster,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const { error } = await getOwnedCourse(id, user)
  if (error) return error

  const body = await req.json()
  const { userId, date, sessionType = "live", status, notes = "" } = body as {
    userId?: string
    date?: string
    sessionType?: string
    status?: string
    notes?: string
  }

  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) is required" }, { status: 400 })
  }
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status (present|absent|late|excused)" }, { status: 400 })
  }

  // Verify the student is enrolled in this course
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: id } },
  })
  if (!enrollment) {
    return NextResponse.json({ error: "Student is not enrolled in this course" }, { status: 400 })
  }

  const record = await db.attendanceRecord.upsert({
    where: { courseId_userId_date_sessionType: { courseId: id, userId, date, sessionType } },
    create: { courseId: id, userId, date, sessionType, status, notes },
    update: { status, notes },
  })

  return NextResponse.json({ record })
}
