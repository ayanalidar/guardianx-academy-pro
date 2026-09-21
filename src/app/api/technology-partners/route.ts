import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

/**
 * GET /api/technology-partners
 * Public - returns all published technology partners ordered by `order`.
 */
export async function GET() {
  try {
    const partners = await db.technologyPartner.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
    })

    return cachedJson(
      { partners, count: partners.length },
      { sMax: 120, swr: 600 }
    )
  } catch (err) {
    console.error("[api/technology-partners] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch technology partners" },
      { status: 500 }
    )
  }
}
