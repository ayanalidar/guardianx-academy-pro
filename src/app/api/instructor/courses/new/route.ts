import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Create a new course (instructor + admin only)
export async function POST(req: NextRequest) {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

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
  const existing = await db.course.findUnique({ where: { slug: finalSlug } })
  if (existing) {
    finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`
  }

  const course = await db.course.create({
    data: {
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
    },
  })

  return NextResponse.json({ course })
}
