import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { levelFromXp, rankTitle } from "@/lib/gamification"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null })

  const [enrollmentCount, completedCount, inProgressCount, notesCount, labCount, certCount, attempts, gamified, activities, allLabs, allEnrollments] = await Promise.all([
    db.enrollment.count({ where: { userId: user.id } }),
    db.enrollment.count({ where: { userId: user.id, completed: true } }),
    db.enrollment.count({ where: { userId: user.id, completed: false } }),
    db.note.count({ where: { userId: user.id } }),
    db.labProgress.count({ where: { userId: user.id, status: "completed" } }),
    db.certificate.count({ where: { userId: user.id } }),
    db.quizAttempt.findMany({ where: { userId: user.id }, select: { score: true } }),
    db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true, streak: true, lastActiveDate: true } }),
    db.userActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, xp: true, meta: true, date: true, createdAt: true },
    }),
    // All published labs (for skill profile - group by category, count solved vs total)
    db.lab.findMany({
      where: { published: true },
      select: {
        id: true, category: true,
        progress: { where: { userId: user.id, status: "completed" }, select: { id: true } },
      },
    }),
    // All user enrollments with course title (for upcoming-deadlines context)
    db.enrollment.findMany({
      where: { userId: user.id, completed: false },
      select: {
        courseId: true,
        course: { select: { id: true, title: true, shortName: true } },
      },
    }),
  ])

  const avgScore = attempts.length
    ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length)
    : 0

  const xp = gamified?.xp ?? 0
  const levelInfo = levelFromXp(xp)

  // ----- weekly XP (last 7 days, XP per day) -----
  const today = new Date()
  const weeklyXp: { date: string; xp: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    // We only have the last 10 activities in memory - for a full 7-day chart
    // we need a fresh DB query. Use a count + sum aggregation instead.
    weeklyXp.push({ date: ds, xp: 0, count: 0 })
  }
  // Fetch the full week of activities for accurate charting
  const weekStart = weeklyXp[0].date
  const weekActs = await db.userActivity.findMany({
    where: { userId: user.id, date: { gte: weekStart } },
    select: { date: true, xp: true, type: true },
  })
  const weekMap = new Map(weeklyXp.map((w) => [w.date, w]))
  for (const a of weekActs) {
    const slot = weekMap.get(a.date)
    if (slot) {
      slot.xp += a.xp
      slot.count += 1
    }
  }

  // ----- upcoming deadlines (next 14 days) -----
  // Pull from: assignments on enrolled courses, scheduled live sessions,
  // and proctored exam attempts. Each deadline entry is normalized to a
  // common shape for the UI to render uniformly.
  const enrolledCourseIds = allEnrollments.map((e) => e.courseId)
  const courseTitleById = new Map(allEnrollments.map((e) => [e.courseId, e.course]))

  const deadlineCutoff = new Date()
  deadlineCutoff.setDate(deadlineCutoff.getDate() + 14)

  const [upcomingAssignments, upcomingSessions, upcomingExams] = await Promise.all([
    enrolledCourseIds.length > 0
      ? db.assignment.findMany({
          where: {
            courseId: { in: enrolledCourseIds },
            published: true,
            dueDate: { gte: new Date(), lte: deadlineCutoff },
          },
          select: { id: true, title: true, dueDate: true, courseId: true, pointsPossible: true },
          orderBy: { dueDate: "asc" },
          take: 10,
        })
      : Promise.resolve([]),
    db.liveSession.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { gte: new Date(), lte: deadlineCutoff },
        // Sessions attached to an enrolled course OR open sessions
        OR: [
          { courseId: { in: enrolledCourseIds.length > 0 ? enrolledCourseIds : ["__none__"] } },
          { courseId: null },
        ],
      },
      select: { id: true, title: true, scheduledAt: true, courseId: true },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    db.examAttempt.findMany({
      where: {
        userId: user.id,
        status: "scheduled",
        // Only attempts scheduled in the future
        // (we don't have a scheduledAt column on ExamAttempt - we use
        // the createdAt + exam.duration for windowing. For now, surface
        // all scheduled attempts regardless of date.)
      },
      include: {
        exam: { select: { id: true, title: true, duration: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ])

  type Deadline = {
    type: "assignment" | "live-session" | "exam"
    id: string
    title: string
    dueDate: string
    courseId: string | null
    courseTitle: string | null
    meta?: string
  }
  const deadlines: Deadline[] = []
  for (const a of upcomingAssignments) {
    deadlines.push({
      type: "assignment",
      id: a.id,
      title: a.title,
      dueDate: a.dueDate.toISOString(),
      courseId: a.courseId,
      courseTitle: courseTitleById.get(a.courseId)?.title ?? null,
      meta: `${a.pointsPossible} pts`,
    })
  }
  for (const s of upcomingSessions) {
    deadlines.push({
      type: "live-session",
      id: s.id,
      title: s.title,
      dueDate: s.scheduledAt.toISOString(),
      courseId: s.courseId,
      courseTitle: s.courseId ? (courseTitleById.get(s.courseId)?.title ?? null) : null,
    })
  }
  for (const e of upcomingExams) {
    deadlines.push({
      type: "exam",
      id: e.id,
      title: e.exam?.title ?? "Exam",
      dueDate: e.createdAt.toISOString(),
      courseId: null,
      courseTitle: null,
      meta: e.exam ? `${e.exam.duration} min` : undefined,
    })
  }
  // sort by dueDate ascending, take 12 max
  deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const upcomingDeadlines = deadlines.slice(0, 12)

  // ----- skill profile (labs solved per category) -----
  // Aggregate by category. Each Lab row's `progress` is the user's
  // completed LabProgress on that lab (filtered above) - if it exists,
  // the lab is "solved" by this user.
  const skillMap = new Map<string, { solved: number; total: number }>()
  for (const lab of allLabs) {
    const cat = lab.category || "Other"
    const entry = skillMap.get(cat) ?? { solved: 0, total: 0 }
    entry.total++
    if (lab.progress && lab.progress.length > 0) entry.solved++
    skillMap.set(cat, entry)
  }
  const skillProfile = Array.from(skillMap.entries())
    .map(([key, v]) => ({
      key,
      label: key,
      solved: v.solved,
      total: v.total,
      pct: v.total > 0 ? Math.round((v.solved / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8) // cap at 8 categories for the radar chart

  return NextResponse.json({
    user,
    stats: {
      enrollments: enrollmentCount,
      completed: completedCount,
      inProgress: inProgressCount,
      notes: notesCount,
      labsDone: labCount,
      certificates: certCount,
      avgScore,
    },
    gamification: {
      xp,
      level: levelInfo.level,
      streak: gamified?.streak ?? 0,
      rank: rankTitle(levelInfo.level),
      levelInfo,
      lastActiveDate: gamified?.lastActiveDate ?? null,
    },
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      xp: a.xp,
      meta: a.meta,
      date: a.date,
      createdAt: a.createdAt,
    })),
    // ----- Dashboard-specific (added by ACHIEVEMENTS-DASHBOARD-REVENUE task) -----
    weeklyXp,
    upcomingDeadlines,
    skillProfile,
  })
}
