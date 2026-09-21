import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/skills
 * Public - returns all skill categories with their skills, ordered.
 */
export async function GET() {
  try {
    const categories = await db.skillCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        skills: {
          orderBy: { order: "asc" },
        },
      },
    })

    const data = categories.map((c) => ({
      ...c,
      skills: c.skills.map((s) => ({
        ...s,
        prerequisites: safeParseArray(s.prerequisites),
        relatedCourses: safeParseArray(s.relatedCourses),
        relatedLabs: safeParseArray(s.relatedLabs),
      })),
    }))

    return NextResponse.json({
      categories: data,
      count: data.length,
      skillCount: data.reduce((acc, c) => acc + c.skills.length, 0),
    })
  } catch (err) {
    console.error("[api/skills] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch skill tree" },
      { status: 500 }
    )
  }
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
