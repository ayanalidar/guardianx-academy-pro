import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const course = await db.course.findUnique({ where: { id }, select: { title: true, shortName: true } })
  if (!course) return NextResponse.json({ batches: [] })

  // Find training batches matching this course's certification
  const batches = await db.trainingBatch.findMany({
    where: {
      published: true,
      OR: [
        { certification: { contains: course.shortName, mode: "insensitive" } },
        { certification: { contains: course.title, mode: "insensitive" } },
      ],
    },
    orderBy: { startDate: "asc" },
    take: 5,
    select: {
      id: true, certification: true, name: true, schedule: true,
      startDate: true, mode: true, instructor: true, seats: true,
      enrolled: true, level: true, status: true, googleFormUrl: true,
    },
  })
  return NextResponse.json({ batches, count: batches.length })
})
