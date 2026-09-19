"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Award, ShieldCheck, Loader2, AlertCircle, ArrowLeft, ArrowRight,
  Linkedin, MessageCircle, Download, CheckCircle2, Fingerprint,
  Sparkles, Calendar, Hash,
} from "lucide-react"
import { toast } from "sonner"

interface CertResponse {
  certificate: {
    credentialId: string
    candidateName: string
    email: string
    difficulty: string
    score: number
    totalQuestions: number
    percentage: number
    issueDate: string
    verificationHash: string
    verificationUrl: string | null
    status: string
  }
  domainScores: Record<string, { correct: number; total: number }>
}

const DIFFICULTY_LABELS: Record<string, string> = {
  Easy: "Foundational",
  Hard: "Intermediate",
  Advanced: "Expert",
}

export function CyberQuizCertificateView() {
  const { view, navigate } = useAppStore()
  const credentialId = (view as any)?.credentialId as string

  const { data, isLoading, error } = useQuery<CertResponse>({
    queryKey: ["cyber-quiz-cert", credentialId],
    queryFn: async () => {
      const r = await fetch(`/api/cyber-quiz/certificate/${credentialId}`)
      if (!r.ok) throw new Error("Certificate not found")
      return r.json()
    },
    enabled: !!credentialId,
  })

  const certRef = React.useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = React.useState(false)

  if (isLoading) {
    return (
      <main className="relative min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="relative min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Certificate not found</p>
          <p className="text-xs text-muted-foreground mb-4">The credential ID may be invalid or revoked.</p>
          <Button onClick={() => navigate({ name: "verify" })} variant="outline" size="sm">
            <Fingerprint className="h-4 w-4 mr-1.5" /> Verify a certificate
          </Button>
        </div>
      </main>
    )
  }

  const { certificate: cert, domainScores } = data
  const issueDate = new Date(cert.issueDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  })

  const handleDownload = async () => {
    if (!certRef.current) return
    setDownloading(true)
    try {
      // Dynamic import to avoid bundling jspdf + html2canvas for the whole app
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: "#0a0a0f",
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height)
      pdf.save(`${cert.credentialId}.pdf`)
      toast.success("Certificate downloaded as PDF")
    } catch (e) {
      console.error("PDF download failed:", e)
      toast.error("PDF download failed. Please try the screenshot instead.")
    } finally {
      setDownloading(false)
    }
  }

  const shareText = `I earned the Cyber Security Foundation Certificate (${cert.difficulty} level) from GuardianX Academy with a score of ${cert.percentage}%! Verify it here: ${cert.verificationUrl || `https://academy.guardianx.cloud/verify?id=${cert.credentialId}`}`

  const shareLinkedIn = () => {
    const url = encodeURIComponent(cert.verificationUrl || `https://academy.guardianx.cloud/verify?id=${cert.credentialId}`)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "noopener,noreferrer")
  }

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer")
  }

  const copyLink = () => {
    const link = cert.verificationUrl || `https://academy.guardianx.cloud/verify?id=${cert.credentialId}`
    navigator.clipboard.writeText(link)
    toast.success("Verification link copied!")
  }

  const passClass = cert.percentage >= 75 ? "from-emerald-500/20" : cert.percentage >= 50 ? "from-violet-500/20" : "from-amber-500/20"

  return (
    <main className="relative min-h-screen pb-16">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute top-40 left-0 w-[500px] h-[300px] bg-cyan-500/6 blur-[100px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="inline-flex p-3 rounded-full bg-violet-500/10 mb-4 shadow-[0_0_30px_-8px] shadow-violet-500/40">
            <Award className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">Your certificate is ready</h1>
          <p className="text-sm text-muted-foreground">Share it, download it, or verify it anytime.</p>
        </motion.div>

        {/* Action bar (above the cert) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-6"
        >
          <Button onClick={shareLinkedIn} variant="outline" size="sm" className="border-[#0A66C2]/40 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]">
            <Linkedin className="h-4 w-4 mr-1.5" /> Share to LinkedIn
          </Button>
          <Button onClick={shareWhatsApp} variant="outline" size="sm" className="border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400">
            <MessageCircle className="h-4 w-4 mr-1.5" /> Share to WhatsApp
          </Button>
          <Button onClick={handleDownload} disabled={downloading} size="sm" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download PDF
          </Button>
          <Button onClick={copyLink} variant="ghost" size="sm">
            <Fingerprint className="h-4 w-4 mr-1.5" /> Copy verify link
          </Button>
        </motion.div>

        {/* ===== Certificate (the printable design) ===== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          ref={certRef}
          className="gx-doc gx-theme-aurora gx-paper relative aspect-[1.414/1] w-full max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-violet-500/20"
          style={{ backgroundColor: "#0B0716" }}
        >
          {/* Guilloché frame + aurora mesh document surface */}
          <div className="gx-guilloche absolute inset-0">
            <div className="gx-guilloche-inner h-full w-full">
              <div className="gx-aurora-mesh gx-grain relative h-full w-full overflow-hidden">
                <div className="gx-corner-glows" />
                <div className="gx-watermark" />

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center text-center px-8 sm:px-12 py-8">
                  {/* Top: brand */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <img src="/guardianx-logo-v2.png" alt="GuardianX" className="h-10 w-10 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(124,58,237,0.5))" }} />
                    <div className="text-left">
                      <div className="text-lg font-bold leading-none" style={{ color: "var(--doc-ink)" }}>
                        Guardian<span style={{ color: "var(--doc-gold)" }}>X</span>
                      </div>
                      <div className="text-[8px] font-mono tracking-[0.3em] mt-0.5" style={{ color: "var(--doc-muted)" }}>ACADEMY</div>
                    </div>
                  </div>

                  {/* Certificate of completion */}
                  <div className="text-[10px] font-mono tracking-[0.4em] uppercase mb-2" style={{ color: "var(--doc-accent-2)" }}>
                    · of completion ·
                  </div>

                  <h2 className="text-2xl lg:text-4xl font-bold tracking-tight mb-1 text-balance">
                    <span className="text-gradient-premium">Cyber Security Foundation</span>
                  </h2>

                  <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-4" style={{ color: "var(--doc-muted)" }}>
                    {DIFFICULTY_LABELS[cert.difficulty] || cert.difficulty} Level
                  </p>

                  {/* "This certifies that" */}
                  <p className="text-xs mb-2" style={{ color: "var(--doc-muted)" }}>
                    This is to certify that
                  </p>

                  {/* Candidate name — script hero with gradient rule */}
                  <div className="gx-script text-3xl lg:text-5xl italic leading-tight" style={{ color: "var(--doc-ink)" }}>
                    {cert.candidateName}
                  </div>

                  <hr className="gx-gradient-rule w-64 mt-3 mb-4" />

                  {/* "has successfully completed..." */}
                  <p className="text-xs max-w-md leading-relaxed mb-5" style={{ color: "var(--doc-muted)" }}>
                    has successfully completed the Cyber Security Foundation awareness quiz
                    with a score of <span className="font-semibold text-white">{cert.score}/{cert.totalQuestions}</span> ({cert.percentage}%)
                    across 8 cyber security domains.
                  </p>

                  {/* Bottom row: date + credential ID + signature */}
                  <div className="flex items-end justify-between w-full max-w-2xl mt-auto">
                    <div className="text-left">
                      <div className="text-[8px] font-mono tracking-[0.2em] uppercase mb-1" style={{ color: "var(--doc-muted)" }}>Issue date</div>
                      <div className="text-xs font-semibold" style={{ color: "var(--doc-ink)" }}>{issueDate}</div>
                    </div>
                    <div className="text-center">
                      {/* Gold verification seal with dashed ring */}
                      <div className="relative inline-flex items-center justify-center mb-1">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffe9a8] via-[#f5c451] to-[#c8901c] shadow-lg shadow-amber-500/30" />
                        <div className="absolute inset-1.5 rounded-full border border-dashed border-[#5a3c05]/60" />
                        <ShieldCheck className="absolute h-7 w-7 text-[#5a3c05]" />
                      </div>
                      <div className="text-[8px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--doc-muted)" }}>
                        Verified
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-mono tracking-[0.2em] uppercase mb-1" style={{ color: "var(--doc-muted)" }}>Credential ID</div>
                      <div className="text-xs font-mono font-semibold" style={{ color: "var(--doc-accent-2)" }}>{cert.credentialId}</div>
                    </div>
                  </div>

                  {/* Verification URL at bottom */}
                  <div className="mt-3 text-[8px] font-mono tracking-wider" style={{ color: "var(--doc-muted)" }}>
                    Verify at {cert.verificationUrl || `academy.guardianx.cloud/verify?id=${cert.credentialId}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Below the cert: quick links */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-6"
        >
          <Button onClick={() => navigate({ name: "cyber-quiz-progress", credentialId: cert.credentialId } as any)} variant="outline" size="sm" className="border-violet-500/30 hover:bg-violet-500/10">
            View progress report <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button onClick={() => navigate({ name: "verify" })} variant="ghost" size="sm">
            <Fingerprint className="h-4 w-4 mr-1.5" /> Verify page
          </Button>
          <Button onClick={() => navigate({ name: "cyber-quiz" })} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to quiz
          </Button>
        </motion.div>
      </div>
    </main>
  )
}
