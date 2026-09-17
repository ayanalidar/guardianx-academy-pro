import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// GET — list all submissions for an assignment (instructor view, with user info)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // assignment id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const assignment = await db.assignment.findUnique({
    where: { id },
    select: { id: true, title: true, instructorId: true, courseId: true, pointsPossible: true, dueDate: true },
  })
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
  if (user.role !== "ADMIN" && assignment.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // optional filter: submitted | graded | resubmitted | returned

  const submissions = await db.assignmentSubmission.findMany({
    where: { assignmentId: id, ...(status ? { status } : {}) },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, title: true } },
      _count: { select: { peerReviews: true } },
    },
    orderBy: [{ submittedAt: "desc" }],
  })

  const stats = {
    total: submissions.length,
    graded: submissions.filter((s) => s.status === "graded").length,
    pending: submissions.filter((s) => s.status === "submitted" || s.status === "resubmitted").length,
    late: submissions.filter((s) => s.late).length,
    avgGrade:
      submissions.filter((s) => s.grade !== null).length > 0
        ? Math.round(
            submissions.filter((s) => s.grade !== null).reduce((a, s) => a + (s.grade ?? 0), 0) /
              submissions.filter((s) => s.grade !== null).length
          )
        : 0,
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      pointsPossible: assignment.pointsPossible,
      dueDate: assignment.dueDate,
    },
    submissions,
    stats,
  })
}
