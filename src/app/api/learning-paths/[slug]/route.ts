import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/learning-paths/[slug]
 * Public - returns a single learning path by slug.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const path = await db.learningPath.findUnique({
      where: { slug },
    })

    if (!path || !path.published) {
      return NextResponse.json(
        { error: "Learning path not found" },
        { status: 404 }
      )
    }

    const data = {
      ...path,
      skills: safeParseArray(path.skills),
      courses: safeParseArray(path.courses),
    }

    return NextResponse.json({ learningPath: data })
  } catch (err) {
    console.error("[api/learning-paths/[slug]] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch learning path" },
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
