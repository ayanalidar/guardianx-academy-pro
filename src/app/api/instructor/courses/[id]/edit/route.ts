import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Update a course (instructor only - must own the course)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({ where: { id }, select: { instructorId: true, slug: true } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json()
  const {
    title, shortName, slug, description, longDescription,
    category, level, durationHours, price, color, tags, certBody,
    thumbnail, published,
  } = body

  // slug uniqueness check (if changing)
  let finalSlug: string | undefined
  if (slug && slug !== course.slug) {
    const existing = await db.course.findUnique({ where: { slug } })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 })
    }
    finalSlug = slug
  }

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
    },
  })

  return NextResponse.json({ course: updated })
}

// Delete a course
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({ where: { id }, select: { instructorId: true, title: true } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  await db.course.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
