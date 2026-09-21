"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { colorFor, DIFFICULTY_COLORS } from "@/lib/colors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronLeft, Terminal, Target, Clock, Flag, Lightbulb, CheckCircle2,
  PlayCircle, ListChecks, BookOpen, Zap, Trophy, ArrowRight,
  ChevronDown, ChevronUp, Activity, Crosshair, ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, Stagger, StaggerItem, Counter, CursorGlow,
  ScaleReveal,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

/* ============================================================
   LabDetailView - Cyber Range Mission
   Premium cinematic experience: oversized mission title,
   immersive header with network viz, sticky briefing,
   objective checklist, premium terminal, collapsible hints.
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

interface LabData {
  lab: {
    id: string; slug: string; title: string; description: string; longDescription: string
    category: string; difficulty: string; durationMin: number; points: number; tags: string
    scenario: string; objectives: string; hints: string; commands: string; color: string
    // NOTE: `flag` is intentionally omitted from the client type. The
    // server never ships the flag in the lab detail response - it's only
    // returned from /api/labs/[slug]/submit after a correct submission
    // or a "reveal" action. See src/lib/safe-lab.ts (master-prompt §34, §80-81).
  }
  progress: { status: string; flagFound: boolean; hintsUsed: number; timeSpentMs?: number; attempts?: number } | null
}

const DIFFICULTY_DOTS: Record<string, { count: number; color: string; label: string }> = {
  Easy: { count: 1, color: "bg-emerald-400", label: "text-emerald-400" },
  Medium: { count: 2, color: "bg-amber-400", label: "text-amber-400" },
  Hard: { count: 3, color: "bg-rose-400", label: "text-rose-400" },
  Insane: { count: 4, color: "bg-fuchsia-400", label: "text-fuchsia-400" },
}

export function LabDetailView() {
  const { view, navigate } = useAppStore()
  const slug = view.name === "lab" ? view.labSlug : ""
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<LabData>({
    queryKey: ["lab", slug],
    queryFn: () => api(`/api/labs/${slug}`),
    enabled: !!slug,
  })

  const startMutation = useMutation({
    mutationFn: () => api(`/api/labs/${slug}/submit`, { method: "POST", body: JSON.stringify({ action: "join" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab", slug] }),
  })

  if (isLoading) return <Skeleton className="h-96" />
  if (!data) return null

  const { lab, progress } = data
  // colorFor retained for compatibility with lab.color (used to drive accent theme)
  const col = colorFor(lab.color)
  const objectives = lab.objectives.split("|").filter(Boolean)
  const commands = lab.commands.split("|").filter(Boolean)
  const done = progress?.status === "completed"
  const started = !!progress
  const dot = DIFFICULTY_DOTS[lab.difficulty] ?? DIFFICULTY_DOTS.Medium

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Back */}
        <ScrollReveal>
          <button
            onClick={() => navigate({ name: "labs" })}
            className="group inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.25em] text-muted-foreground hover:text-violet-300 transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            BACK TO RANGE
          </button>
        </ScrollReveal>

        {/* ====================================================
            HEADER - oversized title with network viz background
            ==================================================== */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 mb-10">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-cyan-950/15" />
          <div className="absolute inset-0 bg-grid opacity-15" />
          <NetworkVisualization variant="section" className="absolute inset-0 opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <div className="relative z-10 p-8 lg:p-12">
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] font-mono tracking-[0.25em]">
                  <Crosshair className="h-3 w-3" /> MISSION BRIEF
                </div>
                <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                  {lab.category.toUpperCase()}
                </span>
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
                    <ShieldCheck className="h-3 w-3" /> SOLVED
                  </span>
                )}
                {started && !done && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                    <Activity className="h-3 w-3" /> ACTIVE
                  </span>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <h1 className="text-[clamp(2rem,6vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.04em] mb-4 text-balance">
                {lab.title}
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <p className="text-muted-foreground max-w-2xl text-base lg:text-lg mb-8">
                {lab.longDescription}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border/60 pt-6">
                <HeaderStat icon={Clock} label="EST. TIME" value={`${lab.durationMin}m`} color="text-cyan-300" />
                <HeaderStat icon={Target} label="REWARD" value={`${lab.points} pts`} color="text-violet-300" />
                <HeaderStat icon={Lightbulb} label="HINTS USED" value={`${progress?.hintsUsed ?? 0}`} color="text-amber-300" />
                {progress?.timeSpentMs ? (
                  <HeaderStat icon={Activity} label="TIME SPENT" value={formatDuration(progress.timeSpentMs)} color="text-emerald-300" />
                ) : null}
                <HeaderStat icon={Trophy} label="XP REWARD" value={`${lab.points} XP`} color="text-violet-300" />
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* ====================================================
            SUCCESS BANNER - if lab completed
            ==================================================== */}
        {done && (
          <ScaleReveal className="mb-8">
            <SuccessBanner points={lab.points} />
          </ScaleReveal>
        )}

        {/* ====================================================
            MAIN GRID - content + sticky sidebar
            ==================================================== */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Main content (briefing, objectives, terminal, hints) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mission Briefing - with sticky header */}
            <ScrollReveal>
              <MissionBriefing scenario={lab.scenario} />
            </ScrollReveal>

            {/* Objectives */}
            <ScrollReveal>
              <div className="relative rounded-2xl border border-border/60 bg-card/30 p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <ListChecks className="h-4 w-4 text-amber-300" />
                  <span className="text-[10px] font-mono text-amber-300 tracking-[0.25em]">OBJECTIVES</span>
                </div>
                <Stagger staggerChildren={0.08} className="space-y-2">
                  {objectives.map((obj, i) => (
                    <StaggerItem key={i}>
                      <ObjectiveRow index={i + 1} text={obj} done={done} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </ScrollReveal>

            {/* Terminal */}
            <ScrollReveal>
              <LabTerminal
                labSlug={slug}
                labTitle={lab.title}
                commands={commands}
                started={started}
                done={done}
                onStart={() => startMutation.mutate()}
              />
            </ScrollReveal>

            {/* Hints - collapsible */}
            <ScrollReveal>
              <HintsPanel
                slug={slug}
                hintsString={lab.hints}
                hintsUsed={progress?.hintsUsed ?? 0}
                difficulty={lab.difficulty}
              />
            </ScrollReveal>
          </div>

          {/* Right: Sticky sidebar */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* Reward */}
              <ScrollReveal>
                <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-transparent p-6">
                  <div className="absolute inset-0 bg-grid opacity-10" />
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-violet-600/15 blur-[60px] rounded-full" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <Trophy className="h-6 w-6 text-violet-300" />
                      <span className="text-[10px] font-mono text-violet-300 tracking-[0.25em]">REWARD</span>
                    </div>
                    <div className="text-4xl font-bold text-violet-300 mb-1 tabular-nums">
                      <Counter value={lab.points} />
                      <span className="text-base text-muted-foreground font-normal ml-1">XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {done
                        ? "Earned. Mission complete."
                        : "Solve this lab to claim XP and unlock achievements."}
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Mission Stats */}
              <ScrollReveal delay={0.05}>
                <div className="rounded-2xl border border-border/60 bg-card/30 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Activity className="h-4 w-4 text-cyan-300" />
                    <span className="text-[10px] font-mono text-cyan-300 tracking-[0.25em]">MISSION STATS</span>
                  </div>
                  <div className="space-y-3">
                    <SidebarStat
                      label="Status"
                      value={done ? "Solved" : started ? "In Progress" : "Ready"}
                      valueColor={done ? "text-emerald-400" : started ? "text-amber-400" : "text-muted-foreground"}
                    />
                    <SidebarStat
                      label="Time Spent"
                      value={progress?.timeSpentMs ? formatDuration(progress.timeSpentMs) : "-"}
                      mono
                    />
                    <SidebarStat
                      label="Hints Used"
                      value={`${progress?.hintsUsed ?? 0}`}
                      mono
                    />
                    <SidebarStat label="Difficulty" value={lab.difficulty} />
                    <SidebarStat label="Category" value={lab.category} />
                    <SidebarStat label="Est. Duration" value={`${lab.durationMin} min`} mono />
                  </div>
                </div>
              </ScrollReveal>

              {/* Available tools */}
              <ScrollReveal delay={0.1}>
                <div className="rounded-2xl border border-border/60 bg-card/30 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Terminal className="h-4 w-4 text-cyan-300" />
                    <span className="text-[10px] font-mono text-cyan-300 tracking-[0.25em]">AVAILABLE TOOLS</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commands.map((cmd) => (
                      <span
                        key={cmd}
                        className="px-2 py-1 rounded-md bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono"
                      >
                        {cmd}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   HeaderStat - small inline stat for header
   ============================================================ */
function HeaderStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{label}</span>
      </div>
      <div className={cn("text-sm font-mono font-semibold", color)}>{value}</div>
    </div>
  )
}

/* ============================================================
   SidebarStat - key/value row
   ============================================================ */
function SidebarStat({ label, value, color, valueColor, mono }: { label: string; value: string; color?: string; valueColor?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
      <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">{label}</span>
      <span className={cn("text-sm", mono && "font-mono", valueColor ?? color)}>{value}</span>
    </div>
  )
}

/* ============================================================
   MissionBriefing - sticky header within briefing card
   ============================================================ */
function MissionBriefing({ scenario }: { scenario: string }) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/30 overflow-hidden">
      {/* Sticky header within the briefing card */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/85 border-b border-border/60 px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-300" />
            <span className="text-[10px] font-mono text-violet-300 tracking-[0.25em]">MISSION BRIEFING</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] hidden sm:inline">
            SCENARIO · INTEL
          </span>
        </div>
      </div>
      <div className="p-6 lg:p-8">
        <div className="prose-guardianx max-w-none text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{scenario}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   ObjectiveRow - single objective with checkmark state
   ============================================================ */
function ObjectiveRow({ index, text, done }: { index: number; text: string; done: boolean }) {
  return (
    <div className="group flex items-start gap-4 p-3 rounded-lg hover:bg-muted/20 transition-colors">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold transition-all",
          done
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            : "bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:border-amber-500/40"
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : index}
      </span>
      <span className={cn("text-sm pt-1 leading-relaxed", done && "text-muted-foreground line-through")}>
        {text}
      </span>
    </div>
  )
}

/* ============================================================
   SuccessBanner - celebration on completion
   ============================================================ */
function SuccessBanner({ points }: { points: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-background to-violet-950/30 p-8">
      <div className="absolute inset-0 bg-grid opacity-15" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/15 blur-[80px] rounded-full" />
      <NetworkVisualization variant="minimal" className="absolute right-0 top-0 w-72 h-72 opacity-40" />
      <div className="relative z-10 flex items-center gap-6">
        <div className="inline-flex p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shrink-0">
          <ShieldCheck className="h-8 w-8 text-emerald-300" />
        </div>
        <div>
          <p className="text-[10px] font-mono text-emerald-300 tracking-[0.3em] mb-1">MISSION COMPLETE</p>
          <h3 className="text-2xl lg:text-3xl font-bold mb-1 tracking-[-0.02em]">
            Flag captured. Well done, Guardian.
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="text-emerald-300 font-mono">+{points} XP</span> earned · Achievements updated
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   HintsPanel - collapsible hints section
   ============================================================ */
function HintsPanel({ slug, hintsString, hintsUsed, difficulty }: { slug: string; hintsString: string; hintsUsed: number; difficulty: string }) {
  const qc = useQueryClient()
  const hints = hintsString.split("|").filter(Boolean)
  const [revealed, setRevealed] = React.useState(hintsUsed)
  const [potentialXp, setPotentialXp] = React.useState<number | null>(null)
  const [open, setOpen] = React.useState(false)
  const HINT_PENALTY = 10

  const hintMutation = useMutation({
    mutationFn: () => api(`/api/labs/${slug}/submit`, { method: "POST", body: JSON.stringify({ action: "hint" }) }),
    onSuccess: (data) => {
      setRevealed((r) => r + 1)
      setPotentialXp(data.potentialXp)
      qc.invalidateQueries({ queryKey: ["lab", slug] })
      toast.info(`Hint ${revealed + 1}: ${data.hint}`, {
        description: `-${HINT_PENALTY} XP on completion. Potential XP: ${data.potentialXp}`,
      })
    },
  })

  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Lightbulb className="h-4 w-4 text-amber-300" />
          <span className="text-[10px] font-mono text-amber-300 tracking-[0.25em]">HINTS</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-2 tracking-[0.15em]">
            {revealed}/{hints.length} REVEALED
          </span>
        </div>
        <div className="flex items-center gap-2">
          {revealed < hints.length && (
            <span className="text-[10px] font-mono text-rose-400 hidden sm:inline">
              -{HINT_PENALTY} XP EACH
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-3">
              {hints.slice(0, revealed).map((h, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground flex items-start gap-3"
                >
                  <span className="text-[10px] font-mono text-amber-400 shrink-0 mt-0.5 tracking-[0.1em]">
                    H{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{h}</span>
                </div>
              ))}
              {revealed === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Stuck? Reveal hints one at a time. Each hint reduces your XP reward.
                  </p>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-[10px] text-rose-300">
                    <Zap className="h-3 w-3 shrink-0" />
                    <span>Each hint deducts {HINT_PENALTY} XP from your lab reward.</span>
                  </div>
                </div>
              )}
              {potentialXp !== null && revealed > 0 && (
                <div className="p-2.5 rounded-lg bg-muted/30 text-[10px] text-center">
                  <span className="text-muted-foreground tracking-[0.15em]">POTENTIAL XP: </span>
                  <span className={cn("font-mono font-bold", potentialXp < 100 ? "text-amber-400" : "text-emerald-400")}>
                    {potentialXp} XP
                  </span>
                  {revealed > 0 && <span className="text-rose-400 ml-1">(-{revealed * HINT_PENALTY})</span>}
                </div>
              )}
              {revealed < hints.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => hintMutation.mutate()}
                  disabled={hintMutation.isPending}
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                  Reveal Hint ({revealed}/{hints.length})
                  <span className="ml-1 text-[9px] text-rose-400">-{HINT_PENALTY} XP</span>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center">All hints revealed.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   LabTerminal - premium terminal with violet accent
   ============================================================ */
function LabTerminal({ labSlug, labTitle, commands, started, done, onStart }: {
  labSlug: string; labTitle: string; commands: string[]; started: boolean; done: boolean; onStart: () => void
}) {
  const qc = useQueryClient()
  const [history, setHistory] = React.useState<{ type: "in" | "out" | "err" | "ok"; text: string }[]>([
    { type: "out", text: "GuardianX Lab Terminal v1.0" },
    { type: "out", text: "Type 'help' to see available commands." },
    { type: "out", text: "" },
  ])
  const [input, setInput] = React.useState("")
  const [flagInput, setFlagInput] = React.useState("")
  const [cmdHistory, setCmdHistory] = React.useState<string[]>([])
  const [histIdx, setHistIdx] = React.useState(-1)
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const endRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const sessionStartRef = React.useRef<number>(0)
  const lastHeartbeatRef = React.useRef<number>(0)

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [history])

  // Time tracking: start timer when lab starts, send heartbeats every 15s
  React.useEffect(() => {
    if (!started || done) return
    sessionStartRef.current = Date.now()
    lastHeartbeatRef.current = Date.now()

    const tickInterval = setInterval(() => {
      setElapsedMs(Date.now() - sessionStartRef.current)
    }, 1000)

    const heartbeatInterval = setInterval(async () => {
      const now = Date.now()
      const elapsed = now - lastHeartbeatRef.current
      lastHeartbeatRef.current = now
      try {
        await fetch(`/api/labs/${labSlug}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "heartbeat", timeSpentMs: elapsed }),
          credentials: "include",
        })
      } catch {}
    }, 15000)

    return () => {
      clearInterval(tickInterval)
      clearInterval(heartbeatInterval)
      const finalElapsed = Date.now() - lastHeartbeatRef.current
      if (finalElapsed > 2000) {
        fetch(`/api/labs/${labSlug}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "heartbeat", timeSpentMs: finalElapsed }),
          credentials: "include",
        }).catch(() => {})
      }
    }
  }, [started, done, labSlug])

  const submitMutation = useMutation({
    mutationFn: (flagValue: string) => api(`/api/labs/${labSlug}/submit`, { method: "POST", body: JSON.stringify({ action: "submit", flag: flagValue }) }),
    onSuccess: (data) => {
      if (data.correct) {
        setHistory((h) => [...h, { type: "ok", text: "✓ FLAG ACCEPTED! Lab solved. Well done, Guardian." }])
        if (data.flag) setHistory((h) => [...h, { type: "ok", text: `  Flag: ${data.flag}` }])
        toast.success("Flag captured! Lab complete!")
        qc.invalidateQueries({ queryKey: ["lab", labSlug] })
        qc.invalidateQueries({ queryKey: ["me"] })
        qc.invalidateQueries({ queryKey: ["achievements"] })
        qc.invalidateQueries({ queryKey: ["lab-stats"] })
        if (data.gamification) {
          import("@/components/providers/gamification-toaster").then((m) => m.showGamification(data.gamification))
        }
      } else {
        setHistory((h) => [...h, { type: "err", text: "✗ Incorrect flag. Try again." }])
        toast.error("Incorrect flag")
      }
    },
  })

  // "reveal" mutation - used by the simulated terminal when the user
  // "finds" the flag through gameplay (e.g. types `cat /root/flag.txt`).
  // The server marks the lab complete and returns the flag for display,
  // WITHOUT ever shipping the flag to the client in the lab detail
  // response. This closes the devtools-leak vulnerability (§34, §80-81).
  const revealMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/labs/${labSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal" }),
        credentials: "include",
      })
      if (!r.ok) throw new Error("Reveal failed")
      return r.json()
    },
    onSuccess: (data) => {
      if (data.correct && data.flag) {
        setHistory((h) => [
          ...h,
          { type: "ok", text: `[+] Flag recovered: ${data.flag}` },
          { type: "ok", text: "✓ FLAG ACCEPTED! Lab solved. Well done, Guardian." },
        ])
        toast.success("Flag captured! Lab complete!")
        qc.invalidateQueries({ queryKey: ["lab", labSlug] })
        qc.invalidateQueries({ queryKey: ["me"] })
        qc.invalidateQueries({ queryKey: ["achievements"] })
        qc.invalidateQueries({ queryKey: ["lab-stats"] })
        if (data.gamification) {
          import("@/components/providers/gamification-toaster").then((m) => m.showGamification(data.gamification))
        }
      } else {
        setHistory((h) => [...h, { type: "err", text: "✗ Could not recover flag. Try a different approach." }])
      }
    },
  })

  function exec(cmd: string) {
    const parts = cmd.trim().split(/\s+/)
    const c = parts[0]?.toLowerCase()
    const args = parts.slice(1)
    setHistory((h) => [...h, { type: "in", text: cmd }])

    if (!c) return
    const out = (t: string) => setHistory((h) => [...h, { type: "out", text: t }])
    const err = (t: string) => setHistory((h) => [...h, { type: "err", text: t }])

    switch (c) {
      case "help":
        out("Available commands:")
        out("  help              Show this help")
        out("  ls                List available tools")
        out("  whoami            Show current user")
        out("  target            Show target info")
        out("  submit <flag>     Submit a captured flag")
        out("  clear             Clear terminal")
        out("Available tools: " + commands.join(", "))
        break
      case "ls":
        out(commands.join("  "))
        break
      case "whoami":
        out("guardian@guardianx-lab")
        break
      case "target":
        out("Target: vulnlab.local (10.10.10.5)")
        out("Status: " + (done ? "COMPROMISED" : "ACTIVE"))
        out("OS: Linux 5.15.0 (Ubuntu 22.04)")
        break
      case "submit":
        if (!args[0]) { err("Usage: submit <flag>"); break }
        submitMutation.mutate(args.join(" "))
        out("Submitting flag for verification...")
        break
      case "clear":
        setHistory([])
        break
      default:
        if (commands.includes(c)) {
          out(`[${c}] Running...`)
          if (c === "nmap") {
            out("Starting Nmap 7.94 ( https://nmap.org )")
            out("Nmap scan report for 10.10.10.5")
            out("Host is up (0.012s latency).")
            out("PORT     STATE SERVICE")
            out("22/tcp   open  ssh        OpenSSH 8.9p1")
            out("80/tcp   open  http       Apache httpd 2.4.52")
            out("8080/tcp open  http-proxy Jetty 9.4.44")
            out("Service detection performed.")
          } else if (c === "sqlmap") {
            out("[INFO] testing connection to the target URL")
            out("[INFO] testing if the target parameter 'username' is dynamic")
            out("[INFO] heuristic (basic) test shows that GET parameter 'username' might be injectable")
            out("[INFO] GET parameter 'username' appears to be 'AND boolean-based blind'")
            out("[INFO] the back-end DBMS is MySQL")
            out("[INFO] fetching database names")
            out("available databases [2]:")
            out("[*] information_schema")
            out("[*] vulnapp")
            out("[INFO] fetched data logged to text files under '~/.local/share/sqlmap/output'")
          } else if (c === "curl") {
            out("<html><head><title>VulnApp - Login</title></head>")
            out("<body><form action='/login' method='POST'>")
            out("<input name='username'><input name='password' type='password'>")
            out("<button>Login</button></form></body></html>")
          } else if (c === "find") {
            out("/usr/bin/find  (SUID detected - -rwsr-xr-x)")
            out("Hint: 'find . -exec cat /root/flag.txt \\;' reads files as root")
          } else if (c === "cat") {
            if (args[0]?.includes("flag")) {
              // SECURITY: don't print the flag from a client-side prop.
              // The flag is only ever known to the server. Trigger the
              // server-side "reveal" action which marks the lab complete
              // and returns the flag for display AFTER solving
              // (master-prompt §34, §80-81).
              out("[+] Reading flag file...")
              out("[+] Flag found! Submitting to verify...")
              revealMutation.mutate()
            } else {
              out(args[0] ? `[${args[0]}] (file not accessible in sandbox simulation)` : "Usage: cat <file>")
            }
          } else if (c === "hashcat" || c === "john") {
            out("[*] Starting hash cracker...")
            out("[*] Loaded 1 hash")
            out("[*] Algorithm: MD5")
            out("[*] Wordlist: rockyou.txt")
            out("[*] Cracking... [####################] 100%")
            out("[+] Hash cracked. Use 'cat <flagfile>' to read the recovered flag.")
          } else if (c === "nc" || c === "tshark" || c === "tcpdump") {
            out("[*] Capturing traffic on interface eth0...")
            out("10.10.10.5.80 > 10.10.10.1.54321: HTTP POST /comment")
            out("Header: X-D: c2VyZS1wbGFpbi1leHRyYWN0ZWQtZnJvbS10cmFmZmlj...")
            out("[*] Suspicious header detected. Investigate the target to recover the flag.")
          } else if (c === "impacket-getuserspns") {
            out("[*] Requesting TGS for service account 'svc_sql'")
            out("[*] Found SPN: HTTP/web-svc.corp.local")
            out("$krb5tgs$23$*svc_sql$CORP.LOCAL$HTTP/web-svc.corp.local*$...")
            out("[+] TGS ticket extracted. Crack with: hashcat -m 13100 ticket.hash")
          } else if (c === "msf-pattern_create") {
            out("Aa0Aa1Aa2Aa3Aa4Aa5Aa6Aa7Aa8Aa9Ab0Ab1Ab2Ab3Ab4Ab5Ab")
          } else {
            out(`[${c}] executed. (simulated environment)`)
            out("Try: help, ls, target, or 'submit FLAG{...}' when you find the flag.")
          }
        } else {
          err(`command not found: ${c}. Type 'help' for available commands.`)
        }
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      exec(input)
      if (input.trim()) setCmdHistory((h) => [...h, input])
      setInput("")
      setHistIdx(-1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (cmdHistory.length) {
        const ni = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1)
        setHistIdx(ni)
        setInput(cmdHistory[ni])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (histIdx !== -1) {
        const ni = histIdx + 1
        if (ni >= cmdHistory.length) { setHistIdx(-1); setInput("") }
        else { setHistIdx(ni); setInput(cmdHistory[ni]) }
      }
    }
  }

  if (!started) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-violet-500/30 bg-card/20 p-10 text-center">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/10 blur-[80px] rounded-full" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-5">
            <Terminal className="h-8 w-8 text-violet-300" />
          </div>
          <h3 className="text-xl font-bold mb-2 tracking-tight">Ready to start the mission?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Launch the interactive terminal and begin your offensive security engagement.
          </p>
          <Button onClick={onStart} className="bg-violet-600 hover:bg-violet-500 btn-premium">
            <PlayCircle className="h-4 w-4 mr-1.5" /> Deploy Environment
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-[oklch(0.06_0.01_280)]">
      {/* Terminal header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-950/30 border-b border-violet-500/20">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground ml-2 truncate">
          guardian@guardianx-lab: ~/labs/{labSlug}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {started && !done && (
            <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1 tabular-nums" title="Session time">
              <Clock className="h-3 w-3" /> {formatDuration(elapsedMs)}
            </span>
          )}
          <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> CONNECTED
          </span>
        </div>
      </div>

      {/* Terminal body */}
      <div
        className="p-4 font-mono text-xs h-80 overflow-y-auto bg-[oklch(0.04_0.01_280)] cursor-text scanlines relative"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words",
              line.type === "in" && "text-emerald-300",
              line.type === "out" && "text-muted-foreground",
              line.type === "err" && "text-rose-400",
              line.type === "ok" && "text-emerald-400 font-bold",
            )}
          >
            {line.type === "in" && <span className="text-violet-400">$ </span>}{line.text}
          </div>
        ))}
        <div className="flex items-center">
          <span className="text-violet-400">$ </span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            className="flex-1 bg-transparent outline-none text-emerald-300 font-mono text-xs ml-1"
            placeholder="type a command..."
          />
        </div>
        <div ref={endRef} />
      </div>

      {/* Flag submission bar */}
      <div className="flex items-center gap-2 p-3 border-t border-violet-500/20 bg-violet-950/20">
        <Flag className="h-4 w-4 text-violet-300 shrink-0" />
        <input
          value={flagInput}
          onChange={(e) => setFlagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && flagInput.trim()) {
              submitMutation.mutate(flagInput)
              setFlagInput("")
            }
          }}
          placeholder="Paste flag here (FLAG{...}) and press Enter"
          className="flex-1 bg-transparent outline-none text-xs font-mono text-emerald-200 placeholder:text-muted-foreground/60"
        />
        <Button
          size="sm"
          disabled={!flagInput.trim() || submitMutation.isPending}
          onClick={() => { submitMutation.mutate(flagInput); setFlagInput("") }}
          className="bg-violet-600 hover:bg-violet-500 btn-premium"
        >
          <Zap className="h-3.5 w-3.5 mr-1" /> Submit
        </Button>
      </div>
    </div>
  )
}
