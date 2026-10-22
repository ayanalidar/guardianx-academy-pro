"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePageContent, getContentArray, getContent } from "@/lib/use-content"
import { getCmsIcon } from "@/lib/cms-icons"
import { cn } from "@/lib/utils"
import { Quote, ArrowRight, Award, Briefcase, TrendingUp, ExternalLink } from "lucide-react"

/**
 * Institution partnership proof components (Phase 1 showcase layer).
 *
 * All data comes from the "institutions" CMS page (Admin → Content Studio →
 * Institutions → sections "partners" and "testimonials"). Every component
 * degrades gracefully:
 *
 *   - `useNamedPartners()` returns only entries with a non-empty `name`.
 *     The CMS seed ships ONE blank template entry so the Content Studio's
 *     object-array editor knows the field shape; blank entries never render
 *     publicly. With zero named partners the walls hide themselves and the
 *     /institutions network section shows a "Become a founding MoU partner"
 *     empty-state panel instead - no fake names are ever displayed.
 *
 *   - `PartnerWall` - the "trusted by" logo strip. Full variant for the
 *     /institutions hub, compact for home + colleges/universities pages.
 *     Tiles render the partner's logo when `logoUrl` is set, otherwise a
 *     clean initials monogram (so name-only entries still look intentional).
 *
 *   - `StudentOutcomeStrip` - the three marketing pillars for the colleges
 *     and universities product pages: certifications → internships →
 *     placement support.
 */

export interface PartnerEntry {
  name?: string
  type?: string
  city?: string
  logoUrl?: string
  since?: string
  studentsTrained?: string
  outcome?: string
  url?: string
  // ---- Profile-page fields (Phase 2 showcase). All optional; the
  // profile view hides every section whose fields are empty, so
  // pre-Phase-2 entries (name + city only) still render fine. ----
  /** Override for the URL slug. Defaults to the kebab-cased name. */
  slug?: string
  /** Institution description shown under the profile hero. */
  about?: string
  /** Newline or pipe separated list of what the MoU covers. */
  tracks?: string
  /** Optional leadership testimonial shown on the profile page. */
  testimonialQuote?: string
  testimonialName?: string
  testimonialTitle?: string
  /** URL of the signed MoU PDF (upload host + paste link). */
  mouPdfUrl?: string
  /** "yes" publishes the MoU copy on the profile page; anything else
   *  shows a "copy available on request" note instead (default). */
  mouPublic?: string
}

export interface TestimonialEntry {
  quote?: string
  name?: string
  role?: string
  institution?: string
}

/** Type → accent mapping (code-driven, so CMS entries never carry Tailwind classes). */
const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string; border: string; chip: string }> = {
  School: {
    icon: "School", color: "text-emerald-300", bg: "bg-emerald-500/10",
    border: "hover:border-emerald-500/40", chip: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  },
  College: {
    icon: "Building", color: "text-cyan-300", bg: "bg-cyan-500/10",
    border: "hover:border-cyan-500/40", chip: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
  },
  University: {
    icon: "Landmark", color: "text-violet-300", bg: "bg-violet-500/10",
    border: "hover:border-violet-500/40", chip: "border-violet-500/30 bg-violet-500/5 text-violet-300",
  },
}

const FALLBACK_STYLE = TYPE_STYLE.College

function styleFor(type?: string) {
  return (type && TYPE_STYLE[type]) || FALLBACK_STYLE
}

/** Exported alias so the profile view can reuse the exact same accents. */
export const partnerTypeStyle = styleFor

/**
 * Canonical slug for a partner: explicit CMS `slug` wins, otherwise the
 * kebab-cased name ("Orchid University" → "orchid-university"). Because
 * the name always yields a slug, every named partner automatically gets
 * a profile URL - the slug field only exists to override awkward names.
 */
