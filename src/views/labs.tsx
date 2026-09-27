"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { colorFor, DIFFICULTY_COLORS } from "@/lib/colors"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, Clock, Target, ChevronRight, Terminal,
  CheckCircle2, Circle, PlayCircle, Zap, TrendingUp, Trophy,
  ArrowRight, Crosshair, Activity, Lock, Radar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, Counter, CursorGlow,
  ScaleReveal, BlurReveal,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

/* ============================================================
   LabsView - Cyber Range Catalog
   Premium editorial experience: oversized headline, immersive
   featured mission, editorial lab rows (not a card grid).
   ============================================================ */

// Format milliseconds as Mm Ss or Hh Mm
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

interface LabItem {
  id: string; slug: string; title: string; description: string; longDescription: string
  category: string; difficulty: string; durationMin: number; points: number; tags: string
  color: string; progress?: { status: string; flagFound: boolean } | null
}

const CATEGORIES = ["All", "Web Security", "Network", "Privilege Escalation", "Cryptography", "Forensics", "Reverse Engineering", "Active Directory", "Cloud Security", "OSINT", "Mobile Security", "IoT Security"]
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard", "Insane"]

const DIFFICULTY_DOTS: Record<string, { count: number; color: string; label: string }> = {
  Easy: { count: 1, color: "bg-emerald-400", label: "text-emerald-400" },
  Medium: { count: 2, color: "bg-amber-400", label: "text-amber-400" },
  Hard: { count: 3, color: "bg-rose-400", label: "text-rose-400" },
  Insane: { count: 4, color: "bg-fuchsia-400", label: "text-fuchsia-400" },
}

