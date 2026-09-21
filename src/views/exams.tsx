"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"
import {
  Award, ShieldCheck, Camera, Monitor, Clock, CheckCircle2,
  Lock, Eye, AlertTriangle, ArrowRight, Trophy, FileCheck,
  Video, Mic, Maximize, ScanFace, Gauge, ListChecks, Loader2,
  TrendingUp, Target,
} from "lucide-react"

interface GuardianCert {
  id: string
  slug: string
  name: string
  description: string | null
  level: string
  domains: string[]
  skills: string[]
  passingScore: number
  validityPeriod: number
  icon: string
  color: string
}

interface ExamListItem {
  id: string
  slug: string
  title: string
  description: string | null
  duration: number
  passingScore: number
  maxAttempts: number
  questionCount: number
  proctoringEnabled: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  certification: {
    id: string
    name: string
    slug: string
    level: string
    icon: string
    color: string
  } | null
  userAttempts: Array<{ examId: string; status: string; score: number | null; createdAt: string }>
  readinessScore: number | null
  attemptsCount: number
}

export function ExamsView() {
  const { navigate } = useAppStore()
  const { user } = useUser()

  const { data: certsData } = useQuery({
    queryKey: ["guardian-certifications"],
    queryFn: async () => {
      const res = await fetch("/api/guardian-certifications")
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60_000,
  })

  const certifications: GuardianCert[] = certsData?.certifications ?? FALLBACK_CERTS

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      {/* HERO */}
      <section className="relative py-6 lg:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-300 bg-violet-500/5">
              <ShieldCheck className="h-3 w-3 mr-1.5" /> GUARDIANX PROCTORED EXAMS
            </Badge>
            <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
              Train. Test.{" "}
              <span className="text-gradient-premium">Prove.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              GuardianX doesn&apos;t stop at teaching. Candidates can be evaluated through mock exams,
              practical assessments, and proctored examinations. Successful candidates earn GuardianX credentials.
            </p>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">HOW IT WORKS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">The certification journey.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "01", icon: FileCheck, title: "Prepare", desc: "Complete courses, labs, and mock exams to build readiness.", color: "text-violet-300", bg: "bg-violet-500/10" },
              { step: "02", icon: Clock, title: "Schedule", desc: "Choose an exam slot that fits your schedule.", color: "text-cyan-300", bg: "bg-cyan-500/10" },
              { step: "03", icon: Camera, title: "Take Exam", desc: "Complete the proctored exam with identity verification and monitoring.", color: "text-amber-300", bg: "bg-amber-500/10" },
              { step: "04", icon: Award, title: "Get Certified", desc: "Pass and receive a verifiable GuardianX credential.", color: "text-emerald-300", bg: "bg-emerald-500/10" },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("inline-flex p-2.5 rounded-lg", s.bg)}>
                    <s.icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{s.step}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* YOUR EXAM READINESS - only shown to authenticated users */}
      {user && <ExamReadinessSection />}

      {/* GUARDIANX CERTIFICATIONS */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">GUARDIANX CERTIFICATIONS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">Earn verifiable credentials.</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              GuardianX certifications are issued upon successful completion of GuardianX&apos;s own training and assessment requirements.
              They are distinct from official external certifications.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {certifications.map((cert, i) => (
              <motion.div key={cert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="card-premium rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("inline-flex p-2.5 rounded-lg bg-violet-500/10", cert.color)}>
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{cert.name}</h3>
                      <Badge variant="outline" className={cn("text-[9px] font-mono mt-1", cert.color)}>{cert.level}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{cert.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {cert.domains.slice(0, 4).map((d) => (
                    <span key={d} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card border border-border/60 text-muted-foreground">{d}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
                  <span>Pass: <span className="text-foreground font-semibold">{cert.passingScore}%</span></span>
                  <span>Valid: <span className="text-foreground font-semibold">{cert.validityPeriod} months</span></span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCTORING FEATURES */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">PROCTORING FEATURES</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">Secure, monitored examinations.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: ScanFace, title: "Identity Verification", desc: "Verify candidate identity before exam starts.", color: "text-violet-300", bg: "bg-violet-500/10" },
              { icon: Camera, title: "Camera Monitoring", desc: "Camera check and live monitoring during exam.", color: "text-cyan-300", bg: "bg-cyan-500/10" },
              { icon: Monitor, title: "Screen Sharing", desc: "Screen permission required for full exam duration.", color: "text-amber-300", bg: "bg-amber-500/10" },
              { icon: Maximize, title: "Fullscreen Mode", desc: "Exam runs in fullscreen to prevent tab switching.", color: "text-emerald-300", bg: "bg-emerald-500/10" },
              { icon: Eye, title: "Tab Switch Detection", desc: "Automatic flags on tab/window changes.", color: "text-rose-300", bg: "bg-rose-500/10" },
              { icon: Mic, title: "Microphone Check", desc: "Audio monitoring for suspicious activity.", color: "text-teal-300", bg: "bg-teal-500/10" },
              { icon: AlertTriangle, title: "Incident Flags", desc: "Automated and manual incident recording.", color: "text-amber-300", bg: "bg-amber-500/10" },
              { icon: Lock, title: "Audit Logs", desc: "Immutable audit trail for all exam actions.", color: "text-violet-300", bg: "bg-violet-500/10" },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }} className="rounded-xl border border-border/60 bg-card p-4">
                <div className={cn("inline-flex p-2 rounded-lg mb-3", f.bg)}>
                  <f.icon className={cn("h-4 w-4", f.color)} />
                </div>
                <h3 className="font-semibold text-xs mb-1">{f.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EXAM TYPES */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">EXAM TYPES</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">Comprehensive assessment formats.</h2>
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              "Multiple Choice (MCQ)", "Multiple Response", "True/False", "Scenario Questions",
              "Case Studies", "Practical Labs", "Flag Submission", "Configuration Tasks",
              "Incident Analysis", "Report Writing", "Hybrid Examinations",
            ].map((type, i) => (
              <div key={type} className="rounded-lg border border-border/60 bg-card px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {type}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 lg:py-12 border-t border-border/40 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Trophy className="h-8 w-8 text-violet-300 mx-auto mb-4" />
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
            Ready to prove your skills?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Start your exam journey and earn a verifiable GuardianX credential.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => navigate({ name: "login" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm">
              START YOUR EXAM JOURNEY <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ name: "catalog" })} className="px-6 py-6 text-sm">
              EXPLORE TRAINING
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ============================================================
   ExamReadinessSection - authenticated-only block that shows
   each published exam + a readiness score (avg of last 3 attempts)
   ============================================================ */

function ExamReadinessSection() {
  const { navigate } = useAppStore()

  const { data, isLoading, isError } = useQuery<{ exams: ExamListItem[] }>({
    queryKey: ["exams-list"],
    queryFn: async () => {
      const res = await fetch("/api/exams", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load exams")
      return res.json()
    },
    staleTime: 30_000,
  })

  const exams = data?.exams ?? []

  return (
    <section className="py-6 lg:py-8 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-2">YOUR EXAM READINESS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">
              How ready are you?
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Your readiness score is the average of your last 3 attempts for each exam.
              Not attempted yet? Start one to see your readiness grow.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-300 border-emerald-500/30 bg-emerald-500/5">
            <TrendingUp className="h-3 w-3 mr-1.5" />
            {exams.length} {exams.length === 1 ? "exam" : "exams"} available
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="p-6 border-rose-500/30 bg-rose-500/5 text-sm text-rose-200">
            Couldn&apos;t load your exam readiness. Please try again later.
          </Card>
        ) : exams.length === 0 ? (
          <Card className="p-6 border-border/60 text-sm text-muted-foreground">
            No published exams yet. Check back soon.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam, i) => (
              <motion.button
                key={exam.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => navigate({ name: "exam-detail", examId: exam.id })}
                className="text-left rounded-xl border border-border/60 bg-card p-5 hover:border-violet-500/40 hover:bg-accent/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-violet-200">
                      {exam.title}
                    </h3>
                    {exam.certification && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {exam.certification.name} · {exam.certification.level}
                      </p>
                    )}
                  </div>
                  {exam.proctoringEnabled && (
                    <Badge variant="outline" className="text-[9px] font-mono uppercase text-rose-300 border-rose-500/30 bg-rose-500/10 shrink-0">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Proctored
                    </Badge>
                  )}
                </div>

                {/* Readiness meter */}
                <ReadinessMeter
                  readinessScore={exam.readinessScore}
                  passingScore={exam.passingScore}
                />

                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                  <div className="flex flex-col">
                    <Clock className="h-3 w-3 text-cyan-300 mb-1" />
                    <span className="font-mono">{exam.duration}m</span>
                  </div>
                  <div className="flex flex-col">
                    <ListChecks className="h-3 w-3 text-violet-300 mb-1" />
                    <span className="font-mono">{exam.questionCount} Q</span>
                  </div>
                  <div className="flex flex-col">
                    <Target className="h-3 w-3 text-emerald-300 mb-1" />
                    <span className="font-mono">Pass {exam.passingScore}%</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground">
                    {exam.attemptsCount > 0
                      ? `${exam.attemptsCount} attempt${exam.attemptsCount === 1 ? "" : "s"}`
                      : "Not attempted yet"}
                  </span>
                  <span className="text-[10px] font-mono text-violet-300 inline-flex items-center group-hover:translate-x-0.5 transition-transform">
                    View exam <ArrowRight className="h-3 w-3 ml-1" />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ReadinessMeter({
  readinessScore,
  passingScore,
}: {
  readinessScore: number | null
  passingScore: number
}) {
  if (readinessScore === null) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-center">
        <p className="text-[11px] text-muted-foreground">
          Not attempted yet
        </p>
      </div>
    )
  }

  const passed = readinessScore >= passingScore
  const color = passed ? "text-emerald-300" : "text-amber-300"
  const barColor = passed ? "bg-emerald-500" : "bg-amber-500"
  const label = passed ? "Likely to pass" : "Below pass mark"

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center">
          <Gauge className={cn("h-3 w-3 mr-1", color)} />
          Readiness
        </span>
        <span className={cn("text-xs font-bold font-mono", color)}>
          {readinessScore}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, readinessScore))}%` }}
        />
      </div>
      <div className={cn("text-[10px] mt-1.5", color)}>
        {label} · pass mark {passingScore}%
      </div>
    </div>
  )
}

const FALLBACK_CERTS: GuardianCert[] = [
  {
    id: "1", slug: "gx-security-analyst", name: "GX Certified Security Analyst",
    description: "Foundational cybersecurity knowledge across network, web, and system security domains.",
    level: "Beginner", domains: ["Network Security", "Web Security", "System Admin"], skills: ["Threat Detection", "Vulnerability Assessment"],
    passingScore: 70, validityPeriod: 36, icon: "Award", color: "text-violet-300",
  },
  {
    id: "2", slug: "gx-penetration-tester", name: "GX Certified Penetration Tester",
    description: "Offensive security skills including reconnaissance, exploitation, and privilege escalation.",
    level: "Advanced", domains: ["Ethical Hacking", "Web Exploitation", "Privilege Escalation"], skills: ["Nmap", "Burp Suite", "Metasploit"],
    passingScore: 75, validityPeriod: 24, icon: "Award", color: "text-cyan-300",
  },
  {
    id: "3", slug: "gx-soc-analyst", name: "GX Certified SOC Analyst",
    description: "Defensive security operations including log analysis, incident response, and threat hunting.",
    level: "Intermediate", domains: ["SOC", "Incident Response", "Log Analysis"], skills: ["SIEM", "IDS/IPS", "Threat Hunting"],
    passingScore: 70, validityPeriod: 36, icon: "Award", color: "text-amber-300",
  },
  {
    id: "4", slug: "gx-grc-professional", name: "GX Certified GRC Professional",
    description: "Governance, risk, and compliance knowledge including frameworks, audit, and policy.",
    level: "Intermediate", domains: ["GRC", "Risk Management", "Compliance"], skills: ["ISO 27001", "NIST", "SOC 2"],
    passingScore: 70, validityPeriod: 36, icon: "Award", color: "text-emerald-300",
  },
]
