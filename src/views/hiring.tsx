"use client"

/**
 * HiringView - public /hiring page ("Hiring" header tab). v3
 *
 * Sophisticated worldwide openings board:
 *   - Hero with the mission statement + rotating dotted world globe
 *     (canvas, pulsing markers on live hiring locations), parallax
 *     aurora layers, animated live stats and the dual-lane roles marquee
 *   - Featured openings strip (admin-pinned via SiteContent)
 *   - Discipline explorer: 8 groups x 8 role families, click-to-filter
 *   - Openings grid: sticky glass filter bar, 3D-tilt spotlight cards
 *     with glow edges on NEW/featured roles + inline Quick Apply
 *   - "How hiring works" timeline, hiring-partner logo wall,
 *     life-at-GuardianX quotes, FAQ accordion (+ FAQPage JSON-LD)
 *   - Apply flows: signed-in users apply in one click; GUESTS apply
 *     directly without any account via POST /api/hiring/jobs/[id]/apply.
 *
 * Data: GET /api/hiring/jobs (public, no auth). SEO: client-injected
 * JobPosting + FAQPage JSON-LD.
 */

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion, useScroll, useTransform } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { CountUp } from "@/components/platform/count-up"
import { WorldGlobe } from "@/components/hiring/world-globe"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Globe2, Search, MapPin, Home, Briefcase, Clock, Users, ArrowRight,
  X, CheckCircle2, BadgeCheck, Wallet, GraduationCap, Send, Loader2,
  ListChecks, Building2, Sparkles, Target, Wifi, Rocket, Mail, Phone,
  Link2, Radar, Crosshair, ShieldCheck, Scale, Code2, CloudCog,
  BrainCircuit, Users2, Star, MousePointerClick, MessagesSquare, Trophy,
  Quote,
} from "lucide-react"

// ============================================================
// Types + helpers
// ============================================================
interface PublicJob {
  id: string
  title: string
  company: string
  companyLogo: string | null
  location: string
  remote: boolean
  type: string
  salary: string
  description: string
  requirements: string
  requiredCerts: string[]
  requiredSkills: string[]
  createdAt: string
  applicants: number
}

const TYPE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
]

function typeLabel(t: string): string {
  const map: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", internship: "Internship" }
  return map[t] || t
}

function typeTint(t: string): string {
  const map: Record<string, string> = {
    "full-time": "text-violet-300 border-violet-500/30 bg-violet-500/10",
    "part-time": "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
    contract: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    internship: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  }
  return map[t] || "text-zinc-300 border-zinc-500/30 bg-zinc-500/10"
}

function schemaEmploymentType(t: string): string {
  const map: Record<string, string> = {
    "full-time": "FULL_TIME",
    "part-time": "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
  }
  return map[t] || "OTHER"
}

