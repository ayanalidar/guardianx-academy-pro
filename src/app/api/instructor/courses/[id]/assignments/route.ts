import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, requireRole } from "@/lib/session"

// GET - list assignments for a course.
// Instructors (owner) and enrolled students can view.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // course id
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true, title: true },
  })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const isOwner = user.role === "ADMIN" || course.instructorId === user.id
  let isEnrolled = false
  if (!isOwner) {
    const enr = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
      select: { id: true },
    })
    isEnrolled = !!enr
    if (!isEnrolled) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
    }
  }

  const assignments = await db.assignment.findMany({
    where: { courseId: id, published: isOwner ? undefined : true },
    include: {
      _count: { select: { submissions: true } },
      rubric: { select: { id: true, title: true } },
    },
    orderBy: { dueDate: "asc" },
  })

  return NextResponse.json({ course: { id: course.id, title: course.title }, assignments })
}

// POST - create a new assignment (INSTRUCTOR/ADMIN only, must be course owner)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // course id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({ where: { id }, select: { instructorId: true } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
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
  } = body || {}

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })
  if (!dueDate) return NextResponse.json({ error: "dueDate required" }, { status: 400 })

  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) {
    return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 })
  }

  // Validate rubric belongs to instructor if provided
  if (rubricId) {
    const rubric = await db.gradingRubric.findUnique({
      where: { id: rubricId },
      select: { createdBy: true },
    })
    if (!rubric) return NextResponse.json({ error: "Rubric not found" }, { status: 404 })
    if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && rubric.createdBy !== user.id) {
      return NextResponse.json({ error: "Rubric not owned by you" }, { status: 403 })
    }
  }

  // Validate module belongs to this course if provided
  if (moduleId) {
    const mod = await db.module.findUnique({ where: { id: moduleId }, select: { courseId: true } })
    if (!mod || mod.courseId !== id) {
      return NextResponse.json({ error: "Module does not belong to this course" }, { status: 400 })
    }
  }

  const assignment = await db.assignment.create({
    data: {
      courseId: id,
      instructorId: user.id,
      moduleId: moduleId || null,
      title: title.trim(),
      description: description || "",
      instructions: instructions || "",
      pointsPossible: Number(pointsPossible) || 100,
      dueDate: due,
      allowLate: allowLate !== undefined ? !!allowLate : true,
      latePenalty: Number(latePenalty) || 0,
      submissionType: submissionType || "text",
      enablePeerReview: !!enablePeerReview,
      peerReviewCount: Number(peerReviewCount) || 2,
      peerReviewDueDate: peerReviewDueDate ? new Date(peerReviewDueDate) : null,
      rubricId: rubricId || null,
      published: true,
    },
    include: {
      rubric: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json({ assignment }, { status: 201 })
}
