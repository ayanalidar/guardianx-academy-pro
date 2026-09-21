"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, ArrowRight, Award, Clock, BookOpen, Users, Shield,
  CheckCircle2, Target, Building2, Star, CalendarDays, GraduationCap,
  HelpCircle, Layers, Sparkles, Trophy,
} from "lucide-react"

/* ============================================================
   /cert/<slug> - SEO landing page per certification.

   Receives a `certSlug` prop (e.g. "ceh", "cissp", "ccna",
   "security-plus") and renders a rich landing page with:
     1. Hero - name, exam code, passing score, duration, body
     2. Courses that prepare for this cert
     3. Upcoming training batches
     4. FAQ
     5. Related certifications

   All data is fetched from existing public endpoints:
     - /api/courses?q=<slug>
     - /api/training-batches
     - /api/certifications
   ============================================================ */

export interface CertLandingViewProps {
  certSlug: string
}

/* --------------------------- static cert metadata --------------------------- *
 * A small in-file knowledge base of the most common industry certifications
 * GuardianX prepares learners for. Used for the hero section (exam code,
 * passing score, duration) + FAQ + meta description. For unknown slugs we
 * synthesize a sensible fallback from the slug itself so the page still
 * renders fully - the courses/batches sections are always DB-driven.
 * --------------------------------------------------------------------------- */
interface CertMeta {
  slug: string
  name: string
  examCode: string
  body: string
  passingScore: string
  duration: string
  questions: string
  level: string
  shortDescription: string
  metaDescription: string
  accent: "violet" | "emerald" | "cyan" | "amber" | "rose"
  faqs: { q: string; a: string }[]
}

const CERT_DB: Record<string, CertMeta> = {
  ceh: {
    slug: "ceh",
    name: "Certified Ethical Hacker (CEH)",
    examCode: "312-50",
    body: "EC-Council",
    passingScore: "70%",
    duration: "4 hours",
    questions: "125 MCQs",
    level: "Intermediate",
    shortDescription:
      "Master the tools, techniques, and mindset of a black-hat hacker - then turn them defensive. The CEH curriculum covers reconnaissance, scanning, exploitation, malware, social engineering, and countermeasures across 20 domains.",
    metaDescription:
      "Prepare for the EC-Council Certified Ethical Hacker (CEH v13) exam with GuardianX - instructor-led training, hands-on cyber labs, mock exams, and an exam voucher.",
    accent: "violet",
    faqs: [
      {
        q: "What experience do I need before CEH?",
        a: "EC-Council recommends 2 years of information security experience, but our training path starts from fundamentals so motivated beginners can succeed.",
      },
      {
        q: "Is the CEH exam proctored?",
        a: "Yes. CEH is delivered through EC-Council's ECC exam portal with remote proctoring. Our mock exams replicate the timed, proctored environment.",
      },
      {
        q: "How long is the CEH credential valid?",
        a: "CEH is valid for 3 years. You can renew by earning 120 ECE credits or by passing the latest CEH exam again.",
      },
    ],
  },
  cissp: {
    slug: "cissp",
    name: "Certified Information Systems Security Professional (CISSP)",
    examCode: "CISSP",
    body: "ISC2",
    passingScore: "700 / 1000",
    duration: "4 hours",
    questions: "100-150 (CAT)",
    level: "Advanced",
    shortDescription:
      "The gold standard for security leadership. CISSP validates your expertise across 8 domains of the CBK - from security & risk management to software development security.",
    metaDescription:
      "Prepare for ISC2 CISSP with GuardianX - 8-domain CBK coverage, instructor-led cohorts, scenario labs, and an exam-style question bank with detailed explanations.",
    accent: "emerald",
    faqs: [
      {
        q: "What are the CISSP prerequisites?",
        a: "5 years of cumulative paid work experience in 2 of the 8 CBK domains. You can become an Associate of ISC2 by passing the exam and then earning the experience.",
      },
      {
        q: "Is CISSP a management or technical cert?",
        a: "CISSP is management-oriented. It is designed for security leaders, architects, and senior practitioners - not for hands-on keyboard hacking.",
      },
      {
        q: "How is the CISSP exam structured?",
        a: "CISSP uses Computerized Adaptive Testing (CAT) for the English version - between 100 and 150 questions, with a 3-hour time limit. A passing score is 700 out of 1000.",
      },
    ],
  },
  ccna: {
    slug: "ccna",
    name: "Cisco Certified Network Associate (CCNA 200-301)",
    examCode: "200-301",
    body: "Cisco",
    passingScore: "825 / 1000",
    duration: "2 hours",
    questions: "100-105 MCQs",
    level: "Beginner",
    shortDescription:
      "The foundation of a networking career. CCNA covers IP connectivity, security fundamentals, automation, and programmability - the launching pad for every Cisco path.",
    metaDescription:
      "Prepare for the Cisco CCNA 200-301 exam with GuardianX - instructor-led training, real Cisco IOS labs, subnetting drills, and 500+ practice questions.",
    accent: "cyan",
    faqs: [
      {
        q: "Are there prerequisites for CCNA?",
        a: "No formal prerequisites. We recommend basic IP addressing familiarity, but our Beginner track starts from the OSI model.",
      },
      {
        q: "How long is the CCNA valid?",
        a: "CCNA is valid for 3 years. Recertify by passing any CCNA exam again, or by earning 30 Continuing Education credits.",
      },
      {
        q: "Do I need real Cisco equipment?",
        a: "No. Our hands-on labs use Cisco Packet Tracer + GNS3 simulations, so you can practice every CLI command without buying hardware.",
      },
    ],
  },
  "security-plus": {
    slug: "security-plus",
    name: "CompTIA Security+ (SY0-701)",
    examCode: "SY0-701",
    body: "CompTIA",
    passingScore: "750 / 900",
    duration: "90 minutes",
    questions: "90 MCQ + PBQs",
    level: "Beginner",
    shortDescription:
      "The global entry point to cybersecurity. Security+ covers threats, attacks, vulnerabilities, architecture, operations, and program management - DoD 8570 compliant.",
    metaDescription:
      "Prepare for CompTIA Security+ SY0-701 with GuardianX - instructor-led training, performance-based questions, hands-on labs, and 600+ practice questions.",
    accent: "amber",
    faqs: [
      {
        q: "Is Security+ good for beginners?",
        a: "Yes. Security+ is the most popular entry-level cybersecurity certification. CompTIA recommends Network+ first but it is not required.",
      },
      {
        q: "How long is Security+ valid?",
        a: "Security+ is valid for 3 years. Renew with 30 CEUs by completing CompTIA's continuing education program.",
      },
      {
        q: "Is Security+ DoD 8570 compliant?",
        a: "Yes. Security+ satisfies the DoD 8570.01-M IAT Level II and IAM Level I requirements - making it a must-have for US federal roles.",
      },
    ],
  },
}

