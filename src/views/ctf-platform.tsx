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
  Trophy,
  Flag,
  Users,
  Plus,
  ArrowLeft,
  Crown,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Gamepad2,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   CTFPlatformView - Competition list, jeopardy grid,
   team creation, flag submission, live leaderboard
   ============================================================ */

interface CompetitionListItem {
  id: string
  title: string
  description: string
  format: string
  startAt: string
  endAt: string
  maxTeams: number
  teamSize: number
  status: string
  prizes: string
  challengeCount: number
  teamCount: number
  myTeam: { id: string; name: string } | null
}

interface ChallengeItem {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  points: number
  hint: string | null
  solveCount: number
  order: number
  solvedByMe: boolean
}

interface LeaderboardEntry {
  id?: string
  rank: number
  name: string
  score: number
  memberCount?: number
  captainName?: string
  isMine?: boolean
}

interface CompetitionDetail {
  competition: {
    id: string
    title: string
    description: string
    format: string
    startAt: string
    endAt: string
    maxTeams: number
    teamSize: number
    status: string
    prizes: string
  }
  challenges: ChallengeItem[]
  myTeam: {
    id: string
    name: string
    score: number
    members: { userId: string; name: string; avatar: string | null; role: string }[]
  } | null
  leaderboard: LeaderboardEntry[]
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  web: { color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  crypto: { color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  forensics: { color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  reverse: { color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  pwn: { color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/30" },
  misc: { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
  insane: "text-red-300",
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  upcoming: { color: "text-cyan-300", bg: "bg-cyan-500/15", label: "Upcoming" },
  live: { color: "text-rose-300", bg: "bg-rose-500/15", label: "Live" },
  ended: { color: "text-muted-foreground", bg: "bg-muted", label: "Ended" },
}

export function CTFPlatformView() {
  const [activeCompId, setActiveCompId] = React.useState<string | null>(null)
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false)
  const [teamName, setTeamName] = React.useState("")

  const qc = useQueryClient()

  const { data: listData, isLoading: listLoading } = useQuery<{ competitions: CompetitionListItem[] }>({
    queryKey: ["ctf", "competitions"],
    queryFn: () => api("/api/ctf/competitions"),
  })

  const { data: detail, isLoading: detailLoading } = useQuery<CompetitionDetail>({
    queryKey: ["ctf", "competition", activeCompId],
    queryFn: () => api(`/api/ctf/competitions/${activeCompId}`),
    enabled: !!activeCompId,
    refetchInterval: 15000,
  })

  const createTeam = useMutation({
    mutationFn: (vars: { competitionId: string; name: string }) =>
      api("/api/ctf/teams", { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: () => {
      toast.success("Team created! You are the captain.")
      setCreateTeamOpen(false)
      setTeamName("")
      qc.invalidateQueries({ queryKey: ["ctf", "competition", activeCompId] })
      qc.invalidateQueries({ queryKey: ["ctf", "competitions"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const competitions = listData?.competitions ?? []

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
              CAPTURE THE FLAG · LIVE COMPETITIONS
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            CTF <span className="text-gradient-premium">Arena</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-12">
            Form teams, solve jeopardy-style challenges across web, crypto, forensics, reverse engineering, and pwn - then climb the leaderboard.
          </p>
        </ScrollReveal>

        {!activeCompId ? (
          /* ---- Competition List ---- */
          listLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitions.map((c, i) => {
                const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.upcoming
                return (
                  <ScrollReveal key={c.id} delay={0.1 + i * 0.08}>
                    <div
                      onClick={() => setActiveCompId(c.id)}
                      className="card-premium group cursor-pointer rounded-2xl p-6 h-full flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono", st.bg, st.color)}>
                          {c.status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 pulse-dot" />}
                          {st.label.toUpperCase()}
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.format}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-violet-300 transition-colors">{c.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">{c.description}</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Target className="h-3.5 w-3.5" /> {c.challengeCount} challenges
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> {c.teamCount}/{c.maxTeams} teams
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(c.startAt).toLocaleDateString()} → {new Date(c.endAt).toLocaleDateString()}
                        </div>
                      </div>
                      {c.prizes && (
                        <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-300" />
                          <span className="text-xs font-mono text-amber-200/90">{c.prizes}</span>
                        </div>
                      )}
                      {c.myTeam && (
                        <div className="mt-2 text-[10px] font-mono text-violet-300">
                          Your team: {c.myTeam.name}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          )
        ) : (
          /* ---- Competition Detail ---- */
          detailLoading || !detail ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Top bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveCompId(null)} className="text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" /> All competitions
                </Button>
                {detail.competition.status !== "ended" && !detail.myTeam && (
                  <Button onClick={() => setCreateTeamOpen(true)} className="bg-violet-600 hover:bg-violet-500 btn-premium">
                    <Plus className="h-4 w-4 mr-2" /> Create Team
                  </Button>
                )}
              </div>

              {/* Header card */}
              <ScrollReveal>
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-lg">
                  <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />
                  <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {detail.competition.status === "live" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono bg-rose-500/15 text-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 pulse-dot" /> LIVE NOW
                          </span>
                        )}
                        <Badge variant="outline" className="capitalize">{detail.competition.format}</Badge>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">{detail.competition.title}</h2>
                      <p className="text-sm text-muted-foreground max-w-2xl">{detail.competition.description}</p>
                    </div>
                    {detail.myTeam && (
                      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="h-4 w-4 text-violet-300" />
                          <span className="text-[10px] font-mono text-violet-300 tracking-[0.2em]">YOUR TEAM</span>
                        </div>
                        <div className="font-semibold mb-1">{detail.myTeam.name}</div>
                        <div className="text-2xl font-bold text-gradient-premium">{detail.myTeam.score} pts</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {detail.myTeam.members.length}/{detail.competition.teamSize} members
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Challenges - jeopardy style */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-2">CHALLENGES</p>
                    <h3 className="text-xl font-bold tracking-tight">Jeopardy Board</h3>
                  </div>
                  {/* Group challenges by category */}
                  {Object.entries(
                    detail.challenges.reduce<Record<string, ChallengeItem[]>>((acc, c) => {
                      ;(acc[c.category] ??= []).push(c)
                      return acc
                    }, {})
                  ).map(([cat, challenges]) => {
                    const col = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.misc
                    return (
                      <div key={cat}>
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono mb-3", col.bg, col.color)}>
                          {cat.toUpperCase()}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {challenges
                            .sort((a, b) => a.points - b.points)
                            .map((ch) => {
                              const diff = DIFFICULTY_COLORS[ch.difficulty] ?? "text-muted-foreground"
                              return (
                                <ChallengeCard
                                  key={ch.id}
                                  challenge={ch}
                                  canSubmit={!!detail.myTeam}
                                  categoryColor={col}
                                  difficultyColor={diff}
                                />
                              )
                            })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Leaderboard */}
                <div>
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-2">LEADERBOARD</p>
                    <h3 className="text-xl font-bold tracking-tight">Top Teams</h3>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-4 max-h-[640px] overflow-y-auto">
                    {detail.leaderboard.length === 0 ? (
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No teams yet - be the first!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.leaderboard.map((entry) => (
                          <div
                            key={entry.id ?? entry.rank}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors",
                              entry.isMine ? "bg-violet-500/15 border border-violet-500/40" : "bg-muted/30 hover:bg-muted/60"
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
                                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                  {entry.rank === 1 && <Crown className="h-3 w-3 text-amber-300" />}
                                  {entry.name}
                                </div>
                                {entry.captainName && (
                                  <div className="text-[10px] text-muted-foreground truncate">Cap: {entry.captainName}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-mono font-semibold text-violet-300">{entry.score}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a team</DialogTitle>
            <DialogDescription>
              Pick a memorable team name. You will be the captain and can invite others (up to {detail?.competition.teamSize ?? 4} members).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. 0xPHOENIX"
              onKeyDown={(e) => {
                if (e.key === "Enter" && teamName.trim() && activeCompId) {
                  createTeam.mutate({ competitionId: activeCompId, name: teamName.trim() })
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => activeCompId && createTeam.mutate({ competitionId: activeCompId, name: teamName.trim() })}
              disabled={!teamName.trim() || createTeam.isPending}
              className="bg-violet-600 hover:bg-violet-500 btn-premium"
            >
              {createTeam.isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============================================================
   ChallengeCard - opens flag-submission dialog
   ============================================================ */
function ChallengeCard({
  challenge,
  canSubmit,
  categoryColor,
  difficultyColor,
}: {
  challenge: ChallengeItem
  canSubmit: boolean
  categoryColor: { color: string; bg: string; border: string }
  difficultyColor: string
}) {
  const [open, setOpen] = React.useState(false)
  const [flag, setFlag] = React.useState("")
  const [result, setResult] = React.useState<{ correct: boolean; message: string; score: number } | null>(null)
  const qc = useQueryClient()

  const submit = useMutation({
    mutationFn: () =>
      api<{ correct: boolean; message: string; score: number }>("/api/ctf/submit", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.id, flag }),
      }),
    onSuccess: (res) => {
      setResult(res)
      if (res.correct) {
        toast.success(res.message)
        qc.invalidateQueries({ queryKey: ["ctf", "competition"] })
      } else {
        toast.error(res.message)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!canSubmit) {
            toast.error("Join or create a team first to submit flags.")
            return
          }
          setOpen(true)
          setResult(null)
          setFlag("")
        }}
        className={cn(
          "relative text-left rounded-xl border p-4 transition-all hover:-translate-y-0.5",
          challenge.solvedByMe
            ? "border-emerald-500/40 bg-emerald-500/10"
            : cn(categoryColor.bg, categoryColor.border, "hover:border-violet-500/50")
        )}
      >
        {challenge.solvedByMe && (
          <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-400" />
        )}
        <div className="text-xs text-muted-foreground mb-1 line-clamp-1">{challenge.title}</div>
        <div className={cn("text-2xl font-bold font-mono", challenge.solvedByMe ? "text-emerald-300" : "text-foreground")}>
          {challenge.points}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className={difficultyColor}>{challenge.difficulty}</span>
          <span className="text-muted-foreground">{challenge.solveCount} solved</span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono", categoryColor.bg, categoryColor.color)}>
                {challenge.category.toUpperCase()}
              </span>
              {challenge.title}
            </DialogTitle>
            <DialogDescription className="pt-2">{challenge.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-muted-foreground">Points</div>
                <div className="font-mono font-semibold">{challenge.points}</div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-muted-foreground">Difficulty</div>
                <div className={cn("font-mono font-semibold", difficultyColor)}>{challenge.difficulty}</div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-muted-foreground">Solved</div>
                <div className="font-mono font-semibold">{challenge.solveCount}</div>
              </div>
            </div>
            {challenge.hint && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                <span className="font-mono text-[10px] text-amber-300">HINT: </span>{challenge.hint}
              </div>
            )}
            {result ? (
              <div className={cn(
                "rounded-lg border p-4 text-center",
                result.correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"
              )}>
                {result.correct ? (
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                ) : (
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-rose-400" />
                )}
                <div className={cn("font-semibold", result.correct ? "text-emerald-300" : "text-rose-300")}>
                  {result.message}
                </div>
                {result.correct && (
                  <div className="text-xs text-muted-foreground mt-1">Team score: {result.score}</div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="flag-input" className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 text-violet-300" /> Submit flag
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
                </div>
                {!canSubmit && (
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <Lock className="h-3.5 w-3.5" /> Join or create a team first.
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {result?.correct ? (
              <DialogClose asChild>
                <Button className="bg-violet-600 hover:bg-violet-500 btn-premium">Continue</Button>
              </DialogClose>
            ) : (
              <>
                <DialogClose asChild>
                  <Button variant="ghost">Close</Button>
                </DialogClose>
                <Button
                  onClick={() => submit.mutate()}
                  disabled={!flag.trim() || submit.isPending}
                  className="bg-violet-600 hover:bg-violet-500 btn-premium"
                >
                  {submit.isPending ? "Submitting..." : "Submit Flag"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
