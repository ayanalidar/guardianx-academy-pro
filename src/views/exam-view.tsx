"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Shield, Lock, AlertTriangle, Clock, Eye, EyeOff, CheckCircle2,
  XCircle, ArrowRight, AlertOctagon, Camera, Terminal,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ExamQuestion {
  id: string
  text: string
  options: string[]
  points: number
}

interface ExamData {
  exam: {
    id: string
    title: string
    description: string | null
    durationMin: number
    passingScore: number
    questionCount: number
    course: { id: string; title: string; shortName: string }
  }
  questions: ExamQuestion[]
  attempts: any[]
  canRetake: boolean
}

export function ExamView() {
  const { view, navigate } = useAppStore()
  const examId = (view.name as string) === "exam" ? (view as any).examId : ""
  const [phase, setPhase] = React.useState<"intro" | "instructions" | "exam" | "results">("intro")
  const [attemptId, setAttemptId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<ExamData>({
    queryKey: ["exam", examId],
    queryFn: () => api(`/api/exams/${examId}`),
    enabled: !!examId,
  })

  const startMutation = useMutation({
    mutationFn: () => api(`/api/exams/${examId}/start`, { method: "POST" }),
    onSuccess: (res) => {
      setAttemptId(res.attemptId)
      setPhase("instructions")
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading || !data) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <Shield className="h-10 w-10 text-emerald-400 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading exam...</p>
        </Card>
      </div>
    )
  }

  if (phase === "intro") return <ExamIntro data={data} onStart={() => startMutation.mutate()} starting={startMutation.isPending} />
  if (phase === "instructions") return <ExamInstructions data={data} attemptId={attemptId!} onBegin={() => setPhase("exam")} />
  if (phase === "exam") return <ExamRunner data={data} attemptId={attemptId!} onComplete={() => setPhase("results")} />
  if (phase === "results") return <ExamResults data={data} attemptId={attemptId!} onRetake={() => { setPhase("intro"); setAttemptId(null) }} onBack={() => navigate({ name: "course", courseId: data.exam.course.id })} />
  return null
}

// === INTRO PHASE ===
function ExamIntro({ data, onStart, starting }: { data: ExamData; onStart: () => void; starting: boolean }) {
  const lastAttempt = data.attempts[0]
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card className="p-8 relative overflow-hidden border-emerald-500/20">
        <div className="orb bg-emerald-500 w-48 h-48 -top-10 -right-10" />
        <div className="relative z-10 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Shield className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{data.exam.title}</h1>
          <p className="text-sm text-muted-foreground mb-6">{data.exam.description || "Proctored certification examination"}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">{data.exam.questionCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Questions</div>
            </div>
            <div className="glass-card rounded-lg p-3">
              <div className="text-2xl font-bold text-cyan-400">{data.exam.durationMin}m</div>
              <div className="text-[10px] text-muted-foreground uppercase">Duration</div>
            </div>
            <div className="glass-card rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-400">{data.exam.passingScore}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">Pass Mark</div>
            </div>
          </div>

          {lastAttempt && (
            <div className={cn("p-3 rounded-lg mb-4 text-sm", lastAttempt.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
              Last attempt: {lastAttempt.score}% ({lastAttempt.passed ? "Passed" : lastAttempt.status === "voided" ? "Voided" : "Failed"})
              {lastAttempt.voidedReason && <div className="text-[10px] mt-1">{lastAttempt.voidedReason}</div>}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            This is a proctored exam with anti-cheat monitoring. Violations will void your attempt.
          </div>

          <Button className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 h-12" onClick={onStart} disabled={starting || !data.canRetake}>
            {starting ? "Starting..." : !data.canRetake ? "Max Attempts Reached" : "Start Exam"}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// === INSTRUCTIONS PHASE ===
function ExamInstructions({ data, attemptId, onBegin }: { data: ExamData; attemptId: string; onBegin: () => void }) {
  const rules = [
    { icon: Lock, text: "The exam will open in fullscreen mode. Exiting fullscreen will be logged." },
    { icon: EyeOff, text: "Switching browser tabs or windows will be detected and logged. 5+ tab switches will void your exam." },
    { icon: Terminal, text: "Right-click, copy (Ctrl+C), and paste (Ctrl+V) are disabled during the exam." },
    { icon: AlertOctagon, text: "Keyboard shortcuts (Ctrl+, Alt+, F12, etc.) are blocked. Attempting them will be logged." },
    { icon: Clock, text: `You have ${data.exam.durationMin} minutes. The timer cannot be paused once started.` },
    { icon: Shield, text: "Questions are presented one at a time. You cannot go back to previous questions." },
    { icon: CheckCircle2, text: `You need ${data.exam.passingScore}% to pass. Each question is worth points.` },
    { icon: AlertTriangle, text: "Total anti-cheat violations exceeding 10 will automatically void your exam." },
  ]
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card className="p-8 border-amber-500/20">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold mb-1">Exam Rules & Anti-Cheat Policy</h2>
          <p className="text-sm text-muted-foreground">Please read carefully before beginning</p>
        </div>

        <div className="space-y-3 mb-6">
          {rules.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
              <r.icon className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground">{r.text}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 mb-6">
          <p className="text-xs text-red-400 font-medium mb-1">⚠️ By clicking "Begin Exam" you agree:</p>
          <ul className="text-[11px] text-muted-foreground space-y-1 ml-4 list-disc">
            <li>You will not open any other tabs, windows, or applications</li>
            <li>You will not use any reference materials, notes, or search engines</li>
            <li>You will not communicate with anyone during the exam</li>
            <li>Violations will result in immediate voiding of your exam attempt</li>
          </ul>
        </div>

        <Button className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400 h-12" onClick={onBegin}>
          <Lock className="h-4 w-4 mr-2" /> I Understand — Begin Exam
        </Button>
      </Card>
    </div>
  )
}

// === EXAM RUNNER (anti-cheat locked down) ===
function ExamRunner({ data, attemptId, onComplete }: { data: ExamData; attemptId: string; onComplete: () => void }) {
  const qc = useQueryClient()
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, number>>({})
  const [timeLeft, setTimeLeft] = React.useState(data.exam.durationMin * 60)
  const [violations, setViolations] = React.useState({ tabSwitches: 0, copyAttempts: 0, pasteAttempts: 0, rightClicks: 0, fullscreenExits: 0, keyboardViolations: 0 })
  const [showWarning, setShowWarning] = React.useState<string | null>(null)
  const [voided, setVoided] = React.useState(false)
  const [voidReason, setVoidReason] = React.useState<string | null>(null)

  const currentQuestion = data.questions[currentIdx]
  const isLast = currentIdx === data.questions.length - 1

  // Shuffle questions once on mount (randomized order)
  const shuffledQuestions = React.useMemo(() => {
    const shuffled = [...data.questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [data.questions])

  // Use shuffled questions
  const actualQuestion = shuffledQuestions[currentIdx]

  // Shuffle options for current question
  const shuffledOptions = React.useMemo(() => {
    if (!actualQuestion) return []
    const opts = actualQuestion.options.map((opt, i) => ({ opt, origIdx: i }))
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return opts
  }, [actualQuestion?.id])

  // Log proctor event
  const logProctor = React.useCallback(async (eventType: string, detail?: string) => {
    try {
      const res = await api(`/api/exams/${data.exam.id}/proctor-log`, {
        method: "POST",
        body: JSON.stringify({ attemptId, eventType, detail }),
      })
      if (res.voided) {
        setVoided(true)
        setVoidReason(res.voidReason)
        onComplete()
      }
    } catch {}
  }, [attemptId, data.exam.id, onComplete])

  // Request fullscreen on mount
  React.useEffect(() => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        // Fullscreen denied — log it
        logProctor("fullscreen_exit", "Fullscreen request denied")
        setViolations((v) => ({ ...v, fullscreenExits: v.fullscreenExits + 1 }))
      })
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  // Submit mutation (declared early so timer can reference it via ref)
  const submitMutation = useMutation({
    mutationFn: () => api(`/api/exams/${data.exam.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers, proctorStats: violations }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam", data.exam.id] })
      onComplete()
    },
    onError: (e: any) => {
      toast.error(e.message)
      onComplete()
    },
  })

  const handleSubmit = () => submitMutation.mutate()

  // Timer — uses a ref to call submit without dependency issues
  const submitRef = React.useRef<() => void>(() => {})
  React.useEffect(() => {
    submitRef.current = () => submitMutation.mutate()
  }, [submitMutation])

  React.useEffect(() => {
    if (timeLeft <= 0) {
      submitRef.current()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  // Anti-cheat: visibility change (tab switch)
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setViolations((v) => ({ ...v, tabSwitches: v.tabSwitches + 1 }))
        setShowWarning("Tab switch detected! This has been logged. Repeated violations will void your exam.")
        logProctor("tab_switch", "User switched away from exam tab")
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [logProctor])

  // Anti-cheat: blur/focus (window switch)
  React.useEffect(() => {
    const handleBlur = () => {
      setViolations((v) => ({ ...v, tabSwitches: v.tabSwitches + 1 }))
      setShowWarning("Focus lost! You switched away from the exam window. This has been logged.")
      logProctor("tab_switch", "Window lost focus")
    }
    window.addEventListener("blur", handleBlur)
    return () => window.removeEventListener("blur", handleBlur)
  }, [logProctor])

  // Anti-cheat: fullscreen change
  React.useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setViolations((v) => ({ ...v, fullscreenExits: v.fullscreenExits + 1 }))
        setShowWarning("Fullscreen exited! This has been logged. Return to fullscreen immediately.")
        logProctor("fullscreen_exit", "User exited fullscreen mode")
      }
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [logProctor])

  // Anti-cheat: context menu (right-click)
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setViolations((v) => ({ ...v, rightClicks: v.rightClicks + 1 }))
      setShowWarning("Right-click is disabled during the exam!")
      logProctor("right_click", "Right-click attempt blocked")
    }
    document.addEventListener("contextmenu", handleContextMenu)
    return () => document.removeEventListener("contextmenu", handleContextMenu)
  }, [logProctor])

  // Anti-cheat: keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C (copy)
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault()
        setViolations((v) => ({ ...v, copyAttempts: v.copyAttempts + 1 }))
        setShowWarning("Copy is disabled during the exam!")
        logProctor("copy", "Ctrl+C blocked")
        return
      }
      // Block Ctrl+V (paste)
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault()
        setViolations((v) => ({ ...v, pasteAttempts: v.pasteAttempts + 1 }))
        setShowWarning("Paste is disabled during the exam!")
        logProctor("paste", "Ctrl+V blocked")
        return
      }
      // Block Ctrl+A (select all), Ctrl+S (save), Ctrl+U (view source), F12, etc.
      if ((e.ctrlKey || e.metaKey) && ["a", "s", "u", "p", "n", "t", "w", "o", "l"].includes(e.key.toLowerCase())) {
        e.preventDefault()
        setViolations((v) => ({ ...v, keyboardViolations: v.keyboardViolations + 1 }))
        setShowWarning(`Keyboard shortcut blocked: Ctrl+${e.key.toUpperCase()}`)
        logProctor("keyboard_violation", `Ctrl+${e.key.toUpperCase()} blocked`)
        return
      }
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))) {
        e.preventDefault()
        setViolations((v) => ({ ...v, keyboardViolations: v.keyboardViolations + 1 }))
        setShowWarning("Developer tools are disabled during the exam!")
        logProctor("keyboard_violation", "DevTools shortcut blocked")
        return
      }
      // Block Alt+Tab
      if (e.altKey && e.key === "Tab") {
        e.preventDefault()
        setViolations((v) => ({ ...v, keyboardViolations: v.keyboardViolations + 1 }))
        logProctor("keyboard_violation", "Alt+Tab blocked")
      }
    }
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); setViolations((v) => ({ ...v, copyAttempts: v.copyAttempts + 1 })); logProctor("copy", "Copy event blocked") }
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); setViolations((v) => ({ ...v, pasteAttempts: v.pasteAttempts + 1 })); logProctor("paste", "Paste event blocked") }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("copy", handleCopy)
    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("paste", handlePaste)
    }
  }, [logProctor])

  // Clear warning after 3s
  React.useEffect(() => {
    if (showWarning) {
      const t = setTimeout(() => setShowWarning(null), 3000)
      return () => clearTimeout(t)
    }
  }, [showWarning])

  function selectAnswer(qId: string, origIdx: number) {
    setAnswers((a) => ({ ...a, [qId]: origIdx }))
  }

  function nextQuestion() {
    if (isLast) {
      handleSubmit()
    } else {
      setCurrentIdx((i) => i + 1)
    }
  }

  if (voided) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center border-red-500/30">
          <AlertOctagon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Exam Voided</h2>
          <p className="text-sm text-muted-foreground mb-4">{voidReason || "Anti-cheat violations exceeded the threshold."}</p>
          <Button onClick={onComplete}>View Results</Button>
        </Card>
      </div>
    )
  }

  const totalViolations = Object.values(violations).reduce((a, b) => a + b, 0)
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-4">
      {/* Exam header bar */}
      <div className="sticky top-0 z-20 flex items-center gap-4 p-3 rounded-xl glass border border-amber-500/30">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-mono text-amber-400">EXAM LOCKED</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" />
          <span className={cn("text-sm font-mono font-bold tabular-nums", timeLeft < 60 ? "text-red-400 animate-pulse" : "text-cyan-400")}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="outline" className={cn("text-[10px]", totalViolations > 5 ? "text-red-400 border-red-500/30" : "text-amber-400 border-amber-500/30")}>
            <AlertTriangle className="h-2.5 w-2.5 mr-1" /> {totalViolations} violations
          </Badge>
          <span className="text-xs text-muted-foreground">Q {currentIdx + 1}/{shuffledQuestions.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={((currentIdx + 1) / shuffledQuestions.length) * 100} className="h-1" />

      {/* Warning toast */}
      {showWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 animate-scale-reveal">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/90 text-white text-sm font-medium shadow-2xl">
            <AlertTriangle className="h-4 w-4" /> {showWarning}
          </div>
        </div>
      )}

      {/* Question card */}
      <Card className="p-6 lg:p-8 glass-card">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">Question {currentIdx + 1}</Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">{actualQuestion?.points} pts</Badge>
        </div>

        <h2 className="text-lg font-semibold mb-6 leading-relaxed">{actualQuestion?.text}</h2>

        <div className="space-y-2">
          {shuffledOptions.map((opt, i) => {
            const isSelected = answers[actualQuestion?.id] === opt.origIdx
            return (
              <button
                key={i}
                onClick={() => selectAnswer(actualQuestion.id, opt.origIdx)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all",
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-border hover:border-emerald-500/30 hover:bg-accent/30",
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono font-bold",
                  isSelected ? "border-emerald-500 bg-emerald-500 text-emerald-950" : "border-muted-foreground/40",
                )}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt.opt}</span>
                {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </button>
            )
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {answers[actualQuestion?.id] !== undefined ? "Answer saved" : "Select an answer"}
          </span>
          <Button onClick={nextQuestion} disabled={answers[actualQuestion?.id] === undefined || submitMutation.isPending}>
            {isLast ? (submitMutation.isPending ? "Submitting..." : "Submit Exam") : "Next Question"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>

      {/* Anti-cheat status */}
      <div className="flex items-center gap-3 px-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Monitoring active</span>
        <span>·</span>
        <span>Tab switches: {violations.tabSwitches}</span>
        <span>·</span>
        <span>Copy attempts: {violations.copyAttempts}</span>
        <span>·</span>
        <span>Right-clicks: {violations.rightClicks}</span>
        <span>·</span>
        <span>Fullscreen exits: {violations.fullscreenExits}</span>
      </div>
    </div>
  )
}

// === RESULTS PHASE ===
function ExamResults({ data, attemptId, onRetake, onBack }: { data: ExamData; attemptId: string; onRetake: () => void; onBack: () => void }) {
  const { data: result } = useQuery<any>({
    queryKey: ["exam-result", attemptId],
    queryFn: () => api(`/api/exams/${data.exam.id}`),
  })

  const lastAttempt = result?.attempts?.[0]

  if (!lastAttempt) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading results...</p>
        </Card>
      </div>
    )
  }

  const passed = lastAttempt.passed
  const voided = lastAttempt.status === "voided"

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card className={cn("p-8 text-center relative overflow-hidden", passed ? "border-emerald-500/30" : voided ? "border-red-500/30" : "border-amber-500/30")}>
        <div className={cn("orb w-48 h-48 -top-10 -right-10", passed ? "bg-emerald-500" : voided ? "bg-red-500" : "bg-amber-500")} />
        <div className="relative z-10">
          {passed ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4 animate-scale-reveal" />
          ) : voided ? (
            <AlertOctagon className="h-16 w-16 text-red-400 mx-auto mb-4 animate-scale-reveal" />
          ) : (
            <XCircle className="h-16 w-16 text-amber-400 mx-auto mb-4 animate-scale-reveal" />
          )}

          <h1 className="text-2xl font-bold mb-2">
            {passed ? "Exam Passed!" : voided ? "Exam Voided" : "Exam Not Passed"}
          </h1>

          {!voided && (
            <div className="text-4xl font-bold tabular-nums mb-2" style={{ color: passed ? "#10b981" : "#f59e0b" }}>
              {lastAttempt.score}%
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            {passed ? `Congratulations! You scored ${lastAttempt.score}% (pass mark: ${data.exam.passingScore}%)` :
             voided ? lastAttempt.voidedReason :
             `You scored ${lastAttempt.score}%. Pass mark: ${data.exam.passingScore}%.`}
          </p>

          {/* Anti-cheat summary */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="glass-card rounded-lg p-2">
              <div className="text-sm font-bold text-amber-400">{lastAttempt.tabSwitches}</div>
              <div className="text-[9px] text-muted-foreground">Tab Switches</div>
            </div>
            <div className="glass-card rounded-lg p-2">
              <div className="text-sm font-bold text-red-400">{lastAttempt.copyAttempts + lastAttempt.pasteAttempts}</div>
              <div className="text-[9px] text-muted-foreground">Copy/Paste</div>
            </div>
            <div className="glass-card rounded-lg p-2">
              <div className="text-sm font-bold text-orange-400">{lastAttempt.rightClicks + lastAttempt.fullscreenExits + lastAttempt.keyboardViolations}</div>
              <div className="text-[9px] text-muted-foreground">Other</div>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {data.canRetake && !passed && <Button variant="outline" onClick={onRetake}>Retake Exam</Button>}
            <Button onClick={onBack}>Back to Course</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
