import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

/**
 * GET /api/courses/[id]/next-session
 *
 * Public: returns the next upcoming live session for a course so the
 * course page can render a "next live class" countdown (D2). No auth -
 * visitors should see the countdown before enrolling. Fail-open: any
 * DB error returns { session: null } so the page never breaks.
 *
 * Edge-cached briefly - the client computes the live ticking countdown
 * from the absolute scheduledAt, so short caching is safe.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session: any = null
  try {
    const row = await db.liveSession.findFirst({
      where: {
        courseId: id,
        scheduledAt: { gte: new Date() },
        status: { in: ["scheduled", "live"] },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        scheduledAt: true,
        maxStudents: true,
        host: { select: { name: true, title: true, avatar: true } },
        _count: { select: { members: true } },
      },
    })
    if (row) {
      session = {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        scheduledAt: row.scheduledAt,
        maxStudents: row.maxStudents,
        seatsTaken: row._count?.members ?? 0,
        host: row.host,
      }
    }
  } catch {
    session = null
  }

  return cachedJson({ session }, { sMax: 120, swr: 600 })
}
