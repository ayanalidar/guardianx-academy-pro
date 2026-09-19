"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { getCourseImage } from "@/lib/course-images"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/platform/empty-state"
import {
  Search, Star, Clock, BookOpen, Users, Shield, Bookmark, BookmarkCheck,
  ArrowRight, Layers, Sparkles, FlaskConical, GraduationCap, Tag,
  Gauge, PlayCircle, CheckCircle2, Award,
  Swords, ShieldCheck, Cloud, Scale, LayoutGrid, List, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, CursorGlow, MagneticButton, Counter,
} from "@/components/platform/motion-system"
import { usePageContent, getContent } from "@/lib/use-content"
import { saveCatalog, readCatalog, catalogCacheKey } from "@/lib/catalog-cache"

interface CourseItem {
  id: string; slug: string; title: string; shortName: string; description: string
  category: string; level: string; durationHours: number; rating: number
  studentsCount: number; color: string; thumbnail: string | null
  tags: string; certBody: string; price: number
  instructor: { id: string; name: string; title: string | null; avatar?: string | null }
  lessonCount: number; moduleCount: number
  enrollment?: { progress: number; completed: boolean; lastAccessed: string | null; enrolledAt: string } | null
}

const CATEGORIES = ["All", "Ethical Hacking", "Networking", "Web Security", "System Administration", "Security Management", "Identity & Access"]
const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"]
const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "not-started", label: "Not Started" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

