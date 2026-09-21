"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { AnimatedLogoMark } from "@/components/platform/animated-logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, ArrowRight,
  Check, X, Calendar, Hash, Award, TrendingUp, Lock,
  User, BookOpen, Sparkles, Fingerprint, AlertTriangle,
  Search, Copy, BadgeCheck, FileCheck2, GraduationCap,
  ScanLine, Clock, ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

/** Public-facing credential shape returned by /api/credentials/verify. */
type VerifiedCredential = {
  credentialId: string
  candidateName: string
  certificationName: string
  certificationSlug?: string
  certificationLevel?: string
  score: number
  totalQuestions?: number
  percentage?: number
  issueDate: string
  expiryDate?: string | null
  status: string
  skillsAssessed?: string[]
  examType?: string
  verificationHash?: string
  verificationUrl?: string | null
}

type VerifyResponse = {
  valid: boolean
  credential: VerifiedCredential | null
  error?: string
}

/**
 * VerifyView - public certificate verification page (master-prompt §44).
 *
 * Reachable at `/#/verify/<credentialId>` or `/#/verify?credentialId=<id>`.
 * Also reachable with no id (`/#/verify`) - in that case the user is
 * prompted to paste a credential ID into a search box.
 *
 * Fetches from `/api/credentials/verify/[credentialId]` (public, no auth)
 * and renders one of five states:
 *   1. EMPTY - prompt to enter a credential ID
 *   2. LOADING - animated verifying state
 *   3. VERIFIED ✓ - stunning certificate-preview card
 *   4. REVOKED / EXPIRED - amber/rose card with explanation
 *   5. NOT FOUND - clean error message with retry hint
 *
 * Styled with the premium dark-tech aesthetic (card-premium, glow,
 * mono-caps micro-labels, text-gradient-premium accents, violet palette).
 */
export function VerifyView() {
  const { view, navigate } = useAppStore()
  const initialId = view.name === "verify" ? view.credentialId ?? "" : ""
  const [manualId, setManualId] = React.useState(initialId)
  const [submittedId, setSubmittedId] = React.useState(initialId)

  // If the user navigated here via footer/credentials link with an id in
  // the URL hash, kick off verification immediately. Otherwise stay empty.
  const activeId = submittedId || initialId

  const { data, isLoading, isError } = useQuery<VerifyResponse | null>({
    queryKey: ["verify-credential", activeId],
    queryFn: async (): Promise<VerifyResponse | null> => {
      if (!activeId) return null
      const res = await fetch(`/api/credentials/verify/${encodeURIComponent(activeId)}`)
      // Always 200 (even on not-found / revoked) - the API never 4xx's
      // for non-existent ids; it returns { valid: false, credential: null }
      if (!res.ok) {
        throw new Error("Verification service unavailable")
      }
      return (await res.json()) as VerifyResponse
    },
    enabled: !!activeId,
    retry: false,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualId.trim()
    if (!trimmed) return
    setSubmittedId(trimmed)
    // Update the URL hash so the verification result is shareable.
    navigate({ name: "verify", credentialId: trimmed })
  }

  function copyShareUrl() {
    if (!activeId) return
    // Canonical path URL (legacy /#/verify/… hash links still redirect, but
    // new shares should be clean, crawlable real paths).
    const url = `${window.location.origin}/verify/${encodeURIComponent(activeId)}`
    navigator.clipboard?.writeText(url)
    toast.success("Verification URL copied")
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Atmospheric background layers ── */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="glow-orb bg-violet-600/20 w-[520px] h-[520px] -top-32 left-1/2 -translate-x-1/2" />
      <div className="glow-orb bg-fuchsia-500/10 w-[380px] h-[380px] top-1/3 -left-24" />
      <div className="glow-orb bg-cyan-500/10 w-[380px] h-[380px] top-1/4 -right-24" />
      <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />

      {/* ── HERO ── */}
      <section className="relative pt-14 pb-8 lg:pt-20 lg:pb-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Logo + brand */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <AnimatedLogoMark size={42} />
              <span className="text-lg font-bold tracking-tight">
                Guardian<span className="text-violet-400">X</span>
              </span>
            </div>

            <Badge
              variant="outline"
              className="mb-5 border-violet-500/30 text-violet-300 bg-violet-500/10 backdrop-blur-sm"
            >
              <Fingerprint className="h-3 w-3 mr-1.5" /> GUARDIANX CREDENTIAL VERIFIER
            </Badge>

            <h1 className="text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1.02] tracking-[-0.03em] mb-5 text-balance">
              Verify a{" "}
              <span className="text-gradient-premium">credential.</span>
            </h1>

            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              GuardianX credentials are publicly verifiable. Enter a credential ID to
              confirm its authenticity, candidate, and current status - no login required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SEARCH BAR ── */}
      <section className="relative pb-2">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative group"
          >
            {/* glow ring on focus */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/40 via-fuchsia-500/30 to-cyan-500/40 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your credential ID (e.g. GX-QUIZ-2026-A1B2)"
                  className="pl-10 h-12 text-base font-mono bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !manualId.trim()}
                className="btn-premium h-12 px-6 bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                    Verifying
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
          </motion.form>

          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-mono text-muted-foreground/70 tracking-[0.15em]">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> PUBLIC</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>NO LOGIN REQUIRED</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> CRYPTO-SIGNED</span>
          </div>
        </div>
      </section>

      {/* ── RESULT ── */}
      <section className="relative py-8 lg:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {!activeId && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState />
              </motion.div>
            )}
            {activeId && isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoadingState id={activeId} />
              </motion.div>
            )}
            {activeId && !isLoading && !isError && data && data.valid && data.credential && (
              <motion.div key="verified" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <VerifiedCard cred={data.credential} onShare={copyShareUrl} />
              </motion.div>
            )}
            {activeId && !isLoading && !isError && data && !data.valid && data.credential && (
              <motion.div key="revoked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RevokedCard cred={data.credential} />
              </motion.div>
            )}
            {activeId && !isLoading && !isError && data && !data.valid && !data.credential && (
              <motion.div key="notfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <NotFoundCard id={activeId} />
              </motion.div>
            )}
            {activeId && !isLoading && isError && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorCard />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── BACK NAV ── */}
      <section className="relative py-8 border-t border-border/40 mt-4">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: "credentials" })}
            className="text-muted-foreground hover:text-violet-300"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Credentials
          </Button>
        </div>
      </section>
    </div>
  )
}

