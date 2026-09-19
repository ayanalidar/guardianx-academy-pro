"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft, Clock, Award, ShieldCheck, Fingerprint, ScanLine,
  Camera, Eye, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, Flag, Lock, Loader2,
  Trophy, Target, Gauge, FileBadge, AlertCircle, X, Maximize2,
  BadgeCheck, Hash, ListChecks,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/* ============================================================
   ExamDetailView - full proctored exam experience
   Phases: detail → setup → exam → results
   ============================================================ */

type Phase = "detail" | "setup" | "exam" | "results"

interface Question {
  id: string
  type: string // mcq | multiple | truefalse | scenario | practical
  domain: string
  skill: string | null
  difficulty: string
  question: string
  options: string[]
  points: number
  tags: string[]
}

interface StartResponse {
  attempt: {
    id: string
    status: string
    startedAt: string
    submittedAt: string | null
  }
  exam: {
    id: string
    slug: string
    title: string
    duration: number
    passingScore: number
    proctoringEnabled: boolean
    shuffleQuestions: boolean
    shuffleOptions: boolean
  }
  questions: Question[]
  proctoring: {
    id: string
    identityVerified: boolean
    environmentChecked: boolean
    cameraEnabled: boolean
    microphoneEnabled: boolean
    screenShared: boolean
    fullscreenMode: boolean
    tabSwitches: number
    windowBlurs: number
    incidentCount: number
  }
  resumed: boolean
}

interface SubmitResponse {
  attempt: {
    id: string
    status: string
    score: number
    totalQuestions: number
    correctAnswers: number
    timeSpent: number | null
    submittedAt: string
    passed: boolean
  }
  exam: {
    id: string
    title: string
    passingScore: number
    duration: number
    certificationId: string | null
    certificationName: string | null
  }
  grading: {
    totalEarnedPoints: number
    totalPossiblePoints: number
    domainBreakdown: {
      domain: string
      correct: number
      total: number
      percentage: number
      pointsEarned: number
      pointsPossible: number
    }[]
  }
  answers: {
    questionId: string
    selected: any
    correct: boolean
    points: number
    earned: number
    domain: string
    skill: string | null
    difficulty: string
    type: string
    question: string
    options: string[]
    correctAnswer: any
    explanation: string | null
  }[]
  credential: {
    id: string
    credentialId: string
    certificationId: string
    candidateName: string
    score: number
    issueDate: string
    expiryDate: string | null
    status: string
    verificationUrl: string | null
  } | null
}

interface ExamDetail {
  exam: {
    id: string
    slug: string
    title: string
    description: string | null
    certificationId: string | null
    duration: number
    passingScore: number
    maxAttempts: number
    questionCount: number
    actualQuestionCount: number
    sections: any[]
    questionType: string
    proctoringEnabled: boolean
    shuffleQuestions: boolean
    shuffleOptions: boolean
    status: string
    certification: {
      id: string
      slug: string
      name: string
      level: string
      domains: string[]
      skills: string[]
      passingScore: number
      validityPeriod: number
      icon: string
      color: string
    } | null
    questions: Question[] | null
    userContext: {
      attemptsUsed: number
      attemptsRemaining: number
      bestScore: number
      readinessScore: number | null
      hasPassed: boolean
      hasInProgress: boolean
      recentAttempts: {
        id: string
        status: string
        score: number | null
        createdAt: string
        submittedAt: string | null
      }[]
    }
  }
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
}

