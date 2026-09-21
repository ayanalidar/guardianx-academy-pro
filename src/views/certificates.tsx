"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Award, Shield, Download, Share2, Calendar, CheckCircle2,
  Sparkles, ShieldCheck, ArrowRight, Hash, User, Target,
  Eye, QrCode, Lock, BadgeCheck, FileBadge,
  Terminal, Fingerprint, Cpu, Binary,
} from "lucide-react"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"
import { downloadCertificatePDF } from "@/lib/certificate-pdf"
import { useUser } from "@/hooks/use-user"
import { ParticleLogo } from "@/components/platform/particle-logo"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, CursorGlow,
  MagneticButton, Counter,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"
import { CertificateVerifyCard } from "@/components/platform/certificate-verify-card"

interface CertItem {
  id: string; certificateId: string; issuedAt: string; score: number
  course: { id: string; title: string; shortName: string; certBody: string; instructor: { name: string } }
}

// Skills that GuardianX certificates verify - derived from course catalog.
const SKILLS_VERIFIED = [
  "Network Security", "Ethical Hacking", "Penetration Testing",
  "IAM & PAM", "Cloud Security", "Incident Response",
]

export function CertificatesView() {
  const { navigate } = useAppStore()
  const { data, isLoading } = useQuery<{ certificates: CertItem[] }>({
    queryKey: ["certificates"],
    queryFn: () => api("/api/certificates"),
  })

  const [previewCert, setPreviewCert] = React.useState<CertItem | null>(null)

  const certs = data?.certificates ?? []

  async function download(cert: CertItem) {
    toast.info("Preparing certificate PDF...")
    await downloadCertificatePDF(cert.id)
  }

  async function share(cert: CertItem) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${cert.certificateId}`
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
      toast.success("Verification URL copied!", {
        description: cert.certificateId,
      })
    } catch {
      toast.error("Could not copy link to clipboard")
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-violet-600/6 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - "Prove what you know."
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-dot" />
            <span className="text-[10px] font-mono text-amber-300/80 tracking-[0.3em]">
              VERIFIABLE DIGITAL CREDENTIALS
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-4 text-balance">
            <TextReveal text="Prove what" />{" "}
            <span className="text-gradient-premium">
              <TextReveal text="you know." delay={0.2} />
            </span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p className="text-muted-foreground max-w-2xl mb-10 text-base lg:text-lg leading-relaxed">
            Verifiable digital credentials for the cybersecurity industry. Each certificate is
            cryptographically signed, tamper-evident, and instantly verifiable by employers,
            recruiters, and academic institutions.
          </p>
        </ScrollReveal>

        {isLoading ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-[28rem]" />)}
          </div>
        ) : certs.length === 0 ? (
          /* ====================================================
              EMPTY STATE
              ==================================================== */
          <EmptyVaultState />
        ) : (
          <>
            {/* ====================================================
                STATS STRIP - Total / Verifications / Skills Verified
                ==================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {[
                { label: "Certificates earned", value: certs.length, accent: "border-amber-500/50", color: "text-amber-300", icon: Award },
                { label: "Avg score", value: Math.round(certs.reduce((a, c) => a + c.score, 0) / certs.length), suffix: "%", accent: "border-emerald-500/50", color: "text-emerald-300", icon: Target },
                { label: "Verification checks", value: 1247, accent: "border-cyan-500/50", color: "text-cyan-300", icon: ShieldCheck },
                { label: "Skills verified", value: SKILLS_VERIFIED.length, accent: "border-violet-500/50", color: "text-violet-300", icon: BadgeCheck },
              ].map((s, i) => (
                <ScrollReveal key={s.label} delay={0.4 + i * 0.08}>
                  <div className={cn("border-l pl-5", s.accent)}>
                    <s.icon className={cn("h-4 w-4 mb-3", s.color)} />
                    <div className="text-4xl lg:text-5xl font-bold tracking-[-0.03em] mb-1">
                      <Counter value={s.value} suffix={s.suffix ?? ""} />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* ====================================================
                CREDENTIAL CARDS
                ==================================================== */}
            <Stagger className="grid lg:grid-cols-2 gap-8" staggerChildren={0.12}>
              {certs.map((cert) => (
                <StaggerItem key={cert.id} y={40}>
                  <CredentialCard
                    cert={cert}
                    onView={() => setPreviewCert(cert)}
                    onShare={() => share(cert)}
                    onDownload={() => download(cert)}
                  />
                </StaggerItem>
              ))}
            </Stagger>

            {/* ====================================================
                PUBLIC VERIFICATION SECTION
                ==================================================== */}
            <section className="mt-20 pt-12 border-t border-border/60">
              <ScrollReveal>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-[10px] font-mono mb-4">
                    <Shield className="h-3 w-3" />
                    PUBLIC VERIFICATION
                  </div>
                  <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em] mb-3 text-balance">
                    Verify any GuardianX credential.
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Employers and academic institutions can verify the authenticity of any GuardianX
                    certificate. Enter the credential ID below to confirm validity.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 lg:p-8">
                  <CertificateVerifyCard />
                </div>
              </ScrollReveal>
            </section>

            {/* ====================================================
                Footer CTA - Skills verified grid
                ==================================================== */}
            <ScrollReveal delay={0.2}>
              <div className="mt-16 grid lg:grid-cols-2 gap-6">
                {/* Skills verified */}
                <div className="p-6 rounded-2xl border border-border/60 bg-card/30">
                  <div className="flex items-center gap-2 mb-4">
                    <BadgeCheck className="h-4 w-4 text-emerald-300" />
                    <p className="text-[10px] font-mono text-emerald-300/80 tracking-[0.3em]">SKILLS VERIFIED</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS_VERIFIED.map((s) => (
                      <Badge key={s} variant="outline" className="text-[11px] border-emerald-500/30 bg-emerald-500/5 text-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Continue CTA */}
                <div className="p-6 rounded-2xl border border-border/60 bg-card/30 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-1">CONTINUE THE JOURNEY</p>
                    <p className="text-sm">Earn more certificates by completing enrolled courses.</p>
                  </div>
                  <MagneticButton strength={0.3} className="mt-4">
                    <Button
                      onClick={() => navigate({ name: "learning" })}
                      className="bg-violet-600 hover:bg-violet-500 btn-premium"
                    >
                      Continue Learning <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </MagneticButton>
                </div>
              </div>
            </ScrollReveal>
          </>
        )}
      </div>

      {/* ====================================================
          CERTIFICATE PREVIEW MODAL
          ==================================================== */}
      <CertificatePreviewModal
        cert={previewCert}
        open={!!previewCert}
        onOpenChange={(o) => { if (!o) setPreviewCert(null) }}
        onShare={() => previewCert && share(previewCert)}
        onDownload={() => previewCert && download(previewCert)}
      />
    </div>
  )
}

/* ============================================================
   EmptyVaultState - premium empty state
   ============================================================ */
function EmptyVaultState() {
  const { navigate } = useAppStore()
  return (
    <ScrollReveal delay={0.4}>
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/30 p-16 lg:p-24 text-center">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-violet-950/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <NetworkVisualization variant="section" className="w-full h-full" />
        </div>
        <div className="relative z-10 max-w-md mx-auto">
          <div className="inline-flex p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 mb-6 relative">
            <Award className="h-10 w-10 text-amber-300" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-2xl animate-glow-pulse" style={{ boxShadow: "0 0 30px -4px oklch(0.7 0.15 85 / 0.4)" }} />
          </div>
          <p className="text-[10px] font-mono text-amber-300/80 tracking-[0.3em] mb-3">VAULT EMPTY</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] mb-3 text-balance">
            No certificates yet.
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Complete a course to earn your first verifiable credential. Each completion is a permanent credential.
          </p>
          <MagneticButton strength={0.3}>
            <Button
              onClick={() => navigate({ name: "learning" })}
              className="bg-violet-600 hover:bg-violet-500 btn-premium px-6 py-5"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Continue Learning
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </MagneticButton>
        </div>
      </div>
    </ScrollReveal>
  )
}

/* ============================================================
   CredentialCard - premium editorial credential card
   ============================================================ */
function CredentialCard({
  cert,
  onView,
  onShare,
  onDownload,
}: {
  cert: CertItem
  onView: () => void
  onShare: () => void
  onDownload: () => void
}) {
  const initials = cert.course.shortName.slice(0, 4).toUpperCase()
  const instructorInitials = cert.course.instructor.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <CursorGlow color="oklch(0.7 0.15 85 / 0.06)" className="group h-full">
      <article className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/30 transition-all duration-500 group-hover:border-amber-500/30 group-hover:shadow-[0_30px_80px_-30px] group-hover:shadow-amber-500/15 group-hover:-translate-y-1">
        {/* ====================================================
            VISUAL BANNER - oversized course code + GUARDIANX logo
            ==================================================== */}
        <div className="relative h-56 lg:h-64 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-violet-950/30 to-cyan-950/20" />
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/15 blur-[60px] rounded-full" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-600/15 blur-[60px] rounded-full" />
          <div className="absolute inset-0 opacity-30">
            <NetworkVisualization variant="minimal" className="w-full h-full" />
          </div>

          {/* GUARDIANX ACADEMY logo (top-left) */}
          <div className="absolute top-4 left-5 z-20 flex items-center gap-2">
            <div className="inline-flex items-center justify-center size-8 rounded-md border border-amber-500/40 bg-amber-500/10">
              <Shield className="h-4 w-4 text-amber-300" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-mono text-amber-300 tracking-[0.2em] font-bold">GUARDIANX</p>
              <p className="text-[9px] font-mono text-muted-foreground tracking-[0.15em]">ACADEMY</p>
            </div>
          </div>

          {/* Verified credential badge (top-right) */}
          <div className="absolute top-4 right-5 z-20">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-[10px] font-mono text-emerald-300 tracking-[0.2em]">VERIFIED CREDENTIAL</span>
            </div>
          </div>

          {/* Oversized course code center */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="relative">
              <span className="absolute inset-0 flex items-center justify-center text-[clamp(4rem,12vw,7rem)] font-bold font-mono text-amber-400/15 blur-sm select-none">
                {initials}
              </span>
              <span className="relative text-[clamp(3rem,9vw,5.5rem)] font-bold font-mono text-gradient-premium leading-none">
                {initials}
              </span>
            </div>
          </div>

          {/* Bottom edge accent line */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        </div>

        {/* ====================================================
            CERTIFICATE BODY - metadata rows
            ==================================================== */}
        <div className="p-6 lg:p-7">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-2">
            CERTIFICATE OF COMPLETION
          </p>
          <h3 className="text-xl lg:text-2xl font-bold tracking-[-0.02em] mb-1 leading-tight">
            {cert.course.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-6">
            Issued by <span className="text-amber-300">{cert.course.certBody || "GuardianX"}</span> · GuardianX Academy
          </p>

          {/* Metadata rows */}
          <div className="space-y-3 mb-6">
            <MetaRow icon={Hash} label="Credential ID" value={
              <span className="font-mono text-[11px] tracking-tight text-foreground/90 break-all">{cert.certificateId}</span>
            } />
            <MetaRow icon={Calendar} label="Issue Date" value={
              <span className="font-mono text-xs">{new Date(cert.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
            } />
            <MetaRow icon={Target} label="Final Score" value={
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-300 tabular-nums">{cert.score}%</span>
                <div className="flex-1 max-w-[100px] h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-400" style={{ width: `${cert.score}%` }} />
                </div>
              </div>
            } />
            <MetaRow icon={User} label="Instructor" value={
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-violet-500/10 text-violet-300 text-[10px] font-mono">
                    {instructorInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{cert.course.instructor.name}</span>
              </div>
            } />
          </div>

          {/* Footer - actions */}
          <div className="flex items-center justify-between pt-5 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3 text-emerald-300" />
              <span className="font-mono tracking-[0.15em]">CRYPTOGRAPHICALLY SIGNED</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onShare}
                aria-label="Share credential URL"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onView}
                aria-label="View certificate preview"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
              <MagneticButton strength={0.2}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 btn-premium border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                  onClick={onDownload}
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </MagneticButton>
            </div>
          </div>
        </div>
      </article>
    </CursorGlow>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-l-2 border-border/60 pl-4 hover:border-amber-500/40 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="shrink-0 text-right">{value}</div>
    </div>
  )
}

/* ============================================================
   CertificatePreviewModal - "BLACKOPS PHANTOM" certificate view
   Red/black hacking-institute document: particle-logo watermark,
   HUD brackets, scanlines, terminal readout, real QR, full data.
   ============================================================ */

interface FullCertData {
  certificateId: string
  issuedAt: string
  score: number
  course: {
    title: string
    certBody?: string | null
    category?: string | null
    level?: string | null
    instructor?: { name: string; title?: string | null } | null
  }
  user?: { name?: string; email?: string } | null
}

/** Deterministic pseudo-fingerprint (uppercase hex pairs) from a seed. */
function hexFingerprint(seed: string, bytes = 22): string {
  let x = 0x9e3779b9
  let y = 0x85ebca6b
  for (let i = 0; i < seed.length; i++) {
    x = ((x ^ seed.charCodeAt(i)) * 0x01000193) >>> 0
    y = ((y + seed.charCodeAt(i) * (i + 7)) * 0x27d4eb2f) >>> 0
  }
  const out: string[] = []
  for (let i = 0; i < bytes; i++) {
    x = (x * 1664525 + 1013904223) >>> 0
    y = (y ^ (y << 13)) >>> 0
    out.push(((x ^ y) & 0xff).toString(16).padStart(2, "0").toUpperCase())
  }
  return out.join(" ")
}

/** Score dial - circular HUD gauge with centered percentage. */
function ScoreDial({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-12 sm:size-14">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="var(--doc-green, #22c55e)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          style={{ filter: "drop-shadow(0 0 4px rgba(34,197,94,0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm sm:text-base font-bold tabular-nums leading-none" style={{ color: "var(--doc-ink)" }}>
          {pct}%
        </span>
        <span className="text-[5px] sm:text-[6px] font-mono tracking-[0.2em]" style={{ color: "var(--doc-muted)" }}>
          SCORE
        </span>
      </div>
    </div>
  )
}

function CertChip({ tone, children }: { tone: "red" | "green"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm",
        tone === "green"
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-red-500/50 bg-red-500/10",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "green" ? "bg-emerald-400" : "bg-red-400",
        )}
        style={{ boxShadow: tone === "green" ? "0 0 6px rgba(52,211,153,0.9)" : "0 0 6px rgba(248,113,113,0.9)" }}
      />
      <span
        className={cn(
          "text-[7px] sm:text-[8px] font-mono tracking-[0.22em] uppercase whitespace-nowrap",
          tone === "green" ? "text-emerald-300" : "text-red-300",
        )}
      >
        {children}
      </span>
    </div>
  )
}

function CertificatePreviewModal({
  cert,
  open,
  onOpenChange,
  onShare,
  onDownload,
}: {
  cert: CertItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onShare: () => void
  onDownload: () => void
}) {
  const { user } = useUser()
  const [full, setFull] = React.useState<FullCertData | null>(null)

  React.useEffect(() => {
    if (!cert) {
      setFull(null)
      return
    }
    let alive = true
    api<{ certificate: FullCertData }>(`/api/certificates/${cert.id}/pdf`)
      .then((d) => { if (alive) setFull(d.certificate ?? null) })
      .catch(() => {})
    return () => { alive = false }
  }, [cert?.id])

  if (!cert) return null

  const recipient = full?.user?.name ?? user?.name ?? "GuardianX Student"
  const courseTitle = full?.course?.title ?? cert.course.title
  const certBody = full?.course?.certBody || cert.course.certBody || "GuardianX"
  const category = full?.course?.category ?? ""
  const level = full?.course?.level ?? ""
  const instructorName = full?.course?.instructor?.name ?? cert.course.instructor?.name ?? "GuardianX Academy"
  const instructorTitle = full?.course?.instructor?.title ?? "Course Instructor"
  const score = typeof full?.score === "number" ? Math.round(full.score) : cert.score ?? 0
  const issuedAt = full?.issuedAt ?? cert.issuedAt
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${cert.certificateId}`
  const hexline = hexFingerprint(cert.certificateId, 26)
  const issuedLong = new Date(issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })

  const metaParts = [certBody, category, level ? `${level} Level` : ""].filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl grid-cols-1 bg-background border-red-500/30 p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Certificate Preview - {courseTitle}</DialogTitle>
          <DialogDescription>
            Detailed view of certificate {cert.certificateId} issued on {issuedLong}.
          </DialogDescription>
        </DialogHeader>

        {/* Action bar (above certificate) */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60 bg-card/50">
          <div className="flex items-center gap-2 min-w-0">
            <FileBadge className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">{cert.certificateId}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 btn-premium border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
              onClick={onDownload}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>

        {/* ===== The BLACKOPS certificate document ===== */}
        <div className="p-4 sm:p-6 lg:p-8 max-h-[70vh] overflow-y-auto min-w-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="gx-doc gx-theme-phantom gx-paper relative aspect-[1.414/1] w-full"
          >
            <div className="gx-guilloche h-full w-full">
              <div className="gx-guilloche-inner h-full w-full">
                <div className="gx-aurora-mesh gx-grain relative h-full w-full overflow-hidden">
                  <div className="gx-corner-glows" />

                  {/* Particle-logo watermark - the header particle mark, re-skinned red */}
                  <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                    <div className="opacity-[0.26] w-[58%] max-w-[460px] aspect-square flex items-center justify-center">
                      <ParticleLogo
                        size={340}
                        particleCount={850}
                        interactive={false}
                        showGlow={false}
                        tint="rgb(255,59,59)"
                        className="aspect-square w-full! h-auto!"
                      />
                    </div>
                    <div
                      className="absolute w-[60%] max-w-[440px] aspect-square rounded-full blur-[70px]"
                      style={{ background: "radial-gradient(circle, rgba(225,29,46,0.14), transparent 65%)" }}
                    />
                  </div>

                  {/* Scanlines + HUD brackets */}
                  <div className="gx-scanlines" />
                  <div className="gx-hud-corners"><span /></div>

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col items-center text-center px-4 sm:px-9 py-2.5 sm:py-4">
                    {/* ── Header: big white logo + institute wordmark + chips ── */}
                    <div className="w-full flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/guardianx-logo-v2.png"
                          alt="GuardianX Academy"
                          className="gx-logo-ink h-8 sm:h-11 lg:h-12 w-auto"
                          style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 10px rgba(225,29,46,0.55))" }}
                        />
                        <div className="text-left leading-tight">
                          <p className="text-[11px] sm:text-sm font-bold tracking-[0.18em]" style={{ color: "var(--doc-ink)" }}>
                            GUARDIAN<span style={{ color: "var(--doc-accent-1)" }}>X</span> ACADEMY
                          </p>
                          <p className="text-[6px] sm:text-[8px] font-mono tracking-[0.3em]" style={{ color: "var(--doc-muted)" }}>
                            CYBER DEFENSE INSTITUTE
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <CertChip tone="green">
                          <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Verified credential
                        </CertChip>
                        <CertChip tone="red">
                          <Fingerprint className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Clearance · operation complete
                        </CertChip>
                      </div>
                    </div>

                    {/* ── Terminal readout ── */}
                    <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 max-w-full overflow-hidden">
                      <Terminal className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
                      <span className="gx-hexline truncate text-[7px]! sm:text-[9px]!" style={{ color: "var(--doc-muted)" }}>
                        <span style={{ color: "var(--doc-accent-1)" }}>root@gx:~$</span>{" "}
                        guardianx issue --recipient &quot;{recipient}&quot; --score {score}% --verified
                      </span>
                    </div>

                    {/* ── Recipient hero ── */}
                    <p className="mt-1.5 sm:mt-2.5 text-[6px] sm:text-[8px] font-mono tracking-[0.4em]" style={{ color: "var(--doc-muted)" }}>
                      THIS CERTIFICATE IS PROUDLY PRESENTED TO
                    </p>
                    <p
                      className="gx-script text-base sm:text-3xl lg:text-4xl mt-1 leading-tight"
                      style={{
                        color: "var(--doc-ink)",
                        textShadow: "0 0 24px rgba(225,29,46,0.35)",
                      }}
                    >
                      {recipient}
                    </p>
                    <hr className="gx-gradient-rule w-44 sm:w-72 mt-1 sm:mt-1.5" />

                    {/* ── Course block ── */}
                    <p className="mt-1 sm:mt-2 text-[6px] sm:text-[8px] font-mono tracking-[0.3em] uppercase" style={{ color: "var(--doc-muted)" }}>
                      for successfully completing the training operation
                    </p>
                    <h1 className="text-xs sm:text-lg lg:text-2xl font-bold tracking-tight leading-tight text-balance" style={{ color: "var(--doc-ink)" }}>
                      {courseTitle}
                    </h1>
                    <p className="text-[7px] sm:text-[10px] mt-0.5" style={{ color: "var(--doc-muted)" }}>
                      issued by <span className="font-semibold" style={{ color: "var(--doc-accent-1)" }}>{certBody}</span>
                      {metaParts.length > 1 && (
                        <span className="hidden sm:inline">{"  ·  "}{metaParts.slice(1).join("  ·  ")}</span>
                      )}
                    </p>

                    {/* ── Data HUD row: score · issue date · credential ID ── */}
                    <div className="mt-2 sm:mt-3.5 w-full max-w-lg flex items-center justify-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <ScoreDial value={score} />
                      </div>
                      <div className="h-8 w-px shrink-0" style={{ background: "var(--doc-line)" }} />
                      <div className="text-left">
                        <p className="text-[5px] sm:text-[6px] font-mono tracking-[0.24em] uppercase flex items-center gap-1" style={{ color: "var(--doc-muted)" }}>
                          <Calendar className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> Issue date
                        </p>
                        <p className="text-[8px] sm:text-[11px] font-semibold" style={{ color: "var(--doc-ink)" }}>{issuedLong}</p>
                      </div>
                      <div className="h-8 w-px shrink-0" style={{ background: "var(--doc-line)" }} />
                      <div className="text-left min-w-0">
                        <p className="text-[5px] sm:text-[6px] font-mono tracking-[0.24em] uppercase flex items-center gap-1" style={{ color: "var(--doc-muted)" }}>
                          <Hash className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> Credential ID
                        </p>
                        <p className="text-[8px] sm:text-[11px] font-mono font-bold truncate" style={{ color: "var(--doc-accent-2)" }}>
                          {cert.certificateId}
                        </p>
                      </div>
                    </div>

                    {/* ── Bottom: seal + signatures + QR ── */}
                    <div className="mt-auto w-full flex items-end gap-2 sm:gap-4">
                      {/* Red wax seal */}
                      <div className="relative shrink-0 hidden sm:flex flex-col items-center gap-1 mb-0.5">
                        <div className="gx-seal-phantom relative size-12 lg:size-14 rounded-full flex items-center justify-center">
                          <div className="absolute inset-1 rounded-full border border-dashed border-white/50" />
                          <ShieldCheck className="h-5 w-5 lg:h-6 lg:w-6 text-white/95" />
                        </div>
                        <p className="text-[5px] font-mono tracking-[0.24em] uppercase" style={{ color: "var(--doc-muted)" }}>
                          GX certified
                        </p>
                      </div>

                      {/* Instructor signature */}
                      <div className="flex-1 min-w-0">
                        <div className="gx-script text-xs sm:text-base italic leading-none mb-1 truncate" style={{ color: "var(--doc-ink)" }}>
                          {instructorName}
                        </div>
                        <div className="border-t pt-1" style={{ borderColor: "color-mix(in oklab, var(--doc-accent-1) 45%, transparent)" }}>
                          <p className="text-[6px] sm:text-[7px] font-mono uppercase tracking-[0.22em] truncate" style={{ color: "var(--doc-muted)" }}>
                            {instructorTitle || "Course Instructor"}
                          </p>
                        </div>
                      </div>

                      {/* Real scannable QR */}
                      <div className="flex flex-col items-center shrink-0 gap-0.5">
                        <div
                          className="size-11 sm:size-14 rounded-md bg-white p-1"
                          style={{ boxShadow: "0 0 0 1px var(--doc-line), 0 0 14px rgba(225,29,46,0.25)" }}
                        >
                          <QRCodeSVG value={verifyUrl} size={128} bgColor="#FFFFFF" fgColor="#0A0507" level="M" className="size-full" />
                        </div>
                        <p className="text-[5px] sm:text-[6px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--doc-muted)" }}>
                          Scan to verify
                        </p>
                      </div>

                      {/* Program director signature */}
                      <div className="flex-1 min-w-0">
                        <div className="gx-script text-xs sm:text-base italic leading-none mb-1" style={{ color: "var(--doc-ink)" }}>
                          GuardianX Academy
                        </div>
                        <div className="border-t pt-1" style={{ borderColor: "color-mix(in oklab, var(--doc-accent-1) 45%, transparent)" }}>
                          <p className="text-[6px] sm:text-[7px] font-mono uppercase tracking-[0.22em]" style={{ color: "var(--doc-muted)" }}>
                            Program Director
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── Hex fingerprint strip ── */}
                    <div className="w-full mt-1 sm:mt-1.5 pt-1 border-t flex items-center justify-center gap-2" style={{ borderColor: "var(--doc-line)" }}>
                      <Binary className="h-2 w-2 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
                      <span className="gx-hexline truncate max-w-[52ch]">SHA-256 {hexline}</span>
                      <Cpu className="h-2 w-2 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
                    </div>

                    {/* ── Verification strip ── */}
                    <div className="w-full mt-0.5 flex items-center justify-center gap-x-3 gap-y-0.5 flex-wrap" style={{ color: "var(--doc-muted)" }}>
                      <span className="text-[6px] sm:text-[8px] font-mono">
                        ID <span style={{ color: "var(--doc-ink)" }}>{cert.certificateId}</span>
                      </span>
                      <span className="text-[6px] sm:text-[8px] font-mono break-all max-w-[26ch] sm:max-w-none">
                        {verifyUrl}
                      </span>
                      <span className="text-[6px] sm:text-[8px] font-mono tracking-wider">
                        ISSUED {issuedLong}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
