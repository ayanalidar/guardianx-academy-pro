import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Helper: load an assignment and verify instructor ownership (or admin)
async function loadOwnedAssignment(id: string, user: { id: string; role: string }) {
  const assignment = await db.assignment.findUnique({
    where: { id },
    include: { course: { select: { instructorId: true, id: true, title: true } } },
  })
  if (!assignment) return null
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && assignment.instructorId !== user.id) {
    return { forbidden: true } as const
  }
  return assignment
}

// GET - get one assignment with submissions count
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const assignment = await loadOwnedAssignment(id, user)
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
  if ("forbidden" in assignment) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 })
  }

  const [submissionsCount, gradedCount, pendingCount] = await Promise.all([
    db.assignmentSubmission.count({ where: { assignmentId: id } }),
    db.assignmentSubmission.count({ where: { assignmentId: id, status: "graded" } }),
    db.assignmentSubmission.count({ where: { assignmentId: id, status: { in: ["submitted", "resubmitted"] } } }),
  ])

  const { course, ...rest } = assignment
  return NextResponse.json({
    assignment: {
      ...rest,
      course: { id: course.id, title: course.title },
      _count: { submissions: submissionsCount, graded: gradedCount, pending: pendingCount },
    },
  })
}

// PATCH - update assignment
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const assignment = await loadOwnedAssignment(id, user)
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
  if ("forbidden" in assignment) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    instructions,
    pointsPossible,
    dueDate,
    allowLate,
    latePenalty,
    submissionType,
    enablePeerReview,
    peerReviewCount,
    peerReviewDueDate,
    rubricId,
    moduleId,
    published,
  } = body || {}

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = String(title).trim()
  if (description !== undefined) data.description = String(description)
  if (instructions !== undefined) data.instructions = String(instructions)
  if (pointsPossible !== undefined) data.pointsPossible = Number(pointsPossible)
  if (dueDate !== undefined) {
    const d = new Date(dueDate)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 })
    }
    data.dueDate = d
  }
  if (allowLate !== undefined) data.allowLate = !!allowLate
  if (latePenalty !== undefined) data.latePenalty = Number(latePenalty)
  if (submissionType !== undefined) data.submissionType = String(submissionType)
  if (enablePeerReview !== undefined) data.enablePeerReview = !!enablePeerReview
  if (peerReviewCount !== undefined) data.peerReviewCount = Number(peerReviewCount)
  if (peerReviewDueDate !== undefined) {
    data.peerReviewDueDate = peerReviewDueDate ? new Date(peerReviewDueDate) : null
  }
  if (rubricId !== undefined) data.rubricId = rubricId || null
  if (moduleId !== undefined) data.moduleId = moduleId || null
  if (published !== undefined) data.published = !!published

  const updated = await db.assignment.update({
    where: { id },
    data,
    include: {
      rubric: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json({ assignment: updated })
}

// DELETE - delete assignment
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const assignment = await loadOwnedAssignment(id, user)
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
  if ("forbidden" in assignment) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 })
  }

  await db.assignment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
