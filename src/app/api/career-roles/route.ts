import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/career-roles
 * Public - returns all published CareerPathRole entries ordered by `order`.
 *
 * NOTE: The Prisma model is named `CareerPathRole` (not `CareerRole`) to
 * avoid colliding with the pre-existing CareerRole model used by
 * /api/career/roles. The public API contract (`/api/career-roles`) is
 * unchanged.
 */
export async function GET() {
  try {
    const roles = await db.careerPathRole.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
    })

    const data = roles.map((r) => ({
      ...r,
      skillWeights: safeParseObject(r.skillWeights),
      recommendedCerts: safeParseArray(r.recommendedCerts),
      recommendedCourses: safeParseArray(r.recommendedCourses),
      recommendedLabs: safeParseArray(r.recommendedLabs),
    }))

    return NextResponse.json({ careerRoles: data, count: data.length })
  } catch (err) {
    console.error("[api/career-roles] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch career roles" },
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

function safeParseObject(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}
