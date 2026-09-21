import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET - student fetches their own submission for an assignment
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // assignment id
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assignment = await db.assignment.findUnique({
    where: { id },
    select: { id: true, courseId: true, course: { select: { instructorId: true } } },
  })
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

  const isOwner = user.role === "ADMIN" || assignment.course.instructorId === user.id
  if (!isOwner && user.role === "STUDENT") {
    const enr = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: assignment.courseId } },
      select: { id: true },
    })
    if (!enr) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
    }
  }

  const submission = await db.assignmentSubmission.findUnique({
    where: { assignmentId_userId: { assignmentId: id, userId: user.id } },
    include: {
      peerReviews: { select: { id: true, rating: true, feedback: true, submittedAt: true, reviewerId: true } },
    },
  })

  return NextResponse.json({ submission })
}
