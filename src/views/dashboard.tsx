"use client"

/**
 * GUARDIANX // MISSION CONTROL
 * ----------------------------
 * Security Operations Center (SOC) for learning. A real-time operator
 * dashboard that surfaces the user's next mission, in-progress courses,
 * active lab environments, daily objective, achievements, leaderboard
 * standing, skill profile, and a chronological activity feed.
 *
 * All sections gracefully degrade: loading skeletons, intentional empty
 * states with CTAs, and color-coded status indicators throughout.
 */

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from "recharts"
import {
  Activity, ArrowRight, Award, BookMarked, BookOpen, Brain, Bug,
  Calendar, ChevronRight, Clock, Crosshair, Crown, Flame, FlaskConical,
  GraduationCap, Library, Radar as RadarIcon, Shield, ShieldCheck, StickyNote,
  Target, Terminal, TrendingUp, Trophy, Zap, PlayCircle, AlertCircle,
  Video, FileText, Hourglass, BarChart2, Sparkles,
  Gift, Copy, Check, Users, UserCheck, Ticket, Send,
} from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { useUser } from "@/hooks/use-user"
import { api } from "@/lib/api"
import { OnboardingChecklist } from "@/components/platform/onboarding-checklist"
import { levelFromXp, rankTitle } from "@/lib/gamification"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"
import {
  LabCard, type LabDifficulty, MissionCard, RankBadge, StatTile,
  StatusDot, XPBar,
} from "@/components/cyber"

/* ============================================================
   Types
   ============================================================ */

interface CourseListItem {
  id: string; slug: string; title: string; shortName: string
  description: string; category: string; level: string; durationHours: number
  rating: number; studentsCount: number; color: string; thumbnail: string | null
  tags: string; certBody: string
  instructor: { id: string; name: string; title: string | null }
  lessonCount: number; moduleCount: number
  enrollment?: {
    progress: number; completed: boolean; lastAccessed: string | null
    enrolledAt: string
  } | null
}

interface LabListItem {
  id: string; slug: string; title: string; description: string
  longDescription: string; category: string; difficulty: string
  durationMin: number; points: number; tags: string; scenario: string
  objectives: string; hints: string; flag: string; commands: string
  virtualEnv: string; color: string; published: boolean
  progress: {
    status: string; flagFound: boolean; hintsUsed: number
    timeSpentMs: number; startedAt: string | null
    completedAt: string | null; updatedAt: string
  } | null
}

interface SkillProfileItem {
  key: string
  label: string
  solved: number
  total: number
  pct: number
}

interface WeeklyXpItem {
  date: string
  xp: number
  count: number
}

interface DeadlineItem {
  type: "assignment" | "live-session" | "exam"
  id: string
  title: string
  dueDate: string
  courseId: string | null
  courseTitle: string | null
  meta?: string
}

interface MeData {
  activities?: ActivityItem[]
  weeklyXp?: WeeklyXpItem[]
  upcomingDeadlines?: DeadlineItem[]
  skillProfile?: SkillProfileItem[]
  stats?: {
    enrollments?: number
    completed?: number
    inProgress?: number
    notes?: number
    labsDone?: number
    certificates?: number
    avgScore?: number
  }
}

interface LeaderboardEntry {
  rank: number; id: string; name: string; title: string | null
  avatar: string | null; xp: number; level: number
  rankTitle: string; isMe: boolean
}

interface AchievementItem {
  code: string; title: string; description: string
  icon: string; color: string; xp: number; tier: string
  earned: boolean; earnedAt: string | null
}

interface ActivityItem {
  id: string; type: string; xp: number; meta: string
  date: string; createdAt: string
}

/* ============================================================
   Helpers
   ============================================================ */

const DIFFICULTY_MAP: Record<string, LabDifficulty> = {
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard",
  Insane: "Insane",
}

const ACTIVITY_META: Record<
  string,
  { icon: typeof BookOpen; label: string; color: string; tint: string }
> = {
  lesson_completed: {
    icon: BookOpen, label: "Lesson Completed", color: "text-cyan-300", tint: "bg-cyan-500/10",
  },
  lab_solved: {
    icon: Terminal, label: "Lab Solved", color: "text-violet-300", tint: "bg-violet-500/10",
  },
  quiz_passed: {
    icon: Brain, label: "Quiz Passed", color: "text-amber-300", tint: "bg-amber-500/10",
  },
  note_created: {
    icon: StickyNote, label: "Note Created", color: "text-emerald-300", tint: "bg-emerald-500/10",
  },
  course_enrolled: {
    icon: BookMarked, label: "Course Enrolled", color: "text-cyan-300", tint: "bg-cyan-500/10",
  },
  cert_earned: {
    icon: Award, label: "Certification Earned", color: "text-amber-300", tint: "bg-amber-500/10",
  },
}

const ACHIEVEMENT_ICON_MAP: Record<string, typeof BookOpen> = {
  BookOpen, GraduationCap, Terminal, Bug, Trophy, Brain, StickyNote,
  Library, Flame, Award, TrendingUp, ShieldCheck, BookMarked,
}

const ACHIEVEMENT_COLOR_MAP: Record<string, string> = {
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  orange: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  red: "border-rose-500/40 bg-rose-500/10 text-rose-300",
}

const SKILL_CATEGORIES = [
  { key: "Web Security", label: "Web", color: "from-violet-500 to-violet-400" },
  { key: "Network", label: "Network", color: "from-cyan-500 to-cyan-400" },
  { key: "Cryptography", label: "Crypto", color: "from-amber-500 to-amber-400" },
  { key: "Forensics", label: "Forensics", color: "from-emerald-500 to-emerald-400" },
  { key: "Reverse Engineering", label: "Reverse", color: "from-rose-500 to-rose-400" },
  { key: "Governance", label: "Governance", color: "from-sky-500 to-sky-400" },
]

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  })
}

function deriveServices(lab: LabListItem): string[] {
  const t = (lab.tags || "").toLowerCase()
  const out: string[] = []
  if (t.includes("ssh") || lab.commands?.includes("ssh")) out.push("SSH")
  if (t.includes("http") || t.includes("web")) out.push("HTTP")
  if (t.includes("ftp") || t.includes("smb")) out.push("FTP")
  if (t.includes("dns") || t.includes("smtp")) out.push("DNS")
  if (t.includes("mysql") || t.includes("sql")) out.push("MySQL")
  if (out.length === 0) out.push("SSH", "HTTP")
  return out.slice(0, 3)
}

