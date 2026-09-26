"use client"

/**
 * PlacementsView - public /placements page (Hiring → Placements).
 *
 * The proof-of-outcomes wall: real students who landed security roles
 * after training at GuardianX. Design DNA mirrors HiringView (aurora
 * hero + parallax orbs, glass stat tiles, dual-lane marquee, filterable
 * card wall) and every card inherits the platform-wide CardFx engine
 * (3D tilt, cursor spotlight, GlowEdge) automatically.
 *
 * Sections:
 *   1. Hero - headline + CountUp stat tiles (placed / partners / top
 *      & avg package) + featured-student spotlight panel
 *   2. Dual-lane marquee - companies & roles from live records
 *   3. The Placement Wall - search + track/year filters, featured
 *      pinned first, verified badges, clearly-marked "Sample" chips
 *   4. How the placement cell works - 5-step timeline deep-linking
 *      existing platform features
 *   5. Alumni stories (records with longer stories)
 *   6. Hire-from-us band (feeds the corporate/CRM funnel)
 *   7. Final CTA - "Become our next placement"
 *
 * Data: GET /api/placements (public; auto-seeds clearly-marked sample
 * rows on first launch; degraded-safe like /api/hiring/jobs).
 */

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, useScroll, useTransform } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { CountUp } from "@/components/platform/count-up"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Trophy, Search, BadgeCheck, Wallet, GraduationCap, ArrowRight,
  Briefcase, Users, Building2, Quote, Sparkles, Target, MessagesSquare,
  FileText, ShieldCheck, ExternalLink, Loader2, MousePointerClick,
  Rocket, Landmark,
} from "lucide-react"

// ============================================================
// Types & data
// ============================================================

type PublicPlacement = {
  id: string
  studentName: string
  photoUrl: string | null
  role: string
  company: string
  companyLogo: string | null
  ctc: string | null
  track: string
  year: number
  quote: string | null
  story: string | null
  linkedIn: string | null
  featured: boolean
  verified: boolean
  isSample: boolean
}

type PlacementsResponse = {
  placements: PublicPlacement[]
  stats: {
    placed: number
    partners: number
    tracks: number
    topCtc: string | null
    avgCtc: string | null
  }
  count: number
  degraded: boolean
}

const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-indigo-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-violet-500",
]

function gradientFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const FALLBACK_COMPANIES = [
  "Example Corp", "Sample Security Labs", "DemoCloud Systems",
  "Sample Advisory Group", "Example Software", "DemoDefence Ltd",
]

// ============================================================
// Small shared pieces (same DNA as HiringView)
// ============================================================

function HeroStat({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/40 backdrop-blur px-4 py-2.5 hover:border-violet-500/30 transition-colors">
      <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-violet-500/10 text-violet-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-left">
        <div className="text-lg font-bold leading-none tabular-nums">{value}</div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function MarqueeRow({ items, duration, reverse = false }: { items: string[]; duration: number; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "flex w-max items-center gap-2.5 hover:[animation-play-state:paused]",
          reverse ? "animate-[gx-marquee-reverse_linear_infinite]" : "animate-[gx-marquee_linear_infinite]"
        )}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/50 bg-card/40 backdrop-blur px-3.5 py-1.5 text-[11px] text-muted-foreground"
          >
            <span className="h-1 w-1 rounded-full bg-emerald-400/70" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function Avatar({ p, size = "h-11 w-11 text-sm" }: { p: PublicPlacement; size?: string }) {
  if (p.photoUrl) {
    return (
      <img
        src={p.photoUrl}
        alt={p.studentName}
        className={cn("rounded-full object-cover border border-border/60", size)}
      />
    )
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br shrink-0",
        gradientFor(p.studentName),
        size,
      )}
      aria-hidden
    >
      {initialsOf(p.studentName)}
    </div>
  )
}

// ============================================================
// Placement card (the wall)
// ============================================================

