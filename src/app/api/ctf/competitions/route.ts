import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// CTF Competition Platform - list & create
// GET: list competitions (auto-seeds 3 if empty)
// POST: create competition (admin only)
// ============================================================

async function seedCompetitions() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } })
  const organizerId = admin?.id ?? (await db.user.findFirst())?.id
  if (!organizerId) return

  const now = new Date()
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  const comps = [
    {
      title: "GuardianX Spring CTF 2025",
      description:
        "Our flagship jeopardy-style competition. Six categories, 24 challenges, top teams win cash prizes and GuardianX Pro memberships.",
      format: "jeopardy",
      startAt: inDays(7),
      endAt: inDays(9),
      maxTeams: 64,
      teamSize: 4,
      status: "upcoming",
      prizes: "$5,000 + Pro memberships",
    },
    {
      title: "Cyber Friday Sprint #42",
      description:
        "A 4-hour sprint CTF - fast, focused, beginner-friendly. Perfect warm-up before the season championship.",
      format: "jeopardy",
      startAt: inDays(-1),
      endAt: inDays(0),
      maxTeams: 32,
      teamSize: 3,
      status: "live",
      prizes: "$500 + seasonal badges",
    },
    {
      title: "Inter-University Championship 2025",
      description:
        "Collegiate cybersecurity championship. Top universities across India compete for the GuardianX trophy and recruiter attention.",
      format: "attack-defense",
      startAt: inDays(-30),
      endAt: inDays(-29),
      maxTeams: 48,
      teamSize: 5,
      status: "ended",
      prizes: "Trophy + recruiter showcases",
    },
  ]

  for (const c of comps) {
    const comp = await db.cTFCompetition.create({
      data: { ...c, organizerId },
    })

    const challenges = [
      {
        title: "SQL Injection 101",
        description: "A simple login form leaks data when given a malicious payload. Capture the admin flag.",
        category: "web",
        difficulty: "easy",
        points: 100,
        flag: `FLAG{sql_inject_${comp.id.slice(-4)}}`,
        hint: "Try ' OR 1=1 --",
        order: 1,
      },
      {
        title: "Base64 Vault",
        description: "A secret is stored in a base64-encoded blob. Decode it to reveal the flag.",
        category: "crypto",
        difficulty: "easy",
        points: 150,
        flag: `FLAG{b64_decoded_${comp.id.slice(-4)}}`,
        hint: "echo '<blob>' | base64 -d",
        order: 2,
      },
      {
        title: "Packet Capture Trail",
        description: "A .pcap file holds a suspicious HTTP exchange. Find the leaked flag in the traffic.",
        category: "forensics",
        difficulty: "medium",
        points: 250,
        flag: `FLAG{pcap_trail_${comp.id.slice(-4)}}`,
        hint: "Filter by http.request.uri",
        order: 3,
      },
      {
        title: "Buffer Overflow Warmup",
        description: "Classic stack-based buffer overflow. Overwrite the return address to call win().",
        category: "pwn",
        difficulty: "hard",
        points: 400,
        flag: `FLAG{bof_win_${comp.id.slice(-4)}}`,
        hint: "Find the offset to EIP with pattern_create.",
        order: 4,
      },
    ]

    for (const ch of challenges) {
      await db.cTFChallenge.create({ data: { ...ch, competitionId: comp.id } })
    }
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const count = await db.cTFCompetition.count()
  if (count === 0) await seedCompetitions()

  const competitions = await db.cTFCompetition.findMany({
    orderBy: { startAt: "desc" },
    include: { _count: { select: { challenges: true, teams: true } } },
  })

  const myTeams = await db.cTFTeamMember.findMany({
    where: { userId: user.id },
    select: { team: { select: { id: true, competitionId: true, name: true } } },
  })
  const myTeamMap = new Map(myTeams.map((m) => [m.team.competitionId, m.team]))

  return NextResponse.json({
    competitions: competitions.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      format: c.format,
      startAt: c.startAt,
      endAt: c.endAt,
      maxTeams: c.maxTeams,
      teamSize: c.teamSize,
      status: c.status,
      prizes: c.prizes,
      challengeCount: c._count.challenges,
      teamCount: c._count.teams,
      myTeam: myTeamMap.get(c.id) ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, format, startAt, endAt, maxTeams, teamSize, prizes } = body
  if (!title || !description || !startAt || !endAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const comp = await db.cTFCompetition.create({
    data: {
      title,
      description,
      format: format ?? "jeopardy",
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      maxTeams: maxTeams ?? 50,
      teamSize: teamSize ?? 4,
      status: "upcoming",
      prizes: prizes ?? "",
      organizerId: user.id,
    },
  })

  return NextResponse.json({ competition: comp }, { status: 201 })
}
