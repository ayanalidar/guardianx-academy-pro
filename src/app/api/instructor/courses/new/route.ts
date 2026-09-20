import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { ensureTable, filterToColumns, getTableColumns, isDriftError } from "@/lib/db-safe"

// Create a new course (instructor + admin only)
export async function POST(req: NextRequest) {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  try {
    const body = await req.json()
    const {
      title, shortName, slug, description, longDescription,
      category, level, durationHours, price, color, tags, certBody,
      thumbnail, published,
    } = body

    if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })
    if (!shortName?.trim()) return NextResponse.json({ error: "Short name required" }, { status: 400 })

    // auto-generate slug if not provided
    let finalSlug = slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    // ensure unique slug
    const existing = await db.course.findUnique({ where: { slug: finalSlug }, select: { id: true } })
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`
    }

    const wanted = {
      title: title.trim(),
      shortName: shortName.trim().toUpperCase(),
      slug: finalSlug,
      description: description || "",
      longDescription: longDescription || description || "",
      category: category || "Ethical Hacking",
      level: level || "Beginner",
      durationHours: Number(durationHours) || 40,
      price: Number(price) || 0,
      color: color || "emerald",
      tags: tags || "",
      certBody: certBody || null,
      thumbnail: thumbnail || null,
      published: published !== undefined ? !!published : true,
      instructorId: user.id,
    }

    // Drift-resilient create: on databases predating a schema change
    // (e.g. missing longDescription / instructorId / thumbnail columns) a
    // full-model create throws P2022 and the dashboard showed a raw
    // "Internal Server Error". Sync the table to the current schema first,
    // then write (with a column-filtered fallback as belt-and-braces).
    await ensureTable("Course")
    const cols = await getTableColumns("Course")
    let course: any
    try {
      course = await db.course.create({ data: wanted as any })
    } catch (e) {
      if (!isDriftError(e)) throw e
      const data = await filterToColumns("Course", wanted as Record<string, unknown>)
      course = await db.course.create({ data: data as any })
      // Best-effort instructor stamp when the column appeared mid-flight.
      if (cols.has("instructorId") && !(data as any).instructorId) {
        try {
          course = await db.course.update({ where: { id: course.id }, data: { instructorId: user.id } })
        } catch {}
      }
    }

    return NextResponse.json({ course })
  } catch (e: any) {
    console.error("[instructor/courses/new]", e)
    return NextResponse.json(
      { error: e?.message || "Failed to create course" },
      { status: 500 }
    )
  }
}