export function partnerSlugOf(p: PartnerEntry): string {
  const explicit = p.slug?.trim().toLowerCase()
  if (explicit) return explicit
  return (p.name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Canonical profile path for a partner, e.g. /institutions/orchid-university. */
export function profilePathOf(p: PartnerEntry): string {
  return `/institutions/${encodeURIComponent(partnerSlugOf(p))}`
}

/** Initials monogram from the partner name (max 2 letters, uppercase). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Read named partner entries from the institutions CMS page.
 * Blank template entries (empty/whitespace `name`) are filtered out so they
 * never leak to the public site.
 */
export function useNamedPartners() {
  const cms = usePageContent("institutions")
  const all = getContentArray<PartnerEntry>(cms.data, "partners", "items", [])
  const partners = React.useMemo(
    () => all.filter((p) => p && typeof p.name === "string" && p.name.trim().length > 0),
    [all],
  )
  return { partners, cms }
}

/** Read named testimonial entries (quote + name required). */
export function useNamedTestimonials() {
  const cms = usePageContent("institutions")
  const all = getContentArray<TestimonialEntry>(cms.data, "testimonials", "items", [])
  const testimonials = React.useMemo(
    () =>
      all.filter(
        (t) =>
          t &&
          typeof t.quote === "string" && t.quote.trim().length > 0 &&
          typeof t.name === "string" && t.name.trim().length > 0,
      ),
    [all],
  )
  return { testimonials, cms }
}

/* ============================================================
   PartnerWall - "trusted by" strip
   ============================================================ */

export function PartnerWall({
  partners,
  compact = false,
  label,
}: {
  partners: PartnerEntry[]
  compact?: boolean
  label?: string
}) {
  const { navigate } = useAppStore()
  if (partners.length === 0) return null

  return (
    <div className={cn(compact ? "py-6" : "py-10")}>
      {label && (
        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] uppercase text-center mb-5">
          {label}
        </p>
      )}
      <div
        className={cn(
          "grid gap-3",
          compact
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        )}
      >
        {partners.map((p, i) => {
          const st = styleFor(p.type)
          return (
            <motion.a
              key={`${p.name}-${i}`}
              href={profilePathOf(p)}
              onClick={(e) => {
                // SPA navigation on left click; the real href stays in the
                // DOM so right-click / open-in-new-tab / crawlers all work.
                e.preventDefault()
                navigate({ name: "institution-detail", slug: partnerSlugOf(p) })
              }}
              title={[p.name, p.city, p.outcome].filter(Boolean).join(" · ")}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
              className={cn(
                "group flex flex-col items-center justify-center gap-2 rounded-xl border border-border/40 bg-card/40 px-3 text-center transition-all",
                compact ? "py-4" : "py-5",
                st.border,
                "hover:bg-card/70 cursor-pointer",
              )}
            >
              {p.logoUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logoUrl.trim()}
                  alt={p.name || "Partner institution"}
                  className="h-9 w-auto max-w-[120px] object-contain opacity-60 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0"
                  loading="lazy"
                />
              ) : (
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md border border-border/50 font-mono text-xs font-bold tracking-wider transition-colors",
                    st.bg,
                    st.color,
                  )}
                  aria-hidden
                >
                  {initialsOf(p.name || "?")}
                </span>
              )}
              <span className="text-[11px] font-medium text-muted-foreground leading-tight group-hover:text-foreground transition-colors">
                {p.name}
              </span>
              {!compact && (p.type || p.city) && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono", st.chip)}>
                  {[p.type, p.city].filter(Boolean).join(" · ")}
                </span>
              )}
            </motion.a>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   Partner network cards (full showcase on /institutions)
   ============================================================ */

export function PartnerNetworkCards({ partners }: { partners: PartnerEntry[] }) {
  const { navigate } = useAppStore()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {partners.map((p, i) => {
        const st = styleFor(p.type)
        const Icon = getCmsIcon(st.icon)
        return (
          <motion.div
            key={`${p.name}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: (i % 3) * 0.06 }}
            role="link"
            tabIndex={0}
            aria-label={`View the ${p.name || "partner"} profile`}
            onClick={() => navigate({ name: "institution-detail", slug: partnerSlugOf(p) })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                navigate({ name: "institution-detail", slug: partnerSlugOf(p) })
              }
            }}
            className={cn(
              "group relative rounded-2xl border border-border/60 bg-card/40 p-6 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
              st.border,
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                {p.logoUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logoUrl.trim()}
                    alt={p.name || "Partner institution"}
                    className="h-10 w-10 rounded-lg border border-border/50 object-contain bg-background/60 p-1"
                    loading="lazy"
                  />
                ) : (
                  <span className={cn("flex size-10 items-center justify-center rounded-lg border border-border/50 font-mono text-sm font-bold", st.bg, st.color)}>
                    {initialsOf(p.name || "?")}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                  {p.city && <p className="text-[10px] text-muted-foreground truncate">{p.city}</p>}
                </div>
              </div>
              <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-mono", st.chip)}>
                <Icon className="h-3 w-3 mr-1" aria-hidden />
                {p.type || "Partner"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
              {p.since && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  MOU SINCE <span className="text-foreground">{p.since}</span>
                </span>
              )}
              {p.studentsTrained && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground">{p.studentsTrained}</span> STUDENTS TRAINED
                </span>
              )}
            </div>

            {p.outcome && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">{p.outcome}</p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-[11px]">
              <span className="inline-flex items-center gap-1 font-medium text-violet-300 group-hover:text-violet-200 transition-colors">
                View profile <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              {p.url?.trim() && (
                <a
                  href={p.url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Visit institution <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ============================================================
   Empty-state panel - shown on /institutions when no partners
   have been added yet. Honest early-stage marketing: no fake
   names, just the founding-partner pitch.
   ============================================================ */

export function PartnerNetworkEmptyState({
  title,
  titleAccent,
  description,
  ctaLabel,
}: {
  title: string
  titleAccent: string
  description: string
  ctaLabel: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl border border-dashed border-violet-500/30 bg-violet-500/[0.03] p-8 lg:p-10 text-center overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
      <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-300 bg-violet-500/5">
        FOUNDING PARTNER COHORT
      </Badge>
      <h3 className="text-2xl font-bold tracking-tight mb-2 text-balance">
        {title} <span className="text-gradient-premium">{titleAccent}</span>
      </h3>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      <PartnerCtaButton label={ctaLabel} />
    </motion.div>
  )
}

/** Shared "Sign an MoU" CTA (routes to the contact form). */
export function PartnerCtaButton({ label, className }: { label: string; className?: string }) {
  const { navigate } = useAppStore()
  return (
    <Button
      size="lg"
      onClick={() => navigate({ name: "contact" })}
      className={cn("bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm", className)}
    >
      {label} <ArrowRight className="h-4 w-4 ml-2" aria-hidden />
    </Button>
  )
}

/* ============================================================
   StudentOutcomeStrip - the three pillars for colleges and
   universities product pages: certifications, internships,
   placement support.
   ============================================================ */

const OUTCOME_PILLARS = [
  {
    icon: Award,
    title: "Industry Certifications",
    desc: "CEH, CCNA, WAPT, RHCSA and more - delivered on your campus, with verifiable certificates employers can check by ID in seconds.",
    step: "PILLAR 1",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    icon: Briefcase,
    title: "Internships",
    desc: "Training-cum-internship cohorts with real security operations work, mentor review, and a verifiable internship certificate for every student.",
    step: "PILLAR 2",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    icon: TrendingUp,
    title: "Placement Support",
    desc: "Interview preparation, portfolio reviews, and placement drives that connect your students directly with hiring partners.",
    step: "PILLAR 3",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
]

export function StudentOutcomeStrip() {
  return (
    <section className="py-6 lg:py-8 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-2">WHAT YOUR STUDENTS GET</p>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-balance">
            From classroom to career, in three pillars.
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Every MoU covers the full journey - certification training on campus, internship cohorts, and placement support for your final-year students.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OUTCOME_PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className={cn("rounded-xl border p-5", p.border, "bg-card")}
            >
              <div className={cn("inline-flex p-2.5 rounded-lg mb-3", p.bg)}>
                <p.icon className={cn("h-5 w-5", p.color)} />
              </div>
              <p className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em] mb-1">{p.step}</p>
              <h3 className="font-semibold text-sm mb-1.5">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   PartnerNetworkSection - one-stop section for /institutions:
   heading + cards (or empty state). Keeps the hub view lean.
   ============================================================ */

export function PartnerNetworkSection() {
  const { partners, cms } = useNamedPartners()

  const eyebrow = getContent(cms.data, "partners", "eyebrow", "OUR PARTNER NETWORK")
  const title = getContent(cms.data, "partners", "title", "Colleges and universities")
  const titleAccent = getContent(cms.data, "partners", "titleAccent", "already building with GuardianX.")
  const description = getContent(
    cms.data, "partners", "description",
    "Every partner below signed an MoU with GuardianX. Each card shows what we deliver together - certification tracks, internship cohorts, and placement support for their students.",
  )
  const emptyTitle = getContent(cms.data, "partners", "emptyTitle", "Be an early mover.")
  const emptyTitleAccent = getContent(cms.data, "partners", "emptyTitleAccent", "Become a founding MoU partner.")
  const emptyDescription = getContent(
    cms.data, "partners", "emptyDescription",
    "We are onboarding a limited cohort of colleges and universities for the coming academic year. Founding partners get priority scheduling, co-branded certificates, and placement-support onboarding for their placement cell.",
  )
  const ctaLabel = getContent(cms.data, "partners", "ctaLabel", "Sign an MoU")

  return (
    <section className="relative border-t border-border/40 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-2">{eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {title} <span className="text-gradient-premium">{titleAccent}</span>
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mb-10 leading-relaxed">{description}</p>

        {partners.length > 0 ? (
          <PartnerNetworkCards partners={partners} />
        ) : (
          <PartnerNetworkEmptyState
            title={emptyTitle}
            titleAccent={emptyTitleAccent}
            description={emptyDescription}
            ctaLabel={ctaLabel}
          />
        )}
      </div>
    </section>
  )
}

/* ============================================================
   PartnerTestimonialsSection - quote cards for /institutions.
   Hidden entirely until at least one named testimonial exists.
   ============================================================ */

export function PartnerTestimonialsSection() {
  const { testimonials, cms } = useNamedTestimonials()
  if (testimonials.length === 0) return null

  const eyebrow = getContent(cms.data, "testimonials", "eyebrow", "FROM OUR PARTNERS")
  const title = getContent(cms.data, "testimonials", "title", "What institutions say about us.")

  return (
    <section className="relative border-t border-border/40 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-2">{eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight mb-10">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.figure
              key={`${t.name}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (i % 3) * 0.06 }}
              className="flex flex-col rounded-2xl border border-border/60 bg-card/40 p-6"
            >
              <Quote className="h-5 w-5 text-amber-300/70 mb-3 shrink-0" aria-hidden />
              <blockquote className="text-sm leading-relaxed text-foreground/90 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-border/40">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {[t.role, t.institution].filter(Boolean).join(" · ")}
                </p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
