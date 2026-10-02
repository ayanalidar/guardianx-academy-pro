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
import { QRCodeSVG } from "qrcode.react"
import { downloadQuizCertificatePDF } from "@/lib/certificate-pdf"

interface CertResponse {
  certificate: {
    credentialId: string
    candidateName: string
      difficulty: string
    score: number
    totalQuestions: number
    percentage: number
    issueDate: string
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
    setDownloading(true)
    try {
      // Same vector pipeline as course + internship certificates - the
      // browser print dialog renders the phantom document as a crisp,
      // fully vector A4 PDF (replaces the old rasterised html2canvas flow).
      await downloadQuizCertificatePDF(cert.credentialId)
      toast.success("Certificate opened - choose \u201cSave as PDF\u201d to download")
    } catch (e) {
      console.error("PDF download failed:", e)
      toast.error("PDF download failed. Please try again.")
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

        {/* ===== Certificate (mirrors the downloaded phantom PDF) ===== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          ref={certRef}
          className="relative aspect-[1.414/1] w-full max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-red-500/20"
          style={{
            backgroundColor: "#0A0507",
            backgroundImage:
              "radial-gradient(45% 40% at 88% -8%, rgba(225,29,46,0.17), transparent 62%), radial-gradient(40% 38% at -8% 42%, rgba(245,158,11,0.08), transparent 58%), linear-gradient(180deg, #0A0507 0%, #170709 100%)",
          }}
        >
          {/* Guilloché frame + phantom document surface */}
          <div className="gx-guilloche absolute inset-0">
            <div className="gx-guilloche-inner h-full w-full">
              <div className="gx-aurora-mesh gx-grain relative h-full w-full overflow-hidden">
                <div className="gx-corner-glows" />
                <div className="gx-watermark" />
                <div className="gx-scanlines" />
                <div className="gx-hud-corners"><span /></div>

                {/* top-left: institute registration number */}
                <div
                  className="absolute top-[6.5%] left-[9%] text-[7px] sm:text-[9px] font-mono tracking-[0.2em] uppercase whitespace-nowrap"
                  style={{ color: "rgba(225,29,46,0.75)" }}
                >
                  reg. no. UDYAM-JK-03-0034470
                </div>

                {/* top-right: classification chips */}
                <div className="absolute top-[6%] right-[9%] flex gap-1.5 sm:gap-2">
                  <span
                    className="text-[6px] sm:text-[8px] font-mono tracking-[0.2em] uppercase rounded-full px-2 py-0.5 whitespace-nowrap"
                    style={{ color: "#86EFAC", border: "0.5px solid rgba(34,197,94,0.55)", background: "rgba(34,197,94,0.10)" }}
                  >
                    ✓ verified credential
                  </span>
                  <span
                    className="text-[6px] sm:text-[8px] font-mono tracking-[0.2em] uppercase rounded-full px-2 py-0.5 whitespace-nowrap"
                    style={{ color: "#FCA5A5", border: "0.5px solid rgba(225,29,46,0.55)", background: "rgba(225,29,46,0.12)" }}
                  >
                    gx blackops clearance
                  </span>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center text-center px-10 sm:px-14 pt-[7%]">
                  {/* logo ring + brand */}
                  <div
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center"
                    style={{ border: "0.8px solid rgba(225,29,46,0.9)", background: "rgba(255,255,255,0.05)", boxShadow: "0 0 0 4px rgba(225,29,46,0.14)" }}
                  >
                    <img src="/guardianx-logo-v2.png" alt="GuardianX" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                  </div>
                  <div className="text-[8px] sm:text-[10px] font-mono tracking-[0.34em] mt-2" style={{ color: "rgba(250,247,245,0.62)" }}>
                    GUARDIANX ACADEMY &nbsp;·&nbsp; CYBER DEFENSE INSTITUTE
                  </div>
                  <div className="text-[7px] sm:text-[9px] font-mono tracking-[0.14em] mt-1" style={{ color: "rgba(250,247,245,0.62)" }}>
                    <span style={{ color: "#E11D2E", fontWeight: 700 }}>root@gx:~$</span> guardianx issue --recipient &quot;{cert.candidateName}&quot; --score {cert.percentage}% <span style={{ color: "#22C55E" }}>--verified ✓</span>
                  </div>

                  <div className="text-[8px] sm:text-[10px] font-mono tracking-[0.5em] uppercase mt-2.5" style={{ color: "#F59E0B" }}>
                    · of completion ·
                  </div>
                  <div className="text-2xl sm:text-4xl font-bold mt-1" style={{ color: "#E11D2E", letterSpacing: "0.4em", paddingLeft: "0.4em", lineHeight: 1.05 }}>
                    CERTIFICATE
                  </div>

                  <div className="mt-2.5 sm:mt-3">
                    <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.32em]" style={{ color: "rgba(250,247,245,0.62)" }}>
                      THIS CERTIFICATE IS PROUDLY PRESENTED TO
                    </div>
                    <div className="gx-script text-2xl sm:text-4xl italic leading-tight mt-1" style={{ color: "#FAF7F5" }}>
                      {cert.candidateName}
                    </div>
                    <hr className="gx-gradient-rule w-56 sm:w-72 mt-2" />
                  </div>

                  <div className="mt-2 sm:mt-3">
                    <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.3em] uppercase" style={{ color: "rgba(250,247,245,0.62)" }}>
                      for successfully completing the cyber security awareness assessment
                    </div>
                    <div className="text-base sm:text-xl font-bold mt-1" style={{ color: "#FAF7F5" }}>
                      Cyber Security Foundation
                    </div>
                    <div className="text-[7px] sm:text-[9px] mt-1" style={{ color: "rgba(250,247,245,0.62)" }}>
                      issued by <span className="font-semibold" style={{ color: "#E11D2E" }}>GuardianX Academy</span> &nbsp;·&nbsp; Cyber Awareness Quiz &nbsp;·&nbsp; {DIFFICULTY_LABELS[cert.difficulty] || cert.difficulty} Level
                    </div>
                    <div className="text-[7px] sm:text-[9px] font-mono tracking-[0.22em] uppercase mt-1.5" style={{ color: "#F59E0B" }}>
                      final score {cert.percentage}%{cert.percentage >= 85 ? " · with distinction" : cert.percentage >= 65 ? " · with merit" : ""}
                    </div>
                  </div>

