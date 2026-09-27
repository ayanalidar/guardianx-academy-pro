"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  Flag,
  Trophy,
  Zap,
  Lightbulb,
  CheckCircle2,
  XCircle,
  History,
  Users,
  Timer,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   WeeklyChallengesView
   ============================================================ */

interface ActiveChallenge {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  points: number
  hint: string | null
  startAt: string
  endAt: string
  participantsCount: number
  myResult: { correct: boolean; timeTaken: number; submittedAt: string } | null
}

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar: string | null
  timeTaken: number
  submittedAt: string
  isMe: boolean
}

interface PastChallenge {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  points: number
  flag: string
  hint: string | null
  startAt: string
  endAt: string
  participantsCount: number
  myResult: { correct: boolean; timeTaken: number; submittedAt: string } | null
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  web: { color: "text-violet-300", bg: "bg-violet-500/10" },
  crypto: { color: "text-cyan-300", bg: "bg-cyan-500/10" },
  forensics: { color: "text-amber-300", bg: "bg-amber-500/10" },
  network: { color: "text-emerald-300", bg: "bg-emerald-500/10" },
  misc: { color: "text-rose-300", bg: "bg-rose-500/10" },
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
  insane: "text-red-300",
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return `${h}h ${remM}m`
}

function timeLeft(target: Date): { h: number; m: number; s: number; expired: boolean } {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true }
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  return { h, m, s, expired: false }
}

