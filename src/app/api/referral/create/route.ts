import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

const REFERRAL_LINK_BASE = "https://academy.guardianx.cloud"

/* POST /api/referral/create - auth required.
 * ---------------------------------------------------------------
 * Idempotently returns the logged-in student's active referral.
 * - If the student already has a PENDING referral, reuse it.
 * - Otherwise create a new Referral row (status = PENDING).
 *
 * Response: { referralId, referralLink }
 */
export const POST = withErrorHandler(async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Reuse the most recent PENDING referral (avoids link spam).
  let referral = await db.referral.findFirst({
    where: { referrerId: currentUser.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })

  if (!referral) {
    referral = await db.referral.create({
      data: { referrerId: currentUser.id },
    })
  }

  return NextResponse.json({
    referralId: referral.id,
    referralLink: `${REFERRAL_LINK_BASE}/?ref=${referral.id}`,
  })
})
