import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/referral/my — auth required.
 * ---------------------------------------------------------------
 * Returns all referrals made by the logged-in user + aggregate
 * stats (total, enrolled, rewarded). Also includes the user's
 * active referral link (most recent PENDING referral, or a new
 * one is materialised on demand via POST /api/referral/create).
 *
 * Response:
 *   {
 *     referrals: [{ id, status, referredEmail, couponCode, createdAt, updatedAt }],
 *     stats: { total, pending, enrolled, rewarded, expired },
 *     referralId: string | null,
 *     referralLink: string | null
 *   }
 */
export const GET = withErrorHandler(async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const referrals = await db.referral.findMany({
    where: { referrerId: currentUser.id },
    orderBy: { createdAt: "desc" },
  })

  const stats = {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "PENDING").length,
    enrolled: referrals.filter((r) => r.status === "ENROLLED").length,
    rewarded: referrals.filter((r) => r.status === "REWARDED").length,
    expired: referrals.filter((r) => r.status === "EXPIRED").length,
  }

  // Surface the most recent PENDING referral link (the shareable one).
  const activeReferral = referrals.find((r) => r.status === "PENDING") ?? null
  const referralLink = activeReferral
    ? `https://academy.guardianx.cloud/?ref=${activeReferral.id}`
    : null

  return NextResponse.json({
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      referredEmail: r.referredEmail,
      referredUserId: r.referredUserId,
      couponCode: r.couponCode,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    stats,
    referralId: activeReferral?.id ?? null,
    referralLink,
  })
})
