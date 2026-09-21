"use client"

import * as React from "react"
import { useAppStore, type View } from "@/store/app-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Shield, Twitter, Linkedin, Github, Youtube, Mail, ArrowRight,
  BookOpen, FlaskConical, Radio, Award, Terminal,
  Building2, Heart, MessageSquare, Users,
  Lock, FileText, HelpCircle, CreditCard, Cookie, ScrollText,
  Database, FileCode, PenSquare,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type FooterLink = {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  // Allow non-View names (e.g. "about", "privacy") so the footer can
  // link to CMS pages / external routes that aren't part of the SPA
  // View union. The navigate call site casts to View.
  view?: View | { name: string }
  href?: string
}

const PLATFORM_LINKS: FooterLink[] = [
  { label: "Courses", icon: BookOpen, view: { name: "auth" } },
  { label: "Labs", icon: FlaskConical, view: { name: "auth" } },
  { label: "Live Sessions", icon: Radio, view: { name: "auth" } },
  { label: "Certifications", icon: Award, view: { name: "certifications" } },
  { label: "Pricing", icon: Award, view: { name: "pricing" } },
  { label: "Proctored Exams", icon: Terminal, view: { name: "certifications" } },
]

const COMPANY_LINKS: FooterLink[] = [
  { label: "About Us", icon: Building2, view: { name: "legal", pageType: "about" } },
  { label: "Partners", icon: Users, view: { name: "institutions" } },
  { label: "Impact", icon: Heart, view: { name: "impact" } },
  { label: "Contact", icon: MessageSquare, view: { name: "contact" } },
  { label: "Careers", icon: ArrowRight, view: { name: "contact" } },
]

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy Policy", icon: Lock, view: { name: "legal", pageType: "privacy" } },
  { label: "Terms & Conditions", icon: FileText, view: { name: "legal", pageType: "terms" } },
  { label: "FAQ", icon: HelpCircle, view: { name: "legal", pageType: "faq" } },
  { label: "Refund Policy", icon: CreditCard, view: { name: "legal", pageType: "refund" } },
  { label: "Cookie Policy", icon: Cookie, view: { name: "legal", pageType: "cookies" } },
  { label: "Code of Conduct", icon: ScrollText, view: { name: "legal", pageType: "conduct" } },
]

const RESOURCE_LINKS: FooterLink[] = [
  { label: "Payloads Library", icon: Database, href: "https://github.com/swisskyrepo/PayloadsAllTheThings" },
  { label: "Documentation", icon: FileCode, view: { name: "legal", pageType: "faq" } },
  { label: "Blog", icon: PenSquare, view: { name: "blog" } },
  { label: "Community", icon: Users, view: { name: "auth" } },
  { label: "API Docs", icon: FileCode, view: { name: "legal", pageType: "faq" } },
]

const SOCIAL_LINKS = [
  { label: "Twitter", icon: Twitter, href: "https://twitter.com/guardianx" },
  { label: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/company/guardianx" },
  { label: "GitHub", icon: Github, href: "https://github.com/guardianx" },
  { label: "YouTube", icon: Youtube, href: "https://youtube.com/@guardianx" },
]

function FooterLinkButton({ link }: { link: FooterLink }) {
  const { navigate } = useAppStore()
  const Icon = link.icon
  const content = (
    <span className="group/link inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-emerald-400 transition-colors">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover/link:opacity-100" />}
      <span>{link.label}</span>
    </span>
  )
  if (link.href) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="block py-1">
        {content}
      </a>
    )
  }
  if (link.view) {
    return (
      <button onClick={() => navigate(link.view as View)} className="block py-1 text-left w-full">
        {content}
      </button>
    )
  }
  return <div className="block py-1">{content}</div>
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80 mb-3 font-mono">
        {title}
      </h4>
      <nav className="space-y-0">
        {links.map((link) => (
          <FooterLinkButton key={link.label} link={link} />
        ))}
      </nav>
    </div>
  )
}

export function SiteFooter() {
  const { navigate } = useAppStore()
  const [email, setEmail] = React.useState("")
  const [subscribed, setSubscribed] = React.useState(false)

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }
    setSubscribed(true)
    setEmail("")
    toast.success("Subscribed! Welcome to the GuardianX Academy newsletter.")
  }

  return (
    <footer className="mt-auto relative overflow-hidden border-t border-border bg-sidebar/40 backdrop-blur-xl">
      {/* Holographic ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-32 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-12">
        {/* === BRAND + NEWSLETTER ROW === */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10 pb-10 border-b border-border">
          <div>
            <button
              onClick={() => navigate({ name: "home" })}
              className="flex items-center gap-2.5 mb-4 group"
            >
              <div className="relative">
                <img
                  src="/guardianx-academy-logo.png"
                  alt="GuardianX Academy"
                  className="h-9 w-9 rounded-lg object-cover logo-img logo-animated logo-glow"
                />
                <div className="absolute inset-0 bg-emerald-500/30 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xl leading-none tracking-tight">
                  Guardian<span className="text-emerald-400">X</span> Academy
                </div>
                <div className="text-[10px] text-muted-foreground font-mono tracking-widest mt-1">
                  Building Tomorrow&apos;s Cyber Guardians
                </div>
              </div>
            </button>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-5">
              Industry-leading cyber security certification training. In-premises batches at
              schools, colleges, and universities - plus virtual cohorts for individual learners.
              Practice with real payloads, hands-on Docker labs, and proctored examinations.
            </p>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="h-9 w-9 rounded-lg flex items-center justify-center border border-border bg-background/50 text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:pl-8 lg:border-l border-border">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-semibold">Stay in the Loop</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Get the latest on new courses, lab releases, scholarship opportunities, and cyber
              security insights. No spam - unsubscribe anytime.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm">
                <Shield className="h-4 w-4" />
                You&apos;re on the list! Watch your inbox.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/60 border-border focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20"
                />
                <Button
                  type="submit"
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shrink-0"
                >
                  Subscribe <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </form>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              By subscribing, you agree to our{" "}
              <button
                onClick={() => navigate({ name: "legal", pageType: "privacy" })}
                className="text-emerald-400 hover:underline"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>

        {/* === LINK COLUMNS ROW === */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <FooterColumn title="Platform" links={PLATFORM_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
        </div>

        {/* === BOTTOM BAR === */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono">GuardianX Academy · v2.0.0</span>
            <span className="hidden sm:inline opacity-50">·</span>
            <span className="hidden sm:inline font-mono text-emerald-400/70">Encrypted end-to-end</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} GuardianX Security Education</span>
            <span className="opacity-50">·</span>
            <button
              onClick={() => navigate({ name: "legal", pageType: "conduct" })}
              className="hover:text-emerald-400 transition-colors"
            >
              Code of Conduct
            </button>
            <span className="opacity-50">·</span>
            <button
              onClick={() => navigate({ name: "legal", pageType: "terms" })}
              className="hover:text-emerald-400 transition-colors"
            >
              Terms
            </button>
          </div>
        </div>

        {/* === DEMO ACCOUNTS / CONTACT STRIP === */}
        <div className="mt-6 pt-6 border-t border-border/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-emerald-400/70">DEMO ACCESS:</span>
              <span>student@guardianx.io / student123</span>
              <span className="hidden sm:inline opacity-40">|</span>
              <span>instructor@guardianx.io / instructor123</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