/** Country / region label = text after the last comma ("Dubai, UAE" -> "UAE"). */
function deriveCountry(location: string): string {
  const parts = (location || "").split(",").map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || "Global"
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d < 1) return "today"
  if (d === 1) return "yesterday"
  if (d < 30) return `${d}d ago`
  const m = Math.floor(d / 30)
  if (m < 12) return `${m}mo ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 86_400_000
}

function splitLines(s: string): string[] {
  return (s || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
}

// ============================================================
// Role taxonomy - nearly every role in technology
// ============================================================
const MARQUEE_A = [
  "SOC Analyst", "Penetration Tester", "Security Architect", "DevSecOps Engineer",
  "Cloud Security Engineer", "Threat Hunter", "Incident Responder", "GRC Analyst",
  "Full-Stack Developer", "Data Scientist", "Machine Learning Engineer", "DevOps Engineer",
  "Site Reliability Engineer", "Product Manager", "UX/UI Designer", "Data Engineer",
  "IAM Engineer", "Malware Analyst", "Application Security Engineer", "Network Engineer",
  "Digital Forensics Analyst", "Compliance Manager", "AI Engineer", "Platform Engineer",
]

const MARQUEE_B = [
  "Red Team Operator", "Bug Bounty Hunter", "Detection Engineer", "Security Auditor",
  "Frontend Engineer", "Backend Engineer", "Mobile Engineer", "Blockchain Developer",
  "Embedded Engineer", "QA Automation Engineer", "Kubernetes Specialist", "Database Administrator",
  "Privacy Officer", "Risk Analyst", "Cryptography Engineer", "Vulnerability Analyst",
  "Cybersecurity Instructor", "Curriculum Designer", "Technical Writer", "Sales Engineer",
  "Business Intelligence Analyst", "Analytics Engineer", "IT Support Specialist", "CISO",
]

const DISCIPLINES: { label: string; icon: React.ElementType; tint: string; roles: string[] }[] = [
  {
    label: "Security Operations",
    icon: Radar,
    tint: "text-violet-300 bg-violet-500/10 border-violet-500/25",
    roles: ["SOC Analyst", "Threat Hunter", "Incident Responder", "Digital Forensics Analyst", "Malware Analyst", "Vulnerability Analyst", "Blue Team Analyst", "Detection Engineer"],
  },
  {
    label: "Offensive Security",
    icon: Crosshair,
    tint: "text-rose-300 bg-rose-500/10 border-rose-500/25",
    roles: ["Penetration Tester", "Red Team Operator", "Bug Bounty Hunter", "Exploit Developer", "Web Application Security", "Mobile Security Analyst", "Adversary Emulation Lead", "Social Engineering Specialist"],
  },
  {
    label: "Security Engineering",
    icon: ShieldCheck,
    tint: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    roles: ["Cybersecurity Engineer", "Security Architect", "DevSecOps Engineer", "Cloud Security Engineer", "Application Security Engineer", "IAM Engineer", "Network Security Engineer", "Cryptography Engineer"],
  },
  {
    label: "Governance & Risk",
    icon: Scale,
    tint: "text-amber-300 bg-amber-500/10 border-amber-500/25",
    roles: ["GRC Analyst", "Compliance Manager", "Risk Analyst", "Privacy Officer", "Security Auditor", "ISO 27001 Lead", "Policy Writer", "Third-Party Risk Analyst"],
  },
  {
    label: "Software Engineering",
    icon: Code2,
    tint: "text-sky-300 bg-sky-500/10 border-sky-500/25",
    roles: ["Full-Stack Developer", "Frontend Engineer", "Backend Engineer", "Mobile Engineer", "Blockchain Developer", "Embedded Engineer", "Game Developer", "QA Automation Engineer"],
  },
  {
    label: "Cloud & Infrastructure",
    icon: CloudCog,
    tint: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
    roles: ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer", "Systems Administrator", "Network Engineer", "Kubernetes Specialist", "Database Administrator", "IT Support Specialist"],
  },
  {
    label: "Data & AI",
    icon: BrainCircuit,
    tint: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/25",
    roles: ["Data Scientist", "Data Engineer", "Data Analyst", "Machine Learning Engineer", "AI Engineer", "Business Intelligence Analyst", "Analytics Engineer", "Research Scientist"],
  },
  {
    label: "Product, People & Training",
    icon: Users2,
    tint: "text-teal-300 bg-teal-500/10 border-teal-500/25",
    roles: ["Product Manager", "Project Manager", "UX/UI Designer", "Technical Writer", "Sales Engineer", "Customer Success Manager", "Cybersecurity Instructor", "Curriculum Designer"],
  },
]

// ============================================================
// Root
// ============================================================
export function HiringView() {
  const { navigate } = useAppStore()
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [remoteOnly, setRemoteOnly] = React.useState(false)
  const [countryFilter, setCountryFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<{ job: PublicJob; autoApply?: boolean } | null>(null)

  // Parallax: hero aurora layers drift at different speeds on scroll.
  const heroRef = React.useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const orbY1 = useTransform(scrollYProgress, [0, 1], [0, 140])
  const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -90])

  // Session awareness (signed-in users get the one-click apply path).
  const [sessionUser, setSessionUser] = React.useState<{ name?: string; email?: string; role?: string } | null>(null)
  React.useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSessionUser(d?.user ?? null))
      .catch(() => setSessionUser(null))
  }, [])

  const { data, isLoading } = useQuery<{ jobs: PublicJob[]; count: number; featured?: string[]; degraded?: boolean }>({
    queryKey: ["hiring-jobs"],
    queryFn: () => api("/api/hiring/jobs"),
    refetchInterval: 120_000,
  })
  const jobs = data?.jobs ?? []
  const featuredIds = React.useMemo(() => new Set(data?.featured ?? []), [data])
  const featuredJobs = React.useMemo(
    () => jobs.filter((j) => featuredIds.has(j.id)).slice(0, 6),
    [jobs, featuredIds]
  )
  const companies = React.useMemo(
    () => Array.from(new Set(jobs.map((j) => j.company))).slice(0, 12),
    [jobs]
  )
  const locations = React.useMemo(() => Array.from(new Set(jobs.map((j) => j.location))), [jobs])

  const countries = React.useMemo(() => {
    const set = new Set<string>()
    for (const j of jobs) set.add(deriveCountry(j.location))
    return Array.from(set).sort()
  }, [jobs])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      if (remoteOnly && !j.remote) return false
      if (typeFilter !== "all" && j.type !== typeFilter) return false
      if (countryFilter !== "all" && deriveCountry(j.location) !== countryFilter) return false
      if (q) {
        const hay = `${j.title} ${j.company} ${j.location} ${j.requiredSkills.join(" ")} ${j.description}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [jobs, search, typeFilter, remoteOnly, countryFilter])

  const stats = React.useMemo(() => {
    const openRoles = jobs.length
    const countryCount = countries.filter((c) => !/^remote/i.test(c)).length
    const remoteShare = openRoles > 0 ? Math.round((jobs.filter((j) => j.remote).length / openRoles) * 100) : 0
    const applications = jobs.reduce((sum, j) => sum + (j.applicants || 0), 0)
    return { openRoles, countryCount, remoteShare, applications }
  }, [jobs, countries])

  const filtersActive = search.trim() !== "" || typeFilter !== "all" || remoteOnly || countryFilter !== "all"

  function clearFilters() {
    setSearch("")
    setTypeFilter("all")
    setRemoteOnly(false)
    setCountryFilter("all")
  }

  function searchFor(term: string) {
    setSearch(term)
    setTypeFilter("all")
    setRemoteOnly(false)
    setCountryFilter("all")
    document.getElementById("openings")?.scrollIntoView({ behavior: "smooth" })
  }

  function openJob(job: PublicJob, autoApply = false) {
    setSelected({ job, autoApply })
  }

  return (
    <div className="min-h-screen">
      {/* ================= HERO ================= */}
      <section ref={heroRef} className="relative overflow-hidden pt-28 pb-14 px-4 sm:px-6 lg:px-8">
        {/* aurora + grid backdrop (parallax layers) */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div style={{ y: orbY1 }} className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[52rem] rounded-full bg-violet-600/20 blur-[130px]" />
          <motion.div style={{ y: orbY2 }} className="absolute top-20 -left-28 h-72 w-72 rounded-full bg-emerald-500/12 blur-[100px]" />
          <motion.div style={{ y: orbY2 }} className="absolute top-32 -right-24 h-72 w-72 rounded-full bg-sky-500/12 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[110px]" />
          <div
            className="absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_30%,transparent_75%)] opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(148 163 184 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.5) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-6 items-center">
            {/* left: copy */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Hiring worldwide, open roles in every timezone
                <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06 }}
                className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.06]"
              >
                Build the future of{" "}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
                  cyber defense
                </span>
                <br className="hidden sm:block" /> from anywhere on Earth
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-5 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                GuardianX and partner companies are hiring security engineers, instructors,
                analysts and builders across every timezone. Find your next role below.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                className="mt-5 flex items-center justify-center lg:justify-start gap-2 flex-wrap"
              >
                {[
                  { icon: Wifi, label: "Remote-first" },
                  { icon: Globe2, label: "Globally distributed" },
                  { icon: Target, label: "Mission-driven" },
                ].map((t) => (
                  <span
                    key={t.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-foreground/80"
                  >
                    <t.icon className="h-3 w-3 text-violet-300" /> {t.label}
                  </span>
                ))}
              </motion.div>

              {/* live stats */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 }}
                className="mt-9 flex items-center justify-center lg:justify-start gap-3 flex-wrap"
              >
                <HeroStat icon={Briefcase} value={<CountUp value={stats.openRoles} />} label={stats.openRoles === 1 ? "Open role" : "Open roles"} />
                <HeroStat icon={Globe2} value={<CountUp value={stats.countryCount} />} label={stats.countryCount === 1 ? "Country" : "Countries"} />
                <HeroStat icon={Home} value={<CountUp value={stats.remoteShare} suffix="%" />} label="Remote-friendly" />
                <HeroStat icon={Users} value={<CountUp value={stats.applications} />} label="Applications" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.26 }}
                className="mt-9 flex items-center justify-center lg:justify-start gap-3 flex-wrap"
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-violet-500 text-white h-11 px-7 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)]"
                  onClick={() => document.getElementById("openings")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Browse openings <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-6 backdrop-blur"
                  onClick={() => navigate({ name: "contact" })}
                >
                  Don't see your role? Talk to us
                </Button>
              </motion.div>
            </div>

            {/* right: rotating world globe with live hiring markers */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative mx-auto w-full max-w-[500px]"
            >
              <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                <div className="h-[70%] w-[70%] rounded-full bg-violet-600/10 blur-[70px]" />
              </div>
              <WorldGlobe locations={locations} className="relative h-[320px] sm:h-[420px] lg:h-[500px] w-full" />
              <p className="relative text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle animate-pulse" />
                {locations.length} live hiring {locations.length === 1 ? "location" : "locations"}
              </p>
            </motion.div>
          </div>

          {/* dual-lane roles marquee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="relative mt-12 space-y-3 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
          >
            <MarqueeRow items={MARQUEE_A} duration={52} />
            <MarqueeRow items={MARQUEE_B} duration={64} reverse />
          </motion.div>
        </div>
      </section>

      {/* ================= FEATURED OPENINGS ================= */}
      {featuredJobs.length > 0 && (
        <FeaturedStrip jobs={featuredJobs} onOpen={openJob} />
      )}

      {/* ================= DISCIPLINES ================= */}
      <section id="disciplines" className="px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hiring across almost every role in{" "}
              <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">technology</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Tap a discipline to search live openings instantly. New roles are added across the stack every week.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DISCIPLINES.map((group, gi) => (
              <motion.div
                key={group.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: Math.min(gi, 7) * 0.04 }}
                className="rounded-2xl border border-border/60 bg-card/40 p-4 flex flex-col gap-3 hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl border", group.tint)}>
                    <group.icon className="h-[18px] w-[18px]" />
                  </div>
                  <h3 className="text-[13px] font-semibold leading-tight">{group.label}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {group.roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => searchFor(role)}
                      className="rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[10.5px] text-muted-foreground transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= OPENINGS ================= */}
      <section id="openings" className="px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-16">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Open roles around the world</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Every application goes straight to the hiring team. No account required.
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5 mr-1">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live board
            </Badge>
          </div>

          {/* Sticky glass filter bar */}
          <div className="sticky top-[76px] z-30 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-xl p-4 space-y-3 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roles, companies, skills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRemoteOnly((v) => !v)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors inline-flex items-center gap-1.5",
                    remoteOnly
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Home className="h-3.5 w-3.5" /> Remote only
                </button>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[190px] h-10 text-xs">
                    <SelectValue placeholder="Country / region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeFilter(t.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                    typeFilter === t.value
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {filtered.length} of {jobs.length} roles
              </span>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-56 rounded-2xl border border-border/60 bg-card/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 py-20 flex flex-col items-center text-center px-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-300 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">
                {jobs.length === 0 ? "No open roles right now" : "No roles match your filters"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                {jobs.length === 0
                  ? "New positions are posted regularly. Check back soon, or send us your profile and we'll keep you in mind."
                  : "Try widening your search. Clear a filter or two and see what's out there."}
              </p>
              <Button
                size="sm"
                variant={jobs.length === 0 ? "default" : "outline"}
                className={cn("mt-5", jobs.length === 0 && "bg-gradient-to-r from-violet-600 to-violet-500 text-white")}
                onClick={() => (jobs.length === 0 ? navigate({ name: "contact" }) : clearFilters())}
              >
                {jobs.length === 0 ? "Send us your profile" : "Clear filters"}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job, i) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={i}
                  featured={featuredIds.has(job.id)}
                  onOpen={() => openJob(job)}
                  onQuickApply={() => openJob(job, true)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= TIMELINE / LOGOS / LIFE / FAQ ================= */}
      <HowItWorks />
      <LogoWall companies={companies} />
      <LifeAtGuardianX />
      <HiringFaq />

      {/* ================= BOTTOM CTA ================= */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 via-card/40 to-emerald-500/10 p-8 sm:p-10 text-center relative overflow-hidden">
          <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-violet-600/15 blur-[80px]" />
          <h2 className="relative text-xl sm:text-2xl font-bold">Great people know great people</h2>
          <p className="relative text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Nothing fits right now? We keep talented people in mind for future openings.
            Introduce yourself, or point a friend our way.
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Button className="bg-gradient-to-r from-violet-600 to-violet-500 text-white" onClick={() => navigate({ name: "contact" })}>
              Get in touch <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" onClick={() => navigate({ name: "catalog" })}>
              <GraduationCap className="h-4 w-4 mr-1.5" /> Train with us first
            </Button>
          </div>
        </div>
      </section>

      {/* ================= SEO: JSON-LD ================= */}
      <HiringJsonLd jobs={jobs} />

      {/* ================= DETAIL DIALOG ================= */}
      {selected && (
        <JobDetailDialog
          job={selected.job}
          sessionUser={sessionUser}
          autoApply={selected.autoApply}
          onClose={() => setSelected(null)}
          onNeedSignIn={() => { setSelected(null); navigate({ name: "login" }) }}
        />
      )}
    </div>
  )
}

