"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Award,
  Target,
  ListChecks,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   SkillAssessmentsView
   Assessment list → test interface (Q-by-Q) → results
   ============================================================ */

interface AssessmentListItem {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  duration: number
  questionCount: number
  bestScore: number | null
  passed: boolean
  lastTaken: string | null
}

interface Question {
  id: string
  question: string
  options: string[]
  skillTag: string
  points: number
}

interface AssessmentDetail {
  assessment: {
    id: string
    title: string
    description: string
    category: string
    difficulty: string
    duration: number
    questions: Question[]
  }
}

interface AssessmentResult {
  id: string
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  earnedPoints: number
  totalPoints: number
  skillScores: { skill: string; correct: number; total: number; percentage: number }[]
  explanations: {
    questionId: string
    question: string
    correctAnswer: number
    explanation: string
    options: string[]
    selected: number | null
  }[]
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  web: { color: "text-violet-300", bg: "bg-violet-500/10" },
  network: { color: "text-cyan-300", bg: "bg-cyan-500/10" },
  crypto: { color: "text-amber-300", bg: "bg-amber-500/10" },
  forensics: { color: "text-emerald-300", bg: "bg-emerald-500/10" },
  reverse: { color: "text-rose-300", bg: "bg-rose-500/10" },
  governance: { color: "text-purple-300", bg: "bg-purple-500/10" },
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-300",
  intermediate: "text-amber-300",
  advanced: "text-rose-300",
}

type Phase = "list" | "test" | "results"

