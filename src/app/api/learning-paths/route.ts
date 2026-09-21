import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

/**
 * GET /api/learning-paths
 * Public - returns all published learning paths ordered by `order`.
 */
export async function GET() {
  try {
    const paths = await db.learningPath.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
    })

    const data = paths.map((p) => ({
      ...p,
      skills: safeParseArray(p.skills),
      courses: safeParseArray(p.courses),
    }))

    return cachedJson({ learningPaths: data, count: data.length }, { sMax: 120, swr: 600 })
  } catch (err) {
    console.error("[api/learning-paths] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch learning paths" },
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
