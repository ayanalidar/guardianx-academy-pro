import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/career-roles/[slug]
 * Public - returns a single CareerPathRole by slug.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const role = await db.careerPathRole.findUnique({
      where: { slug },
    })

    if (!role || !role.published) {
      return NextResponse.json(
        { error: "Career role not found" },
        { status: 404 }
      )
    }

    const data = {
      ...role,
      skillWeights: safeParseObject(role.skillWeights),
      recommendedCerts: safeParseArray(role.recommendedCerts),
      recommendedCourses: safeParseArray(role.recommendedCourses),
      recommendedLabs: safeParseArray(role.recommendedLabs),
    }

    return NextResponse.json({ careerRole: data })
  } catch (err) {
    console.error("[api/career-roles/[slug]] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch career role" },
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
