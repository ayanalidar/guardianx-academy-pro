import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Determine potential contacts based on role:
  //  - STUDENT: instructors of courses the student is enrolled in
  //  - INSTRUCTOR: students enrolled in their courses
  //  - ADMIN: any instructor + student they have a thread with
  const userSelect = {
    id: true,
    name: true,
    avatar: true,
    title: true,
    role: true,
  } as const

  let contacts: {
    id: string
    name: string
    avatar: string | null
    title: string | null
    role: string
  }[] = []

  if (user.role === "INSTRUCTOR" || user.role === "ADMIN") {
    // Students enrolled in instructor's courses
    const enrollments = await db.enrollment.findMany({
      where: { course: { instructorId: user.id } },
      select: { user: { select: userSelect } },
      distinct: ["userId"],
    })
    contacts = enrollments.map((e) => e.user)
  }

  if (user.role === "STUDENT" || user.role === "ADMIN") {
    const enrollments = await db.enrollment.findMany({
      where: { userId: user.id },
      select: {
        course: {
          select: {
            instructor: { select: userSelect },
          },
        },
      },
    })
    const instructors = enrollments.map((e) => e.course.instructor)
    // Merge avoiding duplicates by id
    const map = new Map(contacts.map((c) => [c.id, c]))
    for (const inst of instructors) map.set(inst.id, inst)
    contacts = Array.from(map.values())
  }

  // Always include existing DM partners (so the user can keep messaging people
  // even if they are no longer in a shared course)
  const threads = await db.messageThread.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    include: {
      userA: { select: userSelect },
      userB: { select: userSelect },
    },
  })
  const map = new Map(contacts.map((c) => [c.id, c]))
  for (const t of threads) {
    const other = t.userAId === user.id ? t.userB : t.userA
    if (!map.has(other.id)) map.set(other.id, other)
  }
  contacts = Array.from(map.values())

  // Exclude self
  contacts = contacts.filter((c) => c.id !== user.id)

  return NextResponse.json({ contacts })
}
