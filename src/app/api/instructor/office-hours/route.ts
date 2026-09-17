import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

export async function GET() {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const slots = await db.officeHourSlot.findMany({
    where: { instructorId: user.id },
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true } },
      bookings: {
        select: {
          id: true,
          status: true,
          topic: true,
          notes: true,
          createdAt: true,
          student: {
            select: { id: true, name: true, avatar: true, title: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startAt: "asc" },
  })

  const result = slots.map((s) => {
    const activeBookings = s.bookings.filter((b) => b.status !== "cancelled")
    return {
      id: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      mode: s.mode,
      location: s.location,
      maxBookings: s.maxBookings,
      courseId: s.courseId,
      course: s.course,
      createdAt: s.createdAt,
      bookingsCount: activeBookings.length,
      bookings: s.bookings,
    }
  })

  return NextResponse.json({ slots: result })
}

export async function POST(req: NextRequest) {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => ({}))
  const startAt = body.startAt ? new Date(body.startAt) : null
  const endAt = body.endAt ? new Date(body.endAt) : null

  if (!startAt || isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Valid startAt is required" }, { status: 400 })
  }
  if (!endAt || isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Valid endAt is required" }, { status: 400 })
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 })
  }

  const mode = body.mode === "in-person" || body.mode === "chat" ? body.mode : "video"
  const location = typeof body.location === "string" ? body.location : ""
  const maxBookings = Number.isFinite(Number(body.maxBookings)) ? Math.max(1, Number(body.maxBookings)) : 1
  const courseId = body.courseId || null

  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    if (course.instructorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Course not owned by you" }, { status: 403 })
    }
  }

  const slot = await db.officeHourSlot.create({
    data: {
      instructorId: user.id,
      courseId,
      startAt,
      endAt,
      mode,
      location,
      maxBookings,
    },
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true } },
    },
  })

  return NextResponse.json({ slot }, { status: 201 })
}
