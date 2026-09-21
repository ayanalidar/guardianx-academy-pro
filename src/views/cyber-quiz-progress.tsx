"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
} from "recharts"
import {
  Loader2, AlertCircle, ArrowLeft, ArrowRight, Award,
  TrendingUp, Target, FileBadge, Download, Fingerprint,
  ShieldCheck, Brain,
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

const DOMAINS = ["Phishing", "Passwords", "Social Engineering", "Web Safety", "Mobile Security", "Data Privacy", "Malware", "Wi-Fi Safety"]

const DOMAIN_ICONS: Record<string, any> = {
  Phishing: ShieldCheck,
  Passwords: ShieldCheck,
  "Social Engineering": Brain,
  "Web Safety": ShieldCheck,
  "Mobile Security": ShieldCheck,
  "Data Privacy": ShieldCheck,
  Malware: ShieldCheck,
  "Wi-Fi Safety": ShieldCheck,
}

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  Phishing: "Detecting fraudulent emails, messages, and websites designed to steal credentials or install malware.",
  Passwords: "Creating, storing, and managing strong passwords. Understanding password managers, 2FA, and common password attacks.",
  "Social Engineering": "Recognizing manipulation tactics - pretexting, baiting, tailgating, vishing, and business email compromise.",
  "Web Safety": "Safe browsing, HTTPS, URL inspection, malicious downloads, browser security, and avoiding fake login pages.",
  "Mobile Security": "App permissions, sideloading risks, mobile malware, lost-device protection, and secure messaging.",
  "Data Privacy": "Personal data protection, GDPR/DPDP awareness, oversharing on social media, and data breach response.",
  Malware: "Identifying ransomware, spyware, Trojans, rootkits. Understanding how malware spreads + how to respond.",
  "Wi-Fi Safety": "Public Wi-Fi risks, evil-twin attacks, VPN usage, home router security, and Bluetooth/NFC awareness.",
}

