"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore, type View } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crosshair,
  Crown,
  Eye,
  Layers,
  Lock,
  Network,
  Rocket,
  Server,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Video,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCmsIcon } from "@/lib/cms-icons"
import { ParticleLogo } from "@/components/platform/particle-logo"
import { CertificateVerifyCard } from "@/components/platform/certificate-verify-card"
import { usePageContent, getContent } from "@/lib/use-content"
import {
  CyberTerminal,
  MissionCard,
  XPBar,
  RankBadge,
  SkillNode,
  StatTile,
  StatusDot,
} from "@/components/cyber"
import type { TerminalLine } from "@/components/cyber"
import { AdvancedSkillMap } from "@/components/home/advanced-skill-map"
import { PlatformActivityFeed } from "@/components/platform/activity-feed"
import {
  PILLARS,
  RANGE_SERVICES,
  LEARNING_PATHS,
  BRANCH_ANGLES,
  BRANCHES,
  SKILL_DOMAINS,
  SKILL_MAP_DATA,
  DAILY_OBJECTIVES,
  RANK_LADDER,
  CAREER_SKILLS,
  CAREER_ROLES,
  INSTITUTION_TYPES,
  STORY_STAGES,
  STORIES,
  TRUST_STATS,
  FALLBACK_PARTNERS,
  AUDIENCES,
  UPCOMING_BATCHES,
  SCHEDULES,
  METHODOLOGY_STEPS,
  // INSTRUCTORS removed - now fetched from /api/instructors (real DB data)
  type TechnologyPartner,
  type PlatformStat,
  type LearningPathRow,
  type RankRow,
} from "@/views/home-data"

/* ---------------------------------------------------------------- *
 *  HomeView - GuardianX Academy cinematic 13-section homepage      *
 *  Tells the full story: hero → products → range → paths →         *
 *  skills → missions → gamification → careers → institutions →     *
 *  certifications → stories → trust → final CTA.                   *
 *  Static data + types live in `@/views/home-data`.               *
 *  AdvancedSkillMap lives in `@/components/home/advanced-skill-map`.*
 * ---------------------------------------------------------------- */

// Shared animation variants - no scroll triggers, just simple fades.
const FADE_UP = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
}

const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.35, ease: "easeOut" },
}