export function WeeklyChallengesView() {
  const qc = useQueryClient()
  const [flag, setFlag] = React.useState("")
  const [showHint, setShowHint] = React.useState(false)
  const [result, setResult] = React.useState<{ correct: boolean; message: string; score: number } | null>(null)
  const [elapsed, setElapsed] = React.useState(0)

  const { data: activeData, isLoading: activeLoading } = useQuery<{ challenge: ActiveChallenge | null; leaderboard: LeaderboardEntry[] }>({
    queryKey: ["weekly", "active"],
    queryFn: () => api("/api/challenges"),
    refetchInterval: 30000,
  })

  const { data: pastData, isLoading: pastLoading } = useQuery<{ challenges: PastChallenge[] }>({
    queryKey: ["weekly", "history"],
    queryFn: () => api("/api/challenges?history=true"),
  })

  const submit = useMutation({
    mutationFn: () =>
      api<{ correct: boolean; message: string; score: number }>("/api/challenges", {
        method: "POST",
        body: JSON.stringify({
          challengeId: activeData?.challenge?.id,
          flag,
          timeTaken: elapsed,
        }),
      }),
    onSuccess: (res) => {
      setResult(res)
      if (res.correct) {
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
      qc.invalidateQueries({ queryKey: ["weekly", "active"] })
      qc.invalidateQueries({ queryKey: ["weekly", "history"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const challenge = activeData?.challenge ?? null
  const leaderboard = activeData?.leaderboard ?? []
  const pastChallenges = pastData?.challenges ?? []

  // Timer: live countdown + elapsed counter
  const [timeLeftState, setTimeLeftState] = React.useState<{ h: number; m: number; s: number; expired: boolean }>({ h: 0, m: 0, s: 0, expired: false })
  React.useEffect(() => {
    if (!challenge) return
    const tick = () => {
      setTimeLeftState(timeLeft(new Date(challenge.endAt)))
      setElapsed(Math.floor((Date.now() - new Date(challenge.startAt).getTime()) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [challenge])

  const cat = challenge ? (CATEGORY_COLORS[challenge.category] ?? CATEGORY_COLORS.misc) : null

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
              WEEKLY CAPTURE · NEW CHALLENGE EVERY MONDAY
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Weekly <span className="text-gradient-premium">Challenges</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-12">
            One challenge. One week. One flag. Be the fastest solver to claim the leaderboard crown.
          </p>
        </ScrollReveal>

        <Tabs defaultValue="active">
          <TabsList className="mb-8">
            <TabsTrigger value="active">This Week</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Past Challenges
            </TabsTrigger>
          </TabsList>

          {/* ---- ACTIVE ---- */}
          <TabsContent value="active">
            {activeLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            ) : !challenge ? (
              <div className="text-center py-20">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active challenge this week. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Challenge card */}
                <div className="lg:col-span-2 space-y-6">
                  <ScrollReveal>
                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-lg">
                      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
                      <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />
                      <div className="relative z-10">
                        {/* Tags row */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {cat && (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono", cat.bg, cat.color)}>
                              {challenge.category.toUpperCase()}
                            </span>
                          )}
                          <Badge variant="outline" className={cn("capitalize", DIFFICULTY_COLORS[challenge.difficulty])}>
                            {challenge.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-amber-300 border-amber-500/30">
                            <Trophy className="h-3 w-3 mr-1" /> {challenge.points} pts
                          </Badge>
                          <Badge variant="outline" className="text-cyan-300 border-cyan-500/30">
                            <Users className="h-3 w-3 mr-1" /> {challenge.participantsCount}
                          </Badge>
                        </div>

                        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">{challenge.title}</h2>
                        <p className="text-sm text-muted-foreground whitespace-pre-line mb-6">{challenge.description}</p>

                        {/* Countdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" /> TIME LEFT
                            </div>
                            <div className={cn("text-lg font-mono font-bold", timeLeftState.expired ? "text-rose-300" : "text-violet-300")}>
                              {timeLeftState.expired ? "ENDED" : `${String(timeLeftState.h).padStart(2, "0")}:${String(timeLeftState.m).padStart(2, "0")}:${String(timeLeftState.s).padStart(2, "0")}`}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mb-1">
                              <Timer className="h-3 w-3" /> YOUR TIMER
                            </div>
                            <div className="text-lg font-mono font-bold text-cyan-300">{formatDuration(elapsed)}</div>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" /> ENDS
                            </div>
                            <div className="text-sm font-mono font-semibold">
                              {new Date(challenge.endAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mb-1">
                              <Zap className="h-3 w-3" /> STATUS
                            </div>
                            <div className="text-sm font-mono font-semibold text-emerald-300">
                              {challenge.myResult ? (challenge.myResult.correct ? "SOLVED" : "ATTEMPTED") : "UNSOLVED"}
                            </div>
                          </div>
                        </div>

                        {/* Submission */}
                        {challenge.myResult ? (
                          <div className={cn(
                            "rounded-xl border p-5",
                            challenge.myResult.correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"
                          )}>
                            <div className="flex items-center gap-3">
                              {challenge.myResult.correct ? (
                                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                              ) : (
                                <XCircle className="h-6 w-6 text-rose-400" />
                              )}
                              <div>
                                <div className={cn("font-semibold", challenge.myResult.correct ? "text-emerald-300" : "text-rose-300")}>
                                  {challenge.myResult.correct ? "You solved it!" : "Your attempt was incorrect."}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Submitted {formatDuration(challenge.myResult.timeTaken)} after the challenge started.
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : result ? (
                          <div className={cn(
                            "rounded-xl border p-5",
                            result.correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"
                          )}>
                            <div className="flex items-center gap-3">
                              {result.correct ? (
                                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                              ) : (
                                <XCircle className="h-6 w-6 text-rose-400" />
                              )}
                              <div>
                                <div className={cn("font-semibold", result.correct ? "text-emerald-300" : "text-rose-300")}>
                                  {result.message}
                                </div>
                                {!result.correct && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Your single attempt has been used - better luck next week!
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="flag-input" className="flex items-center gap-2 text-sm">
                                <Flag className="h-3.5 w-3.5 text-violet-300" /> Submit your flag
                              </Label>
                              <Input
                                id="flag-input"
                                value={flag}
                                onChange={(e) => setFlag(e.target.value)}
                                placeholder="FLAG{...}"
                                className="font-mono"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && flag.trim()) submit.mutate()
                                }}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                ⚠ You only get ONE submission - make it count.
                              </p>
                            </div>
                            {challenge.hint && (
                              <div>
                                {showHint ? (
                                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                                    <span className="font-mono text-[10px] text-amber-300">HINT: </span>{challenge.hint}
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="text-amber-300">
                                    <Lightbulb className="h-3.5 w-3.5 mr-1.5" /> Reveal hint
                                  </Button>
                                )}
                              </div>
                            )}
                            <Button
                              onClick={() => submit.mutate()}
                              disabled={!flag.trim() || submit.isPending}
                              className="bg-violet-600 hover:bg-violet-500 btn-premium"
                            >
                              {submit.isPending ? "Submitting..." : "Submit Flag"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollReveal>
                </div>

                {/* Leaderboard */}
                <div>
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-2">FASTEST SOLVERS</p>
                    <h3 className="text-xl font-bold tracking-tight">Leaderboard</h3>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-4 max-h-[640px] overflow-y-auto">
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No solvers yet. Be the first!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leaderboard.map((entry) => (
                          <div
                            key={entry.userId}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-3 py-2.5",
                              entry.isMe ? "bg-violet-500/15 border border-violet-500/40" : "bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={cn(
                                "text-sm font-mono w-7 text-center",
                                entry.rank === 1 ? "text-amber-300" : entry.rank === 2 ? "text-zinc-300" : entry.rank === 3 ? "text-orange-300" : "text-muted-foreground"
                              )}>
                                #{entry.rank}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{entry.name}{entry.isMe && " (You)"}</div>
                                <div className="text-[10px] text-muted-foreground">{formatDuration(entry.timeTaken)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ---- HISTORY ---- */}
          <TabsContent value="history">
            {pastLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
              </div>
            ) : pastChallenges.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No past challenges yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastChallenges.map((c, i) => {
                  const col = CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.misc
                  return (
                    <ScrollReveal key={c.id} delay={0.05 + i * 0.05}>
                      <div className="card-premium rounded-2xl p-5 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono", col.bg, col.color)}>
                            {c.category.toUpperCase()}
                          </span>
                          <Badge variant="outline" className={cn("capitalize", DIFFICULTY_COLORS[c.difficulty])}>
                            {c.difficulty}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{c.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">{c.description}</p>
                        <div className="space-y-2 text-[10px] font-mono text-muted-foreground">
                          <div>ENDED: {new Date(c.endAt).toLocaleDateString()}</div>
                          <div>SOLVERS: {c.participantsCount}</div>
                          <div className="text-amber-200/80 break-all">FLAG: {c.flag}</div>
                          {c.myResult && (
                            <div className={cn("mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px]",
                              c.myResult.correct ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>
                              {c.myResult.correct ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {c.myResult.correct ? "Solved" : "Attempted"}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
