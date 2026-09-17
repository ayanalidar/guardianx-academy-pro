import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, title: true, instructorId: true, prerequisiteIds: true },
  })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (user.role !== "ADMIN" && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ids = course.prerequisiteIds
    ? course.prerequisiteIds.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  const prerequisites =
    ids.length > 0
      ? await db.course.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            title: true,
            shortName: true,
            level: true,
            thumbnail: true,
            color: true,
          },
        })
      : []

  // Also return candidate prerequisites — other courses owned by the instructor
  // (or all courses for admins) so the UI can present a picker.
  const candidates = await db.course.findMany({
    where: {
      id: { not: id },
      ...(user.role === "ADMIN" ? {} : { instructorId: user.id }),
    },
    select: {
      id: true,
      title: true,
      shortName: true,
      level: true,
      thumbnail: true,
      color: true,
    },
    orderBy: { title: "asc" },
    take: 100,
  })

  return NextResponse.json({ prerequisites, candidates })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (user.role !== "ADMIN" && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const raw: unknown = body.prerequisiteIds
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "prerequisiteIds must be an array of strings" },
      { status: 400 }
    )
  }

  // Disallow self-reference + dedupe
  const cleaned = Array.from(
    new Set(raw.map((s) => String(s).trim()).filter((s) => s && s !== id))
  )

  // Validate that all referenced courses exist
  if (cleaned.length > 0) {
    const validCount = await db.course.count({ where: { id: { in: cleaned } } })
    if (validCount !== cleaned.length) {
      return NextResponse.json(
        { error: "One or more prerequisite course IDs are invalid" },
        { status: 400 }
      )
    }
  }

  const updated = await db.course.update({
    where: { id },
    data: { prerequisiteIds: cleaned.join(",") },
    select: { id: true, prerequisiteIds: true },
  })

  return NextResponse.json({ course: updated, prerequisiteIds: cleaned })
}
