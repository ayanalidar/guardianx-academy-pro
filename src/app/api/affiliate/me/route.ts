import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/affiliate/me - auth required.
 * Returns the current user's affiliate record + recent click activity.
 * Returns { affiliate: null } if the user is not yet an affiliate. */
export const GET = withErrorHandler(async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const affiliate = await db.affiliate.findUnique({
    where: { userId: currentUser.id },
    include: {
      clicksLog: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!affiliate) {
    return NextResponse.json({ affiliate: null })
  }

  // Compute conversion rate from existing counters
  const conversionRate =
    affiliate.clicks > 0
      ? Number(((affiliate.conversions / affiliate.clicks) * 100).toFixed(2))
      : 0

  return NextResponse.json({
    affiliate: {
      id: affiliate.id,
      userId: affiliate.userId,
      code: affiliate.code,
      commissionRate: affiliate.commissionRate,
      clicks: affiliate.clicks,
      signups: affiliate.signups,
      conversions: affiliate.conversions,
      earnings: affiliate.earnings,
      active: affiliate.active,
      createdAt: affiliate.createdAt,
      conversionRate,
      recentClicks: affiliate.clicksLog.map((c) => ({
        id: c.id,
        ip: c.ip,
        userAgent: c.userAgent,
        courseId: c.courseId,
        createdAt: c.createdAt,
      })),
    },
  })
})
