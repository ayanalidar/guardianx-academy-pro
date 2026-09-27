"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatTile } from "@/components/cyber/stat-tile"
import { ParticleLogo } from "@/components/platform/particle-logo"
import { cn } from "@/lib/utils"
import {
  Landmark, ArrowRight, LogIn, Sparkles,
  Users, BookOpen, GraduationCap, ShieldCheck, Award,
  Layers, Server, Briefcase, Database, ClipboardCheck,
  FlaskConical, TrendingUp, Cpu, Microscope, FileText, Trophy,
} from "lucide-react"

// ============================================================
// University features - SMS mentioned as one of the features
// ============================================================
const UNIVERSITY_FEATURES = [
  {
    icon: GraduationCap,
    title: "Academic Programs",
    desc: "Manage B.Tech, M.Tech, PhD, diplomas, and certificate programs with full credit tracking and CBCS support.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: Users,
    title: "Faculty Management",
    desc: "Professor profiles, PhD supervision, research publications, patents, and performance reviews in one system.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Microscope,
    title: "Research & Publications",
    desc: "Track journal papers, conference proceedings, patents, research grants, and PhD thesis progress.",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Admissions & Scholarships",
    desc: "National and international admissions, entrance exams, merit lists, scholarship management, and visa support.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    icon: ClipboardCheck,
    title: "Examination & Evaluation",
    desc: "Semester exams, viva-voce, thesis defense, plagiarism checking, and GPA/CGPA calculation with CBCS.",
    color: "text-rose-300",
    bg: "bg-rose-500/10",
  },
  {
    icon: Briefcase,
    title: "Industry Collaboration",
    desc: "MoUs, internships, joint research projects, industry-sponsored labs, and placement tracking.",
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
  },
  {
    icon: Server,
    title: "Advanced Cyber Range",
    desc: "Dedicated university lab infrastructure, CTF arena hosting, research lab environments, and inter-university competitions.",
    color: "text-teal-300",
    bg: "bg-teal-500/10",
  },
  {
    icon: Database,
    title: "School Management System",
    desc: "Complimentary access to GuardianX's School Management System - manage any affiliated schools, K-12 programs, or feeder institutions under your university umbrella.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    highlight: true,
  },
]

// ============================================================
// Degree-integrated cyber security programs
// ============================================================
const UNIVERSITY_PROGRAMS = [
  { name: "B.Tech Cyber Security", duration: "4 years", credits: 160, level: "Undergraduate", specializations: "Offensive Security, Defensive Security, Cloud Security", color: "text-violet-300", bg: "bg-violet-500/10" },
  { name: "M.Tech Information Security", duration: "2 years", credits: 80, level: "Postgraduate", specializations: "Cryptography, Network Security, Forensics", color: "text-cyan-300", bg: "bg-cyan-500/10" },
  { name: "PhD Cyber Security", duration: "3-5 years", credits: 0, level: "Doctoral", specializations: "Research in AI Security, IoT Security, Blockchain", color: "text-amber-300", bg: "bg-amber-500/10" },
  { name: "PG Diploma in Cyber Forensics", duration: "1 year", credits: 32, level: "Diploma", specializations: "Digital Forensics, Incident Response, Malware Analysis", color: "text-emerald-300", bg: "bg-emerald-500/10" },
]

// ============================================================
// Dashboard preview stats
// ============================================================
const UNIVERSITY_DASHBOARD_STATS = [
  { icon: Users, label: "Total Students", value: 8500, suffix: "+", color: "text-violet-300", tint: "bg-violet-500/10", trend: { value: 8, direction: "up" as const } },
  { icon: GraduationCap, label: "Programs", value: 24, suffix: "", color: "text-cyan-300", tint: "bg-cyan-500/10" },
  { icon: ShieldCheck, label: "Faculty", value: 320, suffix: "+", color: "text-amber-300", tint: "bg-amber-500/10" },
  { icon: FileText, label: "Research Papers", value: 412, suffix: "", color: "text-emerald-300", tint: "bg-emerald-500/10", trend: { value: 18, direction: "up" as const } },
  { icon: TrendingUp, label: "International Students", value: 186, suffix: "", color: "text-rose-300", tint: "bg-rose-500/10", trend: { value: 22, direction: "up" as const } },
  { icon: FlaskConical, label: "Lab Usage", value: 94, suffix: "%", color: "text-teal-300", tint: "bg-teal-500/10" },
]