function pseudoIp(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const a = (Math.abs(h) % 200) + 10
  const b = (Math.abs(h >> 8) % 200) + 10
  return `10.10.${a % 250}.${b % 250}`
}

/* ============================================================
   DashboardView - main export (kept name for back-compat)
   ============================================================ */

export function DashboardView() {
  const { user, stats, gamification, isLoading: userLoading } = useUser()
  const { navigate } = useAppStore()

  const { data: meData, isLoading: meLoading } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => {
      try { return await api("/api/me") } catch { return { activities: [] } }
    },
    retry: false,
  })

  const { data: coursesData, isLoading: coursesLoading } = useQuery<{ courses: CourseListItem[] }>({
    queryKey: ["courses", "dashboard-enrolled"],
    queryFn: async () => {
      try { return await api(`/api/courses?enrolled=true&userId=${user?.id ?? ""}&status=in-progress`) } catch { return { courses: [] } }
    },
    enabled: !!user?.id,
    retry: false,
  })

  const { data: labsData, isLoading: labsLoading } = useQuery<{ labs: LabListItem[] }>({
    queryKey: ["labs", "dashboard"],
    queryFn: async () => {
      try { return await api("/api/labs") } catch { return { labs: [] } }
    },
    retry: false,
  })

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<{
    topUsers: LeaderboardEntry[]
    currentUser: LeaderboardEntry | null
    totalUsers: number
  }>({
    queryKey: ["leaderboard", "dashboard"],
    queryFn: async () => {
      try { return await api("/api/leaderboard") } catch { return { topUsers: [], currentUser: null, totalUsers: 0 } }
    },
    retry: false,
  })

  const { data: achievementsData, isLoading: achievementsLoading } = useQuery<{
    achievements: AchievementItem[]
    earnedCount: number
    totalCount: number
  }>({
    queryKey: ["achievements", "dashboard"],
    queryFn: async () => {
      try { return await api("/api/achievements") } catch { return { achievements: [], earnedCount: 0, totalCount: 0 } }
    },
    enabled: !!user?.id,
    retry: false,
  })

  const activities = meData?.activities ?? []
  const enrolledCourses = (coursesData?.courses ?? []).filter(
    (c) => c.enrollment && !c.enrollment.completed,
  )
  const labs = labsData?.labs ?? []

  // Current mission = first lab the user hasn't completed
  const currentMission = labs.find(
    (l) => !l.progress || l.progress.status !== "completed",
  )

  // Active labs = labs the user has started (in-progress)
  const activeLabs = labs.filter((l) => l.progress?.status === "in_progress")

  // Skill profile = completion percentage per category
  const skillProfile = React.useMemo(() => {
    return SKILL_CATEGORIES.map((cat) => {
      const total = labs.filter((l) => l.category === cat.key).length
      const solved = labs.filter(
        (l) => l.category === cat.key && l.progress?.status === "completed",
      ).length
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0
      return { ...cat, total, solved, pct }
    })
  }, [labs])

  const xp = gamification?.xp ?? 0
  const levelInfo = gamification?.levelInfo ?? levelFromXp(0)
  const rank = gamification?.rank ?? rankTitle(1)
  const streak = gamification?.streak ?? 0
  const level = gamification?.level ?? 1

  // Dashboard-specific data from /api/me (added by ACHIEVEMENTS-DASHBOARD-REVENUE task)
  const weeklyXp = meData?.weeklyXp ?? []
  const upcomingDeadlines = meData?.upcomingDeadlines ?? []
  const serverSkillProfile = meData?.skillProfile ?? []
  const statsOverview = {
    enrolled: stats?.enrollments ?? 0,
    completed: stats?.completed ?? 0,
    inProgress: stats?.inProgress ?? (stats ? Math.max(0, (stats.enrollments ?? 0) - (stats.completed ?? 0)) : 0),
    certificates: stats?.certificates ?? 0,
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background - SOC grid */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* ====================================================
            1. HEADER STRIP - WELCOME BACK, [NAME]
            ==================================================== */}
        <HeaderStrip
          userName={user?.name ?? "Operator"}
          rank={rank}
          level={level}
          loading={userLoading}
          labCount={labs.length}
        />

        {/* ====================================================
            1b. ONBOARDING - first-login checklist (auto-hides when done)
            ==================================================== */}
        {user?.role === "STUDENT" && <OnboardingChecklist />}

        {/* ====================================================
            2. STATS ROW - 4 StatTiles
            ==================================================== */}
        <StatsRow
          level={level}
          levelInfo={levelInfo}
          xp={xp}
          streak={streak}
          rank={rank}
          loading={userLoading}
        />

        {/* ====================================================
            2b. PROGRESS OVERVIEW - Enrolled / Completed / In-Progress / Certs
            ==================================================== */}
        <ScrollReveal delay={0.05}>
          <ProgressOverview
            enrolled={statsOverview.enrolled}
            completed={statsOverview.completed}
            inProgress={statsOverview.inProgress}
            certificates={statsOverview.certificates}
            xp={xp}
            level={level}
            loading={userLoading || meLoading}
          />
        </ScrollReveal>

        {/* ====================================================
            2c. QUICK WIDGETS - Batch schedule + Recommended course
            ==================================================== */}
        <QuickWidgets userId={user?.id} navigate={navigate} />

        {/* ====================================================
            3. MAIN GRID - LEFT (60%) + RIGHT (40%)
            ==================================================== */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-6">
            {/* CURRENT MISSION */}
            <ScrollReveal>
              <CurrentMission
                lab={currentMission}
                loading={labsLoading}
              />
            </ScrollReveal>

            {/* CONTINUE LEARNING */}
            <ScrollReveal delay={0.05}>
              <ContinueLearning
                courses={enrolledCourses.slice(0, 3)}
                loading={coursesLoading}
              />
            </ScrollReveal>

            {/* ACTIVE LABS */}
            <ScrollReveal delay={0.1}>
              <ActiveLabs
                labs={activeLabs}
                loading={labsLoading}
              />
            </ScrollReveal>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* REFER & EARN */}
            <ScrollReveal>
              <ReferEarnPanel />
            </ScrollReveal>

            {/* DAILY OBJECTIVE */}
            <ScrollReveal>
              <DailyObjective labsSolvedToday={0} />
            </ScrollReveal>

            {/* ACHIEVEMENTS */}
            <ScrollReveal delay={0.05}>
              <AchievementsPanel
                achievements={achievementsData?.achievements ?? []}
                earnedCount={achievementsData?.earnedCount ?? 0}
                totalCount={achievementsData?.totalCount ?? 0}
                loading={achievementsLoading}
              />
            </ScrollReveal>

            {/* LEADERBOARD */}
            <ScrollReveal delay={0.1}>
              <LeaderboardPanel
                topUsers={leaderboardData?.topUsers ?? []}
                currentUser={leaderboardData?.currentUser ?? null}
                totalUsers={leaderboardData?.totalUsers ?? 0}
                loading={leaderboardLoading}
              />
            </ScrollReveal>

            {/* SKILL PROFILE */}
            <ScrollReveal delay={0.15}>
              <SkillProfile skills={skillProfile} />
            </ScrollReveal>

            {/* STREAK TRACKER */}
            <ScrollReveal delay={0.2}>
              <StreakTracker
                streak={streak}
                weeklyXp={weeklyXp}
                loading={userLoading || meLoading}
              />
            </ScrollReveal>
          </div>
        </div>

        {/* ====================================================
            3b. WEEKLY XP + SKILL RADAR - 2-col charts row
            ==================================================== */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ScrollReveal>
            <WeeklyXpChart data={weeklyXp} loading={userLoading || meLoading} />
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <SkillRadar
              skills={serverSkillProfile.length > 0 ? serverSkillProfile : skillProfile}
              loading={userLoading || meLoading}
            />
          </ScrollReveal>
        </div>

        {/* ====================================================
            3c. UPCOMING DEADLINES - assignments, exams, live sessions
            ==================================================== */}
        <ScrollReveal>
          <UpcomingDeadlines
            deadlines={upcomingDeadlines}
            loading={userLoading || meLoading}
          />
        </ScrollReveal>

        {/* ====================================================
            4. ACTIVITY FEED - recent activity timeline
            ==================================================== */}
        <ScrollReveal>
          <ActivityFeed activities={activities.slice(0, 5)} loading={userLoading} />
        </ScrollReveal>
      </div>
    </div>
  )
}

