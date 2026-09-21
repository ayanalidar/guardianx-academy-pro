import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// CTF Flag Submission
// POST: { challengeId, flag } → checks correctness, awards points,
//       increments solve count, returns { correct, score, message }
// ============================================================

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { challengeId, flag } = body
  if (!challengeId || !flag?.trim()) {
    return NextResponse.json({ error: "challengeId and flag required" }, { status: 400 })
  }

  const challenge = await db.cTFChallenge.findUnique({
    where: { id: challengeId },
    include: { competition: true },
  })
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  if (challenge.competition.status === "ended") {
    return NextResponse.json({ error: "Competition has ended" }, { status: 400 })
  }

  // Find user's team in this competition
  const membership = await db.cTFTeamMember.findFirst({
    where: { userId: user.id, team: { competitionId: challenge.competitionId } },
    include: { team: true },
  })
  if (!membership) {
    return NextResponse.json({ error: "You must join a team first" }, { status: 400 })
  }

  const submittedFlag = flag.trim()
  const correct = submittedFlag === challenge.flag

  // Always record the submission
  await db.cTFSubmission.create({
    data: {
      challengeId,
      teamId: membership.team.id,
      flag: submittedFlag,
      correct,
    },
  })

  if (!correct) {
    return NextResponse.json({
      correct: false,
      message: "Incorrect flag. Try again.",
      score: membership.team.score,
    })
  }

  // Check if team already solved (avoid double-scoring)
  const priorSolve = await db.cTFSubmission.findFirst({
    where: { challengeId, teamId: membership.team.id, correct: true, NOT: { id: "" } },
    orderBy: { submittedAt: "asc" },
  })

  // Find any correct submission by this team for the challenge (excluding the one we just made)
  const allCorrect = await db.cTFSubmission.findMany({
    where: { challengeId, teamId: membership.team.id, correct: true },
    orderBy: { submittedAt: "asc" },
  })

  // If this is the first correct solve, award points
  if (allCorrect.length === 1) {
    const updated = await db.cTFTeam.update({
      where: { id: membership.team.id },
      data: { score: { increment: challenge.points } },
    })
    await db.cTFChallenge.update({
      where: { id: challengeId },
      data: { solveCount: { increment: 1 } },
    })
    return NextResponse.json({
      correct: true,
      message: `Flag accepted! +${challenge.points} points`,
      score: updated.score,
    })
  }

  return NextResponse.json({
    correct: true,
    message: "Already solved - no additional points awarded.",
    score: membership.team.score,
  })
}