// ============================================================
// Research capabilities
// ============================================================
const RESEARCH_CAPS = [
  { icon: Server, title: "Dedicated Cyber Range", desc: "Your own isolated lab infrastructure for research - spin up vulnerable environments, test exploits, and publish findings.", color: "text-violet-300", bg: "bg-violet-500/10" },
  { icon: Trophy, title: "CTF Arena Hosting", desc: "Host inter-university CTF competitions on your branded arena. Build challenges, manage teams, publish leaderboards.", color: "text-cyan-300", bg: "bg-cyan-500/10" },
  { icon: FileText, title: "Joint Publications", desc: "Collaborate with GuardianX researchers on papers, whitepapers, and industry reports. Co-authorship opportunities.", color: "text-amber-300", bg: "bg-amber-500/10" },
  { icon: Briefcase, title: "Industry-Sponsored Research", desc: "Connect with industry partners for funded research projects in AI security, cloud security, and zero-trust architecture.", color: "text-emerald-300", bg: "bg-emerald-500/10" },
]

export function InstitutionsUniversitiesView() {
  const { navigate } = useAppStore()

  return (
    <main className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Desktop: large interactive particle logo on the right - absolute so it doesn't push content down */}
        <div className="hidden lg:block absolute right-[6%] top-1/2 -translate-y-1/2 pointer-events-auto">
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
            <ParticleLogo size={680} interactive showGlow />
          </motion.div>
        </div>

        {/* Mobile: smaller particle logo absolute at top */}
        <div className="lg:hidden absolute inset-x-0 top-0 h-[44vh] flex items-center justify-center pointer-events-none">
          <ParticleLogo size={340} interactive={false} showGlow />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-16 pt-[48vh] lg:pt-16">
          <div className="max-w-3xl">
            <div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 mb-4">
                <Landmark className="h-5 w-5 text-violet-300" />
                <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em]">GUARDIANX FOR UNIVERSITIES</span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
                Research-grade cyber security{" "}
                <span className="text-gradient-premium">for universities.</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="text-base lg:text-lg text-muted-foreground max-w-xl mb-5 leading-relaxed">
                Full university administration integrated with advanced cyber range infrastructure. Manage programs, research, admissions, and industry collaboration - while students and PhD scholars train on real-world security challenges.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="flex items-center gap-3 flex-wrap">
                <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm">
                  REQUEST UNIVERSITY PROGRAM <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate({ name: "login" })} className="px-6 py-6 text-sm">
                  <LogIn className="h-4 w-4 mr-2" /> UNIVERSITY PORTAL LOGIN
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">PLATFORM FEATURES</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">Built for research-driven institutions.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {UNIVERSITY_FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className={cn("rounded-xl border p-4 transition-all hover:-translate-y-1", f.highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-card")}>
                <div className={cn("inline-flex p-2.5 rounded-lg mb-3", f.bg)}>
                  <f.icon className={cn("h-5 w-5", f.color)} />
                </div>
                {f.highlight && <Badge variant="outline" className="mb-2 text-[9px] font-mono border-emerald-500/30 bg-emerald-500/5 text-emerald-300">INCLUDED</Badge>}
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEGREE PROGRAMS */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">DEGREE-INTEGRATED PROGRAMS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">Cyber security degree tracks.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {UNIVERSITY_PROGRAMS.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-border/60 bg-card p-5 hover:border-violet-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="outline" className={cn("text-[9px] font-mono mb-2", p.bg, p.color, "border-current")}>{p.level}</Badge>
                    <h3 className="font-semibold text-base">{p.name}</h3>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Duration</span><span className="text-foreground">{p.duration}</span></div>
                  {p.credits > 0 && <div className="flex justify-between"><span>Credits</span><span className="text-foreground">{p.credits}</span></div>}
                  <div className="pt-1"><span>Specializations: </span><span className="text-foreground">{p.specializations}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">ADMIN DASHBOARD</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">What university admins see.</h2>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground ml-2">academy.guardianx.cloud/university/dashboard</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {UNIVERSITY_DASHBOARD_STATS.map((s) => (
                <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} suffix={s.suffix} color={s.color} tint={s.tint} trend={s.trend} />
              ))}
            </div>
          </div>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => navigate({ name: "contact" })} className="btn-premium">
              REQUEST DEMO <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* RESEARCH CAPABILITIES */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">RESEARCH CAPABILITIES</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">Infrastructure for cyber security research.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RESEARCH_CAPS.map((r, i) => (
              <motion.div key={r.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-border/60 bg-card p-5 hover:border-violet-500/30 transition-all">
                <div className={cn("inline-flex p-2.5 rounded-lg mb-3", r.bg)}>
                  <r.icon className={cn("h-5 w-5", r.color)} />
                </div>
                <h3 className="font-semibold text-sm mb-2">{r.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 lg:py-12 border-t border-border/40 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Sparkles className="h-8 w-8 text-violet-300 mx-auto mb-4" />
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
            Ready to lead cyber security research?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Join 23+ universities partnering with GuardianX for research-grade cyber security infrastructure.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm">
              PARTNER WITH US <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ name: "login" })} className="px-6 py-6 text-sm">
              UNIVERSITY PORTAL
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
