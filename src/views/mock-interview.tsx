"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Mic,
  Play,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Timer,
  Award,
  History,
  RotateCcw,
  Loader2,
  Sparkles,
  MessageSquare,
  Target,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   MockInterviewView - interactive interview practice
   ============================================================ */

interface InterviewQuestion {
  id: string
  role: string
  difficulty: string
  question: string
  expectedAnswer: string
  category: string
  tags: string
}

interface Answer {
  questionId: string
  answer: string
}

interface Interview {
  id: string
  role: string
  difficulty: string
  questions: Array<InterviewQuestion & { expectedAnswer?: string }>
  answers: Answer[]
  score: number
  feedback: string
  duration: number
  completedAt: string | null
  createdAt: string
}

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { value: "intermediate", label: "Intermediate", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  { value: "advanced", label: "Advanced", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
]

function diffColor(d: string) {
  return DIFFICULTIES.find((x) => x.value === d)?.color || DIFFICULTIES[1].color
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function MockInterviewView() {
  const qc = useQueryClient()

  // Phase: "setup" -> "active" -> "results"
  const [phase, setPhase] = React.useState<"setup" | "active" | "results">("setup")
  const [selectedRole, setSelectedRole] = React.useState("")
  const [difficulty, setDifficulty] = React.useState("all")
  const [activeInterview, setActiveInterview] = React.useState<Interview | null>(null)
  const [answers, setAnswers] = React.useState<Answer[]>([])
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)

  // Fetch questions
  const { data: qData, isLoading: qLoading } = useQuery<{
    questions: InterviewQuestion[]
    roles: string[]
  }>({
    queryKey: ["interview-questions", selectedRole, difficulty],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedRole) params.set("role", selectedRole)
      if (difficulty !== "all") params.set("difficulty", difficulty)
      return api(`/api/interviews/questions?${params.toString()}`)
    },
  })

  // Fetch past interviews
  const { data: historyData } = useQuery<{ interviews: Interview[] }>({
    queryKey: ["interviews"],
    queryFn: () => api("/api/interviews"),
  })

  // Timer
  React.useEffect(() => {
    if (phase !== "active") return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  const startMutation = useMutation({
    mutationFn: (vars: { role: string; difficulty: string; questionIds: string[] }) =>
      api<{ interview: Interview }>("/api/interviews", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => {
      setActiveInterview(data.interview)
      setAnswers([])
      setCurrentIdx(0)
      setElapsed(0)
      setPhase("active")
      toast.success(`Interview started: ${data.interview.role}`)
    },
    onError: (err: any) => toast.error(err?.message || "Failed to start interview"),
  })

  const completeMutation = useMutation({
    mutationFn: (vars: { id: string; answers: Answer[]; duration: number }) =>
      api<{ interview: Interview }>(`/api/interviews/${vars.id}`, {
        method: "POST",
        body: JSON.stringify({
          answers: vars.answers,
          duration: vars.duration,
          action: "complete",
        }),
      }),
    onSuccess: (data) => {
      setActiveInterview(data.interview)
      setPhase("results")
      qc.invalidateQueries({ queryKey: ["interviews"] })
      toast.success(`Interview graded - score: ${data.interview.score}/100`)
    },
    onError: (err: any) => toast.error(err?.message || "Failed to grade interview"),
  })

  const handleStart = () => {
    if (!selectedRole) {
      toast.error("Please pick a role")
      return
    }
    const qs = qData?.questions ?? []
    if (qs.length === 0) {
      toast.error("No questions available for this role/difficulty")
      return
    }
    // Pick 5 questions (or all if fewer)
    const subset = qs.slice(0, Math.min(5, qs.length))
    startMutation.mutate({
      role: selectedRole,
      difficulty: difficulty === "all" ? "intermediate" : difficulty,
      questionIds: subset.map((q) => q.id),
    })
  }

  const handleAnswerChange = (qid: string, val: string) => {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === qid)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { questionId: qid, answer: val }
        return copy
      }
      return [...prev, { questionId: qid, answer: val }]
    })
  }

  const handleComplete = () => {
    if (!activeInterview) return
    completeMutation.mutate({
      id: activeInterview.id,
      answers,
      duration: elapsed,
    })
  }

  const handleRestart = () => {
    setActiveInterview(null)
    setAnswers([])
    setCurrentIdx(0)
    setElapsed(0)
    setPhase("setup")
  }

  const questions = activeInterview?.questions ?? []
  const currentQ = questions[currentIdx]
  const currentAns = answers.find((a) => a.questionId === currentQ?.id)?.answer ?? ""
  const answeredCount = answers.filter((a) => a.answer.trim().length > 0).length
  const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

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
              MOCK INTERVIEW ENGINE
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Practice <span className="text-gradient-premium">mock interviews</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-10">
            Pick a role, get AI-curated questions, and answer at your own pace. Receive an
            instant score and feedback to sharpen your interview skills.
          </p>
        </ScrollReveal>

        {/* SETUP PHASE */}
        {phase === "setup" && (
          <ScrollReveal delay={0.25}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-4 w-4 text-violet-300" />
                <h2 className="font-semibold">Configure your interview</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">
                    Role
                  </label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="bg-card border-border/60">
                      <SelectValue placeholder="Pick a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(qData?.roles ?? []).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">
                    Difficulty
                  </label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="bg-card border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All difficulties</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {qLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : (qData?.questions ?? []).length > 0 ? (
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                    {(qData?.questions ?? []).length} question{((qData?.questions ?? []).length !== 1) ? "s" : ""} available - first 5 will be picked
                  </p>
                  <ScrollArea className="max-h-48 rounded-lg border border-border/40 bg-background/30">
                    <div className="p-3 space-y-1.5">
                      {(qData?.questions ?? []).slice(0, 8).map((q) => (
                        <div key={q.id} className="text-xs p-2 rounded border border-border/40">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-[9px] capitalize", diffColor(q.difficulty))}>
                              {q.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] capitalize">
                              {q.category}
                            </Badge>
                          </div>
                          <p className="text-foreground/80">{q.question}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No questions match these filters.</p>
              )}

              <Button
                onClick={handleStart}
                disabled={startMutation.isPending || !selectedRole || (qData?.questions ?? []).length === 0}
                className="mt-4 w-full bg-violet-600 hover:bg-violet-500 btn-premium"
              >
                {startMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Interview
              </Button>
            </div>
          </ScrollReveal>
        )}

        {/* ACTIVE PHASE */}
        {phase === "active" && currentQ && (
          <ScrollReveal>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 mb-6">
              {/* Top bar - progress + timer */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                    <span className="text-violet-300 font-mono">{answeredCount}/{questions.length} answered</span>
                  </div>
                  <Progress value={progressPct} className="h-1.5" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5">
                  <Timer className="h-4 w-4 text-violet-300" />
                  <span className="font-mono text-sm">{fmtTime(elapsed)}</span>
                </div>
              </div>

              {/* Question + answer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-[10px]">
                      {activeInterview?.role}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px] capitalize", diffColor(activeInterview?.difficulty || ""))}>
                      {activeInterview?.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {currentQ.category}
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/40 p-5 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-violet-300" />
                      </div>
                      <p className="text-base font-medium leading-relaxed pt-1">{currentQ.question}</p>
                    </div>
                  </div>

                  <Textarea
                    value={currentAns}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    placeholder="Type your answer here. Be specific and structured..."
                    className="bg-background/40 min-h-[200px] text-sm"
                  />

                  <div className="flex items-center justify-between mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentIdx === 0}
                      onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </Button>
                    <div className="flex gap-1.5">
                      {questions.map((q, i) => {
                        const isAnswered = answers.some((a) => a.questionId === q.id && a.answer.trim().length > 0)
                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentIdx(i)}
                            className={cn(
                              "h-2 w-2 rounded-full transition-colors",
                              i === currentIdx ? "bg-violet-400" : isAnswered ? "bg-emerald-400" : "bg-muted-foreground/40"
                            )}
                            aria-label={`Go to question ${i + 1}`}
                          />
                        )
                      })}
                    </div>
                    {currentIdx < questions.length - 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleComplete}
                        disabled={completeMutation.isPending}
                        className="bg-violet-600 hover:bg-violet-500 btn-premium"
                        size="sm"
                      >
                        {completeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Submit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Side panel - question nav */}
                <div className="lg:col-span-5">
                  <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
                      Question Navigator
                    </p>
                    <div className="space-y-1.5">
                      {questions.map((q, i) => {
                        const isAns = answers.some((a) => a.questionId === q.id && a.answer.trim().length > 0)
                        const isCur = i === currentIdx
                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentIdx(i)}
                            className={cn(
                              "w-full text-left rounded-lg p-2.5 border text-xs transition-colors",
                              isCur
                                ? "border-violet-500/50 bg-violet-500/10"
                                : isAns
                                ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                                : "border-border/40 bg-background/20 hover:border-border"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              {isAns ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Circle className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono">Q{i + 1}</span>
                              <span className="text-[10px] text-muted-foreground capitalize">· {q.category}</span>
                            </div>
                            <p className="line-clamp-2 text-foreground/80">{q.question}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* RESULTS PHASE */}
        {phase === "results" && activeInterview && (
          <ScrollReveal>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 mb-6">
              {/* Score */}
              <div className="text-center mb-8">
                <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-4">
                  <Award className="h-10 w-10 text-violet-300" />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-2">
                  Interview Score
                </p>
                <div className="text-6xl font-bold text-gradient-premium mb-2">
                  {activeInterview.score}
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  <Clock className="h-3 w-3 mr-1" />
                  {fmtTime(activeInterview.duration)}
                </Badge>
              </div>

              {/* Feedback */}
              {activeInterview.feedback && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-violet-300" />
                    <span className="text-sm font-semibold">AI Feedback</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {activeInterview.feedback}
                  </p>
                </div>
              )}

              {/* Per-question review */}
              <div className="space-y-3">
                {activeInterview.questions.map((q, i) => {
                  const ans = answers.find((a) => a.questionId === q.id)?.answer || "(no answer)"
                  return (
                    <div key={q.id} className="rounded-lg border border-border/60 bg-background/30 p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground">Q{i + 1}</span>
                        <p className="text-sm font-medium flex-1">{q.question}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {q.category}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
                          <p className="text-[10px] text-amber-300/80 font-mono uppercase mb-1">
                            Your Answer
                          </p>
                          <p className="text-xs text-foreground/80 whitespace-pre-wrap">{ans}</p>
                        </div>
                        {q.expectedAnswer && (
                          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                            <p className="text-[10px] text-emerald-300/80 font-mono uppercase mb-1">
                              Expected
                            </p>
                            <p className="text-xs text-foreground/80">{q.expectedAnswer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button onClick={handleRestart} className="w-full mt-6 bg-violet-600 hover:bg-violet-500 btn-premium">
                <RotateCcw className="h-4 w-4 mr-2" />
                Start a New Interview
              </Button>
            </div>
          </ScrollReveal>
        )}

        {/* History - always visible in setup */}
        {phase === "setup" && (
          <ScrollReveal delay={0.3}>
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-violet-300" />
                <h2 className="text-lg font-semibold">Past Interviews</h2>
              </div>
              {(historyData?.interviews ?? []).length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
                  No previous interviews yet. Start one above!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(historyData?.interviews ?? []).map((iv) => (
                    <div
                      key={iv.id}
                      className="rounded-xl border border-border/60 bg-card/30 p-4 hover:border-violet-500/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveInterview(iv)
                        setAnswers(iv.answers || [])
                        setPhase("results")
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px]">
                          {iv.role}
                        </Badge>
                        <span className="text-xl font-bold text-violet-300">{iv.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {iv.questions.length} question{iv.questions.length !== 1 ? "s" : ""} · {fmtTime(iv.duration)}
                      </p>
                      {iv.feedback && (
                        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                          {iv.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  )
}
