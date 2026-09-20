import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const slot = await db.officeHourSlot.findUnique({ where: { id } })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (slot.instructorId !== user.id && !(user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Cancel existing bookings + notify students
  const bookings = await db.officeHourBooking.findMany({
    where: { slotId: id, status: "booked" },
    include: { student: { select: { id: true, name: true, email: true } } },
  })

  await db.officeHourBooking.updateMany({
    where: { slotId: id, status: "booked" },
    data: { status: "cancelled" },
  })

  await db.officeHourSlot.delete({ where: { id } })

  // Send cancellation notifications
  for (const b of bookings) {
    await db.notification.create({
      data: {
        userId: b.student.id,
        type: "office_hours",
        title: "Office hours slot cancelled",
        message: `Your booking on ${slot.startAt.toISOString()} was cancelled by the instructor.`,
        icon: "calendar-x",
        color: "rose",
        link: JSON.stringify({ name: "office-hours" }),
      },
    })
  }

  return NextResponse.json({ ok: true, cancelledBookings: bookings.length })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const slot = await db.officeHourSlot.findUnique({ where: { id } })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (slot.instructorId !== user.id && !(user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: any = {}

  if (body.startAt) {
    const s = new Date(body.startAt)
    if (isNaN(s.getTime())) return NextResponse.json({ error: "Invalid startAt" }, { status: 400 })
    data.startAt = s
  }
  if (body.endAt) {
    const e = new Date(body.endAt)
    if (isNaN(e.getTime())) return NextResponse.json({ error: "Invalid endAt" }, { status: 400 })
    data.endAt = e
  }
  if (data.startAt && data.endAt && data.endAt <= data.startAt) {
    return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 })
  }
  if (data.startAt && !data.endAt && slot.endAt <= data.startAt) {
    return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 })
  }
  if (data.endAt && !data.startAt && data.endAt <= slot.startAt) {
    return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 })
  }
  if (typeof body.mode === "string") {
    data.mode = body.mode === "in-person" || body.mode === "chat" ? body.mode : "video"
  }
  if (typeof body.location === "string") data.location = body.location
  if (body.maxBookings !== undefined && Number.isFinite(Number(body.maxBookings))) {
    data.maxBookings = Math.max(1, Number(body.maxBookings))
  }
  if (body.courseId !== undefined) data.courseId = body.courseId || null

  const updated = await db.officeHourSlot.update({
    where: { id },
    data,
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true } },
    },
  })

  return NextResponse.json({ slot: updated })
}
