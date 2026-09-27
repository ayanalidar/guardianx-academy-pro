"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Radar,
  Sword,
  FileText,
  Users,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Crosshair,
  Terminal,
  ScrollText,
  Shield,
  Target,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   TeamMissionsView
   ============================================================ */

interface MissionItem {
  id: string
  title: string
  description: string
  scenario: string
  maxTeamSize: number
  duration: number
  difficulty: string
  objectives: string[]
  activeSessions: { id: string; status: string; memberCount: number; isMember: boolean }[]
}

interface MissionSession {
  id: string
  status: string
  score: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  mission: MissionItem
  members: { userId: string; name: string; avatar: string | null; title: string | null; role: string; isMe: boolean }[]
  isMember: boolean
  isLeader: boolean
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
  insane: "text-red-300",
}

const ROLES = [
  { id: "scanner", label: "Scanner", icon: Radar, color: "text-cyan-300", desc: "Reconnaissance & enumeration" },
  { id: "exploiter", label: "Exploiter", icon: Sword, color: "text-rose-300", desc: "Vulnerability exploitation" },
  { id: "reporter", label: "Reporter", icon: ScrollText, color: "text-amber-300", desc: "Documentation & write-up" },
] as const

const ROLE_LABEL: Record<string, { label: string; icon: typeof Radar; color: string }> = {
  leader: { label: "Leader", icon: Shield, color: "text-violet-300" },
  scanner: { label: "Scanner", icon: Radar, color: "text-cyan-300" },
  exploiter: { label: "Exploiter", icon: Sword, color: "text-rose-300" },
  reporter: { label: "Reporter", icon: ScrollText, color: "text-amber-300" },
  member: { label: "Member", icon: Users, color: "text-muted-foreground" },
}

