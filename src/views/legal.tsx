"use client"

import * as React from "react"
import { useAppStore, type View } from "@/store/app-store"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Shield, Lock, FileText, HelpCircle, CreditCard, Cookie, ScrollText,
  Building2, Rocket, Target, Eye, Users, Heart, Award, BookOpen,
  FlaskConical, Terminal, Radio, GraduationCap, CheckCircle2, AlertTriangle,
  Mail, ArrowRight, Sparkles, Globe, Server, Brain, Network,
  ChevronRight, Clock, Scale, UserCheck, BellRing, Scroll, Settings,
  HandHeart, Flag, Trophy, Crosshair, Fingerprint, KeyRound, BadgeCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type LegalPageType =
  | "privacy"
  | "terms"
  | "about"
  | "faq"
  | "refund"
  | "cookies"
  | "conduct"
  | "conduct"

interface LegalPageProps {
  pageType: LegalPageType
}

interface LegalNavItem {
  type: LegalPageType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  // Allow non-View names (about / privacy / terms / faq / refund / cookies /
  // conduct) so the legal nav can link to CMS-rendered pages that aren't
  // part of the SPA View union. The call site casts to View.
  view: View | { name: string }
}

const LEGAL_NAV: LegalNavItem[] = [
  { type: "about", label: "About Us", icon: Building2, description: "Our story & mission", view: { name: "about" } },
  { type: "privacy", label: "Privacy Policy", icon: Lock, description: "How we handle your data", view: { name: "privacy" } },
  { type: "terms", label: "Terms & Conditions", icon: FileText, description: "Rules of the platform", view: { name: "terms" } },
  { type: "faq", label: "FAQ", icon: HelpCircle, description: "Frequently asked questions", view: { name: "faq" } },
  { type: "refund", label: "Refund Policy", icon: CreditCard, description: "Refunds & cancellations", view: { name: "refund" } },
  { type: "cookies", label: "Cookie Policy", icon: Cookie, description: "How we use cookies", view: { name: "cookies" } },
  { type: "conduct", label: "Code of Conduct", icon: ScrollText, description: "Student expectations", view: { name: "conduct" } },
]

const PAGE_META: Record<LegalPageType, { title: string; subtitle: string; lastUpdated: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  about: {
    title: "About GuardianX Academy",
    subtitle: "Building Tomorrow's Cyber Guardians - one student, one campus, one certification at a time.",
    lastUpdated: "January 15, 2025",
    icon: Building2,
    accent: "emerald",
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How GuardianX Academy collects, uses, and protects your personal information.",
    lastUpdated: "January 20, 2025",
    icon: Lock,
    accent: "cyan",
  },
  terms: {
    title: "Terms & Conditions",
    subtitle: "The rules and conditions that govern your use of the GuardianX Academy platform.",
    lastUpdated: "January 20, 2025",
    icon: FileText,
    accent: "violet",
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about courses, labs, exams, certifications, and partnerships.",
    lastUpdated: "January 22, 2025",
    icon: HelpCircle,
    accent: "amber",
  },
  refund: {
    title: "Refund Policy",
    subtitle: "Our policy for course refunds, exam fees, and subscription cancellations.",
    lastUpdated: "January 18, 2025",
    icon: CreditCard,
    accent: "teal",
  },
  cookies: {
    title: "Cookie Policy",
    subtitle: "What cookies we use, why we use them, and how you can manage them.",
    lastUpdated: "January 18, 2025",
    icon: Cookie,
    accent: "amber",
  },
  conduct: {
    title: "Code of Conduct",
    subtitle: "The standards of behavior, academic integrity, and anti-cheating expectations for all students.",
    lastUpdated: "January 22, 2025",
    icon: ScrollText,
    accent: "red",
  },
}

// === Reusable building blocks ===

function Section({
  id,
  title,
  icon: Icon,
  children,
  accent = "emerald",
}: {
  id?: string
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  accent?: string
}) {
  const accentColor =
    accent === "emerald" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : accent === "cyan" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    : accent === "violet" ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
    : accent === "amber" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : accent === "teal" ? "text-teal-400 bg-teal-500/10 border-teal-500/20"
    : accent === "red" ? "text-red-400 bg-red-500/10 border-red-500/20"
    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"

  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={cn("inline-flex p-2 rounded-lg border", accentColor)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <h2 className="text-xl md:text-2xl font-bold tracking-tight neon-text">{title}</h2>
      </div>
      <div className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  )
}

function BulletList({ items, accent = "emerald" }: { items: React.ReactNode[]; accent?: string }) {
  const dot =
    accent === "emerald" ? "text-emerald-400"
    : accent === "cyan" ? "text-cyan-400"
    : accent === "violet" ? "text-violet-400"
    : accent === "amber" ? "text-amber-400"
    : accent === "teal" ? "text-teal-400"
    : accent === "red" ? "text-red-400"
    : "text-emerald-400"
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <CheckCircle2 className={cn("h-4 w-4 mt-0.5 shrink-0", dot)} />
          <span className="text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Callout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning"
  title: string
  children: React.ReactNode
}) {
  const styles =
    type === "warning"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
  const Icon = type === "warning" ? AlertTriangle : Shield
  return (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", styles)}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold mb-1">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function ProseCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-6 glass-card holo-border holo-shimmer glass-reflection">
      {children}
    </Card>
  )
}

// === SIDEBAR ===

function LegalSidebar({ active }: { active: LegalPageType }) {
  const { navigate } = useAppStore()
  return (
    <aside className="lg:sticky lg:top-24 h-fit">
      <Card className="p-4 glass-card holo-border">
        <div className="mb-3 px-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-400/80 mb-1">
            Legal Center
          </div>
          <p className="text-xs text-muted-foreground">Navigate our policies & resources</p>
        </div>
        <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scroll">
          {LEGAL_NAV.map((item) => {
            const isActive = item.type === active
            return (
              <button
                key={item.type}
                onClick={() => navigate(item.view as View)}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg transition-all group flex items-center gap-3",
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/30"
                    : "border border-transparent hover:bg-accent/50 hover:border-border"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-md transition-colors",
                  isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/40 text-muted-foreground group-hover:text-emerald-400"
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-emerald-400" : "text-foreground"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0" />}
              </button>
            )
          })}
        </nav>
        <div className="mt-4 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="w-full glass-card border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => navigate({ name: "contact" })}
          >
            <Mail className="h-3.5 w-3.5 mr-1.5" /> Contact Legal Team
          </Button>
        </div>
      </Card>
    </aside>
  )
}

// === PAGE CONTENT COMPONENTS ===

