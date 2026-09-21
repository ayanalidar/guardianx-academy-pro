import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Weekly Challenges
// GET:  ?history=true → list past; default → active challenge
// POST: { challengeId, flag } → submit flag
// ============================================================

async function seedWeeklyChallenge() {
  const now = new Date()
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  await db.weeklyChallenge.create({
    data: {
      title: "Week 18 - SSRF via PDF Renderer",
      description:
        "A document-conversion service exposes an internal endpoint that fetches URLs server-side. Pivot through it to access the metadata service and recover the secret flag.\n\nTarget: https://labs.academy.guardianx.cloud/weekly-18\nCategory: Server-Side Request Forgery\nDifficulty: Medium",
      category: "web",
      difficulty: "medium",
      flag: "FLAG{weekly_ssrf_169_254_169_254}",
      points: 500,
      hint: "AWS metadata endpoint at 169.254.169.254/latest/meta-data/. Once you reach IMDSv1, look at iam/security-credentials/.",
      startAt: now,
      endAt: inDays(7),
      isActive: true,
    },
  })

  // Also create a couple of past challenges for the history view
  await db.weeklyChallenge.create({
    data: {
      title: "Week 17 - JWT Algorithm Confusion",
      description:
        "A REST API accepts JWTs signed with either RS256 or HS256. Exploit the algorithm confusion attack to forge an admin token and capture the flag.",
      category: "crypto",
      difficulty: "hard",
      flag: "FLAG{weekly_jwt_alg_confusion}",
      points: 750,
      hint: "Convert the server's RSA public key to HMAC secret - many libraries accept this.",
      startAt: inDays(-14),
      endAt: inDays(-7),
      isActive: false,
    },
  })

  await db.weeklyChallenge.create({
    data: {
      title: "Week 16 - ICMP Exfiltration",
      description:
        "Malware is leaking data over ICMP. Analyze the provided .pcap and reassemble the exfiltrated flag.",
      category: "forensics",
      difficulty: "medium",
      flag: "FLAG{weekly_icmp_payload_hex}",
      points: 500,
      hint: "Look at the data portion of each ICMP echo request, not just the headers.",
      startAt: inDays(-21),
      endAt: inDays(-14),
      isActive: false,
    },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const history = searchParams.get("history") === "true"
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const count = await db.weeklyChallenge.count()
  if (count === 0) await seedWeeklyChallenge()

  if (history) {
    const past = await db.weeklyChallenge.findMany({
      where: { isActive: false },
      orderBy: { endAt: "desc" },
      include: {
        participants: {
          where: { userId: user.id },
          select: { correct: true, timeTaken: true, submittedAt: true },
        },
        _count: { select: { participants: true } },
      },
    })

    return NextResponse.json({
      challenges: past.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        points: c.points,
        flag: c.flag, // reveal flag since challenge ended
        hint: c.hint,
        startAt: c.startAt,
        endAt: c.endAt,
        participantsCount: c._count.participants,
        myResult: c.participants[0] ?? null,
      })),
    })
  }

  // Active challenge
  const active = await db.weeklyChallenge.findFirst({
    where: { isActive: true },
    orderBy: { startAt: "desc" },
    include: {
      participants: {
        where: { userId: user.id },
        select: { correct: true, timeTaken: true, submittedAt: true, flag: true },
      },
      _count: { select: { participants: true } },
    },
  })

  if (!active) {
    return NextResponse.json({ challenge: null, leaderboard: [] })
  }

  // Leaderboard: top 10 fastest correct solvers
  const leaderboard = await db.weeklyChallengeSubmission.findMany({
    where: { challengeId: active.id, correct: true },
    orderBy: [{ timeTaken: "asc" }, { submittedAt: "asc" }],
    take: 10,
    select: {
      id: true,
      timeTaken: true,
      submittedAt: true,
      user: { select: { id: true, name: true, avatar: true } },
    },
  })

  return NextResponse.json({
    challenge: {
      id: active.id,
      title: active.title,
      description: active.description,
      category: active.category,
      difficulty: active.difficulty,
      points: active.points,
      hint: active.hint,
      startAt: active.startAt,
      endAt: active.endAt,
      participantsCount: active._count.participants,
      myResult: active.participants[0]
        ? {
            correct: active.participants[0].correct,
            timeTaken: active.participants[0].timeTaken,
            submittedAt: active.participants[0].submittedAt,
          }
        : null,
    },
    leaderboard: leaderboard.map((s, i) => ({
      rank: i + 1,
      userId: s.user.id,
      name: s.user.name,
      avatar: s.user.avatar,
      timeTaken: s.timeTaken,
      submittedAt: s.submittedAt,
      isMe: s.user.id === user.id,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { challengeId, flag, timeTaken } = body
  if (!challengeId || !flag?.trim()) {
    return NextResponse.json({ error: "challengeId and flag required" }, { status: 400 })
  }

  const challenge = await db.weeklyChallenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  if (!challenge.isActive) {
    return NextResponse.json({ error: "Challenge is no longer active" }, { status: 400 })
  }

  const submittedFlag = flag.trim()
  const correct = submittedFlag === challenge.flag

  // Upsert (unique challenge+user) - only first attempt counts
  const existing = await db.weeklyChallengeSubmission.findUnique({
    where: { challengeId_userId: { challengeId, userId: user.id } },
  })

  if (existing) {
    return NextResponse.json({
      correct: existing.correct,
      message: "You have already submitted a flag for this challenge.",
      score: existing.correct ? challenge.points : 0,
    })
  }

  const sub = await db.weeklyChallengeSubmission.create({
    data: {
      challengeId,
      userId: user.id,
      flag: submittedFlag,
      correct,
      timeTaken: Math.max(0, Math.min(Number(timeTaken) || 0, 7 * 24 * 60 * 60)),
    },
  })

  return NextResponse.json({
    correct: sub.correct,
    message: sub.correct
      ? `Flag accepted! You earned ${challenge.points} points.`
      : "Incorrect flag. Try again - your single attempt is now used.",
    score: sub.correct ? challenge.points : 0,
  })
}
