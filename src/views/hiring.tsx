"use client"

/**
 * HiringView — public /hiring page ("Hiring" header tab).
 *
 * Sophisticated worldwide openings board:
 *   • Hero — headline, live stats (open roles / countries / remote share)
 *   • Filter bar — search, role-type chips, Remote-only toggle, country select
 *   • Openings grid — company tile, chips (type / remote / NEW), salary,
 *     skills preview, applicant count, "posted" relative time
 *   • Role detail dialog — full description, requirements, certs & skills,
 *     apply flow (logged-in users apply in one click; guests are sent to
 *     sign-in; 409 "already applied" handled gracefully)
 *
 * Data: GET /api/hiring/jobs (public, no auth). Apply: POST /api/jobs/[id]/apply
 * (existing student job-board endpoint, shared JobApplication records).
 */

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
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
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Globe2, Search, MapPin, Home, Briefcase, Clock, Users, ArrowRight,
  X, CheckCircle2, BadgeCheck, Wallet, GraduationCap, Send, Loader2,
  ListChecks, Building2, Sparkles,
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

/** Country / region label = text after the last comma ("Dubai, UAE" → "UAE"). */
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
// Root
// ============================================================
export function HiringView() {
  const { navigate } = useAppStore()
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [remoteOnly, setRemoteOnly] = React.useState(false)
  const [countryFilter, setCountryFilter] = React.useState("all")
  const [selectedJob, setSelectedJob] = React.useState<PublicJob | null>(null)

  // Session awareness (for the apply button state inside the dialog).
  const [sessionUser, setSessionUser] = React.useState<{ name?: string; role?: string } | null>(null)
  React.useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSessionUser(d?.user ?? null))
      .catch(() => setSessionUser(null))
  }, [])

  const { data, isLoading } = useQuery<{ jobs: PublicJob[]; count: number; degraded?: boolean }>({
    queryKey: ["hiring-jobs"],
    queryFn: () => api("/api/hiring/jobs"),
    refetchInterval: 120_000,
  })
  const jobs = data?.jobs ?? []

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
    return { openRoles, countryCount, remoteShare }
  }, [jobs, countries])

  return (
    <div className="min-h-screen">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pt-28 pb-14 px-4 sm:px-6 lg:px-8">
        {/* ambient glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-[42rem] rounded-full bg-violet-600/15 blur-[110px]" />
          <div className="absolute top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-[90px]" />
          <div className="absolute top-40 -right-20 h-64 w-64 rounded-full bg-sky-500/10 blur-[90px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            We're hiring around the world
            <span className="h-1 w-1 rounded-full bg-violet-400 animate-pulse" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]"
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
            className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            GuardianX and partner companies are hiring security engineers, instructors,
            analysts and builders across every timezone. Find your next role below —
            remote-first, globally distributed, mission-driven.
          </motion.p>

          {/* live stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 flex items-center justify-center gap-3 flex-wrap"
          >
            <HeroStat icon={Briefcase} value={stats.openRoles} label={stats.openRoles === 1 ? "Open role" : "Open roles"} />
            <HeroStat icon={Globe2} value={stats.countryCount} label={stats.countryCount === 1 ? "Country" : "Countries"} />
            <HeroStat icon={Home} value={`${stats.remoteShare}%`} label="Remote-friendly" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="mt-8 flex items-center justify-center gap-3 flex-wrap"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white h-11 px-6"
              onClick={() => document.getElementById("openings")?.scrollIntoView({ behavior: "smooth" })}
            >
              Browse openings <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6"
              onClick={() => navigate({ name: "contact" })}
            >
              Don't see your role? Talk to us
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ================= OPENINGS ================= */}
      <section id="openings" className="px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-20">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Filter bar */}
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-4 space-y-3">
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
                {/* Remote-only toggle */}
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
                  ? "New positions are posted regularly — check back soon, or send us your profile and we'll keep you in mind."
                  : "Try widening your search — clear a filter or two and see what's out there."}
              </p>
              {jobs.length === 0 && (
                <Button className="mt-5 bg-gradient-to-r from-violet-600 to-violet-500 text-white" size="sm" onClick={() => navigate({ name: "contact" })}>
                  Send us your profile <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} onOpen={() => setSelectedJob(job)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= BOTTOM CTA ================= */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 via-card/40 to-emerald-500/10 p-8 sm:p-10 text-center relative overflow-hidden">
          <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-violet-600/15 blur-[80px]" />
          <h2 className="relative text-xl sm:text-2xl font-bold">Great people know great people</h2>
          <p className="relative text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Nothing fits right now? We keep talented people in mind for future openings.
            Introduce yourself — or point a friend our way.
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

      {/* ================= DETAIL DIALOG ================= */}
      {selectedJob && (
        <JobDetailDialog
          job={selectedJob}
          signedIn={!!sessionUser}
          onClose={() => setSelectedJob(null)}
          onNeedSignIn={() => { setSelectedJob(null); navigate({ name: "login" }) }}
        />
      )}
    </div>
  )
}

// ============================================================
// Pieces
// ============================================================
function HeroStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/40 backdrop-blur px-4 py-2.5">
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

function JobCard({ job, index, onOpen }: { job: PublicJob; index: number; onOpen: () => void }) {
  const country = deriveCountry(job.location)
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.04 }}
      className="group text-left rounded-2xl border border-border/60 bg-card/40 p-5 flex flex-col gap-3 transition-all hover:border-violet-500/40 hover:bg-card/60 hover:shadow-[0_16px_50px_-20px_rgba(139,92,246,0.35)]"
    >
      <div className="flex items-start justify-between gap-3">
        <CompanyTile job={job} />
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
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

      <div className="min-w-0">
        <h3 className="font-semibold text-[15px] leading-snug group-hover:text-violet-200 transition-colors line-clamp-2">{job.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</span>
          <span className="text-zinc-600">·</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={cn("text-[9px]", typeTint(job.type))}>{typeLabel(job.type)}</Badge>
        {job.salary && (
          <Badge variant="outline" className="text-[9px] text-zinc-300 border-zinc-500/30 bg-zinc-500/10">
            <Wallet className="h-2.5 w-2.5 mr-0.5" /> {job.salary}
          </Badge>
        )}
      </div>

      {job.requiredSkills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {job.requiredSkills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-md bg-muted/30 border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
          ))}
          {job.requiredSkills.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{job.requiredSkills.length - 3} more</span>
          )}
        </div>
      )}

      <div className="mt-auto pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> {country}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(job.createdAt)}</span>
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-violet-300 opacity-90 group-hover:opacity-100 transition-opacity">
          View role <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </motion.button>
  )
}

function JobDetailDialog({ job, signedIn, onClose, onNeedSignIn }: { job: PublicJob; signedIn: boolean; onClose: () => void; onNeedSignIn: () => void }) {
  const [coverLetter, setCoverLetter] = React.useState("")
  const [showCover, setShowCover] = React.useState(false)

  const applyMutation = useMutation({
    mutationFn: async () => {
      return api(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        body: JSON.stringify({ coverLetter }),
      })
    },
    onSuccess: () => toast.success(`Application sent — good luck for ${job.title}!`),
    onError: (e: any) => {
      if (e?.status === 409) toast.info("You've already applied for this role.")
      else toast.error(e?.message || "Could not submit application")
    },
  })

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
          <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
            {signedIn ? (
              <>
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
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Applications go through your GuardianX profile — it takes a minute to sign in, and your certificates speak for you.
                </p>
                <Button className="w-full bg-gradient-to-r from-violet-600 to-violet-500 text-white" onClick={onNeedSignIn}>
                  Sign in to apply <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