/* ============================================================
   1. Header Strip
   ============================================================ */

function HeaderStrip({
  userName, rank, level, loading, labCount,
}: {
  userName: string
  rank: string
  level: number
  loading: boolean
  labCount: number
}) {
  const [now, setNow] = React.useState<Date>(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm",
        "scanlines px-4 sm:px-6 py-4",
      )}
    >
      <div className="absolute inset-0 bg-grid-fine opacity-30 pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* LEFT - brand + user identity */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            aria-hidden
          >
            <Shield className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-300/90">
              GUARDIANX // MISSION CONTROL
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                <span className="text-muted-foreground font-normal">Welcome back,</span>{" "}
                <span className="text-foreground">{userName}</span>
              </h1>
              {!loading && (
                <RankBadge rank={rank} level={level} size="sm" />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT - live status indicators */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <StatusDot status="online" pulse size="sm" label="Systems Online" />
          <StatusDot
            status={labCount > 0 ? "online" : "idle"}
            pulse={labCount > 0}
            size="sm"
            label={`${labCount} Labs Available`}
          />
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5 text-cyan-400" aria-hidden />
            <span className="tabular-nums text-cyan-200/90">{formatClock(now)}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ============================================================
   2. Stats Row - 4 StatTiles
   ============================================================ */

function StatsRow({
  level, levelInfo, xp, streak, rank, loading,
}: {
  level: number
  levelInfo: { currentLevelXp: number; nextLevelXp: number; progress: number }
  xp: number
  streak: number
  rank: string
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[64px] rounded-xl" />
      </div>
    )
  }

  return (
    <section aria-label="Operator metrics" className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={ShieldCheck}
          label={`Level ${level} · ${levelInfo.currentLevelXp}/${levelInfo.nextLevelXp} XP`}
          value={level}
          suffix=""
          color="text-violet-300"
          tint="bg-violet-500/10"
        />
        <StatTile
          icon={Zap}
          label="Total XP"
          value={xp}
          color="text-amber-300"
          tint="bg-amber-500/10"
        />
        <StatTile
          icon={Flame}
          label="Streak"
          value={streak}
          suffix="days"
          color="text-rose-300"
          tint="bg-rose-500/10"
        />
        <StatTile
          icon={Crown}
          label="Current Rank"
          value={rank}
          color="text-emerald-300"
          tint="bg-emerald-500/10"
        />
      </div>
      <div className="card-premium rounded-xl px-4 py-3">
        <XPBar
          current={levelInfo.currentLevelXp}
          max={levelInfo.nextLevelXp}
          level={level}
        />
      </div>
    </section>
  )
}

/* ============================================================
   3a. Current Mission - MissionCard or empty state
   ============================================================ */

function CurrentMission({
  lab, loading,
}: {
  lab: LabListItem | undefined
  loading: boolean
}) {
  const { navigate } = useAppStore()

  if (loading) {
    return (
      <section aria-label="Current mission">
        <SectionHeader icon={Crosshair} label="Current Mission" tone="violet" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </section>
    )
  }

  if (!lab) {
    return (
      <section aria-label="Current mission">
        <SectionHeader icon={Crosshair} label="Current Mission" tone="violet" />
        <EmptyState
          title="No Active Mission"
          description="Your next mission is waiting. Browse the lab catalog and pick your first target."
          ctaLabel="Explore Labs"
          onCta={() => navigate({ name: "labs" })}
          icon={Crosshair}
          accent="violet"
        />
      </section>
    )
  }

  return (
    <section aria-label="Current mission">
      <SectionHeader icon={Crosshair} label="Current Mission" tone="violet" />
      <MissionCard
        title={lab.title}
        objective={lab.description || "Capture the flag to complete this mission."}
        difficulty={DIFFICULTY_MAP[lab.difficulty] ?? "Medium"}
        xp={lab.points}
        timeElapsed={lab.progress?.startedAt ? relativeTime(lab.progress.startedAt) : undefined}
        onLaunch={() => navigate({ name: "lab", labSlug: lab.slug })}
        onSubmit={() => navigate({ name: "lab", labSlug: lab.slug })}
      />
    </section>
  )
}

/* ============================================================
   3b. Continue Learning - courses in progress
   ============================================================ */

function ContinueLearning({
  courses, loading,
}: {
  courses: CourseListItem[]
  loading: boolean
}) {
  const { navigate } = useAppStore()

  return (
    <section aria-label="Continue learning">
      <SectionHeader
        icon={BookOpen}
        label="Continue Learning"
        tone="cyan"
        actionLabel="View All Courses"
        onAction={() => navigate({ name: "learning" })}
      />

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title="No Courses In Progress"
          description="You haven't started any courses yet. Browse the catalog and enroll to begin your training."
          ctaLabel="Browse Catalog"
          onCta={() => navigate({ name: "catalog" })}
          icon={BookOpen}
          accent="cyan"
        />
      ) : (
        <div className="grid gap-3">
          {courses.map((c) => {
            const progress = c.enrollment?.progress ?? 0
            const lastAcc = c.enrollment?.lastAccessed
            return (
              <div
                key={c.id}
                className="group card-premium relative flex items-center gap-4 rounded-xl p-4"
              >
                <button
                  onClick={() => navigate({ name: "course", courseId: c.id })}
                  className="absolute inset-0 z-0"
                  aria-label={`Open course ${c.title}`}
                />
                <div
                  className={cn(
                    "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/50 font-mono text-sm font-bold",
                    "bg-violet-500/10 text-violet-200",
                  )}
                  aria-hidden
                >
                  {c.shortName.slice(0, 4)}
                </div>
                <div className="relative z-10 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-sm text-foreground group-hover:text-violet-200 transition-colors">
                      {c.title}
                    </h3>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                      {progress}%
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                    {c.category} · {c.lessonCount} lessons · {c.durationHours}h
                    {lastAcc && (
                      <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">
                        · Last: {relativeTime(lastAcc)}
                      </span>
                    )}
                  </p>
                  <div className="mt-2">
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="relative z-10 shrink-0 gap-1.5 bg-primary hover:bg-primary/90"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ name: "course", courseId: c.id })
                  }}
                >
                  <PlayCircle className="size-3.5" aria-hidden />
                  Resume
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ============================================================
   3c. Active Labs - running lab environments
   ============================================================ */

function ActiveLabs({
  labs, loading,
}: {
  labs: LabListItem[]
  loading: boolean
}) {
  const { navigate } = useAppStore()

  return (
    <section aria-label="Active labs">
      <SectionHeader
        icon={FlaskConical}
        label="Active Labs"
        tone="emerald"
        actionLabel="Browse Labs"
        onAction={() => navigate({ name: "labs" })}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : labs.length === 0 ? (
        <EmptyState
          title="No Active Labs"
          description="Start a new lab environment. Browse the cyber range and spin up your first target."
          ctaLabel="Browse Labs"
          onCta={() => navigate({ name: "labs" })}
          icon={FlaskConical}
          accent="emerald"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {labs.slice(0, 4).map((lab) => (
            <LabCard
              key={lab.id}
              title={lab.title}
              category={lab.category}
              difficulty={DIFFICULTY_MAP[lab.difficulty] ?? "Medium"}
              xp={lab.points}
              status="online"
              ip={pseudoIp(lab.id)}
              services={deriveServices(lab)}
              onClick={() => navigate({ name: "lab", labSlug: lab.slug })}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ============================================================
   3d. Daily Objective
   ============================================================ */

function DailyObjective({ labsSolvedToday }: { labsSolvedToday: number }) {
  const target = 1
  const done = Math.min(labsSolvedToday, target)
  const complete = done >= target
  const progressPct = Math.round((done / target) * 100)

  return (
    <section aria-label="Daily objective">
      <SectionHeader icon={Target} label="Daily Objective" tone="amber" />
      <div className="card-premium relative overflow-hidden rounded-xl p-5 scanlines">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.15 85 / 0.4), transparent 70%)",
          }}
        />
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                Complete one Web Security lab
              </h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Resets at 00:00 UTC
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-mono text-[10px]",
                complete
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300",
              )}
            >
              {complete ? "COMPLETE" : "IN PROGRESS"}
            </Badge>
          </div>

          <div>
            <div className="flex items-center justify-between font-mono text-[11px] mb-1.5">
              <span className="uppercase tracking-wider text-muted-foreground">
                Progress
              </span>
              <span className="tabular-nums text-foreground">
                {done}/{target}
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Reward
            </span>
            <span className="flex items-center gap-1.5 font-mono text-sm font-semibold text-amber-300">
              <Zap className="size-3.5" aria-hidden />
              +250 XP
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   3e. Achievements - recent badges (grid of 6)
   ============================================================ */

function AchievementsPanel({
  achievements, earnedCount, totalCount, loading,
}: {
  achievements: AchievementItem[]
  earnedCount: number
  totalCount: number
  loading: boolean
}) {
  const { navigate } = useAppStore()
  const earned = achievements.filter((a) => a.earned).slice(0, 6)

  return (
    <section aria-label="Achievements">
      <SectionHeader
        icon={Award}
        label="Achievements"
        tone="violet"
        actionLabel="View All"
        onAction={() => navigate({ name: "achievements" })}
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="card-premium rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Earned Badges
            </span>
            <span className="font-mono text-[11px] tabular-nums text-violet-300">
              {earnedCount} / {totalCount}
            </span>
          </div>

          {earned.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-6 text-center">
              <Award className="mx-auto size-6 text-muted-foreground/60" aria-hidden />
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                No badges earned yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete lessons and labs to unlock achievements.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {earned.map((a) => {
                const Icon = ACHIEVEMENT_ICON_MAP[a.icon] ?? Award
                const colorClass =
                  ACHIEVEMENT_COLOR_MAP[a.color] ?? ACHIEVEMENT_COLOR_MAP.violet
                return (
                  <div
                    key={a.code}
                    title={`${a.title} - ${a.description}`}
                    className={cn(
                      "group flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-transform hover:scale-[1.04]",
                      colorClass,
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="font-mono text-[9px] uppercase tracking-wider leading-tight">
                      {a.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* ============================================================
   3f. Leaderboard - Top 5 + user's rank
   ============================================================ */

function LeaderboardPanel({
  topUsers, currentUser, totalUsers, loading,
}: {
  topUsers: LeaderboardEntry[]
  currentUser: LeaderboardEntry | null
  totalUsers: number
  loading: boolean
}) {
  const { navigate } = useAppStore()
  const top5 = topUsers.slice(0, 5)
  const showUserRow =
    currentUser && !top5.some((u) => u.id === currentUser.id)

  return (
    <section aria-label="Leaderboard">
      <SectionHeader
        icon={Trophy}
        label="Leaderboard"
        tone="amber"
        actionLabel="View Full"
        onAction={() => navigate({ name: "leaderboard" })}
      />

      {loading ? (
        <Skeleton className="h-[260px] rounded-xl" />
      ) : (
        <div className="card-premium rounded-xl p-4 space-y-1.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Top Operators
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {totalUsers.toLocaleString()} total
            </span>
          </div>

          {top5.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
              <Trophy className="mx-auto size-6 text-muted-foreground/60" aria-hidden />
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                No rankings yet
              </p>
            </div>
          ) : (
            <ol className="space-y-1">
              {top5.map((u) => (
                <LeaderboardRow key={u.id} entry={u} />
              ))}
              {showUserRow && currentUser && (
                <>
                  <li className="my-1 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    <span className="h-px flex-1 bg-border/40" />
                    <span>· · ·</span>
                    <span className="h-px flex-1 bg-border/40" />
                  </li>
                  <LeaderboardRow entry={currentUser} />
                </>
              )}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankColor =
    entry.rank === 1
      ? "text-amber-300"
      : entry.rank === 2
        ? "text-slate-300"
        : entry.rank === 3
          ? "text-orange-300"
          : "text-muted-foreground"

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
        entry.isMe
          ? "border border-violet-500/40 bg-violet-500/10"
          : "hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "w-6 shrink-0 text-center font-mono text-sm font-bold tabular-nums",
          rankColor,
        )}
        aria-hidden
      >
        {entry.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {entry.name}
          {entry.isMe && (
            <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-violet-300">
              · YOU
            </span>
          )}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Lvl {entry.level} · {entry.rankTitle}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-amber-300">
        {entry.xp.toLocaleString()} XP
      </span>
    </li>
  )
}

/* ============================================================
   3g. Skill Profile - 6 skill bars
   ============================================================ */

function SkillProfile({
  skills,
}: {
  skills: Array<{
    key: string; label: string; color: string
    total: number; solved: number; pct: number
  }>
}) {
  const { navigate } = useAppStore()
  return (
    <section aria-label="Skill profile">
      <SectionHeader
        icon={RadarIcon}
        label="Skill Profile"
        tone="cyan"
        actionLabel="Explore Skill Tree"
        onAction={() => navigate({ name: "skill-tree" })}
      />
      <div className="card-premium rounded-xl p-4 space-y-3">
        {skills.map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="uppercase tracking-wider text-foreground/90">
                {s.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {s.solved}/{s.total} · {s.pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-border/40 bg-[oklch(0.1_0.008_270)]">
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r", s.color)}
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================
   4. Activity Feed - recent activity timeline
   ============================================================ */

function ActivityFeed({
  activities, loading,
}: {
  activities: ActivityItem[]
  loading: boolean
}) {
  const { navigate } = useAppStore()

  return (
    <section aria-label="Recent activity">
      <SectionHeader
        icon={Activity}
        label="Activity Feed"
        tone="emerald"
        actionLabel="View Analytics"
        onAction={() => navigate({ name: "learning-analytics" })}
      />

      {loading ? (
        <Skeleton className="h-[220px] rounded-xl" />
      ) : activities.length === 0 ? (
        <EmptyState
          title="No Activity Yet"
          description="Your recent activity will appear here as you complete lessons, solve labs, and earn achievements."
          ctaLabel="Start Learning"
          onCta={() => navigate({ name: "catalog" })}
          icon={Activity}
          accent="emerald"
        />
      ) : (
        <div className="card-premium rounded-xl p-4 sm:p-5">
          <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border/50">
            {activities.map((a, idx) => {
              const meta = ACTIVITY_META[a.type] ?? {
                icon: Activity,
                label: a.type.replace(/_/g, " "),
                color: "text-muted-foreground",
                tint: "bg-muted/30",
              }
              const Icon = meta.icon
              return (
                <li
                  key={a.id}
                  className="relative flex items-start gap-3"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span
                    className={cn(
                      "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50",
                      meta.tint,
                      meta.color,
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="text-sm font-medium text-foreground">
                        {meta.label}
                      </p>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {relativeTime(a.createdAt)}
                      </span>
                    </div>
                    {a.meta && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
                        {a.meta}
                      </p>
                    )}
                    {a.xp > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                        <Zap className="size-3" aria-hidden />
                        +{a.xp} XP
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}

/* ============================================================
   Shared building blocks
   ============================================================ */

const TONE_MAP: Record<string, { text: string; icon: string }> = {
  violet: { text: "text-violet-300", icon: "text-violet-300" },
  cyan: { text: "text-cyan-300", icon: "text-cyan-300" },
  emerald: { text: "text-emerald-300", icon: "text-emerald-300" },
  amber: { text: "text-amber-300", icon: "text-amber-300" },
  rose: { text: "text-rose-300", icon: "text-rose-300" },
}

function SectionHeader({
  icon: Icon, label, tone = "violet", actionLabel, onAction,
}: {
  icon: typeof BookOpen
  label: string
  tone?: keyof typeof TONE_MAP | string
  actionLabel?: string
  onAction?: () => void
}) {
  const t = TONE_MAP[tone] ?? TONE_MAP.violet
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-3.5", t.icon)} aria-hidden />
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/90">
          {label}
        </h2>
      </div>
      {actionLabel && onAction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="h-7 gap-1 px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {actionLabel}
          <ChevronRight className="size-3" aria-hidden />
        </Button>
      )}
    </div>
  )
}

const ACCENT_MAP: Record<string, { border: string; bg: string; text: string }> = {
  violet: { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-300" },
  cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/5", text: "text-cyan-300" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-300" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-300" },
  rose: { border: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-300" },
}

function EmptyState({
  title, description, ctaLabel, onCta, icon: Icon, accent = "violet",
}: {
  title: string
  description: string
  ctaLabel: string
  onCta: () => void
  icon: typeof BookOpen
  accent?: keyof typeof ACCENT_MAP | string
}) {
  const a = ACCENT_MAP[accent] ?? ACCENT_MAP.violet
  return (
    <div
      className={cn(
        "card-premium relative overflow-hidden rounded-xl border border-dashed p-8 text-center",
        a.border, a.bg,
      )}
    >
      <div className="absolute inset-0 bg-grid-fine opacity-20 pointer-events-none" />
      <div className="relative z-10">
        <div
          className={cn(
            "mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border",
            a.border, a.bg, a.text,
          )}
          aria-hidden
        >
          <Icon className="size-5" />
        </div>
        <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
          {description}
        </p>
        <Button
          onClick={onCta}
          size="sm"
          className={cn(
            "mt-4 gap-1.5 font-mono text-[11px] uppercase tracking-wider",
            "bg-primary hover:bg-primary/90",
          )}
        >
          {ctaLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/* ============================================================
   2a-bis. Refer & Earn — referral link + share + stats widget
   ============================================================ */
interface ReferralStats {
  total: number
  pending: number
  enrolled: number
  rewarded: number
  expired: number
}
interface ReferralItem {
  id: string
  status: string
  referredEmail: string | null
  referredUserId: string | null
  couponCode: string | null
  createdAt: string
  updatedAt: string
}
interface MyReferralResponse {
  referrals: ReferralItem[]
  stats: ReferralStats
  referralId: string | null
  referralLink: string | null
}

function ReferEarnPanel() {
  const [copied, setCopied] = React.useState(false)

  // Fetch the user's referrals + stats. We use a queryKey that won't collide
  // with anything else and refetch on window focus so a freshly-rewarded
  // referral shows up promptly.
  const { data, isLoading, refetch } = useQuery<MyReferralResponse>({
    queryKey: ["dashboard", "referral", "my"],
    queryFn: () => api<MyReferralResponse>("/api/referral/my"),
    staleTime: 30 * 1000,
  })

  // Lazily generate a referral link on first "Get link" interaction — most
  // students won't need one until they decide to share, so we don't pre-create
  // rows for every dashboard visit.
  const [generating, setGenerating] = React.useState(false)
  async function ensureLink() {
    if (data?.referralLink) return
    setGenerating(true)
    try {
      await api("/api/referral/create", { method: "POST" })
      await refetch()
    } catch (e: any) {
      toast.error(e.message || "Failed to generate referral link")
    } finally {
      setGenerating(false)
    }
  }

  const link = data?.referralLink ?? null
  const stats = data?.stats ?? { total: 0, pending: 0, enrolled: 0, rewarded: 0, expired: 0 }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Referral link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't access clipboard — long-press the link to copy.")
    }
  }

  function shareOnWhatsApp() {
    if (!link) return
    const text = `I'm training on GuardianX Academy — hands-on cyber security labs + certification prep. Sign up with my link and we both get a discount:\n${link}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <section aria-label="Refer and earn">
      <SectionHeader icon={Gift} label="Refer & Earn" tone="violet" />
      <div className="card-premium relative overflow-hidden rounded-xl p-5 scanlines">
        {/* glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.18 295 / 0.4), transparent 70%)",
          }}
        />
        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-300"
              aria-hidden
            >
              <Gift className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                Invite friends, earn discounts
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Share your link. When a friend enrolls, you both get a{" "}
                <span className="font-semibold text-violet-300">15% off</span>{" "}
                coupon.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2">
            <ReferralStat
              icon={Users}
              label="Referrals"
              value={stats.total}
              loading={isLoading}
              tone="violet"
            />
            <ReferralStat
              icon={UserCheck}
              label="Enrolled"
              value={stats.enrolled}
              loading={isLoading}
              tone="cyan"
            />
            <ReferralStat
              icon={Ticket}
              label="Rewards"
              value={stats.rewarded}
              loading={isLoading}
              tone="emerald"
            />
          </div>

          {/* Link box */}
          {link ? (
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Your referral link
              </label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 truncate rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-[11px] text-foreground/90">
                  {link}
                </div>
                <Button
                  size="sm"
                  onClick={copyLink}
                  className="gap-1.5 font-mono text-[11px] uppercase tracking-wider bg-violet-600 hover:bg-violet-500"
                  aria-label="Copy referral link"
                >
                  {copied ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={shareOnWhatsApp}
                className="w-full gap-2 border-violet-500/40 bg-violet-500/5 font-mono text-[11px] uppercase tracking-wider text-violet-200 hover:bg-violet-500/15"
              >
                <Send className="size-3.5" aria-hidden />
                Share on WhatsApp
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={ensureLink}
              disabled={generating}
              className="w-full gap-2 font-mono text-[11px] uppercase tracking-wider bg-violet-600 hover:bg-violet-500"
            >
              <Sparkles className="size-3.5" aria-hidden />
              {generating ? "Generating..." : "Get my referral link"}
            </Button>
          )}

          {/* Latest rewarded coupon — surfaced once a referral converts. */}
          {data?.referrals?.some((r) => r.status === "REWARDED" && r.couponCode) && (
            <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <Ticket className="size-3.5 text-emerald-300" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Your reward
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-300">
                {data.referrals.find((r) => r.status === "REWARDED" && r.couponCode)?.couponCode}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ReferralStat({
  icon: Icon, label, value, loading, tone,
}: {
  icon: typeof BookOpen
  label: string
  value: number
  loading: boolean
  tone: string
}) {
  const t = TONE_MAP[tone] ?? TONE_MAP.violet
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2.5 py-2 text-center">
      <Icon className={cn("mx-auto size-3.5", t.icon)} aria-hidden />
      <div className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
        {loading ? <span className="text-muted-foreground/50">—</span> : value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

/* ============================================================
   2b. Progress Overview — Enrolled / Completed / In-Progress / Certs
   ============================================================ */
function ProgressOverview({
  enrolled, completed, inProgress, certificates, xp, level, loading,
}: {
  enrolled: number
  completed: number
  inProgress: number
  certificates: number
  xp: number
  level: number
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] rounded-xl" />
        ))}
      </div>
    )
  }

  const tiles: {
    icon: typeof BookOpen
    label: string
    value: number
    suffix?: string
    color: string
    tint: string
  }[] = [
    { icon: BookMarked, label: "Courses Enrolled", value: enrolled, color: "text-cyan-300", tint: "bg-cyan-500/10" },
    { icon: Hourglass, label: "In Progress", value: inProgress, color: "text-amber-300", tint: "bg-amber-500/10" },
    { icon: ShieldCheck, label: "Completed", value: completed, color: "text-emerald-300", tint: "bg-emerald-500/10" },
    { icon: Award, label: "Certificates", value: certificates, color: "text-violet-300", tint: "bg-violet-500/10" },
  ]

  return (
    <section aria-label="Progress overview" className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((s) => (
          <Card
            key={s.label}
            className="relative overflow-hidden p-4 card-premium"
          >
            <div className="flex items-start gap-3">
              <div className={cn("inline-flex size-9 items-center justify-center rounded-lg", s.tint)}>
                <s.icon className={cn("size-4", s.color)} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                  {s.label}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* condensed XP / level summary band */}
      <div className="card-premium rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-amber-300" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Total XP
          </span>
          <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
            {xp.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="size-3.5 text-emerald-300" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Current Level
          </span>
          <span className="font-mono text-sm font-bold text-emerald-300 tabular-nums">{level}</span>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   3b-i. Weekly XP Chart — Recharts bar chart, last 7 days
   ============================================================ */
function WeeklyXpChart({
  data, loading,
}: {
  data: WeeklyXpItem[]
  loading: boolean
}) {
  const chartData = React.useMemo(() => {
    return data.map((d) => {
      const dt = new Date(d.date + "T00:00:00")
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()]
      return { day, xp: d.xp, count: d.count, date: d.date }
    })
  }, [data])
  const totalXp = chartData.reduce((s, d) => s + d.xp, 0)

  return (
    <section aria-label="Weekly XP chart">
      <SectionHeader icon={BarChart2} label="Weekly XP" tone="violet" />
      <Card className="card-premium p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {totalXp.toLocaleString()} <span className="text-xs font-mono text-muted-foreground">XP this week</span>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-amber-500/30 bg-amber-500/10 text-amber-300">
            7d
          </Badge>
        </div>
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
            No activity yet this week.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 270 / 0.25)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "oklch(0.7 0.02 270 / 0.7)", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "oklch(0.3 0.02 270 / 0.4)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.7 0.02 270 / 0.6)", fontSize: 9, fontFamily: "monospace" }}
                axisLine={{ stroke: "oklch(0.3 0.02 270 / 0.4)" }}
                tickLine={false}
                allowDecimals={false}
                width={36}
              />
              <RTooltip
                cursor={{ fill: "oklch(0.6 0.18 295 / 0.08)" }}
                contentStyle={{
                  background: "oklch(0.18 0.02 270)",
                  border: "1px solid oklch(0.3 0.02 270 / 0.5)",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "oklch(0.95 0.02 270)",
                }}
                labelStyle={{ color: "oklch(0.7 0.02 270 / 0.9)" }}
                formatter={(value: any, _name, item: any) => [
                  `${value} XP (${item?.payload?.count ?? 0} activities)`,
                  "Earned",
                ]}
              />
              <Bar dataKey="xp" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.xp > 0 ? "oklch(0.65 0.18 295)" : "oklch(0.35 0.02 270)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </section>
  )
}

/* ============================================================
   3b-ii. Skill Radar — Recharts RadarChart across skill domains
   ============================================================ */
function SkillRadar({
  skills, loading,
}: {
  skills: SkillProfileItem[]
  loading: boolean
}) {
  // Map skill items to a 0-100 scale for the radar. Each entry needs at
  // least 3 axes to render a polygon, so we pad with placeholders if
  // fewer than 3.
  const radarData = React.useMemo(() => {
    if (skills.length === 0) return []
    // Use a max of 6 categories so the radar stays readable. If there are
    // fewer than 3, pad with "—" entries so the radar still renders a
    // polygon instead of a flat line.
    const top = skills.slice(0, 6)
    while (top.length < 3) {
      top.push({ key: `pad-${top.length}`, label: "—", solved: 0, total: 0, pct: 0 })
    }
    return top.map((s) => ({
      domain: s.label.length > 12 ? s.label.slice(0, 11) + "…" : s.label,
      level: s.pct,
      fullMark: 100,
    }))
  }, [skills])

  return (
    <section aria-label="Skill radar">
      <SectionHeader icon={RadarIcon} label="Skill Radar" tone="cyan" />
      <Card className="card-premium p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : radarData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
            Solve labs to populate your skill profile.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="oklch(0.35 0.02 270 / 0.4)" />
              <PolarAngleAxis
                dataKey="domain"
                tick={{ fill: "oklch(0.75 0.02 270 / 0.85)", fontSize: 10, fontFamily: "monospace" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "oklch(0.6 0.02 270 / 0.6)", fontSize: 9, fontFamily: "monospace" }}
                tickCount={5}
              />
              <Radar
                name="Skill"
                dataKey="level"
                stroke="oklch(0.7 0.16 200)"
                fill="oklch(0.7 0.16 200)"
                fillOpacity={0.28}
                strokeWidth={1.5}
                isAnimationActive
              />
              <RTooltip
                contentStyle={{
                  background: "oklch(0.18 0.02 270)",
                  border: "1px solid oklch(0.3 0.02 270 / 0.5)",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "oklch(0.95 0.02 270)",
                }}
                labelStyle={{ color: "oklch(0.7 0.02 270 / 0.9)" }}
                formatter={(value: any) => [`${value}%`, "Skill level"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </section>
  )
}

/* ============================================================
   3d-ii. Streak Tracker — visual flame + last-7-days dots
   ============================================================ */
function StreakTracker({
  streak, weeklyXp, loading,
}: {
  streak: number
  weeklyXp: WeeklyXpItem[]
  loading: boolean
}) {
  // 7-day activity dots — a dot is "lit" if there was any activity that day
  const dots = React.useMemo(() => {
    return weeklyXp.map((d) => {
      const dt = new Date(d.date + "T00:00:00")
      const day = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dt.getDay()]
      return { date: d.date, day, xp: d.xp, active: d.count > 0 }
    })
  }, [weeklyXp])

  // flame intensity by streak length
  const flameTone =
    streak >= 30 ? "text-rose-400"
    : streak >= 14 ? "text-orange-400"
    : streak >= 7 ? "text-amber-400"
    : streak >= 3 ? "text-amber-300"
    : streak >= 1 ? "text-amber-300/80"
    : "text-muted-foreground/40"
  const flameGlow =
    streak >= 7 ? "drop-shadow-[0_0_18px] drop-shadow-amber-500/40"
    : streak >= 3 ? "drop-shadow-[0_0_10px] drop-shadow-amber-500/30"
    : ""

  return (
    <section aria-label="Streak tracker">
      <SectionHeader icon={Flame} label="Streak Tracker" tone="amber" />
      <Card className="card-premium p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex items-center gap-4">
            {/* Flame + count */}
            <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-20">
              <motion.div
                animate={streak > 0 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{
                  duration: 1.6,
                  repeat: streak > 0 ? Infinity : 0,
                  ease: "easeInOut",
                }}
                className={cn("relative", flameGlow)}
              >
                <Flame className={cn("size-12", flameTone)} strokeWidth={1.5} />
              </motion.div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums leading-none">
                  {streak}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                  Day streak
                </div>
              </div>
            </div>
            {/* Divider */}
            <div className="h-20 w-px bg-border/40 shrink-0" />
            {/* 7-day dots */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last 7 days
                </span>
                <span className="font-mono text-[10px] text-amber-300/80">
                  {dots.filter((d) => d.active).length} / 7 active
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {dots.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full aspect-square rounded-md border transition-all",
                        d.active
                          ? "bg-amber-500/40 border-amber-500/50"
                          : "bg-muted/20 border-border",
                      )}
                      title={`${d.date}: ${d.active ? `${d.xp} XP` : "no activity"}`}
                    />
                    <div className="text-[9px] font-mono text-muted-foreground">{d.day}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}

/* ============================================================
   3c. Upcoming Deadlines — assignments / live sessions / exams
   ============================================================ */
function UpcomingDeadlines({
  deadlines, loading,
}: {
  deadlines: DeadlineItem[]
  loading: boolean
}) {
  const { navigate } = useAppStore()

  const typeMeta: Record<DeadlineItem["type"], { icon: typeof BookOpen; label: string; tone: string; tint: string }> = {
    "assignment": { icon: FileText, label: "Assignment", tone: "text-amber-300", tint: "bg-amber-500/10" },
    "live-session": { icon: Video, label: "Live Session", tone: "text-rose-300", tint: "bg-rose-500/10" },
    "exam": { icon: ShieldCheck, label: "Exam", tone: "text-violet-300", tint: "bg-violet-500/10" },
  }

  return (
    <section aria-label="Upcoming deadlines">
      <SectionHeader
        icon={Calendar}
        label="Upcoming Deadlines"
        tone="amber"
        actionLabel="Calendar"
        onAction={() => navigate({ name: "admin-batch-calendar" })}
      />
      {loading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : deadlines.length === 0 ? (
        <EmptyState
          title="No Deadlines This Fortnight"
          description="You're all caught up. Upcoming assignments, live sessions, and exams (next 14 days) will appear here."
          ctaLabel="Browse Catalog"
          onCta={() => navigate({ name: "catalog" })}
          icon={Calendar}
          accent="amber"
        />
      ) : (
        <Card className="card-premium p-0 overflow-hidden">
          <div className="max-h-96 overflow-y-auto pr-1 custom-scroll">
            <ol className="divide-y divide-border/40">
              {deadlines.map((d) => {
                const meta = typeMeta[d.type]
                const due = new Date(d.dueDate)
                const now = new Date()
                const msUntil = due.getTime() - now.getTime()
                const hoursUntil = Math.round(msUntil / 3600000)
                const daysUntil = Math.round(hoursUntil / 24)
                const overdue = msUntil < 0
                const imminent = !overdue && hoursUntil <= 24
                const urgencyLabel = overdue
                  ? "Overdue"
                  : hoursUntil <= 24
                    ? `${hoursUntil}h left`
                    : `${daysUntil}d left`
                const urgencyColor = overdue
                  ? "text-rose-300 bg-rose-500/10 border-rose-500/30"
                  : imminent
                    ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                    : "text-muted-foreground bg-muted/30 border-border/40"

                return (
                  <li
                    key={`${d.type}-${d.id}`}
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20",
                    )}
                  >
                    <div className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", meta.tint)}>
                      <meta.icon className={cn("size-4", meta.tone)} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {meta.label}
                        {d.courseTitle && <span className="normal-case tracking-normal"> · {d.courseTitle}</span>}
                        {d.meta && <span className="normal-case tracking-normal"> · {d.meta}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-[9px] uppercase tracking-wider", urgencyColor)}
                      >
                        {urgencyLabel}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </Card>
      )}
    </section>
  )
}

// ============================================================
// QuickWidgets — batch schedule + recommended next course
// ============================================================
function QuickWidgets({ userId, navigate }: { userId?: string; navigate: any }) {
  // Fetch upcoming batches
  const { data: batchesData } = useQuery<{ batches: any[] }>({
    queryKey: ["dashboard-batches"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/training-batches")
        if (!res.ok) return { batches: [] }
        return res.json()
      } catch { return { batches: [] } }
    },
    staleTime: 60_000,
  })
  const upcomingBatches = (batchesData?.batches ?? []).slice(0, 2)

  // Fetch recommended courses (not enrolled)
  const { data: recData } = useQuery<{ courses: any[] }>({
    queryKey: ["dashboard-recommended"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/courses?limit=3")
        if (!res.ok) return { courses: [] }
        return res.json()
      } catch { return { courses: [] } }
    },
    staleTime: 60_000,
  })
  const recommended = (recData?.courses ?? []).slice(0, 2)

  if (upcomingBatches.length === 0 && recommended.length === 0) return null

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Upcoming batches */}
      {upcomingBatches.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Batch Schedule</h3>
          </div>
          {upcomingBatches.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-500/5 transition-colors cursor-pointer" onClick={() => b.slug && (window.location.href = `/batches/${b.slug}`)}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{b.name}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Clock className="h-2.5 w-2.5" /> {b.startDate || "TBA"}
                  <span>·</span>
                  <Video className="h-2.5 w-2.5" /> {b.mode}
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          ))}
        </Card>
      )}

      {/* Recommended courses */}
      {recommended.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Next</h3>
          </div>
          {recommended.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-500/5 transition-colors cursor-pointer" onClick={() => navigate({ name: "course", courseId: c.id })}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.title}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <BookOpen className="h-2.5 w-2.5" /> {c.category}
                  <span>·</span>
                  <span className="capitalize">{c.level}</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
