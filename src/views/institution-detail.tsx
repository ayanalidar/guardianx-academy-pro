"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePageContent, getContent } from "@/lib/use-content"
import {
  useNamedPartners,
  partnerSlugOf,
  partnerTypeStyle,
  parsePartnerTracks,
  type PartnerEntry,
} from "@/components/platform/institution-proof"
import { getCmsIcon } from "@/lib/cms-icons"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, ShieldCheck, Quote, ExternalLink, FileText, Download,
  CalendarCheck, Users, Award, MapPin, Lock, ArrowRight, GraduationCap,
} from "lucide-react"

/* ============================================================
   InstitutionDetailView - public profile page for ONE signed
   MoU partner institution (e.g. /institutions/orchid-university).

   Data source: the SAME Content Studio "institutions" page that
   drives the partner wall / network cards (section "partners",
   key "items") - one source of truth, no separate database.

   Every section degrades gracefully (empty-safe):
     - unknown slug      → branded "partner not found" panel + hub link
     - missing about     → section hidden
     - missing tracks    → "What the MoU covers" hidden
     - missing stats     → outcome tiles hidden
     - no MoU PDF        → MoU section hidden entirely
     - PDF set but not published ("mouPublic" not yes) →
       "copy available on request" note instead of the document

   Labels come from the CMS "partnerProfile" section so the
   studio can reword every heading; the fallbacks below keep the
   page fully renderable with zero CMS data.
   ============================================================ */

/** Truthy values accepted in the CMS "mouPublic" field. */
function isMouPublic(v?: string): boolean {
  if (!v) return false
  return ["yes", "true", "1", "public", "y", "published"].includes(v.trim().toLowerCase())
}

function NotFound({ label }: { label: string }) {
  const { navigate } = useAppStore()
  return (
    <div className="mx-auto max-w-2xl px-4 pt-28 pb-32 text-center">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-card/60">
        <GraduationCap className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">{label}</h1>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        This partner profile does not exist (or the institution has not been
        published yet). Explore our full partner network instead.
      </p>
      <Button onClick={() => navigate({ name: "institutions" })} className="bg-violet-600 hover:bg-violet-500">
        View partner network <ArrowRight className="h-4 w-4 ml-2" aria-hidden />
      </Button>
    </div>
  )
}

