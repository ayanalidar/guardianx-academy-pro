"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  FileText, Plus, Trash2, ArrowLeft, ArrowRight, Calendar,
  Target, CheckCircle2, DollarSign, Printer, Sparkles,
  ShieldCheck, Award, GraduationCap, FlaskConical, Trophy,
  BookOpen, Users, Clock, Building2, Mail, Phone, Globe,
  Layers, Network, CloudCog, Sword, Crosshair, CalendarDays,
  FileCheck, Handshake, PenLine, Rocket, TrendingUp,
  Video, Microscope, FileQuestion, ClipboardList,
  CalendarClock, Eye, ChevronDown, Briefcase, Star, Zap, Loader2,
  Save, FolderOpen,
} from "lucide-react"
import { toast } from "sonner"

// Icon components for the key-stats slide — re-attached by position when a
// saved proposal is loaded (icons themselves are not serializable).
const KEY_STAT_ICONS = [Award, FlaskConical, Users, Building2]

interface Module {
  id: string
  title: string
  description: string
  duration: string
  deliverables: string
}

const SLIDES = [
  { id: 1, name: "Cover", icon: Sparkles },
  { id: 2, name: "Executive Summary", icon: FileText },
  { id: 3, name: "About GuardianX", icon: ShieldCheck },
  { id: 4, name: "Why Choose Us", icon: Award },
  { id: 5, name: "Our Offerings", icon: Layers },
  { id: 6, name: "Methodology", icon: Video },
  { id: 7, name: "Curriculum", icon: BookOpen },
  { id: 8, name: "Benefits", icon: TrendingUp },
  { id: 9, name: "Pricing", icon: DollarSign },
  { id: 10, name: "Partnership Models", icon: Handshake },
  { id: 11, name: "Timeline", icon: CalendarClock },
  { id: 12, name: "Terms", icon: FileCheck },
  { id: 13, name: "Contact", icon: Mail },
] as const

const WHY_CHOOSE_US = [
  { icon: ShieldCheck, title: "Expert Instructors", desc: "Certified cybersecurity professionals with 10+ years of industry experience.", color: "text-violet-300", bg: "bg-violet-500/10" },
  { icon: FlaskConical, title: "Hands-on Labs (31 Docker-powered)", desc: "Real vulnerable environments - not simulations. Each lab is a complete challenge.", color: "text-cyan-300", bg: "bg-cyan-500/10" },
  { icon: CalendarDays, title: "Flexible Batches", desc: "Weekday, weekend, evening, and late-night schedules to suit every learner.", color: "text-emerald-300", bg: "bg-emerald-500/10" },
  { icon: Crosshair, title: "Proctored Examinations", desc: "Camera + screen monitoring with tab-switch detection for exam integrity.", color: "text-amber-300", bg: "bg-amber-500/10" },
  { icon: Award, title: "Verifiable Credentials", desc: "GuardianX certifications with public verification - employers can validate any credential.", color: "text-rose-300", bg: "bg-rose-500/10" },
  { icon: Building2, title: "Institution-Focused", desc: "MoU partnerships, ERP/SMS integration, and custom curriculum for institutions.", color: "text-fuchsia-300", bg: "bg-fuchsia-500/10" },
]

const METHODOLOGY_STEPS = [
  { step: 1, title: "Live Lecture", icon: Video, desc: "Instructor-led session" },
  { step: 2, title: "In-Depth Analysis", icon: Microscope, desc: "Concepts deep-dive" },
  { step: 3, title: "Study Material", icon: FileText, desc: "PDFs + on-the-go notes" },
  { step: 4, title: "Hands-on Lab", icon: FlaskConical, desc: "Docker-powered practice" },
  { step: 5, title: "Assignment", icon: ClipboardList, desc: "Practical exercises" },
  { step: 6, title: "Mock Test", icon: FileQuestion, desc: "Exam-pattern questions" },
  { step: 7, title: "Proctored Exam", icon: Crosshair, desc: "Certification test" },
]

const OFFERINGS = {
  school: {
    label: "For Schools (K-12)",
    icon: GraduationCap,
    offerings: [
      "K-12 cybersecurity curriculum (Grades 6-12)",
      "SMS (Security Mindset for Students) awareness program",
      "Age-appropriate cyber awareness sessions",
      "Cyber basics: passwords, phishing, social media safety",
      "School-wide cyber safety workshops",
      "Inter-school CTF competitions",
    ],
    features: ["Complimentary SMS for partner schools", "Parent awareness sessions", "Teacher training modules", "Reporting dashboard for school admins"],
    benefits: ["Reduced cyberbullying incidents", "Safer online behavior", "Foundation for cybersecurity careers", "Brand differentiation"],
  },
  college: {
    label: "For Colleges",
    icon: BookOpen,
    offerings: [
      "Industry certification training (CEH, Security+, CCNA)",
      "ERP integration for batch management",
      "Campus recruitment preparation",
      "Workshops on latest threats & defenses",
      "Internship projects with real scenarios",
      "Inter-college CTF hosting",
    ],
    features: ["Co-branded certification programs", "Placement assistance", "Industry mentor network", "Custom batch schedules"],
    benefits: ["Higher placement rates", "Industry-aligned curriculum", "Stronger industry partnerships", "Enhanced student outcomes"],
  },
  university: {
    label: "For Universities",
    icon: Trophy,
    offerings: [
      "Degree program integration (B.Tech, M.Tech, PhD support)",
      "Research lab establishment with Docker cyber range",
      "PhD guidance in cybersecurity domains",
      "CTF arena hosting for national competitions",
      "Faculty development programs",
      "Industry-sponsored capstone projects",
    ],
    features: ["MoU-based multi-year partnership", "Research collaboration opportunities", "Conference co-hosting", "Visiting faculty program"],
    benefits: ["Elevated research output", "Industry-academia bridge", "Talent pipeline for partners", "Institutional prestige"],
  },
}

