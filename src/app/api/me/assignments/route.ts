import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET - list all assignments across enrolled courses for the current student,
// with submission status (submitted/graded/missing) and due-soon flags.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get all the student's enrollments
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true, progress: true, completed: true },
  })

  if (enrollments.length === 0) {
    return NextResponse.json({ assignments: [], stats: { total: 0, dueSoon: 0, missing: 0, submitted: 0, graded: 0 } })
  }

  const courseIds = enrollments.map((e) => e.courseId)
  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId, e]))

  const now = new Date()
  const dueSoonThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days

  // Fetch all published assignments for enrolled courses
  const assignments = await db.assignment.findMany({
    where: { courseId: { in: courseIds }, published: true },
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true, thumbnail: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { dueDate: "asc" },
  })

  // Fetch this student's submissions for these assignments in one query
  const mySubmissions = await db.assignmentSubmission.findMany({
    where: { userId: user.id, assignmentId: { in: assignments.map((a) => a.id) } },
    select: {
      id: true,
      assignmentId: true,
      status: true,
      late: true,
      grade: true,
      submittedAt: true,
      gradedAt: true,
    },
  })
  const submissionByAssignment = new Map(mySubmissions.map((s) => [s.assignmentId, s]))

  const result = assignments.map((a) => {
    const sub = submissionByAssignment.get(a.id)
    let status: "missing" | "submitted" | "graded" | "resubmitted" | "returned" = "missing"
    if (sub) {
      status = (sub.status as typeof status) || "submitted"
    } else if (now > a.dueDate) {
      status = "missing"
    }

    const dueSoon = now <= a.dueDate && a.dueDate <= dueSoonThreshold
    const overdue = now > a.dueDate && !sub

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      pointsPossible: a.pointsPossible,
      dueDate: a.dueDate,
      submissionType: a.submissionType,
      allowLate: a.allowLate,
      latePenalty: a.latePenalty,
      enablePeerReview: a.enablePeerReview,
      peerReviewCount: a.peerReviewCount,
      peerReviewDueDate: a.peerReviewDueDate,
      course: a.course,
      enrollment: enrollmentByCourse.get(a.courseId),
      submission: sub ?? null,
      status,
      dueSoon,
      overdue,
      submissionsCount: a._count.submissions,
    }
  })

  const stats = {
    total: result.length,
    dueSoon: result.filter((r) => r.dueSoon).length,
    overdue: result.filter((r) => r.overdue).length,
    missing: result.filter((r) => (r.status as string) === "missing").length,
    submitted: result.filter((r) => (r.status as string) === "submitted" || (r.status as string) === "resubmitted").length,
    graded: result.filter((r) => (r.status as string) === "graded").length,
  }

  // Sort: overdue first, then due-soon, then by dueDate asc
  const sorted = result.sort((a, b) => {
    const order = (r: typeof a) => (r.overdue ? 0 : r.dueSoon ? 1 : (r.status as string) === "graded" ? 3 : 2)
    if (order(a) !== order(b)) return order(a) - order(b)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return NextResponse.json({ assignments: sorted, stats })
}
