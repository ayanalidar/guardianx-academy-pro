import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

// GET /api/training-batches — public list of all published training batches.
// No auth required. Returns all fields ordered by `order` then `startDate`.
export const GET = withErrorHandler(async () => {
  const batches = await db.trainingBatch.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { startDate: "asc" }],
  })

  return cachedJson({ batches, count: batches.length }, { sMax: 120, swr: 600 })
})