                  {/* signature row */}
                  <div className="mt-auto w-full max-w-xl grid grid-cols-2 gap-6 mb-[13%]">
                    <div className="text-center">
                      <div className="gx-script text-base sm:text-xl italic" style={{ color: "#FAF7F5" }}>GuardianX Academy</div>
                      <div className="border-t pt-1 mx-4 mt-1" style={{ borderColor: "rgba(225,29,46,0.55)" }}>
                        <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.3em] uppercase" style={{ color: "rgba(250,247,245,0.62)" }}>Assessment Lead</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="gx-script text-base sm:text-xl italic" style={{ color: "#FAF7F5" }}>GuardianX Academy</div>
                      <div className="border-t pt-1 mx-4 mt-1" style={{ borderColor: "rgba(225,29,46,0.55)" }}>
                        <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.3em] uppercase" style={{ color: "rgba(250,247,245,0.62)" }}>Program Director</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* seal bottom-left */}
                <div className="absolute left-[6%] bottom-[13%] hidden sm:block">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="gx-seal-phantom w-14 h-14 rounded-full" />
                    <div className="absolute inset-1.5 rounded-full border border-dashed border-white/50" />
                    <ShieldCheck className="absolute h-6 w-6 text-white/95" />
                  </div>
                </div>

                {/* SHA-256 fingerprint band */}
                <div className="absolute left-[7%] right-[7%] bottom-[10%] flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.14)" }} />
                  <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.16em] whitespace-nowrap" style={{ color: "rgba(225,29,46,0.55)" }}>
                    SHA-256 {cert.credentialId.replace(/[^A-Z0-9]/gi, "").padEnd(44, "0").slice(0, 44).replace(/(..)/g, "$1 ").trim()}
                  </div>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.14)" }} />
                </div>

                {/* verification strip */}
                <div
                  className="absolute left-[5%] right-[5%] bottom-[4%] h-[9.5%] rounded-xl flex items-center gap-3 px-4"
                  style={{ background: "rgba(8,4,5,0.78)", border: "0.5px solid rgba(255,255,255,0.14)" }}
                >
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-white flex items-center justify-center overflow-hidden shrink-0">
                    <QRCodeSVG value={cert.verificationUrl || `https://academy.guardianx.cloud/verify?id=${cert.credentialId}`} size={64} level="M" bgColor="#FFFFFF" fgColor="#111111" className="h-7 w-7 sm:h-9 sm:w-9" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.24em] uppercase" style={{ color: "rgba(250,247,245,0.62)" }}>Credential ID</div>
                    <div className="text-[9px] sm:text-[11px] font-mono truncate" style={{ color: "#FAF7F5" }}>{cert.credentialId}</div>
                  </div>
                  <div className="self-stretch my-2 w-px shrink-0" style={{ background: "rgba(255,255,255,0.14)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.24em] uppercase" style={{ color: "rgba(250,247,245,0.62)" }}>Verify at</div>
                    <div className="text-[8px] sm:text-[10px] font-mono truncate" style={{ color: "#FAF7F5" }}>
                      {cert.verificationUrl || `academy.guardianx.cloud/verify?id=${cert.credentialId}`}
                    </div>
                  </div>
                  <div className="self-stretch my-2 w-px shrink-0 hidden sm:block" style={{ background: "rgba(255,255,255,0.14)" }} />
                  <div className="hidden sm:block shrink-0 text-right">
                    <div className="text-[6px] sm:text-[8px] font-mono tracking-[0.24em] uppercase" style={{ color: "rgba(250,247,245,0.62)" }}>Date of issue</div>
                    <div className="text-[9px] sm:text-[11px] font-mono" style={{ color: "#FAF7F5" }}>{issueDate}</div>
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
