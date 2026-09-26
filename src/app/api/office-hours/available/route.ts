import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const instructorId = searchParams.get("instructorId") || undefined
  const now = new Date()

  // Pull upcoming, non-past slots with active booking counts
  const slots = await db.officeHourSlot.findMany({
    where: {
      endAt: { gt: now },
      ...(instructorId ? { instructorId } : {}),
    },
    include: {
      instructor: {
        select: { id: true, name: true, avatar: true, title: true, bio: true },
      },
      course: { select: { id: true, title: true, shortName: true, color: true } },
      bookings: {
        where: { status: { not: "cancelled" } },
        select: { id: true, studentId: true },
      },
    },
    orderBy: { startAt: "asc" },
  })

  const result = slots
    .map((s) => {
      const bookedCount = s.bookings.length
      const myBooking = s.bookings.find((b) => b.studentId === user.id)
      return {
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        mode: s.mode,
        location: s.location,
        maxBookings: s.maxBookings,
        courseId: s.courseId,
        course: s.course,
        instructor: s.instructor,
        bookedCount,
        isFull: bookedCount >= s.maxBookings,
        myBooking: myBooking ? { id: myBooking.id } : null,
      }
    })
    // Hide explicit location details from non-booked students to keep privacy.
    // (Frontend can show a placeholder "Booking required to view link")
    .map((s) =>
      s.myBooking
        ? s
        : { ...s, location: s.mode === "in-person" ? s.location : "" }
    )

  return NextResponse.json({ slots: result })
}
