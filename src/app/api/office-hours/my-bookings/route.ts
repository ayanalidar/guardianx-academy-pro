import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookings = await db.officeHourBooking.findMany({
    where: {
      studentId: user.id,
      status: { not: "cancelled" },
      slot: { endAt: { gt: new Date() } },
    },
    include: {
      slot: {
        include: {
          instructor: {
            select: { id: true, name: true, avatar: true, title: true },
          },
          course: { select: { id: true, title: true, shortName: true, color: true } },
        },
      },
    },
    orderBy: { slot: { startAt: "asc" } },
  })

  const result = bookings.map((b) => ({
    id: b.id,
    topic: b.topic,
    notes: b.notes,
    status: b.status,
    createdAt: b.createdAt,
    slot: {
      id: b.slot.id,
      startAt: b.slot.startAt,
      endAt: b.slot.endAt,
      mode: b.slot.mode,
      location: b.slot.location,
      maxBookings: b.slot.maxBookings,
      course: b.slot.course,
      instructor: b.slot.instructor,
    },
  }))

  return NextResponse.json({ bookings: result })
}
