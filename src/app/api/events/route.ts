import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

// GET /api/events - public. Returns all published events ordered by `order`
// then `startIsoDate`. Supports `?type=workshop|webinar|ctf|...` filtering.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || undefined

    const where: { published: boolean; type?: string } = { published: true }
    if (type && type !== "all" && type.length > 0) {
      where.type = type
    }

    const events = await db.event.findMany({
      where,
      orderBy: [{ order: "asc" }, { startIsoDate: "asc" }],
    })

    return cachedJson({ events, count: events.length }, { sMax: 120, swr: 600 })
  } catch (err) {
    console.error("[api/events] GET failed:", err)
    return NextResponse.json(
      { error: "Failed to load events", events: [], count: 0 },
      { status: 500 },
    )
  }
}
