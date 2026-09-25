import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Returns lab leaderboards:
// - top solvers by count + points
// - fastest solve times per lab (and overall)
export async function GET() {
  // Top solvers by number of labs completed + total points earned
  const labProgress = await db.labProgress.findMany({
    // audit fix D-07: cap response
    take: 50,
    where: { status: "completed" },
    include: {
      user: { select: { id: true, name: true, title: true, avatar: true, level: true, xp: true } },
      lab: { select: { id: true, title: true, slug: true, difficulty: true, points: true, category: true } },
    },
  })

  // Aggregate by user
  const userMap = new Map<string, {
    user: any
    labsSolved: number
    totalPoints: number
    totalTimeMs: number
    fastestMs: number | null
    fastestLab: string | null
  }>()

  for (const p of labProgress) {
    const existing = userMap.get(p.userId) ?? {
      user: p.user,
      labsSolved: 0,
      totalPoints: 0,
      totalTimeMs: 0,
      fastestMs: null as number | null,
      fastestLab: null as string | null,
    }
    existing.labsSolved++
    existing.totalPoints += p.lab.points
    existing.totalTimeMs += p.timeSpentMs ?? 0
    // track fastest single-lab solve
    const solveMs = p.timeSpentMs ?? 0
    if (solveMs > 0 && (existing.fastestMs === null || solveMs < existing.fastestMs)) {
      existing.fastestMs = solveMs
      existing.fastestLab = p.lab.title
    }
    userMap.set(p.userId, existing)
  }

  const topSolvers = Array.from(userMap.values())
    .sort((a, b) => b.labsSolved - a.labsSolved || b.totalPoints - a.totalPoints)
    .slice(0, 10)
    .map((entry, i) => ({ rank: i + 1, ...entry }))

  // Fastest solvers (by single-lab solve time, minimum 1 lab solved)
  const fastestSolvers = Array.from(userMap.values())
    .filter((e) => e.fastestMs !== null && e.fastestMs > 0)
    .sort((a, b) => (a.fastestMs ?? Infinity) - (b.fastestMs ?? Infinity))
    .slice(0, 10)
    .map((entry, i) => ({ rank: i + 1, ...entry }))

  // Per-lab fastest solves
  const labMap = new Map<string, { lab: any; solves: any[] }>()
  for (const p of labProgress) {
    const arr = labMap.get(p.lab.id)?.solves ?? []
    arr.push({ user: p.user, timeSpentMs: p.timeSpentMs ?? 0, completedAt: p.completedAt })
    labMap.set(p.lab.id, { lab: p.lab, solves: arr })
  }

  const labLeaderboards = Array.from(labMap.values())
    .map(({ lab, solves }) => ({
      lab: { id: lab.id, title: lab.title, slug: lab.slug, difficulty: lab.difficulty, category: lab.category, points: lab.points },
      totalSolves: solves.length,
      fastest: solves
        .filter((s) => s.timeSpentMs > 0)
        .sort((a, b) => a.timeSpentMs - b.timeSpentMs)
        .slice(0, 3)
        .map((s) => ({ user: s.user, timeSpentMs: s.timeSpentMs })),
    }))
    .filter((l) => l.totalSolves > 0)
    .sort((a, b) => b.totalSolves - a.totalSolves)

  return NextResponse.json({
    topSolvers,
    fastestSolvers,
    labLeaderboards,
    totalSolves: labProgress.length,
    activeSolvers: userMap.size,
  })
}