const ACCENT_STYLES: Record<CertMeta["accent"], { tint: string; text: string; border: string; bg: string; ring: string }> = {
  violet: {
    tint: "bg-violet-500/10",
    text: "text-violet-300",
    border: "border-violet-500/30",
    bg: "bg-violet-500/5",
    ring: "ring-violet-500/30",
  },
  emerald: {
    tint: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    ring: "ring-emerald-500/30",
  },
  cyan: {
    tint: "bg-cyan-500/10",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    ring: "ring-cyan-500/30",
  },
  amber: {
    tint: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    ring: "ring-amber-500/30",
  },
  rose: {
    tint: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    ring: "ring-rose-500/30",
  },
}

/* Build a CertMeta fallback for unknown slugs (so the page never breaks). */
function metaFor(slug: string): CertMeta {
  const direct = CERT_DB[slug.toLowerCase()]
  if (direct) return direct
  // Try matching by short name (e.g. slug "ceh_v13" → "ceh")
  const partial = Object.values(CERT_DB).find(
    (c) => slug.toLowerCase().includes(c.slug) || c.slug.includes(slug.toLowerCase()),
  )
  if (partial) return partial

  // Build a generic meta from the slug
  const pretty = slug
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
  return {
    slug,
    name: `${pretty} Certification Training`,
    examCode: " - ",
    body: "Industry Body",
    passingScore: " - ",
    duration: " - ",
    questions: " - ",
    level: "Intermediate",
    shortDescription:
      "Prepare for this certification with GuardianX's instructor-led training, hands-on labs, and mock exam practice.",
    metaDescription: `Prepare for the ${pretty} certification with GuardianX - instructor-led training, hands-on labs, and mock exams.`,
    accent: "violet",
    faqs: [
      {
        q: "How long is the training?",
        a: "Most cohorts run 4-8 weeks with weekend or evening schedules. We also have self-paced tracks available.",
      },
      {
        q: "Is an exam voucher included?",
        a: "Vouchers are sold separately by the certification body. Our team will guide you through the purchase process.",
      },
      {
        q: "Do you offer placement support?",
        a: "Yes - our career planner, resume builder, and mock interview tools are included with every enrollment.",
      },
    ],
  }
}