function PlacementCard({ p, onOpen }: { p: PublicPlacement; onOpen: (p: PublicPlacement) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p)}
      className="group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5 text-left transition-colors hover:border-violet-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar p={p} />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold leading-tight">{p.studentName}</span>
              {p.verified && (
                <span title="Verified by GuardianX">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {p.role} <span className="text-foreground/60">· {p.company}</span>
            </div>
          </div>
        </div>
        {p.featured && (
          <span className="shrink-0 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-violet-300">
            Featured
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
        {p.ctc && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <Wallet className="h-3 w-3" /> {p.ctc}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          <GraduationCap className="h-3 w-3 text-violet-300" /> {p.track}
        </span>
        <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          {p.year}
        </span>
        {p.isSample && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-amber-300">
            Sample
          </span>
        )}
      </div>

      {p.quote && (
        <p className="mt-3.5 text-xs leading-relaxed text-foreground/70 line-clamp-2">
          <Quote className="mr-1.5 inline h-3 w-3 text-violet-400/70" />
          {p.quote}
        </p>
      )}

      <span className="mt-3.5 inline-flex items-center gap-1 text-[11px] font-medium text-violet-300 opacity-80 group-hover:opacity-100 transition-opacity">
        Read the story <MousePointerClick className="h-3 w-3" />
      </span>
    </button>
  )
}

// ============================================================
// Main view
// ============================================================

const STEPS = [
  {
    icon: GraduationCap,
    title: "Train & certify",
    text: "Pick a track and earn verifiable, exam-backed certificates.",
    viewName: "catalog" as const,
    cta: "Browse courses",
  },
  {
    icon: FileText,
    title: "Build your portfolio",
    text: "Resume, project write-ups and a public verifiable credential.",
    viewName: "resume-builder" as const,
    cta: "Resume lab",
  },
  {
    icon: ShieldCheck,
    title: "Prove your skills",
    text: "Proctored exams and skill assessments that employers trust.",
    viewName: "skill-assessments" as const,
    cta: "Skill checks",
  },
  {
    icon: MessagesSquare,
    title: "Interviews & referrals",
    text: "Mock interview drills plus referrals into partner companies.",
    viewName: "career-planner" as const,
    cta: "Career planner",
  },
  {
    icon: Trophy,
    title: "Offer & alumni wall",
    text: "Land the role and take your place on this wall.",
    viewName: "hiring" as const,
    cta: "See open roles",
  },
]

export function PlacementsView() {
  const { navigate } = useAppStore()
  const [search, setSearch] = React.useState("")
  const [trackFilter, setTrackFilter] = React.useState("all")
  const [yearFilter, setYearFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<PublicPlacement | null>(null)

  const heroRef = React.useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const orbY1 = useTransform(scrollYProgress, [0, 1], [0, 140])
  const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -90])

  const { data, isLoading } = useQuery<PlacementsResponse>({
    queryKey: ["placements"],
    queryFn: () => api("/api/placements"),
    refetchInterval: 120_000,
  })

  const placements = data?.placements ?? []
  const stats = data?.stats

  const tracks = React.useMemo(
    () => Array.from(new Set(placements.map((p) => p.track).filter(Boolean))).sort(),
    [placements],
  )
  const years = React.useMemo(
    () => Array.from(new Set(placements.map((p) => p.year))).sort((a, b) => b - a),
    [placements],
  )
  const companies = React.useMemo(
    () =>
      Array.from(new Set(placements.map((p) => p.company).filter(Boolean))).slice(0, 14),
    [placements],
  )
  const roles = React.useMemo(
    () => Array.from(new Set(placements.map((p) => p.role).filter(Boolean))).slice(0, 14),
    [placements],
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return placements.filter((p) => {
      if (trackFilter !== "all" && p.track !== trackFilter) return false
      if (yearFilter !== "all" && String(p.year) !== yearFilter) return false
      if (q && !`${p.studentName} ${p.role} ${p.company}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [placements, search, trackFilter, yearFilter])

  const spotlight = React.useMemo(
    () => placements.find((p) => p.featured) ?? placements[0] ?? null,
    [placements],
  )
  const recent = React.useMemo(
    () => placements.filter((p) => p.id !== spotlight?.id).slice(0, 3),
    [placements, spotlight],
  )
  const stories = React.useMemo(() => placements.filter((p) => p.story).slice(0, 3), [placements])

  return (
    <div className="min-h-screen">
      {/* ================= HERO ================= */}
      <section ref={heroRef} className="relative overflow-hidden pt-28 pb-14 px-4 sm:px-6 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div style={{ y: orbY1 }} className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[52rem] rounded-full bg-violet-600/20 blur-[130px]" />
          <motion.div style={{ y: orbY2 }} className="absolute top-20 -left-28 h-72 w-72 rounded-full bg-emerald-500/12 blur-[100px]" />
          <motion.div style={{ y: orbY2 }} className="absolute top-32 -right-24 h-72 w-72 rounded-full bg-sky-500/12 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(148 163 184 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.5) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-6 items-center">
            {/* left: copy */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Placement outcomes, verified by GuardianX
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06 }}
                className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.06]"
              >
                From classroom to SOC -{" "}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
                  real students, real offers
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-5 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                Every profile on this wall is a GuardianX Academy student who trained,
                certified and interviewed their way into a security role. No stock
                claims - verified outcomes only, replaced and confirmed by our team.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 }}
                className="mt-9 flex items-center justify-center lg:justify-start gap-3 flex-wrap"
              >
                <HeroStat icon={Users} value={stats ? <CountUp value={stats.placed} /> : "—"} label="Students placed" />
                <HeroStat icon={Building2} value={stats ? <CountUp value={stats.partners} /> : "—"} label="Hiring partners" />
                <HeroStat icon={Trophy} value={stats?.topCtc ?? "—"} label="Highest package" />
                <HeroStat icon={Wallet} value={stats?.avgCtc ?? "—"} label="Average package" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.26 }}
                className="mt-9 flex items-center justify-center lg:justify-start gap-3 flex-wrap"
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-violet-500 text-white h-11 px-7 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)]"
                  onClick={() => document.getElementById("placement-wall")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Meet our placed students <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-6 backdrop-blur"
                  onClick={() => navigate({ name: "contact" })}
                >
                  Hire from our talent pool
                </Button>
              </motion.div>
            </div>

            {/* right: featured spotlight */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative mx-auto w-full max-w-[500px]"
            >
              <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                <div className="h-[70%] w-[70%] rounded-full bg-emerald-500/10 blur-[70px]" />
              </div>

              {spotlight ? (
                <div className="relative space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelected(spotlight)}
                    className="block w-full text-left rounded-3xl border border-violet-500/25 bg-card/60 backdrop-blur p-6 transition-colors hover:border-violet-500/45"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300">
                        Spotlight
                      </span>
                      {spotlight.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified offer
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-center gap-3">
                      <Avatar p={spotlight} size="h-14 w-14 text-base" />
                      <div>
                        <div className="text-base font-bold leading-tight">{spotlight.studentName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {spotlight.role} · {spotlight.company}
                        </div>
                      </div>
                      {spotlight.ctc && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                          <Wallet className="h-3 w-3" /> {spotlight.ctc}
                        </span>
                      )}
                    </div>
                    {spotlight.quote && (
                      <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                        <Quote className="mr-1.5 inline h-3.5 w-3.5 text-violet-400/70" />
                        {spotlight.quote}
                      </p>
                    )}
                  </button>

                  {recent.length > 0 && (
                    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur divide-y divide-border/40">
                      {recent.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelected(p)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-500/5"
                        >
                          <Avatar p={p} size="h-8 w-8 text-[11px]" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{p.studentName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {p.role} · {p.company}
                            </div>
                          </div>
                          <span className="ml-auto shrink-0 text-[11px] font-mono text-muted-foreground">{p.year}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle animate-pulse" />
                    {placements.length} published {placements.length === 1 ? "outcome" : "outcomes"}
                  </p>
                </div>
              ) : (
                <div className="relative rounded-3xl border border-border/60 bg-card/40 backdrop-blur p-8 text-center">
                  {isLoading ? (
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" />
                  ) : (
                    <>
                      <Trophy className="mx-auto h-8 w-8 text-violet-300/70" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        The wall is being curated - check back shortly.
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* dual-lane marquee: companies + roles */}
          {(companies.length > 0 || roles.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="relative mt-12 space-y-3"
            >
              <MarqueeRow items={companies.length > 0 ? companies : FALLBACK_COMPANIES} duration={46} />
              <MarqueeRow items={roles.length > 0 ? roles : FALLBACK_COMPANIES} duration={58} reverse />
            </motion.div>
          )}
        </div>
      </section>

      {/* ================= THE PLACEMENT WALL ================= */}
      <section id="placement-wall" className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              The Placement <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">Wall</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Real students. Real offers. Every card is entered and verified by the
              GuardianX team - sample placeholders are labelled until replaced.
            </p>
          </div>

          {/* filter bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students, roles or companies…"
                className="pl-9 bg-transparent border-border/50"
              />
            </div>
            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger className="sm:w-[220px] bg-transparent border-border/50">
                <SelectValue placeholder="All tracks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracks</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="sm:w-[140px] bg-transparent border-border/50">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data?.degraded && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              The placements service is warming up. Please refresh in a moment.
            </div>
          )}

          {/* count */}
          <p className="mt-5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {isLoading ? "Loading outcomes…" : `${filtered.length} of ${placements.length} outcomes`}
            {search || trackFilter !== "all" || yearFilter !== "all" ? " (filtered)" : ""}
          </p>

          {/* grid */}
          {isLoading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl border border-border/40 bg-card/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <PlacementCard key={p.id} p={p} onOpen={setSelected} />
              ))}
            </div>
          ) : (
            !data?.degraded && (
              <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-10 text-center">
                <Target className="mx-auto h-8 w-8 text-violet-300/70" />
                <p className="mt-3 text-sm font-medium">No outcomes match those filters yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Try clearing the search or picking a different track.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch("")
                    setTrackFilter("all")
                    setYearFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )
          )}
        </div>
      </section>

      {/* ================= HOW THE PLACEMENT CELL WORKS ================= */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              How the placement <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">cell works</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              A placement isn't luck - it's a pipeline. Every step below is a real
              feature you can start using today.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5 flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-violet-500/10 text-violet-300">
                    <s.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground flex-1">{s.text}</p>
                <button
                  type="button"
                  onClick={() => navigate({ name: s.viewName } as any)}
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-violet-300 hover:text-violet-200 transition-colors"
                >
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ALUMNI STORIES ================= */}
      {stories.length > 0 && (
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                In their <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">own words</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                Longer stories from students who walked the pipeline above.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {stories.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="text-left rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 transition-colors hover:border-violet-500/40"
                >
                  <Quote className="h-5 w-5 text-violet-400/70" />
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80 line-clamp-5">
                    {p.story}
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <Avatar p={p} size="h-9 w-9 text-[11px]" />
                    <div>
                      <div className="text-xs font-semibold">{p.studentName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.role} · {p.company}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= HIRE FROM US ================= */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/15 via-card/60 to-emerald-500/10 backdrop-blur p-8 sm:p-12">
            <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-violet-600/20 blur-[90px]" />
            <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-violet-300">
                  <Landmark className="h-3.5 w-3.5" /> For employers
                </span>
                <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Looking to hire job-ready security talent?
                </h2>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                  Our students graduate with hands-on lab hours, proctored
                  certifications and interview drills - and they're hiring-ready from
                  day one. Tell us the role profile and we'll shortlist matching,
                  verified candidates from the wall above.
                </p>
              </div>
              <div className="flex lg:flex-col gap-3 lg:items-stretch justify-center flex-wrap">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)]"
                  onClick={() => navigate({ name: "corporate-training" })}
                >
                  Corporate training & hiring <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button size="lg" variant="outline" className="backdrop-blur" onClick={() => navigate({ name: "contact" })}>
                  Talk to the placement cell
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="mx-auto max-w-3xl text-center">
          <Rocket className="mx-auto h-9 w-9 text-violet-300" />
          <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Become our next <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">placement story</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Join an upcoming batch, earn your certification, and let the placement
            cell do the heavy lifting. The next card on this wall could carry your name.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white h-11 px-7 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)]"
              onClick={() => navigate({ name: "batches" })}
            >
              <GraduationCap className="h-4 w-4 mr-1.5" /> Join an upcoming batch
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6 backdrop-blur" onClick={() => navigate({ name: "catalog" })}>
              Explore courses
            </Button>
          </div>
        </div>
      </section>

      {/* ================= DETAIL DIALOG ================= */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto custom-scrollbar">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 pr-6">
                  <Avatar p={selected} size="h-10 w-10 text-xs" />
                  <span className="leading-tight">{selected.studentName}</span>
                  {selected.verified && <BadgeCheck className="h-5 w-5 text-emerald-400 shrink-0" />}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Briefcase className="h-3 w-3 text-violet-300" /> {selected.role}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Building2 className="h-3 w-3 text-violet-300" /> {selected.company}
                  </span>
                  {selected.ctc && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      <Wallet className="h-3 w-3" /> {selected.ctc}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <GraduationCap className="h-3 w-3 text-violet-300" /> {selected.track}
                  </span>
                  <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {selected.year}
                  </span>
                  {selected.isSample && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-amber-300">
                      Sample
                    </span>
                  )}
                </div>

                {selected.quote && (
                  <p className="text-sm leading-relaxed text-foreground/80 border-l-2 border-violet-500/40 pl-3">
                    {selected.quote}
                  </p>
                )}

                {selected.story && (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {selected.story}
                  </p>
                )}

                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  {selected.linkedIn && (
                    <a href={selected.linkedIn} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> LinkedIn profile
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                    onClick={() => navigate({ name: "batches" })}
                  >
                    Start your journey <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PlacementsView
