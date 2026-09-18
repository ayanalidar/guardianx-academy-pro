"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/platform/empty-state"
import {
  Users, GraduationCap, Award, ArrowRight, Briefcase,
  Sparkles, BookOpen, Calendar, ExternalLink, ShieldCheck,
  Target, MessageSquare, Sword, ShieldAlert, Network, Cloud,
  Gavel, Globe, KeyRound, FileSearch, Search, UserCheck,
  Video, Terminal, Trophy, Mail,
} from "lucide-react"

/* ============================================================
   /instructors — public listing of all INSTRUCTOR users with
   their InstructorProfile data. (master-prompt §25)
   ============================================================ */

interface InstructorRow {
  id: string
  name: string
  avatar: string | null
  title: string | null
  bio: string | null
  expertise: string[]
  yearsExperience: number
  certifications: string[]
  maxBatches: number
  coursesCount: number
  batchesCount: number
  learnersCount: number
  createdAt: string
}

const ACCENTS = [
  { tint: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30", ring: "ring-violet-500/20" },
  { tint: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30", ring: "ring-cyan-500/20" },
  { tint: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", ring: "ring-amber-500/20" },
  { tint: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30", ring: "ring-emerald-500/20" },
  { tint: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30", ring: "ring-rose-500/20" },
]

/* ---- Section: Why learn from GuardianX instructors ---- */
const WHY_FEATURES = [
  {
    icon: ShieldCheck,
    title: "Industry-Verified Expertise",
    desc: "Every instructor is vetted by the GuardianX team — credentials checked, references verified, teaching sample reviewed.",
    tint: "text-violet-300",
    tintBg: "bg-violet-500/10",
  },
  {
    icon: Briefcase,
    title: "Real-World Experience",
    desc: "Instructors work in the field, not just theory. Pentests, SOC shifts, GRC audits — they teach what they did last week.",
    tint: "text-cyan-300",
    tintBg: "bg-cyan-500/10",
  },
  {
    icon: Award,
    title: "Certified Professionals",
    desc: "CEH, OSCP, CISSP, CCNA, CCNP, and more. Every instructor holds the certifications they train you for.",
    tint: "text-amber-300",
    tintBg: "bg-amber-500/10",
  },
  {
    icon: Terminal,
    title: "Hands-On Teaching",
    desc: "Learn by doing, not just watching slides. Labs, capture-the-flag, live exercises — applied from minute one.",
    tint: "text-emerald-300",
    tintBg: "bg-emerald-500/10",
  },
  {
    icon: MessageSquare,
    title: "Personalized Feedback",
    desc: "Direct feedback on assignments, labs, and mock exams. No black-box grading — your instructor reviews your work.",
    tint: "text-rose-300",
    tintBg: "bg-rose-500/10",
  },
  {
    icon: Calendar,
    title: "Flexible Sessions",
    desc: "Live sessions at times that work for you. Morning, evening, weekend batches across multiple time zones.",
    tint: "text-violet-300",
    tintBg: "bg-violet-500/10",
  },
] as const

/* ---- Section: Instructor expertise domains ---- */
const EXPERTISE_DOMAINS = [
  {
    icon: Sword,
    title: "Offensive Security",
    desc: "Penetration testing, red team operations, exploit development, adversary emulation.",
    keywords: ["offensive", "penetration", "pentest", "red team", "exploit"],
    tint: "text-rose-300",
    tintBg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  {
    icon: ShieldAlert,
    title: "Defensive Security",
    desc: "SOC operations, threat hunting, SIEM engineering, detection and response.",
    keywords: ["defensive", "blue team", "soc", "threat hunting", "siem", "detection"],
    tint: "text-cyan-300",
    tintBg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    icon: Network,
    title: "Network Security",
    desc: "Cisco CCNA/CCNP, firewalls, routing & switching, segmentation, zero-trust.",
    keywords: ["network", "cisco", "routing", "firewall", "ccna", "ccnp", "switching"],
    tint: "text-violet-300",
    tintBg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Cloud,
    title: "Cloud Security",
    desc: "AWS, Azure, GCP hardening, container & Kubernetes security, CSPM.",
    keywords: ["cloud", "aws", "azure", "gcp", "container", "kubernetes"],
    tint: "text-sky-300",
    tintBg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  {
    icon: Gavel,
    title: "GRC",
    desc: "Governance, risk management, compliance — ISO 27001, SOC 2, PCI-DSS, NIST.",
    keywords: ["grc", "governance", "risk", "compliance", "iso", "soc 2", "audit"],
    tint: "text-amber-300",
    tintBg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: Globe,
    title: "Web Security",
    desc: "OWASP Top 10, WAPT, bug bounty hunting, API & application security.",
    keywords: ["web", "wapt", "owasp", "bug bounty", "application"],
    tint: "text-emerald-300",
    tintBg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: KeyRound,
    title: "IAM",
    desc: "Identity & access management, CyberArk PAM, Okta, zero-trust identity.",
    keywords: ["iam", "identity", "cyberark", "pam", "privileged", "okta"],
    tint: "text-fuchsia-300",
    tintBg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
  },
  {
    icon: FileSearch,
    title: "DFIR",
    desc: "Digital forensics, malware analysis, incident response, memory & disk analysis.",
    keywords: ["dfir", "forensic", "incident response", "malware", "memory"],
    tint: "text-indigo-300",
    tintBg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
] as const

/* ---- Section: How instructor-led training works ---- */
const TRAINING_STEPS = [
  { num: "01", icon: Search, title: "Choose Your Course", desc: "Browse the catalog and pick a course aligned to your certification goal." },
  { num: "02", icon: UserCheck, title: "Get Matched with an Instructor", desc: "We pair you with an instructor whose expertise matches your track." },
  { num: "03", icon: Video, title: "Attend Live Sessions", desc: "Join live, interactive sessions — ask questions, watch demos, take notes." },
  { num: "04", icon: Terminal, title: "Practice with Labs", desc: "Apply what you learned in hands-on labs, CTFs, and mock exams." },
  { num: "05", icon: Trophy, title: "Get Certified", desc: "Pass the exam, earn your GuardianX credential, and update your CV." },
] as const

function countDomain(instructors: InstructorRow[], keywords: string[]): number {
  return instructors.filter((instr) =>
    instr.expertise.some((tag) =>
      keywords.some((kw) => tag.toLowerCase().includes(kw.toLowerCase())),
    ),
  ).length
}

function initials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function InstructorsView() {
  const { navigate } = useAppStore()
  const { data, isLoading, isError } = useQuery<{ instructors: InstructorRow[]; count: number }>({
    queryKey: ["public-instructors"],
    queryFn: async () => {
      const res = await fetch("/api/instructors")
      if (!res.ok) return { instructors: [], count: 0 }
      return res.json()
    },
    staleTime: 60_000,
  })

  const instructors = data?.instructors ?? []

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      {/* subtle violet glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* HERO */}
      <section className="relative py-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline" className="mb-5 border-violet-500/30 text-violet-300 bg-violet-500/5">
              <Users className="h-3 w-3 mr-1.5" /> GUARDIANX INSTRUCTORS
            </Badge>
            <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] mb-4 text-balance">
              Learn from people who have{" "}
              <span className="text-gradient-premium">done the work.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every GuardianX instructor has shipped production security work — pentests, SOC operations,
              GRC programs, cloud hardening. No career academics. Just operators teaching what they actually do.
            </p>
          </motion.div>

          {/* Mini stats row */}
          {instructors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5"
            >
              <StatChip icon={Users} value={instructors.length} label="Instructors" tint="text-violet-300" />
              <StatChip
                icon={BookOpen}
                value={instructors.reduce((a, i) => a + i.coursesCount, 0)}
                label="Courses taught"
                tint="text-cyan-300"
              />
              <StatChip
                icon={Calendar}
                value={instructors.reduce((a, i) => a + i.batchesCount, 0)}
                label="Active batches"
                tint="text-amber-300"
              />
              <StatChip
                icon={GraduationCap}
                value={instructors.reduce((a, i) => a + i.learnersCount, 0)}
                label="Learners reached"
                tint="text-emerald-300"
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* GRID */}
      <section className="relative py-8 lg:py-10 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-xl border border-border/60 bg-card animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
              <p className="text-sm text-rose-300">Failed to load instructors. Please try again later.</p>
            </div>
          ) : instructors.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No instructors published yet."
              description="Our team is being assembled. Check back soon, or reach out to ask about a specific course."
              actionLabel="Contact us"
              onAction={() => navigate({ name: "contact" })}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {instructors.map((instr, i) => {
                const accent = ACCENTS[i % ACCENTS.length]!
                return (
                  <motion.div
                    key={instr.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="card-premium rounded-2xl p-6 flex flex-col"
                  >
                    {/* Avatar + name */}
                    <div className="flex items-start gap-4 mb-4">
                      {instr.avatar ? (
                        <img
                          src={instr.avatar}
                          alt={instr.name}
                          className={cn("h-14 w-14 rounded-xl object-cover ring-2", accent.border)}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className={cn(
                            "h-14 w-14 rounded-xl flex items-center justify-center text-lg font-bold ring-2",
                            accent.tint, accent.text, accent.border,
                          )}
                        >
                          {initials(instr.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base leading-tight mb-1 truncate">{instr.name}</h3>
                        {instr.title && (
                          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{instr.title}</p>
                        )}
                      </div>
                    </div>

                    {/* Expertise tags */}
                    {instr.expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {instr.expertise.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-md border",
                              accent.tint, accent.text, accent.border,
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bio (truncated) */}
                    {instr.bio && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                        {instr.bio}
                      </p>
                    )}

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-2 mb-5 mt-auto">
                      <MiniStat
                        icon={Briefcase}
                        value={`${instr.yearsExperience}+`}
                        label="Years"
                        tint={accent.text}
                      />
                      <MiniStat icon={BookOpen} value={`${instr.coursesCount}`} label="Courses" tint={accent.text} />
                      <MiniStat icon={GraduationCap} value={`${instr.learnersCount}`} label="Learners" tint={accent.text} />
                    </div>

                    {/* Certifications */}
                    {instr.certifications.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1 mb-4 pt-3 border-t border-border/40">
                        <Award className={cn("h-3 w-3 mr-1", accent.text)} />
                        {instr.certifications.slice(0, 4).map((c) => (
                          <span key={c} className="text-[10px] font-mono text-muted-foreground">
                            {c}
                          </span>
                        ))}
                        {instr.certifications.length > 4 && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            +{instr.certifications.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ name: "instructor-detail", instructorId: instr.id })}
                      className="w-full group"
                    >
                      View Profile
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* CTA at bottom */}
          {!isLoading && instructors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-14 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center"
            >
              <Sparkles className="h-7 w-7 text-violet-300 mx-auto mb-3" />
              <h3 className="text-xl font-semibold mb-2">Want to teach with us?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                We&apos;re always looking for working security professionals who want to mentor the next generation.
              </p>
              <Button onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium">
                Apply to instruct <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      {/* =====================================================
          NEW SECTION — WHY LEARN FROM GUARDIANX INSTRUCTORS
          6 feature cards explaining what makes our instructors different.
          ===================================================== */}
      <section
        aria-labelledby="why-heading"
        className="relative py-10 lg:py-16 border-t border-border/40 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div
          className="absolute left-1/3 top-1/3 w-[400px] h-[260px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mb-8"
          >
            <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-2">
              WHY GUARDIANX INSTRUCTORS
            </p>
            <h2
              id="why-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              Why learn from{" "}
              <span className="text-gradient-premium">GuardianX instructors.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Not career academics. Not slide-readers. Our instructors are working security professionals
              who train you on what they actually do, day in and day out.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHY_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="card-premium rounded-xl p-5 lg:p-6 h-full"
              >
                <div className={cn("inline-flex p-2.5 rounded-lg mb-4", f.tintBg, f.tint)}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION — INSTRUCTOR EXPERTISE
          Visual grid of 8 security domain cards, each with a live
          count of how many instructors cover that domain.
          ===================================================== */}
      <section
        aria-labelledby="expertise-heading"
        className="relative py-10 lg:py-16 border-t border-border/40 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div
          className="absolute right-1/4 bottom-1/4 w-[420px] h-[260px] bg-violet-500/6 blur-[120px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mb-8"
          >
            <p className="text-[10px] font-mono text-cyan-300/80 tracking-[0.25em] mb-2">
              INSTRUCTOR EXPERTISE
            </p>
            <h2
              id="expertise-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              Domains our instructors{" "}
              <span className="text-gradient-premium">cover.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              From offensive operations to GRC, our team spans the full spectrum of cybersecurity
              practice. Counts below update live from the published instructor roster.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXPERTISE_DOMAINS.map((d, i) => {
              const count = countDomain(instructors, [...d.keywords])
              return (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="card-premium rounded-xl p-5 h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("inline-flex p-2.5 rounded-lg", d.tintBg, d.tint)}>
                      <d.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-md border bg-card/60",
                        d.tint, d.border,
                      )}
                    >
                      {count} {count === 1 ? "instructor" : "instructors"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">{d.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION — HOW INSTRUCTOR-LED TRAINING WORKS
          5-step visual timeline: choose → match → attend →
          practice → certify. Horizontal on desktop, vertical
          on mobile (mirrors the homepage methodology timeline).
          ===================================================== */}
      <section
        aria-labelledby="how-heading"
        className="relative py-10 lg:py-16 border-t border-border/40 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" aria-hidden />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[220px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mb-8"
          >
            <p className="text-[10px] font-mono text-amber-300/80 tracking-[0.25em] mb-2">
              HOW IT WORKS
            </p>
            <h2
              id="how-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
            >
              How instructor-led{" "}
              <span className="text-gradient-premium">training works.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A clear 5-step path from picking a course to walking out certified. Every step is
              designed to keep you accountable to a real human instructor — not just a video queue.
            </p>
          </motion.div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block relative">
            <div
              className="absolute top-[34px] left-[10%] right-[10%] h-px bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-violet-500/0"
              aria-hidden
            />
            <div className="grid grid-cols-5 gap-4">
              {TRAINING_STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.06 * i, ease: "easeOut" }}
                  className="relative text-center"
                >
                  <div className="mx-auto mb-3 flex size-[68px] items-center justify-center rounded-full border border-violet-500/30 bg-card relative z-10">
                    <step.icon className="size-6 text-violet-300" aria-hidden />
                  </div>
                  <div className="font-mono text-[10px] text-violet-300/80 tracking-wider mb-1">
                    STEP {step.num}
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile / tablet: vertical timeline */}
          <div className="lg:hidden space-y-2">
            {TRAINING_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.04 * i, ease: "easeOut" }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-full border border-violet-500/30 bg-card shrink-0">
                    <step.icon className="size-5 text-violet-300" aria-hidden />
                  </div>
                  {i < TRAINING_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-violet-500/20 mt-2 mb-2" aria-hidden />
                  )}
                </div>
                <div className="pt-1 pb-3">
                  <div className="font-mono text-[10px] text-violet-300/80 tracking-wider mb-1">
                    STEP {step.num}
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION — STATS STRIP
          4 stat tiles: instructors, courses, learners, certs.
          ===================================================== */}
      <section aria-labelledby="stats-heading" className="relative py-10 lg:py-14 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mb-6"
          >
            <p className="text-[10px] font-mono text-emerald-300/80 tracking-[0.25em] mb-2">
              BY THE NUMBERS
            </p>
            <h2
              id="stats-heading"
              className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em] text-balance"
            >
              The GuardianX instructor network, at a glance.
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Users,
                value: String(data?.count ?? instructors.length ?? 0),
                label: "Total Instructors",
                tint: "text-violet-300",
                tintBg: "bg-violet-500/10",
              },
              {
                icon: BookOpen,
                value: "29+",
                label: "Total Courses",
                tint: "text-cyan-300",
                tintBg: "bg-cyan-500/10",
              },
              {
                icon: GraduationCap,
                value: "12,000+",
                label: "Total Learners",
                tint: "text-amber-300",
                tintBg: "bg-amber-500/10",
              },
              {
                icon: Award,
                value: "20+",
                label: "Certifications Covered",
                tint: "text-emerald-300",
                tintBg: "bg-emerald-500/10",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="card-premium rounded-xl p-5 text-center"
              >
                <div className={cn("inline-flex p-2.5 rounded-lg mb-3", s.tintBg, s.tint)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="font-mono text-2xl lg:text-3xl font-bold tabular-nums">{s.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW SECTION — FINAL CTA
          "Ready to learn from the best?" with buttons to
          Browse Courses + Contact Us.
          ===================================================== */}
      <section aria-labelledby="final-cta-heading" className="relative py-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 via-card to-card p-8 lg:p-12 text-center overflow-hidden"
          >
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 w-[460px] h-[200px] bg-violet-500/15 blur-[120px] rounded-full pointer-events-none"
              aria-hidden
            />
            <div className="relative">
              <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 text-violet-300 mb-5">
                <Target className="h-6 w-6" />
              </div>
              <h2
                id="final-cta-heading"
                className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] mb-3 text-balance"
              >
                Ready to learn from{" "}
                <span className="text-gradient-premium">the best?</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-7 leading-relaxed">
                Pick a course, get matched with an instructor who actually does the work, and start
                your certification journey. Your next credential is one live session away.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate({ name: "catalog" })}
                  className="bg-violet-600 hover:bg-violet-500 btn-premium"
                >
                  <BookOpen className="h-4 w-4 mr-1.5" />
                  Browse Courses
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ name: "contact" })}
                  className="w-full sm:w-auto"
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Contact Us
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

function StatChip({ icon: Icon, value, label, tint }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; tint: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur">
      <Icon className={cn("h-4 w-4", tint)} />
      <span className="font-mono text-sm font-bold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  )
}

function MiniStat({ icon: Icon, value, label, tint }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string; tint: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 px-2 py-2.5 text-center">
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", tint)} />
      <div className="font-mono text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  )
}
