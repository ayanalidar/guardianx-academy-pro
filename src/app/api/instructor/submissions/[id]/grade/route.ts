import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { sendEmail } from "@/lib/email"
import { createNotification } from "@/lib/notifications"

// POST - grade a submission.
// Body: { grade (0-100), feedback, rubricScores? (JSON array) }
// Sets gradedAt, gradedBy, status "graded". Sends email + notification to student.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // submission id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const submission = await db.assignmentSubmission.findUnique({
    where: { id },
    include: {
      assignment: { select: { id: true, title: true, instructorId: true, courseId: true, pointsPossible: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && submission.assignment.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 })
  }

  const body = await req.json()
  const { grade, feedback, rubricScores } = body || {}

  if (typeof grade !== "number" || Number.isNaN(grade)) {
    return NextResponse.json({ error: "grade (number) required" }, { status: 400 })
  }
  if (grade < 0 || grade > 100) {
    return NextResponse.json({ error: "grade must be between 0 and 100" }, { status: 400 })
  }

  const rubricScoresJson = Array.isArray(rubricScores) ? JSON.stringify(rubricScores) : "[]"

  const updated = await db.assignmentSubmission.update({
    where: { id },
    data: {
      grade: Math.round(grade),
      feedback: feedback ?? "",
      rubricScores: rubricScoresJson,
      gradedAt: new Date(),
      gradedBy: user.id,
      status: "graded",
    },
  })

  // Send email + notification to student
  try {
    if (submission.user) {
      await sendEmail({
        to: submission.user.email,
        subject: `📝 Graded - ${submission.assignment.title}`,
        body: `Hi ${submission.user.name},

Your submission for "${submission.assignment.title}" has been graded.

Grade: ${Math.round(grade)}/${submission.assignment.pointsPossible}
Feedback:
${feedback || "(no feedback provided)"}

View the full breakdown in your GuardianX dashboard.

The GuardianX Team`,
        type: "assignment",
        userId: submission.user.id,
      })
    }
    await createNotification({
      userId: submission.userId,
      type: "course_update",
      title: `Graded: ${submission.assignment.title}`,
      message: `You scored ${Math.round(grade)}/${submission.assignment.pointsPossible}. ${
        feedback ? "Feedback available." : ""
      }`,
      icon: "clipboard-check",
      color: "emerald",
      link: JSON.stringify({ name: "assignments", assignmentId: submission.assignmentId }),
    })
  } catch (e) {
    console.error("[assignment.grade] notification/email failed:", e)
  }

  return NextResponse.json({ submission: updated })
}