const TIMELINE_PHASES = [
  { phase: "Phase 1", weeks: "Week 1-2", title: "MoU & Requirements", desc: "MoU signing, requirement gathering, stakeholder alignment", icon: Handshake, color: "text-violet-300", bg: "bg-violet-500/10" },
  { phase: "Phase 2", weeks: "Week 3-4", title: "Curriculum & Setup", desc: "Curriculum customization, instructor assignment, lab provisioning", icon: BookOpen, color: "text-cyan-300", bg: "bg-cyan-500/10" },
  { phase: "Phase 3", weeks: "Week 5-8", title: "Launch & First Sessions", desc: "Batch launch, first live sessions, initial labs and assignments", icon: Rocket, color: "text-emerald-300", bg: "bg-emerald-500/10" },
  { phase: "Phase 4", weeks: "Week 9-12", title: "Labs & Assessments", desc: "Advanced labs, mid-term assessments, progress review", icon: FlaskConical, color: "text-amber-300", bg: "bg-amber-500/10" },
  { phase: "Phase 5", weeks: "Week 13-16", title: "Certification & Feedback", desc: "Proctored certification exams, results, feedback collection", icon: Award, color: "text-rose-300", bg: "bg-rose-500/10" },
]

const PARTNERSHIP_MODELS = [
  {
    name: "MoU Partnership",
    icon: Handshake,
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    price: "Complimentary",
    priceNote: "for schools (SMS program)",
    features: [
      "Complimentary SMS for K-12 schools",
      "Awareness workshops (quarterly)",
      "Basic LMS access",
      "Joint branding opportunities",
      "Annual cyber safety audit",
    ],
  },
  {
    name: "Annual License",
    icon: CalendarDays,
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    price: "₹5,000",
    priceNote: "per student / year",
    features: [
      "Full LMS access for all students",
      "31 Docker-powered labs",
      "Live instructor-led batches",
      "Quarterly progress reports",
      "Verifiable GuardianX credentials",
    ],
    popular: true,
  },
  {
    name: "Full Integration",
    icon: Layers,
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    price: "Custom",
    priceNote: "based on institution size",
    features: [
      "SMS + LMS + Cyber Range",
      "Dedicated instructor panel",
      "ERP/SIS integration",
      "Custom curriculum development",
      "24/7 priority support",
      "On-campus lab setup",
    ],
  },
]

