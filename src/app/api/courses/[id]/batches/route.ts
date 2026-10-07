import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"
import { ensureTable, isDriftError } from "@/lib/db-safe"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";

// GET /api/courses/[id]/batches - upcoming published training batches for a
// course page. Matching strategy (two tiers):
//   1. EXACT - batches explicitly linked to this course via TrainingBatch.
//      courseId (chosen in the Batch Calendar form). This is the reliable path.
//   2. LEGACY FUZZY - batches with NO course link (courseId null) whose
//      free-text certification contains the course's shortName or title.
//      Kept for batches created before the course-link feature; explicitly
//      linked batches never double-match via the fuzzy tier.
export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const course = await db.course.findUnique({ where: { id }, select: { title: true, shortName: true } })
  if (!course) return NextResponse.json({ batches: [] })

  const BATCH_SELECT = {
    id: true, certification: true, name: true, schedule: true,
    startDate: true, mode: true, instructor: true, seats: true,
    enrolled: true, level: true, status: true, googleFormUrl: true,
  } as const

  // Tier 1+2 combined - references the courseId column, which may not exist
  // yet on a database that predates the course-link feature. Self-heal first
  // (memoized per instance), and fall back to the legacy fuzzy-only query if
  // the column genuinely cannot be added - the public course page must never
  // 500 over batch listing.
  await ensureTable("TrainingBatch")

  const fetchWithCourseLink = () =>
    db.trainingBatch.findMany({
      where: {
        published: true,
        OR: [
          { courseId: id },
          {
            AND: [
              { courseId: null },
              {
                OR: [
                  ...(course.shortName
                    ? [{ certification: { contains: course.shortName, mode: "insensitive" as const } }]
                    : []),
                  { certification: { contains: course.title, mode: "insensitive" as const } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: BATCH_SELECT,
    })

  // Legacy shape (pre-course-link): fuzzy text match only, no courseId filter.
  const fetchLegacyOnly = () =>
    db.trainingBatch.findMany({
      where: {
        published: true,
        OR: [
          ...(course.shortName
            ? [{ certification: { contains: course.shortName, mode: "insensitive" as const } }]
            : []),
          { certification: { contains: course.title, mode: "insensitive" as const } },
        ],
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: BATCH_SELECT,
    })

  let batches
  try {
    batches = await fetchWithCourseLink()
  } catch (e) {
    if (isDriftError(e)) {
      // Force the self-heal, then retry once; if it still fails, degrade to
      // the legacy query that never touches the new column.
      try {
        await ensureTable("TrainingBatch", true)
        batches = await fetchWithCourseLink()
      } catch {
        batches = await fetchLegacyOnly()
      }
    } else {
      throw e
    }
  }

  return NextResponse.json({ batches, count: batches.length })
})
