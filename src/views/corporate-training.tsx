"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ShieldAlert, Code2, Scale, Crown,
  BookOpen, MapPin, Users, FlaskConical,
  BarChart3, Award,
  ArrowRight, ArrowLeft, Mail,
  Send, Loader2, CheckCircle, AlertCircle,
  Building2, Phone, Sparkles, Clock,
  CheckCircle2, XCircle, PhoneCall, Trash2, TrendingUp,
} from "lucide-react"

// ============================================================
// Static content
// ============================================================
const WHO_ITS_FOR = [
  {
    icon: ShieldAlert,
    title: "SOC teams",
    desc: "Detection engineering, threat hunting, incident response, SIEM mastery. Up-level your blue team.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Code2,
    title: "IT & Engineering",
    desc: "Secure coding, cloud security, DevSecOps, threat modeling. Embed security into your SDLC.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: Scale,
    title: "GRC & Compliance",
    desc: "ISO 27001, SOC 2, PCI-DSS, GDPR. Audit-ready awareness + control implementation.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Crown,
    title: "Leadership",
    desc: "Executive briefings, cyber risk for C-suite + board, decision frameworks, incident tabletops.",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
]

const INCLUDED = [
  {
    icon: BookOpen,
    title: "Custom curriculum",
    desc: "Tailored to your tech stack, threat model, and existing skill gaps. Not off-the-shelf slides.",
  },
  {
    icon: MapPin,
    title: "Flexible delivery",
    desc: "On-site at your office, virtual, or hybrid. We come to you anywhere in India + APAC.",
  },
  {
    icon: Users,
    title: "Dedicated batches",
    desc: "Private cohorts for your team only. No mixing with public batches. Your schedule.",
  },
  {
    icon: FlaskConical,
    title: "Hands-on labs",
    desc: "Access to the GuardianX cyber range + CTF arena. Real targets, real exploitation, real learning.",
  },
  {
    icon: BarChart3,
    title: "Assessments + reporting",
    desc: "Pre/post tests, per-learner progress dashboards for L&D, skill-gap reports, completion certificates.",
  },
  {
    icon: Award,
    title: "Certification",
    desc: "GuardianX credentials + industry cert prep (CEH, CISSP, CCNA, OSCP) bundled in.",
  },
]

const PRICING = [
  {
    tier: "Per-seat",
    bestFor: "Small teams (5-20)",
    features: [
      "Choose from public batch schedule",
      "Dedicated cohort for your team",
      "Standard curriculum",
      "Completion certificates",
      "Group discount (10-15%)",
    ],
    cta: "Request a quote",
    highlighted: false,
  },
  {
    tier: "Per-cohort",
    bestFor: "Mid teams (20-100)",
    features: [
      "Custom curriculum (1-2 modules)",
      "On-site OR virtual delivery",
      "Pre/post assessments",
      "L&D progress dashboard",
      "Dedicated instructor",
      "Group discount (15-25%)",
    ],
    cta: "Request a proposal",
    highlighted: true,
  },
  {
    tier: "Enterprise",
    bestFor: "100+ or annual programs",
    features: [
      "Fully custom curriculum",
      "On-site + virtual + hybrid",
      "Multi-cohort annual contract",
      "Custom reporting + exec dashboards",
      "Dedicated account manager",
      "Skill roadmap + multi-year planning",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
]

const FAQS = [
  {
    q: "Can you customize the curriculum for our tech stack?",
    a: "Yes. Every cohort starts with a scoping call where we map your stack (cloud provider, languages, frameworks, existing security tooling) and threat model. We then build a curriculum around your real environment — not generic examples. Custom modules typically take 1-2 weeks to prepare.",
  },
  {
    q: "Do you offer on-site training outside Kashmir and Noida?",
    a: "Yes. We deliver on-site anywhere in India (travel + accommodation billed at cost) and across APAC (Singapore, Dubai, Jakarta, etc.). For teams outside these regions, we run virtual or hybrid cohorts via Zoom + our cyber range.",
  },
  {
    q: "Do you provide completion certificates?",
    a: "Yes. Every learner who completes a cohort receives a verifiable GuardianX certificate (digital via DigiLocker + printable PDF). For industry certifications (CEH, CISSP, etc.), we provide prep + exam voucher coordination as an add-on.",
  },
  {
    q: "Can we get a sample curriculum before signing?",
    a: "Yes. After the scoping call, we share a sample 4-week curriculum outline + module-level learning objectives, so your L&D team can review before signing. We can also run a 60-minute live demo session for your team at no cost.",
  },
  {
    q: "What's the minimum batch size?",
    a: "Minimum is 5 learners per cohort. Below that, we recommend enrolling your team in our public batches instead (per-seat pricing applies). There's no maximum — we've run cohorts of 200+ with multiple instructors.",
  },
  {
    q: "Do you offer ongoing training contracts (annual)?",
    a: "Yes. Our Enterprise tier is built for this — annual contracts with quarterly cohorts, onboarding for new hires, skill-roadmap planning, and exec dashboards. Reach out via the form and we'll scope a multi-year program.",
  },
  {
    q: "Can you run incident response tabletop exercises for our exec team?",
    a: "Yes. We run custom 2-4 hour tabletop sessions for leadership teams covering breach scenarios, decision-making under pressure, and post-incident review. These are typically booked as part of an enterprise engagement or as a standalone exec briefing.",
  },
  {
    q: "What happens after we submit the inquiry form?",
    a: "Our team contacts you within 1 business day to schedule a 30-minute scoping call. On that call we discuss your team size, training goals, timeline, and stack. Within 3 business days after, you receive a tailored proposal with curriculum, pricing, and logistics.",
  },
]

const TEAM_SIZES = ["1-10", "11-50", "51-200", "200+"]
const TIMELINES = [
  { value: "immediate", label: "Immediate (within 2 weeks)" },
  { value: "1-3 months", label: "1-3 months" },
  { value: "exploring", label: "Just exploring" },
]
const TRAINING_INTERESTS = [
  { value: "SOC", label: "SOC (detection, response, hunting)" },
  { value: "IT", label: "IT & Engineering (secure coding, cloud, DevSecOps)" },
  { value: "GRC", label: "GRC & Compliance (ISO 27001, SOC 2, PCI, GDPR)" },
  { value: "Leadership", label: "Leadership / Executive briefings" },
  { value: "Custom", label: "Custom mix" },
  { value: "NotSure", label: "Not sure — help us scope" },
]

// ============================================================
// Main view
// ============================================================
export function CorporateTrainingView() {
  const { navigate } = useAppStore()
  const [selectedTier, setSelectedTier] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLDivElement>(null)

  const openForm = (tier?: string) => {
    setSelectedTier(tier ?? null)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 50)
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
            <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em]">CORPORATE TRAINING</span>
          </div>
          <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            Upskill your{" "}
            <span className="text-gradient-premium">entire security team</span>.
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-5">
            Customized cyber security training for SOC, IT, GRC, and leadership teams.
            On-site, virtual, or hybrid. Group discounts + detailed reporting for L&D.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => openForm("Per-cohort")}
              className="group h-12 px-6 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_8px_24px_-8px] shadow-violet-500/40"
            >
              <Send className="h-4 w-4 mr-2" />
              Request a proposal
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ name: "contact" })}
              className="h-12 px-6 border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/10"
            >
              <Phone className="h-4 w-4 mr-2" />
              Talk to our team
            </Button>
          </div>

          {/* Recognition strip */}
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">TRUSTED FOR</span>
            <Badge variant="outline" className="border-violet-500/30 text-violet-300 bg-violet-500/5">Custom curriculum</Badge>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/5">On-site + virtual</Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/5">L&D reporting</Badge>
          </div>
        </motion.div>
      </section>

      {/* ====================================================
          WHO IT'S FOR
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">WHO IT'S FOR</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Built for every kind of <span className="text-gradient-premium">security team</span>.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            From SOC analysts to CISOs — we train every layer of your security org.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WHO_ITS_FOR.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="group relative rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-violet-500/30 p-4 transition-all"
                >
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
          WHAT'S INCLUDED
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">WHAT'S INCLUDED</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
            Six things every cohort <span className="text-gradient-premium">gets</span>.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INCLUDED.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5 hover:border-violet-500/30 transition-colors"
                >
                  <div className="inline-flex p-2 rounded-lg bg-violet-500/10 shrink-0">
                    <Icon className="h-4 w-4 text-violet-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          PRICING
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">PRICING</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Three ways to <span className="text-gradient-premium">engage</span>.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Every engagement starts with a scoping call. Final pricing depends on team size, curriculum complexity, and delivery mode. Reach out for a tailored quote.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRICING.map((tier) => (
              <div
                key={tier.tier}
                className={cn(
                  "relative rounded-xl border p-5 flex flex-col",
                  tier.highlighted
                    ? "border-violet-500/60 bg-violet-500/5 shadow-[0_8px_32px_-8px] shadow-violet-500/30"
                    : "border-border/60 bg-card/60"
                )}
              >
                {tier.highlighted && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-violet-600 text-white shadow-sm">
                      <Sparkles className="h-3 w-3" /> MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="text-sm font-semibold text-violet-300 mb-1">{tier.tier}</div>
                <div className="text-[11px] text-muted-foreground mb-4">{tier.bestFor}</div>
                <ul className="space-y-2 mb-5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] leading-relaxed">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => openForm(tier.tier)}
                  variant={tier.highlighted ? "default" : "outline"}
                  className={cn(
                    "w-full",
                    tier.highlighted
                      ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white"
                      : "border-violet-500/30 hover:bg-violet-500/10"
                  )}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-4">
            * Pricing shown is indicative. Final quote is shared after the scoping call. Travel + accommodation billed at cost for on-site engagements outside Kashmir and Noida.
          </p>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          CASE STUDIES PLACEHOLDER
          ==================================================== */}
      <section className="py-8 lg:py-12 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">TRUSTED BY TEAMS AT</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Engagements under <span className="text-gradient-premium">NDA</span>.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            We train security teams across fintech, healthcare, SaaS, and BFSI. Client logos are shared in our proposal deck after the scoping call.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { label: "Fintech", count: "Series B-C" },
              { label: "Healthcare", count: "Hospital networks" },
              { label: "SaaS", count: "Pre-IPO" },
              { label: "BFSI", count: "Listed banks" },
            ].map((seg) => (
              <div key={seg.label} className="rounded-lg border border-border/40 bg-card/40 p-3.5 text-center">
                <div className="text-sm font-semibold">{seg.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{seg.count}</div>
              </div>
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
                  <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
        </div>
      </section>

      {/* ====================================================
          LEAD-CAPTURE FORM
          ==================================================== */}
      <section ref={formRef} className="py-8 lg:py-12 border-t border-border/40 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">REQUEST A PROPOSAL</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Tell us about your <span className="text-gradient-premium">team</span>.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Fill this form and our corporate training team will reach out within 1 business day to schedule a 30-minute scoping call.
          </p>
          <CorporateLeadForm initialTier={selectedTier} />
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
            <h3 className="text-lg font-semibold mb-1">Prefer email?</h3>
            <p className="text-sm text-muted-foreground">Reach our corporate team directly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate({ name: "contact" })}>
              <Mail className="h-4 w-4 mr-2" /> Contact us
            </Button>
            <Button variant="ghost" onClick={() => navigate({ name: "institutions" })}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Other institution programs
            </Button>
          </div>
        </div>
        </div>
      </section>
    </main>
  )
}

