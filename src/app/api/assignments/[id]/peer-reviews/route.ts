import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET - student fetches submissions assigned to them for peer review.
// Lazily selects up to `assignment.peerReviewCount` random other students'
// submissions (excluding their own and ones they've already reviewed).
// Returns: assignment context + to-review submissions + completed reviews.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // assignment id
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assignment = await db.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true, instructorId: true } },
      rubric: { include: { criteria: { orderBy: { order: "asc" } } } },
    },
  })
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

  if (!assignment.enablePeerReview) {
    return NextResponse.json({ error: "Peer review not enabled for this assignment" }, { status: 400 })
  }

  // Enrollment check for students
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

  // Student must have submitted their own work before reviewing others
  const mySubmission = await db.assignmentSubmission.findUnique({
    where: { assignmentId_userId: { assignmentId: id, userId: user.id } },
    select: { id: true },
  })
  if (!mySubmission) {
    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        pointsPossible: assignment.pointsPossible,
        dueDate: assignment.dueDate,
        peerReviewCount: assignment.peerReviewCount,
        peerReviewDueDate: assignment.peerReviewDueDate,
        course: assignment.course,
        rubric: assignment.rubric,
      },
      toReview: [],
      completed: [],
      needsOwnSubmission: true,
      message: "Submit your own work before reviewing peers.",
    })
  }

  // Fetch reviews this student has already completed
  const completedReviews = await db.peerReview.findMany({
    where: { reviewerId: user.id, submission: { assignmentId: id } },
    include: {
      submission: {
        include: {
          user: { select: { id: true, name: true, avatar: true, title: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  })

  const alreadyReviewedSubmissionIds = new Set(completedReviews.map((r) => r.submissionId))

  // Find candidate submissions: from other students, not yet reviewed by this user.
  const candidates = await db.assignmentSubmission.findMany({
    where: {
      assignmentId: id,
      userId: { not: user.id }, // not own
      id: { notIn: Array.from(alreadyReviewedSubmissionIds) },
    },
    include: {
      user: { select: { id: true, name: true, avatar: true, title: true } },
    },
  })

  // Lazy "assign": pick up to (peerReviewCount - completed.length) random candidates.
  const needed = Math.max(0, assignment.peerReviewCount - completedReviews.length)

  // Shuffle and take `needed`
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const toReview = shuffled.slice(0, needed).map((s) => ({
    id: s.id,
    content: s.content,
    fileUrl: s.fileUrl,
    submittedAt: s.submittedAt,
    late: s.late,
    user: s.user,
  }))

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions,
      pointsPossible: assignment.pointsPossible,
      dueDate: assignment.dueDate,
      peerReviewCount: assignment.peerReviewCount,
      peerReviewDueDate: assignment.peerReviewDueDate,
      course: assignment.course,
      rubric: assignment.rubric,
    },
    toReview,
    completed: completedReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      feedback: r.feedback,
      rubricScores: r.rubricScores,
      submittedAt: r.submittedAt,
      submission: {
        id: r.submission.id,
        user: r.submission.user,
      },
    })),
    progress: {
      completed: completedReviews.length,
      target: assignment.peerReviewCount,
      remaining: Math.max(0, assignment.peerReviewCount - completedReviews.length),
    },
  })
}
