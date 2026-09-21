import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Learning Analytics Dashboard
// GET: auto-computes the user's learning analytics from
//      enrollments, lab progress, quiz attempts, activity.
//      Updates or creates a LearningAnalytics record, then returns it.
// ============================================================

interface SkillRadar {
  web: number
  network: number
  crypto: number
  forensics: number
  reverse: number
  governance: number
}

function emptyRadar(): SkillRadar {
  return { web: 0, network: 0, crypto: 0, forensics: 0, reverse: 0, governance: 0 }
}

function bumpRadar(r: SkillRadar, category: string, points: number) {
  const k = (category || "").toLowerCase()
  if (k.includes("web") || k.includes("appsec") || k.includes("web security")) r.web = Math.min(100, r.web + points)
  else if (k.includes("network") || k.includes("ccna") || k.includes("ccnp")) r.network = Math.min(100, r.network + points)
  else if (k.includes("crypto") || k.includes("cryptography")) r.crypto = Math.min(100, r.crypto + points)
  else if (k.includes("forensic")) r.forensics = Math.min(100, r.forensics + points)
  else if (k.includes("reverse")) r.reverse = Math.min(100, r.reverse + points)
  else if (k.includes("governance") || k.includes("cissp") || k.includes("iam") || k.includes("cyberark")) r.governance = Math.min(100, r.governance + points)
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ---- Aggregate raw signals ----
  const [enrollments, labProgress, quizAttempts, activities] = await Promise.all([
    db.enrollment.findMany({ where: { userId: user.id }, include: { course: true } }),
    db.labProgress.findMany({ where: { userId: user.id }, include: { lab: true } }),
    db.quizAttempt.findMany({ where: { userId: user.id } }),
    db.userActivity.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ])

  const coursesStarted = enrollments.length
  const coursesCompleted = enrollments.filter((e) => e.completed).length
  const labsAttempted = labProgress.length
  const labsSolved = labProgress.filter((p) => p.status === "completed").length

  const validQuiz = quizAttempts.filter((q) => q.score > 0)
  const avgQuizScore = validQuiz.length > 0
    ? validQuiz.reduce((sum, q) => sum + q.score, 0) / validQuiz.length
    : 0

  // Approximate time spent: sum of activity.xp + lab timeSpentMs (s)
  const totalTimeSpent = Math.round(
    activities.reduce((s, a) => s + a.xp, 0) * 2 + // 2 seconds per XP as a rough proxy
      labProgress.reduce((s, p) => s + p.timeSpentMs / 1000, 0)
  )

  // Skill radar - boosted by course category completion + lab category solved
  const radar = emptyRadar()
  for (const e of enrollments) {
    bumpRadar(radar, e.course.category, Math.round(e.progress / 12)) // up to ~8 pts per course
    if (e.completed) bumpRadar(radar, e.course.category, 10)
  }
  for (const p of labProgress) {
    if (p.status === "completed") bumpRadar(radar, p.lab.category, 8)
    else if (p.status === "in_progress") bumpRadar(radar, p.lab.category, 3)
  }

  // Weekly activity - last 7 days, minutes proxy from activity.xp
  const today = new Date()
  const weekly: { date: string; minutes: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const dayMinutes = activities
      .filter((a) => a.date === iso)
      .reduce((s, a) => s + a.xp, 0) // xp ~ minutes
    weekly.push({ date: iso, minutes: Math.min(240, dayMinutes) })
  }

  // Peer comparison - percentiles
  const allUsers = await db.user.findMany({ select: { xp: true, streak: true, level: true } })
  const sorted = [...allUsers].sort((a, b) => a.xp - b.xp)
  const myXp = user.xp ?? 0
  const myIdx = sorted.findIndex((u) => u.xp >= myXp)
  const xpPercentile = allUsers.length > 1
    ? Math.round(((myIdx === -1 ? allUsers.length : myIdx) / allUsers.length) * 100)
    : 50

  const streakPercentile = Math.min(99, Math.round((user.streak ?? 0) * 12))
  const levelPercentile = Math.min(99, Math.round((user.level ?? 1) * 8))

  const peerComparison = {
    xpPercentile,
    streakPercentile,
    levelPercentile,
    cohortSize: allUsers.length,
    myXp,
    myLevel: user.level ?? 1,
    myStreak: user.streak ?? 0,
  }

  // Course completion rate
  const completionRate = coursesStarted > 0 ? Math.round((coursesCompleted / coursesStarted) * 100) : 0

  // Upsert LearningAnalytics
  const existing = await db.learningAnalytics.findFirst({ where: { userId: user.id } })

  const data = {
    totalTimeSpent,
    coursesStarted,
    coursesCompleted,
    labsAttempted,
    labsSolved,
    avgQuizScore,
    currentStreak: user.streak ?? 0,
    longestStreak: Math.max(user.streak ?? 0, existing?.longestStreak ?? 0),
    skillRadar: JSON.stringify(radar),
    weeklyActivity: JSON.stringify(weekly),
    peerComparison: JSON.stringify(peerComparison),
  }

  const analytics = existing
    ? await db.learningAnalytics.update({ where: { id: existing.id }, data })
    : await db.learningAnalytics.create({ data: { userId: user.id, ...data } })

  // Course-by-course completion breakdown
  const courseBreakdown = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    shortName: e.course.shortName,
    category: e.course.category,
    progress: Math.round(e.progress),
    completed: e.completed,
    lastAccessed: e.lastAccessed,
  }))

  return NextResponse.json({
    analytics: {
      id: analytics.id,
      totalTimeSpent,
      coursesStarted,
      coursesCompleted,
      labsAttempted,
      labsSolved,
      avgQuizScore: Math.round(avgQuizScore * 10) / 10,
      currentStreak: user.streak ?? 0,
      longestStreak: analytics.longestStreak,
      completionRate,
      skillRadar: radar,
      weeklyActivity: weekly,
      peerComparison,
      courseBreakdown,
    },
  })
}