// ============================================================
// Corporate lead-capture form (client-side + POST to /api/corporate-training/leads)
// ============================================================
function CorporateLeadForm({ initialTier }: { initialTier: string | null }) {
  const [form, setForm] = React.useState({
    companyName: "",
    contactName: "",
    workEmail: "",
    phone: "",
    teamSize: "",
    trainingInterest: [] as string[],
    timeline: "",
    message: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  // Pre-fill message if tier was clicked from pricing section
  React.useEffect(() => {
    if (initialTier) {
      setForm((f) => ({
        ...f,
        message: f.message
          ? f.message
          : `Interested in the ${initialTier} engagement tier. Please share a tailored proposal.`,
      }))
    }
  }, [initialTier])

  const update = (key: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (result) setResult(null)
  }

  const toggleInterest = (val: string) => {
    setForm((f) => {
      const exists = f.trainingInterest.includes(val)
      return {
        ...f,
        trainingInterest: exists
          ? f.trainingInterest.filter((v) => v !== val)
          : [...f.trainingInterest, val],
      }
    })
    if (result) setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/corporate-training/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          trainingInterest: form.trainingInterest.join(","),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ type: "error", message: data?.error || "Submission failed. Please try again." })
      } else {
        setResult({
          type: "success",
          message: "Thank you! Our corporate training team will reach out within 1 business day to schedule a scoping call.",
        })
        setForm({
          companyName: "",
          contactName: "",
          workEmail: "",
          phone: "",
          teamSize: "",
          trainingInterest: [],
          timeline: "",
          message: "",
        })
      }
    } catch {
      setResult({ type: "error", message: "Network error. Please check your connection and try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border/60 bg-card/60 backdrop-blur p-5 lg:p-6 space-y-4"
      >
        {/* company + contact */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ct-company" className="text-sm font-medium mb-1.5 block">
              Company name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="ct-company"
              required
              minLength={2}
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="e.g. Acme Corp"
              className="bg-background/50"
            />
          </div>
          <div>
            <Label htmlFor="ct-contact" className="text-sm font-medium mb-1.5 block">
              Contact name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="ct-contact"
              required
              minLength={2}
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="e.g. Jane Doe, Head of L&D"
              className="bg-background/50"
            />
          </div>
        </div>

        {/* email + phone */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ct-email" className="text-sm font-medium mb-1.5 block">
              Work email <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="ct-email"
              type="email"
              required
              value={form.workEmail}
              onChange={(e) => update("workEmail", e.target.value)}
              placeholder="jane@acme.com"
              className="bg-background/50"
            />
          </div>
          <div>
            <Label htmlFor="ct-phone" className="text-sm font-medium mb-1.5 block">
              Mobile number <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="ct-phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="9876543210"
              className="bg-background/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">10-digit Indian mobile number</p>
          </div>
        </div>

        {/* team size + timeline */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Team size <span className="text-rose-400">*</span>
            </Label>
            <Select value={form.teamSize} onValueChange={(v) => update("teamSize", v)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select team size" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((t) => (
                  <SelectItem key={t} value={t}>{t} learners</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Timeline</Label>
            <Select value={form.timeline} onValueChange={(v) => update("timeline", v)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="When do you need this?" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* training interest (multi-select chips) */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block">
            Training interest <span className="text-rose-400">*</span>
            <span className="text-[11px] text-muted-foreground font-normal ml-2">(select all that apply)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {TRAINING_INTERESTS.map((opt) => {
              const selected = form.trainingInterest.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleInterest(opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    selected
                      ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                      : "border-border/60 bg-card/40 hover:border-violet-500/30 hover:bg-violet-500/5"
                  )}
                >
                  {selected && <CheckCircle2 className="h-3 w-3 inline mr-1 -mt-0.5" />}
                  {opt.label}
                </button>
              )
            })}
          </div>
          {form.trainingInterest.length === 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">Pick at least one area you want training in</p>
          )}
        </div>

        {/* message */}
        <div>
          <Label htmlFor="ct-msg" className="text-sm font-medium mb-1.5 block">
            Message (optional)
          </Label>
          <Textarea
            id="ct-msg"
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Tell us about your team's current skill level, tech stack, or any specific training goals..."
            rows={3}
            className="bg-background/50 resize-none"
          />
        </div>

        {/* result banner */}
        {result && (
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
              result.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            )}
          >
            {result.type === "success" ? (
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span className="leading-relaxed">{result.message}</span>
          </div>
        )}

        {/* submit */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={submitting || form.trainingInterest.length === 0}
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_8px_24px_-8px] shadow-violet-500/40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Submit inquiry
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            By submitting, you agree to be contacted by GuardianX about corporate training. We do not share your data.
          </p>
        </div>
      </form>
    </div>
  )
}