export function ExamDetailView() {
  const { view, navigate } = useAppStore()
  const examId = view.name === "exam-detail" ? view.examId : ""
  const queryClient = useQueryClient()
  const [phase, setPhase] = React.useState<Phase>("detail")
  const [startData, setStartData] = React.useState<StartResponse | null>(null)
  const [submitResult, setSubmitResult] = React.useState<SubmitResponse | null>(null)

  // Pull exam details
  const { data, isLoading, isError } = useQuery<ExamDetail>({
    queryKey: ["exam-detail", examId],
    queryFn: () => api(`/api/exams/${examId}`),
    enabled: !!examId && phase === "detail",
  })

  const exam = data?.exam

  // Start mutation
  const startMutation = useMutation({
    mutationFn: () => api<StartResponse>(`/api/exams/${examId}/start`, {
      method: "POST",
    }),
    onSuccess: (resp) => {
      setStartData(resp)
      setPhase("setup")
      if (resp.resumed) {
        toast.info("Resuming your previous in-progress attempt.")
      } else {
        toast.success("Exam attempt started. Good luck!")
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleEnterExam = () => {
    if (!startData) return
    setPhase("exam")
  }

  const handleSubmit = (result: SubmitResponse) => {
    setSubmitResult(result)
    setPhase("results")
    queryClient.invalidateQueries({ queryKey: ["exam-detail", examId] })
    queryClient.invalidateQueries({ queryKey: ["credentials"] })
    queryClient.invalidateQueries({ queryKey: ["exam-attempts"] })
  }

  const handleExit = () => {
    setPhase("detail")
    setStartData(null)
    setSubmitResult(null)
    navigate({ name: "exams" })
  }

  /* ---------- Loading / error / not found ---------- */
  if (!examId) {
    return (
      <EmptyState
        title="No exam selected"
        description="Choose an exam from the catalogue."
        onBack={() => navigate({ name: "exams" })}
      />
    )
  }
  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  if (isError || !exam) {
    return (
      <EmptyState
        title="Exam not found"
        description="This exam doesn't exist or has been archived."
        onBack={() => navigate({ name: "exams" })}
      />
    )
  }

  /* ---------- Phase router ---------- */
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatePresence mode="wait">
        {phase === "detail" && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <ExamDetailPhase
              exam={exam}
              onStart={() => startMutation.mutate()}
              starting={startMutation.isPending}
            />
          </motion.div>
        )}
        {phase === "setup" && startData && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <PreExamSetup
              startData={startData}
              onContinue={handleEnterExam}
              onBack={() => {
                setPhase("detail")
                setStartData(null)
              }}
            />
          </motion.div>
        )}
        {phase === "exam" && startData && (
          <ExamRunner
            key="exam"
            startData={startData}
            onSubmit={handleSubmit}
            onExit={handleExit}
          />
        )}
        {phase === "results" && submitResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <ExamResults
              result={submitResult}
              onRetake={() => {
                setSubmitResult(null)
                setStartData(null)
                setPhase("detail")
              }}
              onExit={handleExit}
              onViewCredentials={() => navigate({ name: "credentials" })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   Phase 1 - Exam detail (info + eligibility + start)
   ============================================================ */

function ExamDetailPhase({
  exam,
  onStart,
  starting,
}: {
  exam: ExamDetail["exam"]
  onStart: () => void
  starting: boolean
}) {
  const { navigate } = useAppStore()
  const uc = exam.userContext
  // NOTE: do NOT exclude hasInProgress here — when an attempt is in
  // progress this same button becomes "Resume Attempt", and the start API
  // resumes it (resumed:true). The old `!uc.hasInProgress` clause disabled
  // the resume button forever, locking students out of interrupted exams.
  const canStart = uc.attemptsRemaining > 0
  const certs = exam.certification

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ name: "exams" })}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Exams
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 border-border/60">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-violet-500/10">
                <Award className="h-6 w-6 text-violet-300" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                  {exam.proctoringEnabled && (
                    <Badge variant="outline" className="text-rose-300 border-rose-500/30 bg-rose-500/10 text-[10px] font-mono uppercase">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Proctored
                    </Badge>
                  )}
                </div>
                {certs && (
                  <div className="text-xs text-muted-foreground">
                    Awards: <span className={certs.color}>{certs.name}</span> · {certs.level}
                  </div>
                )}
              </div>
            </div>

            {exam.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {exam.description}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={Clock} label="Duration" value={`${exam.duration}m`} accent="text-cyan-300" />
              <Stat icon={ListChecks} label="Questions" value={`${exam.actualQuestionCount}`} accent="text-violet-300" />
              <Stat icon={Target} label="Pass Score" value={`${exam.passingScore}%`} accent="text-emerald-300" />
              <Stat icon={Gauge} label="Attempts" value={`${uc.attemptsUsed}/${exam.maxAttempts}`} accent="text-amber-300" />
            </div>
          </Card>

          {certs && (
            <Card className="p-6 border-border/60">
              <h2 className="text-sm font-semibold mb-3">Certification Awarded</h2>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-violet-200">{certs.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {certs.level} · Valid for {certs.validityPeriod} months
                    </div>
                  </div>
                  <Badge variant="outline" className="text-violet-300 border-violet-500/30">
                    <FileBadge className="h-3 w-3 mr-1" />
                    GuardianX
                  </Badge>
                </div>
                {certs.domains.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                      Domains Assessed
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {certs.domains.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-200"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {certs.skills.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                      Skills Verified
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {certs.skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {exam.sections && exam.sections.length > 0 && (
            <Card className="p-6 border-border/60">
              <h2 className="text-sm font-semibold mb-3">Exam Blueprint</h2>
              <div className="space-y-2">
                {exam.sections.map((s: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      {Array.isArray(s.domains) && s.domains.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {s.domains.join(" · ")}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {s.questionCount} Q
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 border-border/60 sticky top-20">
            <h3 className="text-sm font-semibold mb-3">Your Eligibility</h3>
            <div className="space-y-2.5">
              <EligRow
                label="Attempts Used"
                value={`${uc.attemptsUsed} / ${exam.maxAttempts}`}
                ok={uc.attemptsUsed < exam.maxAttempts}
              />
              <EligRow
                label="Attempts Remaining"
                value={`${uc.attemptsRemaining}`}
                ok={uc.attemptsRemaining > 0}
              />
              <EligRow
                label="Best Score"
                value={uc.bestScore > 0 ? `${uc.bestScore}%` : "-"}
                ok={uc.bestScore >= exam.passingScore}
              />
              <EligRow
                label="Readiness (last 3)"
                value={
                  uc.readinessScore === null
                    ? "Not attempted yet"
                    : `${uc.readinessScore}%`
                }
                ok={
                  uc.readinessScore !== null &&
                  uc.readinessScore >= exam.passingScore
                }
              />
              <EligRow
                label="Status"
                value={
                  uc.hasPassed
                    ? "Passed"
                    : uc.hasInProgress
                    ? "In Progress"
                    : "Eligible"
                }
                ok={uc.hasPassed}
              />
            </div>

            <div className="mt-5 space-y-2">
              <Button
                onClick={onStart}
                disabled={starting || !canStart}
                className="w-full btn-premium bg-violet-600 hover:bg-violet-500 h-11"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting…
                  </>
                ) : uc.hasInProgress ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Resume Attempt
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Start Exam
                  </>
                )}
              </Button>
              {!canStart && !uc.hasInProgress && (
                <p className="text-[11px] text-rose-300 text-center">
                  Maximum attempts reached for this exam.
                </p>
              )}
              {uc.hasInProgress && (
                <p className="text-[11px] text-amber-300 text-center">
                  You have an in-progress attempt - resuming now.
                </p>
              )}
            </div>
          </Card>

          {uc.recentAttempts.length > 0 && (
            <Card className="p-5 border-border/60">
              <h3 className="text-sm font-semibold mb-3">Recent Attempts</h3>
              <div className="space-y-2">
                {uc.recentAttempts.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-medium capitalize">{a.status}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {typeof a.score === "number" && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono",
                          a.score >= exam.passingScore
                            ? "text-emerald-300 border-emerald-500/30"
                            : "text-rose-300 border-rose-500/30"
                        )}
                      >
                        {a.score}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 p-3">
      <Icon className={cn("h-4 w-4 mb-1.5", accent)} />
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  )
}

function EligRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium inline-flex items-center gap-1.5", ok ? "text-emerald-300" : "text-foreground")}>
        {ok && <CheckCircle2 className="h-3.5 w-3.5" />}
        {value}
      </span>
    </div>
  )
}

/* ============================================================
   Phase 2 - Pre-exam setup (identity + environment + camera)
   ============================================================ */

function PreExamSetup({
  startData,
  onContinue,
  onBack,
}: {
  startData: StartResponse
  onContinue: () => void
  onBack: () => void
}) {
  const [identityChecked, setIdentityChecked] = React.useState(false)
  const [environmentChecked, setEnvironmentChecked] = React.useState(false)
  const [rulesAccepted, setRulesAccepted] = React.useState(false)
  const [cameraStatus, setCameraStatus] = React.useState<"pending" | "requesting" | "granted" | "denied">("pending")
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)

  const requestCamera = React.useCallback(async () => {
    setCameraStatus("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraStatus("granted")
      // Report to backend (best-effort)
      try {
        await api(`/api/proctoring/${startData.attempt.id}`, {
          method: "POST",
          body: JSON.stringify({ cameraEnabled: true, identityVerified: true }),
        })
      } catch {}
    } catch (err) {
      setCameraStatus("denied")
      toast.error("Camera permission denied. Proctoring cannot proceed.")
    }
  }, [startData.attempt.id])

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const canContinue = identityChecked && environmentChecked && rulesAccepted && cameraStatus === "granted"

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Cancel
      </Button>

      <Card className="p-6 sm:p-8 border-border/60">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-500/10 mb-3">
            <ShieldCheck className="h-7 w-7 text-violet-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pre-Exam Verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {startData.exam.title}
          </p>
        </div>

        {/* Identity check */}
        <SetupStep
          icon={Fingerprint}
          title="Identity Verification"
          description="Confirm that you are the registered candidate. Proxy test-takers will result in immediate void and credential revocation."
          done={identityChecked}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdentityChecked((v) => !v)}
            className="mt-2"
          >
            {identityChecked ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                Verified
              </>
            ) : (
              "I confirm I am the registered candidate"
            )}
          </Button>
        </SetupStep>

        {/* Environment check */}
        <SetupStep
          icon={ScanLine}
          title="Environment Check"
          description="No second monitors, no virtual machines, no restricted apps. Close all other browser tabs and applications before continuing."
          done={environmentChecked}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnvironmentChecked((v) => !v)}
            className="mt-2"
          >
            {environmentChecked ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                Environment OK
              </>
            ) : (
              "My environment is clean"
            )}
          </Button>
        </SetupStep>

        {/* Camera */}
        <SetupStep
          icon={Camera}
          title="Camera Monitoring"
          description="Your camera will be monitored throughout the exam. Off-screen behaviour will be flagged for proctoring review."
          done={cameraStatus === "granted"}
        >
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-28 w-40 rounded-lg overflow-hidden border border-border/60 bg-black/80">
              {cameraStatus === "granted" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {cameraStatus === "requesting" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
              )}
              {cameraStatus === "granted" && (
                <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-mono uppercase text-emerald-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-950 animate-pulse" />
                  Live
                </div>
              )}
            </div>
            <Button
              variant={cameraStatus === "granted" ? "secondary" : "default"}
              size="sm"
              onClick={requestCamera}
              disabled={cameraStatus === "requesting" || cameraStatus === "granted"}
            >
              {cameraStatus === "granted"
                ? "Camera Enabled"
                : cameraStatus === "requesting"
                ? "Requesting…"
                : "Enable Camera"}
            </Button>
          </div>
          {cameraStatus === "denied" && (
            <p className="mt-2 text-[11px] text-rose-300">
              Camera access denied. Reload the page and grant permission to continue.
            </p>
          )}
        </SetupStep>

        {/* Rules */}
        <div className="mt-4 rounded-xl border border-border/40 bg-card/30 p-4">
          <Label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={rulesAccepted}
              onCheckedChange={(v) => setRulesAccepted(!!v)}
              className="mt-0.5"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I understand that tab-switching, leaving fullscreen, or attempting to open
              other applications will be logged as proctoring incidents. Multiple incidents
              may result in the attempt being voided and the credential revoked.
            </span>
          </Label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button
            disabled={!canContinue}
            onClick={onContinue}
            className="btn-premium bg-violet-600 hover:bg-violet-500"
          >
            <Lock className="h-4 w-4 mr-2" />
            Enter Fullscreen & Begin
          </Button>
        </div>
      </Card>
    </div>
  )
}

function SetupStep({
  icon: Icon,
  title,
  description,
  done,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  done: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      "mt-4 rounded-xl border p-4 transition-colors",
      done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 bg-card/30"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
          done ? "bg-emerald-500/15 text-emerald-300" : "bg-violet-500/10 text-violet-300"
        )}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Phase 3 - Exam runner (timer + questions + proctoring)
   ============================================================ */

interface ExamRunnerProps {
  startData: StartResponse
  onSubmit: (result: SubmitResponse) => void
  onExit: () => void
}

function ExamRunner({ startData, onSubmit, onExit }: ExamRunnerProps) {
  const questions = startData.questions
  const durationSec = startData.exam.duration * 60
  const startedAt = new Date(startData.attempt.startedAt).getTime()
  const [endTime] = React.useState(() => startedAt + durationSec * 1000)

  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, any>>({})
  const [flagged, setFlagged] = React.useState<Set<string>>(new Set())
  const [tabSwitches, setTabSwitches] = React.useState(0)
  const [windowBlurs, setWindowBlurs] = React.useState(0)
  const [proctorFlags, setProctorFlags] = React.useState<any[]>([])
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false)
  const [showExitDialog, setShowExitDialog] = React.useState(false)
  const [now, setNow] = React.useState(Date.now())
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)

  /* ---------- Timer ---------- */
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remainingMs = Math.max(0, endTime - now)
  const remainingSec = Math.floor(remainingMs / 1000)
  const mm = Math.floor(remainingSec / 60)
  const ss = remainingSec % 60
  const timePct = (remainingMs / (durationSec * 1000)) * 100

  /* ---------- Proctoring: live violation ingest ----------
   * Every violation is (a) kept in local state for the submit payload and
   * (b) streamed IMMEDIATELY to /api/exams/[id]/proctor-log which appends
   * it to the server-side ProctoringSession and voids the attempt when the
   * incident threshold is crossed. Previously flags lived only in React
   * state and were flushed once at submit — any crash, tab close or failed
   * submit silently lost ALL violations.
   */
  const queueRef = React.useRef<{ eventType: string; detail?: string }[]>([])
  const flushingRef = React.useRef(false)
  const [serverIncidents, setServerIncidents] = React.useState(0)
  const [serverVoided, setServerVoided] = React.useState<{ reason: string } | null>(null)

  const flushProctorQueue = React.useCallback(async () => {
    if (flushingRef.current) return
    flushingRef.current = true
    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current[0]
        const res = await api<{ ok?: boolean; voided?: boolean; voidReason?: string; incidentCount?: number }>(
          `/api/exams/${startData.exam.id}/proctor-log`,
          {
            method: "POST",
            body: JSON.stringify({ attemptId: startData.attempt.id, ...next }),
          },
        )
        queueRef.current.shift()
        if (res?.voided) {
          setServerVoided({ reason: res.voidReason || "Attempt voided due to proctoring violations." })
        } else if (typeof res?.incidentCount === "number") {
          setServerIncidents(res.incidentCount)
        }
      }
    } catch {
      // Network hiccup — leave the event at the head of the queue and retry
      // on the next tick. Never let proctoring ingest break the exam.
    } finally {
      flushingRef.current = false
    }
  }, [startData.exam.id, startData.attempt.id])

  // Retry the queue periodically + flush what we can when the page is
  // hidden/closed (sendBeacon keeps the tab-close case covered).
  React.useEffect(() => {
    const t = setInterval(() => void flushProctorQueue(), 4000)
    const pagehide = () => {
      if (queueRef.current.length === 0) return
      // Batch beacon to the counter endpoint, which accepts a flags array.
      const body = JSON.stringify({
        flags: queueRef.current.map((e) => ({
          type: e.eventType,
          timestamp: Date.now(),
          detail: e.detail,
        })),
      })
      navigator.sendBeacon?.(
        `/api/proctoring/${startData.attempt.id}`,
        new Blob([body], { type: "application/json" }),
      )
      queueRef.current = []
    }
    window.addEventListener("pagehide", pagehide)
    return () => {
      clearInterval(t)
      window.removeEventListener("pagehide", pagehide)
    }
  }, [flushProctorQueue, startData.attempt.id])

  /** Record a violation locally AND enqueue it for server ingest. */
  const addProctorFlag = React.useCallback(
    (flag: { type: string; detail?: string }) => {
      setProctorFlags((prev) => [
        ...prev,
        { type: flag.type, timestamp: Date.now(), detail: flag.detail },
      ])
      queueRef.current.push({ eventType: flag.type, detail: flag.detail })
      void flushProctorQueue()
    },
    [flushProctorQueue],
  )

  // Server decided the attempt is voided → end the exam immediately.
  React.useEffect(() => {
    if (serverVoided) {
      toast.error(serverVoided.reason)
      onSubmit({
        ...({} as SubmitResponse),
        attempt: {
          id: startData.attempt.id,
          status: "voided",
          score: 0,
          totalQuestions: questions.length,
          correctAnswers: 0,
          timeSpent: Math.floor((Date.now() - startedAt) / 1000),
          submittedAt: new Date().toISOString(),
          passed: false,
        },
        exam: {
          id: startData.exam.id,
          title: startData.exam.title,
          passingScore: startData.exam.passingScore,
          duration: startData.exam.duration,
          certificationId: null,
          certificationName: null,
        },
        grading: { totalEarnedPoints: 0, totalPossiblePoints: 0, domainBreakdown: [] },
        answers: [],
        credential: null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverVoided])

  /* ---------- Submit ---------- */
  const submitMutation = useMutation({
    mutationFn: (payload: any) =>
      api<SubmitResponse>(`/api/exams/${startData.exam.id}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (resp) => {
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      // Send final proctoring flags
      try {
        api(`/api/proctoring/${startData.attempt.id}`, {
          method: "POST",
          body: JSON.stringify({ flags: proctorFlags }),
        })
      } catch {}
      onSubmit(resp)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setShowSubmitDialog(false)
    },
  })

  const handleSubmit = (auto = false) => {
    void auto // auto-submit path skips the confirm dialog (already shown by caller)
    const payload = {
      attemptId: startData.attempt.id,
      answers: questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id] ?? null,
      })),
      proctorFlags,
      timeSpent: Math.floor((Date.now() - startedAt) / 1000),
    }
    submitMutation.mutate(payload)
  }

  // "Exit & Void" — actually void the attempt server-side (previously the
  // dialog promised voiding but just navigated away, leaving the attempt
  // in-progress and discarding all recorded violations).
  const [voiding, setVoiding] = React.useState(false)
  const handleExitVoid = async () => {
    setVoiding(true)
    try {
      await api(`/api/exams/${startData.exam.id}/proctor-log`, {
        method: "POST",
        body: JSON.stringify({ attemptId: startData.attempt.id, action: "void", reason: "Exited via Exit & Void" }),
      })
      toast.info("Your attempt has been voided.")
    } catch {
      toast.error("Could not void the attempt on the server — abandoning anyway.")
    }
    setVoiding(false)
    onExit()
  }

  // Auto-submit when time runs out
  React.useEffect(() => {
    if (remainingSec <= 0 && !showSubmitDialog) {
      toast.warning("Time's up - auto-submitting your exam.")
      handleSubmit(true)
    }
  }, [remainingSec])

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches((n) => n + 1)
        addProctorFlag({
          type: "tab_switch",
          detail: "Tab/window lost focus during exam",
        })
        toast.error("Proctoring flag: tab switch detected.")
      }
    }
    const handleBlur = () => {
      setWindowBlurs((n) => n + 1)
      addProctorFlag({
        type: "window_blur",
        detail: "Window blur event",
      })
    }
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      if (!fs) {
        addProctorFlag({
          type: "fullscreen_exit",
          detail: "Exited fullscreen mode during exam",
        })
        toast.error("Proctoring flag: you exited fullscreen.")
      }
    }
    // Copy / paste / cut — the classic answer-sharing vectors. The live
    // runner previously had NO detectors for these, so violations the
    // student performed were never recorded anywhere.
    const handleCopy = (e: Event) => {
      e.preventDefault()
      addProctorFlag({ type: "copy", detail: "Copy attempt blocked during exam" })
      toast.warning("Proctoring flag: copy is disabled during the exam.")
    }
    const handlePaste = (e: Event) => {
      e.preventDefault()
      addProctorFlag({ type: "paste", detail: "Paste attempt blocked during exam" })
      toast.warning("Proctoring flag: paste is disabled during the exam.")
    }
    const handleContextMenu = (e: Event) => {
      e.preventDefault()
      addProctorFlag({ type: "right_click", detail: "Right-click blocked during exam" })
    }
    // Devtools + clipboard shortcuts. Alt+Tab is reported by the OS as a
    // blur, which the window_blur handler above already covers.
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const isDevtools =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k))
      const isClipboard =
        e.ctrlKey && ["c", "v", "a", "s", "p"].includes(k)
      if (isDevtools) {
        e.preventDefault()
        addProctorFlag({ type: "devtools_attempt", detail: `DevTools shortcut blocked (${e.key})` })
        toast.warning("Proctoring flag: developer tools are disabled during the exam.")
      } else if (isClipboard) {
        e.preventDefault()
        addProctorFlag({ type: "keyboard_violation", detail: `Blocked shortcut: ${e.ctrlKey ? "Ctrl+" : ""}${e.key.toUpperCase()}` })
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("blur", handleBlur)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("copy", handleCopy)
    document.addEventListener("paste", handlePaste)
    document.addEventListener("cut", handleCopy)
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("paste", handlePaste)
      document.removeEventListener("cut", handleCopy)
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [addProctorFlag])

  /* ---------- Enter fullscreen on mount ---------- */
  React.useEffect(() => {
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true)
      }).catch(() => {
        // User denied - keep going but flag (mapped to the ingest route's
        // valid "fullscreen_exit" type; "fullscreen_denied" is not an
        // accepted eventType server-side).
        addProctorFlag({
          type: "fullscreen_exit",
          detail: "User did not enter fullscreen at start",
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- Periodic proctoring reports (counters heartbeat) ---------- */
  React.useEffect(() => {
    const t = setInterval(async () => {
      try {
        await api(`/api/proctoring/${startData.attempt.id}`, {
          method: "POST",
          body: JSON.stringify({
            tabSwitches,
            windowBlurs,
            fullscreenMode: isFullscreen,
          }),
        })
      } catch {}
    }, 30_000)
    return () => clearInterval(t)
  }, [startData.attempt.id, tabSwitches, windowBlurs, isFullscreen])

  /* ---------- Answer helpers ---------- */
  const setMcqAnswer = (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }))
  }
  const toggleMultipleAnswer = (qid: string, idx: number) => {
    setAnswers((a) => {
      const cur: number[] = Array.isArray(a[qid]) ? a[qid] : []
      return {
        ...a,
        [qid]: cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx].sort(),
      }
    })
  }
  const setTrueFalseAnswer = (qid: string, val: "true" | "false") => {
    setAnswers((a) => ({ ...a, [qid]: val }))
  }

  const toggleFlag = (qid: string) => {
    setFlagged((s) => {
      const next = new Set(s)
      if (next.has(qid)) next.delete(qid)
      else next.add(qid)
      return next
    })
  }

  const answeredCount = Object.keys(answers).length
  const totalCount = questions.length

  /* ---------- Render ---------- */
  const q = questions[currentIdx]
  if (!q) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No questions available for this exam.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-violet-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{startData.exam.title}</div>
              <div className="text-[10px] text-muted-foreground font-mono">
                ATTEMPT {startData.attempt.id.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5",
            remainingSec < 60
              ? "border-rose-500/40 bg-rose-500/10"
              : remainingSec < 300
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border/60 bg-card/40"
          )}>
            <Clock className={cn(
              "h-4 w-4",
              remainingSec < 60 ? "text-rose-300" : remainingSec < 300 ? "text-amber-300" : "text-cyan-300"
            )} />
            <span className="font-mono text-sm font-semibold tabular-nums">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
          </div>

          {/* Proctoring indicators */}
          <div className="hidden sm:flex items-center gap-2">
            <ProctorPill
              icon={Camera}
              active
              title="Camera monitoring active"
            />
            <ProctorPill
              icon={isFullscreen ? Maximize2 : AlertCircle}
              active={isFullscreen}
              title={isFullscreen ? "Fullscreen active" : "Fullscreen off"}
            />
            <ProctorPill
              icon={Eye}
              active={tabSwitches === 0}
              danger={tabSwitches > 0}
              title={`${tabSwitches} tab switches`}
              count={tabSwitches}
            />
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowExitDialog(true)}
            className="h-9"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Exit</span>
          </Button>
        </div>
        {/* Timer progress */}
        <div className="h-0.5 bg-border/40">
          <div
            className={cn(
              "h-full transition-all",
              remainingSec < 60 ? "bg-rose-500" : remainingSec < 300 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${Math.max(0, timePct)}%` }}
          />
        </div>
      </header>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-0">
        {/* Question area */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-muted-foreground">
                Question <span className="font-semibold text-foreground">{currentIdx + 1}</span> of {totalCount}
                <span className="ml-2">·</span>
                <span className="ml-2">{answeredCount} answered</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFlag(q.id)}
                className={cn("text-xs", flagged.has(q.id) && "text-amber-300")}
              >
                <Flag className={cn("h-3.5 w-3.5 mr-1", flagged.has(q.id) && "fill-current")} />
                {flagged.has(q.id) ? "Flagged" : "Flag"}
              </Button>
            </div>

            <Card className="p-6 sm:p-8 border-border/60">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline" className="text-[10px] font-mono uppercase">
                  {q.domain}
                </Badge>
                {q.skill && (
                  <Badge variant="outline" className="text-[10px]">
                    {q.skill}
                  </Badge>
                )}
                <Badge variant="outline" className={cn("text-[10px]", DIFFICULTY_COLORS[q.difficulty] ?? "text-muted-foreground")}>
                  {q.difficulty}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {q.type === "truefalse" ? "True/False" : q.type === "multiple" ? "Select all that apply" : "Single choice"}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {q.points} pt
                </Badge>
              </div>

              <h2 className="text-base sm:text-lg font-semibold leading-relaxed">
                {q.question}
              </h2>

              <div className="mt-6">
                {q.type === "multiple" ? (
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => {
                      const selected = Array.isArray(answers[q.id]) && answers[q.id].includes(idx)
                      return (
                        <label
                          key={idx}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                            selected
                              ? "border-violet-500/50 bg-violet-500/10"
                              : "border-border/60 hover:border-border hover:bg-accent/30"
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleMultipleAnswer(q.id, idx)}
                            className="mt-0.5"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : q.type === "truefalse" ? (
                  <RadioGroup
                    value={answers[q.id] ?? ""}
                    onValueChange={(v) => setTrueFalseAnswer(q.id, v as "true" | "false")}
                    className="grid grid-cols-2 gap-3"
                  >
                    {q.options.map((opt, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all",
                          answers[q.id] === opt.toLowerCase()
                            ? "border-violet-500/50 bg-violet-500/10"
                            : "border-border/60 hover:border-border hover:bg-accent/30"
                        )}
                      >
                        <RadioGroupItem value={opt.toLowerCase()} id={`${q.id}-${idx}`} />
                        <Label htmlFor={`${q.id}-${idx}`} className="cursor-pointer text-sm">
                          {opt}
                        </Label>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <RadioGroup
                    value={typeof answers[q.id] === "number" ? String(answers[q.id]) : ""}
                    onValueChange={(v) => setMcqAnswer(q.id, parseInt(v, 10))}
                    className="space-y-2"
                  >
                    {q.options.map((opt, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                          answers[q.id] === idx
                            ? "border-violet-500/50 bg-violet-500/10"
                            : "border-border/60 hover:border-border hover:bg-accent/30"
                        )}
                      >
                        <RadioGroupItem value={String(idx)} id={`${q.id}-${idx}`} className="mt-1" />
                        <div>
                          <Label htmlFor={`${q.id}-${idx}`} className="cursor-pointer text-sm">
                            <span className="font-mono text-[10px] text-muted-foreground mr-2">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                          </Label>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </Card>

            {/* Nav buttons */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {currentIdx < totalCount - 1 ? (
                  <Button
                    onClick={() => setCurrentIdx((i) => Math.min(totalCount - 1, i + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="btn-premium bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Submit Exam
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Navigator sidebar */}
        <aside className="hidden lg:block border-l border-border/60 bg-card/30 p-4">
          <div className="sticky top-20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Question Navigator
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-5">
              {questions.map((qq, i) => {
                const isAnswered = answers[qq.id] !== undefined && answers[qq.id] !== null
                const isFlagged = flagged.has(qq.id)
                const isCurrent = i === currentIdx
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrentIdx(i)}
                    className={cn(
                      "relative h-9 w-full rounded-md text-xs font-mono font-semibold border transition-all",
                      isCurrent
                        ? "border-violet-500 ring-2 ring-violet-500/40 bg-violet-500/15"
                        : isAnswered
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        : "border-border/60 bg-card/40 hover:bg-accent/50"
                    )}
                  >
                    {i + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="space-y-2 text-[10px] text-muted-foreground mb-5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-emerald-500/30 bg-emerald-500/10" />
                Answered ({answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-border/60 bg-card/40" />
                Unanswered ({totalCount - answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                Flagged ({flagged.size})
              </div>
            </div>

            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="w-full btn-premium bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Submit Exam
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile navigator (drawer trigger) */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20">
        <Card className="p-3 border-border/60 bg-background/95 backdrop-blur flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{answeredCount}</span>/{totalCount} answered
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  "h-7 w-7 shrink-0 rounded text-[10px] font-mono font-semibold border",
                  i === currentIdx
                    ? "border-violet-500 bg-violet-500/15 text-violet-300"
                    : answers[qq.id] !== undefined
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-card/40"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Submit dialog — portalled INTO the fullscreen container: browsers
          render the fullscreen element in the top layer, so a body-level
          dialog would be invisible/unclickable during the exam. */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent container={containerRef.current}>
          <DialogHeader>
            <DialogTitle>Submit exam?</DialogTitle>
            <DialogDescription>
              You have answered <strong className="text-foreground">{answeredCount}</strong> of{" "}
              <strong className="text-foreground">{totalCount}</strong> questions.
              {answeredCount < totalCount && (
                <span className="block mt-1 text-amber-300">
                  {totalCount - answeredCount} unanswered questions will be marked incorrect.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Answered</span>
              <span className="font-mono font-semibold text-emerald-300">{answeredCount} / {totalCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Flagged for review</span>
              <span className="font-mono font-semibold text-amber-300">{flagged.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proctoring incidents</span>
              <span className={cn("font-mono font-semibold", serverIncidents + tabSwitches + windowBlurs > 0 ? "text-rose-300" : "text-emerald-300")}>
                {Math.max(serverIncidents, tabSwitches + windowBlurs)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Time remaining</span>
              <span className="font-mono font-semibold text-cyan-300">
                {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSubmitDialog(false)}>
              Keep Working
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitMutation.isPending}
              className="btn-premium bg-emerald-600 hover:bg-emerald-500"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Submit Final
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit dialog — same fullscreen portal container as the submit dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent container={containerRef.current}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Exit exam?
            </DialogTitle>
            <DialogDescription>
              Exiting now will void your in-progress attempt. Your answers will not be saved
              and one attempt slot may be consumed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExitDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExitVoid} disabled={voiding}>
              {voiding ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              Exit & Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProctorPill({
  icon: Icon,
  active,
  danger,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  danger?: boolean
  title: string
  count?: number
}) {
  return (
    <div
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-mono uppercase",
        danger
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
      )}
    >
      <Icon className="h-3 w-3" />
      {typeof count === "number" && count > 0 && (
        <span className="font-bold">{count}</span>
      )}
    </div>
  )
}

/* ============================================================
   Phase 4 - Results
   ============================================================ */

function ExamResults({
  result,
  onRetake,
  onExit,
  onViewCredentials,
}: {
  result: SubmitResponse
  onRetake: () => void
  onExit: () => void
  onViewCredentials: () => void
}) {
  const passed = result.attempt.passed
  const score = result.attempt.score
  const total = result.attempt.totalQuestions
  const correct = result.attempt.correctAnswers
  const voided = result.attempt.status === "voided"
  const [showReview, setShowReview] = React.useState(false)

  // Proctoring report — read back what the server recorded during the
  // attempt so the student sees the same log an administrator would.
  const { data: proctorData } = useQuery<{
    proctoring: { incidentCount: number; flags: { type: string; timestamp?: number; detail?: string }[] }
  }>({
    queryKey: ["proctoring", result.attempt.id],
    queryFn: () => api(`/api/proctoring/${result.attempt.id}`),
    retry: false,
    staleTime: 60_000,
  })
  const proctorFlagsList = proctorData?.proctoring?.flags ?? []
  const incidentCount = proctorData?.proctoring?.incidentCount ?? proctorFlagsList.length

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border p-8 sm:p-12 text-center"
        style={{
          borderColor: passed ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)",
          background: passed
            ? "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(0,0,0,0) 70%)"
            : "linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(0,0,0,0) 70%)",
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className={cn(
            "inline-flex items-center justify-center h-20 w-20 rounded-full mb-4",
            passed ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
          )}
        >
          {passed ? <Trophy className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {voided ? "Attempt Voided" : passed ? "Certified!" : "Not Quite There"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {voided
            ? "This attempt was voided due to proctoring violations or a voluntary exit. It is not scored."
            : passed
              ? `You've earned the ${result.exam.certificationName ?? "GuardianX certification"}.`
              : `You scored ${score}% - passing score is ${result.exam.passingScore}%. Review and try again.`}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className={cn("text-2xl font-bold", passed ? "text-emerald-300" : "text-rose-300")}>
              {score}%
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Score</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="text-2xl font-bold text-cyan-300">
              {correct}/{total}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Correct</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="text-2xl font-bold text-violet-300">
              {result.attempt.timeSpent != null
                ? `${Math.floor(result.attempt.timeSpent / 60)}m`
                : "-"}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Time</div>
          </div>
        </div>
      </motion.div>

      {/* Proctoring summary — server-side record of every violation */}
      <Card className={cn("mt-5 p-6 border", incidentCount > 0 ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5")}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className={cn("h-4 w-4", incidentCount > 0 ? "text-rose-300" : "text-emerald-300")} />
            Proctoring Report
          </h2>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-mono",
              incidentCount > 0 ? "text-rose-300 border-rose-500/40" : "text-emerald-300 border-emerald-500/40",
            )}
          >
            {incidentCount} INCIDENT{incidentCount === 1 ? "" : "S"}
          </Badge>
        </div>
        {proctorFlagsList.length === 0 ? (
          <p className="text-xs text-muted-foreground">No violations were recorded during this attempt.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {proctorFlagsList.slice().reverse().map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs rounded-md border border-border/50 bg-card/40 px-2.5 py-1.5">
                <span className={cn(
                  "font-mono text-[10px] uppercase tracking-wider shrink-0",
                  f.type === "tab_switch" || f.type === "fullscreen_exit" ? "text-rose-300" : "text-amber-300",
                )}>
                  {f.type.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground truncate">{f.detail || ""}</span>
                {f.timestamp && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono shrink-0">
                    {new Date(f.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Credential */}
      {result.credential && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5"
        >
          <Card className="p-6 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                <BadgeCheck className="h-7 w-7 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold">Credential Issued</h3>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-300 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    VALID
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  ID: <span className="text-foreground font-semibold">{result.credential.credentialId}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Issued to <span className="text-foreground font-medium">{result.credential.candidateName}</span> · Score {result.credential.score}%
                </div>
                {result.credential.expiryDate && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Expires {new Date(result.credential.expiryDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={onViewCredentials} className="btn-premium bg-violet-600 hover:bg-violet-500">
                <FileBadge className="h-3.5 w-3.5 mr-1" />
                View My Credentials
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (result.credential?.verificationUrl) {
                    const url = `${window.location.origin}${result.credential.verificationUrl}`
                    navigator.clipboard.writeText(url)
                    toast.success("Verification URL copied to clipboard.")
                  }
                }}
              >
                <Hash className="h-3.5 w-3.5 mr-1" />
                Copy Verification URL
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Domain breakdown */}
      <Card className="mt-5 p-6 border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Domain Breakdown</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowReview((v) => !v)}>
            <ListChecks className="h-3.5 w-3.5 mr-1" />
            {showReview ? "Hide" : "Show"} Answer Review
          </Button>
        </div>
        <div className="space-y-3">
          {result.grading.domainBreakdown.map((d) => (
            <div key={d.domain}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{d.domain}</span>
                <span className="font-mono text-muted-foreground">
                  {d.correct}/{d.total} · {d.percentage}%
                </span>
              </div>
              <Progress
                value={d.percentage}
                className={cn(
                  "h-2",
                  d.percentage >= 70 ? "[&>div]:bg-emerald-500" : d.percentage >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-rose-500"
                )}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Answer review */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 space-y-3"
          >
            {result.answers.map((a, i) => (
              <Card key={a.questionId} className="p-4 border-border/60">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-7 w-7 shrink-0 rounded-lg flex items-center justify-center",
                    a.correct ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                  )}>
                    {a.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">Q{i + 1}</span>
                      <Badge variant="outline" className="text-[10px]">{a.domain}</Badge>
                      {a.skill && <Badge variant="outline" className="text-[10px]">{a.skill}</Badge>}
                      <Badge variant="outline" className="text-[10px] font-mono">{a.earned}/{a.points} pt</Badge>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{a.question}</p>
                    <div className="mt-2 space-y-1">
                      {a.options.map((opt, idx) => {
                        const isCorrect = Array.isArray(a.correctAnswer)
                          ? a.correctAnswer.includes(idx)
                          : a.correctAnswer === idx
                        const isSelected = Array.isArray(a.selected)
                          ? a.selected.includes(idx)
                          : a.selected === idx
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center gap-2 rounded px-2 py-1.5 text-xs",
                              isCorrect
                                ? "bg-emerald-500/10 text-emerald-200"
                                : isSelected
                                ? "bg-rose-500/10 text-rose-200"
                                : "text-muted-foreground"
                            )}
                          >
                            <span className="font-mono text-[10px] w-5">{String.fromCharCode(65 + idx)}</span>
                            <span>{opt}</span>
                            {isCorrect && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                            {isSelected && !isCorrect && <XCircle className="h-3 w-3 ml-auto" />}
                          </div>
                        )
                      })}
                    </div>
                    {a.explanation && (
                      <div className="mt-2 rounded border border-border/40 bg-card/30 p-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Explanation: </span>
                        {a.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onExit}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Exams
        </Button>
        {!passed && (
          <Button onClick={onRetake} className="btn-premium bg-violet-600 hover:bg-violet-500">
            <ShieldCheck className="h-4 w-4 mr-1" />
            Retake Exam
          </Button>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   EmptyState
   ============================================================ */
function EmptyState({
  title,
  description,
  onBack,
}: {
  title: string
  description: string
  onBack: () => void
}) {
  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-500/10 mb-4">
        <AlertCircle className="h-7 w-7 text-violet-300" />
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button onClick={onBack} variant="outline" className="mt-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
    </div>
  )
}
