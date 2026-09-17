import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/batch-leads — ADMIN-only. Returns the latest batch leads
 * across ALL batches (for push notifications). Limited to 5 most recent.
 */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const leads = await db.batchLead.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { batch: { select: { name: true } } },
  })

  return NextResponse.json({ leads })
})
