import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { levelFromXp, rankTitle, ACHIEVEMENT_DEFS, checkAchievements, getAllProgress } from "@/lib/gamification"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // make sure achievements are up to date
  await checkAchievements(user.id)

  const [fullUser, earned, activities, progressMap] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true, streak: true, lastActiveDate: true } }),
    db.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    }),
    db.userActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getAllProgress(user.id),
  ])

  const xp = fullUser?.xp ?? 0
  const levelInfo = levelFromXp(xp)
  const rank = rankTitle(levelInfo.level)

  // build full achievement list (earned + locked) - also include any
  // admin-created achievements stored in the DB that aren't part of the
  // static ACHIEVEMENT_DEFS list (so admin-created trophies still show).
  const dynamicRows = await db.achievement.findMany({
    where: { code: { notIn: ACHIEVEMENT_DEFS.map((d) => d.code) } },
  })

  const staticAchievements = ACHIEVEMENT_DEFS.map((d) => {
    const e = earned.find((x: any) => x.achievement.code === d.code)
    return {
      code: d.code,
      title: d.title,
      description: d.description,
      icon: d.icon,
      color: d.color,
      xp: d.xp,
      tier: d.tier,
      earned: !!e,
      earnedAt: e?.earnedAt ?? null,
      progress: progressMap[d.code] ?? null,
    }
  })
  const dynamicAchievements = dynamicRows.map((a: any) => {
    const e = earned.find((x: any) => x.achievementId === a.id)
    return {
      code: a.code,
      title: a.title,
      description: a.description,
      icon: a.icon,
      color: a.color,
      xp: a.xp,
      tier: a.tier,
      earned: !!e,
      earnedAt: e?.earnedAt ?? null,
      progress: null as any, // admin-created achievements have no progress metric
    }
  })
  const allAchievements = [...staticAchievements, ...dynamicAchievements]

  // last 7 days activity heatmap
  const today = new Date()
  const heatmap: { date: string; count: number; xp: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const dayActs = activities.filter((a: any) => a.date === ds)
    heatmap.push({
      date: ds,
      count: dayActs.length,
      xp: dayActs.reduce((a: number, b: any) => a + b.xp, 0),
    })
  }

  // leaderboard (top 10 by XP)
  const topUsers = await db.user.findMany({
    orderBy: { xp: "desc" },
    take: 10,
    select: { id: true, name: true, title: true, avatar: true, xp: true, level: true },
  })
  const leaderboard = topUsers.map((u, i) => ({
    rank: i + 1,
    ...u,
    rankTitle: rankTitle(levelFromXp(u.xp).level),
    isMe: u.id === user.id,
  }))

  return NextResponse.json({
    xp,
    level: levelInfo.level,
    levelInfo,
    rank,
    streak: fullUser?.streak ?? 0,
    achievements: allAchievements,
    earnedCount: earned.length,
    totalCount: allAchievements.length,
    activities: activities.slice(0, 10).map((a) => ({ type: a.type, xp: a.xp, date: a.date, createdAt: a.createdAt })),
    heatmap,
    leaderboard,
  })
}
