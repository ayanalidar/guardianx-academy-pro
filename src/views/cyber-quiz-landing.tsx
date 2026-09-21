"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import {
  ShieldCheck, Award, Clock, Users, Sparkles,
  ArrowRight, ArrowLeft, CheckCircle2,
  Trophy, FileBadge, Share2, Download,
  GraduationCap, Target, Zap, Brain,
} from "lucide-react"

const DIFFICULTIES = [
  {
    id: "Easy",
    title: "Easy",
    subtitle: "Foundational",
    desc: "Everyday cyber awareness. Perfect for students, parents, and non-technical professionals. All questions are beginner-level.",
    icon: ShieldCheck,
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    bar: "bg-emerald-500",
    glow: "shadow-[0_0_30px_-8px] shadow-emerald-500/30",
  },
  {
    id: "Hard",
    title: "Hard",
    subtitle: "Intermediate",
    desc: "Mixed easy + intermediate questions. Good if you've done some security training or work in IT/tech-adjacent roles.",
    icon: Target,
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    bar: "bg-violet-500",
    glow: "shadow-[0_0_30px_-8px] shadow-violet-500/30",
  },
  {
    id: "Advanced",
    title: "Advanced",
    subtitle: "Expert",
    desc: "Hard + advanced questions only. For security enthusiasts, CTF players, and IT professionals wanting a real challenge.",
    icon: Brain,
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    bar: "bg-amber-500",
    glow: "shadow-[0_0_30px_-8px] shadow-amber-500/30",
  },
]

