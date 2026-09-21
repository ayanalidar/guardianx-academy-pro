import { db } from "@/lib/db"

// XP rewards per activity
export const XP_REWARDS = {
  lesson_completed: 15,
  lab_solved: { Easy: 100, Medium: 200, Hard: 400, Insane: 800 } as Record<string, number>,
  quiz_passed: 50,
  note_created: 5,
  course_enrolled: 25,
  cert_earned: 300,
} as const

// Level curve: level N requires N*200 XP cumulative (1->2 needs 400, 2->3 needs 600, etc.)
export function xpForLevel(level: number): number {
  return level * 200
}

export function levelFromXp(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  let level = 1
  let remaining = xp
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level++
  }
  const need = xpForLevel(level)
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: need,
    progress: Math.round((remaining / need) * 100),
  }
}

export function rankTitle(level: number): string {
  if (level >= 30) return "Cyber Legend"
  if (level >= 20) return "Security Expert"
  if (level >= 15) return "Senior Guardian"
  if (level >= 10) return "Guardian"
  if (level >= 5) return "Sentinel"
  if (level >= 2) return "Apprentice"
  return "Novice"
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export type AchievementStats = {
  lessonsCompleted: number
  labsSolved: number
  labsTotal: number
  perfectQuizzes: number
  notes: number
  coursesCompleted: number
  enrollments: number
  certificates: number
  streak: number
  level: number
  xp: number
}

export type AchievementProgress = {
  current: number
  target: number
  /** Human label shown under the progress bar (e.g. "3 / 5 labs solved"). */
  label: string
}

export type AchievementDef = {
  code: string
  title: string
  description: string
  icon: string
  color: string
  xp: number
  tier: "bronze" | "silver" | "gold" | "platinum"
  check: (stats: AchievementStats) => Promise<boolean>
  /** Optional progress indicator for locked achievements. Returns null when
   *  the achievement is binary (no partial progress to show). */
  progressFor?: (stats: AchievementStats) => AchievementProgress | null
}

// Award XP, update streak, log activity, and check achievements.
export async function awardXp(
  userId: string,
  type: keyof typeof XP_REWARDS,
  xp: number,
  meta: string = ""
): Promise<{ newAchievements: any[]; leveledUp: boolean; newLevel: number }> {
  const today = todayStr()
  const user = await db.user.findUnique({ where: { id: userId }, select: { lastActiveDate: true, streak: true, xp: true, level: true } })
  if (!user) return { newAchievements: [], leveledUp: false, newLevel: 1 }

  // streak update
  let newStreak = user.streak
  if (user.lastActiveDate !== today) {
    if (user.lastActiveDate === yesterdayStr()) {
      newStreak = user.streak + 1
    } else {
      newStreak = 1
    }
  }

  const oldLevel = levelFromXp(user.xp).level
  const newXp = user.xp + xp
  const newLevel = levelFromXp(newXp).level
  const leveledUp = newLevel > oldLevel

  await db.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel, streak: newStreak, lastActiveDate: today },
  })

  // log activity (only one per type per day to avoid spam - but allow multiple)
  await db.userActivity.create({
    data: { userId, type, xp, meta, date: today },
  })

  // check achievements
  const newAchievements = await checkAchievements(userId, type)

  // WEEK_WARRIOR (7-day streak) - explicitly award on every awardXp call
  // if the user has reached a 7-day streak. The auto-checkAchievements
  // flow also catches this, but the explicit call makes the spec-mandated
  // award path obvious and self-documenting in the API route.
  if (newStreak >= 7) {
    try {
      const weekWarrior = await awardSpecificAchievement(userId, "WEEK_WARRIOR")
      if (weekWarrior) newAchievements.push(weekWarrior)
    } catch (e) {
      console.error("[gamification] WEEK_WARRIOR award failed:", e)
    }
  }

  // fire notifications (non-blocking, best-effort)
  try {
    const { notifyAchievement, notifyLevelUp } = await import("@/lib/notifications")
    for (const ach of newAchievements) {
      await notifyAchievement(userId, ach)
    }
    if (leveledUp) {
      await notifyLevelUp(userId, newLevel, rankTitle(newLevel))
    }
  } catch (e) {
    console.error("[gamification] notification failed:", e)
  }

  return { newAchievements, leveledUp, newLevel }
}

