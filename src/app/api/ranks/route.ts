import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

/**
 * GET /api/ranks
 * Public — returns all 8 rank tiers ordered by level.
 */
export async function GET() {
  try {
    const ranks = await db.rank.findMany({
      orderBy: { level: "asc" },
    })

    return cachedJson({ ranks, count: ranks.length }, { sMax: 120, swr: 600 })
  } catch (err) {
    console.error("[api/ranks] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch ranks" },
      { status: 500 }
    )
  }
}
