"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { useCurrency as useCurrencyHook } from "@/hooks/use-currency"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CheckCircle2, XCircle, Trophy, Loader2, ArrowRight, ArrowLeft,
  ShieldCheck, Target, Brain, Award, FileBadge, Sparkles,
  RotateCcw, AlertCircle, Share2, Download, Mail,
} from "lucide-react"

interface Attempt {
  id: string
  difficulty: string
  score: number
  totalQuestions: number
  percentage: number
  passed: boolean
  domainScores: Record<string, { correct: number; total: number }>
  completedAt: string | null
  certificateId: string | null
  guestName: string | null
  guestEmail: string | null
}

const DIFFICULTY_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  Easy: { icon: ShieldCheck, color: "text-emerald-300", bg: "bg-emerald-500/10", label: "Foundational" },
  Hard: { icon: Target, color: "text-violet-300", bg: "bg-violet-500/10", label: "Intermediate" },
  Advanced: { icon: Brain, color: "text-amber-300", bg: "bg-amber-500/10", label: "Expert" },
}

const DOMAINS = ["Phishing", "Passwords", "Social Engineering", "Web Safety", "Mobile Security", "Data Privacy", "Malware", "Wi-Fi Safety"]

export function CyberQuizResultsView() {
  const { view, navigate } = useAppStore()
  const { formatPrice, isINR } = useCurrencyHook()
  const attemptId = (view as any)?.attemptId as string
  const resultToken = (view as any)?.resultToken as string | undefined

  const { data, isLoading, error } = useQuery<{ attempt: Attempt }>({
    queryKey: ["cyber-quiz-attempt", attemptId, resultToken],
    queryFn: () => api(`/api/cyber-quiz/attempt/${attemptId}${resultToken ? `?t=${encodeURIComponent(resultToken)}` : ""}`),
    enabled: !!attemptId,
  })

  const attempt = data?.attempt
  const meta = attempt ? DIFFICULTY_META[attempt.difficulty] : DIFFICULTY_META.Easy
  const DiffIcon = meta?.icon

  if (isLoading) {
    return (
      <main className="relative min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </main>
    )
  }

  if (error || !attempt) {
    return (
      <main className="relative min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Couldn't load your results</p>
          <Button onClick={() => navigate({ name: "cyber-quiz" })} variant="outline" size="sm" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to quiz
          </Button>
        </div>
      </main>
    )
  }

  // If already has a certificate → show the certificate
  if (attempt.certificateId) {
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Certificate already issued!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your Cyber Security Foundation certificate is ready.
            </p>
            <Button
              onClick={() => navigate({ name: "cyber-quiz-certificate", credentialId: attempt.certificateId } as any)}
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            >
              <Award className="h-4 w-4 mr-2" /> View certificate <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </main>
    )
  }

  // If failed → show fail state + retake CTA
  if (!attempt.passed) {
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 mb-4">
              <XCircle className="h-8 w-8 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not this time!</h1>
            <p className="text-sm text-muted-foreground">
              You needed 50% to pass. You scored <span className="font-semibold text-foreground">{attempt.percentage}%</span> ({attempt.score}/{attempt.totalQuestions}).
              Don't worry — retake is free and questions are randomized each time.
            </p>
          </motion.div>

          <DomainBreakdown attempt={attempt} />

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate({ name: "cyber-quiz-runner", difficulty: attempt.difficulty } as any)} size="lg" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
              <RotateCcw className="h-4 w-4 mr-2" /> Retake quiz
            </Button>
            <Button onClick={() => navigate({ name: "cyber-quiz" })} variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to landing
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Passed → show results + pay wall
  return <PassedResultsView attempt={attempt} attemptId={attemptId} />
}