export function LabsView() {
  const { navigate } = useAppStore()
  const [q, setQ] = React.useState("")
  const [category, setCategory] = React.useState("All")
  const [difficulty, setDifficulty] = React.useState("All")

  const { data, isLoading } = useQuery<{ labs: LabItem[] }>({
    queryKey: ["labs", q, category, difficulty],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (category !== "All") params.set("category", category)
      if (difficulty !== "All") params.set("difficulty", difficulty)
      return api(`/api/labs?${params.toString()}`)
    },
  })

  const labs = data?.labs ?? []
  const completed = labs.filter((l) => l.progress?.status === "completed").length
  const inProgress = labs.filter((l) => l.progress?.status === "in_progress").length
  const totalPoints = labs.filter((l) => l.progress?.status === "completed").reduce((a, l) => a + l.points, 0)

  // Featured lab: first in-progress, otherwise first available
  const featured = labs.find((l) => l.progress?.status === "in_progress") ?? labs[0]
  const featuredCol = featured ? colorFor(featured.color) : null
  const restLabs = featured ? labs.filter((l) => l.id !== featured.id) : labs

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HERO - oversized "Enter the range."
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">
              HANDS-ON CYBER RANGE · LIVE ENVIRONMENTS
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-4 text-balance">
            Enter the <span className="text-gradient-premium">range.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <p className="text-muted-foreground max-w-xl text-base lg:text-lg mb-12 text-balance">
            Practice real-world offensive security challenges. From SQL injection to Active Directory Kerberoasting - solve CTF-style labs and capture the flag.
          </p>
        </ScrollReveal>

        {/* ====================================================
            STATS STRIP - open, no card grid
            ==================================================== */}
        <ScrollReveal delay={0.2}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16 border-t border-b border-border/60 py-8">
            {[
              { label: "Total Labs", value: labs.length, icon: Terminal, color: "text-violet-300" },
              { label: "Solved", value: completed, icon: CheckCircle2, color: "text-emerald-300" },
              { label: "In Progress", value: inProgress, icon: Circle, color: "text-amber-300" },
              { label: "Points Earned", value: totalPoints, icon: Target, color: "text-cyan-300" },
            ].map((s, i) => (
              <div key={s.label} className="relative">
                {i > 0 && (
                  <div className="absolute left-0 top-0 h-full w-px bg-border/40 hidden lg:block" />
                )}
                <s.icon className={cn("h-4 w-4 mb-3", s.color)} />
                <div className="text-4xl font-bold mb-1 tabular-nums">
                  <Counter value={s.value} />
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ====================================================
            FEATURED LAB - large, immersive with network viz
            ==================================================== */}
        {featured && featuredCol && (
          <ScrollReveal delay={0.25}>
            <FeaturedLab
              lab={featured}
              col={featuredCol}
              onOpen={() => navigate({ name: "lab", labSlug: featured.slug })}
            />
          </ScrollReveal>
        )}

        {/* ====================================================
            PROGRESS DASHBOARD - editorial breakdown
            ==================================================== */}
        <ScrollReveal delay={0.3}>
          <div className="mt-16">
            <LabProgressDashboard />
          </div>
        </ScrollReveal>

        {/* ====================================================
            FILTER BAR - minimal, open
            ==================================================== */}
        <div className="mt-16 mb-8">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
              <div>
                <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-2">MISSION CATALOG</p>
                <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.03em]">
                  All labs
                </h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                {isLoading ? "LOADING..." : `${labs.length} AVAILABLE`}
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <div className="flex flex-col sm:flex-row gap-3 pb-6 border-b border-border/60">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                <Input
                  placeholder="Search by name, technique, or tag..."
                  className="pl-9 bg-transparent border-border/40 focus-visible:border-violet-500/40"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[220px] bg-transparent border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full sm:w-[160px] bg-transparent border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </ScrollReveal>
        </div>

        {/* ====================================================
            LABS LIST - editorial rows, NOT card grid
            ==================================================== */}
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : restLabs.length === 0 && !featured ? (
          <EmptyState />
        ) : (
          <Stagger staggerChildren={0.05} className="space-y-0">
            {/* List header - desktop only, technical labels */}
            <div className="hidden lg:grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-6 px-6 py-3 border-b border-border/60 text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
              <span className="w-12">#</span>
              <span>Title</span>
              <span>Category</span>
              <span>Difficulty</span>
              <span>Time</span>
              <span>Points</span>
              <span className="text-right">Status</span>
            </div>
            {restLabs.map((lab, idx) => (
              <StaggerItem key={lab.id} y={20}>
                <LabRow
                  lab={lab}
                  index={idx + (featured ? 1 : 0) + 1}
                  onClick={() => navigate({ name: "lab", labSlug: lab.slug })}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   FeaturedLab - large immersive hero lab with network viz
   ============================================================ */
function FeaturedLab({ lab, col, onOpen }: { lab: LabItem; col: any; onOpen: () => void }) {
  const dot = DIFFICULTY_DOTS[lab.difficulty] ?? DIFFICULTY_DOTS.Medium
  const done = lab.progress?.status === "completed"
  const started = lab.progress?.status === "in_progress"

  return (
    <CursorGlow>
      <div
        onClick={onOpen}
        className="group relative overflow-hidden rounded-2xl border border-violet-500/20 bg-card/30 cursor-pointer transition-all duration-500 hover:border-violet-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.55_0.24_295/0.25)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Visual side - network viz + giant number */}
          <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto overflow-hidden min-h-[280px]">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-cyan-950/20" />
            <div className="absolute inset-0 bg-grid opacity-15" />
            <NetworkVisualization variant="section" className="absolute inset-0 opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] font-mono tracking-[0.25em] mb-6">
                <Crosshair className="h-3 w-3" /> FEATURED MISSION
              </div>
              <span className="text-[clamp(4rem,12vw,8rem)] leading-none font-bold font-mono text-outline-violet opacity-60">
                {String(lab.id).slice(-2).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Content side */}
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-mono tracking-[0.15em] uppercase border-violet-500/30 text-violet-300">
                  {lab.category}
                </Badge>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn("h-1.5 w-1.5 rounded-full", i < dot.count ? dot.color : "bg-border")}
                    />
                  ))}
                  <span className={cn("text-[10px] font-mono ml-1.5", dot.label)}>
                    {lab.difficulty.toUpperCase()}
                  </span>
                </div>
                {done && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" /> SOLVED
                  </span>
                )}
                {started && !done && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                    <Circle className="h-3 w-3 fill-current" /> IN PROGRESS
                  </span>
                )}
              </div>

              <h3 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance group-hover:text-violet-300 transition-colors">
                {lab.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 max-w-xl">
                {lab.longDescription || lab.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  <span className="font-mono text-xs">{lab.durationMin} min</span>
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4 text-violet-300" />
                  <span className="font-mono text-xs">{lab.points} pts</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <Button className="bg-violet-600 hover:bg-violet-500 btn-premium group-hover:scale-[1.02] transition-transform">
                {done ? "Replay Mission" : started ? "Resume Mission" : "Begin Mission"}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <span className="text-[10px] text-muted-foreground font-mono tracking-[0.2em]">
                {done ? "COMPLETED" : started ? "ACTIVE SESSION" : "READY TO DEPLOY"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   LabRow - editorial horizontal row
   ============================================================ */
function LabRow({ lab, index, onClick }: { lab: LabItem; index: number; onClick: () => void }) {
  const dot = DIFFICULTY_DOTS[lab.difficulty] ?? DIFFICULTY_DOTS.Medium
  const done = lab.progress?.status === "completed"
  const started = lab.progress?.status === "in_progress"

  return (
    <CursorGlow>
      <div
        onClick={onClick}
        className="group relative grid grid-cols-[auto_1fr_auto] lg:grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-4 lg:gap-6 px-4 lg:px-6 py-5 cursor-pointer border-b border-border/40 hover:border-violet-500/30 transition-all duration-300 hover:bg-violet-500/[0.02]"
      >
        {/* Lab number */}
        <div className="font-mono text-2xl font-bold text-outline-violet w-12 leading-none">
          {String(index).padStart(2, "0")}
        </div>

        {/* Title + status */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
            {started && !done && <Circle className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
            {!done && !started && <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />}
          </div>
          <h3 className="text-base lg:text-lg font-semibold truncate group-hover:text-violet-300 transition-colors">
            {lab.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate lg:hidden mt-0.5">{lab.category}</p>
        </div>

        {/* Category - desktop only */}
        <div className="hidden lg:block">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            {lab.category}
          </span>
        </div>

        {/* Difficulty - desktop only, dots */}
        <div className="hidden lg:flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-1.5 rounded-full", i < dot.count ? dot.color : "bg-border")}
            />
          ))}
          <span className={cn("text-[10px] font-mono ml-1", dot.label)}>{lab.difficulty}</span>
        </div>

        {/* Duration */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Clock className="h-3 w-3" />
          {lab.durationMin}m
        </div>

        {/* Points */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-violet-300">
          <Target className="h-3 w-3" />
          {lab.points}
        </div>

        {/* Status + arrow */}
        <div className="flex items-center gap-3 justify-end">
          {done && (
            <span className="hidden sm:inline-flex text-[10px] font-mono text-emerald-400 tracking-[0.15em]">SOLVED</span>
          )}
          {started && !done && (
            <span className="hidden sm:inline-flex text-[10px] font-mono text-amber-400 tracking-[0.15em]">ACTIVE</span>
          )}
          {!done && !started && (
            <span className="hidden sm:inline-flex text-[10px] font-mono text-muted-foreground tracking-[0.15em]">READY</span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-violet-300 transition-all" />
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   EmptyState - premium with Target icon
   ============================================================ */
function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 p-16 text-center">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="relative z-10">
        <div className="inline-flex p-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
          <Target className="h-10 w-10 text-violet-300" strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-bold mb-2 tracking-tight">No missions match</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Adjust your filters or search terms to discover available cyber range challenges.
        </p>
      </div>
    </div>
  )
}

/* ============================================================
   LabProgressDashboard - editorial breakdown
   ============================================================ */
function LabProgressDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["lab-stats"],
    queryFn: () => api("/api/labs/stats"),
  })

  if (isLoading) return <Skeleton className="h-40" />
  if (!data) return null

  const CAT_COLORS: Record<string, string> = {
    "Web Security": "text-violet-400 bg-violet-500/10 border-violet-500/30",
    "Network": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    "Privilege Escalation": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "Cryptography": "text-amber-400 bg-amber-500/10 border-amber-500/30",
    "Forensics": "text-teal-400 bg-teal-500/10 border-teal-500/30",
    "Reverse Engineering": "text-rose-400 bg-rose-500/10 border-rose-500/30",
    "Active Directory": "text-orange-400 bg-orange-500/10 border-orange-500/30",
    "Cloud Security": "text-sky-400 bg-sky-500/10 border-sky-500/30",
    "OSINT": "text-lime-400 bg-lime-500/10 border-lime-500/30",
    "Mobile Security": "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30",
    "IoT Security": "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 p-6 lg:p-8">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/8 blur-[80px] rounded-full" />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-mono text-violet-300 tracking-[0.3em] mb-1">YOUR PROGRESS</p>
            <h3 className="text-xl lg:text-2xl font-bold tracking-[-0.02em]">Range mastery</h3>
          </div>
          <div className="flex items-center gap-6">
            <StatPill label="Solved" value={`${data.completed}/${data.total}`} color="text-emerald-300" />
            <StatPill label="Points" value={data.earnedPoints.toLocaleString()} color="text-violet-300" />
            <StatPill label="Overall" value={`${data.overallPct}%`} color="text-cyan-300" />
            {data.totalTimeSpentMs > 0 && (
              <StatPill label="Time" value={formatDuration(data.totalTimeSpentMs)} color="text-amber-300" />
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mb-8">
          <Progress value={data.overallPct} className="h-1" />
        </div>

        {/* Two-column open breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* By category */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] uppercase mb-4">
              By Category
            </p>
            <div className="space-y-3">
              {data.categories.map((cat: any) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={cn("inline-block h-2 w-2 rounded-full", CAT_COLORS[cat.name]?.split(" ")[1] ?? "bg-muted-foreground")} />
                      <span className="font-medium">{cat.name}</span>
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">{cat.completed}/{cat.total}</span>
                  </div>
                  <Progress value={cat.progressPct} className="h-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* By difficulty */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] uppercase mb-4">
              By Difficulty
            </p>
            <div className="grid grid-cols-2 gap-4">
              {data.difficulties.map((diff: any) => {
                const dot = DIFFICULTY_DOTS[diff.name] ?? DIFFICULTY_DOTS.Medium
                return (
                  <div key={diff.name} className="border-l-2 border-border/60 pl-4 py-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn("h-1 w-1 rounded-full", i < dot.count ? dot.color : "bg-border")}
                          />
                        ))}
                        <span className="ml-1">{diff.name}</span>
                      </span>
                      <Trophy className="h-3 w-3 opacity-40" />
                    </div>
                    <div className="text-xl font-bold tabular-nums mb-1">
                      {diff.completed}<span className="text-xs text-muted-foreground font-normal">/{diff.total}</span>
                    </div>
                    <Progress value={diff.progressPct} className="h-0.5" />
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">{diff.points} pts</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-right">
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">{label}</div>
    </div>
  )
}
