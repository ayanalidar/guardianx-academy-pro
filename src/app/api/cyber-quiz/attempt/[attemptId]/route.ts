import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { verifyAttemptToken } from "@/lib/link-signing"

export const runtime = "nodejs"

/* GET /api/cyber-quiz/attempt/[attemptId]
 * Returns the attempt's score + domain breakdown - used by the results page +
 * progress report. Does NOT reveal correct answers.
 *
 * AUTH: requires either:
 *   (a) the authenticated user owns the attempt (userId matches), OR
 *   (b) the attempt was a guest attempt AND the request includes the matching
 *       guestEmail as a query param (verified via a magic link the guest
 *       received), OR
 *   (c) the request includes a valid HMAC-signed result token (?t=<token>)
 *       issued in the submit response - see src/lib/link-signing.ts. This
 *       closes the previous TODO: the token is unforgeable without the
 *       server secret and is verified in constant time.
 *
 * Previously this endpoint was fully public, which exposed guestName +
 * guestEmail PII to anyone who could guess/scrape a CUID. CUIDs are not
 * security tokens.
 */
export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) => {
  const { attemptId } = await params

  const attempt = await db.cyberQuizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      difficulty: true,
      score: true,
      totalQuestions: true,
      percentage: true,
      passed: true,
      domainScores: true,
      completedAt: true,
      certificateId: true,
      guestName: true,
      guestEmail: true,
      userId: true,
    },
  })

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
  }

  const currentUser = await getCurrentUser()

  // A valid signed result token is unforgeable proof of ownership.
  const signedAttemptId = verifyAttemptToken(new URL(req.url).searchParams.get("t"))
  const tokenValid = signedAttemptId === attempt.id

  // Case 1: attempt belongs to a logged-in user - must be that user.
  if (attempt.userId) {
    if (!tokenValid && (!currentUser || currentUser.id !== attempt.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } else {
    // Case 2: guest attempt. Accept the signed result token, the guest email
    // query param, or an authenticated admin (for support/debug).
    const claimedEmail = new URL(req.url).searchParams.get("email")?.toLowerCase()
    const emailMatches =
      attempt.guestEmail && claimedEmail === attempt.guestEmail.toLowerCase()
    const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN"
    if (!tokenValid && !emailMatches && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  let domainScores: Record<string, { correct: number; total: number }> = {}
  if (attempt.domainScores) {
    try {
      domainScores = JSON.parse(attempt.domainScores)
    } catch (err) {
      console.error("[cyber-quiz/attempt] malformed domainScores for attempt", attemptId, err)
    }
  }

  // Only expose PII (guestName, guestEmail) to the owner / admin / valid token.
  const canSeePii =
    tokenValid ||
    (currentUser && attempt.userId === currentUser.id) ||
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "SUPER_ADMIN"

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      difficulty: attempt.difficulty,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      passed: attempt.passed,
      domainScores,
      completedAt: attempt.completedAt?.toISOString() || null,
      certificateId: attempt.certificateId,
      guestName: canSeePii ? attempt.guestName : null,
      guestEmail: canSeePii ? attempt.guestEmail : null,
    },
  })
})