const WHAT_YOU_GET = [
  {
    icon: Award,
    title: "Verifiable Certificate",
    desc: "A stunning, branded certificate with a unique credential ID. Shareable to LinkedIn + WhatsApp. Downloadable as PDF.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: FileBadge,
    title: "Progress Report",
    desc: "A visually-rich report card showing your strength across 8 cyber domains - like the ones colleges issue, but digital.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Clock,
    title: "30-Minute Quiz",
    desc: "30 random questions, 30 minutes. No proctoring, no webcam. Take it from your phone, laptop, or tablet.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Trophy,
    title: "Instant Results",
    desc: "Score + per-domain breakdown immediately on submission. Pass at 50% to unlock the certificate.",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
]

const STATS = [
  { value: "30", label: "Questions per attempt" },
  { value: "8", label: "Cyber domains covered" },
  { value: "50%", label: "Pass mark" },
  { value: "₹199", label: "Certificate fee" },
]

const DOMAINS = [
  "Phishing", "Passwords", "Social Engineering", "Web Safety",
  "Mobile Security", "Data Privacy", "Malware", "Wi-Fi Safety",
]

const FAQS = [
  {
    q: "Who is this quiz for?",
    a: "Everyone - students, working professionals, parents, small business owners. If you use the internet, this quiz helps you understand your current cyber awareness level. No technical background required for Easy mode.",
  },
  {
    q: "Is the quiz free?",
    a: "Yes, taking the quiz is 100% free. You can attempt it as many times as you want. The ₹199 fee is only for the verifiable certificate + progress report, and only charged after you pass.",
  },
  {
    q: "What score do I need to pass?",
    a: "You need 50% (15 out of 30 correct) to pass. If you don't pass, you can retake the quiz - different questions each time since they're drawn randomly from a 100-question pool.",
  },
  {
    q: "How long do I have?",
    a: "30 minutes for 30 questions - roughly 1 minute per question. A timer is visible during the quiz. If time runs out, your submitted answers are scored as-is.",
  },
  {
    q: "Can I retake the quiz?",
    a: "Yes - unlimited free retakes. Each attempt gets 30 random questions from the pool, so you'll see different questions on a retake. You only pay the ₹199 certificate fee once you pass.",
  },
  {
    q: "What does the certificate look like?",
    a: "A stunning, professionally-designed certificate with the GuardianX logo, your name, the difficulty level you passed (Easy/Hard/Advanced), your score, issue date, and a unique credential ID. It's shareable to LinkedIn with one click + downloadable as a PDF.",
  },
  {
    q: "What's the progress report?",
    a: "A visual report card showing your score in each of the 8 cyber domains (Phishing, Passwords, Social Engineering, Web Safety, Mobile Security, Data Privacy, Malware, Wi-Fi Safety). It includes a radar chart + per-domain commentary - so you know exactly where you're strong and where to improve.",
  },
  {
    q: "Is the certificate verifiable by employers?",
    a: "Yes. Every certificate has a unique credential ID (e.g. GX-QUIZ-2026-A1B2) + a verification URL. Anyone can verify it at guardianx.cloud/verify - no login needed.",
  },
  {
    q: "How do I pay the ₹199 fee?",
    a: "After you pass, you'll see a Pay ₹199 button. We use Razorpay - supports UPI, cards, net banking, and wallets. The certificate + progress report generate automatically within seconds of payment.",
  },
  {
    q: "Does the certificate expire?",
    a: "No - the Cyber Security Foundation certificate has lifetime validity. Once issued, it's yours forever.",
  },
]

export function CyberQuizLandingView() {
  const { navigate } = useAppStore()
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string | null>(null)

  const startQuiz = (difficulty: string) => {
    // The landing page is served from the static route /cyber-quiz which
    // doesn't participate in the SPA hash-routing ViewRouter. So we do a
    // full navigation to the root with the runner hash - the root page
    // (src/app/page.tsx) picks up the hash via hydrateFromHash() and
    // renders the CyberQuizRunnerView.
    window.location.href = `/#/cyber-quiz/start/${difficulty}`
  }

  return (
    <main className="relative">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute top-40 left-0 w-[500px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" aria-hidden />

      {/* ====================================================
          HERO
          ==================================================== */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-violet-600/8 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-cyan-500/6 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-16"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em]">PUBLIC QUIZ · ₹199 CERTIFICATE</span>
          </div>
          <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            Test your{" "}
            <span className="text-gradient-premium">cyber awareness</span>.
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-5">
            30 questions. 30 minutes. 8 cyber domains. Get a verifiable Cyber Security Foundation
            certificate + a stunning progress report - shareable to LinkedIn + WhatsApp.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => document.getElementById("difficulty-select")?.scrollIntoView({ behavior: "smooth" })}
              className="group h-12 px-6 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_8px_24px_-8px] shadow-violet-500/40"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start the quiz
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ name: "verify" })}
              className="h-12 px-6 border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/10"
            >
              <FileBadge className="h-4 w-4 mr-2" />
              Verify a certificate
            </Button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-3xl">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ====================================================
          WHAT YOU GET
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">WHAT YOU GET</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Certificate + <span className="text-gradient-premium">progress report</span>.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Pass the quiz, pay ₹199, and instantly receive both a verifiable certificate + a detailed progress report - like a college report card, but for cyber awareness.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WHAT_YOU_GET.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="group rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-violet-500/30 p-4 transition-all">
                  <div className={cn("inline-flex p-2.5 rounded-lg mb-3 transition-transform group-hover:scale-110", item.bg)}>
                    <Icon className={cn("h-5 w-5", item.color)} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          DIFFICULTY SELECT
          ==================================================== */}
      <section id="difficulty-select" className="py-8 lg:py-12 border-t border-border/40 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">CHOOSE YOUR LEVEL</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Pick your <span className="text-gradient-premium">difficulty</span>.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            The difficulty you pick is shown on your certificate. Higher difficulty = more bragging rights.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIFFICULTIES.map((d) => {
              const Icon = d.icon
              const isSelected = selectedDifficulty === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDifficulty(d.id)}
                  className={cn(
                    "group relative text-left rounded-xl border p-5 transition-all overflow-hidden",
                    isSelected
                      ? cn("border-transparent bg-card shadow-lg", d.glow)
                      : "border-border/60 bg-card/60 hover:bg-card hover:border-violet-500/30"
                  )}
                >
                  {isSelected && <div className={cn("absolute top-0 left-0 right-0 h-0.5", d.bar)} />}
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("inline-flex p-2.5 rounded-lg transition-transform group-hover:scale-110", d.bg)}>
                      <Icon className={cn("h-6 w-6", d.color)} />
                    </div>
                    <span className={cn("text-[10px] font-mono tabular-nums uppercase tracking-wider", d.color)}>
                      {d.subtitle}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{d.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{d.desc}</p>
                  <div className="flex items-center gap-1 text-[10px] font-mono tracking-wider">
                    <span className={cn(isSelected ? d.color : "text-muted-foreground")}>
                      {isSelected ? "SELECTED" : "SELECT"}
                    </span>
                    <ArrowRight className={cn("h-3 w-3 transition-transform", isSelected ? d.color : "text-muted-foreground", "group-hover:translate-x-0.5")} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Start button */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              size="lg"
              disabled={!selectedDifficulty}
              onClick={() => selectedDifficulty && startQuiz(selectedDifficulty)}
              className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_8px_24px_-8px] shadow-violet-500/40 disabled:opacity-50"
            >
              <Zap className="h-4 w-4 mr-2" />
              {selectedDifficulty ? `Start ${selectedDifficulty} quiz` : "Select a difficulty first"}
              {selectedDifficulty && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              30 questions · 30 minutes · pass at 50% to unlock the certificate
            </p>
          </div>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          DOMAINS COVERED
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">8 DOMAINS</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
            Every angle of <span className="text-gradient-premium">cyber awareness</span>.
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DOMAINS.map((d, i) => (
              <motion.div
                key={d}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="rounded-lg border border-border/60 bg-card/40 p-3 text-center"
              >
                <div className="text-sm font-semibold">{d}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          FAQ
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">FREQUENTLY ASKED</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
            Questions, <span className="text-gradient-premium">answered</span>.
          </h2>
          <div className="max-w-3xl">
            <Accordion type="single" collapsible className="space-y-2">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-lg border border-border/60 bg-card/40 px-4 data-[state=open]:bg-card/60 transition-colors"
                >
                  <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          FINAL CTA
          ==================================================== */}
      <section className="py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Ready to test yourself?</h3>
            <p className="text-sm text-muted-foreground">It's free to take. You only pay if you pass + want the certificate.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => document.getElementById("difficulty-select")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Start the quiz <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="ghost" onClick={() => navigate({ name: "catalog" })}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to courses
            </Button>
          </div>
        </div>
        </div>
      </section>
    </main>
  )
}