/* ───────────────────────────── empty state ──────────────────────────── */

function EmptyState() {
  const examples = ["GX-CERT-2025-XXXX", "GX-QUIZ-2026-A1B2"]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium rounded-2xl p-10 text-center"
    >
      {/* animated emblem */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute w-24 h-24"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_4px_rgba(167,139,250,0.6)]" />
        </motion.div>
        <div className="relative inline-flex p-5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-300">
          <Fingerprint className="h-10 w-10" />
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Ready to verify</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        Paste a GuardianX credential ID above and hit{" "}
        <span className="text-violet-300 font-medium">Verify</span>. The credential
        holder can find their ID on their certificate or in the Credentials dashboard.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground/70 tracking-[0.2em]">FORMATS:</span>
        {examples.map((ex) => (
          <span
            key={ex}
            className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-muted-foreground"
          >
            {ex}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────── loading state ─────────────────────────── */

function LoadingState({ id }: { id: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="card-premium rounded-2xl p-10 text-center"
    >
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full animate-pulse" />
        <div className="relative h-14 w-14 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
        <ScanLine className="absolute h-5 w-5 text-violet-300" />
      </div>
      <p className="text-sm font-mono text-muted-foreground tracking-wider">
        VERIFYING <span className="text-foreground">{id}</span>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/60 font-mono tracking-[0.2em]">
        CROSS-REFERENCING LEDGER · CHECKING SIGNATURE
      </p>
    </motion.div>
  )
}

/* ─────────────────────────── verified card ─────────────────────────── */

function VerifiedCard({
  cred,
  onShare,
}: {
  cred: VerifiedCredential
  onShare: () => void
}) {
  // For quiz certs, prefer percentage. For guardian certs, score is already a percentage.
  const displayPct = cred.percentage != null ? cred.percentage : cred.score
  const pct = Math.max(0, Math.min(100, displayPct))
  const isQuiz = cred.examType === "online-quiz" || cred.credentialId.startsWith("GX-QUIZ-")

  // Score band color
  const band =
    pct >= 90
      ? { label: "DISTINCTION", color: "text-emerald-300", ring: "#10b981" }
      : pct >= 75
      ? { label: "MERIT", color: "text-cyan-300", ring: "#22d3ee" }
      : pct >= 60
      ? { label: "PASS", color: "text-violet-300", ring: "#a78bfa" }
      : { label: "PASS", color: "text-amber-300", ring: "#fbbf24" }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-card/80 backdrop-blur-xl shadow-2xl shadow-emerald-900/20"
    >
      {/* ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-violet-500/4 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />

      {/* ─── Top brand band ─── */}
      <div className="relative px-6 py-4 sm:px-8 border-b border-border/50 bg-gradient-to-r from-violet-600/10 via-card/40 to-emerald-500/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AnimatedLogoMark size={28} />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">
                Guardian<span className="text-violet-400">X</span>
              </p>
              <p className="text-[9px] font-mono text-muted-foreground tracking-[0.25em]">
                CYBER SECURITY ACADEMY
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/15">
            <Check className="h-3 w-3 mr-1" /> VERIFIED
          </Badge>
        </div>
      </div>

      {/* ─── Certificate hero ─── */}
      <div className="relative px-6 sm:px-8 pt-7 pb-6">
        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-2 flex items-center gap-1.5">
          <Award className="h-3 w-3" /> CERTIFICATE OF ACHIEVEMENT
        </p>

        {/* candidate name (large) */}
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-1.5 text-gradient-premium">
          {cred.candidateName}
        </h2>

        <p className="text-sm text-muted-foreground mb-5">
          has successfully completed the requirements for
        </p>

        {/* certification name */}
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="h-4 w-4 text-violet-300 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-foreground">
            {cred.certificationName}
          </h3>
        </div>
        {(cred.certificationLevel || cred.examType) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {cred.certificationLevel && (
              <Badge variant="outline" className="border-violet-500/30 text-violet-300 bg-violet-500/5">
                <Sparkles className="h-3 w-3 mr-1" /> {cred.certificationLevel}
              </Badge>
            )}
            {cred.examType && (
              <Badge variant="outline" className="border-border/60 text-muted-foreground bg-muted/20">
                {cred.examType === "online-quiz"
                  ? "Online Quiz"
                  : cred.examType === "proctored"
                  ? "Proctored Exam"
                  : cred.examType === "course-completion"
                  ? "Course Completion"
                  : cred.examType}
              </Badge>
            )}
          </div>
        )}

        {/* ─── Score + key facts grid ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 sm:gap-6 items-center mb-6">
          {/* Score ring */}
          <div className="flex justify-center sm:justify-start">
            <ScoreRing pct={pct} color={band.ring} />
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-2 gap-2.5">
            <Fact
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="SCORE"
              value={
                isQuiz && cred.totalQuestions
                  ? `${cred.score} / ${cred.totalQuestions}`
                  : `${cred.score}%`
              }
              accent="text-emerald-300"
            />
            <Fact
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="GRADE"
              value={band.label}
              accent={band.color}
            />
            <Fact
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="ISSUED"
              value={formatDate(cred.issueDate)}
            />
            <Fact
              icon={<Lock className="h-3.5 w-3.5" />}
              label="STATUS"
              value={<span className="capitalize text-emerald-300">{cred.status}</span>}
            />
          </div>
        </div>

        {/* Credential ID - full width, monospace */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 mb-5">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] mb-1 flex items-center gap-1.5">
            <Hash className="h-3 w-3" /> CREDENTIAL ID
          </p>
          <p className="text-sm font-mono text-foreground break-all select-all">{cred.credentialId}</p>
        </div>

        {/* Skills assessed (guardian certs) */}
        {cred.skillsAssessed && cred.skillsAssessed.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" /> SKILLS ASSESSED
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cred.skillsAssessed.map((s: string) => (
                <span
                  key={s}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-200 border border-emerald-500/25"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Verification hash */}
        {cred.verificationHash && (
          <div className="mb-5">
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] mb-1 flex items-center gap-1.5">
              <Fingerprint className="h-3 w-3" /> VERIFICATION HASH
            </p>
            <p className="text-[11px] font-mono text-muted-foreground/80 break-all leading-relaxed">
              {cred.verificationHash}
            </p>
          </div>
        )}
      </div>

      {/* ─── Verified-by seal ─── */}
      <div className="relative px-6 sm:px-8 py-4 border-t border-emerald-500/20 bg-gradient-to-r from-emerald-500/8 via-transparent to-violet-500/8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="relative inline-flex p-2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <BadgeCheck className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-emerald-200">Verified by GuardianX</p>
              <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                {cred.expiryDate
                  ? `VALID UNTIL ${formatDate(cred.expiryDate).toUpperCase()}`
                  : "LIFETIME VALIDITY"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70 tracking-wider">
            <Clock className="h-3 w-3" />
            VERIFIED {new Date().toLocaleDateString().toUpperCase()}
          </div>
        </div>
      </div>

      {/* ─── Actions ─── */}
      <div className="px-6 sm:px-8 py-4 border-t border-border/50 bg-card/40">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onShare} className="flex-1 min-w-[140px]">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy share URL
          </Button>
          {cred.verificationUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(cred.verificationUrl!, "_blank")}
              className="flex-1 min-w-[140px]"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open certificate
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => (window.location.href = `${window.location.origin}/credentials`)}
            className="flex-1 min-w-[140px] bg-violet-600 hover:bg-violet-500"
          >
            <Award className="h-3.5 w-3.5 mr-1.5" /> Browse Credentials
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/* ────────────────────── revoked / suspended / expired ──────────────── */

function RevokedCard({ cred }: { cred: VerifiedCredential }) {
  const isRevoked = cred.status === "revoked"
  const isSuspended = cred.status === "suspended"

  const palette = isRevoked
    ? { ring: "border-rose-500/30", tint: "bg-rose-500/15 text-rose-300", text: "text-rose-300", Icon: ShieldX, label: "REVOKED", glow: "bg-rose-500/15" }
    : isSuspended
    ? { ring: "border-amber-500/30", tint: "bg-amber-500/15 text-amber-300", text: "text-amber-300", Icon: ShieldAlert, label: "SUSPENDED", glow: "bg-amber-500/15" }
    : { ring: "border-amber-500/30", tint: "bg-amber-500/15 text-amber-300", text: "text-amber-300", Icon: AlertTriangle, label: "EXPIRED", glow: "bg-amber-500/15" }

  const Icon = palette.Icon
  const explanation = isRevoked
    ? "This credential has been revoked by GuardianX. It is no longer valid and should not be accepted as proof of the listed skills."
    : isSuspended
    ? "This credential is currently suspended pending review. Please contact the credential holder or GuardianX support for clarification."
    : "This credential has passed its expiry date. The candidate may need to re-certify to maintain an active status."

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-2xl overflow-hidden border bg-card/80 backdrop-blur-xl shadow-2xl",
        palette.ring
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent pointer-events-none" />
      <div className={cn("absolute -top-24 -right-24 w-72 h-72 blur-3xl rounded-full pointer-events-none", palette.glow)} />

      {/* Top brand band */}
      <div className={cn("relative px-6 sm:px-8 py-4 border-b border-border/50 bg-gradient-to-r from-card/60 via-card/40 to-transparent")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AnimatedLogoMark size={28} />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">
                Guardian<span className="text-violet-400">X</span>
              </p>
              <p className="text-[9px] font-mono text-muted-foreground tracking-[0.25em]">
                CYBER SECURITY ACADEMY
              </p>
            </div>
          </div>
          <Badge className={cn("border", palette.tint, palette.ring, "hover:opacity-100")}>
            <X className="h-3 w-3 mr-1" /> {palette.label}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="relative px-6 sm:px-8 pt-7 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("inline-flex p-3 rounded-xl border", palette.tint, palette.ring)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className={cn("text-[10px] font-mono tracking-[0.3em] mb-1", palette.text)}>
              VERIFICATION RESULT
            </p>
            <h2 className={cn("text-2xl font-bold tracking-tight", palette.text)}>
              Credential {palette.label.toLowerCase()}
            </h2>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{explanation}</p>

        <div className="grid sm:grid-cols-2 gap-2.5 text-sm mb-5">
          <Fact icon={<User className="h-3.5 w-3.5" />} label="CANDIDATE" value={cred.candidateName} />
          <Fact icon={<BookOpen className="h-3.5 w-3.5" />} label="CERTIFICATION" value={cred.certificationName} />
          <Fact icon={<TrendingUp className="h-3.5 w-3.5" />} label="SCORE" value={`${cred.score}${cred.percentage != null ? "%" : cred.totalQuestions ? ` / ${cred.totalQuestions}` : "%"}`} />
          <Fact icon={<Calendar className="h-3.5 w-3.5" />} label="ISSUED" value={formatDate(cred.issueDate)} />
          {cred.expiryDate && (
            <Fact icon={<Calendar className="h-3.5 w-3.5" />} label="EXPIRES" value={formatDate(cred.expiryDate)} />
          )}
          <Fact
            icon={<Lock className="h-3.5 w-3.5" />}
            label="STATUS"
            value={<span className={cn("font-semibold capitalize", palette.text)}>{cred.status}</span>}
          />
        </div>

        {/* Credential ID */}
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 mb-5">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] mb-1 flex items-center gap-1.5">
            <Hash className="h-3 w-3" /> CREDENTIAL ID
          </p>
          <p className="text-sm font-mono text-foreground break-all select-all">{cred.credentialId}</p>
        </div>

        <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground">
          <p>
            If you believe this result is in error, please contact{" "}
            <a href="mailto:academy@guardianx.in" className="text-violet-300 hover:underline">
              academy@guardianx.in
            </a>
            .
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────── not found card ────────────────────────── */

function NotFoundCard({ id }: { id: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl overflow-hidden border border-rose-500/30 bg-card/80 backdrop-blur-xl shadow-2xl shadow-rose-900/10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-500/15 blur-3xl rounded-full pointer-events-none" />

      <div className="relative px-6 sm:px-8 pt-9 pb-8 text-center">
        {/* icon */}
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="absolute inset-0 bg-rose-500/25 blur-2xl rounded-full" />
          <div className="relative inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <ShieldX className="h-9 w-9" />
          </div>
        </div>

        <p className="text-[10px] font-mono text-rose-400 tracking-[0.3em] mb-2">
          VERIFICATION RESULT
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-rose-300 tracking-tight mb-2">
          Credential not found
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
          No GuardianX credential matches this ID. <span className="text-foreground">Check the ID and try again</span> - 
          it may have been mistyped, fabricated, or never issued.
        </p>

        {/* looked-up id */}
        <div className="inline-block rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 mb-6">
          <p className="text-[10px] font-mono text-rose-400 tracking-[0.25em] mb-1">
            LOOKED UP
          </p>
          <p className="text-sm font-mono text-foreground break-all">{id}</p>
        </div>

        {/* format hint */}
        <div className="pt-5 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-3">
            GuardianX credential IDs follow one of these formats:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["GX-CERT-YYYY-XXXX", "GX-QUIZ-YYYY-XXXX"].map((fmt) => (
              <span
                key={fmt}
                className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-muted-foreground"
              >
                {fmt}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Need help? Contact{" "}
            <a href="mailto:academy@guardianx.in" className="text-violet-300 hover:underline">
              academy@guardianx.in
            </a>
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────────────────────────── error card ──────────────────────────── */

function ErrorCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-premium rounded-2xl p-8 text-center border-amber-500/30 bg-amber-500/5"
    >
      <div className="relative inline-flex items-center justify-center mb-4">
        <div className="absolute inset-0 bg-amber-500/25 blur-2xl rounded-full" />
        <div className="relative inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-amber-300 mb-2">Verification unavailable</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        The verification service is temporarily unavailable. Please try again in a moment.
      </p>
    </motion.div>
  )
}

/* ─────────────────────────── score ring (SVG) ──────────────────────── */

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const size = 120
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{ background: `radial-gradient(circle, ${color}, transparent 65%)` }}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      {/* center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-2xl font-bold tracking-tight"
          style={{ color }}
        >
          {pct}
          <span className="text-base font-semibold">%</span>
        </motion.span>
        <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] mt-0.5">
          SCORE
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────── fact primitive ───────────────────────── */

function Fact({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
      <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className={cn("text-foreground font-semibold text-sm", accent)}>{value}</span>
    </div>
  )
}

/* ─────────────────────────── helpers ──────────────────────────────── */

function formatDate(d: string | Date): string {
  try {
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return String(d)
  }
}
