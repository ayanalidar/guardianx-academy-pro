"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Shield, Mail, Phone, MapPin, ArrowRight, ChevronRight,
} from "lucide-react"
import { useAppStore, type View } from "@/store/app-store"
import { viewToPath } from "@/lib/url-router"
import { usePageContent, getContent, getContentArray } from "@/lib/use-content"
import { getCmsIcon } from "@/lib/cms-icons"

/**
 * PublicFooter - 7-column LEGAL-inclusive structure per master-prompt §55.
 *
 * Columns:
 *   1. TRAINING     — Courses, Learning Paths, Upcoming Batches, Certifications, Mock Exams
 *   2. PRACTICE     — Labs, Cyber Range, CTF Arena, Challenges
 *   3. ASSESSMENT   — Proctored Exams, GuardianX Certifications, Certificate Verification
 *   4. INSTITUTIONS — Schools, Colleges, Universities, Corporate Training, Partner With Us
 *   5. COMPANY      — About, Instructors, Careers, Contact, Security
 *   6. RESOURCES    — Events, Workshops, Webinars, Help
 *   7. LEGAL        — Privacy, Terms, Refund Policy, Responsible Disclosure, Cookie Policy
 *
 * Each link is a REAL anchor (`href` from viewToPath) — crawlable,
 * shareable, middle-click safe — with SPA click interception.
 * Bottom bar (contact info + copyright + Privacy/Terms/Security buttons) is unchanged.
 */