const LEVEL_STYLES: Record<string, { badge: string; dot: string }> = {
  Beginner: { badge: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-400" },
  Intermediate: { badge: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10", dot: "bg-cyan-400" },
  Advanced: { badge: "border-violet-500/40 text-violet-300 bg-violet-500/10", dot: "bg-violet-400" },
}

/* Career Path Selector - interactive filter shortcuts.
 * Each path aggregates one or more underlying course categories so the count
 * shown on the card reflects all relevant courses (e.g. "Offensive Security"
 * includes both Ethical Hacking and Penetration Testing tracks). */
const CAREER_PATHS = [
  {
    title: "Offensive Security",
    desc: "Ethical hacking, pentesting, red team operations. Break things to learn how they work.",
    icon: Swords,
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    barColor: "bg-violet-500",
    glow: "shadow-[0_0_30px_-8px] shadow-violet-500/30",
    categories: ["Ethical Hacking", "Penetration Testing", "Web Security"],
  },
  {
    title: "Defensive Security",
    desc: "Network defense, SOC, blue team. Detect, respond, and protect critical infrastructure.",
    icon: ShieldCheck,
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
    barColor: "bg-cyan-500",
    glow: "shadow-[0_0_30px_-8px] shadow-cyan-500/30",
    categories: ["Networking", "Network Security", "Incident Response", "Malware Analysis", "Forensics"],
  },
  {
    title: "Cloud & Infrastructure",
    desc: "Linux, cloud platforms, system administration. Build and secure the backbone.",
    icon: Cloud,
    color: "text-amber-300",
    tint: "bg-amber-500/10",
    barColor: "bg-amber-500",
    glow: "shadow-[0_0_30px_-8px] shadow-amber-500/30",
    categories: ["System Administration", "Cloud Security"],
  },
  {
    title: "Governance & Risk",
    desc: "IAM, compliance, security management. Strategy, policy, and access control.",
    icon: Scale,
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    barColor: "bg-emerald-500",
    glow: "shadow-[0_0_30px_-8px] shadow-emerald-500/30",
    categories: ["Identity & Access", "Security Management"],
  },
] as const

/* Certification ticker - scrolling marquee */
const CERT_TICKER = [
  "CEH", "CISSP", "CCNA", "CCNP", "RHCSA", "OSCP", "CISM", "WAPT",
  "Security+", "CyberArk PAM", "CISA", "CCSP", "PNPT", "CRTP",
]

export function CourseCatalogView() {
  const { navigate } = useAppStore()
  const [q, setQ] = React.useState("")
  const [category, setCategory] = React.useState("All")
  const [level, setLevel] = React.useState("All")
  const [status, setStatus] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [compareIds, setCompareIds] = React.useState<string[]>([])
  const [compareOpen, setCompareOpen] = React.useState(false)

  // CMS-driven hero copy - falls back to defaults.
  const cms = usePageContent("catalog")
  const cmsData = cms.data
  const heroEyebrow = getContent(cmsData, "hero", "eyebrow", "CATALOG")
  const heroTitle = getContent(cmsData, "hero", "title", "Find your")
  const heroTitleAccent = getContent(cmsData, "hero", "titleAccent", "path.")

  const catalogCacheId = catalogCacheKey(["courses", q, category, level, status])
  const { data, isLoading, isError, refetch } = useQuery<{ courses: CourseItem[] }>({
    queryKey: ["courses", q, category, level, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (category !== "All") params.set("category", category)
      if (level !== "All") params.set("level", level)
      if (status !== "all") params.set("status", status)
      const res = await api<{ courses: CourseItem[] }>(`/api/courses?${params.toString()}`)
      // Snapshot every good response so a later network blip can never
      // blank the catalog (see lib/catalog-cache.ts).
      saveCatalog(catalogCacheId, res)
      return res
    },
    // Instant paint from the last good snapshot while the fresh fetch runs.
    placeholderData: () => readCatalog<{ courses: CourseItem[] }>(catalogCacheId) ?? undefined,
    // If the network dies, keep polling every 5s until it returns — the
    // user never has to press Retry.
    refetchInterval: (query) => (query.state.error ? 5000 : false),
  })

  const courses = data?.courses ?? []
  const featured = courses[0]
  const rest = courses.slice(1)

  /* ---- compare (up to 3) ---- */
  const toggleCompare = React.useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    )
  }, [])
  const comparedCourses = compareIds
    .map((id) => courses.find((c) => c.id === id))
    .filter((c): c is CourseItem => !!c)

  // Fetch platform stats (editable from admin → Platform Stats view).
  // These power the 4-card stats strip below the hero so the admin can
  // control the numbers without touching code.
  const { data: statsData } = useQuery<{ stats: { key: string; value: string; suffix: string | null }[] }>({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const res = await fetch("/api/platform-stats")
      if (!res.ok) return { stats: [] }
      const j = await res.json()
      return { stats: j.stats ?? [] }
    },
    staleTime: 60_000,
  })
  const platformStats = statsData?.stats ?? []
  const getStat = (key: string, fallback: string) =>
    platformStats.find((s) => s.key === key)?.value ?? fallback
  const getSuffix = (key: string, fallback: string = "") =>
    platformStats.find((s) => s.key === key)?.suffix ?? fallback

  // Stats strip values — prefer the editable platform stats, fall back to
  // computed values if the API hasn't loaded yet.
  const totalCourses = parseInt(getStat("course_count", "0")) || courses.length || 27
  const totalStudents = getStat("learner_count", "5")
  const practiceLabs = getStat("lab_count", "31")
  const avgRating = getStat("avg_rating", "5")
  const avgRatingSuffix = getSuffix("avg_rating", "/5")

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* ====================================================
            HERO - cinematic, out-of-the-box career path selector
            ==================================================== */}
        <section className="relative mb-6 lg:mb-12">
          {/* Background glow */}
          <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-violet-600/8 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-cyan-500/6 blur-[100px] rounded-full pointer-events-none" />

          {/* Eyebrow + headline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
              <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em]">{heroEyebrow}</span>
            </div>
            <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
              {heroTitle}{" "}
              <span className="text-gradient-premium">{heroTitleAccent}</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {courses.length} certification tracks across ethical hacking, networking, web security, IAM, and more -
              from beginner fundamentals to advanced specializations.
            </p>
          </motion.div>

          {/* Career Path Selector - interactive, clickable cards */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-6"
          >
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">CHOOSE YOUR PATH</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CAREER_PATHS.map((path, i) => {
                const isActive = category !== "All" && path.categories.includes(category as never)
                const Icon = path.icon
                const count = isLoading
                  ? null
                  : courses.filter(c => path.categories.includes(c.category as never)).length
                return (
                  <button
                    key={path.title}
                    onClick={() => setCategory(isActive ? "All" : path.categories[0])}
                    className={cn(
                      "group relative text-left rounded-xl border p-4 transition-all duration-300 overflow-hidden",
                      isActive
                        ? cn("border-transparent bg-card shadow-lg", path.glow)
                        : "border-border/60 bg-card/60 hover:bg-card hover:border-violet-500/30"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className={cn("absolute top-0 left-0 right-0 h-0.5", path.barColor)} />
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("inline-flex p-2.5 rounded-lg transition-transform group-hover:scale-110", path.tint)}>
                        <Icon className={cn("h-5 w-5", path.color)} />
                      </div>
                      <span className={cn("text-[10px] font-mono tabular-nums", path.color)}>
                        {count === null ? "…" : `${count} ${count === 1 ? "COURSE" : "COURSES"}`}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{path.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{path.desc}</p>
                    {/* Hover arrow */}
                    <div className="flex items-center gap-1 mt-3">
                      <span className={cn("text-[10px] font-mono tracking-wider", isActive ? path.color : "text-muted-foreground")}>
                        {isActive ? "ACTIVE" : "EXPLORE"}
                      </span>
                      <ArrowRight className={cn("h-3 w-3 transition-transform", isActive ? path.color : "text-muted-foreground", "group-hover:translate-x-0.5")} />
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Stats strip - compact, inline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          >
            <StatCard icon={BookOpen} label="Total Courses" value={totalCourses} color="text-violet-300" tint="bg-violet-500/10" />
            <StatCard icon={Users} label="Total Students" value={totalStudents} color="text-cyan-300" tint="bg-cyan-500/10" />
            <StatCard icon={FlaskConical} label="Practice Labs" value={practiceLabs} color="text-amber-300" tint="bg-amber-500/10" />
            <StatCard icon={Star} label="Avg Rating" value={avgRating} suffix={avgRatingSuffix} color="text-emerald-300" tint="bg-emerald-500/10" />
          </motion.div>

          {/* Certification ticker - scrolling marquee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="relative overflow-hidden py-3 border-y border-border/40"
          >
            <div className="flex items-center gap-6 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
              {[...CERT_TICKER, ...CERT_TICKER].map((cert, i) => (
                <span key={i} className="text-xs font-mono text-muted-foreground/60 tracking-wider flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-violet-400/40" />
                  {cert}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ====================================================
            FILTER BAR - search + 3 selects, all on a solid card
            ==================================================== */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses, certifications, topics..."
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(q || category !== "All" || level !== "All" || status !== "all") && (
            <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">ACTIVE FILTERS:</span>
              {q && <FilterChip label={`"${q}"`} onClear={() => setQ("")} />}
              {category !== "All" && <FilterChip label={category} onClear={() => setCategory("All")} />}
              {level !== "All" && <FilterChip label={level} onClear={() => setLevel("All")} />}
              {status !== "all" && (
                <FilterChip
                  label={STATUSES.find((s) => s.value === status)?.label || status}
                  onClear={() => setStatus("all")}
                />
              )}
              <button
                onClick={() => { setQ(""); setCategory("All"); setLevel("All"); setStatus("all") }}
                className="text-[10px] font-mono text-violet-300 hover:text-violet-200 tracking-wider ml-1"
              >
                CLEAR ALL
              </button>
            </div>
          )}
        </div>

        {/* ====================================================
            COURSES
            ==================================================== */}
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-[28rem] rounded-3xl" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[26rem] rounded-2xl" />)}
            </div>
          </div>
        ) : isError && courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Couldn't load the catalog"
            description="The connection to the course library was interrupted. This is usually temporary — retry and the catalog will come back."
            actionLabel="Retry"
            onAction={() => refetch()}
            className="py-16"
          />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            description="Try adjusting your search or clearing a filter — the catalog covers offensive, defensive, cloud and GRC tracks."
            actionLabel="Clear all filters"
            onAction={() => { setQ(""); setCategory("All"); setLevel("All"); setStatus("all") }}
            className="py-16"
          />
        ) : (
          <>
            {/* Connection blip banner — catalog shown from the local snapshot */}
            {isError && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <Shield className="h-4 w-4 shrink-0" />
                <span>
                  Connection interrupted — showing your last saved catalog. Retrying automatically every few seconds.
                </span>
              </div>
            )}
            {/* Featured course - large immersive card */}
            {featured && (
              <FeaturedCourse course={featured} />
            )}

            {/* Rest — grid or list view */}
            {rest.length > 0 && (
              <div className="mt-8 lg:mt-10">
                <div className="flex items-center justify-between mb-6 gap-3">
                  <div>
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">ALL COURSES</p>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Explore the catalog</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{rest.length} TRACKS</span>
                    {/* view toggle */}
                    <div
                      role="group"
                      aria-label="Layout"
                      className="flex items-center rounded-lg border border-border/60 bg-card/60 p-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        aria-pressed={viewMode === "grid"}
                        aria-label="Grid view"
                        className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
                          viewMode === "grid" ? "bg-violet-500/20 text-violet-200" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <LayoutGrid className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        aria-pressed={viewMode === "list"}
                        aria-label="List view"
                        className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
                          viewMode === "list" ? "bg-violet-500/20 text-violet-200" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <List className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>

                {viewMode === "grid" ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rest.map((course, i) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        index={i + 1}
                        compareActive={compareIds.includes(course.id)}
                        compareDisabled={!compareIds.includes(course.id) && compareIds.length >= 3}
                        onToggleCompare={() => toggleCompare(course.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rest.map((course) => (
                      <CourseListRow
                        key={course.id}
                        course={course}
                        compareActive={compareIds.includes(course.id)}
                        compareDisabled={!compareIds.includes(course.id) && compareIds.length >= 3}
                        onToggleCompare={() => toggleCompare(course.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom CTA */}
            <ScrollReveal delay={0.1}>
              <div className="mt-10 lg:mt-20 rounded-2xl border border-border/60 bg-card shadow-lg p-8 lg:p-12 text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-violet-600/8 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <Sparkles className="h-8 w-8 text-violet-300 mx-auto mb-4" />
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3 text-balance">
                    Not sure where to start?
                  </h3>
                  <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                    Sign in to get personalized recommendations, track progress, and unlock hands-on labs.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <MagneticButton strength={0.3}>
                      <Button onClick={() => navigate({ name: "login" })} className="bg-violet-600 hover:bg-violet-500 btn-premium px-6 py-3">
                        Create Free Account <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </MagneticButton>
                    <Button variant="outline" onClick={() => navigate({ name: "home" })}>
                      <PlayCircle className="h-4 w-4 mr-2" /> Watch Demo
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </>
        )}

        {/* ====================================================
            COMPARE BAR + DIALOG (up to 3 courses)
            ==================================================== */}
        {compareIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-2 rounded-full border border-violet-500/40 bg-card/95 backdrop-blur-xl shadow-[0_12px_40px_-12px_rgba(139,92,246,0.5)] pl-4 pr-1.5 py-1.5">
              <Scale className="size-4 text-violet-300 shrink-0" aria-hidden />
              <span className="text-xs font-medium tabular-nums">{compareIds.length} selected</span>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                aria-label="Clear comparison"
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <X className="size-3.5" aria-hidden />
              </button>
              <Button
                size="sm"
                disabled={compareIds.length < 2}
                onClick={() => setCompareOpen(true)}
                className="h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-xs px-3"
              >
                Compare
              </Button>
            </div>
          </motion.div>
        )}

        <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="size-4 text-violet-300" aria-hidden /> Compare courses
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground p-2 border-b border-border/60">Attribute</th>
                    {comparedCourses.map((c) => (
                      <th key={c.id} className="text-left p-2 border-b border-border/60 min-w-[140px]">
                        <span className="text-xs font-mono font-bold text-violet-200">{c.shortName}</span>
                        <span className="block text-[11px] font-medium text-foreground/80 leading-snug mt-0.5 line-clamp-2">{c.title}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Category", (c: CourseItem) => c.category],
                    ["Level", (c: CourseItem) => c.level],
                    ["Duration", (c: CourseItem) => `${c.durationHours} hours`],
                    ["Modules", (c: CourseItem) => String(c.moduleCount)],
                    ["Lessons", (c: CourseItem) => String(c.lessonCount)],
                    ["Rating", (c: CourseItem) => `★ ${c.rating} / 5`],
                    ["Students", (c: CourseItem) => c.studentsCount.toLocaleString()],
                    ["Certification", (c: CourseItem) => c.certBody || "Self-paced"],
                    ["Price", (c: CourseItem) => (c.price > 0 ? `₹${c.price.toLocaleString("en-IN")}` : "FREE")],
                    ["Instructor", (c: CourseItem) => c.instructor.name],
                  ] as Array<[string, (c: CourseItem) => string]>).map(([label, get]) => (
                    <tr key={label} className="odd:bg-muted/20">
                      <td className="p-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/30">{label}</td>
                      {comparedCourses.map((c) => (
                        <td key={c.id} className="p-2 border-b border-border/30">{get(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {comparedCourses.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant="outline"
                  onClick={() => { setCompareOpen(false); navigate({ name: "course", courseId: c.id }) }}
                >
                  Open {c.shortName} <ArrowRight className="size-3.5 ml-1" aria-hidden />
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

/* ============================================================
   StatCard - small solid premium card for stats strip
   ============================================================ */
function StatCard({
  icon: Icon, label, value, color, tint, suffix,
}: {
  icon: typeof BookOpen; label: string; value: number | string; color: string; tint: string; suffix?: string
}) {
  // If the value is a plain integer, animate it via the Counter. Otherwise
  // (e.g. "5", "1,240", "5/5") just render the string as-is.
  const numericValue = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0
  const isPlainNumber = typeof value === "number" || /^\d+$/.test(String(value))
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-lg p-5 flex items-center gap-4 hover:border-violet-500/30 transition-colors">
      <div className={cn("inline-flex p-3 rounded-lg shrink-0", tint)}>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl lg:text-3xl font-bold tabular-nums leading-none mb-1">
          {isPlainNumber ? <Counter value={numericValue} suffix={suffix} /> : <span>{value}{suffix}</span>}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</div>
      </div>
    </div>
  )
}

/* ============================================================
   FilterChip - tiny removable filter pill
   ============================================================ */
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-mono text-violet-200">
      {label}
      <button onClick={onClear} className="hover:text-violet-100" aria-label={`Clear filter ${label}`}>
        ×
      </button>
    </span>
  )
}

/* ============================================================
   FeaturedCourse - large immersive featured card
   ============================================================ */
function FeaturedCourse({ course }: { course: CourseItem }) {
  const { navigate } = useAppStore()
  const { isBookmarked, toggle: toggleBookmark, isAuthenticated } = useBookmarks()
  const image = getCourseImage(course)
  const levelStyle = LEVEL_STYLES[course.level] || LEVEL_STYLES.Intermediate

  return (
    <ScrollReveal>
      <div
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg cursor-pointer group"
        onClick={() => navigate({ name: "course", courseId: course.id })}
      >
        {/* Top: real course image */}
        <div className="relative aspect-[21/9] lg:aspect-[21/8] overflow-hidden">
          <img
            src={image}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-card/10" />

          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 lg:top-6 lg:left-6 lg:right-6 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-violet-300 tracking-[0.25em] px-2 py-1 rounded border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm">
                ★ FEATURED
              </span>
              <span className={cn("text-[10px] font-mono px-2 py-1 rounded border backdrop-blur-sm", levelStyle.badge)}>
                {course.level.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded border border-border/60 bg-card/80 backdrop-blur-sm tracking-wider">
                {course.category}
              </span>
            </div>
            {isAuthenticated && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleBookmark(course.id) }}
                className="h-9 w-9 rounded-lg border border-border/60 bg-card/80 backdrop-blur flex items-center justify-center hover:bg-violet-500/15 hover:border-violet-500/40 transition-colors"
                aria-label="Toggle bookmark"
              >
                {isBookmarked(course.id) ? <BookmarkCheck className="h-4 w-4 text-violet-300" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
              </button>
            )}
          </div>

          {/* Course short name overlay - oversized */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-[clamp(3rem,11vw,9rem)] font-bold font-mono text-gradient-premium opacity-90"
            >
              {course.shortName}
            </motion.div>
          </div>

          {/* Bottom content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-10 bg-gradient-to-t from-card via-card/85 to-transparent">
            <div className="grid lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-8">
                {course.certBody && (
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-3.5 w-3.5 text-amber-300" />
                    <span className="text-[10px] text-amber-200 font-mono tracking-[0.2em]">{course.certBody.toUpperCase()}</span>
                  </div>
                )}
                <h2 className="text-2xl lg:text-5xl font-bold tracking-[-0.03em] mb-3 text-balance leading-tight">
                  {course.title}
                </h2>
                <p className="text-sm lg:text-base text-muted-foreground max-w-2xl leading-relaxed line-clamp-2">
                  {course.description}
                </p>
              </div>
              <div className="lg:col-span-4 flex lg:justify-end">
                <MagneticButton strength={0.3}>
                  <Button
                    className="bg-violet-600 hover:bg-violet-500 btn-premium px-6 py-4"
                    onClick={(e) => { e.stopPropagation(); navigate({ name: "course", courseId: course.id }); }}
                  >
                    {course.enrollment ? "Continue Learning" : "Enroll Now"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata strip - solid bg-card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-5 lg:p-6 border-t border-border/40">
          {[
            { label: "Category", value: course.category, icon: Layers },
            { label: "Difficulty", value: course.level, icon: Gauge },
            { label: "Duration", value: `${course.durationHours}h`, icon: Clock },
            { label: "Rating", value: `★ ${course.rating}`, icon: Star },
            { label: "Students", value: course.studentsCount.toLocaleString(), icon: Users },
            { label: "Instructor", value: course.instructor.name, icon: Shield },
          ].map((m) => (
            <div key={m.label} className="min-w-0">
              <div className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                <m.icon className="h-3 w-3 shrink-0" /> {m.label}
              </div>
              <div className="text-sm font-medium truncate">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Modules + lessons + price strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/40 border-t border-border/40">
          <FeaturedMeta icon={BookOpen} label="Modules" value={course.moduleCount} />
          <FeaturedMeta icon={Layers} label="Lessons" value={course.lessonCount} />
          <FeaturedMeta icon={CheckCircle2} label="Cert" value={course.certBody ? "Included" : "Self"} />
          <FeaturedMeta
            icon={Tag}
            label="Price"
            value={course.price && course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}` : "Free"}
            highlight
          />
        </div>

        {/* Progress bar if enrolled */}
        {course.enrollment && (
          <div className="p-5 lg:p-6 border-t border-border/40 bg-background/40">
            <div className="flex items-center justify-between text-[10px] mb-2 font-mono">
              <span className="text-muted-foreground tracking-[0.2em]">YOUR PROGRESS</span>
              <span className="text-violet-300">{course.enrollment.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full progress-active" style={{ width: `${course.enrollment.progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </ScrollReveal>
  )
}

function FeaturedMeta({
  icon: Icon, label, value, highlight,
}: { icon: typeof BookOpen; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn("p-4 lg:p-5 bg-card", highlight && "bg-violet-500/5")}>
      <div className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1 flex items-center gap-1">
        <Icon className={cn("h-3 w-3", highlight && "text-violet-300")} /> {label}
      </div>
      <div className={cn("text-sm font-semibold tabular-nums", highlight && "text-violet-200")}>{value}</div>
    </div>
  )
}

/* ============================================================
   CourseCard - sophisticated, interactive, full-data card
   ============================================================ */
function CourseCard({
  course, index, compareActive, compareDisabled, onToggleCompare,
}: {
  course: CourseItem
  index: number
  compareActive?: boolean
  compareDisabled?: boolean
  onToggleCompare?: () => void
}) {
  const { navigate } = useAppStore()
  const { isBookmarked, toggle: toggleBookmark, isAuthenticated } = useBookmarks()
  const image = getCourseImage(course)
  const levelStyle = LEVEL_STYLES[course.level] || LEVEL_STYLES.Intermediate

  return (
    <CursorGlow className="group h-full" color="oklch(0.6 0.2 295 / 0.05)">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.6_0.2_295_/_0.25)]"
        onClick={() => navigate({ name: "course", courseId: course.id })}
      >
        {/* Visual */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={image}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          {/* Top: course number + level */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] px-2 py-0.5 rounded border border-border/60 bg-card/80 backdrop-blur-sm">
              COURSE {String(index).padStart(2, "0")}
            </span>
            <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded border backdrop-blur-sm", levelStyle.badge)}>
              {course.level.toUpperCase()}
            </span>
          </div>

          {/* Hover CTA */}
          <div className="absolute inset-0 bg-violet-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            <div className="flex items-center gap-2 text-violet-200 text-sm font-medium">
              <PlayCircle className="h-5 w-5" />
              View Course
            </div>
          </div>

          {/* Short name badge */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-card/90 backdrop-blur-sm border border-border/60 text-xs font-mono font-bold text-violet-200">
              {course.shortName}
            </span>
          </div>
          {/* Price badge */}
          <div className="absolute bottom-3 right-3">
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-mono font-semibold",
              course.price && course.price > 0
                ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                : "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
            )}>
              {course.price && course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}` : "FREE"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5">
          {/* Category + cert body */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] font-mono border-violet-500/30 text-violet-300 bg-violet-500/5">
              {course.category}
            </Badge>
            {course.certBody && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-200/80">
                <Award className="h-3 w-3" /> {course.certBody}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mb-2 group-hover:text-violet-200 transition-colors line-clamp-2 leading-snug">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {course.description}
          </p>

          {/* Instructor */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/40">
            <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-violet-500/10 border border-violet-500/30 shrink-0">
              <GraduationCap className="h-3.5 w-3.5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Instructor</div>
              <div className="text-xs font-medium truncate">{course.instructor.name}</div>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <MiniStat icon={BookOpen} label="Modules" value={course.moduleCount} />
            <MiniStat icon={Layers} label="Lessons" value={course.lessonCount} />
            <MiniStat icon={Clock} label="Hours" value={course.durationHours} />
          </div>

          {/* Rating + students row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400/40" />
              <span className="text-xs font-semibold tabular-nums">{course.rating}</span>
              <span className="text-[10px] text-muted-foreground">/5</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums">{course.studentsCount.toLocaleString()}</span>
              <span className="text-[10px]">students</span>
            </div>
            {isAuthenticated && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleBookmark(course.id) }}
                className="text-muted-foreground hover:text-violet-300 transition-colors p-1 -m-1"
                aria-label="Toggle bookmark"
              >
                {isBookmarked(course.id) ? <BookmarkCheck className="h-4 w-4 text-violet-300" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
            {onToggleCompare && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleCompare() }}
                disabled={compareDisabled && !compareActive}
                aria-pressed={compareActive}
                aria-label={compareActive ? `Remove ${course.shortName} from comparison` : `Add ${course.shortName} to comparison`}
                title={compareDisabled && !compareActive ? "You can compare up to 3 courses" : "Compare"}
                className={cn(
                  "p-1 -m-1 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
                  compareActive
                    ? "text-violet-300 bg-violet-500/15"
                    : "text-muted-foreground hover:text-violet-300",
                  compareDisabled && !compareActive && "opacity-40 cursor-not-allowed hover:text-muted-foreground",
                )}
              >
                <Scale className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {/* CTA + Progress */}
          <div className="mt-auto">
            <Button
              size="sm"
              className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
              onClick={(e) => { e.stopPropagation(); navigate({ name: "course", courseId: course.id }); }}
            >
              {course.enrollment ? "Continue Learning" : "Enroll Now"}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>

            {course.enrollment && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[9px] mb-1 font-mono">
                  <span className="text-muted-foreground tracking-wider">PROGRESS</span>
                  <span className="text-violet-300">{course.enrollment.progress}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${course.enrollment.progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </CursorGlow>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/40 p-2 text-center">
      <Icon className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
      <div className="text-xs font-semibold tabular-nums">{value}</div>
      <div className="text-[8px] text-muted-foreground/70 uppercase tracking-wider">{label}</div>
    </div>
  )
}

/* ============================================================
   CourseListRow - compact horizontal row for "list" view mode
   ============================================================ */
function CourseListRow({
  course, compareActive, compareDisabled, onToggleCompare,
}: {
  course: CourseItem
  compareActive?: boolean
  compareDisabled?: boolean
  onToggleCompare?: () => void
}) {
  const { navigate } = useAppStore()
  const image = getCourseImage(course)
  const levelStyle = LEVEL_STYLES[course.level] || LEVEL_STYLES.Intermediate

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card/70 p-3 cursor-pointer transition-all duration-300 hover:border-violet-500/40 hover:bg-card"
      onClick={() => navigate({ name: "course", courseId: course.id })}
    >
      {/* thumbnail */}
      <div className="relative size-16 sm:size-20 rounded-lg overflow-hidden shrink-0">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      </div>

      {/* main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-mono font-bold text-violet-200">{course.shortName}</span>
          <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", levelStyle.badge)}>{course.level.toUpperCase()}</span>
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{course.category}</span>
        </div>
        <h3 className="text-sm font-semibold truncate group-hover:text-violet-200 transition-colors">{course.title}</h3>
        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Clock className="size-3" aria-hidden />{course.durationHours}h</span>
          <span className="flex items-center gap-1"><BookOpen className="size-3" aria-hidden />{course.lessonCount} lessons</span>
          <span className="flex items-center gap-1"><Star className="size-3 text-amber-400" aria-hidden />{course.rating}</span>
          <span className="hidden md:inline">{course.instructor.name}</span>
        </div>
      </div>

      {/* right: price + CTA + compare */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className={cn(
          "hidden sm:inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-semibold",
          course.price > 0 ? "bg-amber-500/15 border-amber-500/40 text-amber-200" : "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
        )}>
          {course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}` : "FREE"}
        </span>
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleCompare() }}
            disabled={compareDisabled && !compareActive}
            aria-pressed={compareActive}
            aria-label={compareActive ? `Remove ${course.shortName} from comparison` : `Add ${course.shortName} to comparison`}
            className={cn(
              "h-8 w-8 rounded-lg border flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
              compareActive ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-border/60 text-muted-foreground hover:text-violet-300",
              compareDisabled && !compareActive && "opacity-40 cursor-not-allowed",
            )}
          >
            <Scale className="size-4" aria-hidden />
          </button>
        )}
        <Button
          size="sm"
          className="bg-violet-600 hover:bg-violet-500 btn-premium"
          onClick={(e) => { e.stopPropagation(); navigate({ name: "course", courseId: course.id }) }}
        >
          {course.enrollment ? "Continue" : "Enroll"}
          <ArrowRight className="size-3.5 ml-1" aria-hidden />
        </Button>
      </div>
    </motion.div>
  )
}
