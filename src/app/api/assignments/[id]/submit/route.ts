import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { sendEmail } from "@/lib/email"

// POST - student submits an assignment.
// Body: { content?, fileUrl? }
// Mark late if past dueDate (only allowLate submissions accepted past due).
// Create or update submission (unique per user+assignment).
// Resubmits set status to "resubmitted".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // assignment id
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assignment = await db.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      courseId: true,
      dueDate: true,
      allowLate: true,
      submissionType: true,
      course: { select: { instructorId: true } },
    },
  })
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

  // Only students (or admin/instructor testing) can submit. Students must be enrolled.
  if (user.role === "STUDENT") {
    const enr = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: assignment.courseId } },
      select: { id: true },
    })
    if (!enr) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
    }
  }

  const body = await req.json()
  const { content, fileUrl } = body || {}

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Submission content or fileUrl required" }, { status: 400 })
  }

  const now = new Date()
  const isLate = now > assignment.dueDate
  if (isLate && !assignment.allowLate) {
    return NextResponse.json(
      { error: "Submission window closed (late submissions not allowed)" },
      { status: 400 }
    )
  }

  const existing = await db.assignmentSubmission.findUnique({
    where: { assignmentId_userId: { assignmentId: id, userId: user.id } },
  })

  let submission
  if (existing) {
    // Resubmission: update content/fileUrl, mark as resubmitted, reset grading
    // so the instructor knows to re-grade the new attempt.
    submission = await db.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        content: content ?? existing.content,
        fileUrl: fileUrl ?? existing.fileUrl ?? null,
        submittedAt: now,
        late: isLate,
        status: "resubmitted",
        grade: null,
        gradedAt: null,
        gradedBy: null,
        feedback: "",
      },
    })
  } else {
    submission = await db.assignmentSubmission.create({
      data: {
        assignmentId: id,
        userId: user.id,
        content: content ?? "",
        fileUrl: fileUrl ?? null,
        submittedAt: now,
        late: isLate,
        status: "submitted",
      },
    })
  }

  // Send confirmation email to the student
  try {
    const student = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    })
    if (student) {
      await sendEmail({
        to: student.email,
        subject: `✅ Submission received - ${assignment.title}`,
        body: `Hi ${student.name},

Your submission for "${assignment.title}" has been received${isLate ? " (marked as late)" : ""}.

Submission ID: ${submission.id}
Submitted at: ${now.toISOString()}

Your instructor will grade it shortly. You'll receive an email once feedback is available.

The GuardianX Team`,
        type: "assignment",
        userId: user.id,
      })
    }
  } catch (e) {
    console.error("[assignment.submit] email failed:", e)
  }

  return NextResponse.json({ submission }, { status: existing ? 200 : 201 })
}
