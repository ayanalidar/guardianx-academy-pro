import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { createNotification } from "@/lib/notifications"

// POST - submit a peer review for a submission.
// Body: { rating (1-5), feedback, rubricScores? }
// Creates a PeerReview record (deduped by @@unique([submissionId, reviewerId])).
// Sends a notification to the reviewed user.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // submission id
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const submission = await db.assignmentSubmission.findUnique({
    where: { id },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          courseId: true,
          enablePeerReview: true,
          peerReviewDueDate: true,
          course: { select: { instructorId: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
  })
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  if (!submission.assignment.enablePeerReview) {
    return NextResponse.json({ error: "Peer review not enabled for this assignment" }, { status: 400 })
  }

  // Can't review your own submission
  if (submission.userId === user.id) {
    return NextResponse.json({ error: "Cannot review your own submission" }, { status: 400 })
  }

  // Enrollment check for students
  const isOwner = user.role === "ADMIN" || submission.assignment.course.instructorId === user.id
  if (!isOwner) {
    if (user.role === "STUDENT") {
      const enr = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: submission.assignment.courseId } },
        select: { id: true },
      })
      if (!enr) {
        return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  // Check peer-review deadline if set
  if (submission.assignment.peerReviewDueDate) {
    if (new Date() > submission.assignment.peerReviewDueDate) {
      return NextResponse.json({ error: "Peer review deadline has passed" }, { status: 400 })
    }
  }

  // Check for duplicate review (unique constraint)
  const existing = await db.peerReview.findUnique({
    where: { submissionId_reviewerId: { submissionId: id, reviewerId: user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this submission" }, { status: 409 })
  }

  const body = await req.json()
  const { rating, feedback, rubricScores } = body || {}

  if (typeof rating !== "number" || Number.isNaN(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be a number between 1 and 5" }, { status: 400 })
  }

  const rubricScoresJson = Array.isArray(rubricScores) ? JSON.stringify(rubricScores) : "[]"

  const review = await db.peerReview.create({
    data: {
      submissionId: id,
      reviewerId: user.id,
      reviewedUserId: submission.userId,
      rating: Math.round(rating),
      feedback: feedback || "",
      rubricScores: rubricScoresJson,
    },
  })

  // Notify reviewed user
  try {
    await createNotification({
      userId: submission.userId,
      type: "course_update",
      title: `New peer review on "${submission.assignment.title}"`,
      message: `A peer rated your submission ${Math.round(rating)}/5${
        feedback ? `: "${feedback.slice(0, 120)}${feedback.length > 120 ? "…" : ""}"` : "."
      }`,
      icon: "users",
      color: "cyan",
      link: JSON.stringify({ name: "assignments", assignmentId: submission.assignment.id }),
    })
  } catch (e) {
    console.error("[peer-review] notification failed:", e)
  }

  return NextResponse.json({ review }, { status: 201 })
}
