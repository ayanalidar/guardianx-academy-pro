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
  School,
  ArrowRight,
  ArrowLeft,
  LogIn,
  Sparkles,
  Users,
  CalendarCheck,
  BookMarked,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  UserCog,
  ShieldCheck,
  GraduationCap,
  Database,
  Server,
  Layers,
  Building2,
  Handshake,
  Rocket,
} from "lucide-react"

// ============================================================
// SMS - School Management System (K-12) feature set
// ============================================================
const SMS_FEATURES = [
  {
    icon: UserCog,
    title: "Student Management",
    desc: "Admissions, profiles, and guardian contacts. Manage every student from enrolment to graduation with a single source of truth.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    icon: CalendarCheck,
    title: "Attendance Tracking",
    desc: "Daily, class-wise attendance with automatic SMS alerts to parents on absenteeism. Biometric and RFID ready.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: BookMarked,
    title: "Grade Book",
    desc: "Digital report cards, progress reports, and a parent portal that surfaces grades, remarks, and teacher feedback live.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: CalendarDays,
    title: "Timetable Management",
    desc: "Class schedules, teacher allocation, room booking, and substitute handling with conflict detection.",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  {
    icon: Wallet,
    title: "Fee Management",
    desc: "Collection, receipts, reminders, and scholarship tracking. Online and offline payments reconciled automatically.",
    color: "text-rose-300",
    bg: "bg-rose-500/10",
  },
  {
    icon: ClipboardCheck,
    title: "Exam Management",
    desc: "Scheduling, hall tickets, results, and report card generation. Supports grading, GPA, and percentile modes.",
    color: "text-teal-300",
    bg: "bg-teal-500/10",
  },
  {
    icon: Users,
    title: "Guardian Portal",
    desc: "Parents view attendance, grades, fee status, and teacher remarks in real time - no phone calls, no paperwork.",
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Cyber Security Curriculum",
    desc: "Grades 9-12 cyber security modules aligned with the school syllabus - digital safety, ethical hacking basics, careers.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
]

// ============================================================
// Cyber curriculum for K-12 - two stages
// ============================================================
const SCHOOL_CYBER_STAGES = [
  {
    stage: "Grades 9-10",
    title: "Digital Foundations",
    desc: "Build safe digital habits before students specialise. Hands-on labs reinforce every concept.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/40",
    modules: [
      "Digital literacy and online identity",
      "Safe browsing, phishing, and scams",
      "Social media safety and cyberbullying",
      "Introduction to cyber security careers",
    ],
  },
  {
    stage: "Grades 11-12",
    title: "Cyber Security Elective",
    desc: "An academic elective aligned with STEM - prepares students for cyber degrees and certifications.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    modules: [
      "Ethical hacking basics (theory + lab)",
      "Network fundamentals and the OSI model",
      "Linux command line and scripting",
      "Career guidance - degrees, certs, internships",
    ],
  },
]

// ============================================================
// Dashboard preview stats - school admin view
// ============================================================
const SCHOOL_DASHBOARD_STATS = [
  { icon: Users, label: "Total Students", value: 1248, suffix: "", color: "text-emerald-300", tint: "bg-emerald-500/10", trend: { value: 6, direction: "up" as const } },
  { icon: School, label: "Classes", value: 36, suffix: "", color: "text-cyan-300", tint: "bg-cyan-500/10", trend: { value: 2, direction: "up" as const } },
  { icon: UserCog, label: "Teachers", value: 78, suffix: "", color: "text-violet-300", tint: "bg-violet-500/10", trend: { value: 4, direction: "up" as const } },
  { icon: CalendarCheck, label: "Attendance Rate", value: 94, suffix: "%", color: "text-amber-300", tint: "bg-amber-500/10", trend: { value: 2, direction: "up" as const } },
  { icon: BookMarked, label: "Active Courses", value: 12, suffix: "", color: "text-rose-300", tint: "bg-rose-500/10", trend: { value: 8, direction: "up" as const } },
  { icon: ShieldCheck, label: "Certificates", value: 320, suffix: "", color: "text-teal-300", tint: "bg-teal-500/10", trend: { value: 12, direction: "up" as const } },
]

// ============================================================
// Partnership models - school-specific
// ============================================================
const SCHOOL_PARTNERSHIP_MODELS = [
  {
    icon: Handshake,
    title: "MoU Partnership",
    desc: "Sign an MoU with GuardianX and get the School Management System complimentary, plus on-premises cyber training for your students.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "hover:border-emerald-500/40",
    features: ["Complimentary SMS", "On-premises training", "Annual cohort intake", "Guardian portal access"],
    badge: "Most popular",
  },
  {
    icon: Database,
    title: "Annual License",
    desc: "Per-student pricing for the SMS platform. Full access for a single academic year - roll over year-to-year as you grow.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "hover:border-cyan-500/40",
    features: ["Per-student pricing", "Full SMS access", "Annual renewal", "Email + chat support"],
  },
  {
    icon: Layers,
    title: "Full Integration",
    desc: "SMS + LMS + Cyber Range + Labs - the complete GuardianX stack tightly integrated with your school's academic calendar.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "hover:border-violet-500/40",
    features: ["SMS + LMS combined", "Dedicated cyber range", "31 Docker labs", "Custom curriculum mapping"],
    badge: "Most comprehensive",
  },
]

export function InstitutionsSchoolsView() {
  const { navigate } = useAppStore()

  return (
    <main className="relative">
      {/* ====================================================
          SECTION 1: HERO
          ==================================================== */}
        <section className="relative overflow-hidden">
          {/* Atmospheric background */}
          <div
            className="absolute top-0 right-0 w-[600px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none"
            aria-hidden
          />
          {/* Desktop: large interactive particle logo on the right - absolute so it doesn't push content down */}
          <div className="hidden lg:block absolute right-[6%] top-1/2 -translate-y-1/2 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
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
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 mb-4"
                >
                  <button
                    onClick={() => navigate({ name: "institutions" })}
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-emerald-300 transition-colors tracking-[0.2em]"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    BACK TO INSTITUTIONS
                  </button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="flex items-center gap-2 mb-4"
                >
                  <School className="h-5 w-5 text-emerald-300" />
                  <span className="text-[10px] font-mono text-emerald-300/80 tracking-[0.25em]">GUARDIANX FOR SCHOOLS</span>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance"
                >
                  School{" "}
                  <span className="text-gradient-premium">Management System</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="text-base lg:text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed"
                >
                  Complete K-12 cyber security education platform with a complimentary School Management System
                  for MoU partners. Manage students, attendance, fees, grades, and parent communication - all in
                  one place.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="flex items-center gap-3 flex-wrap"
                >
                  <Button
                    size="lg"
                    onClick={() => navigate({ name: "contact" })}
                    className="bg-emerald-600 hover:bg-emerald-500 btn-premium px-8 py-6 text-sm"
                  >
                    Request School Program <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate({ name: "login" })}
                    className="px-6 py-6 text-sm"
                  >
                    <LogIn className="h-4 w-4 mr-1.5" />
                    School Portal Login
                  </Button>
                </motion.div>

                {/* Highlight callout */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 max-w-xl"
                >
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[10px] font-mono text-emerald-300/80 tracking-wider mb-1">
                        COMPLIMENTARY FOR MOU PARTNERS
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The School Management System is a separate product - it is not the GuardianX training
                        platform. Sign an MoU and the SMS is included at no extra cost, alongside on-premises
                        cyber training for your students.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            SECTION 2: SMS OVERVIEW - 8 K-12 feature cards
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 max-w-2xl"
            >
              <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-3">SMS · K-12 PLATFORM</p>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-balance">
                What&apos;s included in the{" "}
                <span className="text-gradient-premium">School Management System</span>
              </h2>
              <p className="text-base text-muted-foreground mt-4">
                Eight purpose-built modules that handle the day-to-day running of a K-12 school - from
                admissions and attendance to fee collection and parent communication.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SMS_FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group h-full rounded-xl border border-border/60 bg-card shadow-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.15_155_/_0.25)]"
                >
                  <div className={cn("inline-flex p-3 rounded-lg mb-3 transition-transform group-hover:scale-110", f.bg)}>
                    <f.icon className={cn("h-5 w-5", f.color)} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            SECTION 3: SCHOOL CYBER TRAINING - 2-card grid
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[280px] bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 text-center max-w-2xl mx-auto"
            >
              <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-3">CYBER CURRICULUM</p>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-balance">
                Cyber security education for schools
              </h2>
              <p className="text-base text-muted-foreground mt-4">
                A two-stage curriculum that grows with students - from safe digital habits in grade 9 to an
                academic cyber security elective in grades 11-12.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
              {SCHOOL_CYBER_STAGES.map((stage, i) => (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={cn(
                    "rounded-2xl border border-border/60 bg-card shadow-lg p-6 transition-all duration-300 hover:-translate-y-1",
                    stage.border
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("inline-flex items-center justify-center size-12 rounded-xl", stage.bg)}>
                      <GraduationCap className={cn("h-6 w-6", stage.color)} />
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] font-mono tracking-wider", stage.bg, stage.color, stage.border)}>
                      {stage.stage}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{stage.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{stage.desc}</p>
                  <ul className="space-y-2.5">
                    {stage.modules.map((m) => (
                      <li key={m} className="flex items-start gap-2.5 text-sm">
                        <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{m}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            SECTION 4: SCHOOL DASHBOARD PREVIEW - mockup
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
            >
              <div>
                <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-3">SMS DASHBOARD</p>
                <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-balance">
                  Your school, at a glance.
                </h2>
                <p className="text-base text-muted-foreground max-w-xl mt-3">
                  A live view of students, classes, teachers, attendance, active courses, and certificates - the
                  command center for your school admin team.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => navigate({ name: "contact" })}
                className="bg-emerald-600 hover:bg-emerald-500 btn-premium px-6 py-5"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Request Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden"
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-background/40">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-rose-500/60" />
                  <span className="size-3 rounded-full bg-amber-500/60" />
                  <span className="size-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="rounded-md bg-background/60 border border-border/40 px-3 py-1 text-[10px] font-mono text-muted-foreground tracking-wider">
                    academy.guardianx.cloud/school/dashboard
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono tracking-wider border-emerald-500/30 bg-emerald-500/5 text-emerald-300">
                  LIVE
                </Badge>
              </div>

              {/* Dashboard body */}
              <div className="p-5 lg:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                      Delhi Cyber Sciences Academy
                    </p>
                    <h3 className="text-base font-semibold">Q3 2024 - School Overview</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono tracking-wider border-border/60">
                    <span className="size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" /> Synced 2 min ago
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {SCHOOL_DASHBOARD_STATS.map((s) => (
                    <StatTile
                      key={s.label}
                      icon={s.icon}
                      label={s.label}
                      value={s.value}
                      suffix={s.suffix}
                      color={s.color}
                      tint={s.tint}
                      trend={s.trend}
                    />
                  ))}
                </div>

                {/* Recent activity */}
                <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Guardian Portal Activity
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { name: "Aarav P. (Grade 10-A)", note: "Attendance marked present", color: "bg-emerald-500/10 text-emerald-300" },
                      { name: "Diya S. (Grade 9-B)", note: "Fee receipt generated", color: "bg-cyan-500/10 text-cyan-300" },
                      { name: "Kabir M. (Grade 12-A)", note: "Report card viewed by parent", color: "bg-violet-500/10 text-violet-300" },
                    ].map((r) => (
                      <div key={r.name} className="flex items-center gap-2.5">
                        <div className={cn("size-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold", r.color)}>
                          {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{r.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ====================================================
            SECTION 5: PARTNERSHIP MODELS - 3 cards
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 text-center max-w-2xl mx-auto"
            >
              <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-3">PARTNERSHIP MODELS</p>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-balance">
                Three ways to bring GuardianX to your school
              </h2>
              <p className="text-base text-muted-foreground mt-4">
                Whether you want a complimentary SMS under an MoU, an annual license, or a fully integrated
                cyber education stack - there is a model that fits your school.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
              {SCHOOL_PARTNERSHIP_MODELS.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={cn(
                    "relative h-full flex flex-col rounded-2xl border border-border/60 bg-card shadow-lg p-6 transition-all duration-300 hover:-translate-y-1",
                    p.border
                  )}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={cn("inline-flex items-center justify-center h-12 w-12 rounded-xl", p.bg)}>
                      <p.icon className={cn("h-6 w-6", p.color)} />
                    </div>
                    {p.badge && (
                      <Badge variant="outline" className="text-[10px] font-mono tracking-wider border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                        {p.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{p.desc}</p>
                  <ul className="space-y-2 mb-6 mt-auto">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-xs">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => navigate({ name: "contact" })}
                    className={cn(
                      "w-full btn-premium",
                      i === 0 && "bg-emerald-600 hover:bg-emerald-500",
                      i === 1 && "bg-cyan-600 hover:bg-cyan-500",
                      i === 2 && "bg-violet-600 hover:bg-violet-500",
                    )}
                  >
                    Get Started <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            SECTION 6: FINAL CTA
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-emerald-600/8 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 mb-5">
                <Rocket className="h-7 w-7 text-emerald-300" />
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em] mb-4 text-balance">
                Ready to transform your{" "}
                <span className="text-gradient-premium">school?</span>
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto mb-7">
                Sign an MoU today and deploy the School Management System across your campus within weeks. Your
                teachers, parents, and students get one platform that just works.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  size="lg"
                  onClick={() => navigate({ name: "contact" })}
                  className="bg-emerald-600 hover:bg-emerald-500 btn-premium px-8 py-6 text-sm"
                >
                  Sign an MoU <Handshake className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ name: "contact" })}
                  className="px-8 py-6 text-sm"
                >
                  Talk to Us
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
    </main>
  )
}
