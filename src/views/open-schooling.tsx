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
  GraduationCap,
  Clock,
  Wallet,
  Users,
  Briefcase,
  Trophy,
  RotateCcw,
  CheckCircle2,
  FileText,
  IdCard,
  Image as ImageIcon,
  MapPin,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Award,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// ============================================================
// Static content
// ============================================================
const WHO_ITS_FOR = [
  {
    icon: RotateCcw,
    title: "School dropouts",
    desc: "Complete your education on your own schedule. No need to rejoin regular school - study at home, appear for exams when ready.",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: Briefcase,
    title: "Working professionals",
    desc: "Get your 10th or 12th certificate without quitting your job. Flexible exam sessions in January and July.",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Trophy,
    title: "Sports persons & artists",
    desc: "On-demand exam dates that don't clash with training, competitions, or performances.",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Failed regular boards",
    desc: "Pass with a recognized equivalent certificate. Save a year - no need to repeat the full school term.",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
]

const STEPS = [
  {
    icon: FileText,
    title: "Register online",
    desc: "Fill the registration form on this page. Our counsellor contacts you within 24 hours to guide you through document submission and fee payment.",
  },
  {
    icon: BookOpen,
    title: "Study at your pace",
    desc: "Get study material (printed + online), access video lectures, and prepare on your own schedule. 5-year registration validity.",
  },
  {
    icon: CalendarDays,
    title: "Choose your exam",
    desc: "Appear in the January or July exam cycle. On-demand exams also available for some subjects.",
  },
  {
    icon: Award,
    title: "Get your certificate",
    desc: "Digital certificate issued via DigiLocker. Recognized by NEP 2020, COBSE - valid for higher education and government jobs.",
  },
]

const FEE_ROWS = [
  { label: "Eligibility", secondary: "10th", senior: "12th" },
  { label: "Min age at enrolment", secondary: "14 years", senior: "15 years (as of Jan 1)" },
  { label: "Previous qualification", secondary: "8th pass", senior: "10th pass from a recognized board" },
  { label: "Minimum subjects", secondary: "5 (incl. 1 language)", senior: "5 (incl. 1 language)" },
  { label: "Registration fee", secondary: "₹1,000 (valid 5 years)", senior: "₹1,000 (valid 5 years)" },
  { label: "Per-subject fee", secondary: "₹2,000", senior: "₹2,500" },
  { label: "Exam fee per subject", secondary: "₹300-₹600", senior: "₹300-₹600" },
  { label: "Exam sessions", secondary: "January & July", senior: "January & July" },
  { label: "Validity", secondary: "5 years", senior: "5 years" },
  { label: "Recognition", secondary: "NEP 2020 · COBSE", senior: "NEP 2020 · COBSE" },
]

const DOCUMENTS = [
  { icon: IdCard, label: "Aadhaar card / valid ID proof", desc: "For identity verification" },
  { icon: FileText, label: "Previous marksheet", desc: "8th marksheet for 10th · 10th marksheet for 12th" },
  { icon: ImageIcon, label: "Passport-size photograph", desc: "Recent colour photo" },
  { icon: MapPin, label: "Address proof", desc: "Aadhaar / voter ID / utility bill" },
  { icon: FileText, label: "Date of birth proof", desc: "Birth certificate / 10th marksheet (for 12th)" },
]

const FAQS = [
  {
    q: "Is the open schooling certificate valid for government jobs?",
    a: "Yes. Open schooling certificates are recognized by COBSE (Council of Boards of School Education in India) and aligned with NEP 2020. They are valid for government jobs, higher education, and competitive exams across India.",
  },
  {
    q: "Can I appear for JEE / NEET / UPSC after completing 12th through open schooling?",
    a: "Yes. The 12th certificate from open schooling is recognized equivalent to other boards (CBSE / ICSE). You are eligible for JEE, NEET, CUET, UPSC, SSC, and all other entrance exams that require a 12th pass certificate.",
  },
  {
    q: "What if I fail a subject?",
    a: "You can re-appear for that subject in the next exam cycle (January or July). Open schooling allows up to 4 attempts within the 5-year registration validity. You do not need to re-enrol - just pay the exam fee per subject again.",
  },
  {
    q: "Can I change subjects after registration?",
    a: "Yes. You can change subjects within 1 year of registration by paying a small subject-change fee. Contact our counsellor to initiate the change.",
  },
  {
    q: "How do I receive my certificate?",
    a: "Your digital certificate is issued via DigiLocker (the Government of India's digital wallet) and is also downloadable from the student portal. Printed certificates can be collected from our office or delivered by post on request.",
  },
  {
    q: "I don't have my 8th / 10th marksheet. Can I still apply?",
    a: "For 10th, the board accepts alternative proofs of having studied up to 8th level (school leaving certificate, transfer certificate, or an affidavit). For 12th, you must submit your 10th pass certificate. Our counsellor can guide you on the exact alternatives available.",
  },
  {
    q: "Do I need to attend any classes?",
    a: "No. Open schooling is self-paced - you study on your own using the study material provided. However, GuardianX offers optional weekend doubt-clearing sessions (online + offline) for students who want extra help. These are free for students who register through us.",
  },
  {
    q: "Can I apply through GuardianX for NIOS too?",
    a: "Yes. GuardianX facilitates registration for both open schooling boards available in India. Mention your preference in the registration form's message field, or ask our counsellor when they call you.",
  },
]

// ============================================================
// Main view
// ============================================================
export function OpenSchoolingView() {
  const { navigate } = useAppStore()
  const [selectedCourse, setSelectedCourse] = React.useState<"10th" | "12th">("10th")
  const formRef = React.useRef<HTMLDivElement>(null)

  const openForm = (course: "10th" | "12th") => {
    setSelectedCourse(course)
    // smooth-scroll to form
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
              <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em]">OPEN SCHOOLING</span>
            </div>
            <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
              Complete your{" "}
              <span className="text-gradient-premium">10th & 12th</span>
              <br />
              through Open Schooling
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-5">
              Recognized by NEP 2020 · COBSE. Valid for higher education, government jobs, and all
              entrance exams. Study at your pace - no need to attend regular school.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => openForm("10th")}
                className="group h-12 px-6 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_8px_24px_-8px] shadow-violet-500/40"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Register for 10th
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => openForm("12th")}
                className="group h-12 px-6 border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/10"
              >
                Register for 12th
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate({ name: "contact" })}
                className="text-muted-foreground hover:text-foreground"
              >
                Talk to a counsellor
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Recognition badges */}
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">RECOGNIZED BY</span>
              <Badge variant="outline" className="border-violet-500/30 text-violet-300 bg-violet-500/5">NEP 2020</Badge>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/5">COBSE</Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/5">DigiLocker</Badge>
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
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">WHO IS IT FOR?</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
              Built for every kind of <span className="text-gradient-premium">learner</span>.
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              Open schooling exists for students who can't fit into a traditional school schedule. Here's who benefits most.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {WHO_ITS_FOR.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="group relative rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-violet-500/30 p-4 transition-all"
                  >
                    <div className={cn("inline-flex p-2.5 rounded-lg mb-3 transition-transform group-hover:scale-110", item.bg)}>
                      <Icon className={cn("h-5 w-5", item.color)} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
          </div>
        </section>

        {/* ====================================================
            HOW IT WORKS
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">HOW IT WORKS</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
              Four simple steps to your <span className="text-gradient-premium">certificate</span>.
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {/* connecting line on desktop */}
              <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    className="relative text-center sm:text-left"
                  >
                    <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-card border border-violet-500/30 mb-4 mx-auto sm:mx-0">
                      <Icon className="h-6 w-6 text-violet-300" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
          </div>
        </section>

        {/* ====================================================
            COURSES & FEES - comparison table
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">COURSES & FEES</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
              Compare <span className="text-gradient-premium">10th vs 12th</span>.
            </h2>

            {/* table */}
            <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
              {/* header */}
              <div className="grid grid-cols-3 bg-violet-500/5 border-b border-border/60">
                <div className="p-4 text-[11px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
                  Particulars
                </div>
                <div className="p-4 text-center border-l border-border/60">
                  <div className="text-sm font-semibold text-violet-300">10th</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Secondary</div>
                </div>
                <div className="p-4 text-center border-l border-border/60">
                  <div className="text-sm font-semibold text-cyan-300">12th</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Senior Secondary</div>
                </div>
              </div>
              {/* rows */}
              {FEE_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className={cn(
                    "grid grid-cols-3 border-b border-border/40 last:border-b-0 hover:bg-violet-500/[0.03] transition-colors",
                    i % 2 === 1 && "bg-muted/10"
                  )}
                >
                  <div className="p-3.5 text-xs text-muted-foreground">{row.label}</div>
                  <div className="p-3.5 text-xs text-foreground text-center border-l border-border/40">{row.secondary}</div>
                  <div className="p-3.5 text-xs text-foreground text-center border-l border-border/40">{row.senior}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground mt-3">
              * Fees are indicative and may change. Final fees depend on the number of subjects chosen and the exam session. Our counsellor will share the exact fee slip during registration.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Button onClick={() => openForm("10th")} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                Register for 10th <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={() => openForm("12th")} variant="outline" className="border-violet-500/30 hover:bg-violet-500/10">
                Register for 12th <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
          </div>
        </section>

        {/* ====================================================
            DOCUMENTS REQUIRED
            ==================================================== */}
        <section className="py-8 lg:py-12 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">DOCUMENTS REQUIRED</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
              Keep these <span className="text-gradient-premium">ready</span>.
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DOCUMENTS.map((doc, i) => {
                const Icon = doc.icon
                return (
                  <motion.div
                    key={doc.label}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5"
                  >
                    <div className="inline-flex p-2 rounded-lg bg-violet-500/10 shrink-0">
                      <Icon className="h-4 w-4 text-violet-300" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{doc.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{doc.desc}</div>
                    </div>
                  </motion.div>
                )
              })}
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
            REGISTRATION FORM
            ==================================================== */}
        <section ref={formRef} className="py-8 lg:py-12 border-t border-border/40 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">REGISTER NOW</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
              Start your <span className="text-gradient-premium">registration</span>.
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              Fill this form and our counsellor will contact you within 24 hours to complete your registration.
              No payment required at this stage.
            </p>
            <RegistrationForm initialCourse={selectedCourse} />
          </motion.div>
          </div>
        </section>

        {/* ====================================================
            FINAL CTA + back button
            ==================================================== */}
        <section className="py-8 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Have more questions?</h3>
              <p className="text-sm text-muted-foreground">Talk to our open-schooling counsellor before deciding.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate({ name: "contact" })}>
                <Mail className="h-4 w-4 mr-2" /> Contact us
              </Button>
              <Button variant="ghost" onClick={() => navigate({ name: "institutions" })}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Institutions
              </Button>
            </div>
          </div>
          </div>
        </section>
    </main>
  )
}

