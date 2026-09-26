import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  const user = await getCurrentUser()

  // aggregate all labs by category + difficulty
  const allLabs = await db.lab.findMany({
    where: { published: true },
    select: { id: true, category: true, difficulty: true, points: true },
  })

  const byCategory: Record<string, { total: number; completed: number; points: number; earnedPoints: number }> = {}
  const byDifficulty: Record<string, { total: number; completed: number; points: number }> = {}
  let totalPoints = 0
  for (const lab of allLabs) {
    totalPoints += lab.points
    byCategory[lab.category] ??= { total: 0, completed: 0, points: 0, earnedPoints: 0 }
    byCategory[lab.category].total++
    byCategory[lab.category].points += lab.points
    byDifficulty[lab.difficulty] ??= { total: 0, completed: 0, points: 0 }
    byDifficulty[lab.difficulty].total++
    byDifficulty[lab.difficulty].points += lab.points
  }

  let completedLabs: string[] = []
  let earnedPoints = 0
  let totalTimeSpentMs = 0
  if (user) {
    const progress = await db.labProgress.findMany({
      where: { userId: user.id },
      include: { lab: { select: { category: true, difficulty: true, points: true } } },
    })
    completedLabs = progress.filter((p) => p.status === "completed").map((p) => p.labId)
    totalTimeSpentMs = progress.reduce((sum, p) => sum + (p.timeSpentMs ?? 0), 0)
    for (const p of progress) {
      if (p.status !== "completed") continue
      earnedPoints += p.lab.points
      if (byCategory[p.lab.category]) byCategory[p.lab.category].completed++
      if (byCategory[p.lab.category]) byCategory[p.lab.category].earnedPoints += p.lab.points
      if (byDifficulty[p.lab.difficulty]) byDifficulty[p.lab.difficulty].completed++
    }
  }

  const categoryStats = Object.entries(byCategory).map(([name, s]) => ({ name, ...s, progressPct: s.total ? Math.round((s.completed / s.total) * 100) : 0 }))
  const difficultyStats = Object.entries(byDifficulty).map(([name, s]) => ({ name, ...s, progressPct: s.total ? Math.round((s.completed / s.total) * 100) : 0 }))

  return NextResponse.json({
    total: allLabs.length,
    completed: completedLabs.length,
    totalPoints,
    earnedPoints,
    totalTimeSpentMs,
    overallPct: allLabs.length ? Math.round((completedLabs.length / allLabs.length) * 100) : 0,
    categories: categoryStats.sort((a, b) => b.total - a.total),
    difficulties: difficultyStats,
  })
}
