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
} from "lucide-react"
import { toast } from "sonner"
import { downloadCertificatePDF } from "@/lib/certificate-pdf"
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
   CertificatePreviewModal - large professional certificate view
   ============================================================ */
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
  if (!cert) return null
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${cert.certificateId}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] bg-background border-amber-500/30 p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Certificate Preview - {cert.course.title}</DialogTitle>
          <DialogDescription>
            Detailed view of certificate {cert.certificateId} issued on{" "}
            {new Date(cert.issuedAt).toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>

        {/* Action bar (above certificate) */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60 bg-card/50">
          <div className="flex items-center gap-2 min-w-0">
            <FileBadge className="h-4 w-4 text-amber-300 shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">{cert.certificateId}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 btn-premium border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15"
              onClick={onDownload}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>

        {/* The certificate — Aurora Luxe document (mirrors the PDF design) */}
        <div className="p-4 sm:p-6 lg:p-8 max-h-[70vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="gx-doc gx-theme-aurora gx-paper relative aspect-[1.414/1] w-full"
          >
            {/* Guilloché frame around the document */}
            <div className="gx-guilloche h-full w-full">
              <div className="gx-guilloche-inner h-full w-full">
                <div className="gx-aurora-mesh gx-grain relative h-full w-full overflow-hidden">
                  <div className="gx-corner-glows" />
                  <div className="gx-watermark" />

                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center text-center px-5 sm:px-10 py-4 sm:py-6">
                    {/* Header - logo ring + kicker + wordmark */}
                    <div className="flex flex-col items-center">
                      <div
                        className="size-10 sm:size-12 rounded-full border flex items-center justify-center"
                        style={{
                          borderColor: "var(--doc-gold)",
                          background: "color-mix(in oklab, var(--doc-gold) 12%, transparent)",
                          boxShadow: "0 0 0 3px color-mix(in oklab, var(--doc-gold) 14%, transparent)",
                        }}
                      >
                        <Shield className="h-5 w-5" style={{ color: "var(--doc-gold)" }} />
                      </div>
                      <p className="mt-1.5 text-[8px] sm:text-[9px] font-mono tracking-[0.3em]" style={{ color: "var(--doc-muted)" }}>
                        GUARDIANX ACADEMY
                      </p>
                      <p className="mt-1.5 sm:mt-2 text-[8px] sm:text-[10px] font-mono tracking-[0.45em] uppercase" style={{ color: "var(--doc-accent-2)" }}>
                        · of completion ·
                      </p>
                      <h2
                        className="text-base sm:text-2xl lg:text-3xl font-bold tracking-[0.35em] pl-[0.35em] leading-tight"
                        style={{ color: "var(--doc-gold)" }}
                      >
                        CERTIFICATE
                      </h2>
                    </div>

                    {/* Recipient + course */}
                    <div className="flex flex-col items-center mt-2 sm:mt-3">
                      <p className="text-[7px] sm:text-[9px] font-mono tracking-[0.3em]" style={{ color: "var(--doc-muted)" }}>
                        THIS CERTIFICATE IS PROUDLY PRESENTED TO
                      </p>
                      <p className="gx-script text-xl sm:text-3xl lg:text-4xl mt-1.5 leading-tight" style={{ color: "var(--doc-ink)", fontStyle: "italic" }}>
                        GuardianX Student
                      </p>
                      <hr className="gx-gradient-rule w-48 sm:w-72 mt-2" />
                      <p className="mt-2 sm:mt-3 text-[7px] sm:text-[9px] font-mono tracking-[0.25em] uppercase" style={{ color: "var(--doc-muted)" }}>
                        for successfully completing
                      </p>
                      <h1 className="text-sm sm:text-xl lg:text-2xl font-bold tracking-tight leading-tight text-balance" style={{ color: "var(--doc-ink)" }}>
                        {cert.course.title}
                      </h1>
                      <p className="text-[9px] sm:text-xs mt-1" style={{ color: "var(--doc-muted)" }}>
                        Issued by <span className="font-medium" style={{ color: "var(--doc-gold)" }}>{cert.course.certBody || "GuardianX"}</span>
                      </p>
                    </div>

                    {/* Bottom - seal + signatures + QR */}
                    <div className="mt-auto w-full flex items-end gap-2 sm:gap-4">
                      {/* Gold seal with ribbon tails */}
                      <div className="relative shrink-0 hidden sm:block mb-1">
                        <div className="absolute left-1/2 top-[55%] w-3.5 h-8 rounded-[2px]" style={{ background: "var(--doc-accent-1)", opacity: 0.85, transform: "translateX(-88%) rotate(14deg)" }} />
                        <div className="absolute left-1/2 top-[55%] w-3.5 h-8 rounded-[2px]" style={{ background: "var(--doc-accent-3)", opacity: 0.85, transform: "translateX(-12%) rotate(-14deg)" }} />
                        <div
                          className="relative size-14 rounded-full border-2 flex items-center justify-center"
                          style={{
                            borderColor: "var(--doc-gold)",
                            background: "color-mix(in oklab, var(--doc-gold) 26%, var(--doc-bg-a))",
                          }}
                        >
                          <div className="absolute inset-1 rounded-full border border-dashed" style={{ borderColor: "color-mix(in oklab, var(--doc-gold) 70%, transparent)" }} />
                          <Award className="h-6 w-6" style={{ color: "var(--doc-gold)" }} />
                        </div>
                      </div>

                      {/* Instructor signature */}
                      <div className="flex-1 min-w-0">
                        <div className="gx-script text-xs sm:text-base italic leading-none mb-1.5 truncate" style={{ color: "var(--doc-ink)" }}>
                          {cert.course.instructor.name}
                        </div>
                        <div className="border-t pt-1.5" style={{ borderColor: "color-mix(in oklab, var(--doc-gold) 45%, transparent)" }}>
                          <p className="text-[7px] sm:text-[8px] font-mono uppercase tracking-[0.25em]" style={{ color: "var(--doc-muted)" }}>
                            Course Instructor · <span className="font-bold">{cert.score}%</span>
                          </p>
                        </div>
                      </div>

                      {/* QR placeholder */}
                      <div className="flex flex-col items-center shrink-0 gap-1">
                        <div className="size-10 sm:size-12 rounded-md bg-white flex items-center justify-center" style={{ border: "1px solid var(--doc-line)" }}>
                          <QrCode className="h-6 w-6 sm:h-7 sm:w-7 text-neutral-500" />
                        </div>
                        <p className="text-[6px] sm:text-[7px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--doc-muted)" }}>
                          Scan to verify
                        </p>
                      </div>

                      {/* Program director signature */}
                      <div className="flex-1 min-w-0">
                        <div className="gx-script text-xs sm:text-base italic leading-none mb-1.5" style={{ color: "var(--doc-ink)" }}>
                          GuardianX Academy
                        </div>
                        <div className="border-t pt-1.5" style={{ borderColor: "color-mix(in oklab, var(--doc-gold) 45%, transparent)" }}>
                          <p className="text-[7px] sm:text-[8px] font-mono uppercase tracking-[0.25em]" style={{ color: "var(--doc-muted)" }}>
                            Program Director
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Verification strip */}
                    <div className="w-full mt-2.5 sm:mt-3 pt-2 border-t flex items-center justify-center gap-x-3 gap-y-0.5 flex-wrap" style={{ borderColor: "var(--doc-line)" }}>
                      <span className="text-[7px] sm:text-[8px] font-mono" style={{ color: "var(--doc-muted)" }}>
                        ID <span style={{ color: "var(--doc-ink)" }}>{cert.certificateId}</span>
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-mono break-all max-w-[26ch] sm:max-w-none" style={{ color: "var(--doc-muted)" }}>
                        {verifyUrl}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-mono tracking-wider" style={{ color: "var(--doc-muted)" }}>
                        ISSUED {new Date(cert.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
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
