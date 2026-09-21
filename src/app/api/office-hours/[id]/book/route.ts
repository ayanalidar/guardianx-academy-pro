import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { sendEmail } from "@/lib/email"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const slot = await db.officeHourSlot.findUnique({
    where: { id },
    include: {
      instructor: {
        select: { id: true, name: true, email: true, title: true },
      },
      course: { select: { id: true, title: true, shortName: true } },
    },
  })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })

  // Must be a future slot
  if (slot.endAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This slot is no longer available" }, { status: 400 })
  }

  // Students cannot book their own slots
  if (slot.instructorId === user.id) {
    return NextResponse.json({ error: "You cannot book your own slot" }, { status: 400 })
  }

  // Prevent double-booking
  const existing = await db.officeHourBooking.findUnique({
    where: { slotId_studentId: { slotId: id, studentId: user.id } },
  })
  if (existing && existing.status !== "cancelled") {
    return NextResponse.json({ error: "You have already booked this slot" }, { status: 400 })
  }

  // Capacity check
  const bookedCount = await db.officeHourBooking.count({
    where: { slotId: id, status: { not: "cancelled" } },
  })
  if (bookedCount >= slot.maxBookings) {
    return NextResponse.json({ error: "This slot is fully booked" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const topic = typeof body.topic === "string" ? body.topic.slice(0, 200) : ""
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : ""

  // If a cancelled booking existed, reuse it via update; otherwise create new
  let booking
  if (existing && existing.status === "cancelled") {
    booking = await db.officeHourBooking.update({
      where: { id: existing.id },
      data: { topic, notes, status: "booked" },
    })
  } else {
    booking = await db.officeHourBooking.create({
      data: {
        slotId: id,
        studentId: user.id,
        topic,
        notes,
        status: "booked",
      },
    })
  }

  const student = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  })

  const meetingDetail =
    slot.mode === "video"
      ? `Video meeting${slot.location ? `: ${slot.location}` : " (link will be shared by instructor)"}`
      : slot.mode === "in-person"
      ? `In-person${slot.location ? ` at ${slot.location}` : ""}`
      : `Chat session${slot.location ? ` on ${slot.location}` : ""}`

  const timeStr = new Date(slot.startAt).toLocaleString()
  const courseInfo = slot.course ? ` for ${slot.course.shortName} - ${slot.course.title}` : ""

  // Email + notification to student
  if (student) {
    await sendEmail({
      to: student.email,
      subject: `Office hours confirmed - ${timeStr}`,
      body: `Hi ${student.name},

Your office hours session with ${slot.instructor.name}${courseInfo} has been booked.

When: ${timeStr}
Mode: ${slot.mode}
${meetingDetail}

Topic: ${topic || "(no topic provided)"}
${notes ? `Notes: ${notes}` : ""}

See you there!
 - GuardianX Academy`,
      type: "office_hours",
      userId: user.id,
    })
  }

  // Email + notification to instructor
  await sendEmail({
    to: slot.instructor.email,
    subject: `New office hours booking - ${student?.name ?? "A student"}`,
    body: `Hi ${slot.instructor.name},

${student?.name ?? "A student"} booked your office hours slot${courseInfo}.

When: ${timeStr}
Mode: ${slot.mode}
${meetingDetail}

Topic: ${topic || "(no topic provided)"}
${notes ? `Notes from student: ${notes}` : ""}

 - GuardianX Academy`,
    type: "office_hours",
    userId: slot.instructor.id,
  })

  await db.notification.create({
    data: {
      userId: slot.instructor.id,
      type: "office_hours",
      title: "New office hours booking",
      message: `${student?.name ?? "A student"} booked your slot on ${timeStr}${courseInfo ? " (" + courseInfo.trim() + ")" : ""}.`,
      icon: "calendar-check",
      color: "emerald",
      link: JSON.stringify({ name: "instructor-office-hours" }),
    },
  })

  return NextResponse.json({ booking }, { status: 201 })
}
