"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatTile } from "@/components/cyber/stat-tile"
import { ParticleLogo } from "@/components/platform/particle-logo"
import { usePageContent, getContent, getContentArray } from "@/lib/use-content"
import { getCmsIcon } from "@/lib/cms-icons"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowLeft, Handshake } from "lucide-react"

/**
 * Institutions Hub - the `institutions` landing page.
 *
 * Fully CMS-driven (Admin → Content Studio → Institutions): hero, partner
 * types, benefits, flow steps, partnership models and the final CTA all read
 * from the "institutions" page content with hard-coded fallbacks.
 *
 * History: the CMS seed for this page existed since the Content Studio shipped,
 * but no view consumed it - "institutions" simply redirected to the schools
 * product page, making every CMS edit here write-only. This view restores the
 * intended hub and links into the three institution-type product pages.
 */

interface PartnerType {
  type: string
  title: string
  description: string
  icon: string
  accent: string
  bg: string
  border?: string
  ctaLabel: string
  highlight?: string
  highlightIcon?: string
  target: { name: any }
}

// Static view targets per partner type (content drives the copy, code drives
// the navigation - the three product pages are real views).
const PARTNER_TARGETS: Record<string, { name: any }> = {
  School: { name: "institutions-schools" },
  College: { name: "institutions-colleges" },
  University: { name: "institutions-universities" },
}

