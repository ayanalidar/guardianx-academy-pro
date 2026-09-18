"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import {
  Clock, AlertCircle, Loader2, ChevronRight, ChevronLeft,
  CheckCircle2, ShieldCheck, Target, Brain, X,
} from "lucide-react"

interface QuizQuestion {
  id: string
  category: string
  difficulty: string
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
}

type Difficulty = "Easy" | "Hard" | "Advanced"

const DIFFICULTY_META: Record<Difficulty, { icon: any; color: string; bg: string; label: string }> = {
  Easy: { icon: ShieldCheck, color: "text-emerald-300", bg: "bg-emerald-500/10", label: "Foundational" },
  Hard: { icon: Target, color: "text-violet-300", bg: "bg-violet-500/10", label: "Intermediate" },
  Advanced: { icon: Brain, color: "text-amber-300", bg: "bg-amber-500/10", label: "Expert" },
}

const TIME_LIMIT_SEC = 30 * 60 // 30 minutes

export function CyberQuizRunnerView() {
  const { view, navigate } = useAppStore()
  const difficulty = (view as any)?.difficulty as Difficulty || "Easy"
  const meta = DIFFICULTY_META[difficulty]
  const DiffIcon = meta.icon

  const { data, isLoading, error } = useQuery<{ questions: QuizQuestion[]; count: number; timeLimitMin: number; passPercentage: number; difficulty: string }>({
    queryKey: ["cyber-quiz-questions", difficulty],
    queryFn: async () => {
      const r = await fetch(`/api/cyber-quiz/questions?difficulty=${difficulty}`)
      if (!r.ok) throw new Error("Failed to load questions")
      return r.json()
    },
  })

  const questions = data?.questions ?? []
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({}) // questionId → A|B|C|D
  const [secondsLeft, setSecondsLeft] = React.useState(TIME_LIMIT_SEC)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [showConfirmSubmit, setShowConfirmSubmit] = React.useState(false)

  const answeredCount = Object.keys(answers).length
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0

  const selectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleSubmit = React.useCallback(async (autoSubmit = false) => {
    if (!autoSubmit && !showConfirmSubmit) {
      setShowConfirmSubmit(true)
      return
    }
    setShowConfirmSubmit(false)
    setSubmitting(true)
    setSubmitError(null)

    try {
      const answersArray = questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id] || "",
      }))

      const r = await fetch("/api/cyber-quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, answers: answersArray }),
      })
      const result = await r.json()
      if (!r.ok) {
        setSubmitError(result?.error || "Submission failed")
        setSubmitting(false)
        return
      }
      // Navigate to the results view with the attemptId + signed result token
      navigate({ name: "cyber-quiz-results", attemptId: result.attemptId, resultToken: result.resultToken } as any)
    } catch (e: any) {
      setSubmitError(e?.message || "Network error")
      setSubmitting(false)
    }
  }, [questions, answers, difficulty, showConfirmSubmit, navigate])

  // Timer
  React.useEffect(() => {
    if (!data) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer)
          // auto-submit when time runs out
          handleSubmit(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [data, handleSubmit])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <main className="relative min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your 30 questions...</p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="relative min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Failed to load questions</p>
          <p className="text-xs text-muted-foreground mb-4">{(error as any)?.message || "Please try again"}</p>
          <Button onClick={() => navigate({ name: "cyber-quiz" })} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1.5" /> Back to quiz
          </Button>
        </div>
      </main>
    )
  }

  const currentQ = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1
  const timeWarning = secondsLeft < 60

  return (
    <main className="relative min-h-screen pb-20">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" aria-hidden />

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className={cn("inline-flex p-1.5 rounded-lg", meta.bg)}>
                <DiffIcon className={cn("h-4 w-4", meta.color)} />
              </div>
              <div>
                <div className="text-sm font-semibold">Cyber Security Foundation</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                  {difficulty} · {meta.label}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center gap-1.5 text-sm font-mono tabular-nums", timeWarning ? "text-rose-400" : "text-muted-foreground")}>
                <Clock className="h-4 w-4" />
                {formatTime(secondsLeft)}
              </div>
              <Button size="sm" variant="ghost" onClick={() => {
                if (confirm("Leave the quiz? Your progress will be lost.")) {
                  navigate({ name: "cyber-quiz" })
                }
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", meta.color.replace("text-", "bg-"))}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6 flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
                Q{currentIdx + 1} / {questions.length}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {currentQ.category}
              </Badge>
            </div>

            <h2 className="text-xl lg:text-2xl font-semibold leading-snug mb-6">
              {currentQ.question}
            </h2>

            {/* Options */}
            <div className="space-y-2.5">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const text = currentQ[`option${opt}` as keyof typeof currentQ] as string
                const isSelected = answers[currentQ.id] === opt
                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(currentQ.id, opt)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-all flex items-center gap-3",
                      isSelected
                        ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_24px_-8px] shadow-violet-500/30"
                        : "border-border/60 bg-card/40 hover:bg-card/60 hover:border-violet-500/30"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold shrink-0",
                      isSelected ? "border-violet-500 bg-violet-500 text-white" : "border-border text-muted-foreground"
                    )}>
                      {opt}
                    </div>
                    <span className="text-sm flex-1">{text}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-[10px] font-mono text-muted-foreground">
                {answeredCount < questions.length ? `${questions.length - answeredCount} unanswered` : "All answered"}
              </div>
              {isLast ? (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Submit quiz
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                  className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Question nav (jump to any question) */}
            <div className="mt-8 flex flex-wrap gap-1.5">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id]
                const isCurrent = i === currentIdx
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={cn(
                      "w-7 h-7 rounded-md text-[10px] font-mono tabular-nums border transition-all",
                      isCurrent
                        ? "border-violet-500 bg-violet-500/20 text-violet-200"
                        : isAnswered
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:border-violet-500/30"
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Confirm submit dialog */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowConfirmSubmit(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border/60 bg-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Submit your quiz?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You've answered {answeredCount} of {questions.length} questions.
                {answeredCount < questions.length && (
                  <span className="text-amber-400"> {questions.length - answeredCount} are still unanswered.</span>
                )}
                {" "}Once submitted, you can't change your answers.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowConfirmSubmit(false)}>Keep going</Button>
                <Button onClick={() => handleSubmit(true)} disabled={submitting} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Submit now
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Error banner */}
        {submitError && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 p-3 text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
      </div>
    </main>
  )
}
