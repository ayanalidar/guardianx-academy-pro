"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, useInView, AnimatePresence, useScroll, useSpring } from "framer-motion"
import { api } from "@/lib/api"
import { parseCourseList } from "@/lib/course-lists"
import { useAppStore } from "@/store/app-store"
import { LEVEL_COLORS } from "@/lib/colors"
import { useUser } from "@/hooks/use-user"
import { useCurrency as useCurrencyHook } from "@/hooks/use-currency"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Star, Clock, Users, BookOpen, ChevronLeft, ChevronRight, CheckCircle2, Circle, PlayCircle,
  FileText, Lock, Award, BarChart3, FlaskConical, MessageSquare, GraduationCap, ShieldCheck,
  PenLine, Bookmark, BookmarkCheck, AlertTriangle, Link2,
  ArrowRight, ArrowDown, Sparkles, Zap, Target, Layers, Shield, Briefcase, Radio, Calendar,
  TrendingUp, Rocket, Trophy, Network, Wrench, Brain, Crosshair,
  Code, Activity, Eye, KeyRound, Bug, X, Hexagon,
  Ticket, IndianRupee, Percent, Loader2,
  Copy, MessageCircle, Linkedin,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { getCourseImage } from "@/lib/course-images"

// ============================================================
// Types
// ============================================================
interface Prerequisite {
  id: string
  title: string
  shortName: string
  level: string
  thumbnail: string | null
  completed?: boolean
}

interface CourseDetail {
  course: any
  enrollment: any
  lessonProgress: Record<string, { completed: boolean; position: number }>
  totalLessons: number
  completedLessons: number
  progressPct: number
}

// ============================================================
// Constants
// ============================================================
const LESSON_ICONS: Record<string, any> = {
  reading: FileText,
  pdf: FileText,
  video: PlayCircle,
  lab: FlaskConical,
}

// Achievement icon rotation
const ACHIEVEMENT_ICONS = [Shield, Target, Code, Trophy, Brain, Network, KeyRound, Bug, Eye, Lock]

// Skill tag importance → size class mapping
const TAG_SIZE_BY_INDEX = [
  "text-base px-4 py-2",
  "text-base px-4 py-2",
  "text-sm px-3.5 py-1.5",
  "text-sm px-3.5 py-1.5",
  "text-xs px-3 py-1",
  "text-xs px-3 py-1",
  "text-xs px-2.5 py-0.5",
]

// ============================================================
// Helper: useCountUp — requestAnimationFrame-based count-up
// ============================================================
function useCountUp(target: number, durationMs = 1500, start = true): number {
  const [value, setValue] = React.useState(0)
  React.useEffect(() => {
    if (!start) return
    let raf: number
    let startTime: number | null = null
    const step = (t: number) => {
      if (startTime === null) startTime = t
      const elapsed = t - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, start])
  return value
}

// ============================================================
// Helper: AnimatedNumber — count-up triggered on scroll into view
// ============================================================
function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1500,
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const display = useCountUp(value, duration, inView)
  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString()
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

// ============================================================
// Helper: SectionLabel — small mono label like "01 - OUTCOMES"
// ============================================================
function SectionLabel({
  index,
  children,
  className,
}: {
  index?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-[10px] font-mono tracking-[0.3em] mb-4", className)}>
      {index && <span className="text-muted-foreground/50">{index} - </span>}
      {children}
    </p>
  )
}

// ============================================================
// Helper: HERO_ITEM — shared stagger variant for the hero column
// ============================================================
const HERO_ITEM: any = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}

// ============================================================
// Helper: Reveal — scroll-triggered entrance (fade + rise)
// ============================================================
function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================
// Helper: ScrollProgress — fixed reading-progress bar (top of viewport)
// ============================================================
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[70] origin-left bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400 pointer-events-none"
      style={{ scaleX }}
    />
  )
}

// ============================================================
// Helper: StickySectionNav — in-page anchor nav with scroll-spy.
// Sits in a fixed band BELOW the shell header at every breakpoint:
//   mobile  — under the fixed header (64px band  -> top-16)
//   desktop — under the sticky h-12 top strip    -> top-12
// Solid opaque background so page cards never ghost through it,
// and items are justified — evenly spread edge-to-edge on sm+.
// ============================================================
const SECTION_NAV_ITEMS = [
  { id: "gx-overview", label: "Overview" },
  { id: "gx-skills", label: "Skills" },
  { id: "gx-curriculum", label: "Curriculum" },
  { id: "gx-instructor", label: "Instructor" },
  { id: "gx-reviews", label: "Reviews" },
]

function StickySectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = React.useState(items[0]?.id ?? "")

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: "-25% 0px -65% 0px" }
    )
    for (const { id } of items) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  return (
    <div className="sticky top-16 lg:top-12 z-30 border-b border-border/60 bg-background shadow-[0_12px_32px_-24px_rgba(0,0,0,0.65)]">
      <div className="mx-auto max-w-[1400px] px-0 sm:px-8 lg:px-10 flex sm:grid sm:grid-cols-5 items-stretch overflow-x-auto sm:overflow-visible scrollbar-thin">
        {items.map(({ id, label }, i) => (
          <button
            key={id}
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={cn(
              "relative shrink-0 sm:shrink sm:flex-1 flex items-center justify-center px-4 py-3.5 text-[11px] font-mono tracking-[0.18em] uppercase transition-colors whitespace-nowrap",
              active === id ? "text-violet-200" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-[9px] text-muted-foreground/50 mr-1.5">{String(i + 1).padStart(2, "0")}</span>
            {label}
            {active === id && (
              <motion.span
                layoutId="gx-section-nav-underline"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[72%] max-w-40 h-[2px] bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Helper: safeParseTags — comma-separated string -> string[]
// ============================================================
function safeParseTags(tags?: string | null): string[] {
  if (!tags) return []
  return tags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

// Load the Razorpay checkout SDK script
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("razorpay-script")
    if (existing) { resolve(); return }
    const script = document.createElement("script")
    script.id = "razorpay-script"
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
    document.body.appendChild(script)
  })
}

// ============================================================
// MAIN VIEW
// ============================================================
export function CourseDetailView() {
  const { view, navigate } = useAppStore()
  const courseId = view.name === "course" ? view.courseId : ""
  const { user } = useUser()
  const qc = useQueryClient()
  const { formatPrice, isINR, currencyCode } = useCurrencyHook()

  // Refs for floating CTA visibility tracking
  const enrollCardRef = React.useRef<HTMLDivElement>(null)
  const [showFloatingCta, setShowFloatingCta] = React.useState(false)

  const { data, isLoading, isError, refetch } = useQuery<CourseDetail>({
    queryKey: ["course", courseId],
    queryFn: () => api(`/api/courses/${courseId}`),
    enabled: !!courseId,
    retry: 1,
  })

  const enrollMutation = useMutation({
    mutationFn: () => api(`/api/courses/${courseId}/enroll`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Enrolled! Redirecting to My Learning…")
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["courses"] })
      qc.invalidateQueries({ queryKey: ["me"] })
      setTimeout(() => navigate({ name: "learning" }), 600)
    },
    onError: (e: any) => toast.error(e.message),
  })

  /* ============ Checkout dialog (paid course flow) ============ */
  // When a course has price > 0, the "Enroll Now" button opens a checkout dialog
  // instead of free-enrolling directly. The dialog:
  //   1. Shows the original price.
  //   2. Lets the user type a coupon code and apply it (debounced submit).
  //   3. Shows discount + final amount.
  //   4. "Pay Now" calls /api/payment/create-order + /api/payment/verify (mock).
  //   5. On success: toast + redirect to /learning (enrollment is auto-created
  //      by the verify endpoint).
  const [checkoutOpen, setCheckoutOpen] = React.useState(false)
  const [couponCode, setCouponCode] = React.useState("")
  const [couponState, setCouponState] = React.useState<
    | { status: "idle" }
    | { status: "applied"; discount: number; finalAmount: number; type: string; value: number; code: string }
    | { status: "error"; message: string }
  >({ status: "idle" })

  const applyCouponMutation = useMutation({
    mutationFn: (vars: { code: string; amount: number }) =>
      api<{ valid: boolean; discount?: number; finalAmount?: number; type?: string; value?: number; code?: string; error?: string }>(
        "/api/coupons/verify",
        { method: "POST", body: JSON.stringify({ code: vars.code, courseId, amount: vars.amount }) },
      ),
    onSuccess: (data) => {
      if (!data.valid) {
        setCouponState({ status: "error", message: data.error || "Invalid coupon" })
        return
      }
      setCouponState({
        status: "applied",
        discount: data.discount ?? 0,
        finalAmount: data.finalAmount ?? 0,
        type: data.type ?? "percentage",
        value: data.value ?? 0,
        code: data.code ?? "",
      })
      toast.success(`Coupon applied — ${data.type === "percentage" ? `${data.value}% off` : `₹${data.value} off`}`)
    },
    onError: (e: any) => {
      setCouponState({ status: "error", message: e.message || "Failed to apply coupon" })
    },
  })

  const payMutation = useMutation({
    mutationFn: (vars: { couponCode?: string }) =>
      api<{ orderId: string; amount: number; currency: string; razorpayOrderId: string; keyId: string | null; mock: boolean }>(
        "/api/payment/create-order",
        {
          method: "POST",
          body: JSON.stringify({ courseId, couponCode: vars.couponCode }),
        },
      ).then(async (createRes) => {
        if (createRes.mock) {
          // Mock mode — no Razorpay keys configured
          const razorpayPaymentId = `pay_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
          const razorpaySignature = `sig_mock_${Math.random().toString(36).slice(2, 14)}`
          const verifyRes = await api<{ success: boolean; enrollment: any }>(
            "/api/payment/verify",
            {
              method: "POST",
              body: JSON.stringify({ orderId: createRes.orderId, razorpayPaymentId, razorpaySignature }),
            },
          )
          return { ...verifyRes, paidAmount: createRes.amount }
        }

        // Real Razorpay — load the SDK + open the checkout modal
        await loadRazorpayScript()
        return new Promise<{ success: boolean; enrollment: any; paidAmount: number }>((resolve, reject) => {
          // @ts-ignore
          const rzp = new window.Razorpay({
            key: createRes.keyId,
            amount: Math.round(createRes.amount * 100), // paise
            currency: createRes.currency,
            name: "GuardianX Academy",
            description: course?.title || "Course Enrollment",
            order_id: createRes.razorpayOrderId,
            handler: async (response: any) => {
              try {
                const verifyRes = await api<{ success: boolean; enrollment: any }>(
                  "/api/payment/verify",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      orderId: createRes.orderId,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    }),
                  },
                )
                resolve({ ...verifyRes, paidAmount: createRes.amount })
              } catch (e: any) {
                reject(new Error(e?.message || "Payment verification failed"))
              }
            },
            prefill: {
              name: user?.name || "",
              email: user?.email || "",
            },
            theme: { color: "#7c3aed" },
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled")),
            },
          })
          rzp.open()
        })
      }),
    onSuccess: (data) => {
      toast.success("Payment successful! Enrolled — redirecting…")
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["courses"] })
      qc.invalidateQueries({ queryKey: ["me"] })
      setCheckoutOpen(false)
      setCouponCode("")
      setCouponState({ status: "idle" })
      setTimeout(() => navigate({ name: "learning" }), 700)
    },
    onError: (e: any) => {
      toast.error(e.message || "Payment failed")
    },
  })

  function openCheckout() {
    setCouponCode("")
    setCouponState({ status: "idle" })
    setCheckoutOpen(true)
  }

  function handleApplyCoupon(amount: number) {
    if (!couponCode.trim()) {
      setCouponState({ status: "error", message: "Enter a coupon code first" })
      return
    }
    setCouponState({ status: "idle" })
    applyCouponMutation.mutate({ code: couponCode.trim(), amount })
  }

  function handlePayNow() {
    payMutation.mutate({ couponCode: couponState.status === "applied" ? couponState.code : undefined })
  }

  // Prerequisites (existing /enroll GET endpoint)
  const { data: prereqData } = useQuery<{ prerequisites: Prerequisite[] }>({
    queryKey: ["course-prerequisites", courseId],
    queryFn: () => api(`/api/courses/${courseId}/enroll`),
    enabled: !!courseId,
  })
  const prerequisites = prereqData?.prerequisites ?? []

  // Track visibility of the enroll card to show/hide the floating CTA
  React.useEffect(() => {
    const el = enrollCardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show floating CTA only when enroll card is NOT visible AND user has scrolled past 200px
        const scrolled = window.scrollY > 400
        setShowFloatingCta(!entry.isIntersecting && scrolled)
      },
      { threshold: 0, rootMargin: "0px 0px -100px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [data])

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 py-6 lg:py-8 space-y-6">
          <Skeleton className="h-[500px] w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[800px] rounded-2xl" />
            <Skeleton className="h-[800px] rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // Hard failure (both schema tiers exhausted, network down, etc.) — show a
  // real error state instead of a blank page.
  if (isError) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-24">
          <Card className="border-amber-500/30 bg-card/60 backdrop-blur-xl p-10 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">Course couldn&rsquo;t load</h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              The server returned an error while fetching this course. If this persists, the platform database may still be syncing — the catalog itself remains available.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button className="btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border border-violet-500/30" onClick={() => refetch()}>
                Try again <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
              <Button variant="outline" className="border-border/60" onClick={() => navigate({ name: "catalog" })}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1.5" /> Back to catalog
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { course, enrollment, lessonProgress, progressPct, totalLessons, completedLessons } = data
  // Degraded payloads (schema-drift fallback) can lack modules — every
  // dereference below must use this normalized array, never course.modules.
  const courseModules: any[] = Array.isArray(course.modules) ? course.modules : []
  const isEnrolled = !!enrollment

  const goLesson = (lessonId: string, isPreview?: boolean) => {
    // Allow access to preview lessons without enrollment
    if (isPreview) {
      navigate({ name: "lesson", lessonId, courseId })
      return
    }
    if (!isEnrolled) {
      toast.error("Enroll in this course to access lessons. Preview lessons are free!")
      return
    }
    navigate({ name: "lesson", lessonId, courseId })
  }

  const handleEnroll = () => {
    if (!user) {
      navigate({ name: "login" })
      return
    }
    // Paid courses go through the checkout dialog; free courses enroll directly.
    if (course.price && course.price > 0) {
      openCheckout()
      return
    }
    enrollMutation.mutate()
  }

  // Build learning outcomes from longDescription / tags (used by Achievements section)
  const outcomes: string[] = []
  if (course.longDescription) {
    const sentences = course.longDescription.split(/\.\s+/).filter(Boolean).slice(0, 2)
    sentences.forEach((s: string) => outcomes.push(s.trim() + "."))
  }
  if (course.tags) {
    course.tags.split(",").slice(0, 3).forEach((t: string) =>
      outcomes.push("Master " + t.trim().toLowerCase() + " fundamentals and real-world application.")
    )
  }
  while (outcomes.length < 4) {
    outcomes.push("Develop practical, hands-on skills through GuardianX lab exercises.")
  }

  // Course extras — real, admin-authored content (Course Studio → Course Details).
  // Empty lists mean the course was never authored with them; sections then fall
  // back to the derived content above / legacy placeholders.
  const whatYouWillLearn = parseCourseList((course as any).whatYouWillLearn)
  const prerequisiteTexts = parseCourseList((course as any).prerequisites)
  const whoShouldAttend = parseCourseList((course as any).whoShouldAttend)
  const toolsCovered = parseCourseList((course as any).toolsCovered)
  const careerOutcomes = parseCourseList((course as any).careerOutcomes)

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
      <ScrollProgress />

      <div className="relative z-10">
        {/* ====================================================
            1. HERO — cinematic course introduction (8/4 split)
            ==================================================== */}
        <section className="relative overflow-hidden">
          {/* Cinematic backdrop */}
          <div className="absolute inset-0">
            <img
              src={getCourseImage(course)}
              alt={course.title}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
            <div className="absolute inset-0 bg-grid opacity-10" />
          </div>
          <motion.div
            aria-hidden
            className="absolute top-1/4 -right-40 w-[600px] h-[600px] bg-violet-600/15 blur-[140px] rounded-full"
            animate={{ x: [0, -60, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full"
            animate={{ x: [0, 70, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-0 left-1/3 w-[420px] h-[420px] bg-fuchsia-600/10 blur-[130px] rounded-full"
            animate={{ x: [0, 40, 0], y: [0, -50, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Scanline sweep */}
          <motion.div
            aria-hidden
            className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-violet-400/[0.05] to-transparent pointer-events-none"
            animate={{ top: ["-12%", "112%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Ghost shortName — giant outline text */}
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(10rem,30vw,30rem)] font-bold tracking-[-0.08em] text-outline-violet opacity-20 pointer-events-none select-none leading-none whitespace-nowrap"
          >
            {course.shortName}
          </div>

          <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 py-10 lg:py-14">
            {/* Back to catalog */}
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              onClick={() => navigate({ name: "catalog" })}
              className="group inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-violet-300 transition-colors tracking-[0.2em] mb-8"
            >
              <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span className="uppercase">Back to Catalog</span>
            </motion.button>

            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Hero text — col 8 */}
              <motion.div
                className="lg:col-span-7 xl:col-span-8"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}
              >
                <motion.div variants={HERO_ITEM} className="flex items-center gap-2 mb-6 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] font-mono tracking-[0.3em] uppercase", LEVEL_COLORS[course.level])}>
                    {course.level}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono tracking-[0.3em] uppercase border-border/60">
                    {course.category}
                  </Badge>
                  {course.certBody && (
                    <Badge variant="outline" className="text-[10px] font-mono tracking-[0.3em] uppercase border-violet-500/30 text-violet-300">
                      {course.certBody}
                    </Badge>
                  )}
                  {isEnrolled && (
                    <Badge className="text-[10px] font-mono tracking-[0.3em] uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> ENROLLED
                    </Badge>
                  )}
                </motion.div>

                <motion.p variants={HERO_ITEM} className="text-[10px] font-mono text-violet-300 tracking-[0.3em] mb-4">
                  GUARDIANX · {course.shortName}
                </motion.p>

                <motion.h1
                  variants={HERO_ITEM}
                  className="text-[clamp(2.5rem,5.5vw,5.25rem)] font-bold leading-[0.94] tracking-[-0.04em] text-balance mb-6"
                >
                  {course.title}
                </motion.h1>

                <motion.p variants={HERO_ITEM} className="text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed text-balance">
                  {course.description}
                </motion.p>

                {/* Meta chips — live-animated key numbers */}
                <motion.div variants={HERO_ITEM} className="mt-7 flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/5 px-3.5 py-1.5 text-xs font-medium text-amber-200">
                    <Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                    {course.rating != null ? <AnimatedNumber value={Number(course.rating)} decimals={1} /> : "—"}
                    <span className="text-amber-200/50">/ 5</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-400/5 px-3.5 py-1.5 text-xs font-medium text-violet-200">
                    <Users className="h-3.5 w-3.5 text-violet-300" />
                    <AnimatedNumber value={course.studentsCount ?? 0} suffix=" learners" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3.5 py-1.5 text-xs font-medium text-cyan-200">
                    <Clock className="h-3.5 w-3.5 text-cyan-300" />
                    {course.durationHours ?? 0}h content
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/5 px-3.5 py-1.5 text-xs font-medium text-emerald-200">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
                    {courseModules.length} modules · {totalLessons} lessons
                  </span>
                </motion.div>

                {/* Instructor info inline */}
                <motion.div variants={HERO_ITEM} className="mt-6 flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-violet-500/30 ring-2 ring-violet-500/10">
                    <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs font-mono">
                      {(course.instructor?.name ?? "GuardianX Faculty").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">INSTRUCTOR</p>
                    <p className="text-sm font-medium">
                      {course.instructor?.name ?? "GuardianX Faculty"}
                      {course.instructor?.title && <span className="text-muted-foreground font-normal"> · {course.instructor.title}</span>}
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Hero right column — enroll / progress card */}
              <motion.div
                className="lg:col-span-5 xl:col-span-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                ref={enrollCardRef}
              >
                <Card className="relative overflow-hidden border-violet-500/20 bg-card/60 backdrop-blur-xl p-6 shadow-[0_0_80px_-24px_rgba(139,92,246,0.45)] transition-shadow duration-500 hover:shadow-[0_0_110px_-20px_rgba(139,92,246,0.6)]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
                  <div className="absolute -top-16 -right-16 w-40 h-40 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

                  {/* Text prerequisites — real, admin-authored (Course Studio) */}
                  {prerequisiteTexts.length > 0 && (
                    <div className="mb-5 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-300 mb-2 tracking-[0.2em] font-mono">
                        <AlertTriangle className="h-3.5 w-3.5" /> BEFORE YOU START
                      </div>
                      <ul className="space-y-1">
                        {prerequisiteTexts.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-cyan-300/70 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isEnrolled ? (
                    <div className="space-y-5">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1">YOUR PROGRESS</p>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-4xl font-bold text-violet-200 tabular-nums">
                            {progressPct}%
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-1.5 bg-muted" />
                        <div className="text-xs text-muted-foreground mt-2 font-mono">
                          {completedLessons} OF {totalLessons} LESSONS COMPLETED
                        </div>
                      </div>

                      {progressPct === 100 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                          <Award className="h-4 w-4 shrink-0" />
                          <span>Course completed · Certificate issued</span>
                        </div>
                      )}

                      <div>
                        <Button
                          className="w-full btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border border-violet-500/30"
                          onClick={() => {
                            for (const m of courseModules) {
                              for (const l of m.lessons) {
                                if (!lessonProgress[l.id]?.completed) {
                                  goLesson(l.id, l.preview)
                                  return
                                }
                              }
                            }
                            goLesson(courseModules[0]?.lessons[0]?.id)
                          }}
                        >
                          <PlayCircle className="h-4 w-4 mr-1.5" /> {progressPct > 0 ? "Continue Learning" : "Start Learning"}
                        </Button>
                      </div>

                      <Button variant="outline" className="w-full border-border/60" onClick={() => navigate({ name: "learning" })}>
                        <BarChart3 className="h-4 w-4 mr-1.5" /> My Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="text-center pb-2">
                        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1">ONE-TIME PAYMENT</p>
                        <div className="text-5xl font-bold text-gradient-premium tabular-nums">{formatPrice(course.price)}</div>
                      </div>

                      {prerequisites.length > 0 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-300 mb-2 tracking-[0.2em] font-mono">
                            <AlertTriangle className="h-3.5 w-3.5" /> PREREQUISITES
                          </div>
                          <div className="space-y-1.5">
                            {prerequisites.map((p) => (
                              <div key={p.id} className="flex items-center gap-2 text-xs">
                                <Link2 className="h-3 w-3 text-amber-300/70 shrink-0" />
                                <span className="font-medium truncate flex-1">{p.title}</span>
                                <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono">{p.shortName}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Button
                          className="w-full btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border border-violet-500/30"
                          onClick={handleEnroll}
                          disabled={enrollMutation.isPending}
                        >
                          <GraduationCap className="h-4 w-4 mr-1.5" /> {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
                        </Button>
                      </div>

                      <BookmarkButton courseId={course.id} />

                      <div className="space-y-2 text-xs text-muted-foreground pt-2">
                        <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Full lifetime access</div>
                        <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-emerald-300" /> PDF study materials</div>
                        <div className="flex items-center gap-2"><Award className="h-3.5 w-3.5 text-emerald-300" /> Certificate of completion</div>
                        <div className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-emerald-300" /> Community discussions</div>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ====================================================
            1b. STICKY SECTION NAV — scroll-spy anchor bar
            ==================================================== */}
        <StickySectionNav items={SECTION_NAV_ITEMS} />

        {/* ====================================================
            2. STATS HERO BAR — 4 animated stat tiles with count-up
            ==================================================== */}
        <StatsHeroBar course={course} />

        {/* ====================================================
            3. METADATA STRIP — animated 7-column grid
            ==================================================== */}
        <section className="border-y border-border/60 bg-background/40 backdrop-blur">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 py-6 lg:py-8">
            <Reveal>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
                {[
                  { label: "CATEGORY", icon: Layers, value: course.category },
                  { label: "LEVEL", icon: Target, value: course.level },
                  { label: "DURATION", icon: Clock, value: <AnimatedNumber value={course.durationHours ?? 0} suffix="h" /> },
                  { label: "RATING", icon: Star, value: course.rating != null ? <AnimatedNumber value={Number(course.rating)} decimals={1} /> : "—" },
                  { label: "STUDENTS", icon: Users, value: <AnimatedNumber value={course.studentsCount ?? 0} /> },
                  { label: "MODULES", icon: BookOpen, value: courseModules.length },
                  { label: "LESSONS", icon: FileText, value: <AnimatedNumber value={totalLessons} /> },
                ].map((m, i) => (
                  <div key={m.label} className="group rounded-xl border border-border/40 bg-card/40 p-3 lg:p-4 hover:border-violet-500/40 hover:bg-card/60 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-mono text-muted-foreground/50 tracking-[0.2em]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <m.icon className="h-3 w-3 text-violet-300/70 group-hover:text-violet-300 transition-colors" />
                    </div>
                    <div className="text-lg lg:text-2xl font-bold tabular-nums">{m.value}</div>
                    <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ====================================================
            4. WHAT YOU'LL ACHIEVE — visual achievement cards
            ==================================================== */}
        <div id="gx-overview" className="scroll-mt-28 lg:scroll-mt-24">
          <AchievementCollection course={course} outcomes={outcomes} whatYouWillLearn={whatYouWillLearn} toolsCovered={toolsCovered} careerOutcomes={careerOutcomes} />
        </div>

        {/* ====================================================
            5. ANIMATED SKILL PROGRESSION CHART (Before vs After)
            ==================================================== */}
        <div id="gx-skills" className="scroll-mt-28 lg:scroll-mt-24">
          <SkillProgressionChart tags={course.tags} />
        </div>

        {/* ====================================================
            6. CAREER PATH INTEGRATION
            ==================================================== */}
        <CareerPathSection courseId={course.id} courseTitle={course.title} courseLevel={course.level} />

        {/* ====================================================
            7. INTERACTIVE CURRICULUM TIMELINE
            ==================================================== */}
        <div id="gx-curriculum" className="scroll-mt-28 lg:scroll-mt-24">
          <CurriculumTimeline
            course={course}
            isEnrolled={isEnrolled}
            lessonProgress={lessonProgress}
            goLesson={goLesson}
            totalLessons={totalLessons}
            completedLessons={completedLessons}
          />
        </div>

        {/* ====================================================
            8. IS THIS COURSE RIGHT FOR YOU?
            ==================================================== */}
        <FitChecklist level={course.level} category={course.category} whoShouldAttend={whoShouldAttend} />

        {/* ====================================================
            9. COURSE DIFFICULTY METER
            ==================================================== */}
        <DifficultyMeter durationHours={course.durationHours} modules={courseModules} />

        {/* ====================================================
            10. REAL STUDENT PROJECTS SHOWCASE
            ==================================================== */}
        <StudentProjectsShowcase labs={course.labs ?? []} category={course.category} />

        {/* ====================================================
            11. LAB INTEGRATION PREVIEW
            ==================================================== */}
        <LabIntegrationPreview labs={course.labs ?? []} isEnrolled={isEnrolled} navigate={navigate} />

        {/* ====================================================
            12. LIVE BATCH SCHEDULE PREVIEW
            ==================================================== */}
        <BatchSchedulePreview courseId={course.id} user={user} navigate={navigate} />

        {/* ====================================================
            13. INSTRUCTOR SPOTLIGHT CARD
            ==================================================== */}
        <div id="gx-instructor" className="scroll-mt-28 lg:scroll-mt-24">
          <InstructorSpotlight instructor={course.instructor} navigate={navigate} />
        </div>

        {/* ====================================================
            14. CERTIFICATION EXAM BLUEPRINT
            ==================================================== */}
        <CertExamBlueprint course={course} />

        {/* ====================================================
            15. PREREQUISITES VISUAL GRAPH
            ==================================================== */}
        <PrerequisitesGraph
          course={course}
          prerequisites={prerequisites}
          user={user}
          navigate={navigate}
        />

        {/* ====================================================
            16. LIVE "WHO'S ENROLLED" ACTIVITY FEED
            ==================================================== */}
        <ActivityFeed courseId={course.id} />

        {/* ====================================================
            17. SKILLS YOU'LL EARN (TAG CLOUD)
            ==================================================== */}
        <SkillsTagCloud tags={course.tags} modules={courseModules} />

        {/* ====================================================
            REVIEWS — kept from existing implementation
            ==================================================== */}
        <div id="gx-reviews" className="scroll-mt-28 lg:scroll-mt-24">
          <ReviewsSection courseId={course.id} isEnrolled={isEnrolled} />
        </div>

        {/* ====================================================
            18. RELATED COURSES CAROUSEL
            ==================================================== */}
        <RelatedCoursesCarousel courseId={course.id} navigate={navigate} />

        {/* ====================================================
            19. FINAL CTA — atmospheric
            ==================================================== */}
        <section className="py-10 lg:py-14 border-t border-border/60 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="w-full h-full opacity-15 bg-grid" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/10 blur-[140px] rounded-full" />

          <Reveal>
            <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-[10px] font-mono text-violet-300 tracking-[0.3em] mb-6">READY?</p>
              <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.92] tracking-[-0.04em] text-balance mb-6">
              {isEnrolled ? (
                <>Continue your <span className="text-gradient-premium">journey.</span></>
              ) : (
                <>Begin your <span className="text-gradient-premium">ascent.</span></>
              )}
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
              {isEnrolled
                ? `You're ${progressPct}% through this course. Keep the momentum going.`
                : "Join thousands of security professionals mastering their craft on GuardianX."}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {isEnrolled ? (
                <Button
                  size="lg"
                  className="btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border border-violet-500/30 h-12 px-8 text-base"
                  onClick={() => {
                    for (const m of courseModules) {
                      for (const l of m.lessons) {
                        if (!lessonProgress[l.id]?.completed) {
                          goLesson(l.id, l.preview)
                          return
                        }
                      }
                    }
                    goLesson(courseModules[0]?.lessons[0]?.id)
                  }}
                >
                  <PlayCircle className="h-5 w-5 mr-2" /> Continue Learning
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border border-violet-500/30 h-12 px-8 text-base"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                >
                  <GraduationCap className="h-5 w-5 mr-2" /> {enrollMutation.isPending ? "Enrolling..." : `Enroll for ${formatPrice(course.price)}`}
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="border-border/60 h-12 px-8 text-base"
                onClick={() => navigate({ name: "catalog" })}
              >
                Browse Catalog <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Share buttons */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider">SHARE:</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success("Course link copied!")
                }}
              >
                <Copy className="h-3 w-3 mr-1.5" /> Copy Link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-emerald-400 hover:text-emerald-300"
                onClick={() => {
                  const text = `Check out this course: ${course.title} at GuardianX Academy. ${window.location.href}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
                }}
              >
                <MessageCircle className="h-3 w-3 mr-1.5" /> WhatsApp
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-[#0A66C2] hover:text-[#0A66C2]"
                onClick={() => {
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer")
                }}
              >
                <Linkedin className="h-3 w-3 mr-1.5" /> LinkedIn
              </Button>
            </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* ====================================================
          20. FLOATING ENROLL CTA — sticky bottom bar
          ==================================================== */}
      <FloatingEnrollCTA
        course={course}
        isEnrolled={isEnrolled}
        onEnroll={handleEnroll}
        onContinue={() => {
          for (const m of courseModules) {
            for (const l of m.lessons) {
              if (!lessonProgress[l.id]?.completed) {
                goLesson(l.id, l.preview)
                return
              }
            }
          }
          goLesson(courseModules[0]?.lessons[0]?.id)
        }}
        isEnrolling={enrollMutation.isPending}
        visible={showFloatingCta && !isEnrolled}
        progressPct={progressPct}
        formatPrice={formatPrice}
      />

      {/* ====================================================
          21. CHECKOUT DIALOG — paid course enrollment
          ==================================================== */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        course={course}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        couponState={couponState}
        onApplyCoupon={() => handleApplyCoupon(course.price ?? 0)}
        onPayNow={handlePayNow}
        isApplyingCoupon={applyCouponMutation.isPending}
        isPaying={payMutation.isPending}
      />
    </div>
  )
}

// ============================================================
// 21b. CheckoutDialog — Razorpay-style payment dialog
// ============================================================
function CheckoutDialog({
  open,
  onOpenChange,
  course,
  couponCode,
  setCouponCode,
  couponState,
  onApplyCoupon,
  onPayNow,
  isApplyingCoupon,
  isPaying,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: any
  couponCode: string
  setCouponCode: (s: string) => void
  couponState:
    | { status: "idle" }
    | { status: "applied"; discount: number; finalAmount: number; type: string; value: number; code: string }
    | { status: "error"; message: string }
  onApplyCoupon: () => void
  onPayNow: () => void
  isApplyingCoupon: boolean
  isPaying: boolean
}) {
  const { formatPrice, isINR } = useCurrencyHook()
  const originalPrice = Number(course?.price ?? 0)
  const applied = couponState.status === "applied"
  const discount = applied ? couponState.discount : 0
  const finalAmount = applied ? couponState.finalAmount : originalPrice
  const discountPct = applied && originalPrice > 0
    ? Math.round((discount / originalPrice) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure Checkout
          </DialogTitle>
          <DialogDescription>
            You're enrolling in <span className="font-medium text-foreground">{course?.title}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order summary card */}
          <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Course</div>
                <div className="font-semibold text-sm leading-snug truncate">{course?.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{course?.shortName} · {course?.category}</div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider border-violet-500/30 text-violet-300 shrink-0">
                One-time
              </Badge>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Original price</span>
                <span className="font-mono tabular-nums">{formatPrice(originalPrice)}</span>
              </div>
              {applied && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Percent className="h-3 w-3" /> Discount ({couponState.type === "percentage" ? `${couponState.value}%` : formatPrice(couponState.value)})
                    </span>
                    <span className="font-mono tabular-nums text-emerald-300">− {formatPrice(discount)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Ticket className="h-3 w-3 text-emerald-300" />
                    Code <span className="font-mono font-semibold tracking-wider">{couponState.code}</span> applied ({discountPct}% off)
                  </div>
                </>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-sm font-medium">Total payable</span>
                <span className="text-2xl font-bold tabular-nums text-gradient-premium">
                  {formatPrice(finalAmount)}
                </span>
              </div>
              {/* INR payment note for non-INR users */}
              {!isINR && (
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                  <ShieldCheck className="h-3 w-3 text-violet-300" />
                  Payment processed in INR (₹{finalAmount.toLocaleString("en-IN")}). Your bank will convert at their rate.
                </div>
              )}
            </div>
          </div>

          {/* Coupon code input */}
          <div className="space-y-2">
            <Label htmlFor="coupon-input" className="text-xs font-medium flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-violet-300" /> Have a coupon code?
            </Label>
            <div className="flex gap-2">
              <Input
                id="coupon-input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="WELCOME50"
                className="font-mono uppercase tracking-wider bg-background/60 border-border/60 flex-1"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isApplyingCoupon) {
                    e.preventDefault()
                    onApplyCoupon()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onApplyCoupon}
                disabled={isApplyingCoupon || isPaying || !couponCode.trim()}
                className="border-border/60 shrink-0"
              >
                {isApplyingCoupon ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Ticket className="h-3.5 w-3.5 mr-1.5" />
                )}
                Apply
              </Button>
            </div>
            {couponState.status === "error" && (
              <p className="text-[11px] text-rose-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {couponState.message}
              </p>
            )}
            {applied && (
              <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Coupon applied successfully.
              </p>
            )}
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Secured by Razorpay · Payments are encrypted end-to-end.</span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border/60" disabled={isPaying}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onPayNow}
            disabled={isPaying}
            className="bg-violet-600 hover:bg-violet-500 text-violet-50 btn-premium"
          >
            {isPaying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isPaying ? "Processing…" : `Pay ${formatPrice(finalAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// 2. STATS HERO BAR
// ============================================================
function StatsHeroBar({ course }: { course: any }) {
  const stats = [
    {
      label: "Students Enrolled",
      value: course.studentsCount ?? 0,
      icon: Users,
      color: "text-violet-300",
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      decimals: 0,
      suffix: "",
    },
    {
      label: "Course Rating",
      value: course.rating ?? 0,
      icon: Star,
      color: "text-amber-300",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      decimals: 1,
      suffix: "/5",
    },
    {
      label: "Completion Rate",
      value: 87,
      icon: TrendingUp,
      color: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      decimals: 0,
      suffix: "%",
    },
    {
      label: "Career Advancement",
      value: 73,
      icon: Briefcase,
      color: "text-cyan-300",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      decimals: 0,
      suffix: "%",
    },
  ]

  return (
    <section className="relative -mt-2 pb-6 lg:pb-8">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative rounded-2xl border bg-card/60 backdrop-blur p-4 lg:p-5 overflow-hidden group",
                s.border
              )}
            >
              <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none opacity-40", s.bg)} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                    <s.icon className={cn("h-4 w-4", s.color)} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/50 tracking-[0.2em]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold leading-none">
                  <AnimatedNumber
                    value={s.value}
                    decimals={s.decimals}
                    suffix={s.suffix}
                    className={s.color}
                  />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mt-1.5">
                  {s.label.toUpperCase()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 4. WHAT YOU'LL ACHIEVE — Badge Collection
// ============================================================
function AchievementCollection({
  course,
  outcomes,
  whatYouWillLearn,
  toolsCovered,
  careerOutcomes,
}: {
  course: any
  outcomes: string[]
  whatYouWillLearn: string[]
  toolsCovered: string[]
  careerOutcomes: string[]
}) {
  // Real, admin-authored "What you will learn" list (Course Studio → Course
  // Details) — rendered as a checklist. Falls back to the derived cards below
  // for courses that were never authored with extras.
  if (whatYouWillLearn.length > 0) {
    return (
      <section className="py-8 lg:py-10 border-t border-border/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
          <div className="max-w-2xl mb-6">
            <SectionLabel index="01" className="text-violet-300">OUTCOMES</SectionLabel>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
              What you&apos;ll
              <span className="text-gradient-premium"> learn.</span>
            </h2>
            <p className="text-muted-foreground mt-6 leading-relaxed">
              Everything you&apos;ll be able to do by the end of this course.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {whatYouWillLearn.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 hover:border-violet-500/40 hover:bg-card/60 transition-all"
              >
                <div className="mt-0.5 h-6 w-6 shrink-0 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-300" />
                </div>
                <p className="text-sm leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>

          {(toolsCovered.length > 0 || careerOutcomes.length > 0) && (
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {toolsCovered.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Code className="h-4 w-4 text-cyan-300" />
                    <h3 className="text-sm font-semibold">Tools you&apos;ll use</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {toolsCovered.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[11px] py-1 border-cyan-500/30 bg-cyan-500/10 text-cyan-200">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {careerOutcomes.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    <h3 className="text-sm font-semibold">Career outcomes</h3>
                  </div>
                  <ul className="space-y-2">
                    {careerOutcomes.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="h-3.5 w-3.5 text-amber-300/70 shrink-0 mt-0.5" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    )
  }

  // Build 3-6 achievement cards from outcomes + tags
  const tags = safeParseTags(course.tags)
  const cards: { icon: any; title: string; description: string }[] = []

  // Use the first 3-5 tags as achievements
  tags.slice(0, 5).forEach((tag, i) => {
    const Icon = ACHIEVEMENT_ICONS[i % ACHIEVEMENT_ICONS.length]
    cards.push({
      icon: Icon,
      title: `Master ${tag}`,
      description: `Hands-on expertise in ${tag.toLowerCase()} — from fundamentals to advanced real-world scenarios.`,
    })
  })

  // Pad with outcomes if we have fewer than 3
  while (cards.length < 3 && outcomes.length > 0) {
    const idx = cards.length
    const Icon = ACHIEVEMENT_ICONS[idx % ACHIEVEMENT_ICONS.length]
    cards.push({
      icon: Icon,
      title: idx === 0 ? "Industry-Ready Skills" : "Practical Mastery",
      description: outcomes[idx] ?? "Build hands-on competence through real lab exercises.",
    })
  }

  // Fallback to 4 generic achievements if nothing available
  if (cards.length === 0) {
    cards.push(
      { icon: Shield, title: "Defensive Mastery", description: "Build defensive security skills across modern infrastructures." },
      { icon: Target, title: "Threat Detection", description: "Identify, analyze, and mitigate security threats effectively." },
      { icon: Code, title: "Hands-on Tools", description: "Use industry-standard tools with confidence in real scenarios." },
      { icon: Trophy, title: "Certification Ready", description: "Walk into the certification exam fully prepared." },
    )
  }

  return (
    <section className="py-8 lg:py-10 border-t border-border/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="01" className="text-violet-300">OUTCOMES</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            What you&apos;ll
            <span className="text-gradient-premium"> achieve.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            Every lesson builds toward verifiable, hands-on competence. Earn a LEVEL UP
            badge for each milestone you complete.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6 hover:border-violet-500/40 hover:bg-card/60 transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl rounded-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/30">
                    <card.icon className="h-5 w-5 text-violet-300" />
                  </div>
                  <Badge className="text-[9px] font-mono tracking-[0.2em] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Zap className="h-2.5 w-2.5 mr-1" /> LEVEL UP
                  </Badge>
                </div>
                <h3 className="text-base lg:text-lg font-bold mb-2 tracking-tight">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 5. ANIMATED SKILL PROGRESSION CHART (Before vs After)
// ============================================================
function SkillProgressionChart({ tags }: { tags?: string | null }) {
  const skills = safeParseTags(tags).slice(0, 6)
  if (skills.length === 0) {
    return (
      <section className="py-8 lg:py-10 border-t border-border/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
          <SectionLabel index="02" className="text-emerald-300">SKILL PROGRESSION</SectionLabel>
          <p className="text-muted-foreground">Skill progression data available after enrollment.</p>
        </div>
      </section>
    )
  }

  // Deterministic pseudo-random percentages derived from skill name length + index
  const skillBars = skills.map((skill, i) => {
    const seed = skill.length + i * 7
    const beforePct = 10 + (seed % 21) // 10-30
    const afterPct = 70 + ((seed * 3) % 26) // 70-95
    return { skill, beforePct, afterPct, i }
  })

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="02" className="text-emerald-300">SKILL PROGRESSION</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Before vs
            <span className="text-gradient-premium"> after.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            Watch your skill levels transform. Bars animate as you scroll — see the
            measurable jump from beginner to practitioner.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {skillBars.map((bar) => (
            <motion.div
              key={bar.skill}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: bar.i * 0.06 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Brain className="h-4 w-4 text-emerald-300" />
                  </div>
                  <span className="font-semibold text-sm lg:text-base">{bar.skill}</span>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono text-emerald-300 border-emerald-500/30 tracking-wider">
                  +{bar.afterPct - bar.beforePct}%
                </Badge>
              </div>

              {/* Before bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground tracking-wider mb-1.5">
                  <span>BEFORE</span>
                  <span className="tabular-nums">{bar.beforePct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40"
                    style={{ width: `${bar.beforePct}%` }}
                  />
                </div>
              </div>

              {/* After bar — animated */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-wider mb-1.5">
                  <span className="text-emerald-300">AFTER</span>
                  <span className="tabular-nums text-emerald-300">{bar.afterPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${bar.afterPct}%` }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1, delay: 0.2 + bar.i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 6. CAREER PATH INTEGRATION
// ============================================================
interface LearningPath {
  id: string
  title: string
  slug: string
  description?: string
  courses: string[]
  skills?: string[]
  level?: string
}
function CareerPathSection({
  courseId,
  courseTitle,
  courseLevel,
}: {
  courseId: string
  courseTitle: string
  courseLevel: string
}) {
  const navigate = useAppStore((s) => s.navigate)
  const { data } = useQuery<{ learningPaths: LearningPath[]; count: number }>({
    queryKey: ["learning-paths-for-course", courseId],
    queryFn: () => api(`/api/learning-paths`),
    enabled: !!courseId,
  })

  const matchingPaths = (data?.learningPaths ?? []).filter((p) =>
    Array.isArray(p.courses) && p.courses.includes(courseId)
  )

  // Visual path nodes — Beginner → This Course → Advanced → Certification
  const pathNodes = [
    { icon: Sparkles, label: "Beginner", sub: "Foundations", color: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
    { icon: Target, label: "This Course", sub: courseLevel, color: "text-violet-300", border: "border-violet-500/40", bg: "bg-violet-500/10", highlight: true },
    { icon: Rocket, label: "Advanced", sub: "Specialization", color: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/10" },
    { icon: Award, label: "Certification", sub: "Industry-recognized", color: "text-cyan-300", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
  ]

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="03" className="text-cyan-300">CAREER PATH</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            This course is
            <span className="text-gradient-premium"> part of.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            A guided journey from foundations to certified practitioner. Click any node
            to explore the full learning path.
          </p>
        </div>

        {/* Visual path — 4 nodes with arrows */}
        <div className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 relative">
            {pathNodes.map((node, i) => (
              <motion.button
                key={node.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate({ name: "learning-paths" })}
                className={cn(
                  "group relative rounded-2xl border bg-card/40 backdrop-blur p-5 text-left transition-all hover:bg-card/60 hover:scale-[1.02]",
                  node.border,
                  node.highlight && "ring-2 ring-violet-500/40"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", node.bg)}>
                    <node.icon className={cn("h-5 w-5", node.color)} />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="text-base font-bold mb-0.5">{node.label}</div>
                <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
                  {node.sub}
                </div>
                {node.highlight && (
                  <div className="mt-3 text-[10px] font-mono text-violet-300 tracking-wider truncate">
                    {courseTitle.length > 28 ? courseTitle.slice(0, 28) + "…" : courseTitle}
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Connecting arrows — desktop only */}
          <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none">
            {[25, 50, 75].map((left) => (
              <div key={left} className="absolute -translate-x-1/2" style={{ left: `${left}%` }}>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Matching learning paths (if any) */}
        {matchingPaths.length > 0 && (
          <div className="mt-6 pt-8 border-t border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-4">
              OFFICIAL LEARNING PATHS THAT INCLUDE THIS COURSE
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchingPaths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate({ name: "learning-paths" })}
                  className="group text-left rounded-xl border border-border/60 bg-card/30 p-4 hover:border-violet-500/40 hover:bg-card/50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crosshair className="h-4 w-4 text-violet-300" />
                    <span className="text-sm font-semibold group-hover:text-violet-200 transition-colors">{p.title}</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                  {p.skills && p.skills.length > 0 && (
                    <div className="text-[10px] font-mono text-muted-foreground/60 tracking-wider mt-2">
                      {p.skills.length} SKILLS · {p.courses.length} COURSES
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================================
// 7. INTERACTIVE CURRICULUM TIMELINE
// ============================================================
function CurriculumTimeline({
  course,
  isEnrolled,
  lessonProgress,
  goLesson,
  totalLessons,
  completedLessons,
}: {
  course: any
  isEnrolled: boolean
  lessonProgress: Record<string, { completed: boolean; position: number }>
  goLesson: (lessonId: string, isPreview?: boolean) => void
  totalLessons: number
  completedLessons: number
}) {
  // Degraded payloads can lack modules — normalize locally.
  const courseModules: any[] = Array.isArray(course.modules) ? course.modules : []
  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-6">
          <div>
            <SectionLabel index="04" className="text-violet-300">CURRICULUM TIMELINE</SectionLabel>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
              Modules &amp;
              <span className="text-muted-foreground/50"> lessons.</span>
            </h2>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
            <div>
              <span className="text-violet-300 font-bold text-lg">{courseModules.length}</span> MODULES
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="text-violet-300 font-bold text-lg">{totalLessons}</span> LESSONS
            </div>
            {isEnrolled && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-emerald-300 font-bold text-lg">{completedLessons}</span> DONE
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeline wrapper — vertical connecting line on the left */}
        <div className="relative">
          {/* Vertical line — desktop only */}
          <div className="hidden lg:block absolute left-[26px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-border/40 to-transparent" />

          <Accordion type="multiple" defaultValue={[courseModules[0]?.id]} className="space-y-4 lg:pl-0">
            {courseModules.map((m: any, mi: number) => {
              const moduleDone = m.lessons.filter((l: any) => lessonProgress[l.id]?.completed).length
              const modulePct = m.lessons.length > 0 ? (moduleDone / m.lessons.length) * 100 : 0
              const moduleMins = m.lessons.reduce((acc: number, l: any) => acc + (l.durationMin || 0), 0)
              const moduleHours = Math.floor(moduleMins / 60)
              const moduleMinsRem = moduleMins % 60
              const estTime = moduleHours > 0
                ? `${moduleHours}h${moduleMinsRem > 0 ? ` ${moduleMinsRem}m` : ""}`
                : `${moduleMinsRem}m`

              return (
                <AccordionItem
                  key={m.id}
                  value={m.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 backdrop-blur transition-colors hover:border-violet-500/30 data-[state=open]:border-violet-500/40 lg:pl-12"
                >
                  {/* Timeline node — desktop only */}
                  <div className="hidden lg:flex absolute left-[14px] top-7 z-10 h-6 w-6 items-center justify-center rounded-full border-2 border-violet-500/40 bg-card">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      modulePct === 100 ? "bg-emerald-400" : modulePct > 0 ? "bg-violet-400" : "bg-muted-foreground/40"
                    )} />
                  </div>

                  <AccordionTrigger className="px-5 lg:px-6 py-5 hover:no-underline hover:bg-violet-500/[0.02]">
                    <div className="flex items-center gap-4 text-left flex-1 min-w-0">
                      {/* Mobile number badge */}
                      <div className="lg:hidden relative shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 font-mono text-sm font-bold text-violet-200">
                          {String(mi + 1).padStart(2, "0")}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base lg:text-lg tracking-tight truncate">{m.title}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="font-mono tracking-wider">{m.lessons.length} LESSONS</span>
                          <span className="font-mono tracking-wider">{estTime}</span>
                          {moduleDone > 0 && (
                            <span className="font-mono tracking-wider text-emerald-300">{moduleDone} DONE</span>
                          )}
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      {isEnrolled && modulePct > 0 && (
                        <div className="hidden sm:block w-20">
                          <div className="text-[9px] font-mono text-muted-foreground text-right mb-1">{Math.round(modulePct)}%</div>
                          <div className="h-1 bg-muted overflow-hidden rounded-full">
                            <div
                              className={cn("h-full rounded-full transition-all", modulePct === 100 ? "bg-emerald-400" : "bg-violet-400")}
                              style={{ width: `${modulePct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 lg:px-6 pb-4">
                    <div className="space-y-1 mt-3 border-l border-border/60 ml-6 pl-6">
                      {m.lessons.map((l: any, li: number) => {
                        const Icon = LESSON_ICONS[l.type] ?? FileText
                        const done = lessonProgress[l.id]?.completed
                        const locked = !isEnrolled && !l.preview
                        return (
                          <button
                            key={l.id}
                            onClick={() => goLesson(l.id, l.preview)}
                            className="group/lesson w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-violet-500/5 text-left transition-colors"
                          >
                            <span className="text-[9px] font-mono text-muted-foreground/40 w-6 shrink-0">
                              {String(li + 1).padStart(2, "0")}
                            </span>
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                            ) : locked ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-hover/lesson:text-violet-300 transition-colors" />
                            )}
                            <Icon className={cn("h-4 w-4 shrink-0", done ? "text-emerald-300" : "text-muted-foreground")} />
                            <span className={cn(
                              "flex-1 text-sm truncate transition-colors",
                              done ? "text-muted-foreground line-through" : "group-hover/lesson:text-violet-200"
                            )}>
                              {l.title}
                            </span>
                            {l.preview && !isEnrolled && (
                              <Badge variant="outline" className="text-[9px] text-emerald-300 border-emerald-500/30 font-mono tracking-wider">FREE</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono tracking-wider">{l.durationMin}m</span>
                          </button>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 8. IS THIS COURSE RIGHT FOR YOU?
// ============================================================
function FitChecklist({ level, category, whoShouldAttend }: { level: string; category: string; whoShouldAttend: string[] }) {
  // Generate fit/non-fit items based on level + category
  const fitItems: { text: string; icon: any }[] = []
  const notFitItems: { text: string; icon: any }[] = []

  // Real, admin-authored "Who should attend" list (Course Studio → Course
  // Details) replaces the level-derived fit items when present.
  if (whoShouldAttend.length > 0) {
    whoShouldAttend.forEach((text) => fitItems.push({ text, icon: CheckCircle2 }))
  } else if (level === "Beginner") {
    fitItems.push(
      { text: "You're new to cybersecurity and want a structured entry point", icon: Sparkles },
      { text: "You have basic IT literacy and want to learn security fundamentals", icon: CheckCircle2 },
      { text: `You're curious about ${category.toLowerCase()} and want hands-on practice`, icon: Target },
    )
    notFitItems.push(
      { text: "You're an experienced practitioner seeking advanced specialization", icon: X },
      { text: "You already hold an intermediate certification in this domain", icon: X },
    )
  } else if (level === "Intermediate") {
    fitItems.push(
      { text: "You understand basic networking and TCP/IP fundamentals", icon: CheckCircle2 },
      { text: "You have 1-2 years of IT or security experience", icon: CheckCircle2 },
      { text: `You want to deepen your ${category.toLowerCase()} expertise`, icon: Target },
    )
    notFitItems.push(
      { text: "You're an absolute beginner with no IT background", icon: X },
      { text: "You're looking for an expert-level / red-team curriculum", icon: X },
    )
  } else {
    fitItems.push(
      { text: "You have intermediate security experience and want advanced techniques", icon: CheckCircle2 },
      { text: `You're preparing for a senior ${category.toLowerCase()} role`, icon: Target },
      { text: "You want hands-on lab challenges with real-world complexity", icon: Rocket },
    )
    notFitItems.push(
      { text: "You're new to cybersecurity — start with a Beginner course", icon: X },
      { text: "You're looking for foundational theory without lab work", icon: X },
    )
  }

  return (
    <section className="py-8 lg:py-10 border-t border-border/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="05" className="text-amber-300">FIT CHECK</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Is this course right
            <span className="text-gradient-premium"> for you?</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Good fit */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-6 lg:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-emerald-300 tracking-[0.2em]">GOOD FIT IF</p>
                <h3 className="text-xl font-bold">You&apos;re ready to start</h3>
              </div>
            </div>
            <ul className="space-y-3">
              {fitItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <item.icon className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground/90 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Not ideal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.03] p-6 lg:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30">
                <X className="h-5 w-5 text-rose-300" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-rose-300 tracking-[0.2em]">NOT IDEAL IF</p>
                <h3 className="text-xl font-bold">Consider a different path</h3>
              </div>
            </div>
            <ul className="space-y-3">
              {notFitItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <item.icon className="h-5 w-5 text-rose-300 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground/90 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 9. COURSE DIFFICULTY METER
// ============================================================
function DifficultyMeter({ durationHours, modules }: { durationHours: number; modules: any[] }) {
  const phases = [
    { label: "Foundations", pct: 25, color: "bg-emerald-500", text: "text-emerald-300", icon: Sparkles },
    { label: "Hands-on Labs", pct: 30, color: "bg-amber-500", text: "text-amber-300", icon: FlaskConical },
    { label: "Advanced Topics", pct: 25, color: "bg-orange-500", text: "text-orange-300", icon: Rocket },
    { label: "Exam Prep", pct: 20, color: "bg-rose-500", text: "text-rose-300", icon: Award },
  ]
  const moduleCount = modules?.length ?? 0
  const totalHours = durationHours ?? 0

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-amber-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="06" className="text-amber-300">INTENSITY METER</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            How intense
            <span className="text-gradient-premium"> is this?</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            A snapshot of how the difficulty ramps across the {totalHours} hour journey
            and {moduleCount} modules.
          </p>
        </div>

        {/* Difficulty bar — gradient green → amber → orange → red */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6 lg:p-8">
          {/* Bar */}
          <div className="relative h-4 w-full rounded-full overflow-hidden bg-muted mb-2">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 origin-left bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-rose-500"
            />
            {/* Phase divider marks */}
            {phases.slice(0, -1).map((p, i) => {
              const cumulative = phases.slice(0, i + 1).reduce((acc, ph) => acc + ph.pct, 0)
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-background/40"
                  style={{ left: `${cumulative}%` }}
                />
              )
            })}
          </div>

          {/* Phase labels */}
          <div className="flex justify-between mt-4 flex-wrap gap-2">
            {phases.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", p.color, "bg-opacity-15")}>
                  <p.icon className={cn("h-3.5 w-3.5", p.text)} />
                </div>
                <div>
                  <div className="text-xs font-semibold">{p.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground tracking-wider">{p.pct}% of course</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 10. REAL STUDENT PROJECTS SHOWCASE
// ============================================================
function StudentProjectsShowcase({ labs, category }: { labs: any[]; category: string }) {
  // Derive 3-4 project cards from the course's labs
  const projects = labs.slice(0, 4).map((lab, i) => {
    const estHours = lab.difficulty === "Easy" ? 2 : lab.difficulty === "Medium" ? 4 : 6
    return {
      id: lab.id,
      title: lab.title,
      category: lab.category || category,
      difficulty: lab.difficulty,
      estHours,
      skills: [lab.category, category].filter(Boolean),
    }
  })

  if (projects.length === 0) {
    return null
  }

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="07" className="text-cyan-300">STUDENT PROJECTS</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Build real
            <span className="text-gradient-premium"> projects.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            Hands-on labs derived from real-world scenarios. You&apos;ll graduate with
            a portfolio of demonstrable work.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5 hover:border-cyan-500/40 hover:bg-card/60 transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/5 blur-2xl rounded-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Wrench className="h-4 w-4 text-cyan-300" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-mono tracking-wider",
                    p.difficulty === "Easy" ? "border-emerald-500/30 text-emerald-400" :
                    p.difficulty === "Medium" ? "border-amber-500/30 text-amber-400" :
                    "border-rose-500/30 text-rose-400"
                  )}>
                    {p.difficulty?.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-cyan-200 transition-colors">{p.title}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  Apply {p.category.toLowerCase()} techniques in a real-world scenario.
                </p>
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground tracking-wider pt-3 border-t border-border/40">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.estHours}h</span>
                  <span className="flex items-center gap-1"><Crosshair className="h-3 w-3" /> {p.skills.length} skills</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 11. LAB INTEGRATION PREVIEW
// ============================================================
function LabIntegrationPreview({
  labs,
  isEnrolled,
  navigate,
}: {
  labs: any[]
  isEnrolled: boolean
  navigate: any
}) {
  if (!labs || labs.length === 0) return null

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-8" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="08" className="text-violet-300">LAB INTEGRATION</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Every lab
            <span className="text-gradient-premium"> you&apos;ll touch.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            {isEnrolled
              ? "Click any lab to launch the live Docker-powered environment."
              : "Enroll to unlock access to the full lab environment."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {labs.map((lab, i) => (
            <motion.div
              key={lab.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5 hover:border-violet-500/40 hover:bg-card/60 transition-all overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <FlaskConical className="h-4 w-4 text-violet-300" />
                </div>
                <Badge variant="outline" className={cn(
                  "text-[9px] font-mono",
                  lab.difficulty === "Easy" ? "border-emerald-500/30 text-emerald-400" :
                  lab.difficulty === "Medium" ? "border-amber-500/30 text-amber-400" :
                  "border-rose-500/30 text-rose-400"
                )}>
                  {lab.difficulty?.toUpperCase()}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm mb-2 group-hover:text-violet-200 transition-colors">{lab.title}</h3>
              <p className="text-xs text-muted-foreground mb-3 font-mono tracking-wider">{lab.category}</p>
              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <span className="text-[10px] font-mono text-violet-300 tracking-wider">{lab.points} XP</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-violet-500/30 text-violet-200 hover:bg-violet-500/10"
                  onClick={() => navigate(isEnrolled ? { name: "lab", labSlug: lab.slug } : { name: "login" })}
                >
                  Preview Lab <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              {!isEnrolled && (
                <div className="absolute top-2 right-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 12. LIVE BATCH SCHEDULE PREVIEW
// ============================================================
interface BatchItem {
  id: string
  slug?: string
  certification: string
  name: string
  schedule: string
  startDate: string
  mode: string
  instructor: string
  seats: number
  enrolled: number
  level: string
  status: string
  googleFormUrl?: string | null
}
function BatchSchedulePreview({
  courseId,
  user,
  navigate,
}: {
  courseId: string
  user: any
  navigate: any
}) {
  const { data, isLoading } = useQuery<{ batches: BatchItem[]; count: number }>({
    queryKey: ["course-batches", courseId],
    queryFn: () => api(`/api/courses/${courseId}/batches`),
    enabled: !!courseId,
  })
  const batches = data?.batches ?? []

  const modeStyle = (mode: string) => {
    if (mode?.toLowerCase().includes("online")) return { badge: "border-cyan-500/30 text-cyan-300 bg-cyan-500/5", icon: Radio }
    if (mode?.toLowerCase().includes("person") || mode?.toLowerCase().includes("in-person")) return { badge: "border-amber-500/30 text-amber-300 bg-amber-500/5", icon: Users }
    return { badge: "border-violet-500/30 text-violet-300 bg-violet-500/5", icon: Layers }
  }

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-8" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="09" className="text-violet-300">LIVE BATCH SCHEDULE</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Join a
            <span className="text-gradient-premium"> live cohort.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            Instructor-led batches with peers. Real-time guidance, structured schedules,
            and cohort accountability.
          </p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 lg:py-6 lg:py-8 rounded-2xl border border-border/40 bg-card/20">
            <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No live batches scheduled right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {batches.map((b, i) => {
              const ms = modeStyle(b.mode)
              const ModeIcon = ms.icon
              const seatsLeft = Math.max(0, (b.seats ?? 0) - (b.enrolled ?? 0))
              const fillPct = b.seats > 0 ? Math.round(((b.enrolled ?? 0) / b.seats) * 100) : 0
              const startDate = b.startDate ? new Date(b.startDate) : null
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="group relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5 hover:border-violet-500/40 transition-all overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={cn("text-[9px] font-mono tracking-wider", ms.badge)}>
                      <ModeIcon className="h-3 w-3 mr-1" />
                      {b.mode?.toUpperCase() ?? "ONLINE"}
                    </Badge>
                    <span className="text-[9px] font-mono text-muted-foreground/50 tracking-wider">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{b.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono tracking-wider mb-3">{b.certification}</p>

                  <div className="space-y-1.5 mb-4">
                    {startDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 text-violet-300" />
                        <span>{startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                    {b.schedule && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 text-violet-300" />
                        <span className="truncate">{b.schedule}</span>
                      </div>
                    )}
                    {b.instructor && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <GraduationCap className="h-3 w-3 text-violet-300" />
                        <span className="truncate">{b.instructor}</span>
                      </div>
                    )}
                  </div>

                  {/* Seats progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground tracking-wider">SEATS</span>
                      <span className="text-[10px] font-mono text-amber-300 tracking-wider tabular-nums">{seatsLeft} LEFT</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          fillPct >= 90 ? "bg-rose-400" : fillPct >= 70 ? "bg-amber-400" : "bg-emerald-400"
                        )}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {b.slug && (
                      <a
                        href={`/batches/${b.slug}`}
                        className="flex-1"
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                          e.preventDefault()
                          navigate({ name: "batch-detail", batchSlug: b.slug! })
                        }}
                      >
                        <Button size="sm" variant="outline" className="w-full">
                          View Details
                        </Button>
                      </a>
                    )}
                    {b.googleFormUrl ? (
                      <a href={b.googleFormUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-500">
                          Enroll <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 bg-violet-600 hover:bg-violet-500"
                        onClick={() => {
                          if (!user) {
                            navigate({ name: "login" })
                            return
                          }
                          toast.success(`Enrollment requested for ${b.name}`, {
                            description: `${startDate?.toLocaleDateString() ?? ""} · ${b.mode ?? ""} · ${b.instructor ?? ""}`,
                          })
                        }}
                      >
                        Enroll <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================================
// 13. INSTRUCTOR SPOTLIGHT CARD
// ============================================================
interface InstructorDetail {
  id: string
  name: string
  title?: string
  bio?: string
  avatar?: string | null
  expertise?: string[]
  yearsExperience?: number
  certifications?: string[]
  linkedinUrl?: string | null
  stats?: {
    coursesCount: number
    batchesCount: number
    learnersCount: number
    yearsExperience: number
  }
  courses?: { id: string; title: string; level: string; category: string; enrolledCount: number }[]
}
function InstructorSpotlight({ instructor, navigate }: { instructor: any; navigate: any }) {
  // Hooks MUST run unconditionally (rules-of-hooks): the early return used to
  // sit BEFORE useQuery, so a payload that flips `instructor` from absent to
  // present between renders changed hook order and crashed the whole page.
  const { data, isLoading } = useQuery<{ instructor: InstructorDetail | null }>({
    queryKey: ["instructor-profile", instructor?.id],
    queryFn: () => api(`/api/instructors/${instructor.id}`),
    enabled: !!instructor?.id,
  })

  // Degraded course payloads (schema-drift fallback) may carry no instructor.
  if (!instructor) return null
  // Fetch full instructor profile (includes expertise, certifications, yearsExperience)

  const profile = data?.instructor
  const expertise = profile?.expertise ?? []
  const certifications = profile?.certifications ?? []
  const yearsExp = profile?.yearsExperience ?? profile?.stats?.yearsExperience ?? 0
  const stats = profile?.stats
  const initials = (instructor.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <SectionLabel index="10" className="text-cyan-300">INSTRUCTOR SPOTLIGHT</SectionLabel>
        <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance mb-6">
          Learn from a
          <span className="text-gradient-cyan"> practitioner.</span>
        </h2>

        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Left — Big avatar + actions */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-8 rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-2 border-cyan-500/30 mb-4">
                  <AvatarFallback className="bg-cyan-500/10 text-cyan-300 text-2xl font-mono">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold tracking-tight">{instructor.name}</h3>
                {instructor.title && (
                  <p className="text-sm text-muted-foreground mt-1">{instructor.title}</p>
                )}
                {yearsExp > 0 && (
                  <Badge className="mt-3 text-[10px] font-mono tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {yearsExp}+ Years Experience
                  </Badge>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-500"
                  onClick={() => navigate({ name: "book-session" })}
                >
                  <Calendar className="h-4 w-4 mr-1.5" /> Book a session
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-border/60"
                  onClick={() => {
                    if (instructor.id) {
                      navigate({ name: "instructor-detail", instructorId: instructor.id })
                    } else {
                      navigate({ name: "instructors" })
                    }
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-1.5" /> View all courses
                </Button>
              </div>
            </div>
          </div>

          {/* Right — Bio, expertise, certifications, stats */}
          <div className="lg:col-span-8">
            {/* Bio */}
            {instructor.bio && (
              <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-8">
                {instructor.bio}
              </p>
            )}

            {/* Stats row */}
            {stats && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "COURSES", value: stats.coursesCount, icon: BookOpen, color: "text-violet-300" },
                  { label: "STUDENTS", value: stats.learnersCount, icon: Users, color: "text-cyan-300" },
                  { label: "BATCHES", value: stats.batchesCount, icon: GraduationCap, color: "text-amber-300" },
                ].map((s) => (
                  <div key={s.label} className="border-l border-border/60 pl-4">
                    <s.icon className={cn("h-4 w-4 mb-2", s.color)} />
                    <div className="text-2xl lg:text-3xl font-bold mb-1 tabular-nums">
                      <AnimatedNumber value={s.value} />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Expertise tags */}
            {expertise.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-mono text-cyan-300 tracking-[0.2em] mb-3">EXPERTISE</p>
                <div className="flex flex-wrap gap-2">
                  {expertise.map((e, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs font-mono tracking-wider border-cyan-500/30 text-cyan-200 bg-cyan-500/5"
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-amber-300 tracking-[0.2em] mb-3">CERTIFICATIONS HELD</p>
                <div className="space-y-2">
                  {certifications.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-amber-300 shrink-0" />
                      <span className="text-foreground/90">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 14. CERTIFICATION EXAM BLUEPRINT
// ============================================================
function CertExamBlueprint({ course }: { course: any }) {
  // Exam code derived from shortName; domain weightings derived from modules
  const examCode = course.shortName || "GUARDIANX"
  const examDuration = Math.max(60, (course.durationHours ?? 4) * 15) // 15 min per hour, min 60
  const passingScore = 70
  const questionCount = Math.max(50, (course.modules?.length ?? 4) * 15)

  // Domain weightings — based on module lesson counts
  const modules = course.modules ?? []
  const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.length ?? 0), 0) || 1
  const domains = modules.slice(0, 6).map((m: any, i: number) => {
    const lessonCount = m.lessons?.length ?? 1
    const pct = Math.round((lessonCount / totalLessons) * 100)
    return {
      name: m.title,
      pct,
      color: ["text-violet-300", "text-cyan-300", "text-emerald-300", "text-amber-300", "text-rose-300", "text-orange-300"][i % 6],
      bar: ["bg-violet-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-orange-500"][i % 6],
    }
  })
  // Normalize to 100%
  const sum = domains.reduce((acc: number, d: { pct: number }) => acc + d.pct, 0)
  if (sum !== 100 && domains.length > 0) {
    domains[0].pct += 100 - sum
  }

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="11" className="text-amber-300">EXAM BLUEPRINT</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Pass the
            <span className="text-gradient-premium"> certification exam.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            {course.certBody
              ? `Aligned with the ${course.certBody} certification blueprint.`
              : "Aligned with industry certification standards."}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left — exam facts */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/40">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
                  <Award className="h-6 w-6 text-amber-300" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">EXAM CODE</p>
                  <div className="text-2xl font-bold tracking-tight">{examCode}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">DURATION</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums">{examDuration} min</div>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-emerald-300" />
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">PASS</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums">{passingScore}%</div>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-violet-300" />
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">QUESTIONS</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums">{questionCount}</div>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="h-3.5 w-3.5 text-cyan-300" />
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">DOMAINS</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums">{domains.length}</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border/40">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Format: Multiple choice + performance-based labs. Available online with
                  remote proctoring.
                </p>
              </div>
            </div>
          </div>

          {/* Right — domain weightings bar chart */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6">
              <p className="text-[10px] font-mono text-amber-300 tracking-[0.2em] mb-4">DOMAIN WEIGHTINGS</p>
              <div className="space-y-4">
                {domains.map((d: { name: string; pct: number; color: string; bar: string }, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate pr-3">{d.name}</span>
                      <span className={cn("text-xs font-mono tabular-nums tracking-wider", d.color)}>{d.pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.pct}%` }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className={cn("h-full rounded-full", d.bar)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 15. PREREQUISITES VISUAL GRAPH
// ============================================================
interface GraphNode {
  id: string
  title: string
  shortName: string
  level: string
}
function PrerequisitesGraph({
  course,
  prerequisites,
  user,
  navigate,
}: {
  course: any
  prerequisites: Prerequisite[]
  user: any
  navigate: any
}) {
  // "What this unlocks" — fetch the prerequisites graph (authenticated) and find courses that have THIS as a prerequisite
  const { data: graphData } = useQuery<{ nodes: GraphNode[]; edges: { from: string; to: string }[] }>({
    queryKey: ["prereq-graph-for-course", course.id],
    queryFn: () => api(`/api/prerequisites-graph`),
    enabled: !!user && !!course.id,
  })

  // Edges pointing AT this course's prerequisites (prereq -> this course)
  // For "what unlocks": find edges where from == course.id
  const unlocks = (graphData?.edges ?? [])
    .filter((e) => e.from === course.id)
    .map((e) => graphData?.nodes.find((n) => n.id === e.to))
    .filter(Boolean) as GraphNode[]

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="12" className="text-violet-300">PATH GRAPH</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Your learning
            <span className="text-gradient-premium"> graph.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            See where this course sits in your journey — what to take before, and what it unlocks next.
          </p>
        </div>

        {/* Visual graph — 3 columns: prerequisites | this course | unlocks */}
        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-center">
          {/* Prerequisites column */}
          <div>
            <div className="text-[10px] font-mono text-amber-300 tracking-[0.2em] mb-4 flex items-center gap-2">
              <ArrowDown className="h-3 w-3 rotate-90" />
              COMPLETE FIRST
            </div>
            {prerequisites.length > 0 ? (
              <div className="space-y-3">
                {prerequisites.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate({ name: "course", courseId: p.id })}
                    className="group w-full flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/40 hover:bg-amber-500/[0.06] transition-all text-left"
                  >
                    {p.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                    ) : (
                      <Lock className="h-5 w-5 text-amber-300/70 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium group-hover:text-amber-200 transition-colors truncate">{p.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground tracking-wider">{p.shortName} · {p.level}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-300 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-card/20 p-4 text-center">
                <Sparkles className="h-6 w-6 text-emerald-300/60 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No prerequisites — start here.</p>
              </div>
            )}
          </div>

          {/* Center — this course */}
          <div className="flex justify-center my-6 lg:my-0">
            <div className="relative">
              {/* Arrows */}
              {prerequisites.length > 0 && (
                <div className="hidden lg:block absolute -left-8 top-1/2 -translate-y-1/2">
                  <ArrowRight className="h-5 w-5 text-violet-400/60" />
                </div>
              )}
              {unlocks.length > 0 && (
                <div className="hidden lg:block absolute -right-8 top-1/2 -translate-y-1/2">
                  <ArrowRight className="h-5 w-5 text-violet-400/60" />
                </div>
              )}
              <div className="relative rounded-2xl border-2 border-violet-500/40 bg-violet-500/[0.06] p-5 min-w-[200px] text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 mb-3">
                  <Crosshair className="h-5 w-5 text-violet-300" />
                </div>
                <div className="text-sm font-bold mb-1">{course.title}</div>
                <div className="text-[10px] font-mono text-violet-300 tracking-wider">THIS COURSE</div>
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider mt-1">{course.shortName} · {course.level}</div>
              </div>
            </div>
          </div>

          {/* Unlocks column */}
          <div>
            <div className="text-[10px] font-mono text-emerald-300 tracking-[0.2em] mb-4 flex items-center gap-2">
              UNLOCKS NEXT
              <ArrowDown className="h-3 w-3 -rotate-90" />
            </div>
            {unlocks.length > 0 ? (
              <div className="space-y-3">
                {unlocks.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => navigate({ name: "course", courseId: u.id })}
                    className="group w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] transition-all text-left"
                  >
                    <Rocket className="h-5 w-5 text-emerald-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium group-hover:text-emerald-200 transition-colors truncate">{u.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground tracking-wider">{u.shortName} · {u.level}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-300 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-card/20 p-4 text-center">
                {user ? (
                  <>
                    <Trophy className="h-6 w-6 text-amber-300/60 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Final specialization in this path.</p>
                  </>
                ) : (
                  <>
                    <Lock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      <button
                        onClick={() => navigate({ name: "login" })}
                        className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
                      >Sign in</button> to see what this course unlocks.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 16. LIVE "WHO'S ENROLLED" ACTIVITY FEED
// ============================================================
interface ActivityItem {
  id: string
  name: string
  avatar?: string | null
  title?: string | null
  timeAgo: string
}
function ActivityFeed({ courseId }: { courseId: string }) {
  const { data, isLoading } = useQuery<{ activities: ActivityItem[]; total: number; thisWeek: number }>({
    queryKey: ["course-activity", courseId],
    queryFn: () => api(`/api/courses/${courseId}/activity`),
    enabled: !!courseId,
  })

  const activities = data?.activities ?? []
  const total = data?.total ?? 0
  const thisWeek = data?.thisWeek ?? 0

  return (
    <section className="py-8 lg:py-10 border-t border-border/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-10">
          {/* Left — heading + stats */}
          <div className="lg:col-span-4">
            <SectionLabel index="13" className="text-emerald-300">LIVE FEED</SectionLabel>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance mb-6">
              Who&apos;s
              <span className="text-gradient-premium"> enrolled.</span>
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                    <Users className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums">
                      <AnimatedNumber value={total} />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">TOTAL ENROLLED</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
                    <TrendingUp className="h-5 w-5 text-violet-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums">
                      <AnimatedNumber value={thisWeek} />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">ENROLLED THIS WEEK</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — activity feed */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6">
              <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-5">RECENT ENROLLMENTS</p>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-6 lg:py-8">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No enrollments yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {activities.map((a, i) => {
                    const initials = (a.name || "A")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-background/30 hover:border-violet-500/30 hover:bg-violet-500/[0.03] transition-all"
                      >
                        <Avatar className="h-9 w-9 border border-violet-500/20 shrink-0">
                          <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs font-mono">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          {a.title && (
                            <div className="text-[10px] font-mono text-muted-foreground tracking-wider truncate">{a.title}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground tracking-wider shrink-0">
                          <Activity className="h-3 w-3 text-emerald-300" />
                          enrolled {a.timeAgo}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 17. SKILLS YOU'LL EARN (TAG CLOUD)
// ============================================================
function SkillsTagCloud({ tags, modules }: { tags?: string | null; modules: any[] }) {
  const tagList = safeParseTags(tags)
  const [hoveredTag, setHoveredTag] = React.useState<string | null>(null)

  if (tagList.length === 0) return null

  // Build a map: tag -> first module that mentions it
  const tagToModule = new Map<string, string>()
  for (const tag of tagList) {
    const lowerTag = tag.toLowerCase()
    const match = modules.find((m: any) =>
      m.title?.toLowerCase().includes(lowerTag) ||
      m.lessons?.some((l: any) => l.title?.toLowerCase().includes(lowerTag))
    )
    if (match) {
      tagToModule.set(tag, match.title)
    } else if (modules.length > 0) {
      // Fallback — cycle through modules
      const idx = tagList.indexOf(tag) % modules.length
      tagToModule.set(tag, modules[idx].title)
    }
  }

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="max-w-2xl mb-6">
          <SectionLabel index="14" className="text-cyan-300">SKILLS YOU&apos;LL EARN</SectionLabel>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
            Walk away
            <span className="text-gradient-premium"> with these.</span>
          </h2>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            Hover any skill to see which module covers it. Larger pills = more emphasis.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            {tagList.map((tag, i) => {
              const sizeClass = TAG_SIZE_BY_INDEX[i % TAG_SIZE_BY_INDEX.length]
              const moduleTitle = tagToModule.get(tag)
              return (
                <div
                  key={tag}
                  className="relative group"
                  onMouseEnter={() => setHoveredTag(tag)}
                  onMouseLeave={() => setHoveredTag(null)}
                >
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wider transition-all",
                      "border-cyan-500/30 bg-cyan-500/[0.04] text-cyan-100 hover:border-cyan-400/60 hover:bg-cyan-500/10 hover:scale-105",
                      sizeClass
                    )}
                  >
                    <Hexagon className="h-3 w-3 text-cyan-300/60" />
                    {tag}
                  </button>
                  {/* Tooltip */}
                  {hoveredTag === tag && moduleTitle && (
                    <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg border border-cyan-500/40 bg-popover text-xs whitespace-nowrap shadow-xl pointer-events-none">
                      <span className="text-cyan-300 font-mono tracking-wider">Covered in: </span>
                      <span className="text-foreground font-medium">{moduleTitle}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 18. RELATED COURSES CAROUSEL
// ============================================================
interface RelatedCourse {
  id: string
  slug: string
  title: string
  shortName: string
  description: string
  category: string
  level: string
  durationHours: number
  rating: number
  studentsCount: number
  color: string | null
  thumbnail: string | null
  instructor: { name: string; title?: string | null }
}
function RelatedCoursesCarousel({
  courseId,
  navigate,
}: {
  courseId: string
  navigate: any
}) {
  const { data, isLoading } = useQuery<{ courses: RelatedCourse[]; count: number }>({
    queryKey: ["related-courses", courseId],
    queryFn: () => api(`/api/courses/${courseId}/related`),
    enabled: !!courseId,
  })

  const courses = data?.courses ?? []

  return (
    <section className="py-8 lg:py-10 border-t border-border/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 relative">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <SectionLabel index="15" className="text-violet-300">RELATED COURSES</SectionLabel>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.03em] text-balance">
              Keep
              <span className="text-gradient-premium"> going.</span>
            </h2>
          </div>
          {courses.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-border/60"
              onClick={() => navigate({ name: "catalog" })}
            >
              Browse all <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 sm:h-48 rounded-xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-border/40 bg-card/20">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No related courses found in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {courses.map((c, i) => {
              const levelColor = LEVEL_COLORS[c.level] ?? ""
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
                  className="group"
                >
                  <button
                    onClick={() => navigate({ name: "course", courseId: c.id })}
                    className="relative w-full h-full text-left rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden hover:border-violet-500/40 hover:bg-card/60 hover:shadow-[0_16px_40px_-24px_rgba(139,92,246,0.5)] transition-all"
                  >
                    {/* Thumbnail — compact 16/9 */}
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img
                        src={getCourseImage(c)}
                        alt={c.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className={cn("text-[8px] font-mono tracking-wider", levelColor)}>
                          {c.level}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur border border-border/40">
                        <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                        <span className="text-[9px] font-mono tabular-nums">{c.rating != null ? Number(c.rating).toFixed(1) : "—"}</span>
                      </div>
                    </div>
                    {/* Body — compact */}
                    <div className="p-2.5 sm:p-3">
                      <p className="text-[8px] sm:text-[9px] font-mono text-violet-300 tracking-[0.18em] mb-1">{c.shortName}</p>
                      <h3 className="font-semibold text-[12px] sm:text-[13px] leading-snug mb-1.5 line-clamp-2 group-hover:text-violet-200 transition-colors min-h-[2.75em]">{c.title}</h3>
                      <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px] font-mono text-muted-foreground tracking-wide">
                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {c.durationHours ?? 0}h</span>
                        <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {(c.studentsCount ?? 0).toLocaleString()}</span>
                        <span className="ml-auto hidden sm:block truncate max-w-[45%] text-[9px]">{c.instructor?.name ?? "GuardianX Faculty"}</span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================================
// 20. FLOATING ENROLL CTA — sticky bottom bar
// ============================================================
function FloatingEnrollCTA({
  course,
  isEnrolled,
  onEnroll,
  onContinue,
  isEnrolling,
  visible,
  progressPct,
  formatPrice,
}: {
  course: any
  isEnrolled: boolean
  onEnroll: () => void
  onContinue: () => void
  isEnrolling: boolean
  visible: boolean
  progressPct: number
  formatPrice: (n: number) => string
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/85 backdrop-blur-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10 py-3">
            <div className="flex items-center gap-4">
              {/* Course identity */}
              <div className="hidden sm:flex items-center gap-3 min-w-0 flex-1">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 font-mono text-xs font-bold text-violet-200 shrink-0">
                  {course.shortName?.slice(0, 2).toUpperCase() ?? "GC"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{course.title}</div>
                  <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
                    {course.shortName} · {course.level}
                  </div>
                </div>
              </div>

              {/* Mobile — just title */}
              <div className="sm:hidden flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{course.title}</div>
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">{course.shortName}</div>
              </div>

              {/* Action */}
              {isEnrolled ? (
                <Button
                  className="bg-violet-600 hover:bg-violet-500 shrink-0"
                  onClick={onContinue}
                >
                  <PlayCircle className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Continue ({progressPct}%)</span>
                  <span className="sm:hidden">Continue</span>
                </Button>
              ) : (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] font-mono text-muted-foreground tracking-wider">ONE-TIME</div>
                    <div className="text-lg font-bold text-gradient-premium tabular-nums">{formatPrice(course.price)}</div>
                  </div>
                  <Button
                    className="bg-violet-600 hover:bg-violet-500"
                    onClick={onEnroll}
                    disabled={isEnrolling}
                  >
                    <GraduationCap className="h-4 w-4 mr-1.5" />
                    {isEnrolling ? "Enrolling..." : "Enroll Now"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// REVIEWS SECTION (existing — kept intact)
// ============================================================
interface Review {
  id: string
  rating: number
  title: string
  content: string
  createdAt: string
  user: { id: string; name: string; title: string | null; avatar: string | null }
}

function ReviewsSection({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) {
  const { user } = useUser()
  const qc = useQueryClient()
  const [showForm, setShowForm] = React.useState(false)
  const [rating, setRating] = React.useState(5)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")

  const { data, isLoading } = useQuery<{ reviews: Review[]; avgRating: number; totalReviews: number; distribution: { star: number; count: number }[] }>({
    queryKey: ["reviews", courseId],
    queryFn: () => api(`/api/courses/${courseId}/reviews`),
  })

  const submitMutation = useMutation({
    mutationFn: () => api(`/api/courses/${courseId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating, title, content }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", courseId] })
      setShowForm(false); setTitle(""); setContent(""); setRating(5)
      toast.success("Review submitted! Thanks for your feedback.")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const reviews = data?.reviews ?? []
  const avg = data?.avgRating ?? 0
  const total = data?.totalReviews ?? 0
  const distribution = data?.distribution ?? []
  const myReview = reviews.find((r) => r.user.id === user?.id)

  return (
    <section className="py-8 lg:py-10 border-t border-border/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <SectionLabel index="16" className="text-amber-300">REVIEWS</SectionLabel>
        <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance mb-6">
          Student
          <span className="text-gradient-premium"> voices.</span>
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-baseline gap-3">
              {total > 0 ? (
                <>
                  <span className="text-6xl font-bold text-amber-300 tabular-nums leading-none">{avg.toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn("h-4 w-4", s <= Math.round(avg) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40")} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono tracking-wider">{total} REVIEW{total !== 1 ? "S" : ""}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No reviews yet.</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEnrolled && !myReview && (
                <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)} className="border-violet-500/40 text-violet-200 hover:bg-violet-500/10">
                  <PenLine className="h-3.5 w-3.5 mr-1.5" /> {showForm ? "Cancel" : "Write a Review"}
                </Button>
              )}
              {myReview && (
                <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10 font-mono tracking-wider">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> YOU REVIEWED
                </Badge>
              )}
            </div>
          </div>

          {/* Distribution */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-xl border border-border/60 bg-card/30 backdrop-blur">
              <div className="flex-1 space-y-1.5">
                {distribution.slice().reverse().map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-xs">
                    <span className="w-3 text-muted-foreground font-mono">{d.star}</span>
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${total ? (d.count / total) * 100 : 0}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground font-mono">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review form */}
          {showForm && (
            <div className="p-5 rounded-xl border border-violet-500/30 bg-violet-500/[0.03] space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Your rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={cn("h-5 w-5", s <= (hoverRating || rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40")} />
                    </button>
                  ))}
                </div>
              </div>
              <Input placeholder="Review title (optional)..." value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background/50" />
              <Textarea placeholder="Share your experience with this course..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[100px] bg-background/50" />
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}

          {/* Reviews list */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 lg:py-6 lg:py-8">
              <Star className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="group p-5 rounded-xl border border-border/60 bg-card/30 backdrop-blur hover:border-violet-500/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10 shrink-0 border border-amber-500/20">
                      <AvatarFallback className="bg-amber-500/10 text-amber-300 text-xs font-mono">
                        {r.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold">{r.user.name}</span>
                        {r.user.title && <span className="text-[10px] text-muted-foreground font-mono tracking-wider">· {r.user.title}</span>}
                        <div className="flex gap-0.5 ml-auto">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40")} />
                          ))}
                        </div>
                      </div>
                      {r.title && <p className="text-sm font-medium mb-1">{r.title}</p>}
                      {r.content && <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-mono tracking-wider">
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        {r.user.id === user?.id && <span className="text-emerald-300">· YOUR REVIEW</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {reviews.length > 5 && (
                <p className="text-xs text-center text-muted-foreground py-4 font-mono tracking-wider">
                  + {reviews.length - 5} MORE REVIEW{reviews.length - 5 !== 1 ? "S" : ""}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// BOOKMARK BUTTON (existing — kept intact)
// ============================================================
function BookmarkButton({ courseId }: { courseId: string }) {
  const { isBookmarked, toggleAsync, isAuthenticated } = useBookmarks()
  const bookmarked = isBookmarked(courseId)

  if (!isAuthenticated) return null

  return (
    <Button
      variant="outline"
      className="w-full border-border/60 hover:border-amber-500/40 hover:bg-amber-500/5"
      onClick={async () => {
        await toggleAsync(courseId)
        toast.success(bookmarked ? "Removed from wishlist" : "Added to wishlist")
      }}
    >
      {bookmarked ? (
        <><BookmarkCheck className="h-4 w-4 mr-1.5 text-amber-300" /> Bookmarked</>
      ) : (
        <><Bookmark className="h-4 w-4 mr-1.5" /> Add to Wishlist</>
      )}
    </Button>
  )
}