export function InstitutionsView() {
  const { navigate } = useAppStore()

  const cms = usePageContent("institutions")
  const cmsData = cms.data

  // ---- Hero ----
  const heroEyebrow = getContent(cmsData, "hero", "eyebrow", "INSTITUTIONAL PARTNERSHIPS")
  const heroTitle = getContent(cmsData, "hero", "title", "On-premises training for")
  const heroTitleAccent = getContent(cmsData, "hero", "titleAccent", "schools, colleges & universities.")
  const heroDescription = getContent(
    cmsData, "hero", "description",
    "GuardianX delivers cybersecurity training directly at your campus - your classrooms, your labs, your schedule. From secondary schools to research universities, we build job-ready defenders through a single, integrated platform.",
  )
  const heroCtaPrimary = getContent(cmsData, "hero", "ctaPrimary", "Sign an MoU")
  const heroCtaSecondary = getContent(cmsData, "hero", "ctaSecondary", "Build Your Cybersecurity Program")
  const heroBadge = getContent(cmsData, "hero", "badge", "EDUCATIONAL NETWORK")
  const heroStats = getContentArray<{ value: number; suffix: string; label: string; color: string }>(
    cmsData, "hero", "stats",
    [
      { value: 150, suffix: "+", label: "Institutions", color: "text-violet-300" },
      { value: 12000, suffix: "+", label: "Students", color: "text-cyan-300" },
      { value: 8500, suffix: "+", label: "Certs Issued", color: "text-amber-300" },
    ],
  )
  const networkStats = getContentArray<{ label: string; value: string; color: string }>(
    cmsData, "hero", "networkStats",
    [
      { label: "Schools", value: "85+", color: "text-emerald-300" },
      { label: "Colleges", value: "42+", color: "text-cyan-300" },
      { label: "Universities", value: "23+", color: "text-violet-300" },
    ],
  )

  // ---- Partner types ----
  const typesEyebrow = getContent(cmsData, "partnerTypes", "eyebrow", "WHO WE PARTNER WITH")
  const typesTitle = getContent(cmsData, "partnerTypes", "title", "Three institution types.")
  const typesTitleAccent = getContent(cmsData, "partnerTypes", "titleAccent", "One training platform.")
  const typesDescription = getContent(
    cmsData, "partnerTypes", "description",
    "Each partner type gets its own dedicated login portal, training schedule, and curriculum alignment. Choose your institution to learn more.",
  )
  const partnerTypes = getContentArray<PartnerType>(
    cmsData, "partnerTypes", "items",
    [],
  )

  // ---- Benefits ----
  const benefitsEyebrow = getContent(cmsData, "benefits", "eyebrow", "PARTNER BENEFITS")
  const benefitsTitle = getContent(cmsData, "benefits", "title", "Everything your institution unlocks.")
  const benefitsDescription = getContent(cmsData, "benefits", "description", "")
  const benefits = getContentArray<{ icon: string; title: string; desc: string; color: string; bg: string; tag?: string }>(
    cmsData, "benefits", "items",
    [],
  )

  // ---- Flow steps ----
  const flowEyebrow = getContent(cmsData, "flowSteps", "eyebrow", "THE PATH")
  const flowTitle = getContent(cmsData, "flowSteps", "title", "Your institution.")
  const flowTitleAccent = getContent(cmsData, "flowSteps", "titleAccent", "Our cyber range.")
  const flowDescription = getContent(cmsData, "flowSteps", "description", "")
  const flowSteps = getContentArray<{ step: string; icon: string; color: string; bg: string; border: string }>(
    cmsData, "flowSteps", "items",
    [],
  )

  // ---- Models ----
  const modelsEyebrow = getContent(cmsData, "models", "eyebrow", "PARTNERSHIP MODELS")
  const modelsTitle = getContent(cmsData, "models", "title", "Choose your partnership.")
  const modelsDescription = getContent(cmsData, "models", "description", "")
  const models = getContentArray<{ title: string; icon: string; desc: string; color: string; bg: string; features: string[] }>(
    cmsData, "models", "items",
    [],
  )
  const modelsCta = getContent(cmsData, "models", "cta", "Enquire")

  // ---- Final CTA ----
  const finalBadge = getContent(cmsData, "finalCta", "badge", "MEMORANDUM OF UNDERSTANDING")
  const finalTitle = getContent(cmsData, "finalCta", "title", "Sign an MoU.")
  const finalTitleAccent = getContent(cmsData, "finalCta", "titleAccent", "Build your cybersecurity program.")
  const finalDescription = getContent(cmsData, "finalCta", "description", "")
  const finalCtaPrimary = getContent(cmsData, "finalCta", "ctaPrimary", "Sign an MoU")
  const finalCtaSecondary = getContent(cmsData, "finalCta", "ctaSecondary", "Build Your Cybersecurity Program")
  const trustFooter = getContentArray<{ label: string; value: string; icon: string; color: string }>(
    cmsData, "finalCta", "trustFooter",
    [],
  )

  return (
    <main className="relative">
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="hidden lg:block absolute right-[6%] top-1/2 -translate-y-1/2 pointer-events-auto">
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
            <ParticleLogo size={680} interactive showGlow />
          </motion.div>
        </div>
        <div className="lg:hidden absolute inset-x-0 top-0 h-[44vh] flex items-center justify-center pointer-events-none">
          <ParticleLogo size={340} interactive={false} showGlow />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-16 pt-[48vh] lg:pt-16">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 mb-4">
              <Handshake className="h-5 w-5 text-violet-300" />
              <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em]">{heroEyebrow}</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
              {heroTitle}{" "}
              <span className="text-gradient-premium">{heroTitleAccent}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="text-base lg:text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed">
              {heroDescription}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="flex items-center gap-3 flex-wrap">
              <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm">
                {heroCtaPrimary} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate({ name: "contact" })} className="px-6 py-6 text-sm">
                {heroCtaSecondary}
              </Button>
            </motion.div>

            {/* Stats + network chips */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} className="mt-8">
              <div className="grid grid-cols-3 gap-3 max-w-lg">
                {heroStats.map((s, i) => {
                  const StatIcon = getCmsIcon(["Building2", "Users", "Award"][i] ?? "Award")
                  return (
                    <StatTile
                      key={s.label}
                      icon={StatIcon}
                      label={s.label}
                      value={s.value.toLocaleString("en-IN")}
                      suffix={s.suffix}
                      color={s.color}
                      tint="bg-violet-500/10"
                    />
                  )
                })}
              </div>
              <Badge variant="outline" className="mt-4 border-violet-500/30 text-violet-300 bg-violet-500/5">
                {heroBadge}
              </Badge>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                {networkStats.map((n) => (
                  <span key={n.label} className="text-[11px] text-muted-foreground">
                    <span className={cn("font-semibold", n.color)}>{n.value}</span> {n.label}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================= PARTNER TYPES ========================= */}
      {partnerTypes.length > 0 && (
        <section className="relative border-t border-border/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-2">{typesEyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {typesTitle} <span className="text-gradient-premium">{typesTitleAccent}</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mb-10 leading-relaxed">{typesDescription}</p>
            <div className="grid md:grid-cols-3 gap-5">
              {partnerTypes.map((pt, i) => {
                const Icon = getCmsIcon(pt.icon)
                const HighlightIcon = getCmsIcon(pt.highlightIcon)
                return (
                  <motion.div
                    key={pt.type || i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="group relative rounded-2xl border border-border/60 bg-card/40 p-6 transition-colors hover:border-violet-500/40"
                  >
                    <div className={cn("inline-flex p-2.5 rounded-lg mb-4", pt.bg)}>
                      <Icon className={cn("h-5 w-5", pt.accent)} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{pt.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-5">{pt.description}</p>
                    {pt.highlight && HighlightIcon && (
                      <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 mb-5">
                        <HighlightIcon className="h-3.5 w-3.5 text-emerald-300 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{pt.highlight}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(PARTNER_TARGETS[pt.type] ?? { name: "contact" })}
                    >
                      {pt.ctaLabel} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================ BENEFITS ============================ */}
      {benefits.length > 0 && (
        <section className="relative border-t border-border/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-2">{benefitsEyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight mb-2">{benefitsTitle}</h2>
            {benefitsDescription && (
              <p className="text-sm text-muted-foreground max-w-2xl mb-10 leading-relaxed">{benefitsDescription}</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map((b, i) => {
                const Icon = getCmsIcon(b.icon)
                return (
                  <motion.div
                    key={b.title || i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: (i % 3) * 0.06 }}
                    className="rounded-xl border border-border/60 bg-card/40 p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("inline-flex p-2 rounded-lg", b.bg)}>
                        <Icon className={cn("h-4 w-4", b.color)} />
                      </div>
                      {b.tag && (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">{b.tag}</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5">{b.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================== FLOW STEPS =========================== */}
      {flowSteps.length > 0 && (
        <section className="relative border-t border-border/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-2">{flowEyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {flowTitle} <span className="text-gradient-premium">{flowTitleAccent}</span>
            </h2>
            {flowDescription && (
              <p className="text-sm text-muted-foreground max-w-2xl mb-10 leading-relaxed">{flowDescription}</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {flowSteps.map((f, i) => {
                const Icon = getCmsIcon(f.icon)
                return (
                  <motion.div
                    key={f.step || i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className={cn("rounded-xl border p-5 text-center", f.border, f.bg)}
                  >
                    <Icon className={cn("h-6 w-6 mx-auto mb-3", f.color)} />
                    <p className="text-sm font-semibold">{f.step}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">STEP {i + 1}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================ MODELS ============================= */}
      {models.length > 0 && (
        <section className="relative border-t border-border/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[10px] font-mono text-emerald-400 tracking-[0.3em] mb-2">{modelsEyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight mb-2">{modelsTitle}</h2>
            {modelsDescription && (
              <p className="text-sm text-muted-foreground max-w-2xl mb-10 leading-relaxed">{modelsDescription}</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {models.map((m, i) => {
                const Icon = getCmsIcon(m.icon)
                return (
                  <motion.div
                    key={m.title || i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: (i % 4) * 0.06 }}
                    className="flex flex-col rounded-xl border border-border/60 bg-card/40 p-5"
                  >
                    <div className={cn("inline-flex p-2 rounded-lg mb-3 w-fit", m.bg)}>
                      <Icon className={cn("h-4 w-4", m.color)} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5">{m.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{m.desc}</p>
                    <ul className="space-y-1.5 mb-5 flex-1">
                      {(m.features ?? []).map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate({ name: "contact" })}>
                      {modelsCta}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================== FINAL CTA =========================== */}
      <section className="relative border-t border-border/40 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-50" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-300 bg-violet-500/5">
            {finalBadge}
          </Badge>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em] mb-4 text-balance">
            {finalTitle}{" "}
            <span className="text-gradient-premium">{finalTitleAccent}</span>
          </h2>
          {finalDescription && (
            <p className="text-sm lg:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              {finalDescription}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
            <Button size="lg" onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-8 py-6 text-sm">
              {finalCtaPrimary} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ name: "contact" })} className="px-6 py-6 text-sm">
              {finalCtaSecondary}
            </Button>
          </div>
          {trustFooter.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trustFooter.map((t, i) => {
                const Icon = getCmsIcon(t.icon)
                return (
                  <div key={t.label || i} className="rounded-lg border border-border/60 bg-card/40 p-3">
                    <Icon className={cn("h-4 w-4 mx-auto mb-1.5", t.color)} />
                    <p className="text-[10px] text-muted-foreground">{t.label}</p>
                    <p className="text-xs font-semibold">{t.value}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
