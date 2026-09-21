import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureTable } from "@/lib/db-safe"
import { COURSE_LIST_FIELDS, normalizeCourseListInput } from "@/lib/course-lists"

// PATCH /api/admin/courses/[id] - update any course field (incl. published toggle)
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    const existing = await db.course.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const {
      title, shortName, slug, description, longDescription,
      category, level, durationHours, price, color, tags, certBody,
      thumbnail, published, instructorId,
    } = body as Record<string, unknown>

    // Course extras lists - accepted as arrays, newline text, or stored JSON.
    const extrasData: Record<string, string> = {}
    for (const { key } of COURSE_LIST_FIELDS) {
      if ((body as Record<string, unknown>)[key] !== undefined) {
        extrasData[key] = normalizeCourseListInput((body as Record<string, unknown>)[key])
      }
    }

    // slug uniqueness check (if changing)
    let finalSlug: string | undefined
    if (slug && slug !== existing.slug) {
      const conflict = await db.course.findUnique({ where: { slug: String(slug) } })
      if (conflict && conflict.id !== id) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 400 })
      }
      finalSlug = String(slug)
    }

    // Validate instructor change
    let finalInstructorId: string | undefined
    if (instructorId !== undefined) {
      const ins = await db.user.findUnique({ where: { id: String(instructorId) } })
      if (!ins) return NextResponse.json({ error: "Instructor not found" }, { status: 400 })
      if (ins.role !== "INSTRUCTOR" && ins.role !== "ADMIN") {
        return NextResponse.json({ error: "User is not an instructor" }, { status: 400 })
      }
      finalInstructorId = String(instructorId)
    }

    // Self-heal: sync the Course table to the current schema before the
    // update (extras columns may be missing on drifted databases).
    await ensureTable("Course")

    const updated = await db.course.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(shortName !== undefined && { shortName: String(shortName).trim().toUpperCase() }),
        ...(finalSlug !== undefined && { slug: finalSlug }),
        ...(description !== undefined && { description: String(description) }),
        ...(longDescription !== undefined && { longDescription: String(longDescription) }),
        ...(category !== undefined && { category: String(category) }),
        ...(level !== undefined && { level: String(level) }),
        ...(durationHours !== undefined && { durationHours: Number(durationHours) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(color !== undefined && { color: String(color) }),
        ...(tags !== undefined && { tags: String(tags) }),
        ...(certBody !== undefined && { certBody: certBody ? String(certBody) : null }),
        ...(thumbnail !== undefined && { thumbnail: thumbnail ? String(thumbnail) : null }),
        ...(published !== undefined && { published: !!published }),
        ...(finalInstructorId !== undefined && { instructorId: finalInstructorId }),
        ...extrasData,
      },
      include: {
        instructor: { select: { id: true, name: true, title: true } },
      },
    })

    await logAction(
      user.id,
      user.name,
      "course.update",
      "Course",
      id,
      { before: { title: existing.title, published: existing.published }, after: { title: updated.title, published: updated.published } },
    )

    return NextResponse.json({ course: updated })
  },
)

// DELETE /api/admin/courses/[id] - cascade delete
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    const existing = await db.course.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 })

    await db.course.delete({ where: { id } })

    await logAction(
      user.id,
      user.name,
      "course.delete",
      "Course",
      id,
      { slug: existing.slug, title: existing.title },
    )

    return NextResponse.json({ ok: true })
  },
)
