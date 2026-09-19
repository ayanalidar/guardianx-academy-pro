import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const course = await db.course.findUnique({ where: { id }, select: { category: true, id: true, level: true } })
  if (!course) return NextResponse.json({ courses: [] })

  // Full select (rating/studentsCount/instructor) requires the current
  // schema — degrade to core columns on drifted databases instead of 500.
  try {
    const related = await db.course.findMany({
      where: {
        published: true,
        category: course.category,
        id: { not: id },
      },
      take: 6,
      orderBy: { rating: "desc" },
      select: {
        id: true, slug: true, title: true, shortName: true, description: true,
        category: true, level: true, durationHours: true, rating: true,
        studentsCount: true, color: true, thumbnail: true,
        instructor: { select: { name: true, title: true } },
      },
    })
    return NextResponse.json({ courses: related, count: related.length })
  } catch {
    // Core-columns fallback — every historical schema version has these.
    const related = await db.course.findMany({
      where: {
        published: true,
        category: course.category,
        id: { not: id },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, title: true, shortName: true, description: true,
        category: true, level: true, price: true,
      },
    })
    return NextResponse.json({ courses: related, count: related.length, degraded: true })
  }
})
