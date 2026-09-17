import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/affiliates — ADMIN only.
 * Returns all affiliate records with the linked user's name/email + stats.
 * Sorted by createdAt desc (newest affiliates first). */
export const GET = withErrorHandler(async () => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const affiliates = await db.affiliate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      _count: {
        select: { clicksLog: true },
      },
    },
  })

  // Aggregate totals for a quick admin summary strip
  const totals = affiliates.reduce(
    (acc, a) => ({
      clicks: acc.clicks + a.clicks,
      signups: acc.signups + a.signups,
      conversions: acc.conversions + a.conversions,
      earnings: acc.earnings + a.earnings,
    }),
    { clicks: 0, signups: 0, conversions: 0, earnings: 0 },
  )

  return NextResponse.json({
    affiliates: affiliates.map((a) => ({
      id: a.id,
      userId: a.userId,
      code: a.code,
      commissionRate: a.commissionRate,
      clicks: a.clicks,
      signups: a.signups,
      conversions: a.conversions,
      earnings: a.earnings,
      active: a.active,
      createdAt: a.createdAt,
      user: a.user,
      clickLogCount: a._count.clicksLog,
    })),
    totals,
    count: affiliates.length,
  })
})
