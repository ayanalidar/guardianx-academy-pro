import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

const VALID_STATUSES = new Set(["present", "absent", "late", "excused"])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { date, sessionType = "live", records } = body as {
    date?: string
    sessionType?: string
    records?: Array<{ userId: string; status: string; notes?: string }>
  }

  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) is required" }, { status: 400 })
  }
  if (!Array.isArray(records)) {
    return NextResponse.json({ error: "records array is required" }, { status: 400 })
  }

  let upserted = 0
  const errors: Array<{ userId: string; error: string }> = []

  for (const r of records) {
    const userId = r?.userId
    const status = r?.status
    const notes = typeof r?.notes === "string" ? r.notes : ""
    if (!userId) {
      errors.push({ userId: "(missing)", error: "userId required" })
      continue
    }
    if (!status || !VALID_STATUSES.has(status)) {
      errors.push({ userId, error: "Invalid status" })
      continue
    }
    try {
      await db.attendanceRecord.upsert({
        where: { courseId_userId_date_sessionType: { courseId: id, userId, date, sessionType } },
        create: { courseId: id, userId, date, sessionType, status, notes },
        update: { status, notes },
      })
      upserted++
    } catch (err) {
      console.error("[attendance/bulk] upsert failed", userId, err)
      errors.push({ userId, error: "Failed to upsert" })
    }
  }

  return NextResponse.json({
    upserted,
    errors,
    total: records.length,
  })
}
