import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/skills/[slug]
 * Public - returns a single skill by slug, with its category and related data.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const skill = await db.skill.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    })

    if (!skill) {
      return NextResponse.json(
        { error: "Skill not found" },
        { status: 404 }
      )
    }

    // Look up prerequisite skill records (by slug) so the front-end can render
    // them with their display name + status without a second round trip.
    const prereqSlugs = safeParseArray(skill.prerequisites)
    const prerequisites = prereqSlugs.length
      ? await db.skill.findMany({
          where: { slug: { in: prereqSlugs } },
          select: { slug: true, name: true, difficulty: true, status: true, xp: true },
        })
      : []

    const data = {
      ...skill,
      prerequisites,
      relatedCourses: safeParseArray(skill.relatedCourses),
      relatedLabs: safeParseArray(skill.relatedLabs),
    }

    return NextResponse.json({ skill: data })
  } catch (err) {
    console.error("[api/skills/[slug]] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch skill" },
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
