import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

// GET /api/events/[slug] - public. Returns a single published event by slug
// plus 3 related events of the same type (for the detail page's
// "Related events" section).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const event = await db.event.findUnique({ where: { slug } })

    if (!event || !event.published) {
      return NextResponse.json(
        { error: "Event not found", event: null, related: [] },
        { status: 404 },
      )
    }

    const related = await db.event.findMany({
      where: {
        published: true,
        type: event.type,
        slug: { not: slug },
      },
      orderBy: [{ order: "asc" }, { startIsoDate: "asc" }],
      take: 3,
    })

    return NextResponse.json({ event, related })
  } catch (err) {
    console.error(`[api/events/${slug}] GET failed:`, err)
    return NextResponse.json(
      { error: "Failed to load event", event: null, related: [] },
      { status: 500 },
    )
  }
}