// ============================================================
// Passed results + payment view
// ============================================================
function PassedResultsView({ attempt, attemptId }: { attempt: Attempt; attemptId: string }) {
  const { navigate } = useAppStore()
  const { formatPrice } = useCurrencyHook()
  const meta = DIFFICULTY_META[attempt.difficulty]
  const DiffIcon = meta.icon

  const [form, setForm] = React.useState({
    name: attempt.guestName || "",
    email: attempt.guestEmail || "",
    phone: "",
  })
  const [paymentStep, setPaymentStep] = React.useState<"form" | "checkout" | "verifying" | "done" | "error">("form")
  const [orderId, setOrderId] = React.useState<string | null>(null)
  const [razorpayDetails, setRazorpayDetails] = React.useState<any>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [credentialId, setCredentialId] = React.useState<string | null>(null)

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api(`/api/cyber-quiz/checkout`, {
        method: "POST",
        body: JSON.stringify({
          attemptId,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
        }),
      }),
    onSuccess: (data: any) => {
      setOrderId(data.orderId)
      setRazorpayDetails(data)
      setPaymentStep("checkout")
      // In mock mode, we skip the Razorpay popup and directly verify with mock values.
      // In production (when RAZORPAY_KEY_ID + SECRET are set), load the Razorpay SDK
      // and open the checkout modal here.
      if (data.mock) {
        // Auto-verify with mock payment IDs after a short delay (simulates user paying)
        setTimeout(() => verifyPayment(data.orderId, "pay_mock_" + Date.now(), "mock_sig_" + Date.now()), 1500)
      } else {
        // Real Razorpay — load script + open modal
        loadRazorpayScript().then(() => {
          openRazorpayModal(data)
        }).catch(() => {
          setErrorMsg("Failed to load Razorpay. Please try again.")
          setPaymentStep("error")
        })
      }
    },
    onError: (e: any) => {
      setErrorMsg(e?.message || "Checkout failed")
      setPaymentStep("error")
    },
  })

  const verifyPayment = async (oid: string, paymentId: string, signature: string) => {
    setPaymentStep("verifying")
    try {
      const result: any = await api(`/api/cyber-quiz/verify-payment`, {
        method: "POST",
        body: JSON.stringify({
          orderId: oid,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        }),
      })
      if (result?.certificate?.credentialId) {
        setCredentialId(result.certificate.credentialId)
        setPaymentStep("done")
      } else {
        setErrorMsg("Verification succeeded but no certificate was returned")
        setPaymentStep("error")
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Payment verification failed")
      setPaymentStep("error")
    }
  }

  const loadRazorpayScript = () => {
    return new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("razorpay-script")
      if (existing) { resolve(); return }
      const script = document.createElement("script")
      script.id = "razorpay-script"
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
      document.body.appendChild(script)
    })
  }

  const openRazorpayModal = (data: any) => {
    // @ts-ignore — Razorpay is loaded via script tag
    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount * 100, // paise
      currency: data.currency,
      name: "GuardianX Academy",
      description: "Cyber Security Foundation Certificate",
      order_id: data.razorpayOrderId,
      handler: (response: any) => {
        verifyPayment(data.orderId, response.razorpay_payment_id, response.razorpay_signature)
      },
      prefill: {
        name: form.name,
        email: form.email,
        contact: form.phone || undefined,
      },
      theme: { color: "#7c3aed" },
      modal: {
        ondismiss: () => {
          setPaymentStep("form")
          setErrorMsg("Payment cancelled. You can try again.")
        },
      },
    })
    rzp.open()
  }

  // ---- Done state ----
  if (paymentStep === "done" && credentialId) {
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4 shadow-[0_0_30px_-8px] shadow-emerald-500/40">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Certificate issued!</h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Your Cyber Security Foundation certificate is ready. View it, share it, download the PDF — or open your progress report.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => navigate({ name: "cyber-quiz-certificate", credentialId } as any)} size="lg" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                <Award className="h-4 w-4 mr-2" /> View certificate <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={() => navigate({ name: "cyber-quiz-progress", credentialId } as any)} size="lg" variant="outline" className="border-violet-500/30 hover:bg-violet-500/10">
                <FileBadge className="h-4 w-4 mr-2" /> Progress report
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    )
  }

  // ---- Form / checkout / verifying / error ----
  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Pass banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 mb-4 shadow-[0_0_30px_-8px] shadow-emerald-500/40">
            <Trophy className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            You passed! <span className="text-gradient-premium">{attempt.percentage}%</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {attempt.score}/{attempt.totalQuestions} correct · {attempt.difficulty} difficulty
          </p>
        </motion.div>

        {/* Score breakdown */}
        <DomainBreakdown attempt={attempt} />

        {/* Pay wall */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 rounded-xl border border-violet-500/40 bg-violet-500/[0.03] p-5 lg:p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h3 className="text-lg font-semibold">Unlock your certificate + progress report</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Pay {formatPrice(199)} to instantly generate your verifiable Cyber Security Foundation certificate + the detailed progress report. Shareable to LinkedIn + WhatsApp, downloadable as PDF.
          </p>

          {/* What's included */}
          <div className="grid sm:grid-cols-2 gap-2 mb-5">
            {[
              { icon: Award, label: "Verifiable certificate" },
              { icon: FileBadge, label: "Progress report card" },
              { icon: Share2, label: "LinkedIn + WhatsApp share" },
              { icon: Download, label: "PDF download" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-violet-300" />
                  {item.label}
                </div>
              )
            })}
          </div>

          {paymentStep === "form" && (
            <form
              onSubmit={(e) => { e.preventDefault(); checkoutMutation.mutate() }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium mb-1.5 block">Full name <span className="text-rose-400">*</span></Label>
                  <Input id="name" required minLength={2} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="As you want it on the certificate" className="bg-background/50" />
                  <p className="text-[10px] text-muted-foreground mt-1">This will appear on your certificate</p>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email <span className="text-rose-400">*</span></Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" className="bg-background/50" />
                  <p className="text-[10px] text-muted-foreground mt-1">Certificate + verification link sent here</p>
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">Phone (optional)</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="9876543210" className="bg-background/50" />
              </div>

              {checkoutMutation.isError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 p-3 text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{(checkoutMutation.error as any)?.message || "Checkout failed. Please try again."}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-2xl font-bold">{formatPrice(199)}</div>
                  <div className="text-[10px] text-muted-foreground">One-time · lifetime certificate</div>
                </div>
                <Button type="submit" disabled={checkoutMutation.isPending} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                  {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Pay {formatPrice(199)} + get certificate
                </Button>
              </div>
            </form>
          )}

          {paymentStep === "checkout" && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Opening secure payment...</p>
              <p className="text-[10px] text-muted-foreground mt-1">Mock mode — auto-verifying in 1 second</p>
            </div>
          )}

          {paymentStep === "verifying" && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Verifying payment + generating certificate...</p>
            </div>
          )}

          {paymentStep === "error" && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Payment failed</p>
              <p className="text-xs text-muted-foreground mb-4">{errorMsg}</p>
              <Button onClick={() => setPaymentStep("form")} variant="outline" size="sm">Try again</Button>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}

// ============================================================
// Domain breakdown component
// ============================================================
function DomainBreakdown({ attempt }: { attempt: Attempt }) {
  const meta = DIFFICULTY_META[attempt.difficulty]
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Domain breakdown</h3>
        <Badge variant="outline" className={cn("text-[10px]", meta.color, "border-current")}>
          {attempt.difficulty} mode
        </Badge>
      </div>
      <div className="space-y-2.5">
        {DOMAINS.map((domain) => {
          const score = attempt.domainScores[domain]
          if (!score || score.total === 0) return null
          const pct = Math.round((score.correct / score.total) * 100)
          const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
          return (
            <div key={domain} className="flex items-center gap-3">
              <div className="w-32 sm:w-40 text-xs text-muted-foreground shrink-0">{domain}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs font-mono tabular-nums text-muted-foreground w-16 text-right">
                {score.correct}/{score.total}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
