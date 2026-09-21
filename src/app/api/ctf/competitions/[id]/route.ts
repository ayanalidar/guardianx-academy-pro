import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// CTF Competition detail - challenges + live leaderboard
// GET: competition with challenges + teams ranked
// ============================================================

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const comp = await db.cTFCompetition.findUnique({
    where: { id },
    include: {
      challenges: { orderBy: [{ category: "asc" }, { points: "asc" }] },
      teams: {
        orderBy: { score: "desc" },
        include: {
          members: { select: { userId: true, role: true, user: { select: { id: true, name: true, avatar: true } } } },
        },
      },
    },
  })

  if (!comp) return NextResponse.json({ error: "Competition not found" }, { status: 404 })

  // Find my team (if any) + solved challenges by my team
  const myTeam = comp.teams.find((t) => t.members.some((m) => m.userId === user.id))
  let mySolved: string[] = []
  if (myTeam) {
    const subs = await db.cTFSubmission.findMany({
      where: { teamId: myTeam.id, correct: true },
      select: { challengeId: true },
    })
    mySolved = subs.map((s) => s.challengeId)
  }

  // Rank teams by score desc
  const leaderboard = comp.teams
    .map((t, i) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      rank: i + 1,
      memberCount: t.members.length,
      captainName: t.members.find((m) => m.role === "captain")?.user.name ?? t.members[0]?.user.name ?? " - ",
      isMine: t.id === myTeam?.id,
    }))

  return NextResponse.json({
    competition: {
      id: comp.id,
      title: comp.title,
      description: comp.description,
      format: comp.format,
      startAt: comp.startAt,
      endAt: comp.endAt,
      maxTeams: comp.maxTeams,
      teamSize: comp.teamSize,
      status: comp.status,
      prizes: comp.prizes,
    },
    challenges: comp.challenges.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      points: c.points,
      hint: mySolved.includes(c.id) ? c.hint : null,
      solveCount: c.solveCount,
      order: c.order,
      solvedByMe: mySolved.includes(c.id),
    })),
    myTeam: myTeam
      ? {
          id: myTeam.id,
          name: myTeam.name,
          score: myTeam.score,
          members: myTeam.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            avatar: m.user.avatar,
            role: m.role,
          })),
        }
      : null,
    leaderboard,
  })
}
