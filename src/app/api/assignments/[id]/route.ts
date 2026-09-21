import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET - get assignment details (must be enrolled or instructor)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // assignment id
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assignment = await db.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true, instructorId: true } },
      rubric: { include: { criteria: { orderBy: { order: "asc" } } } },
      _count: { select: { submissions: true } },
    },
  })
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

  const isOwner = user.role === "ADMIN" || assignment.course.instructorId === user.id
  if (!isOwner) {
    if (user.role === "STUDENT") {
      const enr = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: assignment.courseId } },
        select: { id: true },
      })
      if (!enr) {
        return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return NextResponse.json({ assignment })
}
