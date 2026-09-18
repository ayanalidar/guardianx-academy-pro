"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Trophy, Search, Loader2, CheckCircle2, XCircle, Clock, Brain, Award,
} from "lucide-react"

interface Attempt {
  id: string
  guestName: string | null
  guestEmail: string | null
  difficulty: string
  score: number
  totalQuestions: number
  percentage: number
  passed: boolean
  certificateId: string | null
  createdAt: string
  completedAt: string | null
}

export function AdminCyberQuizAttemptsView() {
  const [passedFilter, setPassedFilter] = React.useState("ALL")
  const [difficultyFilter, setDifficultyFilter] = React.useState("ALL")
  const [search, setSearch] = React.useState("")

  const { data, isLoading } = useQuery<{
    attempts: Attempt[]
    count: number
    stats?: { total: number; passed: number; withCert: number; passRate: number }
  }>({
    queryKey: ["admin-cyber-quiz-attempts", { passedFilter, difficultyFilter, search }],
    queryFn: () => {
      const params = new URLSearchParams()
      if (passedFilter === "passed") params.set("passed", "true")
      if (passedFilter === "failed") params.set("passed", "false")
      if (difficultyFilter !== "ALL") params.set("difficulty", difficultyFilter)
      if (search.trim()) params.set("q", search.trim())
      return api(`/api/admin/cyber-quiz/attempts?${params.toString()}`)
    },
  })

  const attempts = data?.attempts ?? []
  // Server-computed stats cover ALL matching rows (view previously derived
  // them from the capped 200-row page). Falls back to local derivation.
  const stats = data?.stats
  const passed = stats?.passed ?? attempts.filter((a) => a.passed).length
  const withCert = stats?.withCert ?? attempts.filter((a) => a.certificateId).length
  const totalCount = stats?.total ?? attempts.length
  const passRate = stats?.passRate ?? (attempts.length ? Math.round((passed / attempts.length) * 100) : 0)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold tracking-tight">Quiz Attempts</h1>
        </div>
        <p className="text-sm text-muted-foreground">All cyber security foundation quiz attempts.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total attempts" value={totalCount} />
        <StatCard label="Passed" value={passed} color="text-emerald-300" />
        <StatCard label="With certificate" value={withCert} color="text-violet-300" />
        <StatCard label="Pass rate" value={totalCount ? passRate + "%" : "—"} color="text-cyan-300" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={passedFilter} onValueChange={setPassedFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Result" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All results</SelectItem>
            <SelectItem value="passed">Passed only</SelectItem>
            <SelectItem value="failed">Failed only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All levels</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No attempts found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[700px] overflow-y-auto custom-scrollbar">
            {attempts.map((a) => (
              <div key={a.id} className="p-4 hover:bg-violet-500/[0.03] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                      a.passed ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                    )}>
                      {a.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm truncate">{a.guestName || "Anonymous"}</span>
                        <Badge variant="outline" className="text-[9px]">{a.difficulty}</Badge>
                        <Badge variant="outline" className={cn("text-[9px]", a.passed ? "text-emerald-300 border-emerald-500/30" : "text-rose-300 border-rose-500/30")}>
                          {a.passed ? "Passed" : "Failed"}
                        </Badge>
                        {a.certificateId && (
                          <Badge variant="outline" className="text-[9px] text-violet-300 border-violet-500/30">
                            <Award className="h-2.5 w-2.5 mr-1" /> {a.certificateId}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{a.guestEmail || "—"}</span>
                        <span className="tabular-nums">{a.score}/{a.totalQuestions} · {a.percentage}%</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(a.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = "text-foreground" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
