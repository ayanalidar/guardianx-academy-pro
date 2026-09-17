import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Helper: load rubric and verify ownership
async function loadOwnedRubric(id: string, user: { id: string; role: string }) {
  const rubric = await db.gradingRubric.findUnique({
    where: { id },
    select: { id: true, createdBy: true },
  })
  if (!rubric) return null
  if (user.role !== "ADMIN" && rubric.createdBy !== user.id) {
    return { forbidden: true } as const
  }
  return rubric
}

// GET — get rubric with criteria
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const owned = await loadOwnedRubric(id, user)
  if (!owned) return NextResponse.json({ error: "Rubric not found" }, { status: 404 })
  if ("forbidden" in owned) {
    return NextResponse.json({ error: "Not your rubric" }, { status: 403 })
  }

  const rubric = await db.gradingRubric.findUnique({
    where: { id },
    include: {
      criteria: { orderBy: { order: "asc" } },
      course: { select: { id: true, title: true, shortName: true } },
      _count: { select: { assignments: true } },
    },
  })
  return NextResponse.json({ rubric })
}

// PATCH — update rubric (title, description) AND replace criteria (delete old, insert new)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const owned = await loadOwnedRubric(id, user)
  if (!owned) return NextResponse.json({ error: "Rubric not found" }, { status: 404 })
  if ("forbidden" in owned) {
    return NextResponse.json({ error: "Not your rubric" }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, criteria, courseId } = body || {}

  // Validate new criteria if provided
  if (criteria !== undefined) {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json({ error: "At least one criterion required" }, { status: 400 })
    }
    for (const c of criteria) {
      if (!c?.label?.trim()) {
        return NextResponse.json({ error: "Each criterion requires a label" }, { status: 400 })
      }
    }
  }

  // Validate course ownership if provided
  if (courseId !== undefined && courseId) {
    const course = await db.course.findUnique({ where: { id: courseId }, select: { instructorId: true } })
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json({ error: "Not your course" }, { status: 403 })
    }
  }

  // Update basic fields
  await db.gradingRubric.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(description !== undefined && { description: String(description) }),
      ...(courseId !== undefined && { courseId: courseId || null }),
    },
  })

  // Replace criteria if provided
  if (Array.isArray(criteria)) {
    await db.rubricCriterion.deleteMany({ where: { rubricId: id } })
    if (criteria.length > 0) {
      await db.rubricCriterion.createMany({
        data: criteria.map(
          (c: { label: string; description?: string; points?: number; order?: number }, idx: number) => ({
            rubricId: id,
            label: String(c.label).trim(),
            description: c.description ? String(c.description) : "",
            points: Number(c.points) || 0,
            order: typeof c.order === "number" ? c.order : idx,
          })
        ),
      })
    }
  }

  const rubric = await db.gradingRubric.findUnique({
    where: { id },
    include: {
      criteria: { orderBy: { order: "asc" } },
      course: { select: { id: true, title: true, shortName: true } },
    },
  })

  return NextResponse.json({ rubric })
}

// DELETE — delete rubric
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const owned = await loadOwnedRubric(id, user)
  if (!owned) return NextResponse.json({ error: "Rubric not found" }, { status: 404 })
  if ("forbidden" in owned) {
    return NextResponse.json({ error: "Not your rubric" }, { status: 403 })
  }

  // Detach from any assignments referencing this rubric before deletion (rubricId is nullable)
  await db.assignment.updateMany({
    where: { rubricId: id },
    data: { rubricId: null },
  })

  await db.gradingRubric.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