export function CyberQuizProgressView() {
  const { view, navigate } = useAppStore()
  const credentialId = (view as any)?.credentialId as string

  const { data, isLoading, error } = useQuery<CertResponse>({
    queryKey: ["cyber-quiz-cert-progress", credentialId],
    queryFn: async () => {
      const r = await fetch(`/api/cyber-quiz/certificate/${credentialId}`)
      if (!r.ok) throw new Error("Certificate not found")
      return r.json()
    },
    enabled: !!credentialId,
  })

  const reportRef = React.useRef<HTMLDivElement>(null)

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
          <p className="text-sm font-medium mb-1">Progress report not found</p>
          <Button onClick={() => navigate({ name: "verify" })} variant="outline" size="sm" className="mt-3">
            <Fingerprint className="h-4 w-4 mr-1.5" /> Verify a certificate
          </Button>
        </div>
      </main>
    )
  }

  const { certificate: cert, domainScores } = data

  // Build radar data
  const radarData = DOMAINS.map((d) => {
    const s = domainScores[d] || { correct: 0, total: 1 }
    return {
      domain: d.length > 12 ? d.split(" ")[0] : d,
      fullName: d,
      score: Math.round((s.correct / s.total) * 100),
      correct: s.correct,
      total: s.total,
    }
  }).filter((d) => d.total > 0)

  // Strength tiers
  const strengthTier = (pct: number) => {
    if (pct >= 90) return { label: "Expert", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40" }
    if (pct >= 75) return { label: "Strong", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/40" }
    if (pct >= 50) return { label: "Developing", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/40" }
    return { label: "Needs work", color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/40" }
  }

  const issueDate = new Date(cert.issueDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  })

  // Find strongest + weakest domains
  const sorted = [...radarData].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  const handleDownload = async () => {
    if (!reportRef.current) return
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#0a0a0f",
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height)
      pdf.save(`${cert.credentialId}-progress-report.pdf`)
      toast.success("Progress report downloaded as PDF")
    } catch (e) {
      console.error("Download failed:", e)
      toast.error("Download failed. Please try again.")
    }
  }

  return (
    <main className="relative min-h-screen pb-16">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute top-40 left-0 w-[500px] h-[300px] bg-cyan-500/6 blur-[100px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="inline-flex p-3 rounded-full bg-violet-500/10 mb-4 shadow-[0_0_30px_-8px] shadow-violet-500/40">
            <FileBadge className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">Progress Report</h1>
          <p className="text-sm text-muted-foreground">Your strengths across 8 cyber security domains.</p>
        </motion.div>

        {/* Download button */}
        <div className="flex justify-center mb-6">
          <Button onClick={handleDownload} size="sm" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
            <Download className="h-4 w-4 mr-1.5" /> Download as PDF
          </Button>
        </div>

        {/* ===== Report card (printable) ===== */}
        <motion.div
          ref={reportRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-[#0d0d18] via-[#13132a] to-[#0a0a14] shadow-2xl shadow-violet-500/20 overflow-hidden"
        >
          {/* Report header */}
          <div className="border-b border-violet-500/20 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/guardianx-logo-v2.png" alt="GuardianX" className="h-8 w-8 object-contain" style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.5))" }} />
              <div>
                <div className="text-sm font-bold leading-none">
                  Guardian<span className="text-violet-400">X</span> Academy
                </div>
                <div className="text-[8px] font-mono text-muted-foreground tracking-[0.25em] mt-0.5">CYBER SECURITY FOUNDATION</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-mono text-muted-foreground tracking-[0.2em] uppercase">Credential</div>
              <div className="text-xs font-mono font-semibold text-violet-300">{cert.credentialId}</div>
            </div>
          </div>

          {/* Candidate info */}
          <div className="px-6 py-5 border-b border-violet-500/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">Candidate</div>
                <div className="text-sm font-semibold">{cert.candidateName}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">Difficulty</div>
                <div className="text-sm font-semibold">{cert.difficulty}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">Score</div>
                <div className="text-sm font-semibold tabular-nums">{cert.score}/{cert.totalQuestions} ({cert.percentage}%)</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">Issue date</div>
                <div className="text-sm font-semibold">{issueDate}</div>
              </div>
            </div>
          </div>

          {/* Overall verdict */}
          <div className="px-6 py-5 border-b border-violet-500/20">
            <div className="flex items-start gap-3">
              <div className="inline-flex p-2 rounded-lg bg-violet-500/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">Overall verdict</div>
                {cert.percentage >= 75 ? (
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold text-emerald-300">Strong performance.</span> {cert.candidateName} demonstrates a solid grasp of cyber security fundamentals across most domains. Consider tackling the Advanced difficulty next to push further.
                  </p>
                ) : cert.percentage >= 50 ? (
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold text-violet-300">Good foundation.</span> {cert.candidateName} has a working understanding of cyber security awareness. Review the weaker domains below to strengthen the gaps.
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold text-amber-300">Passed with room to grow.</span> {cert.candidateName} met the minimum pass mark. We recommend reviewing the weakest domains and retaking the quiz to consolidate learning.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Radar chart */}
          <div className="px-6 py-6 border-b border-violet-500/20">
            <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-4">
              Domain strength overview
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="rgba(124, 58, 237, 0.15)" />
                  <PolarAngleAxis dataKey="domain" tick={{ fill: "oklch(0.7 0.02 270)", fontSize: 11, fontFamily: "monospace" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "rgba(124, 58, 237, 0.3)", fontSize: 9 }} stroke="rgba(124, 58, 237, 0.2)" />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#a78bfa"
                    fill="#7c3aed"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-domain breakdown */}
          <div className="px-6 py-6 border-b border-violet-500/20">
            <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-4">
              Detailed domain scores
            </div>
            <div className="space-y-3">
              {radarData.map((d) => {
                const tier = strengthTier(d.score)
                const Icon = DOMAIN_ICONS[d.fullName] || ShieldCheck
                return (
                  <div key={d.fullName} className="flex items-start gap-3">
                    <div className="inline-flex p-1.5 rounded-md bg-muted/30 shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-xs font-semibold">{d.fullName}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[9px] font-mono", tier.color, tier.border, tier.bg)}>
                            {tier.label}
                          </Badge>
                          <div className="text-xs font-mono tabular-nums text-muted-foreground">
                            {d.correct}/{d.total} · {d.score}%
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                        <motion.div
                          className={cn("h-full rounded-full", tier.color.replace("text-", "bg-"))}
                          initial={{ width: 0 }}
                          animate={{ width: `${d.score}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {DOMAIN_DESCRIPTIONS[d.fullName]}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Highlights */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-violet-500/20">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-[9px] font-mono text-emerald-300/80 tracking-[0.2em] uppercase mb-1">Strongest domain</div>
              <div className="text-sm font-semibold">{strongest?.fullName}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{strongest?.score}% ({strongest?.correct}/{strongest?.total})</div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
              <div className="text-[9px] font-mono text-rose-300/80 tracking-[0.2em] uppercase mb-1">Focus area</div>
              <div className="text-sm font-semibold">{weakest?.fullName}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{weakest?.score}% ({weakest?.correct}/{weakest?.total})</div>
            </div>
          </div>

          {/* Bar chart - alternative view */}
          <div className="px-6 py-6">
            <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-4">
              Score comparison by domain
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={radarData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="domain" tick={{ fill: "oklch(0.7 0.02 270)", fontSize: 9, fontFamily: "monospace" }} stroke="rgba(124, 58, 237, 0.2)" />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(124, 58, 237, 0.3)", fontSize: 9 }} stroke="rgba(124, 58, 237, 0.2)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#13132a",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a78bfa" }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {radarData.map((d, i) => {
                      const tier = strengthTier(d.score)
                      const fill = d.score >= 90 ? "#34d399" : d.score >= 75 ? "#22d3ee" : d.score >= 50 ? "#a78bfa" : "#fb7185"
                      return <Cell key={i} fill={fill} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-violet-500/20 flex items-center justify-between">
            <div className="text-[8px] font-mono text-muted-foreground tracking-wider">
              {cert.verificationUrl || `academy.guardianx.cloud/verify?id=${cert.credentialId}`}
            </div>
            <div className="text-[8px] font-mono text-muted-foreground tracking-wider">
              Generated {issueDate}
            </div>
          </div>
        </motion.div>

        {/* Below the report: quick links */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-6"
        >
          <Button onClick={() => navigate({ name: "cyber-quiz-certificate", credentialId: cert.credentialId } as any)} variant="outline" size="sm" className="border-violet-500/30 hover:bg-violet-500/10">
            <Award className="h-4 w-4 mr-1.5" /> View certificate <ArrowRight className="h-4 w-4 ml-1.5" />
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