export function ProposalMakerView() {
  const { navigate } = useAppStore()
  const [exporting, setExporting] = React.useState(false)

  // Proposal meta
  const [proposalNumber, setProposalNumber] = React.useState(
    `GX-PROP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
  )
  const [proposalDate, setProposalDate] = React.useState(new Date().toISOString().split("T")[0])
  const [validUntil, setValidUntil] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split("T")[0]
  })

  // Institution info
  const [institutionName, setInstitutionName] = React.useState("")
  const [institutionType, setInstitutionType] = React.useState<"school" | "college" | "university">("school")
  const [contactName, setContactName] = React.useState("")
  const [contactEmail, setContactEmail] = React.useState("")
  const [contactPhone, setContactPhone] = React.useState("")
  const [institutionAddress, setInstitutionAddress] = React.useState("")

  // Pre-fill from lead CRM (sessionStorage)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const prefill = window.sessionStorage.getItem("guardianx-proposal-prefill")
      if (prefill) {
        const data = JSON.parse(prefill) as {
          institutionName?: string
          contactName?: string
          contactEmail?: string
          contactPhone?: string
          institutionType?: "school" | "college" | "university"
        }
        if (data.institutionName) setInstitutionName(data.institutionName)
        if (data.contactName) setContactName(data.contactName)
        if (data.contactEmail) setContactEmail(data.contactEmail)
        if (data.contactPhone) setContactPhone(data.contactPhone)
        if (data.institutionType) setInstitutionType(data.institutionType)
        window.sessionStorage.removeItem("guardianx-proposal-prefill")
        toast.success("Lead info pre-filled from CRM")
      }
    } catch {
      // ignore
    }
  }, [])

  // Proposal details
  const [proposalTitle, setProposalTitle] = React.useState("Cybersecurity Training Partnership Proposal")
  const [programDuration, setProgramDuration] = React.useState("12 weeks")
  const [deliveryMode, setDeliveryMode] = React.useState("Hybrid")
  const [targetAudience, setTargetAudience] = React.useState("Students (Grades 9-12)")
  const [studentCount, setStudentCount] = React.useState(50)

  // Executive summary
  const [executiveSummary, setExecutiveSummary] = React.useState(
    "GuardianX Academy proposes a comprehensive cybersecurity training partnership designed to equip your students with practical, industry-relevant skills. Our instructor-led training combines live lectures, hands-on labs, and certification preparation to create job-ready cybersecurity professionals.",
  )
  const [valueProps, setValueProps] = React.useState([
    "Industry-aligned curriculum designed with hiring partners",
    "Hands-on practice through 31 Docker-powered cyber labs",
    "Verifiable credentials with public verification URL",
    "Flexible batch schedules for diverse learner needs",
  ])

  // About
  const [missionStatement, setMissionStatement] = React.useState(
    "To democratize cybersecurity education by providing hands-on, industry-relevant training that prepares the next generation of defenders.",
  )
  const [keyStats, setKeyStats] = React.useState([
    { label: "Certification Courses", value: "28+", icon: Award },
    { label: "Docker Labs", value: "31", icon: FlaskConical },
    { label: "Active Learners", value: "1,200+", icon: Users },
    { label: "Partner Institutions", value: "150+", icon: Building2 },
  ])

  // Modules
  const [modules, setModules] = React.useState<Module[]>([
    { id: "1", title: "Cybersecurity Fundamentals", description: "Introduction to security principles, threats, and defenses", duration: "2 weeks", deliverables: "8 live sessions + 5 labs + quiz" },
    { id: "2", title: "Network Security", description: "Network protocols, firewalls, IDS/IPS, and secure architecture", duration: "3 weeks", deliverables: "12 live sessions + 8 labs + assessment" },
    { id: "3", title: "Web Application Security", description: "OWASP Top 10, SQL injection, XSS, and secure coding", duration: "3 weeks", deliverables: "12 live sessions + 10 labs + CTF" },
    { id: "4", title: "Capstone Project & Certification", description: "Real-world assessment, mock exam, and GuardianX certification", duration: "4 weeks", deliverables: "Capstone lab + proctored exam + credential" },
  ])

  // Benefits
  const [studentBenefits, setStudentBenefits] = React.useState([
    "Industry-ready cybersecurity skills",
    "Recognized certifications (CEH, Security+, CCNA)",
    "Career guidance and placement support",
    "Hands-on experience with real tools",
  ])
  const [institutionBenefits, setInstitutionBenefits] = React.useState([
    "Brand elevation as a cybersecurity-focused institution",
    "Improved placement statistics",
    "Industry-aligned curriculum",
    "MoU-based long-term partnership",
  ])
  const [facultyBenefits, setFacultyBenefits] = React.useState([
    "Faculty development programs",
    "Curriculum support and co-teaching",
    "Research collaboration opportunities",
    "Access to cyber range for projects",
  ])

  // Pricing
  const [currency, setCurrency] = React.useState("INR")
  const [perStudentPrice, setPerStudentPrice] = React.useState(5000)
  const [labAccessFee, setLabAccessFee] = React.useState(25000)
  const [instructorFee, setInstructorFee] = React.useState(40000)
  const [discountRate, setDiscountRate] = React.useState(10)
  const [revenueShare, setRevenueShare] = React.useState(15)

  // Terms
  const [termsText, setTermsText] = React.useState(
    "1. Payment: 50% advance, 50% on completion.\n2. Cancellation: Full refund if cancelled 30+ days before start. 50% refund 15-30 days. No refund within 15 days.\n3. Intellectual Property: All GuardianX materials remain property of GuardianX Academy. Institution may use materials internally for the duration of the partnership.\n4. Confidentiality: Both parties agree to keep partnership terms confidential.\n5. Liability: GuardianX is not liable for third-party certification exam outcomes.",
  )

  const [activeSlide, setActiveSlide] = React.useState<number>(1)

  // ------------------------------------------------------------------
  // Saved-proposal persistence (/api/proposals) — the whole deck used
  // to live only in React state and was lost on every refresh.
  // ------------------------------------------------------------------
  const queryClient = useQueryClient()
  const [proposalId, setProposalId] = React.useState<string | null>(null)

  function snapshotConfig() {
    return {
      proposalNumber, proposalDate, validUntil,
      institutionName, institutionType, contactName, contactEmail, contactPhone, institutionAddress,
      proposalTitle, programDuration, deliveryMode, targetAudience, studentCount,
      executiveSummary, valueProps, missionStatement,
      // icon components can't be serialized — store label/value only
      keyStats: keyStats.map((k) => ({ label: k.label, value: k.value })),
      modules, studentBenefits, institutionBenefits, facultyBenefits,
      currency, perStudentPrice, labAccessFee, instructorFee, discountRate, revenueShare,
      termsText,
    }
  }

  function applyConfig(c: any) {
    if (!c || typeof c !== "object") return
    if (c.proposalNumber) setProposalNumber(c.proposalNumber)
    if (c.proposalDate) setProposalDate(c.proposalDate)
    if (c.validUntil) setValidUntil(c.validUntil)
    if (c.institutionName !== undefined) setInstitutionName(c.institutionName || "")
    if (c.institutionType) setInstitutionType(c.institutionType)
    if (c.contactName !== undefined) setContactName(c.contactName || "")
    if (c.contactEmail !== undefined) setContactEmail(c.contactEmail || "")
    if (c.contactPhone !== undefined) setContactPhone(c.contactPhone || "")
    if (c.institutionAddress !== undefined) setInstitutionAddress(c.institutionAddress || "")
    if (c.proposalTitle) setProposalTitle(c.proposalTitle)
    if (c.programDuration) setProgramDuration(c.programDuration)
    if (c.deliveryMode) setDeliveryMode(c.deliveryMode)
    if (c.targetAudience) setTargetAudience(c.targetAudience)
    if (typeof c.studentCount === "number") setStudentCount(c.studentCount)
    if (c.executiveSummary) setExecutiveSummary(c.executiveSummary)
    if (Array.isArray(c.valueProps)) setValueProps(c.valueProps)
    if (c.missionStatement) setMissionStatement(c.missionStatement)
    if (Array.isArray(c.keyStats)) {
      // re-attach icon components by position (defaults for new rows)
      setKeyStats(c.keyStats.map((k: any, i: number) => ({
        label: String(k?.label ?? ""),
        value: String(k?.value ?? ""),
        icon: KEY_STAT_ICONS[i % KEY_STAT_ICONS.length],
      })))
    }
    if (Array.isArray(c.modules)) setModules(c.modules)
    if (Array.isArray(c.studentBenefits)) setStudentBenefits(c.studentBenefits)
    if (Array.isArray(c.institutionBenefits)) setInstitutionBenefits(c.institutionBenefits)
    if (Array.isArray(c.facultyBenefits)) setFacultyBenefits(c.facultyBenefits)
    if (c.currency) setCurrency(c.currency)
    if (typeof c.perStudentPrice === "number") setPerStudentPrice(c.perStudentPrice)
    if (typeof c.labAccessFee === "number") setLabAccessFee(c.labAccessFee)
    if (typeof c.instructorFee === "number") setInstructorFee(c.instructorFee)
    if (typeof c.discountRate === "number") setDiscountRate(c.discountRate)
    if (typeof c.revenueShare === "number") setRevenueShare(c.revenueShare)
    if (c.termsText) setTermsText(c.termsText)
  }

  const savedProposalsQuery = useQuery<{ proposals: { id: string; title: string; clientName: string | null; updatedAt: string }[] }>({
    queryKey: ["proposals"],
    queryFn: () => api("/api/proposals"),
    staleTime: 30_000,
  })
  const savedProposals = savedProposalsQuery.data?.proposals ?? []

  const saveMutation = useMutation({
    mutationFn: (id: string | null) =>
      id
        ? api(`/api/proposals/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ title: proposalTitle, clientName: institutionName, config: snapshotConfig() }),
          })
        : api("/api/proposals", {
            method: "POST",
            body: JSON.stringify({ title: proposalTitle, clientName: institutionName, config: snapshotConfig() }),
          }),
    onSuccess: (res: any, wasNew) => {
      if (wasNew && res?.proposal?.id) setProposalId(res.proposal.id)
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      toast.success("Proposal saved — safe to leave this page")
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  })

  const loadMutation = useMutation({
    mutationFn: (id: string) => api<{ proposal: { id: string; title: string; config: any } }>(`/api/proposals/${id}`),
    onSuccess: (res) => {
      applyConfig(res.proposal.config)
      setProposalId(res.proposal.id)
      toast.success(`Loaded "${res.proposal.title || res.proposal.id}"`)
    },
    onError: (e: any) => toast.error(e.message || "Load failed"),
  })

  const deleteProposalMutation = useMutation({
    mutationFn: (id: string) => api(`/api/proposals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      setProposalId(null)
      toast.success("Saved proposal deleted")
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  })

  // Pricing calculations
  const studentTotal = perStudentPrice * studentCount
  const subtotal = studentTotal + labAccessFee + instructorFee
  const discountAmount = (subtotal * discountRate) / 100
  const total = subtotal - discountAmount
  const currencySymbol = currency === "INR" ? "₹" : "$"
  const fmt = (a: number) => `${currencySymbol}${a.toLocaleString("en-IN")}`

  function addModule() {
    setModules([...modules, { id: String(Date.now()), title: "", description: "", duration: "", deliverables: "" }])
  }
  function removeModule(id: string) {
    setModules(modules.filter((m) => m.id !== id))
  }
  function updateModule(id: string, field: keyof Module, value: string) {
    setModules(modules.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }
  function updateValueProp(index: number, value: string) {
    setValueProps(valueProps.map((v, i) => (i === index ? value : v)))
  }
  function addValueProp() {
    setValueProps([...valueProps, ""])
  }
  function removeValueProp(index: number) {
    setValueProps(valueProps.filter((_, i) => i !== index))
  }
  function updateStudentBenefit(index: number, value: string) {
    setStudentBenefits(studentBenefits.map((b, i) => (i === index ? value : b)))
  }
  function updateInstitutionBenefit(index: number, value: string) {
    setInstitutionBenefits(institutionBenefits.map((b, i) => (i === index ? value : b)))
  }
  function updateFacultyBenefit(index: number, value: string) {
    setFacultyBenefits(facultyBenefits.map((b, i) => (i === index ? value : b)))
  }

  /**
   * Real PDF export — captures each of the 13 slides with html2canvas-pro
   * and writes one A4-landscape page per slide via jsPDF.
   *
   * The previous implementation called window.print() and relied on the
   * browser's "Background graphics" checkbox being ON — with the default
   * (OFF), the dark oklch-colored deck printed as blank/ghost pages.
   * html2canvas-pro understands Tailwind v4's oklch()/color-mix colors and
   * produces a deterministic PDF independent of browser print settings.
   * window.print() stays available as the secondary "Print" button.
   */
  async function handleExportPDF() {
    const preview = document.getElementById("proposal-preview")
    if (!preview) {
      toast.error("Proposal preview not found")
      return
    }
    if (exporting) return
    setExporting(true)
    try {
      toast.info("Generating PDF... this captures 13 slides")
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ])

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pageW = 297
      const pageH = 210
      let first = true

      for (const s of SLIDES) {
        const el = document.getElementById(`slide-${s.id}`)
        if (!el) continue
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#0a0a0f",
          logging: false,
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        })
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height)
        const w = canvas.width * ratio
        const h = canvas.height * ratio
        if (!first) pdf.addPage()
        first = false
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h)
      }

      pdf.save(`${proposalNumber || "proposal"}.pdf`)
      toast.success("PDF downloaded — one page per slide")
    } catch (err: any) {
      console.error("[proposal-pdf]", err)
      toast.error(err?.message || "Failed to generate PDF. Try the Print button as a fallback.")
    } finally {
      setExporting(false)
    }
  }

  function handlePrint() {
    window.print()
    toast.info("Print dialog opened — enable 'Background graphics' for correct colors")
  }

  function scrollToSlide(id: number) {
    setActiveSlide(id)
    const el = document.getElementById(`slide-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="relative min-h-screen bg-mesh">
      {/* Header bar */}
      <div className="print:hidden border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Admin
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                Proposal Maker <span className="text-[10px] font-mono text-muted-foreground ml-1">Pitch Deck</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">{proposalNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Saved proposals — load / save / delete */}
            <Select
              value={proposalId ?? "__NONE__"}
              onValueChange={(v) => v !== "__NONE__" && loadMutation.mutate(v)}
            >
              <SelectTrigger className="w-[190px] h-8 text-xs"><SelectValue placeholder="Saved proposals" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">
                  <span className="flex items-center gap-1.5 text-muted-foreground italic">
                    <FolderOpen className="h-3 w-3" /> Saved proposals
                  </span>
                </SelectItem>
                {savedProposals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title || p.clientName || p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveMutation.mutate(proposalId)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {proposalId ? "Update" : "Save"}
            </Button>
            {proposalId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveMutation.mutate(null)}
                disabled={saveMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Save as new
              </Button>
            )}
            {proposalId && (
              <Button
                size="sm"
                variant="outline"
                className="text-rose-300 hover:bg-rose-500/10"
                onClick={() => {
                  if (confirm("Delete this saved proposal?")) deleteProposalMutation.mutate(proposalId)
                }}
                disabled={deleteProposalMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handlePrint} disabled={exporting}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={exporting} className="bg-cyan-600 hover:bg-cyan-500 btn-premium">
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 mr-1.5" />
              )}
              Generate PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* === EDITOR PANEL === */}
          <div className="print:hidden lg:col-span-5 space-y-4">
            {/* Slide navigation chips */}
            <Card className="p-4 card-premium">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Jump to Slide</p>
              <div className="flex flex-wrap gap-1.5">
                {SLIDES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSlide(s.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      activeSlide === s.id
                        ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 border border-transparent",
                    )}
                  >
                    <s.icon className="h-3 w-3" />
                    {s.id}
                  </button>
                ))}
              </div>
            </Card>

            {/* Slide 1: Cover */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" /> Slide 1 · Cover Page
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Proposal Number</Label><Input value={proposalNumber} onChange={(e) => setProposalNumber(e.target.value)} className="font-mono text-sm" /></div>
                <div><Label className="text-xs">Date</Label><Input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} /></div>
                <div><Label className="text-xs">Valid Until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
                <div><Label className="text-xs">Proposal Title</Label><Input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} /></div>
              </div>
            </Card>

            {/* Institution info */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-400" /> Institution Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label className="text-xs">Institution Name</Label><Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="e.g. Delhi Public School" /></div>
                <div>
                  <Label className="text-xs">Institution Type</Label>
                  <Select value={institutionType} onValueChange={(v) => setInstitutionType(v as "school" | "college" | "university")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">School (K-12)</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Principal / Director / HR" /></div>
                <div><Label className="text-xs">Contact Email</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
                <div><Label className="text-xs">Contact Phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Address</Label><Input value={institutionAddress} onChange={(e) => setInstitutionAddress(e.target.value)} /></div>
              </div>
            </Card>

            {/* Program details */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" /> Program Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Program Duration</Label><Input value={programDuration} onChange={(e) => setProgramDuration(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Delivery Mode</Label>
                  <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="On-campus">On-campus</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Target Audience</Label><Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} /></div>
                <div><Label className="text-xs">Student Count</Label><Input type="number" value={studentCount} onChange={(e) => setStudentCount(Number(e.target.value))} /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Executive Summary</Label><Textarea value={executiveSummary} onChange={(e) => setExecutiveSummary(e.target.value)} rows={3} className="text-xs" /></div>
              </div>
            </Card>

            {/* Value props */}
            <Card className="p-5 card-premium">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" /> Slide 2 · Value Propositions</h2>
                <Button size="sm" variant="outline" onClick={addValueProp}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                {valueProps.map((vp, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={vp} onChange={(e) => updateValueProp(i, e.target.value)} className="text-sm" placeholder="Value proposition..." />
                    <Button size="sm" variant="ghost" onClick={() => removeValueProp(i)} className="text-rose-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* About */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-400" /> Slide 3 · About / Mission
              </h2>
              <Label className="text-xs">Mission Statement</Label>
              <Textarea value={missionStatement} onChange={(e) => setMissionStatement(e.target.value)} rows={3} className="text-xs mb-2" />
              <p className="text-[10px] text-muted-foreground">Key statistics are auto-derived from platform data.</p>
            </Card>

            {/* Modules */}
            <Card className="p-5 card-premium">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-400" /> Slide 7 · Curriculum Modules</h2>
                <Button size="sm" variant="outline" onClick={addModule}><Plus className="h-3.5 w-3.5 mr-1" /> Add Module</Button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {modules.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input value={m.title} onChange={(e) => updateModule(m.id, "title", e.target.value)} placeholder="Module title" className="text-sm font-medium" />
                      <Input value={m.duration} onChange={(e) => updateModule(m.id, "duration", e.target.value)} placeholder="Duration" className="text-sm w-32" />
                      <Button size="sm" variant="ghost" onClick={() => removeModule(m.id)} className="text-rose-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Input value={m.description} onChange={(e) => updateModule(m.id, "description", e.target.value)} placeholder="Description" className="text-xs" />
                    <Input value={m.deliverables} onChange={(e) => updateModule(m.id, "deliverables", e.target.value)} placeholder="Deliverables" className="text-xs" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Benefits */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Slide 8 · Benefits (editable)
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-cyan-300">For Students</Label>
                  {studentBenefits.map((b, i) => (
                    <Input key={i} value={b} onChange={(e) => updateStudentBenefit(i, e.target.value)} className="text-xs mb-1" />
                  ))}
                </div>
                <div>
                  <Label className="text-xs text-violet-300">For Institution</Label>
                  {institutionBenefits.map((b, i) => (
                    <Input key={i} value={b} onChange={(e) => updateInstitutionBenefit(i, e.target.value)} className="text-xs mb-1" />
                  ))}
                </div>
                <div>
                  <Label className="text-xs text-amber-300">For Faculty</Label>
                  {facultyBenefits.map((b, i) => (
                    <Input key={i} value={b} onChange={(e) => updateFacultyBenefit(i, e.target.value)} className="text-xs mb-1" />
                  ))}
                </div>
              </div>
            </Card>

            {/* Pricing */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-400" /> Slide 9 · Pricing
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="INR">₹ INR</SelectItem><SelectItem value="USD">$ USD</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Per Student Price</Label><Input type="number" value={perStudentPrice} onChange={(e) => setPerStudentPrice(Number(e.target.value))} /></div>
                <div><Label className="text-xs">Lab Access Fee</Label><Input type="number" value={labAccessFee} onChange={(e) => setLabAccessFee(Number(e.target.value))} /></div>
                <div><Label className="text-xs">Instructor Fee</Label><Input type="number" value={instructorFee} onChange={(e) => setInstructorFee(Number(e.target.value))} /></div>
                <div><Label className="text-xs">Discount (%)</Label><Input type="number" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} /></div>
                <div><Label className="text-xs">Revenue Share with Institution (%)</Label><Input type="number" value={revenueShare} onChange={(e) => setRevenueShare(Number(e.target.value))} /></div>
              </div>
            </Card>

            {/* Terms */}
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-rose-400" /> Slide 12 · Terms & Conditions
              </h2>
              <Textarea value={termsText} onChange={(e) => setTermsText(e.target.value)} rows={6} className="text-xs" />
            </Card>
          </div>

          {/* === LIVE PREVIEW (right side, slide panels) === */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl overflow-hidden card-premium" id="proposal-preview">
              {/* Slide 1: Cover */}
              <Slide id={1} title="Cover">
                <div className="relative bg-gradient-to-br from-violet-950/80 via-zinc-950 to-zinc-950 p-8 sm:p-12 min-h-[480px] flex flex-col justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                  <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-lg" />
                        <img src="/guardianx-logo-v2.png" alt="GuardianX" className="relative w-14 h-14 sm:w-16 sm:h-16 object-contain" style={{ filter: "drop-shadow(0 0 12px rgba(167,139,250,0.5))" }} />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gradient-premium">GuardianX Academy</h1>
                        <p className="text-[11px] text-violet-200/80">Cybersecurity Training & Certification</p>
                      </div>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 mb-3">PARTNERSHIP PROPOSAL</Badge>
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight text-gradient-premium">{proposalTitle}</h2>
                    <p className="text-sm text-violet-200/80 mt-3">Prepared for {institutionName || "your institution"}</p>
                    <div className="grid grid-cols-3 gap-3 mt-8">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3"><p className="text-[10px] text-violet-200/60 uppercase">Proposal #</p><p className="font-mono text-xs">{proposalNumber}</p></div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3"><p className="text-[10px] text-violet-200/60 uppercase">Date</p><p className="text-xs">{new Date(proposalDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3"><p className="text-[10px] text-violet-200/60 uppercase">Valid Until</p><p className="text-xs">{new Date(validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Slide 2: Executive Summary */}
              <Slide id={2} title="Executive Summary">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-gradient-premium">Executive Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{executiveSummary}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {valueProps.filter((v) => v.trim()).map((vp, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border/40 bg-card/40 p-3">
                        <CheckCircle2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                        <span className="text-sm">{vp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Slide>

              {/* Slide 3: About GuardianX */}
              <Slide id={3} title="About GuardianX">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 text-gradient-premium">About GuardianX</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{missionStatement}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {keyStats.map((s, i) => (
                      <div key={i} className="rounded-lg border border-border/40 bg-card/40 p-4 text-center">
                        <s.icon className="h-5 w-5 mx-auto text-violet-300 mb-1" />
                        <div className="text-xl font-bold text-gradient-premium">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                    <img src="/guardianx-logo-v2.png" alt="GuardianX" className="w-12 h-12 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(167,139,250,0.4))" }} />
                    <div>
                      <p className="text-sm font-semibold">Trusted cybersecurity training partner</p>
                      <p className="text-xs text-muted-foreground">Built around real OSS tools - Kali Linux, Nmap, Burp Suite, Metasploit, Docker, Hashcat</p>
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Slide 4: Why Choose GuardianX */}
              <Slide id={4} title="Why Choose Us">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Why Choose GuardianX?</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {WHY_CHOOSE_US.map((w, i) => (
                      <div key={i} className="rounded-lg border border-border/40 bg-card/40 p-4">
                        <div className={cn("inline-flex p-2 rounded-lg mb-2", w.bg)}>
                          <w.icon className={cn("h-4 w-4", w.color)} />
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{w.title}</h4>
                        <p className="text-xs text-muted-foreground">{w.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Slide>

              {/* Slide 5: Our Offerings (tabbed) */}
              <Slide id={5} title="Our Offerings">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Our Offerings</h3>
                  <Tabs defaultValue={institutionType} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="school" className="text-xs"><GraduationCap className="h-3.5 w-3.5 mr-1" /> Schools</TabsTrigger>
                      <TabsTrigger value="college" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" /> Colleges</TabsTrigger>
                      <TabsTrigger value="university" className="text-xs"><Trophy className="h-3.5 w-3.5 mr-1" /> Universities</TabsTrigger>
                    </TabsList>
                    {(["school", "college", "university"] as const).map((key) => {
                      const data = OFFERINGS[key]
                      return (
                        <TabsContent key={key} value={key} className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <data.icon className="h-5 w-5 text-violet-300" />
                            <h4 className="font-semibold">{data.label}</h4>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border/40 bg-card/40 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300 mb-2">Offerings</p>
                              <ul className="space-y-1">
                                {data.offerings.map((o, i) => (
                                  <li key={i} className="text-xs flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />{o}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-card/40 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-2">Features</p>
                              <ul className="space-y-1">
                                {data.features.map((f, i) => (
                                  <li key={i} className="text-xs flex items-start gap-1.5"><Zap className="h-3 w-3 text-cyan-400 mt-0.5 shrink-0" />{f}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-2">Benefits to Institution</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {data.benefits.map((b, i) => (
                                <span key={i} className="text-xs">{b}</span>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                </div>
              </Slide>

              {/* Slide 6: Training Methodology */}
              <Slide id={6} title="Methodology">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Training Methodology</h3>
                  <p className="text-sm text-muted-foreground mb-6">A 7-step structured approach that combines theory with hands-on practice.</p>
                  <div className="relative">
                    {/* Connecting line (desktop) */}
                    <div className="hidden lg:block absolute top-6 left-6 right-6 h-0.5 bg-gradient-to-r from-violet-500/40 via-cyan-500/40 to-rose-500/40" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {METHODOLOGY_STEPS.map((s, i) => (
                        <div key={i} className="relative flex flex-col items-center text-center">
                          <div className="size-12 rounded-full bg-card border-2 border-violet-500/40 flex items-center justify-center mb-2 relative z-10">
                            <s.icon className="h-5 w-5 text-violet-300" />
                          </div>
                          <span className="text-[10px] font-bold text-violet-300 mb-0.5">{String(s.step).padStart(2, "0")}</span>
                          <p className="text-xs font-semibold">{s.title}</p>
                          <p className="text-[10px] text-muted-foreground hidden sm:block">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Slide 7: Curriculum */}
              <Slide id={7} title="Curriculum">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Program Curriculum</h3>
                  <div className="space-y-3">
                    {modules.map((m, i) => (
                      <div key={m.id} className="rounded-lg border border-border/40 bg-card/40 p-4">
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center size-6 rounded-md bg-violet-600 text-white text-xs font-bold">{i + 1}</span>
                            <h4 className="font-semibold text-sm">{m.title || "Module"}</h4>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-mono">{m.duration}</Badge>
                        </div>
                        {m.description && <p className="text-xs text-muted-foreground ml-8">{m.description}</p>}
                        {m.deliverables && (
                          <p className="text-[10px] text-cyan-300/80 ml-8 mt-1 flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" /> Deliverables: {m.deliverables}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Slide>

              {/* Slide 8: Benefits to Institution */}
              <Slide id={8} title="Benefits">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Benefits to Institution</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <div className="inline-flex p-2 rounded-lg bg-cyan-500/10 mb-2"><Users className="h-4 w-4 text-cyan-300" /></div>
                      <h4 className="font-semibold text-sm mb-2">For Students</h4>
                      <ul className="space-y-1.5">
                        {studentBenefits.map((b, i) => <li key={i} className="text-xs flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-cyan-400 mt-0.5 shrink-0" />{b}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="inline-flex p-2 rounded-lg bg-violet-500/10 mb-2"><Building2 className="h-4 w-4 text-violet-300" /></div>
                      <h4 className="font-semibold text-sm mb-2">For Institution</h4>
                      <ul className="space-y-1.5">
                        {institutionBenefits.map((b, i) => <li key={i} className="text-xs flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />{b}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><BookOpen className="h-4 w-4 text-amber-300" /></div>
                      <h4 className="font-semibold text-sm mb-2">For Faculty</h4>
                      <ul className="space-y-1.5">
                        {facultyBenefits.map((b, i) => <li key={i} className="text-xs flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />{b}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Slide 9: Pricing */}
              <Slide id={9} title="Pricing">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Revenue Model & Pricing</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-border/40"><td className="py-2 text-muted-foreground">Training ({studentCount} students × {fmt(perStudentPrice)})</td><td className="py-2 text-right font-medium tabular-nums">{fmt(studentTotal)}</td></tr>
                          <tr className="border-b border-border/40"><td className="py-2 text-muted-foreground">Cyber Lab Access (31 labs, {programDuration})</td><td className="py-2 text-right font-medium tabular-nums">{fmt(labAccessFee)}</td></tr>
                          <tr className="border-b border-border/40"><td className="py-2 text-muted-foreground">Instructor & Material Fee</td><td className="py-2 text-right font-medium tabular-nums">{fmt(instructorFee)}</td></tr>
                          {discountRate > 0 && <tr className="border-b border-border/40"><td className="py-2 text-muted-foreground">Discount ({discountRate}%)</td><td className="py-2 text-right text-rose-300 tabular-nums">−{fmt(discountAmount)}</td></tr>}
                          <tr className="border-t-2 border-border"><td className="py-3 font-bold">Total Investment</td><td className="py-3 text-right font-bold text-lg text-gradient-premium tabular-nums">{fmt(total)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300 mb-1">Revenue Share</p>
                        <p className="text-sm">{revenueShare}% of training revenue shared with institution for cohorts above 50 students</p>
                      </div>
                      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">ROI for Institution</p>
                        <p className="text-sm">Estimated {fmt(Math.round(total * 3 / studentCount))} value per student in industry certifications + placement premium</p>
                      </div>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">Custom Pricing</p>
                        <p className="text-sm">Volume discounts available for cohorts above 100 students. Contact us for a tailored quote.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Slide 10: Partnership Models */}
              <Slide id={10} title="Partnership Models">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Partnership Models</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {PARTNERSHIP_MODELS.map((model, i) => (
                      <div key={i} className={cn("relative rounded-lg border p-4", model.popular ? "border-cyan-500/40 bg-cyan-500/5" : "border-border/40 bg-card/40")}>
                        {model.popular && (
                          <Badge className="absolute -top-2 right-2 bg-cyan-500 text-white text-[9px]">POPULAR</Badge>
                        )}
                        <div className={cn("inline-flex p-2 rounded-lg mb-2", model.bg)}>
                          <model.icon className={cn("h-4 w-4", model.color)} />
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{model.name}</h4>
                        <p className="text-lg font-bold text-gradient-premium">{model.price}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">{model.priceNote}</p>
                        <ul className="space-y-1">
                          {model.features.map((f, j) => (
                            <li key={j} className="text-xs flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />{f}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </Slide>

              {/* Slide 11: Implementation Timeline */}
              <Slide id={11} title="Timeline">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Implementation Timeline</h3>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-violet-500/40 via-cyan-500/40 to-rose-500/40" />
                    <div className="space-y-4">
                      {TIMELINE_PHASES.map((p, i) => (
                        <div key={i} className="relative pl-12">
                          <div className={cn("absolute left-0 size-10 rounded-full border-2 border-border/60 flex items-center justify-center", p.bg)}>
                            <p.icon className={cn("h-4 w-4", p.color)} />
                          </div>
                          <div className="rounded-lg border border-border/40 bg-card/40 p-3">
                            <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-mono">{p.phase}</Badge>
                                <span className="text-[10px] text-muted-foreground">{p.weeks}</span>
                              </div>
                              <h4 className="font-semibold text-sm">{p.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Slide 12: Terms & Conditions */}
              <Slide id={12} title="Terms">
                <div className="p-6 sm:p-10 bg-card/30">
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gradient-premium">Terms & Conditions</h3>
                  <div className="rounded-lg border border-border/40 bg-card/40 p-4">
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{termsText}</p>
                  </div>
                </div>
              </Slide>

              {/* Slide 13: Contact & Next Steps */}
              <Slide id={13} title="Contact">
                <div className="relative bg-gradient-to-br from-violet-950/80 via-zinc-950 to-zinc-950 p-8 sm:p-12 overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                  <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
                  <div className="relative">
                    <Badge className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 mb-3">CONTACT & NEXT STEPS</Badge>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-gradient-premium">Ready to Partner?</h3>
                    <div className="grid sm:grid-cols-2 gap-6 mb-8">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60 mb-2">GuardianX Academy</p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-violet-100/90"><Mail className="h-3.5 w-3.5" /> academy@guardianx.in</div>
                          <div className="flex items-center gap-2 text-violet-100/90"><Mail className="h-3.5 w-3.5" /> academy@guardianx.cloud</div>
                          <div className="flex items-center gap-2 text-violet-100/90"><Phone className="h-3.5 w-3.5" /> +91 80 4567 8901</div>
                          <div className="flex items-center gap-2 text-violet-100/90"><Globe className="h-3.5 w-3.5" /> academy.guardianx.cloud</div>
                          <div className="flex items-center gap-2 text-violet-100/90"><Building2 className="h-3.5 w-3.5" /> Nooripora, Baramulla, Kashmir · Noida, Gautam Buddha Nagar</div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60 mb-2">Next Steps</p>
                        <ol className="space-y-1.5 text-sm list-decimal list-inside text-violet-100/90">
                          <li>Review proposal with stakeholders</li>
                          <li>Schedule a discovery call</li>
                          <li>Sign MoU (template provided)</li>
                          <li>Begin implementation (Week 1)</li>
                        </ol>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button className="bg-violet-600 hover:bg-violet-500 btn-premium">
                        <PenLine className="h-4 w-4 mr-1.5" /> Sign MoU
                      </Button>
                      <Button variant="outline" className="border-violet-500/40 text-violet-100 hover:bg-violet-500/10">
                        <Mail className="h-4 w-4 mr-1.5" /> Schedule a Call
                      </Button>
                    </div>
                    {/* Signature areas */}
                    <div className="grid sm:grid-cols-2 gap-6 mt-10 pt-6 border-t border-white/10">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60 mb-2">For GuardianX Academy</p>
                        <div className="h-12 border-b border-dashed border-white/20" />
                        <p className="text-xs mt-1">Authorized Signatory</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/60 mb-2">For {institutionName || "Institution"}</p>
                        <div className="h-12 border-b border-dashed border-white/20" />
                        <p className="text-xs mt-1">{contactName || "Authorized Signatory"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Slide>

              {/* Footer */}
              <div className="border-t border-border/40 px-6 sm:px-8 py-4 bg-gradient-to-r from-violet-950/40 via-zinc-950/40 to-cyan-950/40">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-violet-400" /> Verified Training Provider</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Award className="h-3.5 w-3.5 text-violet-400" /> ISO-Aligned Curriculum</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">academy.guardianx.cloud · {proposalNumber}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles - multi-page A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #proposal-preview, #proposal-preview * {
            visibility: visible;
          }
          #proposal-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          #proposal-preview > section {
            page-break-after: always;
            break-after: page;
          }
          /* Force background colors into print output even when the browser's
             'Background graphics' checkbox is OFF — most browsers honor
             print-color-adjust on the element itself. */
          #proposal-preview, #proposal-preview * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}

function Slide({ id, title, children }: { id: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`slide-${id}`} className="border-b border-border/40 scroll-mt-20">
      <div className="px-6 sm:px-10 pt-4 pb-1 bg-muted/30 border-b border-border/40 flex items-center gap-2">
        <Badge variant="outline" className="text-[9px] font-mono">SLIDE {id}/13</Badge>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </section>
  )
}