/* ------------------------------ types ------------------------------ */
interface CourseItem {
  id: string
  slug: string
  title: string
  shortName: string
  description: string
  category: string
  level: string
  durationHours: number
  price: number
  rating: number
  studentsCount: number
  color: string
  thumbnail: string | null
  tags: string
  certBody: string | null
  instructor: { id: string; name: string; title: string | null; avatar: string | null }
  lessonCount: number
  moduleCount: number
}

interface Batch {
  id: string
  certification: string
  name: string
  schedule: string
  startDate: string
  mode: string
  instructor: string
  seats: number
  enrolled: number
  level: string
  status: string
}

interface CertListItem {
  id: string
  slug: string
  name: string
  level?: string
  body?: string
}

const LEVEL_STYLES: Record<string, string> = {
  Beginner: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  Intermediate: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
  Advanced: "border-violet-500/40 text-violet-300 bg-violet-500/10",
  Expert: "border-rose-500/40 text-rose-300 bg-rose-500/10",
}

/* ------------------------------ view ------------------------------ */
export function CertLandingView({ certSlug }: CertLandingViewProps) {
  const { navigate } = useAppStore()
  const meta = React.useMemo(() => metaFor(certSlug), [certSlug])
  const accent = ACCENT_STYLES[meta.accent]

  // SEO: update document title + meta description on mount/when slug changes
  React.useEffect(() => {
    if (typeof document === "undefined") return
    document.title = `${meta.name} Training & Exam Prep | GuardianX`
    // Update or insert meta description
    let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!tag) {
      tag = document.createElement("meta")
      tag.setAttribute("name", "description")
      document.head.appendChild(tag)
    }
    tag.setAttribute("content", meta.metaDescription)
  }, [meta])

  // Courses that prepare for this cert - uses the public /api/courses?q= endpoint
  // with the slug as the search query. Falls back to a slug-keyword query.
  const { data: courseData, isLoading: coursesLoading } = useQuery<{ courses: CourseItem[] }>({
    queryKey: ["cert-courses", certSlug],
    queryFn: async () => {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(certSlug)}`)
      if (!res.ok) return { courses: [] }
      const j = await res.json()
      return { courses: j.courses ?? [] }
    },
    staleTime: 60_000,
  })

  // Training batches - public list. We filter on the client to the ones whose
  // `certification` field references this cert (substring match against meta.slug
  // OR meta.name OR meta.body).
  const { data: batchData } = useQuery<{ batches: Batch[] }>({
    queryKey: ["cert-batches", certSlug],
    queryFn: async () => {
      const res = await fetch("/api/training-batches")
      if (!res.ok) return { batches: [] }
      const j = await res.json()
      return { batches: j.batches ?? [] }
    },
    staleTime: 60_000,
  })

  // Certifications list - used for the "related certifications" rail
  const { data: certListData } = useQuery<{ certifications: CertListItem[] }>({
    queryKey: ["cert-list"],
    queryFn: async () => {
      const res = await fetch("/api/certifications")
      if (!res.ok) return { certifications: [] }
      const j = await res.json()
      return { certifications: j.certifications ?? [] }
    },
    staleTime: 5 * 60_000,
  })

  const courses = courseData?.courses ?? []
  const allBatches = batchData?.batches ?? []
  const relatedCerts = (certListData?.certifications ?? []).filter(
    (c) => c.slug && c.slug !== certSlug,
  )

  // Filter batches to the ones referencing this certification
  const certKeywords = React.useMemo(() => {
    const kw = new Set<string>([meta.slug.toLowerCase(), meta.name.toLowerCase(), meta.body.toLowerCase()])
    meta.name.split(/\s+/).forEach((w) => { if (w.length >= 3) kw.add(w.toLowerCase()) })
    return Array.from(kw).filter((k) => k && k !== "certification" && k !== "training")
  }, [meta])

  const batches = React.useMemo(
    () =>
      allBatches.filter((b) => {
        const s = (b.certification || "").toLowerCase()
        return certKeywords.some((k) => s.includes(k))
      }),
    [allBatches, certKeywords],
  )

  return (
    <div className="relative min-h-screen pb-12">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      {/* Back nav */}
      <section className="relative pt-4 pb-2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: "catalog" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Course catalog
          </Button>
        </div>
      </section>

      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Left: hero card */}
            <div className="lg:col-span-2">
              <div className="card-premium rounded-2xl p-7 lg:p-8">
                <div className="flex items-center flex-wrap gap-2 mb-5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md border uppercase",
                      accent.tint, accent.text, accent.border,
                    )}
                  >
                    <Award className="h-3 w-3" />
                    Certification Track
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center text-[10px] font-mono px-2.5 py-1 rounded-md border uppercase",
                      LEVEL_STYLES[meta.level] ?? LEVEL_STYLES.Intermediate,
                    )}
                  >
                    {meta.level}
                  </span>
                </div>

                <h1 className="text-[clamp(1.85rem,4.5vw,2.85rem)] font-bold leading-[1.05] tracking-[-0.02em] mb-3 text-balance">
                  {meta.name}
                </h1>

                <p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                  {meta.shortDescription}
                </p>

                {/* Exam facts grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-border/40">
                  <HeroFact icon={Target} label="Exam Code" value={meta.examCode} tint={accent.text} />
                  <HeroFact icon={Building2} label="Issued By" value={meta.body} tint={accent.text} />
                  <HeroFact icon={CheckCircle2} label="Passing Score" value={meta.passingScore} tint={accent.text} />
                  <HeroFact icon={Clock} label="Exam Duration" value={meta.duration} tint={accent.text} />
                  <HeroFact icon={BookOpen} label="Questions" value={meta.questions} tint={accent.text} />
                  <HeroFact icon={Layers} label="Format" value="MCQ + PBQ" tint={accent.text} />
                  <HeroFact icon={Users} label="Recognized" value="Globally" tint={accent.text} />
                  <HeroFact icon={Star} label="Industry" value={meta.level} tint={accent.text} />
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate({ name: "batches" })}
                    className={cn(
                      "btn-premium w-full sm:w-auto",
                      accent.text.replace("text-", "bg-").replace("300", "600"),
                    )}
                  >
                    <CalendarDays className="h-4 w-4 mr-1.5" />
                    View upcoming batches
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ name: "catalog" })}
                    className="w-full sm:w-auto"
                  >
                    <BookOpen className="h-4 w-4 mr-1.5" />
                    Browse all courses
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: quick CTA card */}
            <div className="lg:col-span-1">
              <div className="card-premium rounded-2xl p-6 lg:sticky lg:top-24">
                <p className={cn("text-[10px] font-mono tracking-[0.25em] mb-3", accent.text)}>
                  WHY GUARDIANX
                </p>
                <ul className="space-y-3 text-sm">
                  {[
                    { icon: GraduationCap, text: "Instructor-led, not just videos" },
                    { icon: Shield, text: "Hands-on cyber labs in browser" },
                    { icon: Target, text: "Mock exams that mirror the real test" },
                    { icon: Trophy, text: "Certificate + LinkedIn badge on pass" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={cn("shrink-0 mt-0.5", accent.text)}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="text-foreground/85 leading-snug">{item.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate({ name: "login" })}
                  className={cn("btn-premium w-full mt-5", accent.text.replace("text-", "bg-").replace("300", "600"))}
                >
                  Start learning free
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
                  Free tier · No credit card required
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------ COURSES ------------------------------ */}
      <section className="relative py-8 lg:py-10 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className={cn("text-[10px] font-mono tracking-[0.25em] mb-1", accent.text)}>
              PREPARATION COURSES
            </p>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight">
              Courses that prepare you for {meta.name.split("(")[0].trim()}
            </h2>
          </div>

          {coursesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-xl bg-card/40 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm border-border/40">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-60" />
              No courses explicitly tagged for this certification yet.{" "}
              <button
                onClick={() => navigate({ name: "catalog" })}
                className="underline text-foreground hover:text-foreground/80"
              >
                Browse the full catalog →
              </button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => navigate({ name: "course", courseId: c.slug })}
                  className="card-premium rounded-xl p-5 text-left group cursor-pointer flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn("inline-flex p-2 rounded-lg", accent.tint, accent.text)}>
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded border uppercase",
                      LEVEL_STYLES[c.level] ?? LEVEL_STYLES.Intermediate,
                    )}>
                      {c.level}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-violet-300 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/40">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {c.durationHours}h
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-amber-300" />
                      {c.rating != null ? Number(c.rating).toFixed(1) : " - "}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {c.studentsCount}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------ BATCHES ------------------------------ */}
      <section className="relative py-8 lg:py-10 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className={cn("text-[10px] font-mono tracking-[0.25em] mb-1", accent.text)}>
                UPCOMING BATCHES
              </p>
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight">
                Live instructor-led cohorts
              </h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate({ name: "batches" })}>
              All batches <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>

          {batches.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm border-border/40">
              <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-60" />
              No live batches scheduled for this cert right now.{" "}
              <button
                onClick={() => navigate({ name: "contact" })}
                className="underline text-foreground hover:text-foreground/80"
              >
                Request a cohort →
              </button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((b, i) => {
                const seatsLeft = Math.max(0, b.seats - b.enrolled)
                const isFull = seatsLeft === 0
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="card-premium rounded-xl p-5 flex flex-col h-full"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border",
                        b.status === "Open" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                        b.status === "Full" ? "bg-rose-500/10 text-rose-300 border-rose-500/30" :
                        "bg-muted/40 text-muted-foreground border-border/60",
                      )}>
                        {b.status}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {b.mode}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm leading-snug mb-2">{b.name || b.certification}</h3>
                    {b.schedule && (
                      <p className="text-xs text-muted-foreground mb-2">{b.schedule}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/40">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" />
                        {b.startDate || "TBD"}
                      </span>
                      <span className={cn("flex items-center gap-1.5", isFull && "text-rose-300")}>
                        <Users className="h-3 w-3" />
                        {seatsLeft} seats left
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------ FAQ ------------------------------ */}
      <section className="relative py-8 lg:py-10 border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <p className={cn("text-[10px] font-mono tracking-[0.25em] mb-1", accent.text)}>
              FAQ
            </p>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight">
              Common questions about {meta.name.split("(")[0].trim()}
            </h2>
          </div>
          <div className="space-y-3">
            {meta.faqs.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="card-premium rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span className={cn("shrink-0 mt-0.5", accent.text)}>
                    <HelpCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm mb-1.5">{f.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ RELATED CERTS ------------------------------ */}
      {relatedCerts.length > 0 && (
        <section className="relative py-8 lg:py-10 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <p className={cn("text-[10px] font-mono tracking-[0.25em] mb-1", accent.text)}>
                RELATED CERTIFICATIONS
              </p>
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight">
                Explore other tracks
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {relatedCerts.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate({ name: "cert-landing", certSlug: c.slug })}
                  className="card-premium rounded-xl p-4 text-left group hover:border-violet-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-violet-300" />
                    {c.level && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground uppercase">
                        {c.level}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug group-hover:text-violet-300 transition-colors line-clamp-2">
                    {c.name}
                  </h3>
                  {c.body && (
                    <p className="text-xs text-muted-foreground mt-1">{c.body}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ CTA ------------------------------ */}
      <section className="relative py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className={cn("inline-flex items-center gap-2 mb-4 rounded-full border px-3 py-1.5",
              accent.border, accent.tint, accent.text,
            )}>
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] tracking-[0.25em]">READY TO BEGIN</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3 text-balance">
              Start your <span className="text-gradient-premium">{meta.name.split("(")[0].trim()}</span> journey today
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
              Join thousands of learners who advanced their cybersecurity careers with GuardianX&apos;s
              instructor-led training and hands-on labs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => navigate({ name: "login" })}
                className={cn("btn-premium w-full sm:w-auto", accent.text.replace("text-", "bg-").replace("300", "600"))}
              >
                Get started free
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ name: "contact" })}
                className="w-full sm:w-auto"
              >
                Talk to an advisor
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------ helpers ------------------------------ */
function HeroFact({
  icon: Icon, label, value, tint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tint: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("shrink-0 mt-0.5", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-0.5">
          {label}
        </div>
        <div className="text-sm text-foreground leading-snug truncate">{value}</div>
      </div>
    </div>
  )
}