export function TeamMissionsView() {
  const qc = useQueryClient()
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [joinRole, setJoinRole] = React.useState<string>("scanner")

  const { data: listData, isLoading: listLoading } = useQuery<{ missions: MissionItem[] }>({
    queryKey: ["team-missions"],
    queryFn: () => api("/api/team-missions"),
  })

  const { data: detail, isLoading: detailLoading } = useQuery<{ session: MissionSession }>({
    queryKey: ["team-mission", activeSessionId],
    queryFn: () => api(`/api/team-missions/${activeSessionId}`),
    enabled: !!activeSessionId,
    refetchInterval: 10000,
  })

  const createSession = useMutation({
    mutationFn: (missionId: string) =>
      api("/api/team-missions", { method: "POST", body: JSON.stringify({ missionId }) }),
    onSuccess: (data: { session: MissionSession }) => {
      toast.success("Session created! Share to invite teammates.")
      setActiveSessionId(data.session.id)
      qc.invalidateQueries({ queryKey: ["team-missions"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const joinSession = useMutation({
    mutationFn: () =>
      api(`/api/team-missions/${activeSessionId}`, { method: "POST", body: JSON.stringify({ role: joinRole }) }),
    onSuccess: () => {
      toast.success("Joined the session!")
      qc.invalidateQueries({ queryKey: ["team-mission", activeSessionId] })
      qc.invalidateQueries({ queryKey: ["team-missions"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const missions = listData?.missions ?? []

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
              TEAM-BASED LAB MISSIONS · RED TEAM OPERATIONS
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Team <span className="text-gradient-premium">Missions</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-12">
            Tackle multi-stage scenarios as a coordinated unit. Pick a role - scanner, exploiter, reporter - and execute the playbook together.
          </p>
        </ScrollReveal>

        {!activeSessionId ? (
          listLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missions.map((m, i) => (
                <ScrollReveal key={m.id} delay={0.05 + i * 0.08}>
                  <div className="card-premium rounded-2xl p-6 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <Badge variant="outline" className={cn("capitalize", DIFFICULTY_COLORS[m.difficulty])}>
                        {m.difficulty}
                      </Badge>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{m.maxTeamSize} max</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.duration}m</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{m.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{m.description}</p>

                    {/* Objectives */}
                    <div className="mb-4">
                      <div className="text-[10px] font-mono text-violet-300 tracking-[0.2em] mb-2">OBJECTIVES</div>
                      <ul className="space-y-1.5">
                        {m.objectives.slice(0, 4).map((o, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Crosshair className="h-3 w-3 mt-0.5 text-violet-400 flex-shrink-0" />
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between">
                      {m.activeSessions.length > 0 ? (
                        <span className="text-[10px] font-mono text-emerald-300">
                          {m.activeSessions.length} active session{m.activeSessions.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground">No active sessions</span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => createSession.mutate(m.id)}
                        disabled={createSession.isPending}
                        className="bg-violet-600 hover:bg-violet-500 btn-premium"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Session
                      </Button>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )
        ) : (
          /* ---- Session Detail / Team Lobby ---- */
          detailLoading || !detail ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-6">
              <Button variant="ghost" size="sm" onClick={() => setActiveSessionId(null)} className="text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" /> All missions
              </Button>

              <ScrollReveal>
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-lg">
                  <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="outline" className={cn("capitalize", DIFFICULTY_COLORS[detail.session.mission.difficulty])}>
                        {detail.session.mission.difficulty}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {detail.session.status}
                      </Badge>
                      <Badge variant="outline" className="text-cyan-300 border-cyan-500/30">
                        <Clock className="h-3 w-3 mr-1" /> {detail.session.mission.duration} min
                      </Badge>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">{detail.session.mission.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{detail.session.mission.description}</p>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mb-4">
                      <div className="text-[10px] font-mono text-violet-300 tracking-[0.2em] mb-2">SCENARIO BRIEF</div>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{detail.session.mission.scenario}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-violet-300 tracking-[0.2em] mb-2">OBJECTIVES</div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detail.session.mission.objectives.map((o, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs">
                            <Target className="h-3.5 w-3.5 mt-0.5 text-violet-400 flex-shrink-0" />
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Team Lobby */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-2">TEAM LOBBY</p>
                    <h3 className="text-xl font-bold tracking-tight">
                      {detail.session.members.length} / {detail.session.mission.maxTeamSize} Members
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detail.session.members.map((m) => {
                      const role = ROLE_LABEL[m.role] ?? ROLE_LABEL.member
                      return (
                        <div
                          key={m.userId}
                          className={cn(
                            "rounded-xl border p-4",
                            m.isMe ? "border-violet-500/40 bg-violet-500/10" : "border-border/60 bg-card"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-mono font-semibold text-violet-200">
                                {m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{m.name}{m.isMe && " (You)"}</div>
                                {m.title && <div className="text-[10px] text-muted-foreground">{m.title}</div>}
                              </div>
                            </div>
                          </div>
                          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono", "bg-muted/50", role.color)}>
                            <role.icon className="h-3 w-3" /> {role.label}
                          </div>
                        </div>
                      )
                    })}

                    {/* Empty slots */}
                    {Array.from({ length: Math.max(0, detail.session.mission.maxTeamSize - detail.session.members.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="rounded-xl border border-dashed border-border/60 p-4 flex items-center justify-center text-xs text-muted-foreground">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Empty slot
                      </div>
                    ))}
                  </div>
                </div>

                {/* Join panel */}
                <div>
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-2">ROLES</p>
                    <h3 className="text-xl font-bold tracking-tight">Pick a Role</h3>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-4 space-y-3">
                    {detail.session.isMember ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> You&apos;re in this team.
                      </div>
                    ) : (
                      <>
                        {ROLES.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setJoinRole(r.id)}
                            className={cn(
                              "w-full text-left rounded-lg border p-3 transition-all",
                              joinRole === r.id
                                ? "border-violet-500/50 bg-violet-500/10"
                                : "border-border/60 bg-muted/30 hover:border-violet-500/30"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <r.icon className={cn("h-4 w-4", r.color)} />
                              <span className="text-sm font-medium">{r.label}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                          </button>
                        ))}
                        <Button
                          onClick={() => joinSession.mutate()}
                          disabled={joinSession.isPending}
                          className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                        >
                          {joinSession.isPending ? "Joining..." : "Join as " + (ROLES.find((r) => r.id === joinRole)?.label ?? "Member")}
                        </Button>
                      </>
                    )}

                    {detail.session.isLeader && detail.session.status === "waiting" && (
                      <div className="pt-3 border-t border-border/60">
                        <div className="text-[10px] font-mono text-amber-300 mb-2">LEADER ACTIONS</div>
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          <Terminal className="h-3.5 w-3.5 mr-1.5" /> Start Mission (demo)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