// Achievement definitions checked dynamically.
//
// Codes follow the naming convention requested by the product spec:
//   FIRST_STEP - awarded on the user's first course enrollment
//   FIRST_LAB - awarded when the user solves their first lab
//   WEEK_WARRIOR - awarded when the user maintains a 7-day streak
//   CERTIFIED - awarded when the user earns their first certificate
//
// Legacy codes (STREAK_3, ENROLLED_3, etc.) are intentionally kept for
// backward compatibility with existing UserAchievement rows in production.
const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { code: "FIRST_LESSON", title: "First Steps", description: "Complete your first lesson", icon: "BookOpen", color: "emerald", xp: 25, tier: "bronze",
    check: async (s) => s.lessonsCompleted >= 1,
    progressFor: (s) => ({ current: Math.min(s.lessonsCompleted, 1), target: 1, label: `${s.lessonsCompleted} / 1 lesson completed` }) },
  { code: "LESSONS_10", title: "Scholar", description: "Complete 10 lessons", icon: "GraduationCap", color: "cyan", xp: 100, tier: "bronze",
    check: async (s) => s.lessonsCompleted >= 10,
    progressFor: (s) => ({ current: Math.min(s.lessonsCompleted, 10), target: 10, label: `${s.lessonsCompleted} / 10 lessons completed` }) },
  { code: "FIRST_LAB", title: "Script Kiddie No More", description: "Solve your first lab", icon: "Terminal", color: "violet", xp: 50, tier: "bronze",
    check: async (s) => s.labsSolved >= 1,
    progressFor: (s) => ({ current: Math.min(s.labsSolved, 1), target: 1, label: `${s.labsSolved} / 1 lab solved` }) },
  { code: "LABS_5", title: "Bug Hunter", description: "Solve 5 labs", icon: "Bug", color: "violet", xp: 150, tier: "silver",
    check: async (s) => s.labsSolved >= 5,
    progressFor: (s) => ({ current: Math.min(s.labsSolved, 5), target: 5, label: `${s.labsSolved} / 5 labs solved` }) },
  { code: "LABS_ALL", title: "Lab Conqueror", description: "Solve all labs", icon: "Trophy", color: "amber", xp: 500, tier: "gold",
    check: async (s) => s.labsTotal > 0 && s.labsSolved >= s.labsTotal,
    progressFor: (s) => s.labsTotal > 0 ? ({ current: s.labsSolved, target: s.labsTotal, label: `${s.labsSolved} / ${s.labsTotal} labs solved` }) : null },
  { code: "QUIZ_ACED", title: "Quiz Master", description: "Pass a quiz with 100%", icon: "Brain", color: "cyan", xp: 75, tier: "silver",
    check: async (s) => s.perfectQuizzes >= 1,
    progressFor: (s) => ({ current: Math.min(s.perfectQuizzes, 1), target: 1, label: `${s.perfectQuizzes} / 1 perfect quiz` }) },
  { code: "NOTE_TAKER", title: "Note Taker", description: "Create your first note", icon: "StickyNote", color: "amber", xp: 15, tier: "bronze",
    check: async (s) => s.notes >= 1,
    progressFor: (s) => ({ current: Math.min(s.notes, 1), target: 1, label: `${s.notes} / 1 note created` }) },
  { code: "NOTES_20", title: "Knowledge Keeper", description: "Create 20 notes", icon: "Library", color: "amber", xp: 100, tier: "silver",
    check: async (s) => s.notes >= 20,
    progressFor: (s) => ({ current: Math.min(s.notes, 20), target: 20, label: `${s.notes} / 20 notes created` }) },
  { code: "STREAK_3", title: "On a Roll", description: "Maintain a 3-day streak", icon: "Flame", color: "orange", xp: 50, tier: "bronze",
    check: async (s) => s.streak >= 3,
    progressFor: (s) => ({ current: Math.min(s.streak, 3), target: 3, label: `${s.streak} / 3 day streak` }) },
  // WEEK_WARRIOR - 7-day streak (spec literal code).
  { code: "WEEK_WARRIOR", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "Flame", color: "red", xp: 150, tier: "silver",
    check: async (s) => s.streak >= 7,
    progressFor: (s) => ({ current: Math.min(s.streak, 7), target: 7, label: `${s.streak} / 7 day streak` }) },
  // CERTIFIED - first certificate (spec literal code).
  { code: "CERTIFIED", title: "Certified", description: "Earn your first certificate", icon: "Award", color: "amber", xp: 200, tier: "gold",
    check: async (s) => s.certificates >= 1,
    progressFor: (s) => ({ current: Math.min(s.certificates, 1), target: 1, label: `${s.certificates} / 1 certificate earned` }) },
  { code: "COURSE_DONE", title: "Course Conqueror", description: "Complete your first course", icon: "ShieldCheck", color: "emerald", xp: 200, tier: "gold",
    check: async (s) => s.coursesCompleted >= 1,
    progressFor: (s) => ({ current: Math.min(s.coursesCompleted, 1), target: 1, label: `${s.coursesCompleted} / 1 course completed` }) },
  { code: "LEVEL_5", title: "Rising Guardian", description: "Reach level 5", icon: "TrendingUp", color: "emerald", xp: 100, tier: "silver",
    check: async (s) => s.level >= 5,
    progressFor: (s) => ({ current: Math.min(s.level, 5), target: 5, label: `Level ${s.level} / 5` }) },
  { code: "LEVEL_10", title: "Guardian Elite", description: "Reach level 10", icon: "ShieldCheck", color: "emerald", xp: 300, tier: "gold",
    check: async (s) => s.level >= 10,
    progressFor: (s) => ({ current: Math.min(s.level, 10), target: 10, label: `Level ${s.level} / 10` }) },
  // FIRST_STEP - first course enrollment (spec literal code).
  { code: "FIRST_STEP", title: "First Step", description: "Enroll in your first course", icon: "BookMarked", color: "cyan", xp: 25, tier: "bronze",
    check: async (s) => s.enrollments >= 1,
    progressFor: (s) => ({ current: Math.min(s.enrollments, 1), target: 1, label: `${s.enrollments} / 1 enrollment` }) },
  { code: "ENROLLED_3", title: "Lifelong Learner", description: "Enroll in 3 courses", icon: "BookMarked", color: "cyan", xp: 75, tier: "bronze",
    check: async (s) => s.enrollments >= 3,
    progressFor: (s) => ({ current: Math.min(s.enrollments, 3), target: 3, label: `${s.enrollments} / 3 enrollments` }) },
]

