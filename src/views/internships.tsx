"use client"

/**
 * InternshipsView - public /internships page.
 *
 * The Internship Program showcase: partner colleges, the internships
 * they run with GuardianX Academy, and the students who completed them
 * - each with a downloadable, publicly-verifiable certificate.
 *
 * Design DNA mirrors PlacementsView/HiringView (aurora hero + parallax
 * orbs, glass stat tiles, filterable card wall, detail dialog) and
 * every card inherits the platform-wide CardFx engine automatically.
 *
 * Sections:
 *   1. Hero - headline + CountUp stat tiles (colleges / internships /
 *      interns / certificates issued)
 *   2. Partner Colleges - tap a college card to expand ALL its
 *      internships (domain, mode, duration, seats, status, skills)
 *   3. Featured Interns - tap a student card to open their full
 *      internship record: timeline, projects, skills, mentor,
 *      testimonial + downloadable certificate + verify + share
 *   4. Apply band - application form flowing into the Lead CRM
 *   5. Final CTA
 *
 * Data: GET /api/internships (public; auto-seeds clearly-marked sample
 * rows on first launch; degraded-safe house pattern).
 */

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, useScroll, useTransform } from "framer-motion"
import { CountUp } from "@/components/platform/count-up"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { downloadInternshipCertificatePDF } from "@/lib/certificate-pdf"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  GraduationCap, Search, BadgeCheck, ArrowRight, Building2, Quote,
  Users, FileBadge, Loader2, MousePointerClick, Calendar, Clock,
  MapPin, Download, Share2, Linkedin, MessageCircle, ShieldCheck,
  ChevronDown, FlaskConical, Wrench, Star, Briefcase, Sparkles,
  UserRound, Award, Send, CheckCircle2,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

type PublicInternship = {
  id: string
  title: string
  company: string
  domain: string
  mode: string
  durationWeeks: number
  stipend: string | null
  seats: number
  status: string
  startsAt: string | null
  endsAt: string | null
  description: string | null
  skills: string[]
  featured: boolean
  isSample: boolean
  internCount: number
}

type PublicCollege = {
  name: string
  city: string | null
  logo: string | null
  internships: PublicInternship[]
  internCount: number
  isSample: boolean
}

type PublicIntern = {
  id: string
  studentName: string
  photoUrl: string | null
  role: string
  mentorName: string | null
  startDate: string | null
  endDate: string | null
  projects: { title: string; description: string }[]
  skills: string[]
  tools: string[]
  testimonial: string | null
  grade: string | null
  status: string
  certificateId: string
  certificateIssuedAt: string
  isSample: boolean
  internship: {
    id: string
    title: string
    company: string
    domain: string
    mode: string
    durationWeeks: number
    collegeName: string
    collegeCity: string | null
  }
}

type InternshipsResponse = {
  colleges: PublicCollege[]
  interns: PublicIntern[]
  stats: {
    colleges: number
    internships: number
    interns: number
    certificates: number
    domains: number
  }
  degraded: boolean
}

const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-indigo-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-violet-500",
]

function gradientFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

const DOMAIN_FILTERS = ["All", "VAPT", "SOC", "GRC", "Cloud Security", "Forensics"]
const MODE_LABELS: Record<string, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" }

const STATUS_STYLES: Record<string, string> = {
  upcoming: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  ongoing: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
}

// ============================================================
// Small shared pieces (same DNA as PlacementsView)
// ============================================================

function StatTile({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5">
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">
        <CountUp value={value} duration={1.4} />
      </p>
    </div>
  )
}

function SampleChip() {
  return (
    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-amber-300">
      Sample
    </span>
  )
}

// ============================================================
// College card - tap to expand its internships
// ============================================================

