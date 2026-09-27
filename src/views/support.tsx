"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Search, HelpCircle, FileText, Shield, Mail,
  ChevronDown, CheckCircle2, AlertCircle, Lock, FileCheck,
  Users, BookOpen, Award, FlaskConical, Calendar,
} from "lucide-react"

type SupportTab = "faq" | "help" | "terms" | "privacy"

export function SupportView({ initialTab }: { initialTab?: SupportTab }) {
  const { navigate } = useAppStore()
  const [tab, setTab] = React.useState<SupportTab>(initialTab || "faq")
  const [search, setSearch] = React.useState("")

  const tabs = [
    { id: "faq" as const, label: "FAQ", icon: HelpCircle },
    { id: "help" as const, label: "Help Center", icon: BookOpen },
    { id: "terms" as const, label: "Terms of Service", icon: FileText },
    { id: "privacy" as const, label: "Privacy Policy", icon: Shield },
  ]

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      {/* Hero */}
      <section className="relative py-6 lg:py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-300 bg-violet-500/5">
              <HelpCircle className="h-3 w-3 mr-1.5" /> SUPPORT CENTER
            </Badge>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-3 text-balance">
              How can we <span className="text-gradient-premium">help you?</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Find answers, read our policies, or reach out to the GuardianX team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-2">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 flex-wrap justify-center mb-6">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                  tab === t.id
                    ? "bg-violet-500/10 text-violet-300 border-violet-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Search (only for FAQ and Help) */}
          {(tab === "faq" || tab === "help") && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${tab === "faq" ? "FAQs" : "help articles"}...`}
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Content */}
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {tab === "faq" && <FaqContent search={search} />}
            {tab === "help" && <HelpContent search={search} />}
            {tab === "terms" && <TermsContent />}
            {tab === "privacy" && <PrivacyContent />}
          </motion.div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-8 border-t border-border/40 text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-lg font-bold mb-2">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4">Our team is here to help you with any questions.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium">
              <Mail className="h-4 w-4 mr-2" /> Contact Us
            </Button>
            <a href="mailto:academy@guardianx.in">
              <Button variant="outline">academy@guardianx.in</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ============================================================
   FAQ CONTENT
   ============================================================ */
function FaqContent({ search }: { search: string }) {
  const faqs = [
    { q: "What is GuardianX Academy?", a: "GuardianX Academy is an instructor-led cybersecurity training platform offering live certification batches, hands-on labs, proctored examinations, and verifiable credentials for individuals and institutions." },
    { q: "How do I enroll in a batch?", a: "Browse available batches on the Batches page, select one that fits your schedule, and click Enroll. You will receive a confirmation email with batch details and session links." },
    { q: "What certifications does GuardianX prepare me for?", a: "We offer preparation for CEH, Security+, CCNA, CISSP, WAPT, RHCSA, and many more. Each course page lists the specific certification it prepares you for." },
    { q: "Are the labs real or simulated?", a: "Our labs run on real Docker-powered environments with live vulnerable systems. Each lab spins up an isolated container for you to practice on." },
    { q: "What is a GuardianX Certification?", a: "GuardianX certifications are credentials issued by GuardianX upon successful completion of our training and proctored assessment. They are distinct from official external certifications like CEH or CISSP." },
    { q: "How do I verify a GuardianX credential?", a: "Visit the Credentials page, enter the credential ID (e.g. GX-CERT-2025-XXXX), and click Verify. The system will show the candidate name, certification, score, and status." },
    { q: "Do you offer flexible schedules for working professionals?", a: "Yes. We offer weekday, weekend, morning, afternoon, evening, and late night batches. Choose a schedule that fits your work and personal commitments." },
    { q: "Can institutions partner with GuardianX?", a: "Yes. We work with schools, colleges, universities, and corporate partners. Visit the Institutions page to explore partnership models and request a program." },
    { q: "What is the School Management System (SMS)?", a: "The SMS is a complimentary platform for MoU school partners. It includes student management, attendance tracking, grade book, timetable, fee management, exam management, and a guardian portal." },
    { q: "How do proctored exams work?", a: "Proctored exams require identity verification, camera monitoring, screen sharing, and fullscreen mode. The system detects tab switches and flags suspicious activity. All exam actions are logged in an audit trail." },
    { q: "Can I get a refund?", a: "Refund policy: 50% refund if cancelled 7+ days before batch start date. No refund within 7 days of start date. See Terms of Service for full details." },
    { q: "How do I access study materials?", a: "Study materials are available in your learner dashboard once you enroll in a batch. Materials include PDFs, presentations, notes, cheat sheets, lab guides, and practice questions." },
  ]

  const filtered = faqs.filter(f =>
    !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {filtered.map((faq, i) => (
        <FaqItem key={i} q={faq.q} a={faq.a} />
      ))}
      {filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">No FAQs found for &quot;{search}&quot;</Card>
      )}
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-medium pr-4">{q}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</div>
      )}
    </Card>
  )
}

/* ============================================================
   HELP CENTER CONTENT
   ============================================================ */
function HelpContent({ search }: { search: string }) {
  const articles = [
    { title: "Getting Started with GuardianX", category: "Basics", desc: "Learn how to create an account, browse courses, and enroll in your first batch.", icon: BookOpen },
    { title: "Joining Your First Live Session", category: "Live Training", desc: "How to join live lectures, check your schedule, and access session recordings.", icon: Calendar },
    { title: "Using the Cyber Range", category: "Labs", desc: "Launch your first lab, connect to the target, and submit flags for XP.", icon: FlaskConical },
    { title: "Taking a Proctored Exam", category: "Exams", desc: "Prepare for your exam, complete the environment check, and understand proctoring rules.", icon: Lock },
    { title: "Earning GuardianX Certifications", category: "Credentials", desc: "How to become eligible, take the exam, and receive your verifiable credential.", icon: Award },
    { title: "Tracking Your Progress", category: "Dashboard", desc: "Understand XP, levels, ranks, streaks, and how to track your certification readiness.", icon: CheckCircle2 },
    { title: "Participating in CTFs", category: "Competition", desc: "Join capture-the-flag competitions, form teams, and submit flags.", icon: Award },
    { title: "Accessing Study Materials", category: "Resources", desc: "Find PDFs, notes, cheat sheets, and practice questions in your dashboard.", icon: FileText },
  ]

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {filtered.map((a, i) => (
        <Card key={i} className="p-4 hover:border-violet-500/30 transition-colors cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="inline-flex p-2 rounded-lg bg-violet-500/10">
              <a.icon className="h-4 w-4 text-violet-300" />
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="text-[9px] mb-1">{a.category}</Badge>
              <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
            </div>
          </div>
        </Card>
      ))}
      {filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm sm:col-span-2">No help articles found for &quot;{search}&quot;</Card>
      )}
    </div>
  )
}

/* ============================================================
   TERMS OF SERVICE
   ============================================================ */
function TermsContent() {
  const sections = [
    { title: "1. Acceptance of Terms", body: "By accessing and using GuardianX Academy (academy.guardianx.cloud), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use our services." },
    { title: "2. Description of Service", body: "GuardianX Academy provides instructor-led cybersecurity training, hands-on labs, certification preparation, proctored examinations, and institutional training programs. Services include live sessions, study materials, practice labs, and verifiable credentials." },
    { title: "3. User Accounts", body: "You must provide accurate information when creating an account. You are responsible for maintaining the security of your account and password. GuardianX is not liable for any unauthorized access to your account." },
    { title: "4. Acceptable Use", body: "You agree not to: (a) use the platform for illegal activities, (b) attempt to bypass security measures, (c) share exam answers or question banks, (d) misuse the cyber range for attacks outside authorized lab environments, (e) harass other users, or (f) impersonate another person." },
    { title: "5. Certification Integrity", body: "GuardianX certifications are earned through proctored examinations. Any form of cheating, including using unauthorized materials, having another person take the exam, or sharing exam content, will result in immediate disqualification and revocation of credentials." },
    { title: "6. Intellectual Property", body: "All course content, lab materials, study resources, videos, and software are the intellectual property of GuardianX Academy. You may not reproduce, distribute, or share content without written permission." },
    { title: "7. Refund Policy", body: "50% refund if cancelled 7 or more days before the batch start date. No refund within 7 days of the start date. Institution partnerships are governed by separate MoU terms. Contact academy@guardianx.in for refund requests." },
    { title: "8. Cyber Range Usage", body: "Lab environments are isolated and authorized for educational use only. You must not attempt to access systems outside the lab environment, pivot to external networks, or use lab access for any purpose other than learning." },
    { title: "9. Privacy", body: "Your use of the platform is also governed by our Privacy Policy. We collect only necessary data and do not sell your information to third parties." },
    { title: "10. Limitation of Liability", body: "GuardianX Academy is not liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you for the specific service in question." },
    { title: "11. Changes to Terms", body: "We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the new Terms." },
    { title: "12. Contact", body: "For questions about these Terms, contact us at academy@guardianx.in or academy@guardianx.cloud." },
  ]

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold mb-4">Terms of Service</h2>
      <p className="text-xs text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i}>
            <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ============================================================
   PRIVACY POLICY
   ============================================================ */
function PrivacyContent() {
  const sections = [
    { title: "1. Information We Collect", body: "We collect: (a) Account information: name, email, phone, role. (b) Learning data: course progress, lab submissions, exam scores, XP, activity logs. (c) Proctoring data: camera feeds (during exams only), screen sharing, tab switch events. (d) Contact form submissions: name, email, message." },
    { title: "2. How We Use Your Information", body: "We use your information to: (a) Provide training services and track progress. (b) Issue verifiable credentials. (c) Communicate about batches, sessions, and updates. (d) Maintain exam integrity through proctoring. (e) Improve our platform and services." },
    { title: "3. Data Storage and Security", body: "Your data is stored in secure PostgreSQL databases (Neon) with encryption in transit (TLS) and at rest. Passwords are hashed using bcrypt. Access is role-restricted and logged. We do not store payment card details." },
    { title: "4. Proctoring Data", body: "During proctored examinations, we collect camera feeds, screen shares, and activity logs to maintain exam integrity. This data is: (a) Only collected during active exam sessions. (b) Stored securely with restricted access. (c) Retained for 90 days for audit purposes, then deleted. (d) Never used for any purpose other than exam integrity." },
    { title: "5. Data Sharing", body: "We do not sell your data. We share data only with: (a) Your institution (if enrolled through an institutional program). (b) Certification verification requests (public credential ID, name, certification, score, status only). (c) Service providers (database hosting, email delivery) under strict data processing agreements." },
    { title: "6. Your Rights", body: "You have the right to: (a) Access your personal data. (b) Request correction of inaccurate data. (c) Request deletion of your account and associated data. (d) Export your learning data. Contact academy@guardianx.in to exercise these rights." },
    { title: "7. Cookies", body: "We use essential cookies for authentication and session management. We do not use tracking cookies or third-party advertising cookies. See our cookie policy in the browser settings." },
    { title: "8. Children's Privacy", body: "For school programs (K-12), we collect data with parental/guardian consent through the institution. Student data is accessible to parents through the Parent Portal." },
    { title: "9. Data Retention", body: "We retain learning data for as long as your account is active. Proctoring data is retained for 90 days. Credential records are retained permanently for verification purposes. Account data can be deleted on request." },
    { title: "10. Changes to This Policy", body: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform announcement." },
    { title: "11. Contact", body: "For privacy questions or data requests, contact us at academy@guardianx.in or academy@guardianx.cloud." },
  ]

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold mb-4">Privacy Policy</h2>
      <p className="text-xs text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i}>
            <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