export async function computeStats(userId: string): Promise<AchievementStats> {
  const [lessonsCompleted, labsSolved, labsTotal, perfectQuizzes, notes, coursesCompleted, enrollments, certificates, user] = await Promise.all([
    db.lessonProgress.count({ where: { userId, completed: true } }),
    db.labProgress.count({ where: { userId, status: "completed" } }),
    db.lab.count({ where: { published: true } }),
    db.quizAttempt.count({ where: { userId, score: 100 } }),
    db.note.count({ where: { userId } }),
    db.enrollment.count({ where: { userId, completed: true } }),
    db.enrollment.count({ where: { userId } }),
    db.certificate.count({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { streak: true, level: true, xp: true } }),
  ])
  return {
    lessonsCompleted,
    labsSolved,
    labsTotal,
    perfectQuizzes,
    notes,
    coursesCompleted,
    enrollments,
    certificates,
    streak: user?.streak ?? 0,
    level: user?.level ?? 1,
    xp: user?.xp ?? 0,
  }
}

export async function checkAchievements(userId: string, _triggerType?: string) {
  const stats = await computeStats(userId)
  const earned = await db.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  })
  const earnedCodes = new Set(earned.map((e) => e.achievement.code))
  const newOnes: any[] = []

  for (const def of ACHIEVEMENT_DEFS) {
    if (earnedCodes.has(def.code)) continue
    const ok = await def.check(stats)
    if (ok) {
      // ensure achievement definition exists
      let ach = await db.achievement.findUnique({ where: { code: def.code } })
      if (!ach) {
        ach = await db.achievement.create({
          data: {
            code: def.code,
            title: def.title,
            description: def.description,
            icon: def.icon,
            color: def.color,
            xp: def.xp,
            tier: def.tier,
          },
        })
      }
      const ua = await db.userAchievement.create({
        data: { userId, achievementId: ach.id },
        include: { achievement: true },
      })
      newOnes.push(ua.achievement)
      // bonus XP from achievement
      await db.user.update({ where: { id: userId }, data: { xp: { increment: def.xp } } })
    }
  }
  return newOnes
}

/**
 * Compute the progress object for a specific achievement code based on
 * the user's current stats. Returns null if the code is unknown or the
 * def has no `progressFor` helper (binary achievements only).
 *
 * Used by the /api/achievements endpoint to surface "3 / 5 labs solved"
 * style progress hints on locked achievement tiles.
 */
export async function getProgressForCode(
  userId: string,
  code: string
): Promise<AchievementProgress | null> {
  const def = ACHIEVEMENT_DEFS.find((d) => d.code === code)
  if (!def || !def.progressFor) return null
  const stats = await computeStats(userId)
  return def.progressFor(stats)
}

/**
 * Compute progress for ALL achievement definitions in one pass - used by
 * /api/achievements to avoid N+1 computeStats calls.
 */
export async function getAllProgress(userId: string): Promise<Record<string, AchievementProgress | null>> {
  const stats = await computeStats(userId)
  const out: Record<string, AchievementProgress | null> = {}
  for (const def of ACHIEVEMENT_DEFS) {
    out[def.code] = def.progressFor ? def.progressFor(stats) : null
  }
  return out
}

/**
 * Explicitly award an achievement by code (idempotent). Used by API
 * endpoints that want to guarantee an achievement is granted even
 * when the auto-check flow hasn't run yet (e.g. the first-time
 * enrollment path before awardXp runs).
 *
 * Returns the Achievement row if a new award was created, or null if
 * the user already had it.
 */
export async function awardSpecificAchievement(
  userId: string,
  code: string
): Promise<any | null> {
  const def = ACHIEVEMENT_DEFS.find((d) => d.code === code)
  if (!def) return null

  // ensure achievement row exists in DB
  let ach = await db.achievement.findUnique({ where: { code: def.code } })
  if (!ach) {
    ach = await db.achievement.create({
      data: {
        code: def.code,
        title: def.title,
        description: def.description,
        icon: def.icon,
        color: def.color,
        xp: def.xp,
        tier: def.tier,
      },
    })
  }

  const existing = await db.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: ach.id } },
  })
  if (existing) return null

  const ua = await db.userAchievement.create({
    data: { userId, achievementId: ach.id },
    include: { achievement: true },
  })
  // bonus XP from achievement
  await db.user.update({ where: { id: userId }, data: { xp: { increment: def.xp } } })
  return ua.achievement
}

export { ACHIEVEMENT_DEFS }