function CollegeCard({
  college,
  expanded,
  onToggle,
}: {
  college: PublicCollege
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border bg-card/50 backdrop-blur transition-colors",
        expanded ? "border-violet-500/50" : "border-border/60 hover:border-violet-500/40"
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        {/* college mark */}
        {college.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={college.logo}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl border border-border/60 object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-lg",
              gradientFor(college.name)
            )}
          >
            {initialsOf(college.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate text-sm font-semibold tracking-tight">{college.name}</h3>
            {college.isSample && <SampleChip />}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            {college.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {college.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <FlaskConical className="h-3 w-3 text-violet-300" /> {college.internships.length} internship{college.internships.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-emerald-300" /> {college.internCount} intern{college.internCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180 text-violet-300"
          )}
        />
      </button>

      {/* expanded internships */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="space-y-3 border-t border-border/50 px-5 pb-5 pt-4">
            {college.internships.map((i) => (
              <div
                key={i.id}
                className="relative overflow-hidden rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:border-violet-500/30"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold tracking-tight">{i.title}</h4>
                      {i.featured && (
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                          Featured
                        </span>
                      )}
                      {i.isSample && <SampleChip />}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      hosted by {i.company}
                      {i.internCount > 0 ? ` · ${i.internCount} intern${i.internCount === 1 ? "" : "s"} placed` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide",
                      STATUS_STYLES[i.status] ?? "border-border/60 text-muted-foreground"
                    )}
                  >
                    {i.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-muted-foreground">
                    <Clock className="h-3 w-3 text-violet-300" /> {i.durationWeeks} weeks
                  </span>
                  <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-muted-foreground">
                    {MODE_LABELS[i.mode] ?? i.mode}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-muted-foreground">
                    <Users className="h-3 w-3 text-emerald-300" /> {i.seats} seats
                  </span>
                  {i.stipend && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                      {i.stipend}
                    </span>
                  )}
                  <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-muted-foreground">
                    {i.domain}
                  </span>
                </div>

                {i.description && (
                  <p className="mt-3 text-xs leading-relaxed text-foreground/70 line-clamp-3">
                    {i.description}
                  </p>
                )}

                {i.skills.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {i.skills.slice(0, 6).map((s) => (
                      <span
                        key={s}
                        className="rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-mono text-violet-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {(i.startsAt || i.endsAt) && (
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {fmtDate(i.startsAt)} → {fmtDate(i.endsAt)}
                  </p>
                )}
              </div>
            ))}
            {college.internships.length === 0 && (
              <p className="text-xs text-muted-foreground">No published internships yet.</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// Intern card - tap to open the full record dialog
// ============================================================

function InternCard({ intern, onOpen }: { intern: PublicIntern; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5 text-left transition-colors hover:border-violet-500/40"
    >
      <div className="flex items-start gap-3.5">
        {intern.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={intern.photoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-border/60 object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-lg",
              gradientFor(intern.studentName)
            )}
          >
            {initialsOf(intern.studentName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate text-sm font-semibold tracking-tight">{intern.studentName}</h3>
            {intern.isSample && <SampleChip />}
          </div>
          <p className="mt-0.5 truncate text-xs text-violet-300">{intern.role}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {intern.internship.collegeName}
            {intern.internship.collegeCity ? ` · ${intern.internship.collegeCity}` : ""}
          </p>
        </div>
        {intern.grade && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300">
            <Star className="h-3 w-3" /> {intern.grade}
          </span>
        )}
      </div>

      <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          <GraduationCap className="h-3 w-3 text-violet-300" /> {intern.internship.domain}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
          <FileBadge className="h-3 w-3" /> Certified
        </span>
        {intern.status === "ongoing" && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
            Ongoing
          </span>
        )}
      </div>

      {intern.testimonial && (
        <p className="mt-3 text-xs leading-relaxed text-foreground/70 line-clamp-2">
          <Quote className="mr-1.5 inline h-3 w-3 text-violet-400/70" />
          {intern.testimonial}
        </p>
      )}

      <span className="mt-3.5 inline-flex items-center gap-1 text-[11px] font-medium text-violet-300 opacity-80 group-hover:opacity-100 transition-opacity">
        View internship &amp; certificate <MousePointerClick className="h-3 w-3" />
      </span>
    </button>
  )
}

// ============================================================
// Detail dialog - the student's full internship record
// ============================================================

function InternDetailDialog({
  intern,
  onClose,
}: {
  intern: PublicIntern | null
  onClose: () => void
}) {
  const [downloading, setDownloading] = React.useState(false)

  const verifyUrl =
    intern && typeof window !== "undefined"
      ? `${window.location.origin}/verify/${intern.certificateId}`
      : intern
      ? `/verify/${intern.certificateId}`
      : ""

  async function downloadPdf() {
    if (!intern) return
    setDownloading(true)
    toast.info("Preparing certificate PDF...")
    try {
      await downloadInternshipCertificatePDF(intern.certificateId)
      toast.success("Certificate opened - use Save as PDF in the print dialog.")
    } catch {
      toast.error("Could not prepare the certificate. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  async function share(to: "whatsapp" | "linkedin" | "copy") {
    if (!intern) return
    const text = `${intern.studentName} completed the ${intern.internship.title} at ${intern.internship.collegeName} via GuardianX Academy! Verify: ${verifyUrl}`
    try {
      if (to === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")
      } else if (to === "linkedin") {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
          "_blank",
          "noopener"
        )
      } else {
        await navigator.clipboard.writeText(verifyUrl)
        toast.success("Verify link copied!")
      }
    } catch {
      toast.error("Could not share right now.")
    }
  }

  return (
    <Dialog open={!!intern} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-left">
            {intern && (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
                  gradientFor(intern.studentName)
                )}
              >
                {initialsOf(intern.studentName)}
              </div>
            )}
            <span>
              {intern?.studentName}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {intern?.role}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {intern && (
          <div className="space-y-5">
            {/* internship context */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-semibold">{intern.internship.title}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {intern.internship.collegeName}
                    {intern.internship.collegeCity ? ` · ${intern.internship.collegeCity}` : ""} ·
                    hosted by {intern.internship.company}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                    {intern.internship.domain}
                  </span>
                  <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                    {intern.internship.durationWeeks} weeks
                  </span>
                  {intern.isSample && <SampleChip />}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <p className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-violet-300" />
                  {fmtDate(intern.startDate)} → {fmtDate(intern.endDate)}
                </p>
                {intern.mentorName && (
                  <p className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-violet-300" /> Mentor: {intern.mentorName}
                  </p>
                )}
                <p className="inline-flex items-center gap-1.5">
                  <BadgeCheck className={cn("h-3.5 w-3.5", intern.status === "completed" ? "text-emerald-300" : "text-amber-300")} />
                  {intern.status === "completed" ? "Completed" : "Ongoing"}
                </p>
              </div>
            </div>

            {/* projects */}
            {intern.projects.length > 0 && (
              <div>
                <h4 className="mb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  Projects delivered
                </h4>
                <div className="space-y-2.5">
                  {intern.projects.map((p, idx) => (
                    <div
                      key={`${p.title}-${idx}`}
                      className="rounded-xl border border-border/50 bg-background/40 p-3.5"
                    >
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <FlaskConical className="h-3.5 w-3.5 text-violet-300" /> {p.title}
                      </p>
                      {p.description && (
                        <p className="mt-1 text-xs leading-relaxed text-foreground/70">{p.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* skills + tools */}
            {(intern.skills.length > 0 || intern.tools.length > 0) && (
              <div className="space-y-3">
                {intern.skills.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                      Skills gained
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {intern.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-mono text-violet-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {intern.tools.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                      <Wrench className="h-3 w-3" /> Tools used
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {intern.tools.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* testimonial */}
            {intern.testimonial && (
              <blockquote className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs leading-relaxed text-foreground/80">
                <Quote className="mb-1.5 h-3.5 w-3.5 text-violet-400" />
                {intern.testimonial}
              </blockquote>
            )}

            {/* certificate panel */}
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-200">
                    <Award className="h-4 w-4" /> Certificate of Internship
                  </h4>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    ID: {intern.certificateId}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-emerald-300" />
                    Publicly verifiable at /verify
                  </p>
                </div>
                {intern.grade && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    <Star className="h-3 w-3" /> {intern.grade}
                  </span>
                )}
              </div>

              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={downloadPdf}
                  disabled={downloading}
                  className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                >
                  {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => share("whatsapp")}>
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => share("linkedin")}>
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => share("copy")}>
                  <Share2 className="h-3.5 w-3.5" /> Copy link
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Apply band - flows into the Lead CRM
// ============================================================

function ApplyForm() {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [college, setCollege] = React.useState("")
  const [interest, setInterest] = React.useState("No preference yet")
  const [message, setMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      await api("/api/internships/apply", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, college, interest, message }),
      })
      setSent(true)
      toast.success("Application received! Our team will reach out to you.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Please try again."
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
        <h3 className="mt-3 text-lg font-semibold">Application received!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Our internship team will review your details and reach out on the contact
          information you shared. Meanwhile, browse the training tracks above to get a head start.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="int-name" className="text-xs font-medium text-muted-foreground">Full name *</label>
          <Input id="int-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required minLength={2} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="int-email" className="text-xs font-medium text-muted-foreground">Email *</label>
          <Input id="int-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="int-phone" className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input id="int-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="int-college" className="text-xs font-medium text-muted-foreground">College / Institution</label>
          <Input id="int-college" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Your college name" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Preferred domain</label>
          <Select value={interest} onValueChange={setInterest}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a domain" />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_FILTERS.filter((d) => d !== "All").map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
              <SelectItem value="No preference yet">No preference yet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="int-msg" className="text-xs font-medium text-muted-foreground">Anything you want us to know?</label>
          <Textarea id="int-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Year of study, goals, questions..." />
        </div>
      </div>
      <Button
        type="submit"
        disabled={sending}
        className="mt-5 w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Apply for an internship
      </Button>
    </form>
  )
}

// ============================================================
// Main view
// ============================================================

export function InternshipsView() {
  const { data, isLoading } = useQuery<InternshipsResponse>({
    queryKey: ["internships-public"],
    queryFn: () => api("/api/internships"),
  })

  const heroRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const orbY1 = useTransform(scrollYProgress, [0, 1], [0, 130])
  const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -80])

  // expand state: which college card is open (one at a time)
  const [expandedCollege, setExpandedCollege] = React.useState<string | null>(null)
  const [selectedIntern, setSelectedIntern] = React.useState<PublicIntern | null>(null)

  // filters
  const [search, setSearch] = React.useState("")
  const [domainFilter, setDomainFilter] = React.useState("All")

  const colleges = data?.colleges ?? []
  const interns = data?.interns ?? []
  const stats = data?.stats

  const filteredColleges = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return colleges
      .map((c) => ({
        ...c,
        internships:
          domainFilter === "All" && !q
            ? c.internships
            : c.internships.filter(
                (i) =>
                  (domainFilter === "All" || i.domain === domainFilter) &&
                  (!q ||
                    i.title.toLowerCase().includes(q) ||
                    i.domain.toLowerCase().includes(q) ||
                    c.name.toLowerCase().includes(q) ||
                    (c.city ?? "").toLowerCase().includes(q))
              ),
      }))
      .filter((c) => c.internships.length > 0 || (!q && domainFilter === "All"))
  }, [colleges, search, domainFilter])

  const filteredInterns = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return interns.filter(
      (r) =>
        (domainFilter === "All" || r.internship.domain === domainFilter) &&
        (!q ||
          r.studentName.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.internship.collegeName.toLowerCase().includes(q) ||
          r.skills.some((s) => s.toLowerCase().includes(q)))
    )
  }, [interns, search, domainFilter])

  return (
    <div className="relative min-h-screen">
      {/* ─── 1. Hero ─── */}
      <section ref={heroRef} className="relative overflow-hidden px-6 pb-14 pt-24 sm:pt-28">
        <motion.div style={{ y: orbY1 }} className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[52rem] rounded-full bg-violet-600/20 blur-[130px]" />
        <motion.div style={{ y: orbY2 }} className="absolute top-24 -right-28 h-72 w-72 rounded-full bg-emerald-500/12 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-300">
              <Briefcase className="h-3 w-3" /> Internship Program
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Internships that turn{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
                students into defenders
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Real security work, mentored by practitioners, run in partnership with
              colleges across India. Every completed internship ends with a
              verifiable certificate employers can check in seconds.
            </p>
          </div>

          {/* stat tiles - honest, server-derived counts */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile value={stats?.colleges ?? 0} label="Partner colleges" icon={<Building2 className="h-3.5 w-3.5" />} />
            <StatTile value={stats?.internships ?? 0} label="Internships" icon={<FlaskConical className="h-3.5 w-3.5" />} />
            <StatTile value={stats?.interns ?? 0} label="Interns" icon={<Users className="h-3.5 w-3.5" />} />
            <StatTile value={stats?.certificates ?? 0} label="Certificates" icon={<FileBadge className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </section>

      {/* ─── 2. Partner Colleges ─── */}
      <section className="relative px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Partner colleges</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Tap a college to see every internship it runs with GuardianX Academy.
              </p>
            </div>
          </div>

          {/* filters */}
          <div className="mt-6 flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search internships, colleges, skills..."
                className="w-full pl-9 sm:w-80"
                aria-label="Search internships"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DOMAIN_FILTERS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomainFilter(d)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    domainFilter === d
                      ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                      : "border-border/60 bg-card/50 text-muted-foreground hover:border-violet-500/30 hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* college cards */}
          <div className="mt-6 space-y-3">
            {isLoading && (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/40" />
                ))}
              </div>
            )}
            {!isLoading && filteredColleges.map((c) => (
              <CollegeCard
                key={c.name}
                college={c}
                expanded={expandedCollege === c.name.toLowerCase()}
                onToggle={() =>
                  setExpandedCollege((cur) => (cur === c.name.toLowerCase() ? null : c.name.toLowerCase()))
                }
              />
            ))}
            {!isLoading && filteredColleges.length === 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-10 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No internships match your filters yet. New cohorts open regularly.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 3. Featured Interns ─── */}
      <section className="relative px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured interns</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tap any student to see their full internship record, projects and downloadable certificate.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && (
              [0, 1, 2].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted/40" />
              ))
            )}
            {!isLoading && filteredInterns.map((r) => (
              <InternCard key={r.id} intern={r} onOpen={() => setSelectedIntern(r)} />
            ))}
          </div>
          {!isLoading && filteredInterns.length === 0 && interns.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No interns match your filters.</p>
          )}
        </div>
      </section>

      {/* ─── 4. Apply ─── */}
      <section className="relative px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Apply for an internship</h2>
            <p className="mx-auto mt-1.5 max-w-xl text-sm text-muted-foreground">
              Tell us who you are and what you want to specialize in. Applications land
              directly with our internship team.
            </p>
          </div>
          <div className="mt-7">
            <ApplyForm />
          </div>
        </div>
      </section>

      {/* ─── 5. Final CTA ─── */}
      <section className="relative px-6 pb-20 pt-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/15 via-card/60 to-emerald-500/10 p-10 text-center backdrop-blur">
          <Sparkles className="mx-auto h-8 w-8 text-violet-300" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Want your college on this wall?
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-sm text-muted-foreground">
            We run internship cohorts with colleges, universities and individual
            learners across India. Bring your institution on board or join the next
            open cohort yourself.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
              onClick={() => (window.location.href = "/contact")}
            >
              Partner with us <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => (window.location.href = "/batches")}>
              Browse training batches
            </Button>
          </div>
        </div>
      </section>

      {/* detail dialog */}
      <InternDetailDialog intern={selectedIntern} onClose={() => setSelectedIntern(null)} />
    </div>
  )
}
