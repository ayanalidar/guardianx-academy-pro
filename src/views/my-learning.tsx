"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { useUser } from "@/hooks/use-user"
import { colorFor, LEVEL_COLORS } from "@/lib/colors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  GraduationCap, BookOpen, Clock, ChevronRight, CheckCircle2,
  PlayCircle, Target, ArrowRight, Sparkles, Shield, Zap, Compass,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, Counter, CursorGlow,
  MagneticButton, FadeIn,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

interface CourseItem {
  id: string; slug: string; title: string; shortName: string; description: string
  category: string; level: string; durationHours: number; rating: number
  studentsCount: number; color: string; thumbnail: string | null
  instructor: { id: string; name: string; title: string | null }
  lessonCount: number; moduleCount: number
  enrollment?: { progress: number; completed: boolean; lastAccessed: string | null; enrolledAt: string } | null
}

interface ResumeData {
  lessonId: string
  lessonTitle: string
  lessonType: string
  durationMin: number
  position: number
  courseId: string
  courseTitle: string
  courseShortName: string
  courseColor: string
  moduleTitle: string
  reason: "in-progress" | "next-up"
}

export function MyLearningView() {
  const { navigate } = useAppStore()
  const { user, gamification } = useUser()

  const { data, isLoading } = useQuery<{ courses: CourseItem[] }>({
    queryKey: ["courses", "enrolled", user?.id],
    queryFn: () => api(`/api/courses?enrolled=true&userId=${user?.id}`),
    enabled: !!user,
  })

  // Recommended courses - published courses the user has NOT enrolled in.
  // Fetched in parallel; we slice to 6 in the UI.
  const { data: recData, isLoading: recLoading } = useQuery<{ courses: CourseItem[] }>({
    queryKey: ["courses", "recommended", user?.id],
    queryFn: () => api(`/api/courses?status=not-started&userId=${user?.id}`),
    enabled: !!user,
  })

  const { data: resumeData, isLoading: resumeLoading } = useQuery<{ resume: ResumeData | null }>({
    queryKey: ["me", "resume"],
    queryFn: () => api("/api/me/resume"),
    enabled: !!user,
  })

  const courses = data?.courses ?? []
  const recommended = (recData?.courses ?? []).slice(0, 6)
  const resume = resumeData?.resume ?? null
  const inProgress = courses.filter((c) => !c.enrollment?.completed)
  const completed = courses.filter((c) => c.enrollment?.completed)
  const totalXp = gamification?.xp ?? 0

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-violet-600/6 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-emerald-500/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized headline
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em]">
              {courses.length} ACTIVE · {completed.length} COMPLETED
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-4 text-balance">
            <TextReveal text="My" />{" "}
            <span className="text-gradient-premium">
              <TextReveal text="learning." delay={0.2} />
            </span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p className="text-muted-foreground max-w-xl mb-12 text-base lg:text-lg leading-relaxed">
            Track your progress. Pick up where you left off. Reach the next level.
          </p>
        </ScrollReveal>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-72 mb-8" />
            <div className="grid lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          </div>
        ) : courses.length === 0 ? (
          /* ====================================================
              EMPTY STATE - premium
              ==================================================== */
          <EmptyLearningState />
        ) : (
          <>
            {/* ====================================================
                CONTINUE LEARNING - dominant element
                ==================================================== */}
            {resumeLoading ? (
              <Skeleton className="h-72 mb-16" />
            ) : resume ? (
              <ScrollReveal delay={0.4}>
                <ContinueLearning resume={resume} />
              </ScrollReveal>
            ) : null}

            {/* ====================================================
                STATS STRIP - border-left editorial
                ==================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16 mt-8">
              {[
                { label: "Total enrollments", value: courses.length, accent: "border-violet-500/50", color: "text-violet-300", icon: GraduationCap },
                { label: "In progress", value: inProgress.length, accent: "border-cyan-500/50", color: "text-cyan-300", icon: PlayCircle },
                { label: "Completed", value: completed.length, accent: "border-emerald-500/50", color: "text-emerald-300", icon: CheckCircle2 },
                { label: "Total XP", value: totalXp, accent: "border-amber-500/50", color: "text-amber-300", icon: Zap },
              ].map((s, i) => (
                <ScrollReveal key={s.label} delay={0.5 + i * 0.06}>
                  <div className={cn("border-l pl-5", s.accent)}>
                    <s.icon className={cn("h-4 w-4 mb-3", s.color)} />
                    <div className="text-4xl lg:text-5xl font-bold tracking-[-0.03em] mb-1">
                      <Counter value={s.value} />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* ====================================================
                IN-PROGRESS COURSES - editorial list with progress bars
                ==================================================== */}
            {inProgress.length > 0 && (
              <section className="mb-20">
                <ScrollReveal>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
                    <div>
                      <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">
                        {inProgress.length > 0 && completed.length === 0 ? "01" : "01"} - IN PROGRESS
                      </p>
                      <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Continue your journey</h2>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{inProgress.length} COURSE{inProgress.length !== 1 ? "S" : ""}</span>
                  </div>
                </ScrollReveal>

                <Stagger className="space-y-3" staggerChildren={0.08}>
                  {inProgress.map((c) => (
                    <StaggerItem key={c.id}>
                      <EnrolledCourseRow course={c} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* ====================================================
                COMPLETED COURSES - with certificate links
                ==================================================== */}
            {completed.length > 0 && (
              <section className="mb-20">
                <ScrollReveal>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
                    <div>
                      <p className="text-[10px] font-mono text-emerald-400 tracking-[0.3em] mb-1">
                        {inProgress.length > 0 ? "02" : "01"} - COMPLETED
                      </p>
                      <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Earned credentials</h2>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{completed.length} CERTIFIED</span>
                  </div>
                </ScrollReveal>

                <Stagger className="space-y-3" staggerChildren={0.08}>
                  {completed.map((c) => (
                    <StaggerItem key={c.id}>
                      <CompletedCourseRow course={c} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* ====================================================
                RECOMMENDED COURSES - courses the user hasn't enrolled in
                ==================================================== */}
            <RecommendedCoursesSection
              courses={recommended}
              loading={recLoading}
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   ContinueLearning - dominant hero element (matches dashboard CurrentMission)
   ============================================================ */
function ContinueLearning({ resume }: { resume: ResumeData }) {
  const { navigate } = useAppStore()
  const col = colorFor(resume.courseColor || "violet")
  const reasonLabel = resume.reason === "in-progress" ? "CONTINUE WHERE YOU LEFT OFF" : "START YOUR NEXT LESSON"

  return (
    <CursorGlow color="oklch(0.6 0.2 295 / 0.06)" className="group">
      <div
        className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-card/30 cursor-pointer transition-all duration-500 group-hover:border-violet-500/50 group-hover:shadow-[0_30px_80px_-30px] group-hover:shadow-violet-500/20"
        onClick={() => navigate({ name: "lesson", lessonId: resume.lessonId, courseId: resume.courseId })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            navigate({ name: "lesson", lessonId: resume.lessonId, courseId: resume.courseId })
          }
        }}
      >
        <div className="grid lg:grid-cols-12 gap-0">
          {/* Visual side */}
          <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto overflow-hidden min-h-[280px]">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-cyan-950/20" />
            <div className="absolute inset-0 bg-grid opacity-15" />
            <div className="absolute inset-0 opacity-40">
              <NetworkVisualization variant="section" className="w-full h-full" />
            </div>
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm">
              <PlayCircle className="h-3.5 w-3.5 text-violet-300" />
              <span className="text-[10px] font-mono text-violet-300 tracking-[0.2em]">RESUME</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[clamp(3rem,8vw,6rem)] font-bold font-mono text-gradient-premium leading-none">
                {resume.courseShortName}
              </span>
            </div>
          </div>

          {/* Content side */}
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-1 w-1 rounded-full bg-violet-400 pulse-dot" />
                <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">{reasonLabel}</span>
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold tracking-[-0.02em] mb-3 text-balance leading-tight">
                {resume.lessonTitle}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {resume.courseTitle}
                <span className="text-muted-foreground/60"> · {resume.moduleTitle}</span>
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-5 text-xs text-muted-foreground mb-6">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-violet-300" />
                  <span className="font-mono">{resume.lessonType?.toUpperCase() ?? "LESSON"}</span>
                </span>
                {resume.durationMin > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-300" />
                    <span className="font-mono">{resume.durationMin} MIN</span>
                  </span>
                )}
                {resume.reason === "in-progress" && resume.position > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-amber-300" />
                    <span className="font-mono">PAGE {resume.position}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MagneticButton strength={0.3}>
                <Button className="bg-violet-600 hover:bg-violet-500 btn-premium px-6 py-5 shadow-[0_8px_30px_-8px] shadow-violet-500/30">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {resume.reason === "in-progress" ? "Resume Lesson" : "Start Lesson"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </MagneticButton>
              <Button variant="ghost" onClick={() => navigate({ name: "course", courseId: resume.courseId })}>
                Course overview <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   EnrolledCourseRow - editorial list row with progress bar
   ============================================================ */
function EnrolledCourseRow({ course: c }: { course: CourseItem }) {
  const { navigate } = useAppStore()
  const col = colorFor(c.color)
  const progress = c.enrollment?.progress ?? 0

  return (
    <CursorGlow color="oklch(0.6 0.2 295 / 0.05)" className="group">
      <div
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/20 transition-all duration-300 hover:border-violet-500/30 hover:bg-card/30 cursor-pointer"
        onClick={() => navigate({ name: "course", courseId: c.id })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            navigate({ name: "course", courseId: c.id })
          }
        }}
      >
        {/* Accent line on left */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500/60 to-violet-500/10 group-hover:from-violet-400 group-hover:to-violet-500/20 transition-colors" />

        <div className="p-5 lg:p-6 flex items-center gap-5">
          {/* Course code badge */}
          {c.thumbnail ? (
            <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-border">
              <img
                src={c.thumbnail}
                alt={c.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            </div>
          ) : (
            <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-mono font-bold text-xl", col.bg, col.border, col.text)}>
              {c.shortName}
            </div>
          )}

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-base lg:text-lg font-bold tracking-tight group-hover:text-violet-200 transition-colors truncate">
                {c.title}
              </h3>
              <Badge variant="outline" className={cn("text-[9px] font-mono uppercase", LEVEL_COLORS[c.level])}>{c.level}</Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{c.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{c.lessonCount} LESSONS</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.durationHours}H</span>
              <span className="text-muted-foreground/70">BY {c.instructor.name.toUpperCase()}</span>
              {c.enrollment?.lastAccessed && (
                <span className="flex items-center gap-1 text-violet-300/70">
                  <Target className="h-3 w-3" />
                  LAST {new Date(c.enrollment.lastAccessed).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>

          {/* Progress + action */}
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 w-48">
            <div className="flex items-center gap-2 w-full">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className={cn("text-xs font-mono font-bold tabular-nums", progress > 0 ? "text-violet-300" : "text-muted-foreground")}>
                {progress}%
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.15em] bg-violet-500/10 text-violet-200 border border-violet-500/20 group-hover:bg-violet-500/20 transition-colors">
              <PlayCircle className="h-3 w-3" />
              {progress > 0 ? "Continue" : "Start"}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-300 transition-colors shrink-0" />
        </div>

        {/* Mobile progress bar */}
        <div className="sm:hidden px-5 pb-4">
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className={cn("text-xs font-mono font-bold", progress > 0 ? "text-violet-300" : "text-muted-foreground")}>{progress}%</span>
          </div>
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   CompletedCourseRow - with certificate link
   ============================================================ */
function CompletedCourseRow({ course: c }: { course: CourseItem }) {
  const { navigate } = useAppStore()
  const col = colorFor(c.color)

  return (
    <CursorGlow color="oklch(0.7 0.15 155 / 0.05)" className="group">
      <div
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] cursor-pointer"
        onClick={() => navigate({ name: "course", courseId: c.id })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            navigate({ name: "course", courseId: c.id })
          }
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500/60 to-emerald-500/20" />

        <div className="p-5 lg:p-6 flex items-center gap-5">
          {/* Course code badge */}
          <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-mono font-bold text-xl", col.bg, col.border, col.text)}>
            {c.shortName}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-base lg:text-lg font-bold tracking-tight group-hover:text-emerald-200 transition-colors truncate">
                {c.title}
              </h3>
              <Badge className="text-[9px] font-mono uppercase tracking-[0.15em] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> COMPLETED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{c.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{c.lessonCount} LESSONS</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.durationHours}H</span>
              {c.enrollment?.completed && c.enrollment.lastAccessed && (
                <span className="text-emerald-300/70">FINISHED {new Date(c.enrollment.lastAccessed).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              )}
            </div>
          </div>

          {/* Certificate link */}
          <Button
            variant="outline"
            size="sm"
            className="btn-premium border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15 hover:text-amber-100 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              navigate({ name: "certificates" })
            }}
          >
            <Shield className="h-3.5 w-3.5 mr-1.5" /> Certificate
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   Empty state - premium
   ============================================================ */
function EmptyLearningState() {
  const { navigate } = useAppStore()
  return (
    <ScrollReveal delay={0.4}>
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/30 p-16 lg:p-24 text-center">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <NetworkVisualization variant="section" className="w-full h-full" />
        </div>
        <div className="relative z-10 max-w-md mx-auto">
          <div className="inline-flex p-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
            <GraduationCap className="h-10 w-10 text-violet-300" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em] mb-3">NO ENROLLMENTS YET</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] mb-3 text-balance">
            Ready to begin?
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Browse our catalog of cyber security certification courses and start your journey today.
          </p>
          <MagneticButton strength={0.3}>
            <Button
              onClick={() => navigate({ name: "catalog" })}
              className="bg-violet-600 hover:bg-violet-500 btn-premium px-6 py-5"
            >
              <BookOpen className="h-4 w-4 mr-2" /> Explore Courses
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </MagneticButton>
        </div>
      </div>
    </ScrollReveal>
  )
}

/* ============================================================
   RecommendedCoursesSection - courses the user hasn't enrolled in
   ============================================================ */
function RecommendedCoursesSection({
  courses,
  loading,
}: {
  courses: CourseItem[]
  loading: boolean
}) {
  const { navigate } = useAppStore()

  return (
    <section>
      <ScrollReveal>
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-border/60">
          <div>
            <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-1">
              03 - RECOMMENDED FOR YOU
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Keep the momentum going
            </h2>
          </div>
          <button
            onClick={() => navigate({ name: "catalog" })}
            className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-violet-300 tracking-[0.2em] transition-colors"
          >
            BROWSE ALL <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </ScrollReveal>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-12 text-center">
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-4">
                <Compass className="h-6 w-6 text-amber-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 tracking-[-0.02em]">
                You&apos;re enrolled in everything
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You&apos;ve enrolled in every published course on the platform.
                Check the catalog for new additions.
              </p>
            </div>
          </div>
        </FadeIn>
      ) : (
        <Stagger
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          staggerChildren={0.07}
        >
          {courses.map((c) => (
            <StaggerItem key={c.id}>
              <RecommendedCourseCard course={c} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  )
}

/* ============================================================
   RecommendedCourseCard - compact premium card with Enroll CTA
   ============================================================ */
function RecommendedCourseCard({ course: c }: { course: CourseItem }) {
  const { navigate } = useAppStore()
  const col = colorFor(c.color)

  return (
    <CursorGlow color="oklch(0.7 0.15 85 / 0.05)" className="group h-full">
      <div
        className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 flex flex-col transition-all duration-300 hover:border-amber-500/30 hover:bg-card/30 cursor-pointer"
        onClick={() => navigate({ name: "course", courseId: c.id })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            navigate({ name: "course", courseId: c.id })
          }
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/40 via-amber-500/10 to-transparent" />

        {/* Header - thumbnail/code + level badge */}
        <div className="flex items-start justify-between mb-4">
          {c.thumbnail ? (
            <div className="h-12 w-12 rounded-lg overflow-hidden border border-border">
              <img
                src={c.thumbnail}
                alt={c.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          ) : (
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg border font-mono font-bold text-sm",
                col.bg,
                col.border,
                col.text
              )}
            >
              {c.shortName}
            </div>
          )}
          <Badge
            variant="outline"
            className={cn("text-[9px] font-mono uppercase", LEVEL_COLORS[c.level])}
          >
            {c.level}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold tracking-tight mb-1.5 group-hover:text-amber-200 transition-colors line-clamp-2">
          {c.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{c.description}</p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-mono mb-4">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {c.lessonCount} LESSONS
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {c.durationHours}H
          </span>
          <span className="text-muted-foreground/70">BY {c.instructor.name.toUpperCase()}</span>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.15em] bg-amber-500/10 text-amber-200 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
            <Sparkles className="h-3 w-3" />
            View Course
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </CursorGlow>
  )
}