export function HomeView() {
  const { navigate } = useAppStore()

  /* ------------------------------------------------------------- *
   *  CMS content with fallbacks                                   *
   * ------------------------------------------------------------- */
  const cms = usePageContent("home")
  const cmsData = cms.data

  const heroBadge = getContent(
    cmsData,
    "hero",
    "badge",
    "WORLD-CLASS CYBER SECURITY EDUCATION"
  )
  // Title is split into prefix + accent so the accent can receive the
  // premium gradient treatment.
  const heroTitlePrefix = getContent(
    cmsData,
    "hero",
    "title",
    "Master cybersecurity with"
  )
  const heroTitleAccent = getContent(
    cmsData,
    "hero",
    "titleAccent",
    "expert instructors."
  )
  const heroDescription = getContent(
    cmsData,
    "hero",
    "description",
    "Learn cybersecurity through live instructor-led training, hands-on labs, structured certification batches, expert study materials and real-world practice."
  )
  const heroCtaPrimary = getContent(cmsData, "hero", "ctaPrimary", "EXPLORE TRAINING")
  const heroCtaSecondary = getContent(cmsData, "hero", "ctaSecondary", "VIEW UPCOMING BATCHES")
  const heroCtaTertiary = getContent(cmsData, "hero", "ctaTertiary", "FOR INSTITUTIONS")

  const platformEyebrow = getContent(cmsData, "platform", "eyebrow", "THE PLATFORM")
  const platformTitle = getContent(
    cmsData,
    "platform",
    "title",
    "One platform. Every angle of cyber security."
  )
  const platformDesc = getContent(
    cmsData,
    "platform",
    "description",
    "GuardianX is an end-to-end cyber security training platform - from beginner foundations through advanced certifications and real-world practice labs."
  )

  const rangeTitle = getContent(
    cmsData,
    "range",
    "title",
    "Don't watch someone hack. Hack it yourself."
  )
  const rangeDesc = getContent(
    cmsData,
    "range",
    "description",
    "Spin up a real isolated target in seconds. Probe it, break it, capture the flag - all from your browser."
  )

  const pathsTitle = getContent(cmsData, "paths", "title", "Choose your mission.")
  const pathsDesc = getContent(
    cmsData,
    "paths",
    "description",
    "Structured learning paths that take you from zero to certified - each with a clear outcome and timeline."
  )

  const skillsTitle = getContent(cmsData, "skills", "title", "Map your skills.")
  const skillsDesc = getContent(
    cmsData,
    "skills",
    "description",
    "Visualize every skill you'll earn across the offensive, defensive, and forensic spectrum."
  )

  const missionTitle = getContent(cmsData, "mission", "title", "Your command center.")
  const missionDesc = getContent(
    cmsData,
    "mission",
    "description",
    "Track XP, missions, ranks, and daily objectives from one unified dashboard."
  )

  const gamifyTitle = getContent(cmsData, "gamify", "title", "Level up your defense.")
  const gamifyDesc = getContent(
    cmsData,
    "gamify",
    "description",
    "Every action earns XP. Climb the ranks from RECRUIT to ELITE GUARDIAN."
  )

  const careerTitle = getContent(cmsData, "career", "title", "Turn skills into careers.")
  const careerDesc = getContent(
    cmsData,
    "career",
    "description",
    "We map your progress against real job roles and tell you exactly what's left."
  )

  const institutionsTitle = getContent(
    cmsData,
    "institutions",
    "title",
    "GuardianX for Institutions."
  )
  const institutionsSub = getContent(
    cmsData,
    "institutions",
    "subtitle",
    "Teach. Practice. Track. Certify."
  )

  const certTitle = getContent(cmsData, "cert", "title", "Prove what you know.")
  const certDesc = getContent(
    cmsData,
    "cert",
    "description",
    "Every certificate is cryptographically signed and publicly verifiable."
  )

  const storiesTitle = getContent(cmsData, "stories", "title", "From learning to career.")
  const storiesDesc = getContent(
    cmsData,
    "stories",
    "description",
    "A typical GuardianX learner journey - from day one to the offer letter."
  )

  const trustLabel = getContent(
    cmsData,
    "trust",
    "label",
    "Built around technologies used across modern cybersecurity teams"
  )

  const finalCtaTitle = getContent(cmsData, "finalCta", "title", "Become unstoppable.")
  const finalCtaSubtitle = getContent(
    cmsData,
    "finalCta",
    "subtitle",
    "Join 12,000+ defenders advancing their careers."
  )
  const finalCtaPrimary = getContent(cmsData, "finalCta", "ctaPrimary", "START FREE TODAY")
  const finalCtaSecondary = getContent(cmsData, "finalCta", "ctaSecondary", "TALK TO US")

  /* ------------------------------------------------------------- *
   *  Static demo content for the cyber range showcase terminal     *
   * ------------------------------------------------------------- */
  const nmapLines: TerminalLine[] = React.useMemo(
    () => [
      { type: "command", text: "nmap -sV -p 22,80,3306 10.10.24.14" },
      { type: "output", text: "Starting Nmap 7.94 ( https://nmap.org )" },
      { type: "output", text: "Nmap scan report for 10.10.24.14" },
      { type: "output", text: "Host is up (0.0031s latency)." },
      { type: "output", text: "PORT     STATE SERVICE  VERSION" },
      { type: "output", text: "22/tcp   open  ssh      OpenSSH 8.2p1 Ubuntu" },
      { type: "output", text: "80/tcp   open  http     Apache httpd 2.4.41 ((DVWA))" },
      { type: "output", text: "3306/tcp open  mysql    MySQL 5.7.31" },
      { type: "success", text: "3 services discovered - DVWA target mapped" },
    ],
    []
  )

  /* ------------------------------------------------------------- *
   *  Real DB-backed content via public APIs                       *
   *  Each query falls back to a hardcoded array when the API      *
   *  fails so the homepage never goes blank.                      *
   * ------------------------------------------------------------- */
  const { data: partnersData } = useQuery<{ partners: TechnologyPartner[]; count: number } | null>({
    queryKey: ["home-technology-partners"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/technology-partners")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  const techPartners = partnersData?.partners ?? FALLBACK_PARTNERS

  const { data: statsData } = useQuery<{ stats: PlatformStat[]; count: number } | null>({
    queryKey: ["home-platform-stats"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/platform-stats")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  const platformStats = (statsData?.stats ?? []).slice(0, 4)

  const { data: pathsData } = useQuery<{ learningPaths: LearningPathRow[]; count: number } | null>({
    queryKey: ["home-learning-paths"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/learning-paths")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  const learningPathRows = pathsData?.learningPaths ?? []

  const { data: ranksData } = useQuery<{ ranks: RankRow[]; count: number } | null>({
    queryKey: ["home-ranks"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/ranks")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  const rankRows = ranksData?.ranks ?? []

  /* ---------------------- INSTRUCTORS (DB-backed) ------------------------- *
   *  Real instructor profiles from /api/instructors. The homepage shows   *
   *  these instead of hardcoded dummy data. Falls back to an empty state  *
   *  if the API fails.                                                     *
   * ---------------------------------------------------------------------- */
  type InstructorRow = {
    id: string
    name: string
    title: string | null
    avatar: string | null
    bio: string | null
    profile: {
      expertise: string | null
      yearsExperience: number | null
      certifications: string | null
    } | null
  }
  const { data: instructorsData } = useQuery<{ instructors: InstructorRow[]; count: number } | null>({
    queryKey: ["home-instructors"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/instructors")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  const instructorRows = instructorsData?.instructors ?? []

  /* ---------------------- UPCOMING BATCHES (DB-backed) --------------------- *
   *  Public list of live instructor-led certification batches.             *
   *  Falls back to the static `UPCOMING_BATCHES` array when the API fails *
   *  so the homepage never goes blank.                                    *
   * ---------------------------------------------------------------------- */
  type TrainingBatchRow = {
    id?: string
    slug?: string
    certification: string
    name: string
    schedule: string
    startDate: string
    mode: string
    instructor: string
    seats: number
    enrolled?: number
    status?: string
    level: string
    certColor: string
    certTint: string
    certBorder: string
    levelColor: string
    levelTint: string
    levelBorder: string
    borderColor: string
    btnClass: string
    almostFull?: boolean
    featured?: boolean
  }
  const { data: batchesData } = useQuery<{ batches: TrainingBatchRow[]; count: number } | null>({
    queryKey: ["home-training-batches"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/training-batches")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  const displayBatches: TrainingBatchRow[] = React.useMemo(() => {
    const api = batchesData?.batches
    if (api && api.length > 0) {
      // Sort featured batches to the front so the admin's "featured" toggle
      // actually controls homepage placement. Non-featured batches fill
      // remaining slots so the section never goes blank.
      const sorted = [...api].sort((a, b) => {
        if (a.featured === b.featured) return 0
        return a.featured ? -1 : 1
      })
      return sorted.map((b) => ({
        ...b,
        almostFull: (b.seats - (b.enrolled ?? 0)) <= 2 || b.status === "Almost Full",
      }))
    }
    // Static fallback - already has `almostFull`.
    return UPCOMING_BATCHES as unknown as TrainingBatchRow[]
  }, [batchesData])

  // Normalize platform stats into the same shape as the fallback TRUST_STATS
  // so the JSX below doesn't need runtime `"x" in s` checks.
  type StatTile = {
    key: string
    icon: React.ComponentType<{ className?: string }>
    value: string
    suffix: string
    label: string
    color: string
    tint: string
    isLive: boolean
  }
  const statTiles: StatTile[] = React.useMemo(() => {
    if (platformStats.length > 0) {
      return platformStats.map((s) => ({
        key: s.key,
        icon: getCmsIcon(s.icon),
        value: s.value,
        suffix: s.suffix ?? "",
        label: s.label,
        color: s.color,
        tint: "bg-violet-500/10",
        isLive: s.source === "calculated",
      }))
    }
    return TRUST_STATS.map((s) => ({
      key: s.label,
      icon: s.icon,
      value: s.value,
      suffix: "",
      label: s.label,
      color: s.color,
      tint: s.tint,
      isLive: true,
    }))
  }, [platformStats])

  // Hero CTAs are fixed to discovery flows - Explore Training (catalog),
  // View Upcoming Batches (batches), and For Institutions.
  // The CMS can override the labels via the home.hero.ctaPrimary /
  // ctaSecondary content rows; targets remain fixed.
  const heroPrimaryTarget: View = { name: "catalog" }
  const heroSecondaryTarget: View = { name: "batches" }
  const heroTertiaryTarget: View = { name: "institutions-schools" }

  return (
    <main className="relative">
      {/* =====================================================
          SECTION 1 - HERO
          ===================================================== */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-mesh" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-10" aria-hidden />
        <div
          className="absolute left-1/3 top-1/4 size-[500px] rounded-full bg-violet-600/8 blur-[120px] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 right-1/3 size-[400px] rounded-full bg-cyan-500/6 blur-[100px] pointer-events-none"
          aria-hidden
        />

        {/* Desktop: large interactive particle logo on the right */}
        <div className="hidden lg:block absolute right-[6%] top-1/2 -translate-y-1/2 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <ParticleLogo size={680} interactive showGlow />
          </motion.div>
        </div>

        {/* Mobile: smaller particle logo inline */}
        <div className="lg:hidden absolute inset-x-0 top-0 h-[44vh] flex items-center justify-center pointer-events-none">
          <ParticleLogo size={340} interactive={false} showGlow />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-16 pt-[48vh] lg:pt-16">
          <div className="max-w-3xl">
            <motion.div
              {...FADE_UP}
              className="inline-flex items-center gap-2 mb-4 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" aria-hidden />
              <span className="text-[10px] font-mono text-violet-300/90 tracking-[0.25em]">
                {heroBadge}
              </span>
            </motion.div>

            <motion.h1
              id="hero-heading"
              {...FADE_UP}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="text-[clamp(2.25rem,5.5vw,4rem)] font-bold leading-[1.02] tracking-[-0.03em] mb-5 text-balance"
            >
              {heroTitlePrefix}{" "}
              <span className="text-gradient-premium">{heroTitleAccent}</span>
            </motion.h1>

            <motion.p
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-base lg:text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed"
            >
              {heroDescription}
            </motion.p>

            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
            >
              <Button
                size="lg"
                onClick={() => navigate(heroPrimaryTarget)}
                className="bg-violet-600 hover:bg-violet-500 btn-premium px-7 py-6 text-sm"
                aria-label={heroCtaPrimary}
              >
                {heroCtaPrimary}
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(heroSecondaryTarget)}
                className="px-6 py-6 text-sm"
                aria-label={heroCtaSecondary}
              >
                <Calendar className="h-4 w-4 mr-2" aria-hidden />
                {heroCtaSecondary}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate(heroTertiaryTarget)}
                className="px-5 py-6 text-sm text-muted-foreground hover:text-foreground"
                aria-label={heroCtaTertiary}
              >
                <Building2 className="h-4 w-4 mr-2" aria-hidden />
                {heroCtaTertiary}
              </Button>
            </motion.div>

            {/* Live platform indicators */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-border/40"
            >
              <StatusDot status="online" pulse size="sm" label="BATCHES OPEN" />
              <StatusDot status="online" pulse size="sm" label="LIVE SESSIONS" />
              <StatusDot status="online" pulse size="sm" label="12 EXPERT INSTRUCTORS" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 1.5 - SOCIAL PROOF / LIVE ACTIVITY
          Platform-wide Live Feed: total learners, enrollments this week,
          labs solved today, 30-day velocity sparkline and recent
          enrollments (from /api/enrollment-feed + /api/platform-stats).
          ===================================================== */}
      <section
        aria-labelledby="social-proof-heading"
        className="relative py-8 lg:py-12 border-y border-border/40"
      >
        <h2 id="social-proof-heading" className="sr-only">
          Live learner activity on GuardianX
        </h2>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PlatformActivityFeed />
        </div>
      </section>

      {/* =====================================================
          NEW SECTION - WHO WE TRAIN
          4 audience cards: Aspirants, Freshers, Working Pros, Institutions
          ===================================================== */}
      <section
        aria-labelledby="who-we-train-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              WHO WE TRAIN
            </p>
            <h2
              id="who-we-train-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              Built for every kind of{" "}
              <span className="text-gradient-premium">cyber learner.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GuardianX trains the full spectrum of cyber security learners - from
              absolute beginners entering the field to working professionals
              upskilling around their day jobs, and institutions running cohorts at
              scale.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {AUDIENCES.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                className="card-premium rounded-xl p-5 lg:p-6 h-full"
              >
                <div
                  className={cn(
                    "mb-4 flex size-12 items-center justify-center rounded-lg border border-border/50",
                    a.tint,
                    a.color
                  )}
                  aria-hidden
                >
                  <a.icon className="size-6" />
                </div>
                <h3 className="text-base font-semibold mb-2">{a.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {a.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION - UPCOMING BATCHES
          4 hardcoded live-instructor-led certification batch cards.
          Premium card design with difficulty color coding.
          ===================================================== */}
      <section
        aria-labelledby="upcoming-batches-heading"
        className="relative py-8 lg:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 size-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              LIVE INSTRUCTOR-LED BATCHES
            </p>
            <h2
              id="upcoming-batches-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              Upcoming Live Batches
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Structured certification batches with fixed schedules, dedicated
              instructors, and live online sessions. Enroll early to secure your
              seat - batches fill up fast.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
            {displayBatches.slice(0, 4).map((b, i) => (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * i, ease: "easeOut" }}
                className={cn(
                  "group relative rounded-2xl border bg-card p-5 lg:p-6 transition-all duration-300 hover:-translate-y-1",
                  b.borderColor
                )}
              >
                {/* Header row: certification badge + level pill */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <Badge
                      className={cn(
                        "mb-2 font-mono text-[10px] uppercase tracking-wider",
                        b.certTint,
                        b.certColor,
                        b.certBorder
                      )}
                    >
                      {b.certification}
                    </Badge>
                    <h3 className="text-lg font-semibold leading-tight">
                      {b.name}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider shrink-0",
                      b.levelTint,
                      b.levelColor,
                      b.levelBorder
                    )}
                  >
                    {b.level}
                  </Badge>
                </div>

                {/* Meta rows */}
                <dl className="space-y-2 text-sm mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                    <span className="text-muted-foreground">{b.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                    <span className="text-muted-foreground">Starts {b.startDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                    <span className="text-muted-foreground">{b.mode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                    <span className="text-muted-foreground">{b.instructor}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Target className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          b.almostFull ? "text-amber-300" : "text-emerald-300"
                        )}
                      >
                        {b.seats - (b.enrolled ?? 0)} seats left
                        {b.almostFull ? " · Almost Full" : ""}
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground tabular-nums">
                        {b.enrolled ?? 0}/{b.seats}
                      </span>
                    </div>
                    {/* Capacity progress bar */}
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden" aria-hidden>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          b.almostFull
                            ? "bg-gradient-to-r from-amber-500 to-amber-400"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        )}
                        style={{ width: `${Math.min(100, ((b.enrolled ?? 0) / b.seats) * 100)}%` }}
                      />
                    </div>
                  </div>
                </dl>

                {b.slug ? (
                  <a
                    href={`/batches/${b.slug}`}
                    className="block w-full"
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                      e.preventDefault()
                      navigate({ name: "batch-detail", batchSlug: b.slug! })
                    }}
                  >
                    <Button
                      className={cn("w-full btn-premium", b.btnClass)}
                      size="sm"
                      aria-label={`View ${b.name}`}
                    >
                      VIEW BATCH
                      <ArrowRight className="size-4 ml-2" aria-hidden />
                    </Button>
                  </a>
                ) : (
                  <Button
                    onClick={() => navigate({ name: "batches" })}
                    className={cn("w-full btn-premium", b.btnClass)}
                    size="sm"
                    aria-label={`View ${b.name}`}
                  >
                    VIEW BATCH
                    <ArrowRight className="size-4 ml-2" aria-hidden />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            {...FADE_IN}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="mt-6 text-center"
          >
            <Button
              variant="outline"
              onClick={() => navigate({ name: "batches" })}
              aria-label="See all upcoming batches"
            >
              See all upcoming batches
              <ArrowRight className="size-4 ml-2" aria-hidden />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION - FLEXIBLE SCHEDULES
          6 schedule-option cards: Weekday, Weekend, Morning, Afternoon, Evening, Late Night
          ===================================================== */}
      <section
        aria-labelledby="schedules-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              FLEXIBLE SCHEDULES
            </p>
            <h2
              id="schedules-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              Train around your life.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose a schedule that fits your work, studies and personal
              commitments. New batches open across every slot, every month.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
            {SCHEDULES.map((s, i) => (
              <motion.div
                key={s.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * i, ease: "easeOut" }}
                className="card-premium rounded-xl p-4 lg:p-5 h-full"
              >
                <div
                  className={cn(
                    "mb-3 flex size-10 items-center justify-center rounded-lg border border-border/50",
                    s.tint,
                    s.color
                  )}
                  aria-hidden
                >
                  <s.icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1 font-mono tracking-wider">
                  {s.type}
                </h3>
                <p className="text-xs text-muted-foreground">{s.example}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION - TRAINING METHODOLOGY
          7-step visual timeline: live lecture → analysis → study → lab →
          assignment → mock test → exam prep.
          Horizontal on desktop, vertical on mobile.
          ===================================================== */}
      <section
        aria-labelledby="methodology-heading"
        className="relative py-8 lg:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div
          className="absolute right-1/3 top-1/4 size-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-8">
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              TRAINING METHODOLOGY
            </p>
            <h2
              id="methodology-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              How GuardianX trains you.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every batch follows the same 7-step framework - from live lecture
              to exam day. No fluff, no padding - just structured progression
              that gets you certified.
            </p>
          </motion.div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block relative">
            <div
              className="absolute top-[34px] left-[8%] right-[8%] h-px bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-violet-500/0"
              aria-hidden
            />
            <div className="grid grid-cols-7 gap-3">
              {METHODOLOGY_STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                  className="relative text-center"
                >
                  <div className="mx-auto mb-3 flex size-[68px] items-center justify-center rounded-full border border-violet-500/30 bg-card relative z-10">
                    <step.icon className="size-6 text-violet-300" aria-hidden />
                  </div>
                  <div className="font-mono text-[10px] text-violet-300/80 tracking-wider mb-1">
                    STEP {step.num}
                  </div>
                  <h3 className="text-xs font-semibold mb-1">{step.title}</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile / tablet: vertical timeline */}
          <div className="lg:hidden space-y-2">
            {METHODOLOGY_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * i, ease: "easeOut" }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-full border border-violet-500/30 bg-card shrink-0">
                    <step.icon className="size-5 text-violet-300" aria-hidden />
                  </div>
                  {i < METHODOLOGY_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-violet-500/20 mt-2 mb-2" aria-hidden />
                  )}
                </div>
                <div className="pt-1 pb-3">
                  <div className="font-mono text-[10px] text-violet-300/80 tracking-wider mb-1">
                    STEP {step.num}
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION - EXPERT INSTRUCTORS
          3 verified instructor profile cards.
          ===================================================== */}
      <section
        aria-labelledby="instructors-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              EXPERT INSTRUCTORS
            </p>
            <h2
              id="instructors-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              Learn from people who have{" "}
              <span className="text-gradient-premium">done the work.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our instructors are working security professionals with real-world
              experience - not just certifications. Every profile is verified by
              the GuardianX team.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {instructorRows.length > 0 ? (
              instructorRows.slice(0, 3).map((ins, i) => {
                // Parse expertise from JSON string (e.g. ["offensive","web"])
                let expertiseLabel = ins.title || "Security Instructor"
                try {
                  const expertise = ins.profile?.expertise ? JSON.parse(ins.profile.expertise) : []
                  if (Array.isArray(expertise) && expertise.length > 0) {
                    const labels: Record<string, string> = {
                      offensive: "Offensive Security",
                      defensive: "Defensive Security",
                      network: "Network Security",
                      web: "Web Security",
                      cloud: "Cloud Security",
                      grc: "GRC",
                      dfir: "DFIR",
                      iam: "IAM",
                    }
                    expertiseLabel = expertise.map((e: string) => labels[e] || e.charAt(0).toUpperCase() + e.slice(1)).join(", ")
                  }
                } catch {}
                // Parse certifications
                let certsLabel = ""
                try {
                  const certs = ins.profile?.certifications ? JSON.parse(ins.profile.certifications) : []
                  if (Array.isArray(certs)) certsLabel = certs.join(", ")
                } catch {}
                const initials = ins.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??"
                const avatarColors = [
                  { bg: "bg-violet-500/15", color: "text-violet-300" },
                  { bg: "bg-cyan-500/15", color: "text-cyan-300" },
                  { bg: "bg-amber-500/15", color: "text-amber-300" },
                ]
                const av = avatarColors[i % avatarColors.length]

                return (
                  <motion.div
                    key={ins.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * i, ease: "easeOut" }}
                    className="card-premium rounded-2xl p-5 lg:p-6 h-full flex flex-col"
                  >
                    {/* Avatar + name */}
                    <div className="flex items-start gap-4 mb-4">
                      {ins.avatar ? (
                        <img src={ins.avatar} alt={ins.name} className="size-14 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={cn("flex size-14 items-center justify-center rounded-full font-semibold text-base shrink-0", av.bg, av.color)} aria-hidden>
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="text-base font-semibold truncate">{ins.name}</h3>
                          <BadgeCheck className="size-4 text-emerald-400 shrink-0" aria-label="Verified instructor" />
                        </div>
                        <p className="text-xs text-muted-foreground">{expertiseLabel}</p>
                      </div>
                    </div>

                    {/* Meta rows */}
                    <dl className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <dt className="text-muted-foreground">Experience</dt>
                        <dd className="font-medium">{ins.profile?.yearsExperience ? `${ins.profile.yearsExperience}+ years` : "Experienced"}</dd>
                      </div>
                      {certsLabel && (
                        <div className="flex items-center justify-between text-xs gap-3">
                          <dt className="text-muted-foreground shrink-0">Certifications</dt>
                          <dd className="font-mono text-[10px] text-right text-foreground/90">{certsLabel}</dd>
                        </div>
                      )}
                    </dl>

                    {/* VERIFIED badge */}
                    <div className="mb-4 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 tracking-wider">
                      <BadgeCheck className="size-3" aria-hidden />
                      VERIFIED INSTRUCTOR PROFILE
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-auto"
                      onClick={() => navigate({ name: "instructor-detail", instructorId: ins.id })}
                      aria-label={`View ${ins.name} instructor profile`}
                    >
                      VIEW INSTRUCTOR
                      <ArrowRight className="size-4 ml-2" aria-hidden />
                    </Button>
                  </motion.div>
                )
              })
            ) : (
              <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
                No instructors yet. Add instructors from the admin panel.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 2 - PLATFORM INTRODUCTION (6 pillars)
          ===================================================== */}
      <section
        aria-labelledby="platform-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              {platformEyebrow}
            </p>
            <h2
              id="platform-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {platformTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {platformDesc}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                className="card-premium rounded-xl p-4 lg:p-5"
              >
                <div
                  className={cn(
                    "mb-3 flex size-10 items-center justify-center rounded-lg border border-border/50",
                    p.tint,
                    p.color
                  )}
                  aria-hidden
                >
                  <p.icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 3 - CYBER RANGE SHOWCASE
          ===================================================== */}
      <section
        aria-labelledby="range-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <h2
              id="range-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              {rangeTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {rangeDesc}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 items-stretch">
            {/* Target info card */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="card-premium rounded-2xl p-5 lg:p-6 scanlines"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StatusDot status="online" pulse size="sm" label="TARGET ONLINE" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    <Sparkles className="size-3" aria-hidden />
                    DEMONSTRATION
                  </span>
                  <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 font-mono text-[10px]">
                    DVWA
                  </Badge>
                </div>
              </div>

              <p className="text-[10px] font-mono text-amber-300/80 mb-4 tracking-wider">
                Interactive demo - sign up to access live labs
              </p>

              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Server className="size-4 text-cyan-300" aria-hidden />
                Target Machine
              </h3>

              <dl className="space-y-3 font-mono text-sm">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <dt className="text-muted-foreground">TARGET</dt>
                  <dd className="text-foreground">DVWA</dd>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <dt className="text-muted-foreground">STATUS</dt>
                  <dd className="text-emerald-300">ONLINE</dd>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <dt className="text-muted-foreground">IP</dt>
                  <dd className="text-cyan-200">10.10.24.14</dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Open Services
                </p>
                <div className="flex flex-wrap gap-2">
                  {RANGE_SERVICES.map((s) => (
                    <span
                      key={s.port}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-[oklch(0.1_0.008_270)] px-2 py-1 font-mono text-xs"
                    >
                      <s.icon className={cn("size-3.5", s.color)} aria-hidden />
                      <span className="text-cyan-200">{s.port}</span>
                      <span className="text-muted-foreground">{s.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              <Button
                className="mt-5 w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                onClick={() => navigate({ name: "labs" })}
                aria-label="Launch lab"
              >
                <Crosshair className="size-4 mr-2" aria-hidden />
                LAUNCH LAB
              </Button>
            </motion.div>

            {/* Cyber terminal - nmap scan */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="flex"
            >
              <CyberTerminal
                lines={nmapLines}
                speed={18}
                className="w-full"
                prompt="guardian@kali:~$"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 4 - LEARNING PATHS
          ===================================================== */}
      <section
        aria-labelledby="paths-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <h2
              id="paths-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {pathsTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {pathsDesc}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {(() => {
              type PathCard = {
                key: string
                title: string
                desc: string
                icon: React.ComponentType<{ className?: string }>
                difficulty: string
                duration: string
                skills: string
                color: string
                tint: string
              }
              const items: PathCard[] =
                learningPathRows.length > 0
                  ? learningPathRows.map((p) => ({
                      key: p.id,
                      title: p.title,
                      desc: p.subtitle || p.description,
                      icon: getCmsIcon(p.icon),
                      difficulty: p.difficulty.toUpperCase(),
                      duration: p.duration,
                      skills: `${p.skillsCount} skills`,
                      color: p.color,
                      tint: p.tint,
                    }))
                  : LEARNING_PATHS.map((p) => ({
                      key: p.title,
                      title: p.title,
                      desc: p.desc,
                      icon: p.icon,
                      difficulty: p.difficulty,
                      duration: p.duration,
                      skills: p.skills,
                      color: p.color,
                      tint: p.tint,
                    }))
              return items.map((p, i) => (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.04 * i, ease: "easeOut" }}
                  className="card-premium rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg border border-border/50",
                        p.tint,
                        p.color
                      )}
                      aria-hidden
                    >
                      <p.icon className="size-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("font-mono text-[10px] border-border/60", p.color)}
                    >
                      {p.difficulty}
                    </Badge>
                  </div>

                  <h3 className="text-base font-semibold mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {p.desc}
                  </p>

                  <div className="mt-auto grid grid-cols-2 gap-2 mb-4 text-[11px] font-mono">
                    <div className="rounded-md border border-border/40 bg-[oklch(0.1_0.008_270)] px-2 py-1.5">
                      <p className="text-muted-foreground uppercase">Duration</p>
                      <p className="text-foreground">{p.duration}</p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-[oklch(0.1_0.008_270)] px-2 py-1.5">
                      <p className="text-muted-foreground uppercase">Skills</p>
                      <p className="text-foreground">{p.skills}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate({ name: "catalog" })}
                    aria-label={`Explore ${p.title} path`}
                  >
                    EXPLORE PATH
                    <ArrowRight className="size-3.5 ml-1.5" aria-hidden />
                  </Button>
                </motion.div>
              ))
            })()}
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 5 - ADVANCED SKILL TREE PREVIEW
          ===================================================== */}
      <section
        aria-labelledby="skills-heading"
        className="relative py-8 lg:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div className="absolute left-1/4 top-1/3 w-[400px] h-[300px] bg-violet-600/8 blur-[100px] rounded-full pointer-events-none" aria-hidden />
        <div className="absolute right-1/4 bottom-1/3 w-[300px] h-[300px] bg-cyan-500/6 blur-[100px] rounded-full pointer-events-none" aria-hidden />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                <Network className="size-3" aria-hidden />
                SKILL MAP
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
                7 domains · {SKILL_MAP_DATA.reduce((n, d) => n + d.skills.length, 0)} skills
              </span>
            </div>
            <h2
              id="skills-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {skillsTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {skillsDesc}
            </p>
          </motion.div>

          {/* Interactive Skill Map */}
          <motion.div
            {...FADE_UP}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="card-premium rounded-2xl p-4 lg:p-6"
          >
            <AdvancedSkillMap />
          </motion.div>

          {/* Skill domain cards below the map */}
          <motion.div
            {...FADE_UP}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 lg:gap-3 mt-4"
          >
            {SKILL_DOMAINS.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className={cn("rounded-lg border p-3 transition-all hover:-translate-y-1", d.border, d.bg)}
              >
                <d.icon className={cn("h-4 w-4 mb-2", d.color)} />
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-1">{d.name}</h3>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", d.barColor)} style={{ width: `${d.progress}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">{d.skills} skills</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate({ name: "skill-tree" })}
              aria-label="Explore full skill tree"
            >
              EXPLORE FULL SKILL TREE
              <ArrowRight className="size-4 ml-2" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate({ name: "skill-assessments" })}
            >
              TAKE SKILL ASSESSMENT
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 6 - MISSION CONTROL PREVIEW
          ===================================================== */}
      <section
        aria-labelledby="mission-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                <Eye className="size-3" aria-hidden />
                PREVIEW
              </span>
              <span className="text-[10px] font-mono text-cyan-300/70 tracking-wider">
                Illustrative preview - your stats appear here when you log in
              </span>
            </div>
            <h2
              id="mission-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {missionTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {missionDesc}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left column - stat tiles + XP + rank */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={Zap}
                  label="TOTAL XP"
                  value="8,420"
                  color="text-amber-300"
                  tint="bg-amber-500/10"
                />
                <StatTile
                  icon={Trophy}
                  label="RANK"
                  value="OPERATOR"
                  color="text-violet-300"
                  tint="bg-violet-500/10"
                />
                <StatTile
                  icon={Target}
                  label="MISSIONS"
                  value="47"
                  suffix="/120"
                  color="text-cyan-300"
                  tint="bg-cyan-500/10"
                />
                <StatTile
                  icon={TrendingUp}
                  label="STREAK"
                  value="14"
                  suffix="days"
                  color="text-emerald-300"
                  tint="bg-emerald-500/10"
                  trend={{ value: 22, direction: "up" }}
                />
              </div>

              <div className="card-premium rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <RankBadge rank="OPERATOR" level={7} size="md" />
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                    Level 7
                  </span>
                </div>
                <XPBar current={1842} max={2400} level={7} showLabel />
              </div>
            </motion.div>

            {/* Middle column - current mission */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <MissionCard
                title="SQL Injection - Login Bypass"
                objective="Exploit the DVWA login form to bypass authentication. Capture the flag stored in the admin panel."
                difficulty="MEDIUM"
                xp={450}
                timeElapsed="00:12:34"
                onSubmit={() => {}}
                onLaunch={() => navigate({ name: "labs" })}
              />
            </motion.div>

            {/* Right column - daily objective */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="card-premium rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <Target className="size-4" aria-hidden />
                </span>
                <h3 className="text-sm font-semibold">Daily Objective</h3>
              </div>

              <ul className="space-y-3 mb-5 flex-1">
                {DAILY_OBJECTIVES.map((o, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={cn(
                        "size-4 mt-0.5 shrink-0",
                        o.done ? "text-emerald-400" : "text-muted-foreground/40"
                      )}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-xs leading-relaxed",
                          o.done ? "text-muted-foreground line-through" : "text-foreground"
                        )}
                      >
                        {o.label}
                      </p>
                      <p className="font-mono text-[10px] text-amber-300/80 mt-0.5">
                        +{o.xp} XP
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                onClick={() => navigate({ name: "dashboard" })}
                aria-label="Enter mission control"
              >
                ENTER MISSION CONTROL
                <ArrowRight className="size-4 ml-2" aria-hidden />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 7 - GAMIFICATION
          ===================================================== */}
      <section
        aria-labelledby="gamify-heading"
        className="relative py-8 lg:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <h2
              id="gamify-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {gamifyTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {gamifyDesc}
            </p>
          </motion.div>

          {/* Rank hierarchy ladder */}
          <motion.div
            {...FADE_UP}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="card-premium rounded-2xl p-5 lg:p-6 mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Crown className="size-4 text-amber-300" aria-hidden />
                Rank Hierarchy
              </h3>
              <span className="font-mono text-[10px] text-muted-foreground uppercase">
                {rankRows.length || 8} TIERS ·{" "}
                {(() => {
                  const lo = rankRows[0]?.xpThreshold ?? 0
                  const hi = rankRows[rankRows.length - 1]?.xpThreshold ?? 100000
                  return `${lo.toLocaleString()}-${hi.toLocaleString()} XP`
                })()}{" "}
                EACH
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(rankRows.length > 0
                ? rankRows
                : RANK_LADDER
              ).map((r, i, arr) => (
                <React.Fragment key={r.name}>
                  <div className="flex flex-col items-center gap-1">
                    <RankBadge rank={r.name} level={r.level} size="sm" />
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight
                      className="size-3 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-3 lg:gap-4 mb-4">
            <StatTile
              icon={Zap}
              label="XP EARNED"
              value="8,420"
              color="text-amber-300"
              tint="bg-amber-500/10"
              trend={{ value: 18, direction: "up" }}
            />
            <StatTile
              icon={Award}
              label="BADGES UNLOCKED"
              value="14"
              suffix="/32"
              color="text-violet-300"
              tint="bg-violet-500/10"
              trend={{ value: 8, direction: "up" }}
            />
            <StatTile
              icon={Trophy}
              label="CTF SCORE"
              value="2,180"
              color="text-cyan-300"
              tint="bg-cyan-500/10"
              trend={{ value: 32, direction: "up" }}
            />
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate({ name: "leaderboard" })}
              aria-label="View leaderboard"
            >
              VIEW LEADERBOARD
              <ArrowRight className="size-4 ml-2" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 8 - CAREER CENTER
          ===================================================== */}
      <section
        aria-labelledby="career-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <h2
              id="career-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {careerTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {careerDesc}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Skill percentages */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="card-premium rounded-2xl p-5 lg:p-6"
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Layers className="size-4 text-cyan-300" aria-hidden />
                Your Skill Profile
              </h3>
              <div className="space-y-3">
                {CAREER_SKILLS.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground">{s.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.value}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full border border-border/40 bg-[oklch(0.1_0.008_270)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.value}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn("h-full rounded-full", s.barClass)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* You are ready for */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="card-premium rounded-2xl p-5 lg:p-6 glow-soft"
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" aria-hidden />
                You Are Ready For
              </h3>
              <div className="space-y-4">
                {CAREER_ROLES.map((r) => (
                  <div
                    key={r.role}
                    className="rounded-xl border border-border/40 bg-[oklch(0.1_0.008_270)] p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold">{r.role}</p>
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          {r.match}% match
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px]",
                          r.match >= 75
                            ? "border-emerald-500/40 text-emerald-300"
                            : "border-amber-500/40 text-amber-300"
                        )}
                      >
                        {r.match >= 75 ? "READY" : "ALMOST"}
                      </Badge>
                    </div>
                    <div className="h-1.5 rounded-full border border-border/40 bg-[oklch(0.08_0.005_270)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${r.match}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          r.match >= 75
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : "bg-gradient-to-r from-amber-500 to-amber-400"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="mt-5 w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                onClick={() => navigate({ name: "career-planner" })}
                aria-label="Explore careers"
              >
                EXPLORE CAREERS
                <ArrowRight className="size-4 ml-2" aria-hidden />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 9 - INSTITUTIONS
          ===================================================== */}
      <section
        aria-labelledby="institutions-heading"
        className="relative py-8 lg:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6 text-center mx-auto">
            <h2
              id="institutions-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-2"
            >
              {institutionsTitle}
            </h2>
            <p className="text-base text-gradient-premium font-semibold tracking-wide">
              {institutionsSub}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-3 lg:gap-4">
            {INSTITUTION_TYPES.map((inst, i) => (
              <motion.div
                key={inst.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                className="card-premium rounded-2xl p-5 flex flex-col"
              >
                <div
                  className={cn(
                    "mb-4 flex size-12 items-center justify-center rounded-xl border border-border/50",
                    inst.tint,
                    inst.color
                  )}
                  aria-hidden
                >
                  <inst.icon className="size-6" />
                </div>
                <h3 className="text-base font-semibold mb-2">{inst.type}</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed flex-1">
                  {inst.desc}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(inst.view)}
                  aria-label={`${inst.type} portal login`}
                >
                  <Lock className="size-3.5 mr-1.5" aria-hidden />
                  PORTAL LOGIN
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => navigate({ name: "institutions-schools" })}
              aria-label="Explore institutions"
            >
              EXPLORE INSTITUTIONS
              <ArrowRight className="size-4 ml-2" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 10 - CERTIFICATIONS
          ===================================================== */}
      <section
        aria-labelledby="cert-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <h2
              id="cert-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {certTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {certDesc}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 items-stretch">
            {/* Certificate preview card */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="relative"
            >
              <div className="card-premium relative rounded-2xl p-6 lg:p-8 scanlines overflow-hidden h-full">
                {/* Decorative corner */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full opacity-40 blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.7 0.15 155 / 0.4), transparent 70%)",
                  }}
                />

                <div className="relative flex items-start justify-between mb-5">
                  <div>
                    <p className="font-mono text-[10px] text-emerald-300 uppercase tracking-[0.25em] mb-1">
                      GUARDIANX ACADEMY
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Verified Credential
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_18px_-6px_oklch(0.7_0.15_155_/_0.6)]">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    VERIFIED
                  </span>
                </div>

                <div className="relative mb-5">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    This certifies that
                  </p>
                  <p className="text-xl lg:text-2xl font-semibold text-foreground">
                    Jane Doe
                  </p>
                </div>

                <div className="relative mb-5">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Has successfully completed
                  </p>
                  <p className="text-base font-semibold text-gradient-premium">
                    Certified Ethical Hacker (CEH) - Practical
                  </p>
                </div>

                <div className="relative grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-lg border border-border/40 bg-[oklch(0.1_0.008_270)] px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Credential ID
                    </p>
                    <p className="font-mono text-xs text-cyan-200 truncate">
                      GX-CEH2024P-08842
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-[oklch(0.1_0.008_270)] px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Issued
                    </p>
                    <p className="font-mono text-xs text-foreground">2024-09-14</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between border-t border-border/40 pt-4">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    GuardianX Academy
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Score: 94%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Verification widget (full card) */}
            <motion.div
              {...FADE_UP}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="card-premium rounded-2xl p-5 lg:p-6"
            >
              <CertificateVerifyCard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 11 - SUCCESS STORIES
          ===================================================== */}
      <section
        aria-labelledby="stories-heading"
        className="relative py-8 lg:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="max-w-2xl mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                <Sparkles className="size-3" aria-hidden />
                ILLUSTRATIVE LEARNER JOURNEY
              </span>
              <span className="text-[10px] font-mono text-amber-300/70 tracking-wider">
                Composite profiles - not real learners
              </span>
            </div>
            <h2
              id="stories-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3"
            >
              {storiesTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {storiesDesc}
            </p>
          </motion.div>

          {/* Progression timeline */}
          <motion.div
            {...FADE_UP}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="card-premium rounded-2xl p-5 mb-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
              {STORY_STAGES.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className="flex flex-col items-center gap-1 px-2">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border",
                        s.color,
                        s.tint,
                        s.border
                      )}
                      aria-hidden
                    >
                      <s.icon className="size-4" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                  {i < STORY_STAGES.length - 1 && (
                    <ArrowRight
                      className="size-3 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>

          {/* Story cards - placeholder data, clearly marked */}
          <div className="grid md:grid-cols-3 gap-3 lg:gap-4">
            {STORIES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                className="card-premium rounded-2xl p-5 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/10 font-mono text-sm font-bold text-violet-200"
                    aria-hidden
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase">
                      {s.role}
                    </p>
                  </div>
                </div>

                <dl className="space-y-2 mb-4 flex-1">
                  <div>
                    <dt className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                      Path taken
                    </dt>
                    <dd className="text-xs text-foreground">{s.path}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                      Current position
                    </dt>
                    <dd className="text-xs text-foreground">{s.position}</dd>
                  </div>
                </dl>

                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                  <p className="font-mono text-[10px] text-amber-300/80 uppercase tracking-wider">
                    ILLUSTRATIVE LEARNER JOURNEY · composite
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 12 - TRUST / PARTNERS
          ===================================================== */}
      <section
        aria-labelledby="trust-heading"
        className="relative py-8 lg:py-12 border-y border-border/40"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...FADE_UP} className="text-center mb-6">
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] uppercase mb-1">
              {trustLabel}
            </p>
            <h2
              id="trust-heading"
              className="sr-only"
            >
              Technologies used across modern cybersecurity teams
            </h2>
          </motion.div>

          {/* Technology partner grid - real OSS tools used in GuardianX labs */}
          <motion.div
            {...FADE_IN}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8"
          >
            {techPartners.map((p) => {
              const Icon = getCmsIcon(p.icon)
              return (
                <a
                  key={p.id ?? p.name}
                  href={p.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.description ?? p.name}
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-4 text-center transition-colors hover:border-violet-500/40 hover:bg-violet-500/5"
                >
                  <span
                    className="flex size-9 items-center justify-center rounded-md border border-border/50 bg-violet-500/5 text-violet-300 group-hover:text-violet-200 transition-colors"
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="font-mono text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                    {p.name}
                  </span>
                </a>
              )
            })}
          </motion.div>

          {/* Stats grid - sourced from /api/platform-stats (live calculated
              values from the database for learner_count, course_count,
              lab_count, cert_count; manual/marketing values for the rest).
              Each tile shows the source so the user can tell live counts
              from marketing estimates. */}
          <motion.div
            {...FADE_UP}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4"
          >
            {statTiles.map((s) => {
              const I = s.icon
              return (
                <div
                  key={s.key}
                  className="card-premium rounded-xl p-4 text-center"
                >
                  <div
                    className={cn(
                      "mx-auto mb-2 flex size-9 items-center justify-center rounded-lg border border-border/50",
                      s.tint,
                      s.color
                    )}
                    aria-hidden
                  >
                    <I className="size-4" />
                  </div>
                  <p className={cn("font-mono text-2xl font-bold tabular-nums", s.color)}>
                    {s.value}
                    {s.suffix}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {s.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider",
                      s.isLive
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-amber-500/10 text-amber-300"
                    )}
                    title={
                      s.isLive
                        ? "Calculated live from the database"
                        : "Marketing estimate - not a live count"
                    }
                  >
                    {s.isLive ? "LIVE" : "ESTIMATE"}
                  </p>
                </div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          SECTION 13 - FINAL CTA
          ===================================================== */}
      <section
        aria-labelledby="final-cta-heading"
        className="relative py-12 lg:py-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-mesh" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-10" aria-hidden />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none"
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...FADE_UP}>
            <div className="inline-flex items-center gap-2 mb-5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
              <Sparkles className="size-3.5 text-violet-300" aria-hidden />
              <span className="font-mono text-[10px] text-violet-300/90 tracking-[0.25em]">
                READY TO BEGIN
              </span>
            </div>

            <h2
              id="final-cta-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance"
            >
              <span className="text-gradient-premium">{finalCtaTitle}</span>
            </h2>

            <p className="text-base lg:text-lg text-muted-foreground max-w-xl mx-auto mb-7">
              {finalCtaSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate({ name: "login" })}
                className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm w-full sm:w-auto"
                aria-label={finalCtaPrimary}
              >
                <Rocket className="size-4 mr-2" aria-hidden />
                {finalCtaPrimary}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate({ name: "contact" })}
                className="px-7 py-6 text-sm w-full sm:w-auto"
                aria-label={finalCtaSecondary}
              >
                {finalCtaSecondary}
                <ArrowRight className="size-4 ml-2" aria-hidden />
              </Button>
            </div>

            <p className="mt-5 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              No credit card required · Free forever tier
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  )
}

