"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ScrollReveal } from "@/components/platform/motion-system"
import {
  Code2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Play,
  Loader2,
  History,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   CodeReviewView - AI-powered code security review
   ============================================================ */

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "bash", label: "Bash / Shell" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
  { value: "ruby", label: "Ruby" },
]

interface ReviewIssue {
  severity: string
  category: string
  title: string
  description: string
  location: string
  remediation: string
}

interface ReviewResult {
  reviewId: string
  score: number
  summary: string
  issues: ReviewIssue[]
  goodPractices: string[]
  language: string
}

interface HistoryItem {
  id: string
  language: string
  score: number
  codePreview: string
  issues: ReviewIssue[]
  createdAt: string
}

const SAMPLE_CODE = `import os
import sqlite3

def login(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"
    cursor.execute(query)
    return cursor.fetchone()

def read_file(path):
    return open(path).read()

def exec_cmd(user_input):
    os.system("ping -c 1 " + user_input)
`

const SEVERITY_STYLE: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  critical: { color: "text-rose-300", bg: "bg-rose-500/15", border: "border-rose-500/40", icon: ShieldX },
  high: { color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/40", icon: ShieldAlert },
  medium: { color: "text-yellow-300", bg: "bg-yellow-500/15", border: "border-yellow-500/40", icon: AlertTriangle },
  low: { color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/40", icon: Info },
  info: { color: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/40", icon: Info },
}

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-300", ring: "stroke-emerald-400", bg: "bg-emerald-500/15", label: "Good" }
  if (score >= 60) return { text: "text-yellow-300", ring: "stroke-yellow-400", bg: "bg-yellow-500/15", label: "Fair" }
  if (score >= 40) return { text: "text-amber-300", ring: "stroke-amber-400", bg: "bg-amber-500/15", label: "Risky" }
  return { text: "text-rose-300", ring: "stroke-rose-400", bg: "bg-rose-500/15", label: "Critical" }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function CodeReviewView() {
  const qc = useQueryClient()
  const [code, setCode] = React.useState(SAMPLE_CODE)
  const [language, setLanguage] = React.useState("python")
  const [result, setResult] = React.useState<ReviewResult | null>(null)

  const { data: historyData, isLoading: historyLoading } = useQuery<{ reviews: HistoryItem[] }>({
    queryKey: ["code-reviews"],
    queryFn: () => api("/api/code-review/history"),
  })

  const reviewMutation = useMutation({
    mutationFn: (vars: { code: string; language: string }) =>
      api<ReviewResult>("/api/code-review", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ["code-reviews"] })
      toast.success(`Code review complete - score: ${data.score}/100`)
    },
    onError: (err: any) => {
      toast.error(err?.message || "Code review failed")
    },
  })

  const handleSubmit = () => {
    if (!code.trim()) {
      toast.error("Please paste some code to review")
      return
    }
    if (code.length > 20000) {
      toast.error("Code exceeds 20,000 character limit")
      return
    }
    reviewMutation.mutate({ code, language })
  }

  const score = result?.score ?? 0
  const sc = scoreColor(score)

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
              AI CODE SECURITY REVIEW
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            AI <span className="text-gradient-premium">Code Review</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-10">
            Paste your code below and let our AI scan for vulnerabilities, anti-patterns, and
            security best practices - with a clear score and actionable fixes.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Editor - left */}
          <ScrollReveal className="lg:col-span-7" delay={0.25}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center gap-3">
                <Code2 className="h-4 w-4 text-violet-300" />
                <span className="text-sm font-semibold">Source code</span>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-8 w-[140px] text-xs ml-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="font-mono text-xs bg-background/40 border-0 rounded-none min-h-[420px] resize-none focus-visible:ring-0"
                placeholder="// Paste your code here..."
              />
              <div className="p-4 border-t border-border/60 flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {code.length.toLocaleString()} chars · {language}
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={reviewMutation.isPending || !code.trim()}
                  className="ml-auto bg-violet-600 hover:bg-violet-500 btn-premium"
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Security Review
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {/* Results - right */}
          <ScrollReveal className="lg:col-span-5" delay={0.3}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <span className="text-sm font-semibold">Security Report</span>
              </div>

              {!result && !reviewMutation.isPending ? (
                <div className="p-10 text-center">
                  <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-4">
                    <ShieldCheck className="h-8 w-8 text-violet-300" />
                  </div>
                  <h3 className="font-semibold mb-1">Awaiting analysis</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Run a security review on your code to see issues, score, and recommendations
                    appear here.
                  </p>
                </div>
              ) : reviewMutation.isPending ? (
                <div className="p-10 text-center">
                  <Loader2 className="h-8 w-8 text-violet-300 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Analyzing code...</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[520px]">
                  <div className="p-4 space-y-4">
                    {/* Score gauge */}
                    <div className="flex items-center gap-4">
                      <div className={cn("relative h-20 w-20 rounded-full flex items-center justify-center", sc.bg)}>
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border/60" />
                          <circle
                            cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeLinecap="round"
                            className={sc.ring}
                            strokeDasharray={`${(score / 100) * 97.4} 97.4`}
                          />
                        </svg>
                        <span className={cn("text-xl font-bold relative", sc.text)}>{score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                          Security Score
                        </p>
                        <p className={cn("text-lg font-semibold", sc.text)}>{sc.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{result?.summary}</p>
                      </div>
                    </div>

                    {/* Issues */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                          Issues Found
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {result?.issues.length ?? 0}
                        </Badge>
                      </div>
                      {(result?.issues ?? []).length === 0 ? (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                          <CheckCircle2 className="h-4 w-4 inline mr-1" />
                          No security issues detected.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(result?.issues ?? []).map((iss, i) => {
                            const style = SEVERITY_STYLE[iss.severity] || SEVERITY_STYLE.info
                            const Icon = style.icon
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "rounded-lg border p-3 animate-scale-in",
                                  style.border,
                                  style.bg
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className={cn("h-3.5 w-3.5", style.color)} />
                                  <span className={cn("text-[10px] font-mono uppercase tracking-wider", style.color)}>
                                    {iss.severity}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {iss.category}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold mb-1">{iss.title}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                                  {iss.description}
                                </p>
                                {iss.location && (
                                  <p className="text-[10px] font-mono text-violet-300/80 mb-1">
                                    📍 {iss.location}
                                  </p>
                                )}
                                <div className="mt-2 rounded-md bg-background/40 border border-border/40 p-2">
                                  <p className="text-[10px] text-emerald-300/90 font-mono mb-1">
                                    FIX:
                                  </p>
                                  <p className="text-xs text-foreground/80">{iss.remediation}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Good practices */}
                    {(result?.goodPractices ?? []).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-3.5 w-3.5 text-emerald-300" />
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                            Good Practices
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {(result?.goodPractices ?? []).map((g, i) => (
                            <li key={i} className="text-xs text-foreground/80 flex gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0 mt-0.5" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </ScrollReveal>
        </div>

        {/* History */}
        <ScrollReveal delay={0.35}>
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-violet-300" />
              <h2 className="text-lg font-semibold">Review History</h2>
            </div>
            {historyLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (historyData?.reviews ?? []).length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
                No previous reviews yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(historyData?.reviews ?? []).map((r) => {
                  const sc = scoreColor(r.score)
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-border/60 bg-card/30 p-4 hover:border-violet-500/30 transition-colors cursor-pointer group"
                      onClick={() => {
                        // Reload review detail
                        setResult({
                          reviewId: r.id,
                          score: r.score,
                          summary: "Past review - see issues below.",
                          issues: r.issues,
                          goodPractices: [],
                          language: r.language,
                        })
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {r.language}
                        </Badge>
                        <span className={cn("text-xl font-bold", sc.text)}>{r.score}</span>
                      </div>
                      <pre className="text-[10px] font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {r.codePreview}
                      </pre>
                      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                        <span>{r.issues.length} issue{r.issues.length !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1">
                          {timeAgo(r.createdAt)} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
