import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// GET - list current instructor's rubrics (with criteria)
export async function GET() {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const rubrics = await db.gradingRubric.findMany({
    where: user.role === "ADMIN" ? {} : { createdBy: user.id },
    include: {
      criteria: { orderBy: { order: "asc" } },
      _count: { select: { assignments: true } },
      course: { select: { id: true, title: true, shortName: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ rubrics })
}

// POST - create rubric with criteria
// Body: { title, description, courseId?, criteria: [{ label, description, points, order }] }
export async function POST(req: NextRequest) {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const body = await req.json()
  const { title, description, courseId, criteria } = body || {}

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return NextResponse.json({ error: "At least one criterion required" }, { status: 400 })
  }

  // Validate course ownership if provided
  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId }, select: { instructorId: true } })
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
      return NextResponse.json({ error: "Not your course" }, { status: 403 })
    }
  }

  // Validate each criterion
  for (const c of criteria) {
    if (!c?.label?.trim()) {
      return NextResponse.json({ error: "Each criterion requires a label" }, { status: 400 })
    }
  }

  const rubric = await db.gradingRubric.create({
    data: {
      title: title.trim(),
      description: description || "",
      courseId: courseId || null,
      createdBy: user.id,
      criteria: {
        create: criteria.map((c: { label: string; description?: string; points?: number; order?: number }, idx: number) => ({
          label: String(c.label).trim(),
          description: c.description ? String(c.description) : "",
          points: Number(c.points) || 0,
          order: typeof c.order === "number" ? c.order : idx,
        })),
      },
    },
    include: { criteria: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json({ rubric }, { status: 201 })
}