export function PublicFooter() {
  const { navigate } = useAppStore()

  /* --------------------------------------------------------------
   * CMS-driven copy (Admin → Content Studio → Global → Footer).
   * The 7 link columns below are structural navigation (kept in
   * code); everything textual — CTA block, brand, contact info,
   * social links, copyright — is CMS-editable with fallbacks.
   * -------------------------------------------------------------- */
  const cms = usePageContent("global")
  const cmsData = cms.data

  const ctaEyebrow = getContent(cmsData, "footer", "eyebrow", "READY?")
  const ctaTitle = getContent(cmsData, "footer", "ctaTitle", "Start your")
  const ctaTitleAccent = getContent(cmsData, "footer", "ctaTitleAccent", "journey today.")
  const ctaSubtitle = getContent(cmsData, "footer", "ctaSubtitle", "Free to start. No credit card required.")
  const ctaButton = getContent(cmsData, "footer", "ctaButton", "Create Free Account")
  const brandName = getContent(cmsData, "footer", "brandName", "GuardianX")
  const brandDesc = getContent(cmsData, "footer", "brandDesc", "Building tomorrow's cyber guardians.")
  const copyright = getContent(cmsData, "footer", "copyright", "GuardianX Academy")

  const contactInfo = getContentArray<{ icon: string; value: string }>(
    cmsData, "footer", "contactInfo",
    [
      { icon: "Mail", value: "academy@guardianx.in" },
      { icon: "Phone", value: "+91 80 1234 5678" },
      { icon: "MapPin", value: "Bengaluru, India" },
    ],
  )
  const socialLinks = getContentArray<{ icon: string; label: string; href: string }>(
    cmsData, "footer", "socialLinks",
    [
      { icon: "Github", label: "GitHub", href: "#" },
      { icon: "Linkedin", label: "LinkedIn", href: "#" },
      { icon: "Twitter", label: "Twitter", href: "#" },
      { icon: "Youtube", label: "YouTube", href: "#" },
    ],
  )

  type FooterLink = { label: string; view: View }
  type FooterSection = { title: string; links: FooterLink[] }

  const footerSections: FooterSection[] = [
    {
      title: "TRAINING",
      links: [
        { label: "Courses", view: { name: "catalog" } },
        { label: "Learning Paths", view: { name: "learning-paths" } },
        { label: "Upcoming Batches", view: { name: "batches" } },
        { label: "Certifications", view: { name: "certificates" } },
        { label: "Mock Exams", view: { name: "exams" } },
      ],
    },
    {
      title: "PRACTICE",
      links: [
        { label: "Labs", view: { name: "labs" } },
        { label: "Cyber Range", view: { name: "cyber-range" } },
        { label: "CTF Arena", view: { name: "ctf-platform" } },
        { label: "Challenges", view: { name: "weekly-challenges" } },
        { label: "Awareness Quiz", view: { name: "cyber-quiz" } },
      ],
    },
    {
      title: "ASSESSMENT",
      links: [
        { label: "Proctored Exams", view: { name: "exams" } },
        { label: "GuardianX Certifications", view: { name: "certificates" } },
        { label: "Certificate Verification", view: { name: "credentials" } },
      ],
    },
    {
      title: "INSTITUTIONS",
      links: [
        { label: "Schools", view: { name: "institutions-schools" } },
        { label: "Colleges", view: { name: "institutions-colleges" } },
        { label: "Universities", view: { name: "institutions-universities" } },
        { label: "Corporate Training", view: { name: "corporate-training" } },
        { label: "Partner With Us", view: { name: "contact" } },
      ],
    },
    {
      title: "COMPANY",
      links: [
        { label: "About", view: { name: "impact" } },
        { label: "Instructors", view: { name: "instructors" } },
        { label: "Careers", view: { name: "career-planner" } },
        { label: "Contact", view: { name: "contact" } },
        { label: "Security", view: { name: "contact" } },
      ],
    },
    {
      title: "RESOURCES",
      links: [
        { label: "Events", view: { name: "events" } },
        { label: "Workshops", view: { name: "events" } },
        { label: "Webinars", view: { name: "events" } },
        { label: "Help", view: { name: "support" } },
      ],
    },
    {
      title: "LEGAL",
      links: [
        { label: "Privacy", view: { name: "legal", pageType: "privacy" } },
        { label: "Terms", view: { name: "legal", pageType: "terms" } },
        { label: "Refund Policy", view: { name: "legal", pageType: "refund" } },
        { label: "Responsible Disclosure", view: { name: "contact" } },
        { label: "Cookie Policy", view: { name: "legal", pageType: "cookies" } },
      ],
    },
  ]

  return (
    <footer className="mt-auto relative overflow-hidden border-t border-border bg-background">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 bg-mesh opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-violet-600/6 blur-[120px] rounded-full pointer-events-none" />

      {/* Compact CTA */}
      <div className="relative z-10 border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center">
          <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-3">{ctaEyebrow}</p>
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            {ctaTitle}{" "}
            <span className="text-gradient-premium">{ctaTitleAccent}</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-6">
            {ctaSubtitle}
          </p>
          <a
            href={viewToPath({ name: "login" })}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              if (e.button !== 0) return
              e.preventDefault()
              navigate({ name: "login" })
            }}
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-md bg-violet-600 hover:bg-violet-500 btn-premium text-sm font-medium text-primary-foreground transition-colors"
          >
            {ctaButton}
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </div>
      </div>

      {/* Footer content - 7-column LEGAL-inclusive structure (master-prompt §55) */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand row + 7 link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/guardianx-logo-v2.png"
                alt="GuardianX"
                className="h-8 w-8 object-contain"
                style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.5))" }}
                draggable={false}
              />
              <div className="font-bold text-sm">
                {brandName}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-xs">
              {brandDesc}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>System operational</span>
            </div>
            {/* Social links — CMS-editable */}
            <div className="flex items-center gap-2 mt-4">
              {socialLinks.map((s) => {
                const SocialIcon = getCmsIcon(s.icon)
                return (
                  <a
                    key={s.label}
                    href={s.href || "#"}
                    target={s.href && s.href !== "#" ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="text-muted-foreground hover:text-violet-300 transition-colors"
                  >
                    <SocialIcon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* 7 link columns: TRAINING, PRACTICE, ASSESSMENT, INSTITUTIONS, COMPANY, RESOURCES, LEGAL */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((item) => (
                  <li key={item.label}>
                    <a
                      href={viewToPath(item.view)}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                        if (e.button !== 0) return
                        e.preventDefault()
                        navigate(item.view)
                      }}
                      className="text-muted-foreground hover:text-violet-300 transition-colors flex items-center gap-1 group text-xs"
                    >
                      {item.label}
                      <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact info + legal — bottom bar unchanged */}
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {contactInfo.map((item, i) => {
              const ContactIcon = getCmsIcon(item.icon)
              return (
                <span key={`${item.icon}-${i}`} className="flex items-center gap-1.5">
                  <ContactIcon className="h-3.5 w-3.5 text-violet-300" /> {item.value}
                </span>
              )
            })}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>© {new Date().getFullYear()} {copyright}</span>
            <span className="opacity-30">·</span>
            <a href="/privacy" className="hover:text-violet-300 transition-colors">Privacy</a>
            <span className="opacity-30">·</span>
            <a href="/terms" className="hover:text-violet-300 transition-colors">Terms</a>
            <span className="opacity-30">·</span>
            <a href="/contact" className="hover:text-violet-300 transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
