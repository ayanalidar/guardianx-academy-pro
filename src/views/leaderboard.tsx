"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { useAppStore } from "@/store/app-store"
import { colorFor, LEVEL_COLORS, DIFFICULTY_COLORS } from "@/lib/colors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Crown, Trophy, Medal, Flame, Zap, Clock, Target, Users, TrendingUp,
  BookOpen, Terminal, Award, Star, ChevronRight, Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, Counter, CursorGlow,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

export function LeaderboardView() {
  const { user } = useUser()

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-amber-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-violet-600/6 blur-[120px] rounded-full pointer-events-none" />

      {/* Network viz subtle accent in header */}
      <div className="absolute top-0 inset-x-0 h-[400px] opacity-20 pointer-events-none overflow-hidden">
        <NetworkVisualization variant="section" className="w-full h-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized headline + status
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-dot" />
            <span className="text-[10px] font-mono text-amber-300/80 tracking-[0.3em]">
              GLOBAL RANKINGS · LIVE
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-4 text-balance">
            <TextReveal text="Leaderboard." />
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p className="text-muted-foreground max-w-xl mb-12 text-base lg:text-lg leading-relaxed">
            Compete with defenders worldwide. Climb the ranks by solving labs, completing courses, and earning certifications.
          </p>
        </ScrollReveal>

        <Tabs defaultValue="labs">
          <ScrollReveal delay={0.4}>
            <TabsList className="bg-card/30 border border-border/60">
              <TabsTrigger value="labs">
                <Terminal className="h-3.5 w-3.5 mr-1.5" /> Lab Champions
              </TabsTrigger>
              <TabsTrigger value="courses">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Course Leaders
              </TabsTrigger>
            </TabsList>
          </ScrollReveal>

          <TabsContent value="labs" className="mt-8">
            <LabLeaderboards currentUserId={user?.id} />
          </TabsContent>

          <TabsContent value="courses" className="mt-8">
            <CourseLeaderboards currentUserId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ============================================================
   Lab Leaderboards - Top 3 podium + editorial list + lab records
   ============================================================ */
function LabLeaderboards({ currentUserId }: { currentUserId?: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["lab-leaderboard"],
    queryFn: () => api("/api/labs/leaderboard"),
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (!data) return null

  const podium = data.topSolvers.slice(0, 3)
  const rest = data.topSolvers.slice(3)

  return (
    <div className="space-y-16">
      {/* Stats - border-left editorial */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Total Solves", value: data.totalSolves, accent: "border-emerald-500/50", color: "text-emerald-300", icon: Trophy },
          { label: "Active Solvers", value: data.activeSolvers, accent: "border-cyan-500/50", color: "text-cyan-300", icon: Users },
          { label: "Top XP", value: data.topSolvers[0]?.user?.xp ?? 0, accent: "border-violet-500/50", color: "text-violet-300", icon: Zap },
          { label: "Fastest Solve", value: data.fastestSolvers[0] ? formatDuration(data.fastestSolvers[0].fastestMs) : "-", custom: data.fastestSolvers[0] ? formatDuration(data.fastestSolvers[0].fastestMs) : "-", accent: "border-amber-500/50", color: "text-amber-300", icon: Clock },
        ].map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 0.08}>
            <div className={cn("border-l pl-5", s.accent)}>
              <s.icon className={cn("h-4 w-4 mb-3", s.color)} />
              <div className="text-4xl lg:text-5xl font-bold tracking-[-0.03em] mb-1">
                {s.custom ? s.custom : <Counter value={s.value} />}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Top 3 podium - premium composition */}
      {podium.length > 0 && (
        <Podium entries={podium.map((s: any) => ({
          rank: s.rank,
          user: s.user,
          isMe: s.user.id === currentUserId,
          primary: `${s.labsSolved} labs`,
          secondary: `${s.totalPoints.toLocaleString()} pts`,
          tertiary: s.fastestMs ? `⚡ ${formatDuration(s.fastestMs)}` : null,
        }))} />
      )}

      {/* Rest of leaderboard - editorial list */}
      {rest.length > 0 && (
        <section>
          <ScrollReveal>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-1">02 - RANKS {rest[0].rank}-{rest[rest.length - 1].rank}</p>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">The field</h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{rest.length} DEFENDERS</span>
            </div>
          </ScrollReveal>
          <Stagger className="space-y-1" staggerChildren={0.05}>
            {rest.map((s: any) => (
              <StaggerItem key={s.user.id}>
                <LeaderboardRow
                  rank={s.rank}
                  user={s.user}
                  isMe={s.user.id === currentUserId}
                  primary={`${s.labsSolved} labs`}
                  secondary={`${s.totalPoints.toLocaleString()} pts`}
                  tertiary={s.fastestMs ? `⚡ ${formatDuration(s.fastestMs)}` : null}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Fastest Solves section */}
      {data.fastestSolvers.length > 0 && (
        <section>
          <ScrollReveal>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
              <div>
                <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-1">03 - FASTEST SOLVES</p>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Speed runners</h2>
              </div>
            </div>
          </ScrollReveal>
          <Stagger className="space-y-1" staggerChildren={0.05}>
            {data.fastestSolvers.map((s: any) => (
              <StaggerItem key={s.user.id}>
                <LeaderboardRow
                  rank={s.rank}
                  user={s.user}
                  isMe={s.user.id === currentUserId}
                  primary={formatDuration(s.fastestMs)}
                  secondary={`${s.labsSolved} labs`}
                  tertiary={s.fastestLab ? `📍 ${s.fastestLab.slice(0, 28)}${s.fastestLab.length > 28 ? "…" : ""}` : null}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Lab Records */}
      {data.labLeaderboards.length > 0 && (
        <section>
          <ScrollReveal>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
              <div>
                <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">04 - LAB RECORDS</p>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Per-lab champions</h2>
              </div>
            </div>
          </ScrollReveal>
          <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border/40">
                {data.labLeaderboards.map((lb: any) => (
                  <div key={lb.lab.id} className="p-5 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{lb.lab.title}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={cn("text-[9px]", DIFFICULTY_COLORS[lb.lab.difficulty])}>{lb.lab.difficulty}</Badge>
                          <span className="text-[10px] text-muted-foreground">{lb.lab.category}</span>
                          <span className="text-[10px] text-violet-300 font-mono">{lb.lab.points}pts</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-emerald-300 tabular-nums">{lb.totalSolves}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">solves</div>
                      </div>
                    </div>
                    {lb.fastest.length > 0 && (
                      <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                        <Clock className="h-3 w-3 text-cyan-300 shrink-0" />
                        {lb.fastest.map((f: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px]">
                            {i > 0 && <span className="text-muted-foreground/40">·</span>}
                            <span className="text-muted-foreground">{f.user.name.split(" ")[0]}</span>
                            <span className="font-mono text-cyan-300">{formatDuration(f.timeSpentMs)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </section>
      )}
    </div>
  )
}

/* ============================================================
   Course Leaderboards - podium + editorial + popular courses
   ============================================================ */
function CourseLeaderboards({ currentUserId }: { currentUserId?: string }) {
  const { navigate } = useAppStore()
  const { data, isLoading } = useQuery<any>({
    queryKey: ["course-leaderboard"],
    queryFn: () => api("/api/courses/leaderboard"),
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (!data) return null

  const podium = data.topLearners.slice(0, 3)
  const rest = data.topLearners.slice(3)

  return (
    <div className="space-y-16">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Completions", value: data.totalCompletions, accent: "border-emerald-500/50", color: "text-emerald-300", icon: Award },
          { label: "Active Learners", value: data.activeLearners, accent: "border-cyan-500/50", color: "text-cyan-300", icon: Users },
          { label: "Top Learner", value: data.topLearners[0]?.coursesCompleted ?? 0, suffix: " courses", accent: "border-amber-500/50", color: "text-amber-300", icon: Trophy },
          { label: "Top Course", value: data.popularCourses[0]?.studentsCount ?? 0, suffix: " students", accent: "border-violet-500/50", color: "text-violet-300", icon: Star },
        ].map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 0.08}>
            <div className={cn("border-l pl-5", s.accent)}>
              <s.icon className={cn("h-4 w-4 mb-3", s.color)} />
              <div className="text-4xl lg:text-5xl font-bold tracking-[-0.03em] mb-1">
                <Counter value={s.value} suffix={s.suffix ?? ""} />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <Podium entries={podium.map((l: any) => ({
          rank: l.rank,
          user: l.user,
          isMe: l.user.id === currentUserId,
          primary: `${l.coursesCompleted} courses`,
          secondary: `${l.certificates} certs`,
          tertiary: `${l.categoriesCovered} categories`,
        }))} />
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <section>
          <ScrollReveal>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-1">02 - RANKS {rest[0].rank}-{rest[rest.length - 1].rank}</p>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">The field</h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{rest.length} LEARNERS</span>
            </div>
          </ScrollReveal>
          <Stagger className="space-y-1" staggerChildren={0.05}>
            {rest.map((l: any) => (
              <StaggerItem key={l.user.id}>
                <LeaderboardRow
                  rank={l.rank}
                  user={l.user}
                  isMe={l.user.id === currentUserId}
                  primary={`${l.coursesCompleted} courses`}
                  secondary={`${l.certificates} certs`}
                  tertiary={`${l.categoriesCovered} categories`}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Popular Courses */}
      <section>
        <ScrollReveal>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
            <div>
              <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">03 - MOST ENROLLED</p>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Popular courses</h2>
            </div>
          </div>
        </ScrollReveal>
        <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-border/40">
              {data.popularCourses.map((c: any) => {
                const col = colorFor(c.color)
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate({ name: "course", courseId: c.id })}
                    className="w-full flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors text-left group"
                  >
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold border", col.bg, col.border, col.text)}>
                      {c.shortName.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate group-hover:text-violet-300 transition-colors">{c.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-[9px]", LEVEL_COLORS[c.level])}>{c.level}</Badge>
                        <span className="text-[10px] text-muted-foreground">{c.enrollments} enrolled</span>
                        <span className="text-[10px] text-emerald-300">{c.completionRate}% done</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-0.5 text-amber-300 text-sm font-medium justify-end">
                        <Star className="h-3 w-3 fill-amber-300" /> {c.rating}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{c.completions} finished</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-300 shrink-0 transition-colors" />
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </section>
    </div>
  )
}

/* ============================================================
   Podium - premium top-3 composition
   ============================================================ */
function Podium({ entries }: { entries: any[] }) {
  if (entries.length === 0) return null

  // Order: #2 left, #1 center, #3 right
  const first = entries.find((e) => e.rank === 1) ?? entries[0]
  const second = entries.find((e) => e.rank === 2) ?? entries[1]
  const third = entries.find((e) => e.rank === 3) ?? entries[2]

  return (
    <section>
      <ScrollReveal>
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
          <div>
            <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-1">01 - TOP DEFENDERS</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">The podium</h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">SEASON LIVE</span>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 lg:items-end">
        {/* #2 left */}
        {second && (
          <ScrollReveal delay={0.1}>
            <PodiumColumn entry={second} height="h-72" />
          </ScrollReveal>
        )}

        {/* #1 center, elevated */}
        <ScrollReveal delay={0.2}>
          <PodiumColumn entry={first} height="h-96" isFirst />
        </ScrollReveal>

        {/* #3 right */}
        {third && (
          <ScrollReveal delay={0.3}>
            <PodiumColumn entry={third} height="h-64" />
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}

function PodiumColumn({ entry, height, isFirst = false }: { entry: any; height: string; isFirst?: boolean }) {
  const avatarInitials = entry.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  const rankColor =
    entry.rank === 1 ? "text-amber-300" :
    entry.rank === 2 ? "text-slate-300" :
    "text-orange-400"

  const rankBg =
    entry.rank === 1 ? "bg-amber-400/15 border-amber-400/40" :
    entry.rank === 2 ? "bg-slate-300/15 border-slate-300/40" :
    "bg-orange-500/15 border-orange-500/40"

  const RankIcon = entry.rank === 1 ? Crown : Medal

  return (
    <CursorGlow color="oklch(0.7 0.15 85 / 0.06)" className="group h-full">
      <div className={cn(
        "relative overflow-hidden rounded-3xl border bg-card/30 transition-all duration-500",
        isFirst ? "border-amber-500/40 shadow-[0_30px_80px_-30px] shadow-amber-500/20 lg:-translate-y-8" : "border-border/60 hover:border-violet-500/30",
        entry.isMe && "ring-2 ring-violet-500/50",
      )}>
        {isFirst && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 blur-[60px] rounded-full pointer-events-none" />
          </>
        )}
        <div className={cn("relative z-10 p-6 flex flex-col items-center justify-end", height)}>
          {/* Crown for #1 */}
          {isFirst && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <Crown className="h-7 w-7 text-amber-300 drop-shadow-[0_0_12px_oklch(0.82_0.15_85_/_0.5)]" />
            </div>
          )}

          {/* Rank ghost number */}
          <div className={cn(
            "absolute top-2 right-4 text-[clamp(4rem,8vw,7rem)] font-bold leading-none pointer-events-none select-none",
            rankColor,
            "opacity-15",
          )}>
            {entry.rank}
          </div>

          {/* Avatar */}
          <div className="relative mb-4 mt-8">
            <Avatar className={cn(
              "border-2",
              isFirst ? "h-20 w-20 border-amber-400/60" : "h-16 w-16 border-border",
            )}>
              <AvatarFallback className={cn("text-sm font-mono font-bold", rankBg)}>
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
            {/* Rank badge */}
            <div className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center h-7 w-7 rounded-full border-2 border-background",
              rankBg,
            )}>
              <RankIcon className={cn("h-3.5 w-3.5", rankColor)} />
            </div>
          </div>

          {/* Name */}
          <h3 className="text-lg font-bold tracking-tight mb-1 text-center">
            {entry.user.name}
            {entry.isMe && <span className="text-violet-300 ml-1.5 text-xs font-medium">(You)</span>}
          </h3>
          <p className="text-[10px] text-muted-foreground font-mono tracking-[0.2em] mb-4">
            {entry.user.title || "DEFENDER"} · LV {entry.user.level}
          </p>

          {/* Primary stat */}
          <div className={cn(
            "text-center mb-2",
            isFirst ? "text-3xl" : "text-2xl",
          )}>
            <span className={cn("font-bold tabular-nums", rankColor)}>
              {entry.primary}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] text-center">
            {entry.secondary}
          </div>
          {entry.tertiary && (
            <div className="text-[10px] text-cyan-300 font-mono mt-2 text-center">
              {entry.tertiary}
            </div>
          )}
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   LeaderboardRow - editorial list row with oversized ghost rank
   ============================================================ */
function LeaderboardRow({ rank, user, isMe, primary, secondary, tertiary }: {
  rank: number; user: any; isMe: boolean; primary: string; secondary: string; tertiary: string | null
}) {
  const avatarInitials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <CursorGlow color={isMe ? "oklch(0.6 0.2 295 / 0.08)" : "transparent"} className="group">
      <div className={cn(
        "relative flex items-center gap-5 p-4 rounded-xl border transition-all duration-300",
        isMe
          ? "bg-violet-500/10 border-violet-500/30"
          : "border-transparent hover:bg-muted/20 hover:border-border/60",
      )}>
        {/* Oversized ghost rank number */}
        <div className="relative w-14 shrink-0">
          <span className={cn(
            "absolute inset-0 flex items-center justify-center text-[clamp(2rem,5vw,3.5rem)] font-bold leading-none tabular-nums select-none",
            isMe ? "text-violet-400/30" : "text-muted-foreground/15",
          )}>
            {rank}
          </span>
        </div>

        {/* Avatar */}
        <Avatar className={cn(
          "h-10 w-10 shrink-0 border",
          isMe ? "border-violet-500/50" : "border-border",
        )}>
          <AvatarFallback className={cn(
            "text-[11px] font-mono font-bold",
            isMe ? "bg-violet-500/15 text-violet-300" : "bg-muted text-muted-foreground",
          )}>
            {avatarInitials}
          </AvatarFallback>
        </Avatar>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {user.name}
            {isMe && <span className="text-violet-300 ml-1.5 text-xs font-medium">(You)</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span className="text-cyan-300 font-mono">LV {user.level}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="truncate">{user.title || "Learner"}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-violet-300 tabular-nums">{primary}</div>
          <div className="text-[10px] text-muted-foreground">{secondary}</div>
          {tertiary && <div className="text-[9px] text-cyan-300 font-mono mt-0.5">{tertiary}</div>}
        </div>
      </div>
    </CursorGlow>
  )
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
