import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const slot = await db.officeHourSlot.findUnique({
    where: { id },
    include: { instructor: { select: { id: true } } },
  })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })

  if (slot.instructorId !== user.id && !(user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const bookings = await db.officeHourBooking.findMany({
    where: { slotId: id },
    include: {
      student: {
        select: { id: true, name: true, avatar: true, title: true, email: true, bio: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ bookings })
}
