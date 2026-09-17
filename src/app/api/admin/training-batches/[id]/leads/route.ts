import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/training-batches/[id]/leads
 * ADMIN-only. Returns all leads for a specific batch.
 *
 * Query: status? (New | Contacted | Qualified | Enrolled | Lost)
 */
export const GET = withErrorHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const url = new URL(req.url)
  const status = url.searchParams.get("status")

  const where: any = { batchId: id }
  if (status && ["New", "Contacted", "Qualified", "Enrolled", "Lost"].includes(status)) {
    where.status = status
  }

  const [leads, byStatus] = await Promise.all([
    db.batchLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    db.batchLead.groupBy({
      by: ["status"],
      where: { batchId: id },
      _count: true,
    }),
  ])

  const statusCounts: Record<string, number> = {
    New: 0, Contacted: 0, Qualified: 0, Enrolled: 0, Lost: 0,
  }
  for (const s of byStatus) statusCounts[s.status] = s._count

  return NextResponse.json({ leads, count: leads.length, byStatus: statusCounts })
})