export function InstitutionDetailView({ slug }: { slug: string }) {
  const { navigate } = useAppStore()
  const { partners, cms } = useNamedPartners()

  const L = (key: string, fallback: string) => getContent(cms.data, "partnerProfile", key, fallback)

  // Decode the URL slug exactly like pathToView did, then match against
  // each partner's canonical slug (explicit CMS slug wins, else kebab name).
  const normalized = React.useMemo(() => {
    try { return decodeURIComponent(slug).toLowerCase() } catch { return slug.toLowerCase() }
  }, [slug])

  const partner: PartnerEntry | undefined = React.useMemo(
    () => partners.find((p) => partnerSlugOf(p) === normalized),
    [partners, normalized],
  )

  // ---- CMS-driven section labels (with hard fallbacks) ----
  const backLabel = L("backLabel", "All partner institutions")
  const notFoundTitle = L("notFoundTitle", "Partner not found")
  const coversEyebrow = L("coversEyebrow", "WHAT THE MOU COVERS")
  const coversTitle = L("coversTitle", "Delivered on their campus, under one agreement.")
  const outcomesEyebrow = L("outcomesEyebrow", "PARTNERSHIP OUTCOMES")
  const testimonialEyebrow = L("testimonialEyebrow", "IN THEIR WORDS")
  const mouEyebrow = L("mouEyebrow", "SIGNED AGREEMENT")
  const mouTitle = L("mouTitle", "Signed MoU copy")
  const mouDownload = L("mouDownload", "Download MoU copy")
  const mouRequestNote = L(
    "mouRequestNote",
    "The MoU between this institution and GuardianX is signed and on file. A copy can be shared on request - write to us and we will connect you with the institution's partnership cell.",
  )
  const ctaTitle = L("ctaTitle", "Want this partnership at your institution?")
  const ctaDescription = L(
    "ctaDescription",
    "We sign a limited number of MoUs each academic year - certification training, internship cohorts and placement support under one agreement. Talk to our partnerships team.",
  )
  const ctaLabel = L("ctaLabel", "Start a partnership")

  // Loading shell: never flash "not found" while the CMS query is in flight.
  if (cms.isLoading && !cms.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-28 pb-32">
        <div className="h-5 w-44 rounded bg-muted/50 animate-pulse mb-8" />
        <div className="h-10 w-2/3 max-w-md rounded-lg bg-muted/50 animate-pulse mb-4" />
        <div className="h-4 w-52 rounded bg-muted/40 animate-pulse mb-12" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-40 rounded-xl bg-muted/40 animate-pulse [animation-delay:120ms]" />
          <div className="h-40 rounded-xl bg-muted/40 animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    )
  }

  if (!partner) return <NotFound label={notFoundTitle} />

  const st = partnerTypeStyle(partner.type)
  const TypeIcon = getCmsIcon(st.icon)
  const tracks = parsePartnerTracks(partner.tracks)
  const hasStats = Boolean(partner.studentsTrained?.trim() || partner.since?.trim())
  const testimonial =
    partner.testimonialQuote?.trim() && partner.testimonialName?.trim()
      ? { quote: partner.testimonialQuote.trim(), name: partner.testimonialName.trim(), title: partner.testimonialTitle?.trim() }
      : null
  const mouPdf = partner.mouPdfUrl?.trim() || ""
  const mouPublished = Boolean(mouPdf) && isMouPublic(partner.mouPublic)
  const website = partner.url?.trim() || ""

  return (
    <div className="pb-24">
      {/* ============================== HERO ============================== */}
      <section className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          <button
            onClick={() => navigate({ name: "institutions" })}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {backLabel}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {partner.logoUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.logoUrl.trim()}
                alt={partner.name || "Partner institution"}
                className="h-16 w-16 rounded-2xl border border-border/50 object-contain bg-background/60 p-2 shrink-0"
              />
            ) : (
              <span
                className={cn(
                  "flex size-16 items-center justify-center rounded-2xl border border-border/50 font-mono text-lg font-bold shrink-0",
                  st.bg, st.color,
                )}
                aria-hidden
              >
                {(partner.name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <Badge variant="outline" className="mb-3 border-emerald-500/30 text-emerald-300 bg-emerald-500/5">
                <ShieldCheck className="h-3 w-3 mr-1.5" aria-hidden />
                {partner.since?.trim() ? `OFFICIAL MOU PARTNER SINCE ${partner.since.trim().toUpperCase()}` : "OFFICIAL MOU PARTNER"}
              </Badge>
              <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] leading-tight text-balance">
                {partner.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {partner.type?.trim() && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-mono", st.chip)}>
                    <TypeIcon className="h-3 w-3" aria-hidden /> {partner.type.trim()}
                  </span>
                )}
                {partner.city?.trim() && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden /> {partner.city.trim()}
                  </span>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden /> Website
                  </a>
                )}
              </div>
              {partner.tagline?.trim() && (
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{partner.tagline.trim()}</p>
              )}
            </div>
          </div>

          {partner.about?.trim() && (
            <p className="mt-6 max-w-3xl text-sm lg:text-[15px] text-muted-foreground leading-relaxed">
              {partner.about.trim()}
            </p>
          )}
        </div>
      </section>

      {/* ===================== OUTCOME TILES (optional) ==================== */}
      {hasStats && (
        <section className="border-b border-border/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] mb-4">{outcomesEyebrow}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {partner.studentsTrained?.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <Users className="h-4 w-4 text-violet-300 mb-2" aria-hidden />
                  <p className="text-xl font-bold">{partner.studentsTrained.trim()}</p>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider mt-0.5">STUDENTS TRAINED</p>
                </motion.div>
              )}
              {partner.since?.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.06 }}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <CalendarCheck className="h-4 w-4 text-cyan-300 mb-2" aria-hidden />
                  <p className="text-xl font-bold">{partner.since.trim()}</p>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider mt-0.5">MoU SIGNED</p>
                </motion.div>
              )}
              {partner.outcome?.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.12 }}
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:col-span-1"
                >
                  <Award className="h-4 w-4 text-emerald-300 mb-2" aria-hidden />
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed">{partner.outcome.trim()}</p>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== MOU COVERAGE + TESTIMONIAL =================== */}
      {(tracks.length > 0 || testimonial) && (
        <section className="border-b border-border/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-5 gap-10">
            {tracks.length > 0 && (
              <div className="lg:col-span-3">
                <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">{coversEyebrow}</p>
                <h2 className="text-xl font-bold tracking-tight mb-5">{coversTitle}</h2>
                <ul className="space-y-2.5">
                  {tracks.map((t, i) => (
                    <motion.li
                      key={`${t}-${i}`}
                      initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.3) }}
                      className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/30 px-3.5 py-2.5"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" aria-hidden />
                      <span className="text-[13px] leading-relaxed">{t}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {testimonial && (
              <motion.figure
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                className={cn(
                  "flex flex-col rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-6 self-start",
                  tracks.length === 0 && "lg:col-span-5",
                )}
              >
                <p className="text-[10px] font-mono text-amber-400 tracking-[0.25em] mb-3">{testimonialEyebrow}</p>
                <Quote className="h-5 w-5 text-amber-300/70 mb-3 shrink-0" aria-hidden />
                <blockquote className="text-sm leading-relaxed text-foreground/90 flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 pt-4 border-t border-amber-500/20">
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  {testimonial.title && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{testimonial.title}</p>
                  )}
                </figcaption>
              </motion.figure>
            )}
          </div>
        </section>
      )}

      {/* ========================== SIGNED MOU COPY ======================== */}
      {(mouPublished || Boolean(mouPdf)) && (
        <section className="border-b border-border/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">{mouEyebrow}</p>
            <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-300" aria-hidden /> {mouTitle}
            </h2>

            {mouPublished ? (
              <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50 bg-background/40">
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {partner.name} · Memorandum of Understanding
                  </span>
                  <a
                    href={mouPdf.startsWith("/api/media/") ? `${mouPdf}?download=1` : mouPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden /> {mouDownload}
                  </a>
                </div>
                {/* Browser-native PDF viewer; falls back to the download
                    button above in browsers without inline PDF support. */}
                <object data={mouPdf} type="application/pdf" className="w-full h-[520px] bg-background/60">
                  <div className="flex items-center justify-center h-[520px]">
                    <a href={mouPdf} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 underline">
                      Open the MoU copy in a new tab
                    </a>
                  </div>
                </object>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <Lock className="h-5 w-5 text-amber-300" aria-hidden />
                </span>
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">{mouRequestNote}</p>
                <Button size="sm" variant="outline" onClick={() => navigate({ name: "contact" })} className="shrink-0">
                  Contact us <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden />
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================ BOTTOM CTA =========================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-50" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-16 text-center">
          <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] text-balance">
            {ctaTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-3 mb-7 leading-relaxed">
            {ctaDescription}
          </p>
          <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm">
            {ctaLabel} <ArrowRight className="h-4 w-4 ml-2" aria-hidden />
          </Button>
        </div>
      </section>
    </div>
  )
}
