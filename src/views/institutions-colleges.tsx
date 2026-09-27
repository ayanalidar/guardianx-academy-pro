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
  Building, ArrowRight, ArrowLeft, LogIn, Sparkles,
  Users, BookOpen, GraduationCap, ShieldCheck, Award,
  Layers, Server, Briefcase, Database, ClipboardCheck,
  FlaskConical, TrendingUp, Cpu, Wifi, Code2, Trophy,
} from "lucide-react"

// ============================================================
// College features - SMS mentioned as one of the features
// ============================================================
const COLLEGE_FEATURES = [
  {
    icon: GraduationCap,
    title: "Department Management",
    desc: "Manage CS, IT, EC, EE and all departments with dedicated coordinators, course mapping, and academic planning.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: BookOpen,
    title: "Course Management",
    desc: "Semester-wise, credit-based course tracking with elective selection, prerequisites, and auto-enrollment rules.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Users,
    title: "Student Admissions",
    desc: "Online application, merit list generation, document verification, and seat allotment - all in one workflow.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Faculty Management",
    desc: "Faculty profiles, workload allocation, research publications, and performance reviews with a single dashboard.",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance & CIA",
    desc: "Continuous Internal Assessment, practical marks, viva tracking, and attendance with auto-calculation rules.",
    color: "text-rose-300",
    bg: "bg-rose-500/10",
  },
  {
    icon: Award,
    title: "Examination System",
    desc: "Semester exam scheduling, hall tickets, valuation, results, re-evaluation, and arrear management.",
    color: "text-teal-300",
    bg: "bg-teal-500/10",
  },
  {
    icon: Briefcase,
    title: "Placement Cell",
    desc: "Company onboarding, placement drives, offer tracking, placement statistics, and alumni network.",
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
  },
  {
    icon: Database,
    title: "School Management System",
    desc: "Complimentary access to GuardianX's School Management System - manage admissions, attendance, grades, fees, and parent communication for any affiliated school programs.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    highlight: true,
  },
]

// ============================================================
// Popular certifications for college students
// ============================================================
const COLLEGE_CERTS = [
  { code: "CEH", name: "Certified Ethical Hacker", duration: "40 hrs", credits: 4, career: "Penetration Tester", color: "text-violet-300", bg: "bg-violet-500/10" },
  { code: "CCNA", name: "Cisco Certified Network Associate", duration: "60 hrs", credits: 5, career: "Network Engineer", color: "text-cyan-300", bg: "bg-cyan-500/10" },
  { code: "WAPT", name: "Web App Penetration Testing", duration: "30 hrs", credits: 3, career: "Web Security Analyst", color: "text-amber-300", bg: "bg-amber-500/10" },
  { code: "RHCSA", name: "Red Hat Certified System Admin", duration: "50 hrs", credits: 4, career: "System Administrator", color: "text-emerald-300", bg: "bg-emerald-500/10" },
]

// ============================================================
// Dashboard preview stats
// ============================================================
const COLLEGE_DASHBOARD_STATS = [
  { icon: Users, label: "Total Students", value: 3200, suffix: "+", color: "text-violet-300", tint: "bg-violet-500/10", trend: { value: 12, direction: "up" as const } },
  { icon: Building, label: "Departments", value: 8, suffix: "", color: "text-cyan-300", tint: "bg-cyan-500/10" },
  { icon: ShieldCheck, label: "Faculty", value: 145, suffix: "", color: "text-amber-300", tint: "bg-amber-500/10", trend: { value: 5, direction: "up" as const } },
  { icon: TrendingUp, label: "Avg CGPA", value: 7.8, suffix: "", color: "text-emerald-300", tint: "bg-emerald-500/10" },
  { icon: Briefcase, label: "Placement Rate", value: 87, suffix: "%", color: "text-rose-300", tint: "bg-rose-500/10", trend: { value: 3, direction: "up" as const } },
  { icon: FlaskConical, label: "Active Labs", value: 31, suffix: "", color: "text-teal-300", tint: "bg-teal-500/10" },
]

// ============================================================
// Integration options
// ============================================================
const INTEGRATION_OPTIONS = [
  {
    icon: Server,
    title: "API Integration",
    desc: "Connect GuardianX with your existing college ERP via REST APIs. Sync students, courses, and grades automatically.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Layers,
    title: "Co-branded Portal",
    desc: "GuardianX + College branding on a shared portal. Students see your college identity throughout the platform.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: Database,
    title: "White-label Solution",
    desc: "Fully branded as your college's own platform. Custom domain, custom logo, custom certificates - GuardianX runs the engine.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
]

export function InstitutionsCollegesView() {
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
                <Building className="h-5 w-5 text-cyan-300" />
                <span className="text-[10px] font-mono text-cyan-300/80 tracking-[0.25em]">GUARDIANX FOR COLLEGES</span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
                College administration meets{" "}
                <span className="text-gradient-premium">cyber security training.</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="text-base lg:text-lg text-muted-foreground max-w-xl mb-5 leading-relaxed">
                ERP-grade college management integrated with industry-aligned cyber security training. Manage departments, courses, exams, and placements - while students train on real cyber labs and earn verifiable certifications.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="flex items-center gap-3 flex-wrap">
                <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-cyan-600 hover:bg-cyan-500 btn-premium px-8 py-6 text-sm">
                  REQUEST COLLEGE PROGRAM <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate({ name: "login" })} className="px-6 py-6 text-sm">
                  <LogIn className="h-4 w-4 mr-2" /> COLLEGE PORTAL LOGIN
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
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">PLATFORM FEATURES</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">Everything your college needs.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLLEGE_FEATURES.map((f, i) => (
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

      {/* CERTIFICATIONS */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">INDUSTRY-ALIGNED CERTIFICATIONS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">Certification tracks for college students.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLLEGE_CERTS.map((c, i) => (
              <motion.div key={c.code} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-border/60 bg-card p-5 hover:border-violet-500/30 transition-all">
                <div className={cn("inline-flex px-2.5 py-1 rounded-md text-[10px] font-mono font-bold mb-3", c.bg, c.color)}>{c.code}</div>
                <h3 className="font-semibold text-sm mb-2">{c.name}</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Duration</span><span className="text-foreground">{c.duration}</span></div>
                  <div className="flex justify-between"><span>Credits</span><span className="text-foreground">{c.credits}</span></div>
                  <div className="flex justify-between"><span>Career</span><span className={c.color}>{c.career}</span></div>
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
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">ADMIN DASHBOARD</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">What college admins see.</h2>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground ml-2">academy.guardianx.cloud/college/dashboard</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {COLLEGE_DASHBOARD_STATS.map((s) => (
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

      {/* INTEGRATION OPTIONS */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">INTEGRATION OPTIONS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">Choose your integration level.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {INTEGRATION_OPTIONS.map((o, i) => (
              <motion.div key={o.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-border/60 bg-card p-5 hover:border-violet-500/30 transition-all">
                <div className={cn("inline-flex p-2.5 rounded-lg mb-3", o.bg)}>
                  <o.icon className={cn("h-5 w-5", o.color)} />
                </div>
                <h3 className="font-semibold text-sm mb-2">{o.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{o.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 lg:py-12 border-t border-border/40 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Sparkles className="h-8 w-8 text-cyan-300 mx-auto mb-4" />
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
            Ready to elevate your college?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Join 42+ colleges using GuardianX to train job-ready cyber security professionals.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-cyan-600 hover:bg-cyan-500 btn-premium px-8 py-6 text-sm">
              CONTACT US <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ name: "login" })} className="px-6 py-6 text-sm">
              COLLEGE PORTAL
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
