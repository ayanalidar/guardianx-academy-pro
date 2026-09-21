import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// CTF Teams - create & list for a competition
// GET:  ?competitionId=... → list teams
// POST: { competitionId, name } → create team (caller becomes captain)
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const competitionId = searchParams.get("competitionId")
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!competitionId) return NextResponse.json({ error: "competitionId required" }, { status: 400 })

  const teams = await db.cTFTeam.findMany({
    where: { competitionId },
    orderBy: { score: "desc" },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  })

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      memberCount: t.members.length,
      isMember: t.members.some((m) => m.userId === user.id),
      members: t.members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        avatar: m.user.avatar,
        role: m.role,
      })),
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { competitionId, name } = body
  if (!competitionId || !name?.trim()) {
    return NextResponse.json({ error: "competitionId and team name required" }, { status: 400 })
  }

  const comp = await db.cTFCompetition.findUnique({ where: { id: competitionId } })
  if (!comp) return NextResponse.json({ error: "Competition not found" }, { status: 404 })
  if (comp.status === "ended") {
    return NextResponse.json({ error: "Competition has ended" }, { status: 400 })
  }

  // Prevent being captain of two teams in the same comp
  const existing = await db.cTFTeamMember.findFirst({
    where: { userId: user.id, team: { competitionId } },
  })
  if (existing) {
    return NextResponse.json({ error: "You already belong to a team in this competition" }, { status: 400 })
  }

  const teamCount = await db.cTFTeam.count({ where: { competitionId } })
  if (teamCount >= comp.maxTeams) {
    return NextResponse.json({ error: "Team limit reached for this competition" }, { status: 400 })
  }

  try {
    const team = await db.cTFTeam.create({
      data: {
        competitionId,
        name: name.trim(),
        captainId: user.id,
        members: {
          create: { userId: user.id, role: "captain" },
        },
      },
      include: { members: true },
    })
    return NextResponse.json({ team }, { status: 201 })
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Team name already taken in this competition" }, { status: 409 })
    }
    throw err
  }
}
