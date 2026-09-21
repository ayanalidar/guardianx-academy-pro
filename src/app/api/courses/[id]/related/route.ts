import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const course = await db.course.findUnique({ where: { id }, select: { category: true, id: true, level: true } })
  if (!course) return NextResponse.json({ courses: [] })

  // Same-category courses first; when a category holds only one or two
  // courses the section used to render a single oversized card - top up
  // with other published courses so viewers always see a full row.
  const TARGET = 8
  const fetchRelated = async (select: any, orderBy: any) => {
    const sameCategory = await db.course.findMany({
      where: { published: true, category: course.category, id: { not: id } },
      take: TARGET,
      orderBy,
      select,
    })
    if (sameCategory.length >= TARGET) return sameCategory
    const excludeIds = [id, ...sameCategory.map((c: any) => c.id)]
    const others = await db.course.findMany({
      where: { published: true, id: { notIn: excludeIds } },
      take: TARGET - sameCategory.length,
      orderBy,
      select,
    })
    return [...sameCategory, ...others]
  }

  // Full select (rating/studentsCount/instructor) requires the current
  // schema - degrade to core columns on drifted databases instead of 500.
  try {
    const related = await fetchRelated(
      {
        id: true, slug: true, title: true, shortName: true, description: true,
        category: true, level: true, durationHours: true, rating: true,
        studentsCount: true, color: true, thumbnail: true,
        instructor: { select: { name: true, title: true } },
      },
      { rating: "desc" },
    )
    return NextResponse.json({ courses: related, count: related.length })
  } catch {
    // Core-columns fallback - every historical schema version has these.
    const related = await fetchRelated(
      {
        id: true, slug: true, title: true, shortName: true, description: true,
        category: true, level: true, price: true,
      },
      { createdAt: "desc" },
    )
    return NextResponse.json({ courses: related, count: related.length, degraded: true })
  }
})