function AboutContent() {
  const { navigate } = useAppStore()
  return (
    <div className="space-y-10">
      {/* Hero card */}
      <Card className="p-8 glass-card holo-border holo-shimmer relative overflow-hidden">
        <div className="particle-network opacity-30" />
        <div className="orb bg-emerald-500 w-64 h-64 -top-20 -right-20 blob" />
        <div className="relative z-10">
          <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400">
            <Sparkles className="h-3 w-3 mr-1" /> OUR STORY
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-holo">Building Tomorrow&apos;s Cyber Guardians</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-3xl">
            GuardianX Academy was founded with a single, urgent mission: to close the global cyber
            security talent gap by making world-class training accessible to every learner - whether
            they&apos;re a student on a university campus or a working professional leveling up from
            home. We blend rigorous certification curricula with hands-on, real-world labs to forge
            practitioners, not just certificate-holders.
          </p>
        </div>
      </Card>

      <Section id="mission" title="Our Mission" icon={Target} accent="emerald">
        <p>
          To democratize cyber security education by delivering industry-aligned certification
          training through both in-premises batches (at schools, colleges, and universities) and
          virtual cohorts for individual learners - equipping every student with the skills,
          confidence, and verifiable credentials to defend the digital world.
        </p>
      </Section>

      <Section id="vision" title="Our Vision" icon={Eye} accent="cyan">
        <p>
          A world where every organization - regardless of size or sector - can find skilled cyber
          security professionals, and where every learner has a clear, affordable path to a cyber
          career. We envision 100,000+ certified Guardians by 2030, defending critical
          infrastructure, governments, and businesses across the globe.
        </p>
      </Section>

      <Section id="values" title="Our Values" icon={Heart} accent="violet">
        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {[
            { icon: Shield, title: "Integrity First", desc: "We hold ourselves to the highest ethical standards. Hackers we train are guardians, not attackers - sworn to use skills lawfully and defensively." },
            { icon: FlaskConical, title: "Practice over Theory", desc: "Real Docker containers, real exploits, real flags. We don't just teach concepts - we put a terminal in your hands from day one." },
            { icon: Users, title: "Accessible to All", desc: "Cyber security shouldn't be gated by geography or income. We partner with campuses worldwide and offer scholarships to underrepresented talent." },
            { icon: Award, title: "Outcomes over Promises", desc: "Our north star is job placement - 94% of certified Guardians land cyber roles within 6 months. We measure success by careers launched." },
            { icon: Brain, title: "Always Learning", desc: "Threats evolve daily. So do our courses. We update content monthly and add new labs as new vulnerabilities emerge in the wild." },
            { icon: Globe, title: "Community-Driven", desc: "15,000+ Guardians strong. Peer mentorship, discussion forums, and a lifelong alumni network that has your back." },
          ].map((v, i) => (
            <Card key={i} className="p-5 glass-card hover-lift group">
              <div className="inline-flex p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-3 group-hover:scale-110 transition-transform">
                <v.icon className="h-5 w-5" />
              </div>
              <h4 className="font-bold mb-1.5">{v.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="stats" title="GuardianX by the Numbers" icon={Trophy} accent="amber">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {[
            { value: "15,000+", label: "Students Trained", icon: Users },
            { value: "50+", label: "Partner Campuses", icon: Building2 },
            { value: "8,500+", label: "Certifications Earned", icon: Award },
            { value: "94%", label: "Job Placement Rate", icon: Trophy },
            { value: "27", label: "Certification Tracks", icon: BookOpen },
            { value: "31", label: "Hands-on Labs", icon: Terminal },
            { value: "120+", label: "Expert Instructors", icon: GraduationCap },
            { value: "24/7", label: "Platform Access", icon: Clock },
          ].map((s, i) => (
            <Card key={i} className="p-4 text-center glass-card holo-border">
              <s.icon className="h-5 w-5 mx-auto mb-2 text-amber-400" />
              <div className="text-2xl font-bold tabular-nums neon-text-amber">{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="team" title="Our Team & Leadership" icon={Users} accent="teal">
        <p>
          GuardianX Academy is led by a team of certified cyber security practitioners, educators,
          and technologists with combined experience exceeding 500 years across offensive security,
          defense, governance, and identity & access management.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {[
            { name: "Founder & CEO", focus: "Former OSCP / CISSP · ex-Fortune 500 CISO", icon: Shield },
            { name: "Head of Curriculum", focus: "Author of 4 cyber textbooks · CEH Master", icon: BookOpen },
            { name: "Lead Labs Engineer", focus: "Built 31 Docker lab environments · Hack The Box alumnus", icon: Terminal },
            { name: "Director of Partnerships", focus: "Onboarded 50+ campus partners worldwide", icon: Building2 },
            { name: "Head of Proctored Exams", focus: "Anti-cheat architect · Exam integrity advocate", icon: Crosshair },
            { name: "Community & Alumni Lead", focus: "Manages 15,000+ Guardian alumni network", icon: Users },
          ].map((m, i) => (
            <Card key={i} className="p-4 glass-card group">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0 group-hover:scale-110 transition-transform">
                  <m.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{m.focus}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Callout title="Want to join the team?" type="info">
          We&apos;re always hiring instructors, lab engineers, and content creators. Visit our
          {" "}<button onClick={() => navigate({ name: "contact" })} className="text-emerald-400 hover:underline">Contact page</button>
          {" "}to explore open roles.
        </Callout>
      </Section>

      <Section id="story" title="The GuardianX Story" icon={Rocket} accent="emerald">
        <div className="space-y-4 mt-2">
          <div className="border-l-2 border-emerald-500/30 pl-4 py-1">
            <div className="text-xs font-mono text-emerald-400 mb-1">2021 - THE SPARK</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our founder, then a CISO at a Fortune 500 company, watched helplessly as their
              security team couldn&apos;t fill 12 open positions for over a year. The talent gap
              wasn&apos;t abstract - it was a national security risk. GuardianX Academy was born
              that night.
            </p>
          </div>
          <div className="border-l-2 border-cyan-500/30 pl-4 py-1">
            <div className="text-xs font-mono text-cyan-400 mb-1">2022 - FIRST CAMPUS</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Launched our first in-premises cohort at a partner university - 40 students, 6
              certifications, 100% pass rate. The model worked. We scaled to 10 campuses in 8 months.
            </p>
          </div>
          <div className="border-l-2 border-violet-500/30 pl-4 py-1">
            <div className="text-xs font-mono text-violet-400 mb-1">2023 - DOCKER LABS LAUNCH</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Built our proprietary Docker-based lab platform with xterm.js in-browser terminals.
              Every student now gets real, isolated Kali attack boxes and vulnerable target machines - 
              no setup required.
            </p>
          </div>
          <div className="border-l-2 border-amber-500/30 pl-4 py-1">
            <div className="text-xs font-mono text-amber-400 mb-1">2024 - PROCTORED EXAMS</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Introduced the industry&apos;s most rigorous online proctoring system: fullscreen
              lockdown, tab-switch detection, randomized question banks, and auto-void on violation.
              Certificates earned through GuardianX are trusted by employers.
            </p>
          </div>
          <div className="border-l-2 border-emerald-500/30 pl-4 py-1">
            <div className="text-xs font-mono text-emerald-400 mb-1">2025 - 15,000+ GUARDIANS</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Today, GuardianX Academy serves 15,000+ students across 50+ partner campuses with 27
              certification tracks and 31 hands-on labs. And we&apos;re just getting started.
            </p>
          </div>
        </div>
      </Section>

      <div className="pt-4">
        <Button size="lg" className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 breathe neon-border" onClick={() => navigate({ name: "auth" })}>
          <Rocket className="h-4 w-4 mr-2" /> Start Your Journey
        </Button>
      </div>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div className="space-y-10">
      <Callout title="Your privacy is our priority" type="info">
        GuardianX Academy is committed to protecting your personal data. This policy explains, in
        plain language, what we collect, why we collect it, and the controls you have over your
        information. We comply with GDPR (EU), CCPA (California), and other applicable data
        protection laws.
      </Callout>

      <Section id="data-collection" title="1. Information We Collect" icon={Fingerprint} accent="emerald">
        <p>We collect the following categories of personal information:</p>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Account Information</h4>
        <BulletList items={[
          "Name, email address, and password (securely hashed with bcrypt)",
          "Role (student, instructor, admin) and organization/affiliation",
          "Profile photo and bio (optional, user-provided)",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Learning & Activity Data</h4>
        <BulletList items={[
          "Course enrollments, lesson progress, quiz scores, and exam results",
          "Lab session activity (Docker container start/stop, flags submitted, time spent)",
          "Notes, bookmarks, and discussion posts you create",
          "Achievements earned, XP, level, and leaderboard standing",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Technical & Usage Data</h4>
        <BulletList items={[
          "IP address, browser type, operating system, and device identifiers",
          "Pages visited, click patterns, and session duration (anonymized analytics)",
          "Cookies and similar tracking technologies (see our Cookie Policy)",
          "Exam proctoring data: violation flags and environment checks (tab switches, window focus, identity verification) generated during proctored exams - see below",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Payment Information</h4>
        <BulletList items={[
          "Billing name, address, and email (processed by our payment provider - we never store full card numbers)",
          "Transaction history and invoice records for accounting purposes",
        ]} />
      </Section>

      <Section id="data-usage" title="2. How We Use Your Information" icon={Brain} accent="cyan">
        <p>We use your personal data for these legitimate purposes:</p>
        <BulletList accent="cyan" items={[
          "Providing and operating the GuardianX Academy platform (courses, labs, exams, certificates)",
          "Authenticating your identity and securing your account against unauthorized access",
          "Tracking learning progress, calculating scores, and issuing verifiable certificates",
          "Detecting and preventing fraud, cheating on exams, and abuse of our lab infrastructure",
          "Sending transactional emails (enrollment confirmations, exam results, certificate issuance)",
          "Sending newsletters and promotional communications (only if you opt in - unsubscribe anytime)",
          "Improving our courses, labs, and platform based on aggregated learning analytics",
          "Complying with legal obligations and cooperating with law enforcement when required",
        ]} />
        <Callout title="Proctored exam data - special category" type="warning">
          During proctored examinations, we temporarily collect webcam snapshots and screen activity
          to verify your identity and detect academic dishonesty. This data is retained for 90 days
          post-exam for appeals review, then permanently deleted. You consent to this collection
          when starting any proctored exam.
        </Callout>
      </Section>

      <Section id="legal-basis" title="3. Legal Basis for Processing (GDPR)" icon={Scale} accent="violet">
        <p>For users in the European Economic Area (EEA), our legal bases for processing your data are:</p>
        <BulletList accent="violet" items={[
          <><strong>Performance of a contract:</strong> Processing your data to deliver courses, labs, and certifications you&apos;ve enrolled in.</>,
          <><strong>Legitimate interests:</strong> Fraud prevention, platform security, and improving our services (balanced against your privacy rights).</>,
          <><strong>Consent:</strong> For marketing communications, optional cookies, and proctored exam monitoring - withdrawn anytime.</>,
          <><strong>Legal obligation:</strong> Retaining financial records and responding to lawful requests from authorities.</>,
        ]} />
      </Section>

      <Section id="cookies" title="4. Cookies & Tracking Technologies" icon={Cookie} accent="amber">
        <p>
          We use cookies and similar technologies (local storage, session storage) to. We do NOT use browser fingerprinting.
          keep you logged in, remember your preferences, and analyze platform usage. A detailed
          breakdown is available in our{" "}
          <button className="text-emerald-400 hover:underline" onClick={() => useAppStore.getState().navigate({ name: "cookies" } as unknown as View)}>
            Cookie Policy
          </button>.
        </p>
        <BulletList accent="amber" items={[
          "Essential cookies (required for login and platform functionality - cannot be disabled)",
          "Preference cookies (theme, language - stored locally, never sent to servers)",
          "Analytics cookies (anonymized usage data - opt-out available)",
          "We do NOT use third-party advertising cookies or sell your data to advertisers",
        ]} />
      </Section>

      <Section id="third-parties" title="5. Third-Party Services" icon={Network} accent="teal">
        <p>We share specific data with carefully vetted third-party service providers:</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          {[
            { name: "NextAuth.js", purpose: "Authentication & session management", data: "Email, hashed password" },
            { name: "Payment Processor", purpose: "Course purchases & subscriptions", data: "Billing name, address, card token" },
            { name: "Email Service", purpose: "Transactional & marketing emails", data: "Email address, name" },
            { name: "Docker Infrastructure", purpose: "Hands-on lab containers", data: "User ID (anonymized), session token" },
            { name: "Socket.io Service", purpose: "Live session WebRTC signaling", data: "Session ID, peer connection metadata" },
            { name: "Analytics Provider", purpose: "Aggregated usage insights", data: "Anonymized page views, events" },
          ].map((s, i) => (
            <Card key={i} className="p-3 glass-card">
              <div className="text-sm font-bold text-emerald-400">{s.name}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.purpose}</div>
              <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">DATA: {s.data}</div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          We never sell your personal data. All third-party providers are bound by data processing
          agreements and may only use your data to provide services to GuardianX Academy.
        </p>
      </Section>

      <Section id="data-retention" title="6. Data Retention" icon={Clock} accent="cyan">
        <p>We retain your data only as long as necessary:</p>
        <BulletList accent="cyan" items={[
          "Active accounts: All data is retained while your account is active",
          "Closed accounts: Anonymized learning records kept for 24 months for analytics, then deleted",
          "Proctoring violation flags and check data: 90 days post-exam, then purged by our automated retention job",
          "Lab session data: Deleted within 7 days of session end (Docker containers destroyed at TTL)",
          "Financial records: 7 years (legal requirement in most jurisdictions)",
          "Forum posts & community content: Retained indefinitely (anonymized if account deleted)",
        ]} />
      </Section>

      <Section id="user-rights" title="7. Your Rights" icon={UserCheck} accent="emerald">
        <p>You have the following rights regarding your personal data:</p>
        <BulletList items={[
          <><strong>Access:</strong> Request a copy of all data we hold about you (exportable JSON within 30 days).</>,
          <><strong>Rectification:</strong> Correct inaccurate or incomplete information.</>,
          <><strong>Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of your account and associated data (subject to legal retention requirements).</>,
          <><strong>Restriction:</strong> Limit how we process your data while a complaint is resolved.</>,
          <><strong>Data Portability:</strong> Receive your data in a machine-readable format and transfer it to another provider.</>,
          <><strong>Objection:</strong> Object to processing based on legitimate interests or for direct marketing.</>,
          <><strong>Withdraw Consent:</strong> Withdraw consent for marketing emails, optional cookies, or proctored exam monitoring at any time.</>,
        ]} />
        <Callout title="How to exercise your rights">
          Email <a href="mailto:privacy@guardianx.io" className="text-emerald-400 hover:underline">privacy@guardianx.io</a> with your request.
          We respond within 30 days. If you&apos;re unsatisfied with our response, you have the right
          to lodge a complaint with your local data protection authority.
        </Callout>
      </Section>

      <Section id="ccpa" title="8. California Consumer Privacy Act (CCPA)" icon={Scale} accent="violet">
        <p>California residents have additional rights under CCPA:</p>
        <BulletList accent="violet" items={[
          "Right to know what personal information is collected, sold, or disclosed",
          "Right to delete personal information (with exceptions)",
          "Right to opt-out of the &quot;sale&quot; or &quot;sharing&quot; of personal information",
          "Right to non-discrimination for exercising your privacy rights",
        ]} />
        <p className="text-xs text-muted-foreground mt-2">
          <strong>Notice:</strong> GuardianX Academy does <em>not</em> sell your personal
          information to any third party. No opt-out is necessary because no sale occurs.
        </p>
      </Section>

      <Section id="security" title="9. Data Security" icon={Shield} accent="emerald">
        <p>We implement industry-leading technical and organizational safeguards:</p>
        <BulletList items={[
          "All data in transit is encrypted via TLS 1.3 (HTTPS)",
          "Passwords hashed with bcrypt (12 rounds) - never stored in plaintext",
          "Database access restricted to authorized personnel with multi-factor authentication",
          "Lab Docker containers run on isolated networks - no cross-tenant communication",
          "Proctoring data encrypted in transit (TLS) and stored in our managed database with provider-managed encryption at rest",
          "Regular security audits and penetration testing of our platform",
          "Incident response plan with 72-hour breach notification (GDPR-compliant)",
        ]} />
      </Section>

      <Section id="children" title="10. Children&apos;s Privacy" icon={Users} accent="amber">
        <p>
          GuardianX Academy is intended for users aged 16 and older. For in-premises cohorts at K-12
          partner schools, we require parental consent and limit data collection to the minimum
          necessary for course delivery. We do not knowingly collect data from children under 13.
          If you believe we have, please contact us immediately at{" "}
          <a href="mailto:privacy@guardianx.io" className="text-emerald-400 hover:underline">privacy@guardianx.io</a>.
        </p>
      </Section>

      <Section id="changes" title="11. Changes to This Policy" icon={BellRing} accent="cyan">
        <p>
          We may update this policy periodically. Material changes will be notified via email and an
          in-platform banner at least 30 days before taking effect. Continued use of GuardianX
          Academy after the effective date constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section id="contact" title="12. Contact Us" icon={Mail} accent="emerald">
        <p>For privacy questions, data requests, or to file a complaint:</p>
        <Card className="p-4 glass-card mt-2">
          <div className="space-y-1.5 text-sm">
            <div className="font-medium text-foreground">Grievance Officer &amp; Data Protection Officer</div>
            <div><span className="text-muted-foreground">Name:</span> Ayan Ali, Founder (Grievance Officer &amp; Data Protection Officer)</div>
            <div><span className="text-muted-foreground">Email:</span> <a href="mailto:privacy@guardianx.io" className="text-emerald-400 hover:underline">privacy@guardianx.io</a></div>
            <div><span className="text-muted-foreground">Mail:</span> GuardianX Academy - Privacy Office, Attn: Grievance Officer</div>
            <div><span className="text-muted-foreground">Grievance redressal (DPDPA ss. 13-14):</span> we acknowledge grievances within 72 hours and resolve them within 30 days</div>
            <div><span className="text-muted-foreground">Other timelines:</span> within 30 days (GDPR), 45 days (CCPA)</div>
            <div className="text-xs text-muted-foreground pt-1">
              Under India&apos;s Digital Personal Data Protection Act, 2023 you may request access, correction,
              completion, updating or erasure of your personal data, withdraw consent, and nominate another
              individual to exercise your rights. Email the Grievance Officer to exercise any of these; if a
              grievance is not resolved to your satisfaction you may escalate to the Data Protection Board of India.
            </div>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="space-y-10">
      <Callout title="Please read these terms carefully" type="warning">
        By creating an account or using any GuardianX Academy service, you agree to be bound by
        these Terms & Conditions. If you do not agree, you may not use our platform. These terms
        constitute a legally binding contract between you and GuardianX Academy.
      </Callout>

      <Section id="acceptance" title="1. Acceptance of Terms" icon={CheckCircle2} accent="emerald">
        <p>
          These Terms apply to all users of GuardianX Academy, including students, instructors,
          administrators, and visitors. If you are accepting on behalf of an organization (e.g., a
          partner university), you represent that you have authority to bind that organization.
        </p>
      </Section>

      <Section id="accounts" title="2. Account Usage & Registration" icon={KeyRound} accent="cyan">
        <BulletList accent="cyan" items={[
          "You must provide accurate, current, and complete information during registration",
          "You are solely responsible for maintaining the confidentiality of your password",
          "You must be at least 16 years old (or have parental consent for school cohorts)",
          "One account per person - sharing accounts is prohibited and may result in termination",
          "You must notify us immediately of any unauthorized access to your account",
          "We reserve the right to suspend accounts with suspicious or fraudulent activity",
        ]} />
      </Section>

      <Section id="acceptable-use" title="3. Acceptable Use Policy" icon={BadgeCheck} accent="violet">
        <p>You agree to use GuardianX Academy only for lawful purposes. You will NOT:</p>
        <BulletList accent="violet" items={[
          "Use labs, payloads, or techniques learned here to attack systems you don&apos;t own or lack explicit written permission to test",
          "Attempt to gain unauthorized access to GuardianX infrastructure, other users&apos; accounts, or Docker host systems",
          "Share, distribute, or sell lab flags, exam questions, or course materials (these are licensed, not owned)",
          "Use the platform to harass, discriminate, or harm other students, instructors, or staff",
          "Upload malware, exploits, or malicious code outside of designated lab environments",
          "Attempt to bypass proctoring controls during examinations",
          "Reverse engineer, decompile, or scrape our platform without written permission",
          "Misrepresent your identity, credentials, or affiliation with GuardianX Academy",
        ]} />
        <Callout title="Ethical use is non-negotiable" type="warning">
          GuardianX Academy trains cyber security <em>defenders</em>. Any use of skills learned
          here for illegal activity will result in immediate account termination, certificate
          revocation, and cooperation with law enforcement. We take this very seriously.
        </Callout>
      </Section>

      <Section id="ip" title="4. Intellectual Property" icon={FileText} accent="amber">
        <h4 className="text-sm font-semibold text-foreground mb-2">Our Content</h4>
        <BulletList accent="amber" items={[
          "All courses, lessons, PDFs, quizzes, lab challenges, and platform code are owned by GuardianX Academy or our licensors",
          "Content is licensed to you for personal, non-commercial educational use during your active enrollment",
          "You may NOT redistribute, republish, or commercially exploit any course materials",
          "Certificates earned remain your property, but the GuardianX brand and verify ID are licensed",
          "Lab flags are unique per session and are considered trade secrets - sharing them voids your certificate",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Your Content</h4>
        <BulletList accent="amber" items={[
          "Notes, bookmarks, and discussion posts you create remain your intellectual property",
          "You grant GuardianX a non-exclusive license to host and display your content on the platform",
          "You are responsible for ensuring your content does not infringe third-party rights",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Third-Party Materials</h4>
        <BulletList accent="amber" items={[
          "We reference open-source projects like PayloadsAllTheThings - those retain their original licenses",
          "Certification names (CEH, CISSP, CCNA, etc.) are trademarks of their respective owners",
          "GuardianX Academy is an independent training provider and is not affiliated with these certifying bodies unless explicitly stated",
        ]} />
      </Section>

      <Section id="prohibited" title="5. Prohibited Activities" icon={AlertTriangle} accent="red">
        <p>The following activities are strictly prohibited and will result in immediate termination:</p>
        <BulletList accent="red" items={[
          "Cheating on exams - including screen sharing, using AI assistants, or having another person take your exam",
          "Attempting to brute-force, scan, or attack proctoring infrastructure",
          "Extracting or exfiltrating other users&apos; data from lab environments",
          "Using the platform to recruit for, plan, or coordinate illegal cyber attacks",
          "Creating fake accounts to manipulate leaderboards, XP, or achievements",
          "Selling or transferring your account, certificates, or progress to others",
          "Circumventing paywalls or accessing premium content without payment",
        ]} />
      </Section>

      <Section id="labs" title="6. Hands-on Labs - Special Terms" icon={Terminal} accent="violet">
        <p>By using GuardianX labs, you acknowledge and agree:</p>
        <BulletList accent="violet" items={[
          "Lab Docker containers are ephemeral - destroyed at session end (60-minute TTL). Don&apos;t store personal data in them.",
          "Container networks are isolated - you cannot and must not attempt to reach other tenants or the host system",
          "Lab flags are dynamically generated per session - they are non-transferable and non-shareable",
          "Lab infrastructure is provided &quot;as is&quot; - we are not liable for lost work due to container restarts",
          "Misuse of lab environments (e.g., cryptojacking, hosting illegal content) results in permanent ban and legal action",
          "Lab access may be rate-limited to ensure fair resource allocation across all students",
        ]} />
      </Section>

      <Section id="exams" title="7. Proctored Examinations" icon={Crosshair} accent="amber">
        <BulletList accent="amber" items={[
          "Proctored exams require webcam access, fullscreen mode, and stable internet",
          "Tab-switching, copy/paste, opening new windows, or exiting fullscreen auto-voids the exam",
          "Randomized question banks mean no two exams are identical - sharing answers is futile",
          "Recorded proctoring data is reviewed for violations; flagged exams are voided and fees are non-refundable",
          "Appeals for voided exams must be submitted within 7 days via the Contact page",
          "Certifications are only issued after passing the proctored final exam - no exceptions",
        ]} />
      </Section>

      <Section id="payments" title="8. Payments, Billing & Subscriptions" icon={CreditCard} accent="teal">
        <BulletList accent="teal" items={[
          "Course fees, exam fees, and subscription prices are displayed at checkout in your local currency",
          "Payments are processed by our PCI-DSS compliant payment provider - we never see or store your full card number",
          "Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date",
          "Refunds are governed by our Refund Policy - see the dedicated Refund Policy page",
          "We reserve the right to change pricing with 30 days&apos; advance notice to existing subscribers",
        ]} />
      </Section>

      <Section id="liability" title="9. Disclaimer & Limitation of Liability" icon={Shield} accent="cyan">
        <Callout title="Important - please read">
          GuardianX Academy is an educational platform. We do not guarantee certification pass
          rates, job placement, or specific career outcomes. Your success depends on your effort.
        </Callout>
        <BulletList accent="cyan" items={[
          "The platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind",
          "We are not liable for indirect, incidental, or consequential damages arising from platform use",
          "Our total liability for any claim is limited to the amount you paid us in the preceding 12 months",
          "We are not responsible for lost lab work due to infrastructure failures - save your notes externally",
          "You are solely responsible for how you apply skills learned here - we are not liable for your actions",
        ]} />
      </Section>

      <Section id="indemnification" title="10. Indemnification" icon={Scale} accent="violet">
        <p>
          You agree to indemnify and hold harmless GuardianX Academy, its officers, employees, and
          partners from any claims, damages, or expenses (including legal fees) arising from your
          misuse of the platform, violation of these Terms, or infringement of third-party rights.
        </p>
      </Section>

      <Section id="termination" title="11. Termination" icon={AlertTriangle} accent="red">
        <BulletList accent="red" items={[
          "You may delete your account at any time from Profile Settings - this action is irreversible",
          "We may suspend or terminate your account for violations of these Terms, with or without notice",
          "Upon termination, your access to courses, labs, and certificates is immediately revoked",
          "Certificates earned before termination remain valid (subject to the revocation clause below)",
          "We reserve the right to revoke any certificate if post-issuance evidence of cheating or fraud is discovered",
          "Surviving clauses (IP, liability, indemnification) remain in effect after termination",
        ]} />
      </Section>

      <Section id="changes" title="12. Changes to Terms" icon={BellRing} accent="cyan">
        <p>
          We may update these Terms periodically. Material changes will be notified via email and
          in-platform banner at least 30 days before taking effect. Continued use after the
          effective date constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section id="governing-law" title="13. Governing Law & Dispute Resolution" icon={Scale} accent="emerald">
        <BulletList items={[
          "These Terms are governed by the laws of the jurisdiction where GuardianX Academy is registered",
          "Disputes will first be attempted through good-faith negotiation (30 days)",
          "Unresolved disputes will be submitted to binding arbitration (not class action)",
          "You waive any right to a jury trial to the maximum extent permitted by law",
        ]} />
      </Section>

      <Section id="contact-terms" title="14. Contact Us" icon={Mail} accent="emerald">
        <Card className="p-4 glass-card">
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <a href="mailto:legal@guardianx.io" className="text-emerald-400 hover:underline">legal@guardianx.io</a></div>
            <div><span className="text-muted-foreground">Mail:</span> GuardianX Academy - Legal Department</div>
            <div><span className="text-muted-foreground">Response time:</span> Within 7 business days</div>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function FaqContent() {
  const faqGroups = [
    {
      category: "Courses & Enrollment",
      icon: BookOpen,
      accent: "emerald",
      faqs: [
        { q: "What certification courses does GuardianX Academy offer?", a: "We offer 27 industry-recognized certification tracks across 8 categories: Ethical Hacking (CEH, OSCP, eJPT, PNPT), Networking (CCNA, CCNP, Network+, JNCIA), Web Security (WAPT, OSWE, Burp Suite), System Administration (RHCSA, RHCE, LPIC-1), Security Management (CISSP, CISM, CISA, ISO 27001), Identity & Access (CyberArk, SailPoint, Okta), Cloud Security (AWS Security, Azure SC-900, CCSP), and Forensics & Blue Team (GCFA, CySA+, BTL1)." },
        { q: "How long does each course take to complete?", a: "Course duration varies by certification: foundational courses (CCNA, RHCSA, LPIC-1) typically take 25-30 hours, intermediate (CEH, WAPT, Burp Suite) 35-45 hours, and advanced (CISSP, OSCP, CCNP) 60-80 hours. You can learn at your own pace - there's no deadline. Most students complete one certification every 2-3 months." },
        { q: "Do I need prior experience to enroll?", a: "No. We have beginner-friendly tracks (Network+, RHCSA, SC-900, BTL1) that assume zero prior cyber security knowledge. Our courses are structured with prerequisites clearly marked, so you always know what's needed before enrolling. We also offer a free 'Cyber Foundations' intro course for absolute beginners." },
        { q: "Are course materials included in the fee?", a: "Yes. Every enrollment includes lifetime access to video lessons, PDF study materials, downloadable notes, interactive quizzes, hands-on labs, and the proctored final exam. There are no hidden fees or paywalls for course content." },
        { q: "Can I download course materials for offline study?", a: "PDF study guides and your personal notes are downloadable. Video lessons stream online only (to prevent piracy). Lab environments require an active internet connection since they're hosted in Docker containers on our infrastructure." },
      ],
    },
    {
      category: "Hands-on Labs",
      icon: Terminal,
      accent: "violet",
      faqs: [
        { q: "How do the Docker labs work?", a: "Each lab spins up dedicated Docker containers for you: typically a vulnerable target machine and a Kali Linux attack box, connected via an isolated network. You access the Kali box via xterm.js terminal right in your browser - no setup needed. Containers auto-destroy at session end (60-minute TTL) for security and resource fairness." },
        { q: "Do I need a powerful computer to run labs?", a: "No! Labs run on our cloud infrastructure, not your machine. You only need a modern browser and a stable internet connection. Even a Chromebook works perfectly - all heavy lifting (Docker, Kali tools, vulnerable apps) happens on our servers." },
        { q: "How many labs are available?", a: "We currently offer 31 hands-on labs covering SQL injection, XSS, SSRF, command injection, JWT attacks, Log4Shell, IDOR, path traversal, privilege escalation, reverse engineering crackmes, nmap scanning, and more. New labs are added monthly as new vulnerabilities emerge." },
        { q: "What if I get stuck on a lab?", a: "Every lab includes a 'Hints' section with progressive nudges (without spoiling the answer). You can also post in the course-specific discussion forum where peers and instructors help. For deeper help, join a Live Session or reach out via the Community tab." },
        { q: "Are lab flags the same for everyone?", a: "No. Flags are dynamically generated per session - they're cryptographically random and unique to your container instance. This means you can't Google the answer or copy a friend's flag. You must actually exploit the vulnerability to retrieve your unique flag." },
        { q: "Can I keep my lab work after the session ends?", a: "Lab containers are destroyed at TTL (60 minutes) or when you end the session. Save any notes, screenshots, or write-ups externally (we recommend a markdown notes app). The lab challenge itself remains accessible - you can restart it anytime to practice again." },
      ],
    },
    {
      category: "Exams & Certifications",
      icon: Award,
      accent: "amber",
      faqs: [
        { q: "How do proctored exams work?", a: "Proctored exams run in fullscreen lockdown mode. The system monitors for tab-switches, copy/paste attempts, window loses focus, and suspicious browser activity. Questions are randomized from a large bank, so no two exams are identical. Webcam snapshots verify your identity. Any violation auto-voids the exam." },
        { q: "What happens if I fail an exam?", a: "You can retake any proctored exam up to 3 times within 90 days of your first attempt (free of charge for course enrollees). After 3 attempts, a small fee applies for additional retakes. We provide a detailed weakness report after each attempt so you know what to study." },
        { q: "Are GuardianX certificates recognized by employers?", a: "Yes. Our certificates are verifiable via a unique verify ID and include your proctored exam score. We work directly with hiring partners across the industry. Additionally, many of our courses prepare you for industry-standard certifications (CEH, CISSP, CCNA, etc.) which you can then take with the official certifying body." },
        { q: "Can I get a PDF copy of my certificate?", a: "Absolutely. Once you pass a proctored exam, you can download a beautifully designed PDF certificate with your name, certification, score, issue date, and a unique verify ID. You can also share a public verification link on LinkedIn." },
        { q: "How long are certificates valid?", a: "GuardianX certificates don't expire - they represent that you demonstrated mastery at the time of issuance. However, we recommend recertifying every 3 years as the cyber security landscape evolves. Many industry certs (CEH, CISSP) require CPE credits to maintain - we provide ongoing learning content to earn those." },
        { q: "What if my exam was voided unfairly?", a: "You can appeal any voided exam within 7 days via the Contact page. Our proctoring team reviews the violation flags and activity logs. If the violation was a false positive (e.g., a browser crash), we'll reset your exam attempt free of charge." },
      ],
    },
    {
      category: "Live Sessions",
      icon: Radio,
      accent: "red",
      faqs: [
        { q: "What are Live Sessions?", a: "Live Sessions are real-time, instructor-led workshops where the instructor shares their screen and voice with attendees. You can ask questions via chat, and the instructor can hand over presenter control to a student for demonstrations. Powered by WebRTC peer-to-peer - low latency, high quality." },
        { q: "Are Live Sessions recorded?", a: "Yes. All Live Sessions are recorded and made available to enrolled students within 24 hours. You can revisit them anytime. Recordings are gated to enrolled students only - they're not publicly streamable." },
        { q: "Do I need a webcam or microphone to attend?", a: "A microphone is optional - you can use text chat for questions. A webcam is only required if you want to volunteer as a co-presenter (with instructor permission). Most students attend with audio-only or text-chat mode." },
        { q: "What if I miss a Live Session?", a: "No problem. The recording will be available in your course dashboard within 24 hours. We also post a summary and any resources/links mentioned. Live Sessions are supplementary - course completion doesn't require live attendance." },
      ],
    },
    {
      category: "Partnerships & Institutions",
      icon: Building2,
      accent: "cyan",
      faqs: [
        { q: "How can my school/college/university partner with GuardianX?", a: "Visit our Partners page and submit the partnership inquiry form. Our partnerships team will reach out within 5 business days to schedule a discovery call. We offer custom cohort pricing, dedicated instructor assignment, branded certificates, and progress reporting for institutional administrators." },
        { q: "What does an in-premises cohort look like?", a: "We send certified instructors to your campus for the duration of the cohort (typically 4-12 weeks). We provide all lab infrastructure remotely - your campus only needs a computer lab with internet access. We handle enrollment, assessments, and certification. You handle the room and the students." },
        { q: "Do you offer virtual cohorts for institutions?", a: "Yes. For institutions that prefer remote delivery, we offer live virtual cohorts with the same instructor-led model. Students join via our platform; instructors teach remotely. This is popular for distributed student populations and corporate L&D programs." },
        { q: "Can institutions get progress reports for their students?", a: "Absolutely. Partner institutions get an admin dashboard showing aggregated and individual student progress: lessons completed, quiz scores, lab challenges solved, exam results, and certifications earned. We respect student privacy - individual data is only shared with the institution the student is enrolled under." },
        { q: "What's the minimum cohort size for partnership?", a: "We typically require a minimum of 15 students per cohort for in-premises delivery (to justify instructor travel). Virtual cohorts can be smaller - minimum 8 students. For larger cohorts (50+), we offer volume discounts and dedicated scheduling." },
      ],
    },
    {
      category: "Account & Billing",
      icon: CreditCard,
      accent: "teal",
      faqs: [
        { q: "Is there a free trial?", a: "Yes! Sign up for free and get instant access to a starter set of lessons, our 'Cyber Foundations' intro course, and a sample of beginner labs. No credit card required. Upgrade anytime to unlock full courses, all labs, and proctored exams." },
        { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards (Visa, Mastercard, American Express, Discover), UPI (for India-based students), PayPal, and bank transfers for institutional partnerships. Cryptocurrency payments are coming soon." },
        { q: "Can I get a refund if I'm not satisfied?", a: "Yes - see our Refund Policy for full details. Briefly: 14-day no-questions-asked refunds for unused course access, pro-rated refunds within 30 days, and exam fees are non-refundable once you start the exam." },
        { q: "Do you offer scholarships or financial aid?", a: "Yes. We have a needs-based scholarship program covering 50-100% of course fees for underrepresented students. We also offer discounts for veterans, students from developing nations, and group enrollments. Apply via the Contact page." },
        { q: "Can I cancel my subscription anytime?", a: "Yes. Subscriptions can be cancelled anytime from your account settings. You keep access until the end of your current billing period. No cancellation fees. Re-activating later restores your progress and certifications." },
      ],
    },
    {
      category: "Technical & Support",
      icon: Server,
      accent: "violet",
      faqs: [
        { q: "What are the system requirements?", a: "A modern browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+), stable internet (5 Mbps+ recommended for video), and a webcam for proctored exams. No software installation required - everything runs in the browser, including the xterm.js terminal for labs." },
        { q: "Does the platform work on mobile devices?", a: "Yes, the platform is fully responsive - you can watch lessons, read PDFs, take quizzes, and participate in discussions on mobile. Hands-on labs (with terminal) require a desktop or tablet with a keyboard due to terminal interactions. Proctored exams require desktop." },
        { q: "How do I report a bug or technical issue?", a: "Use the Contact page or email support@guardianx.io. Include screenshots, your browser version, and steps to reproduce. Our engineering team responds within 24 hours (often much faster)." },
        { q: "Is my data secure on GuardianX?", a: "Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Passwords are hashed with bcrypt. Lab Docker containers run on isolated networks. We undergo regular security audits. See our Privacy Policy for full details." },
      ],
    },
  ]

  return (
    <div className="space-y-10">
      <Callout title="Can't find your answer?" type="info">
        Our support team is here to help. Visit our{" "}
        <button onClick={() => useAppStore.getState().navigate({ name: "contact" })} className="text-emerald-400 hover:underline">
          Contact page
        </button>{" "}
        or email{" "}
        <a href="mailto:support@guardianx.io" className="text-emerald-400 hover:underline">support@guardianx.io</a>{" "}
 - we respond within 24 hours.
      </Callout>

      {faqGroups.map((group, gi) => {
        const accentColor =
          group.accent === "emerald" ? "text-emerald-400"
          : group.accent === "cyan" ? "text-cyan-400"
          : group.accent === "violet" ? "text-violet-400"
          : group.accent === "amber" ? "text-amber-400"
          : group.accent === "teal" ? "text-teal-400"
          : group.accent === "red" ? "text-red-400"
          : "text-emerald-400"

        return (
          <section key={gi} id={`faq-${gi}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={cn("inline-flex p-2 rounded-lg border border-current/20 bg-current/10", accentColor)}>
                <group.icon className="h-4 w-4" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight neon-text">{group.category}</h2>
            </div>
            <Card className="p-4 md:p-6 glass-card holo-border">
              <Accordion type="single" collapsible className="w-full">
                {group.faqs.map((faq, fi) => (
                  <AccordionItem key={fi} value={`item-${gi}-${fi}`}>
                    <AccordionTrigger className={cn("text-left hover:no-underline", accentColor)}>
                      <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </section>
        )
      })}
    </div>
  )
}

function RefundContent() {
  return (
    <div className="space-y-10">
      <Callout title="Our refund promise" type="info">
        We want you to be confident in your investment. If GuardianX Academy isn&apos;t the right
        fit, we offer clear, fair refunds. This policy applies to all courses, exams, and
        subscriptions purchased on or after January 1, 2025.
      </Callout>

      <Section id="course-refunds" title="1. Course Refunds" icon={BookOpen} accent="emerald">
        <h4 className="text-sm font-semibold text-foreground mb-2">14-Day No-Questions-Asked</h4>
        <BulletList items={[
          "Full refund within 14 days of purchase, provided you have NOT started the proctored final exam",
          "No justification required - just email refunds@guardianx.io with your order ID",
          "Refund processed within 5-7 business days to your original payment method",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">30-Day Pro-Rated</h4>
        <BulletList items={[
          "Between 15-30 days after purchase, you're eligible for a 50% refund if less than 50% of course content is completed",
          "If more than 50% of content is completed, the course is considered &quot;consumed&quot; and is non-refundable",
          "Course completion is measured by lessons marked complete, not by time spent",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">After 30 Days</h4>
        <BulletList items={[
          "No refunds are available 30+ days after purchase, regardless of completion status",
          "However, you retain lifetime access to the course materials you paid for",
          "If you&apos;re dissatisfied, contact us - we may offer course credit toward a different track",
        ]} />
      </Section>

      <Section id="exam-fees" title="2. Proctored Exam Fees" icon={Crosshair} accent="amber">
        <Callout title="Exam fees are non-refundable once the exam starts" type="warning">
          Proctoring infrastructure and question-bank licensing costs are incurred the moment you
          begin an exam. Please ensure you&apos;re ready before clicking &quot;Start Exam.&quot;
        </Callout>
        <BulletList accent="amber" items={[
          "If you cancel a scheduled exam at least 24 hours before: 100% refund or free reschedule",
          "If you cancel less than 24 hours before: 50% refund or reschedule for a 50% fee",
          "If you fail to show up (no-show): No refund, but you may reschedule for a 50% fee",
          "If you start the exam and it auto-voids due to violations (cheating, tab-switching): No refund, no reschedule",
          "If the exam voids due to a technical failure on our side: Full refund or free reschedule (our choice)",
          "Retake fees (after 3 free attempts) are non-refundable once the retake exam starts",
        ]} />
      </Section>

      <Section id="subscriptions" title="3. Subscription Cancellation" icon={CreditCard} accent="cyan">
        <h4 className="text-sm font-semibold text-foreground mb-2">Monthly Subscriptions</h4>
        <BulletList accent="cyan" items={[
          "Cancel anytime from your account settings - no fees, no questions",
          "You retain full access until the end of your current billing period",
          "No pro-rated refund for the unused portion of the current month",
          "Future billing stops immediately upon cancellation",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Annual Subscriptions</h4>
        <BulletList accent="cyan" items={[
          "Cancel anytime - future renewal is stopped",
          "Pro-rated refund available within the first 30 days (full refund minus 1 month&apos;s fee)",
          "After 30 days: Pro-rated refund minus a 15% administrative fee, calculated on remaining months",
          "If you&apos;ve completed any proctored exam during the subscription, the exam fee is deducted from any refund",
        ]} />
      </Section>

      <Section id="institutional" title="4. Institutional & Cohort Refunds" icon={Building2} accent="violet">
        <BulletList accent="violet" items={[
          "Institutional contracts have custom refund terms negotiated during partnership - refer to your contract",
          "Standard cohort policy: 100% refund if cancelled 30+ days before cohort start, 50% within 30 days, 0% after start",
          "Student drop-outs within an active cohort: Refunds handled per the institution&apos;s agreement with GuardianX",
          "Materials already delivered (printed books, custom labs) are deducted from any refund",
        ]} />
      </Section>

      <Section id="process" title="5. How to Request a Refund" icon={Mail} accent="teal">
        <BulletList accent="teal" items={[
          "Email refunds@guardianx.io with your order ID, course/exam name, and reason for refund (optional)",
          "Include &quot;Refund Request&quot; in the subject line for faster processing",
          "Our team responds within 2 business days with approval or follow-up questions",
          "Approved refunds are processed to your original payment method within 5-7 business days",
          "Bank processing times may add 3-5 additional days for the refund to appear on your statement",
        ]} />
      </Section>

      <Section id="exceptions" title="6. Non-Refundable Items" icon={AlertTriangle} accent="red">
        <BulletList accent="red" items={[
          "Exam fees once an exam has been started (see Section 2)",
          "Certificates already issued (the verification infrastructure cost is non-recoverable)",
          "Custom or personalized training engagements (per institutional contract)",
          "Courses purchased more than 30 days ago (unless covered by 14-day policy)",
          "Subscription periods already used (no pro-rated refunds on monthly subscriptions)",
          "Discounted or promotional purchases (final sale, except where required by law)",
        ]} />
      </Section>

      <Section id="chargebacks" title="7. Chargebacks & Disputes" icon={Scale} accent="amber">
        <p>
          We encourage you to contact us first - chargebacks harm both parties and delay resolution.
          If you initiate a chargeback with your bank or card issuer without first contacting
          GuardianX Academy:
        </p>
        <BulletList accent="amber" items={[
          "Your account may be suspended pending dispute resolution",
          "We will submit evidence of service delivery to your bank",
          "If the chargeback is reversed in our favor, your account access resumes",
          "Frivolous or fraudulent chargebacks may result in permanent account termination",
          "We reserve the right to recover chargeback fees from any refund owed to you",
        ]} />
      </Section>

      <Section id="legal-rights" title="8. Your Statutory Rights" icon={Scale} accent="emerald">
        <p>
          Some jurisdictions provide statutory refund rights that cannot be waived - for example,
          the EU&apos;s 14-day cooling-off period for digital content (with explicit consent to
          waive) and US state-level consumer protection laws. Nothing in this policy limits any
          non-waivable statutory rights you may have.
        </p>
      </Section>

      <Section id="contact-refund" title="9. Contact Us" icon={Mail} accent="emerald">
        <Card className="p-4 glass-card">
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <a href="mailto:refunds@guardianx.io" className="text-emerald-400 hover:underline">refunds@guardianx.io</a></div>
            <div><span className="text-muted-foreground">Mail:</span> GuardianX Academy - Refunds Department</div>
            <div><span className="text-muted-foreground">Response time:</span> Within 2 business days</div>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function CookiesContent() {
  const cookieTypes = [
    {
      type: "Strictly Necessary",
      icon: Lock,
      accent: "emerald",
      purpose: "Required for the platform to function. Cannot be disabled.",
      examples: [
        "session_id - keeps you logged in",
        "csrf_token - protects against cross-site request forgery",
        "auth_token - NextAuth.js session token",
        "theme_preference - remembers dark/light mode",
      ],
      duration: "Session / 30 days",
    },
    {
      type: "Preference",
      icon: Sparkles,
      accent: "cyan",
      purpose: "Remember your settings and personalize your experience.",
      examples: [
        "language - interface language preference",
        "sidebar_collapsed - UI layout preference",
        "last_view - remembers your last dashboard tab",
      ],
      duration: "1 year",
    },
    {
      type: "Analytics",
      icon: Brain,
      accent: "violet",
      purpose: "Help us understand how the platform is used so we can improve it. Anonymized.",
      examples: [
        "_ga - Google Analytics anonymous visitor ID",
        "platform_usage - aggregated feature usage metrics",
        "page_views - anonymous page view counts",
      ],
      duration: "2 years",
    },
    {
      type: "Marketing (Opt-in Only)",
      icon: BellRing,
      accent: "amber",
      purpose: "Used only if you opt in. We don't use third-party advertising cookies.",
      examples: [
        "newsletter_subscribed - flags if you've opted into emails",
        "email_preferences - which email categories you want",
      ],
      duration: "Until unsubscribe",
    },
  ]

  return (
    <div className="space-y-10">
      <Callout title="We respect your cookie preferences" type="info">
        GuardianX Academy uses cookies and similar technologies to keep you logged in, remember your
        preferences, and improve our platform. We do NOT use third-party advertising cookies, and we
        do NOT sell your data. This policy explains what we use and how to manage it.
      </Callout>

      <Section id="what-are-cookies" title="1. What Are Cookies?" icon={Cookie} accent="amber">
        <p>
          Cookies are small text files stored on your device when you visit a website. They allow
          the site to remember your actions and preferences over time, making your experience
          smoother and more personalized. GuardianX Academy also uses <strong>local storage</strong>{" "}
          and <strong>session storage</strong> - similar browser-based storage that serves the same
          purpose but with larger capacity.
        </p>
      </Section>

      <Section id="types" title="2. Types of Cookies We Use" icon={Server} accent="violet">
        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {cookieTypes.map((c, i) => {
            const accentColor =
              c.accent === "emerald" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : c.accent === "cyan" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
              : c.accent === "violet" ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
              : c.accent === "amber" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            return (
              <Card key={i} className="p-5 glass-card holo-border">
                <div className={cn("inline-flex p-2 rounded-lg border mb-3", accentColor)}>
                  <c.icon className="h-4 w-4" />
                </div>
                <h4 className="font-bold text-sm mb-1">{c.type}</h4>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{c.purpose}</p>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Examples</div>
                <ul className="space-y-1 mb-3">
                  {c.examples.map((ex, ei) => (
                    <li key={ei} className="text-[11px] text-muted-foreground font-mono">{ex}</li>
                  ))}
                </ul>
                <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
                  <span className="font-mono text-emerald-400/70">DURATION:</span> {c.duration}
                </div>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section id="third-party-cookies" title="3. Third-Party Cookies" icon={Network} accent="teal">
        <p>
          We minimize third-party cookies. The only third-party cookies that may be set are:
        </p>
        <BulletList accent="teal" items={[
          "Google Analytics (_ga, _gid) - anonymized usage analytics. You can opt out via browser Do Not Track or our preference center.",
          "Payment processor cookies - set only during checkout flow, on their domain. We have no access to these.",
          "YouTube embeds (in some lessons) - may set cookies if you click play. Consider using youtube-nocookie.com mode (we do by default).",
        ]} />
        <Callout title="What we DON'T use" type="warning">
          We do NOT use advertising cookies (Google Ads, Facebook Pixel, etc.). We do NOT use
          cross-site tracking for ad targeting. We do NOT sell your cookie-derived data to anyone.
        </Callout>
      </Section>

      <Section id="manage" title="4. How to Manage Cookies" icon={Settings} accent="cyan">
        <h4 className="text-sm font-semibold text-foreground mb-2">In Your Browser</h4>
        <BulletList accent="cyan" items={[
          "Chrome: Settings → Privacy and security → Cookies and other site data",
          "Firefox: Settings → Privacy & Security → Cookies and Site Data",
          "Safari: Preferences → Privacy → Cookies and website data",
          "Edge: Settings → Cookies and site permissions",
          "All browsers support 'Incognito' / 'Private Browsing' mode - cookies are cleared when you close the window",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">On GuardianX Academy</h4>
        <BulletList accent="cyan" items={[
          "Essential cookies cannot be disabled (the platform won't function without them)",
          "Analytics cookies can be disabled via your Profile Settings → Privacy tab",
          "Marketing emails can be unsubscribed via the link in any marketing email",
          "Clearing your browser cookies will sign you out - you'll need to log in again",
        ]} />
      </Section>

      <Section id="do-not-track" title="5. Do Not Track (DNT)" icon={Shield} accent="emerald">
        <p>
          We respect Do Not Track signals. If your browser sends a DNT header, we will not set
          non-essential cookies (analytics, marketing). Essential cookies required for login and
          platform functionality will still be set - you cannot use the platform without them.
        </p>
      </Section>

      <Section id="updates" title="6. Updates to This Policy" icon={BellRing} accent="amber">
        <p>
          As we add new features or comply with new regulations, this policy may change. Material
          changes will be announced via email and in-platform banner at least 30 days before taking
          effect.
        </p>
      </Section>

      <Section id="contact-cookies" title="7. Contact Us" icon={Mail} accent="emerald">
        <Card className="p-4 glass-card">
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <a href="mailto:privacy@guardianx.io" className="text-emerald-400 hover:underline">privacy@guardianx.io</a></div>
            <div><span className="text-muted-foreground">Mail:</span> GuardianX Academy - Privacy Office</div>
            <div><span className="text-muted-foreground">Response time:</span> Within 7 business days</div>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function ConductContent() {
  return (
    <div className="space-y-10">
      <Callout title="Our community standard" type="info">
        GuardianX Academy trains cyber security <strong>defenders</strong>. This Code of Conduct
        establishes the standards of behavior, academic integrity, and ethical use of skills for
        everyone in our community - students, instructors, partners, and staff. By participating,
        you agree to uphold these standards.
      </Callout>

      <Section id="principles" title="1. Our Core Principles" icon={Heart} accent="emerald">
        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {[
            { icon: Shield, title: "Defend, Don't Attack", desc: "Skills learned here are for protection. Using them offensively against systems you don't own or lack permission to test is strictly forbidden." },
            { icon: Users, title: "Respect Everyone", desc: "Discrimination, harassment, or hostility based on race, gender, sexuality, religion, nationality, or ability is not tolerated." },
            { icon: Award, title: "Earn It Honestly", desc: "Certifications are valuable because they're earned. Cheating devalues everyone's achievements and will not be tolerated." },
            { icon: Brain, title: "Stay Curious, Stay Humble", desc: "Cyber security is vast - no one knows it all. Ask questions, share knowledge, and lift others up." },
            { icon: Globe, title: "Be a Force for Good", desc: "Use your skills to make the digital world safer. Report vulnerabilities responsibly. Mentor newcomers." },
            { icon: Lock, title: "Protect Confidentiality", desc: "Don't share lab flags, exam questions, or proprietary materials. Respect the trust placed in our community." },
          ].map((p, i) => (
            <Card key={i} className="p-5 glass-card hover-lift group">
              <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 group-hover:scale-110 transition-transform">
                <p.icon className="h-5 w-5" />
              </div>
              <h4 className="font-bold mb-1.5">{p.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="behavior" title="2. Expected Behavior" icon={UserCheck} accent="cyan">
        <p>As a GuardianX Academy community member, you are expected to:</p>
        <BulletList accent="cyan" items={[
          "Treat instructors, peers, and staff with respect, patience, and kindness",
          "Engage in discussions constructively - share knowledge, ask thoughtful questions",
          "Respect diverse viewpoints and experience levels - we all started as beginners",
          "Use real names and accurate identities in your profile",
          "Give credit when sharing resources, code snippets, or techniques from others",
          "Report violations of this Code when you witness them (anonymously if preferred)",
          "Help new students feel welcome - answer questions in forums even if they seem basic",
          "Keep discussions on-topic and avoid spamming or self-promotion (unless in designated areas)",
        ]} />
      </Section>

      <Section id="unacceptable" title="3. Unacceptable Behavior" icon={AlertTriangle} accent="red">
        <p>The following behaviors are unacceptable and may result in immediate action:</p>
        <BulletList accent="red" items={[
          "Harassment, bullying, intimidation, or threats against any community member",
          "Discriminatory language or behavior based on race, gender, sexuality, religion, nationality, disability, or age",
          "Sexual harassment, including unwanted advances, comments, or imagery",
          "Posting malicious code, malware, or exploits outside designated lab environments",
          "Sharing personally identifiable information of others without consent (doxxing)",
          "Impersonating another person, instructor, or GuardianX staff member",
          "Disrupting live sessions, forums, or any community space",
          "Using the platform to recruit for, plan, or coordinate illegal activities",
        ]} />
      </Section>

      <Section id="academic-integrity" title="4. Academic Integrity" icon={Scroll} accent="violet">
        <p>Academic integrity is the foundation of credible certifications. You are expected to:</p>
        <BulletList accent="violet" items={[
          "Complete quizzes and exams independently, without unauthorized assistance",
          "Not share quiz answers, exam questions, or lab flags with other students",
          "Not use AI assistants (ChatGPT, Copilot, etc.) during proctored exams",
          "Not have another person take an exam on your behalf",
          "Not attempt to bypass, hack, or exploit proctoring controls",
          "Properly cite sources when using external material in your notes or forum posts",
          "Not plagiarize course content or claim others' work as your own",
        ]} />
        <Callout title="Why this matters" type="warning">
          Certificates earned through cheating harm everyone - they devalue the credentials of
          honest students and create risk for employers who trust our certifications. We aggressively
          investigate and void fraudulent certificates.
        </Callout>
      </Section>

      <Section id="anti-cheating" title="5. Anti-Cheating Policy" icon={Crosshair} accent="amber">
        <h4 className="text-sm font-semibold text-foreground mb-2">Proctoring Safeguards</h4>
        <BulletList accent="amber" items={[
          "Fullscreen lockdown - exiting fullscreen auto-voids the exam",
          "Tab-switch detection - switching tabs or windows is logged; 3+ switches auto-voids",
          "Copy/paste blocking - clipboard operations are intercepted during exams",
          "Randomized question banks - no two exams are identical",
          "Webcam identity verification - periodic snapshots compared to your profile photo",
          "Screen activity monitoring - suspicious patterns flagged for review",
          "Time-stamped logs - every action during an exam is recorded for appeals",
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Consequences of Cheating</h4>
        <BulletList accent="amber" items={[
          "First offense: Exam voided, certificate withheld, 30-day suspension, written warning",
          "Second offense: Account terminated, all certificates revoked, banned from re-registration",
          "Material fraud (impersonation, organized cheating rings): Immediate termination + legal action",
          "Post-issuance discovery: Certificates can be revoked at any time if fraud is later detected",
          "Reporting to certifying bodies: If your course prepares for a third-party cert (CEH, CISSP, etc.), we may report violations to that body",
        ]} />
      </Section>

      <Section id="ethical-hacking" title="6. Ethical Hacking Pledge" icon={Shield} accent="emerald">
        <Card className="p-6 glass-card holo-border">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            By training with GuardianX Academy, you pledge:
          </p>
          <div className="space-y-3">
            {[
              "I will only test systems I own or have explicit written permission to test",
              "I will report vulnerabilities I find responsibly to the affected parties",
              "I will not use my skills to harm individuals, organizations, or critical infrastructure",
              "I will respect the privacy of others and not access data without authorization",
              "I will continue learning and stay current with evolving threats and defenses",
              "I will mentor newcomers and contribute positively to the cyber security community",
              "I will uphold the integrity of certifications I earn and not devalue them through cheating",
            ].map((pledge, i) => (
              <div key={i} className="flex items-start gap-3">
                <HandHeart className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{pledge}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section id="reporting" title="7. Reporting Violations" icon={Flag} accent="cyan">
        <p>If you witness a violation of this Code, please report it:</p>
        <BulletList accent="cyan" items={[
          "Email conduct@guardianx.io with details, screenshots, or evidence",
          "Use the 'Report' button on any forum post, lab session, or live session",
          "Reports can be made anonymously - we protect whistleblowers",
          "All reports are reviewed within 48 hours by our Conduct Review Committee",
          "False or malicious reports are themselves a violation and will be investigated",
        ]} />
      </Section>

      <Section id="enforcement" title="8. Enforcement & Due Process" icon={Scale} accent="violet">
        <BulletList accent="violet" items={[
          "Violations are reviewed by a Conduct Review Committee (3+ members, no conflicts of interest)",
          "Accused members are notified and given 7 days to respond with their account of events",
          "Outcomes range from warnings to permanent bans, depending on severity and history",
          "Appeals can be submitted within 14 days of a decision via the Contact page",
          "Appeals are reviewed by a different committee than the original decision-makers",
          "Decisions and appeals are documented and retained for 24 months for transparency",
        ]} />
      </Section>

      <Section id="legal-compliance" title="9. Legal Compliance" icon={ScrollText} accent="red">
        <p>
          GuardianX Academy operates within applicable laws. We will cooperate with law enforcement
          investigations involving:
        </p>
        <BulletList accent="red" items={[
          "Use of platform skills for illegal cyber attacks or unauthorized access",
          "Distribution of malware, exploits, or harmful code outside designated lab contexts",
          "Threats of violence, terrorism, or harm to individuals or infrastructure",
          "Child safety violations or any illegal content",
          "Subpoenas, court orders, or other lawful legal process",
        ]} />
      </Section>

      <Section id="acknowledgment" title="10. Acknowledgment" icon={CheckCircle2} accent="emerald">
        <p>
          By creating an account, enrolling in courses, or using any GuardianX Academy service, you
          acknowledge that you have read, understood, and agree to abide by this Code of Conduct.
          You understand that violations may result in account suspension, termination, certificate
          revocation, and where applicable, legal action.
        </p>
      </Section>

      <Section id="contact-conduct" title="11. Contact Us" icon={Mail} accent="emerald">
        <Card className="p-4 glass-card">
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <a href="mailto:conduct@guardianx.io" className="text-emerald-400 hover:underline">conduct@guardianx.io</a></div>
            <div><span className="text-muted-foreground">Mail:</span> GuardianX Academy - Conduct Review Committee</div>
            <div><span className="text-muted-foreground">Response time:</span> Within 48 hours</div>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function LegalPageContent({ pageType }: { pageType: LegalPageType }) {
  switch (pageType) {
    case "about": return <AboutContent />
    case "privacy": return <PrivacyContent />
    case "terms": return <TermsContent />
    case "faq": return <FaqContent />
    case "refund": return <RefundContent />
    case "cookies": return <CookiesContent />
    case "conduct": return <ConductContent />
    default: return <PrivacyContent />
  }
}

export function LegalPage({ pageType }: LegalPageProps) {
  const { navigate } = useAppStore()
  const meta = PAGE_META[pageType]
  const Icon = meta.icon

  const accentColor =
    meta.accent === "emerald" ? "text-emerald-400"
    : meta.accent === "cyan" ? "text-cyan-400"
    : meta.accent === "violet" ? "text-violet-400"
    : meta.accent === "amber" ? "text-amber-400"
    : meta.accent === "teal" ? "text-teal-400"
    : meta.accent === "red" ? "text-red-400"
    : "text-emerald-400"

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-10">
      <LegalSidebar active={pageType} />

      <div className="min-w-0 space-y-10">
        {/* === HERO HEADER === */}
        <Card className="p-6 md:p-10 glass-card holo-border holo-shimmer glass-reflection relative overflow-hidden">
          <div className="particle-network opacity-20" />
          <div className={cn("orb blob w-72 h-72 -top-24 -right-24", meta.accent === "emerald" ? "bg-emerald-500" : meta.accent === "cyan" ? "bg-cyan-500" : meta.accent === "violet" ? "bg-violet-500" : meta.accent === "amber" ? "bg-amber-500" : meta.accent === "teal" ? "bg-teal-500" : meta.accent === "red" ? "bg-red-500" : "bg-emerald-500")} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("inline-flex p-3 rounded-xl border bg-current/10", accentColor)}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-xs">
                <div className="font-mono uppercase tracking-[0.18em] text-emerald-400/80">
                  GuardianX Academy · Legal Center
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 text-holo">
              {meta.title}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-3xl leading-relaxed">
              {meta.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Last updated: <span className="text-foreground font-medium">{meta.lastUpdated}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Effective immediately upon publication</span>
              </div>
            </div>
          </div>
        </Card>

        {/* === MAIN CONTENT === */}
        <ProseCard>
          <div className="space-y-12">
            <LegalPageContent pageType={pageType} />
          </div>
        </ProseCard>

        {/* === FOOTER NAV === */}
        <Card className="p-6 glass-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold mb-1">Questions about this policy?</div>
              <p className="text-xs text-muted-foreground">Our team is here to help - reach out anytime.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="glass-card border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => navigate({ name: "contact" })}>
                <Mail className="h-3.5 w-3.5 mr-1.5" /> Contact Us
              </Button>
              <Button size="sm" className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400" onClick={() => navigate({ name: "auth" })}>
                <Rocket className="h-3.5 w-3.5 mr-1.5" /> Get Started
              </Button>
            </div>
          </div>
        </Card>

        {/* === QUICK LINKS === */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LEGAL_NAV.filter(n => n.type !== pageType).slice(0, 6).map((item) => (
            <button
              key={item.type}
              onClick={() => navigate(item.view as View)}
              className="text-left p-4 rounded-xl border border-border bg-background/40 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