export function SkillAssessmentsView() {
  const qc = useQueryClient()
  const [phase, setPhase] = React.useState<Phase>("list")
  const [activeAssessmentId, setActiveAssessmentId] = React.useState<string | null>(null)
  const [answers, setAnswers] = React.useState<Record<string, number>>({})
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [result, setResult] = React.useState<AssessmentResult | null>(null)

  const { data: listData, isLoading: listLoading } = useQuery<{ assessments: AssessmentListItem[] }>({
    queryKey: ["skill-assessments"],
    queryFn: () => api("/api/skill-assessments"),
  })

  const { data: detailData, isLoading: detailLoading } = useQuery<AssessmentDetail>({
    queryKey: ["skill-assessment", activeAssessmentId],
    queryFn: () => api(`/api/skill-assessments/${activeAssessmentId}`),
    enabled: !!activeAssessmentId && phase === "test",
  })

  const submit = useMutation({
    mutationFn: (payload: { answers: { questionId: string; selected: number }[] }) =>
      api<{ result: AssessmentResult }>(`/api/skill-assessments/${activeAssessmentId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setResult(data.result)
      setPhase("results")
      toast.success(`Assessment complete - scored ${data.result.score}%`)
      qc.invalidateQueries({ queryKey: ["skill-assessments"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const assessments = listData?.assessments ?? []
  const questions = detailData?.assessment.questions ?? []

  const startAssessment = (id: string) => {
    setActiveAssessmentId(id)
    setAnswers({})
    setCurrentIdx(0)
    setResult(null)
    setPhase("test")
  }

  const handleSubmit = () => {
    const payload = {
      answers: questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id] ?? -1,
      })),
    }
    submit.mutate(payload)
  }

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
              SKILL ASSESSMENTS · VALIDATE YOUR EXPERTISE
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Skill <span className="text-gradient-premium">Assessments</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-12">
            Domain-spanning tests with per-skill breakdowns. Score 70% or higher to pass.
          </p>
        </ScrollReveal>

        {phase === "list" && (
          listLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((a, i) => {
                const cat = CATEGORY_COLORS[a.category] ?? CATEGORY_COLORS.web
                return (
                  <ScrollReveal key={a.id} delay={0.05 + i * 0.06}>
                    <div className="card-premium rounded-2xl p-6 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono", cat.bg, cat.color)}>
                          {a.category.toUpperCase()}
                        </span>
                        <Badge variant="outline" className={cn("capitalize", DIFFICULTY_COLORS[a.difficulty])}>
                          {a.difficulty}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{a.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">{a.description}</p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{a.questionCount} Qs</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration}m</span>
                      </div>
                      {a.bestScore !== null && (
                        <div className="mb-4 pt-4 border-t border-border/60">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Best score</span>
                            <span className={cn("font-mono font-semibold", a.passed ? "text-emerald-300" : "text-amber-300")}>{a.bestScore}%</span>
                          </div>
                          <Progress value={a.bestScore} className="h-1.5" />
                          {a.passed && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300">
                              <Award className="h-2.5 w-2.5" /> PASSED
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        onClick={() => startAssessment(a.id)}
                        className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                      >
                        <Brain className="h-4 w-4 mr-2" /> {a.bestScore !== null ? "Retake Test" : "Start Test"}
                      </Button>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          )
        )}

        {phase === "test" && (
          detailLoading || !detailData ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No questions in this assessment.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Question area */}
              <div className="lg:col-span-2">
                <Button variant="ghost" size="sm" onClick={() => setPhase("list")} className="text-muted-foreground mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Exit assessment
                </Button>
                <div className="rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">
                        QUESTION {currentIdx + 1} / {questions.length}
                      </p>
                      <h3 className="text-xl font-bold tracking-tight">{detailData.assessment.title}</h3>
                    </div>
                    <Badge variant="outline" className="text-cyan-300 border-cyan-500/30">
                      <Clock className="h-3 w-3 mr-1" /> {detailData.assessment.duration}m
                    </Badge>
                  </div>

                  <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1 mb-6" />

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-violet-300">
                        <Target className="h-2.5 w-2.5" /> {questions[currentIdx].skillTag || "general"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{questions[currentIdx].points} pts</span>
                    </div>
                    <p className="text-lg font-medium leading-relaxed mb-6">{questions[currentIdx].question}</p>
                    <div className="space-y-2">
                      {questions[currentIdx].options.map((opt, idx) => {
                        const isSelected = answers[questions[currentIdx].id] === idx
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({ ...prev, [questions[currentIdx].id]: idx }))
                            }
                            className={cn(
                              "w-full text-left rounded-lg border p-4 transition-all",
                              isSelected
                                ? "border-violet-500/50 bg-violet-500/10"
                                : "border-border/60 bg-muted/20 hover:border-violet-500/30 hover:bg-muted/40"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-6 w-6 rounded-full border flex items-center justify-center text-xs font-mono",
                                isSelected ? "border-violet-400 bg-violet-500/30 text-violet-200" : "border-border text-muted-foreground"
                              )}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span className="text-sm">{opt}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                      disabled={currentIdx === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    {currentIdx < questions.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={() => setCurrentIdx((i) => i + 1)}
                        className="bg-violet-600 hover:bg-violet-500 btn-premium"
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={submit.isPending}
                        className="bg-emerald-600 hover:bg-emerald-500 btn-premium"
                      >
                        {submit.isPending ? "Submitting..." : "Submit Test"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Question navigator */}
              <div>
                <div className="mb-4">
                  <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-2">NAVIGATOR</p>
                  <h3 className="text-xl font-bold tracking-tight">Questions</h3>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-4">
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {questions.map((q, idx) => {
                      const answered = answers[q.id] !== undefined
                      const isCurrent = idx === currentIdx
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentIdx(idx)}
                          className={cn(
                            "h-9 rounded-md border text-xs font-mono transition-all",
                            isCurrent
                              ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
                              : answered
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                : "border-border/60 bg-muted/30 text-muted-foreground hover:border-violet-500/30"
                          )}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/40" /> Answered
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/20 border border-violet-500/50" /> Current
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-muted/30 border border-border/60" /> Unanswered
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                    Answered: {Object.keys(answers).length} / {questions.length}
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {phase === "results" && result && (
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => setPhase("list")} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to assessments
            </Button>

            {/* Score banner */}
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 lg:p-12 shadow-lg text-center">
                <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-72 bg-violet-600/15 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  {result.passed ? (
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-amber-300" />
                  ) : (
                    <Brain className="h-12 w-12 mx-auto mb-4 text-violet-300" />
                  )}
                  <div className="text-[10px] font-mono text-violet-300 tracking-[0.3em] mb-2">
                    ASSESSMENT COMPLETE
                  </div>
                  <div className={cn(
                    "text-6xl lg:text-7xl font-bold mb-2",
                    result.passed ? "text-gradient-premium" : "text-amber-300"
                  )}>
                    {result.score}%
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    {result.correctCount} of {result.totalQuestions} correct · {result.earnedPoints} of {result.totalPoints} points
                  </p>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                    result.passed ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                  )}>
                    {result.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {result.passed ? "Passed!" : "Did not pass - retake to improve"}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Skill breakdown */}
            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
                <div className="mb-4">
                  <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">SKILL BREAKDOWN</p>
                  <h3 className="text-xl font-bold tracking-tight">Per-Skill Performance</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.skillScores.map((s) => (
                    <div key={s.skill} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-violet-300">{s.skill}</span>
                        <span className="text-xs font-mono font-semibold">{s.percentage}%</span>
                      </div>
                      <Progress value={s.percentage} className="h-1.5 mb-1" />
                      <div className="text-[10px] text-muted-foreground">{s.correct}/{s.total} correct</div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Question review */}
            <ScrollReveal delay={0.15}>
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
                <div className="mb-4">
                  <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-1">QUESTION REVIEW</p>
                  <h3 className="text-xl font-bold tracking-tight">Detailed Explanations</h3>
                </div>
                <div className="space-y-4 max-h-[640px] overflow-y-auto pr-2">
                  {result.explanations.map((q, idx) => {
                    const isCorrect = q.selected === q.correctAnswer
                    return (
                      <div key={q.questionId} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                        <div className="flex items-start gap-2 mb-3">
                          {isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-[10px] font-mono text-muted-foreground mb-1">Q{idx + 1}</div>
                            <p className="text-sm font-medium">{q.question}</p>
                          </div>
                        </div>
                        <div className="space-y-1 mb-3 ml-6">
                          {q.options.map((opt, i) => {
                            const isCorrectOpt = i === q.correctAnswer
                            const isSelOpt = i === q.selected
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  isCorrectOpt ? "bg-emerald-500/15 text-emerald-300" : isSelOpt ? "bg-rose-500/15 text-rose-300" : "text-muted-foreground"
                                )}
                              >
                                {String.fromCharCode(65 + i)}. {opt}
                                {isCorrectOpt && " ✓"}
                                {isSelOpt && !isCorrectOpt && " (your choice)"}
                              </div>
                            )
                          })}
                        </div>
                        <div className="ml-6 text-xs text-muted-foreground italic">
                          <span className="font-mono text-amber-300">Explanation: </span>{q.explanation}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}
      </div>
    </div>
  )
}
