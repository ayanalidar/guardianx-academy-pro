"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Activity,
  Clock,
  Award,
  FlaskConical,
  BookOpen,
  TrendingUp,
  Target,
  Flame,
  Crown,
  Gauge,
} from "lucide-react"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   LearningAnalyticsView
   Skill radar, time spent, weekly activity bar chart,
   peer comparison, course completion rates
   ============================================================ */

interface SkillRadar {
  web: number
  network: number
  crypto: number
  forensics: number
  reverse: number
  governance: number
}

interface WeeklyActivity {
  date: string
  minutes: number
}

interface PeerComparison {
  xpPercentile: number
  streakPercentile: number
  levelPercentile: number
  cohortSize: number
  myXp: number
  myLevel: number
  myStreak: number
}

interface CourseBreakdown {
  id: string
  title: string
  shortName: string
  category: string
  progress: number
  completed: boolean
  lastAccessed: string | null
}

interface Analytics {
  id: string
  totalTimeSpent: number
  coursesStarted: number
  coursesCompleted: number
  labsAttempted: number
  labsSolved: number
  avgQuizScore: number
  currentStreak: number
  longestStreak: number
  completionRate: number
  skillRadar: SkillRadar
  weeklyActivity: WeeklyActivity[]
  peerComparison: PeerComparison
  courseBreakdown: CourseBreakdown[]
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function LearningAnalyticsView() {
  const { data, isLoading } = useQuery<{ analytics: Analytics }>({
    queryKey: ["learning-analytics"],
    queryFn: () => api("/api/analytics"),
  })

  const a = data?.analytics

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">
              LEARNING ANALYTICS · YOUR PROGRESS, MEASURED
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Your <span className="text-gradient-premium">Progress</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-12">
            Auto-computed from your enrollments, lab progress, and quiz attempts - visualized for insight.
          </p>
        </ScrollReveal>

        {isLoading || !a ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Time Spent", value: formatHours(a.totalTimeSpent), icon: Clock, color: "text-violet-300" },
                { label: "Courses", value: `${a.coursesStarted}`, sub: `${a.coursesCompleted} completed`, icon: BookOpen, color: "text-cyan-300" },
                { label: "Labs Solved", value: `${a.labsSolved}`, sub: `of ${a.labsAttempted} attempted`, icon: FlaskConical, color: "text-emerald-300" },
                { label: "Avg Quiz", value: `${a.avgQuizScore}%`, icon: Award, color: "text-amber-300" },
              ].map((s, i) => (
                <ScrollReveal key={s.label} delay={0.1 + i * 0.06}>
                  <div className="card-premium rounded-2xl p-5 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <s.icon className={cn("h-4 w-4", s.color)} />
                    </div>
                    <div className="text-3xl font-bold mb-1 font-mono">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    {s.sub && <div className="text-[10px] text-muted-foreground/70 mt-1">{s.sub}</div>}
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Skill Radar */}
              <ScrollReveal className="lg:col-span-2">
                <div className="rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-lg h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">SKILL MATRIX</p>
                      <h3 className="text-xl font-bold tracking-tight">Skill Radar</h3>
                    </div>
                    <Gauge className="h-5 w-5 text-violet-300" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                    <SkillRadarSVG radar={a.skillRadar} />
                    <div className="space-y-2">
                      {Object.entries(a.skillRadar).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-3">
                          <div className="text-xs font-mono w-20 capitalize text-muted-foreground">{k}</div>
                          <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                              style={{ width: `${v}%` }}
                            />
                          </div>
                          <div className="text-xs font-mono w-8 text-right text-violet-300">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Peer Comparison */}
              <ScrollReveal delay={0.1}>
                <div className="rounded-2xl border border-border/60 bg-card p-6 h-full shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-1">PEER COMPARISON</p>
                      <h3 className="text-xl font-bold tracking-tight">vs Cohort</h3>
                    </div>
                    <TrendingUp className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div className="space-y-4">
                    <PercentileBar
                      label="XP"
                      percentile={a.peerComparison.xpPercentile}
                      value={`${a.peerComparison.myXp} XP`}
                      color="from-violet-500 to-violet-300"
                    />
                    <PercentileBar
                      label="Streak"
                      percentile={a.peerComparison.streakPercentile}
                      value={`${a.peerComparison.myStreak} days`}
                      color="from-amber-500 to-amber-300"
                    />
                    <PercentileBar
                      label="Level"
                      percentile={a.peerComparison.levelPercentile}
                      value={`Level ${a.peerComparison.myLevel}`}
                      color="from-cyan-500 to-cyan-300"
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
                    Compared to {a.peerComparison.cohortSize} learners
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Weekly Activity Bar Chart */}
            <ScrollReveal>
              <div className="rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-mono text-emerald-400 tracking-[0.3em] mb-1">LAST 7 DAYS</p>
                    <h3 className="text-xl font-bold tracking-tight">Weekly Activity</h3>
                  </div>
                  <Activity className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex items-end justify-between gap-3 h-40">
                  {a.weeklyActivity.map((d) => {
                    const maxMins = Math.max(60, ...a.weeklyActivity.map((x) => x.minutes))
                    const heightPct = maxMins > 0 ? (d.minutes / maxMins) * 100 : 0
                    const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-[10px] font-mono text-violet-300">{d.minutes}m</div>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-400 transition-all hover:opacity-80"
                            style={{ height: `${Math.max(2, heightPct)}%`, minHeight: "4px" }}
                          />
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{dayLabel}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollReveal>

            {/* Streak + Course completion */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ScrollReveal>
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 h-full shadow-lg">
                  <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-1">STREAK</p>
                        <h3 className="text-xl font-bold tracking-tight">Day Streak</h3>
                      </div>
                      <Flame className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-bold text-gradient-premium">{a.currentStreak}</span>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Longest</span>
                      <span className="font-mono text-amber-300">{a.longestStreak} days</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.1} className="lg:col-span-2">
                <div className="rounded-2xl border border-border/60 bg-card p-6 h-full shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">COMPLETION</p>
                      <h3 className="text-xl font-bold tracking-tight">Course Progress</h3>
                    </div>
                    <Target className="h-5 w-5 text-violet-300" />
                  </div>
                  {a.courseBreakdown.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No enrolled courses yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                      {a.courseBreakdown.map((c) => (
                        <div key={c.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-violet-300">{c.shortName}</span>
                              <span className="text-xs font-medium truncate">{c.title}</span>
                            </div>
                            {c.completed ? (
                              <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 text-[10px]">
                                <Crown className="h-2.5 w-2.5 mr-1" /> DONE
                              </Badge>
                            ) : (
                              <span className="text-xs font-mono text-violet-300">{c.progress}%</span>
                            )}
                          </div>
                          <Progress value={c.progress} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- SkillRadarSVG - pure SVG radar chart ---- */
function SkillRadarSVG({ radar }: { radar: SkillRadar }) {
  const entries = Object.entries(radar) as [keyof SkillRadar, number][]
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const maxR = 80
  const angleStep = (Math.PI * 2) / entries.length

  const pointFor = (idx: number, value: number) => {
    const angle = -Math.PI / 2 + idx * angleStep
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const labelFor = (idx: number) => {
    const angle = -Math.PI / 2 + idx * angleStep
    const r = maxR + 18
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const dataPoints = entries.map(([k, v], i) => pointFor(i, v))
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ")

  // Concentric rings
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="flex items-center justify-center">
      <svg width={size + 60} height={size + 60} viewBox={`0 0 ${size + 60} ${size + 60}`} className="overflow-visible">
        <g transform={`translate(30, 30)`}>
          {/* Rings */}
          {rings.map((r, i) => {
            const pts = entries
              .map((_, idx) => {
                const angle = -Math.PI / 2 + idx * angleStep
                const rad = maxR * r
                return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`
              })
              .join(" ")
            return (
              <polygon
                key={i}
                points={pts}
                fill="none"
                stroke="oklch(1 0 0 / 0.06)"
                strokeWidth={1}
              />
            )
          })}
          {/* Axis lines */}
          {entries.map((_, idx) => {
            const angle = -Math.PI / 2 + idx * angleStep
            return (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={cx + maxR * Math.cos(angle)}
                y2={cy + maxR * Math.sin(angle)}
                stroke="oklch(1 0 0 / 0.05)"
                strokeWidth={1}
              />
            )
          })}
          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="oklch(0.6 0.2 295 / 0.25)"
            stroke="oklch(0.6 0.2 295)"
            strokeWidth={2}
          />
          {/* Data points */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="oklch(0.6 0.2 295)" />
          ))}
          {/* Labels */}
          {entries.map(([k], idx) => {
            const p = labelFor(idx)
            return (
              <text
                key={k}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              >
                {k}
              </text>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function PercentileBar({ label, percentile, value, color }: { label: string; percentile: number; value: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
          style={{ width: `${percentile}%` }}
        />
      </div>
      <div className="text-[10px] font-mono text-violet-300 mt-1">
        Top {100 - percentile}% of cohort
      </div>
    </div>
  )
}
