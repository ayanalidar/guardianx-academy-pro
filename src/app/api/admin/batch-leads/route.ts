import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/batch-leads - ADMIN-only. Lists BatchLead rows.
 *
 * Modes:
 *   - No params: legacy behavior - 5 most recent (used by push notifications).
 *   - ?batchId=<id>&status=<s>&limit=<n>: Leads Hub listing across all
 *     batches or one batch, with the batch name included, newest first.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const sp = new URL(req.url).searchParams
  const batchId = sp.get("batchId")
  const status = sp.get("status")
  const limitParam = Number(sp.get("limit") || "0")

  // Legacy behavior (no params): latest 5 for push notifications.
  if (!batchId && !status && !limitParam) {
    const leads = await db.batchLead.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { batch: { select: { name: true } } },
    })
    return NextResponse.json({ leads })
  }

  const take = Math.min(Math.max(limitParam || 200, 1), 500)
  const leads = await db.batchLead.findMany({
    where: {
      ...(batchId ? { batchId } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: { batch: { select: { name: true, certification: true } } },
  })

  return NextResponse.json({ leads, count: leads.length })
})
