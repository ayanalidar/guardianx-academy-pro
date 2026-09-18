import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/* GET /api/training-batches/[slug]
 * Public — returns a single published batch by slug.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    // NOTE: TrainingBatch has no slug field — the URL param is the batch id.
    const batch = await db.trainingBatch.findUnique({ where: { id: slug } })
    if (!batch || !batch.published) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }
    return NextResponse.json({ batch })
  } catch (err) {
    console.error("[api/training-batches/[slug]] error:", err)
    return NextResponse.json({ error: "Failed to fetch batch" }, { status: 500 })
  }
}