// ============================================================
// Pieces
// ============================================================
function HeroStat({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/40 backdrop-blur px-4 py-2.5 hover:border-violet-500/30 transition-colors">
      <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-violet-500/10 text-violet-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-left">
        <div className="text-lg font-bold leading-none tabular-nums">{value}</div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function MarqueeRow({ items, duration, reverse = false }: { items: string[]; duration: number; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "flex w-max items-center gap-2.5 hover:[animation-play-state:paused]",
          reverse ? "animate-[gx-marquee-reverse_linear_infinite]" : "animate-[gx-marquee_linear_infinite]"
        )}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((role, i) => (
          <span
            key={`${role}-${i}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/50 bg-card/40 backdrop-blur px-3.5 py-1.5 text-[11px] text-muted-foreground"
          >
            <span className="h-1 w-1 rounded-full bg-violet-400/70" />
            {role}
          </span>
        ))}
      </div>
    </div>
  )
}

function CompanyTile({ job, size = "md" }: { job: PublicJob; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-xl rounded-2xl" : "h-11 w-11 text-base rounded-xl"
  if (job.companyLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={job.companyLogo} alt={job.company} className={cn(cls, "object-cover border border-border/60")} />
    )
  }
  return (
    <div className={cn(cls, "flex items-center justify-center font-bold bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 text-violet-200 border border-violet-500/20 shrink-0")}>
      {(job.company || "?").charAt(0).toUpperCase()}
    </div>
  )
}

/** Rotating conic-gradient sweep used as an animated glow border. */
function GlowEdge({ tone = "violet" }: { tone?: "violet" | "amber" }) {
  const stops =
    tone === "amber"
      ? "rgba(252,211,77,0.55) 30deg"
      : "rgba(139,92,246,0.55) 30deg"
  return (
    <span
      aria-hidden
      className="absolute inset-[-150%] animate-[gx-spin_7s_linear_infinite]"
      style={{
        background: `conic-gradient(from 0deg, transparent 0deg, ${stops}, transparent 60deg, transparent 180deg, rgba(52,211,153,0.4) 210deg, transparent 240deg)`,
      }}
    />
  )
}

/** Spotlight + 3D tilt card: cursor-following glow and perspective tilt. */
function JobCard({
  job,
  index,
  featured,
  onOpen,
  onQuickApply,
}: {
  job: PublicJob
  index: number
  featured: boolean
  onOpen: () => void
  onQuickApply: () => void
}) {
  const innerRef = React.useRef<HTMLDivElement>(null)
  const country = deriveCountry(job.location)
  const glow = featured || isNew(job.createdAt)

  function onMove(e: React.MouseEvent) {
    const el = innerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty("--sx", `${e.clientX - r.left}px`)
    el.style.setProperty("--sy", `${e.clientY - r.top}px`)
    el.style.transform = `perspective(900px) rotateX(${(-py * 4.5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`
  }
  function onLeave() {
    const el = innerRef.current
    if (!el) return
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.04 }}
      className="group"
    >
      <div
        ref={innerRef}
        data-gx-fx="off"
        role="button"
        tabIndex={0}
        aria-label={`View role: ${job.title}`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onOpen()
          }
        }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={cn(
          "relative h-full rounded-2xl overflow-hidden outline-none cursor-pointer transition-transform duration-300 ease-out",
          "focus-visible:ring-2 focus-visible:ring-violet-400/60"
        )}
      >
        {glow && <GlowEdge tone={featured ? "amber" : "violet"} />}
        <div className={cn("relative m-px rounded-[15px] h-full flex flex-col gap-3 p-5", glow ? "bg-card" : "bg-card/40 border border-border/60")}>
          {/* spotlight glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[15px]"
            style={{ background: "radial-gradient(300px circle at var(--sx, 50%) var(--sy, 50%), rgba(139,92,246,0.13), transparent 65%)" }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <CompanyTile job={job} />
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {featured && (
                <Badge className="text-[9px] text-amber-950 border-0 bg-gradient-to-r from-amber-300 to-yellow-200">
                  <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-900" /> FEATURED
                </Badge>
              )}
              {isNew(job.createdAt) && (
                <Badge className="text-[9px] text-white border-0 bg-emerald-600">NEW</Badge>
              )}
              {job.remote && (
                <Badge variant="outline" className="text-[9px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                  <Home className="h-2.5 w-2.5 mr-0.5" /> Remote
                </Badge>
              )}
            </div>
          </div>

          <div className="relative min-w-0">
            <h3 className="font-semibold text-[15px] leading-snug group-hover:text-violet-200 transition-colors line-clamp-2">{job.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</span>
              <span className="text-zinc-600">·</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
            </p>
          </div>

          <div className="relative flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={cn("text-[9px]", typeTint(job.type))}>{typeLabel(job.type)}</Badge>
            {job.salary && (
              <Badge variant="outline" className="text-[9px] text-zinc-300 border-zinc-500/30 bg-zinc-500/10">
                <Wallet className="h-2.5 w-2.5 mr-0.5" /> {job.salary}
              </Badge>
            )}
          </div>

          {job.requiredSkills.length > 0 && (
            <div className="relative flex items-center gap-1.5 flex-wrap">
              {job.requiredSkills.slice(0, 3).map((s) => (
                <span key={s} className="rounded-md bg-muted/30 border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
              ))}
              {job.requiredSkills.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{job.requiredSkills.length - 3} more</span>
              )}
            </div>
          )}

          <div className="relative mt-auto pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> {country}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(job.createdAt)}</span>
              {job.applicants > 0 && (
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {job.applicants}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onQuickApply() }}
                className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-200 transition-colors hover:bg-violet-500/20"
              >
                <Send className="h-2.5 w-2.5" /> Apply
              </button>
              <span className="inline-flex items-center gap-1 font-medium text-violet-300 opacity-90 group-hover:opacity-100 transition-opacity">
                View <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Featured openings strip: big glowing cards, horizontal snap scroll. */
function FeaturedStrip({ jobs, onOpen }: { jobs: PublicJob[]; onOpen: (job: PublicJob, autoApply?: boolean) => void }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <Star className="h-5 w-5 text-amber-300 fill-amber-300" /> Featured openings
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">Hand-picked roles our teams are most excited to fill right now.</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 custom-scrollbar -mx-1 px-1">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: Math.min(i, 4) * 0.06 }}
              className="relative min-w-[300px] sm:min-w-[370px] max-w-[370px] snap-start shrink-0"
            >
              <div
                data-gx-fx="off"
                className="relative rounded-2xl overflow-hidden h-full group"
                onMouseMove={(e) => {
                  const el = e.currentTarget
                  const r = el.getBoundingClientRect()
                  el.style.setProperty("--sx", `${e.clientX - r.left}px`)
                  el.style.setProperty("--sy", `${e.clientY - r.top}px`)
                }}
              >
                <GlowEdge tone="amber" />
                <div className="relative m-px rounded-[15px] bg-card p-5 flex flex-col gap-3 h-full">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[15px]"
                    style={{ background: "radial-gradient(340px circle at var(--sx, 50%) var(--sy, 50%), rgba(252,211,77,0.10), transparent 65%)" }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CompanyTile job={job} size="lg" />
                      <div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</p>
                        <Badge className="mt-1 text-[9px] text-amber-950 border-0 bg-gradient-to-r from-amber-300 to-yellow-200">
                          <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-900" /> FEATURED
                        </Badge>
                      </div>
                    </div>
                    {job.remote && (
                      <Badge variant="outline" className="text-[9px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                        <Home className="h-2.5 w-2.5 mr-0.5" /> Remote
                      </Badge>
                    )}
                  </div>
                  <h3 className="relative text-base font-semibold leading-snug group-hover:text-amber-100 transition-colors">{job.title}</h3>
                  <div className="relative flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-[9px]", typeTint(job.type))}>{typeLabel(job.type)}</Badge>
                    {job.salary && (
                      <Badge variant="outline" className="text-[9px] text-zinc-300 border-zinc-500/30 bg-zinc-500/10">
                        <Wallet className="h-2.5 w-2.5 mr-0.5" /> {job.salary}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[9px] text-sky-300 border-sky-500/30 bg-sky-500/10">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" /> {job.location}
                    </Badge>
                  </div>
                  {job.requiredSkills.length > 0 && (
                    <div className="relative flex items-center gap-1.5 flex-wrap">
                      {job.requiredSkills.slice(0, 4).map((s) => (
                        <span key={s} className="rounded-md bg-muted/30 border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="relative mt-auto pt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                      onClick={() => onOpen(job, true)}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" /> Apply now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onOpen(job)}>
                      View role
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** "How hiring works": 3-step animated timeline. */
function HowItWorks() {
  const steps = [
    { icon: MousePointerClick, title: "Apply in 1 minute", desc: "One short form, no account needed. Your application lands directly with the hiring team.", tint: "text-violet-300 bg-violet-500/10 border-violet-500/30" },
    { icon: MessagesSquare, title: "Meet the team", desc: "A friendly conversation with your future teammates, scheduled around your timezone.", tint: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
    { icon: Trophy, title: "Offer & onboard", desc: "Welcome aboard. Remote-first setup, learning budget and real mission from day one.", tint: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  ]
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How hiring works</h2>
          <p className="text-sm text-muted-foreground mt-2">Three steps between you and your next mission.</p>
        </div>
        <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
          {/* connector line */}
          <div aria-hidden className="hidden sm:block absolute top-7 left-[16%] right-[16%] h-px bg-gradient-to-r from-violet-500/50 via-fuchsia-500/40 to-emerald-500/50" />
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className={cn("relative flex items-center justify-center h-14 w-14 rounded-2xl border bg-background z-10", s.tint)}>
                <s.icon className="h-6 w-6" />
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-[260px]">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Hiring partner wall: monogram tiles for companies with live openings. */
function LogoWall({ companies }: { companies: string[] }) {
  if (companies.length < 2) return null
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Teams hiring on GuardianX</h2>
          <p className="text-sm text-muted-foreground mt-2">GuardianX and partner companies, hiring from one mission-driven board.</p>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {companies.map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: Math.min(i, 11) * 0.04 }}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/40 px-4 py-2.5 hover:border-violet-500/40 transition-colors"
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-lg font-bold text-sm bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 text-violet-200 border border-violet-500/20">
                {c.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-medium">{c}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Life at GuardianX: values + team quotes. */
function LifeAtGuardianX() {
  const values = ["Mission-driven", "Async-first", "Learn always", "Ship globally", "Own your work", "Kind, candid feedback"]
  const quotes = [
    { text: "I joined from Lagos and now ship security training used in 40+ countries. Async here actually means async.", name: "Adaeze O.", role: "Security Engineer", tint: "from-violet-500/30 to-fuchsia-500/20" },
    { text: "The certification budget is real. I added OSCP in my first year and my whole team celebrated.", name: "Daniel K.", role: "SOC Lead", tint: "from-sky-500/30 to-cyan-500/20" },
    { text: "We hire for curiosity. Certificates open doors, but what we build together is what matters.", name: "Priya S.", role: "Head of Talent", tint: "from-emerald-500/30 to-teal-500/20" },
  ]
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Life at <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">GuardianX</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2">A distributed team with one mission: make the digital world safer.</p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {values.map((v) => (
              <span key={v} className="rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">{v}</span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quotes.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
              className="rounded-2xl border border-border/60 bg-card/40 p-5 flex flex-col gap-4 hover:border-violet-500/30 transition-colors"
            >
              <Quote className="h-5 w-5 text-violet-400/60" />
              <p className="text-sm text-foreground/85 leading-relaxed">{q.text}</p>
              <div className="mt-auto flex items-center gap-3">
                <span className={cn("flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br text-xs font-bold text-white", q.tint)}>
                  {q.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <div>
                  <p className="text-xs font-semibold">{q.name}</p>
                  <p className="text-[10px] text-muted-foreground">{q.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** FAQ accordion + FAQPage JSON-LD for rich results. */
const FAQ_ITEMS = [
  { q: "Do I need an account to apply?", a: "No. Every role accepts direct applications with just your name and email. If you have a GuardianX profile you can also apply in one click and your certifications speak for you, but an account is never required." },
  { q: "Is GuardianX fully remote?", a: "We are remote-first: most roles can be done from anywhere in your timezone. Some positions have office or on-site components, and every opening clearly shows its location and remote badge." },
  { q: "Do you sponsor visas?", a: "For select roles and countries, yes. If a role is visa-eligible it is mentioned in the job description. Even without sponsorship, remote-first roles let you work from your home country." },
  { q: "I'm a student or early in my career. Can I apply?", a: "Absolutely. We run internships and entry-level roles across security operations, engineering and content. GuardianX certifications and hands-on labs are a strong plus, and the learning budget continues after you join." },
  { q: "What happens after I apply?", a: "Every application is read by our talent team. If there is a match, you will hear from us within two weeks for a short conversation. Either way, your profile stays in mind for future openings." },
  { q: "Can I refer a friend?", a: "Yes, great people know great people. Point a friend to a role or introduce them through the contact page, and we will take it from there." },
]

function HiringFaq() {
  // FAQPage JSON-LD (client-injected, cleaned up on unmount).
  React.useEffect(() => {
    const prev = document.getElementById("gx-hiring-faq-jsonld")
    if (prev) prev.remove()
    const data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    }
    const el = document.createElement("script")
    el.type = "application/ld+json"
    el.id = "gx-hiring-faq-jsonld"
    el.textContent = JSON.stringify(data)
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Hiring FAQ</h2>
          <p className="text-sm text-muted-foreground mt-2">Everything you wanted to ask before hitting apply.</p>
        </div>
        <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card/40 px-4">
          {FAQ_ITEMS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
              <AccordionTrigger className="text-sm text-left hover:no-underline hover:text-violet-200">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

// ============================================================
// Detail dialog: rich role view + dual apply flow
// (signed-in: one-click via /api/jobs/[id]/apply; guests: direct
// application without an account via /api/hiring/jobs/[id]/apply)
// ============================================================
function JobDetailDialog({
  job,
  sessionUser,
  autoApply,
  onClose,
  onNeedSignIn,
}: {
  job: PublicJob
  sessionUser: { name?: string; email?: string; role?: string } | null
  autoApply?: boolean
  onClose: () => void
  onNeedSignIn: () => void
}) {
  const signedIn = !!sessionUser
  const [coverLetter, setCoverLetter] = React.useState("")
  const [showCover, setShowCover] = React.useState(false)
  const [guestSent, setGuestSent] = React.useState(false)
  const applyRef = React.useRef<HTMLElement>(null)

  // guest form state
  const [gName, setGName] = React.useState("")
  const [gEmail, setGEmail] = React.useState("")
  const [gPhone, setGPhone] = React.useState("")
  const [gLink, setGLink] = React.useState("")
  const [gNote, setGNote] = React.useState("")

  // Quick Apply: scroll straight to the application area.
  React.useEffect(() => {
    if (autoApply) {
      const t = setTimeout(() => applyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300)
      return () => clearTimeout(t)
    }
  }, [autoApply])

  const applyMutation = useMutation({
    mutationFn: async () => {
      return api(`/api/jobs/${job.id}/apply`, { method: "POST", body: JSON.stringify({ coverLetter }) })
    },
    onSuccess: () => toast.success(`Application sent. Good luck for ${job.title}!`),
    onError: (e: any) => {
      if (e?.status === 409) toast.info("You've already applied for this role.")
      else toast.error(e?.message || "Could not submit application")
    },
  })

  const guestMutation = useMutation({
    mutationFn: async () => {
      return api(`/api/hiring/jobs/${job.id}/apply`, {
        method: "POST",
        body: JSON.stringify({ name: gName, email: gEmail, phone: gPhone, linkedin: gLink, note: gNote }),
      })
    },
    onSuccess: () => setGuestSent(true),
    onError: (e: any) => {
      if (e?.status === 409) toast.info("You've already applied for this role with this email.")
      else toast.error(e?.message || "Could not submit application")
    },
  })

  const guestValid = gName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(gEmail.trim())
  const requirements = splitLines(job.requirements)
  const country = deriveCountry(job.location)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-start gap-3.5 pr-6">
            <CompanyTile job={job} size="lg" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-left text-lg leading-snug">{job.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</span>
                <span className="text-zinc-600">·</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                <span className="text-zinc-600">·</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> posted {timeAgo(job.createdAt)}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* chips row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px]", typeTint(job.type))}>{typeLabel(job.type)}</Badge>
            {job.remote && (
              <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                <Home className="h-3 w-3 mr-0.5" /> Remote OK
              </Badge>
            )}
            {job.salary && (
              <Badge variant="outline" className="text-[10px] text-zinc-300 border-zinc-500/30 bg-zinc-500/10">
                <Wallet className="h-3 w-3 mr-0.5" /> {job.salary}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] text-sky-300 border-sky-500/30 bg-sky-500/10">
              <Globe2 className="h-3 w-3 mr-0.5" /> {country}
            </Badge>
            {job.applicants > 0 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                <Users className="h-3 w-3 mr-0.5" /> {job.applicants} applicant{job.applicants === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          {/* description */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-violet-300" /> About the role
            </h4>
            <div className="text-sm text-foreground/85 leading-relaxed space-y-2">
              {job.description.split(/\r?\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>

          {/* requirements */}
          {requirements.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5 text-violet-300" /> What you'll bring
              </h4>
              <ul className="space-y-1.5">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* certs + skills */}
          {(job.requiredCerts.length > 0 || job.requiredSkills.length > 0) && (
            <section className="space-y-2">
              {job.requiredCerts.length > 0 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1 w-full">Certifications that help</span>
                  {job.requiredCerts.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/10">
                      <BadgeCheck className="h-3 w-3 mr-0.5" /> {c}
                    </Badge>
                  ))}
                </div>
              )}
              {job.requiredSkills.length > 0 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1 w-full">Skills</span>
                  {job.requiredSkills.map((s) => (
                    <span key={s} className="rounded-md bg-muted/30 border border-border/40 px-2 py-0.5 text-[11px]">{s}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* apply area */}
          <section ref={applyRef} className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-3 scroll-mt-6">
            {signedIn ? (
              <>
                <p className="text-[11px] text-muted-foreground">
                  Applying as <span className="text-foreground font-medium">{sessionUser?.name || "your GuardianX profile"}</span>
                </p>
                {!showCover ? (
                  <button
                    type="button"
                    onClick={() => setShowCover(true)}
                    className="text-[11px] text-violet-300 hover:underline"
                  >
                    + Add a short note with your application (optional)
                  </button>
                ) : (
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="Why are you a great fit for this role?"
                    className="w-full rounded-lg border border-border/60 bg-background/60 p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  />
                )}
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                  disabled={applyMutation.isPending}
                  onClick={() => applyMutation.mutate()}
                >
                  {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Apply for this role
                </Button>
              </>
            ) : guestSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
                  className="flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-3"
                >
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </motion.div>
                <h4 className="text-sm font-semibold">Application received</h4>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                  Thanks {gName.trim().split(/\s+/)[0]}! Your application for{" "}
                  <span className="text-foreground font-medium">{job.title}</span> is in. Our talent team reviews
                  every application personally and will reach out at{" "}
                  <span className="text-foreground font-medium">{gEmail.trim()}</span> if it's a match.
                </p>
                <Button size="sm" variant="outline" className="mt-4" onClick={onClose}>
                  Browse more roles
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">Apply directly, no account needed</p>
                  <Badge variant="outline" className="text-[9px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                    1 min
                  </Badge>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="relative">
                    <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={gName}
                      onChange={(e) => setGName(e.target.value)}
                      placeholder="Full name *"
                      maxLength={100}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      value={gEmail}
                      onChange={(e) => setGEmail(e.target.value)}
                      placeholder="Email *"
                      maxLength={200}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={gPhone}
                      onChange={(e) => setGPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      maxLength={30}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={gLink}
                      onChange={(e) => setGLink(e.target.value)}
                      placeholder="LinkedIn or portfolio (optional)"
                      maxLength={300}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
                <textarea
                  value={gNote}
                  onChange={(e) => setGNote(e.target.value)}
                  rows={3}
                  maxLength={3000}
                  placeholder="Tell us why you're a great fit (optional)"
                  className="w-full rounded-lg border border-border/60 bg-background/60 p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                  disabled={!guestValid || guestMutation.isPending}
                  onClick={() => guestMutation.mutate()}
                >
                  {guestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Submit application
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  We reply from the hiring team inbox, no platform signup required.
                  Have a GuardianX profile?{" "}
                  <button type="button" onClick={onNeedSignIn} className="text-violet-300 hover:underline">
                    Sign in to apply with your certificates
                  </button>
                </p>
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SEO: client-injected JobPosting JSON-LD (ItemList of JobPosting)
// ============================================================
function HiringJsonLd({ jobs }: { jobs: PublicJob[] }) {
  React.useEffect(() => {
    const prev = document.getElementById("gx-hiring-jsonld")
    if (prev) prev.remove()
    if (!jobs.length) return
    const base =
      (typeof window !== "undefined" && window.location.origin) ||
      "https://academy.guardianx.cloud"
    const data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: jobs.slice(0, 30).map((j, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "JobPosting",
          title: j.title,
          description: j.description.slice(0, 2500),
          datePosted: j.createdAt,
          employmentType: schemaEmploymentType(j.type),
          hiringOrganization: { "@type": "Organization", name: j.company },
          jobLocation: {
            "@type": "Place",
            ...(j.remote ? { jobLocationType: "TELECOMMUTE" } : {}),
            address: { "@type": "PostalAddress", addressLocality: j.location },
          },
          directApply: true,
          url: `${base}/hiring`,
        },
      })),
    }
    const el = document.createElement("script")
    el.type = "application/ld+json"
    el.id = "gx-hiring-jsonld"
    el.textContent = JSON.stringify(data)
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [jobs])
  return null
}