// ============================================================
// Registration form (client-side + POST to /api/open-schooling/leads)
// ============================================================
function RegistrationForm({ initialCourse }: { initialCourse: "10th" | "12th" }) {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    course: initialCourse,
    dateOfBirth: "",
    city: "",
    state: "",
    qualification: "",
    message: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  // sync course when prop changes (user clicked "Register for 12th" from elsewhere)
  React.useEffect(() => {
    setForm((f) => ({ ...f, course: initialCourse }))
  }, [initialCourse])

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (result) setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/open-schooling/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ type: "error", message: data?.error || "Submission failed. Please try again." })
      } else {
        setResult({
          type: "success",
          message: "Thank you! Your registration request has been received. Our counsellor will contact you within 24 hours.",
        })
        // reset (keep course)
        setForm((f) => ({
          ...f,
          name: "",
          email: "",
          phone: "",
          dateOfBirth: "",
          city: "",
          state: "",
          qualification: "",
          message: "",
        }))
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
        {/* course toggle */}
        <div>
          <Label className="text-xs font-mono text-muted-foreground tracking-[0.15em] uppercase mb-2 block">
            I want to register for
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["10th", "12th"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update("course", c)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm font-medium transition-all",
                  form.course === c
                    ? "border-violet-500/60 bg-violet-500/10 text-violet-200 shadow-[0_0_24px_-8px] shadow-violet-500/30"
                    : "border-border/60 bg-card/40 hover:border-violet-500/30 hover:bg-violet-500/5"
                )}
              >
                <div className="text-base">{c}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {c === "10th" ? "Secondary" : "Senior Secondary"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* name + email */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="os-name" className="text-sm font-medium mb-1.5 block">
              Full name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="os-name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Aryan Kumar"
              className="bg-background/50"
            />
          </div>
          <div>
            <Label htmlFor="os-email" className="text-sm font-medium mb-1.5 block">
              Email <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="os-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
              className="bg-background/50"
            />
          </div>
        </div>

        {/* phone + dob */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="os-phone" className="text-sm font-medium mb-1.5 block">
              Mobile number <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="os-phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="9876543210"
              className="bg-background/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">10-digit Indian mobile number</p>
          </div>
          <div>
            <Label htmlFor="os-dob" className="text-sm font-medium mb-1.5 block">
              Date of birth
            </Label>
            <Input
              id="os-dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
              className="bg-background/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">For eligibility verification</p>
          </div>
        </div>

        {/* city + state */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="os-city" className="text-sm font-medium mb-1.5 block">
              City
            </Label>
            <Input
              id="os-city"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="e.g. Jammu"
              className="bg-background/50"
            />
          </div>
          <div>
            <Label htmlFor="os-state" className="text-sm font-medium mb-1.5 block">
              State
            </Label>
            <Input
              id="os-state"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="e.g. Jammu & Kashmir"
              className="bg-background/50"
            />
          </div>
        </div>

        {/* qualification */}
        <div>
          <Label htmlFor="os-qual" className="text-sm font-medium mb-1.5 block">
            Previous qualification
          </Label>
          <Select
            value={form.qualification}
            onValueChange={(v) => update("qualification", v)}
          >
            <SelectTrigger id="os-qual" className="bg-background/50">
              <SelectValue placeholder="Select your highest qualification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="below-8th">Below 8th</SelectItem>
              <SelectItem value="8th-pass">8th pass</SelectItem>
              <SelectItem value="9th-pass">9th pass</SelectItem>
              <SelectItem value="10th-pass">10th pass</SelectItem>
              <SelectItem value="11th-pass">11th pass</SelectItem>
              <SelectItem value="12th-pass">12th pass</SelectItem>
              <SelectItem value="graduate">Graduate</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* message */}
        <div>
          <Label htmlFor="os-msg" className="text-sm font-medium mb-1.5 block">
            Message (optional)
          </Label>
          <Textarea
            id="os-msg"
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Anything you'd like our counsellor to know? (e.g. preferred exam session, subject choices, board preference)"
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
            disabled={submitting}
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_8px_24px_-8px] shadow-violet-500/40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Submit registration
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            By submitting, you agree to be contacted by GuardianX about your open schooling registration. We do not share your data with third parties.
          </p>
        </div>
      </form>
    </div>
  )
}
