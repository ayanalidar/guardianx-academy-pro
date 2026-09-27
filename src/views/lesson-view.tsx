"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { colorFor, NOTE_COLORS } from "@/lib/colors"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronLeft, ChevronRight, CheckCircle2, StickyNote, FileText, BookOpen,
  PenLine, Trash2, Plus, Save, ChevronUp, ChevronDown, Hash, Clock, Lock,
  Award, AlertCircle, Lightbulb, Terminal, GraduationCap, Circle, PlayCircle,
  ArrowRight, Bookmark, ListTree, Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, MagneticButton,
  CursorGlow, BlurReveal, FadeIn,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

interface LessonData {
  lesson: {
    id: string; title: string; type: string; content: string; pdfPages: number
    durationMin: number; preview: boolean; hasAccess: boolean
    module: { id: string; title: string; courseId: string; course: { id: string; title: string; shortName: string; slug: string } }
  }
  quiz: { id: string; title: string; questions: { id: string; text: string; options: string[] }[] } | null
  progress: { completed: boolean; position: number } | null
  prev: { id: string; title: string } | null
  next: { id: string; title: string } | null
}

interface NoteItem {
  id: string; title: string; content: string; color: string; pinned: boolean
  lessonId: string | null; courseId: string | null
  updatedAt: string
  lesson?: { id: string; title: string; module: { course: { id: string; title: string; shortName: string } } } | null
}

interface CourseModule {
  id: string; title: string
  lessons: { id: string; title: string; type: string; durationMin: number; preview: boolean }[]
}

interface CourseData {
  course: {
    id: string; title: string; shortName: string; color: string
    modules: CourseModule[]
    instructor: { id: string; name: string; title: string | null }
  }
  lessonProgress: Record<string, { completed: boolean; position: number }>
  totalLessons: number
  completedLessons: number
  progressPct: number
}

export function LessonView() {
  const { view, navigate } = useAppStore()
  const lessonId = view.name === "lesson" ? view.lessonId : ""
  const courseId = view.name === "lesson" ? view.courseId : ""
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<LessonData>({
    queryKey: ["lesson", lessonId],
    queryFn: () => api(`/api/lessons/${lessonId}`),
    enabled: !!lessonId,
  })

  // Fetch the course for module navigation sidebar (cache-shared with course-detail view)
  const { data: courseData } = useQuery<CourseData>({
    queryKey: ["course", courseId],
    queryFn: () => api(`/api/courses/${courseId}`),
    enabled: !!courseId,
  })

  const [page, setPage] = React.useState(1)
  const [notesOpen, setNotesOpen] = React.useState(true)
  const [noteDraft, setNoteDraft] = React.useState("")

  // reset page when lesson changes
  React.useEffect(() => {
    setPage(data?.progress?.position || 1)
  }, [lessonId])

  const { data: notesData } = useQuery<{ notes: NoteItem[] }>({
    queryKey: ["notes", lessonId],
    queryFn: () => api(`/api/notes?lessonId=${lessonId}`),
    enabled: !!lessonId,
  })
  const notes = notesData?.notes ?? []

  const progressMutation = useMutation({
    mutationFn: (body: { completed?: boolean; position?: number }) =>
      api(`/api/lessons/${lessonId}/progress`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] })
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      if (vars.completed) {
        toast.success("Lesson marked complete!")
        qc.invalidateQueries({ queryKey: ["me"] })
        qc.invalidateQueries({ queryKey: ["achievements"] })
      }
      // surface gamification events (XP, achievements, level-ups)
      if (_data?.gamification) {
        import("@/components/providers/gamification-toaster").then((m) => m.showGamification(_data.gamification))
      }
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: (body: any) => api("/api/notes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", lessonId] })
      qc.invalidateQueries({ queryKey: ["notes"] })
      qc.invalidateQueries({ queryKey: ["me"] })
      setNoteDraft("")
      toast.success("Note saved")
    },
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => api(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", lessonId] }),
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", lessonId] })
      qc.invalidateQueries({ queryKey: ["me"] })
      toast.success("Note deleted")
    },
  })

  const savePosition = React.useCallback(
    (p: number) => {
      progressMutation.mutate({ position: p })
    },
    [progressMutation]
  )

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <Skeleton className="h-[280px] w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Skeleton className="lg:col-span-8 h-[700px] rounded-2xl" />
            <Skeleton className="lg:col-span-4 h-[700px] rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }
  if (!data) return null

  const { lesson, quiz, progress, prev, next } = data
  const totalPages = Math.max(lesson.pdfPages || 1, lesson.type === "pdf" ? 1 : 1)

  // Determine current lesson's position in course for progress bar
  const allLessons: { id: string }[] = (courseData?.course.modules ?? []).flatMap((m) => m.lessons)
  const currentLessonIndex = allLessons.findIndex((l) => l.id === lesson.id)
  const courseProgressPct = courseData?.progressPct ?? 0
  const lessonPositionInCourse = currentLessonIndex >= 0 ? ((currentLessonIndex + 1) / allLessons.length) * 100 : 0

  if (!lesson.hasAccess) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <FadeIn>
            <button
              onClick={() => navigate({ name: "course", courseId: lesson.module.courseId })}
              className="group inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-violet-300 transition-colors tracking-[0.2em] mb-12"
            >
              <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span className="uppercase">{lesson.module.course.shortName}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="uppercase">{lesson.module.title}</span>
            </button>
          </FadeIn>

          {/* Locked lesson hero */}
          <div className="relative overflow-hidden rounded-2xl border border-border/60">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-background to-transparent" />
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full" />

            <div className="relative z-10 p-8 lg:p-12">
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="outline" className="text-[10px] font-mono tracking-[0.3em] uppercase border-rose-500/30 text-rose-400 bg-rose-500/5">
                  <Lock className="h-2.5 w-2.5 mr-1" /> LOCKED
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
                  LESSON · {lesson.durationMin} MIN
                </span>
              </div>

              {/* Ghost shortName */}
              <div
                aria-hidden
                className="absolute top-6 right-6 text-[clamp(6rem,12vw,12rem)] font-bold tracking-[-0.05em] text-outline-violet opacity-30 pointer-events-none select-none"
              >
                {lesson.module.course.shortName}
              </div>

              <h1 className="relative text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.04em] mb-6 text-balance max-w-3xl">
                {lesson.title}
              </h1>

              {/* Blurred preview */}
              <div className="relative mt-8 max-w-3xl">
                <div
                  className="prose-guardianx max-w-none select-none blur-sm pointer-events-none overflow-hidden"
                  style={{ maxHeight: 280 }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {(lesson.content || "Lesson content preview").slice(0, 800) + "\n\n... (continue learning to read the full lesson)"}
                  </ReactMarkdown>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Lock overlay */}
            <div className="relative z-20 px-8 lg:px-12 pb-12 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-full" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
                    <Lock className="h-6 w-6 text-violet-300" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-semibold mb-0.5">This lesson is locked</p>
                  <p className="text-xs text-muted-foreground">
                    Enroll in <span className="text-foreground font-medium">{lesson.module.course.title}</span> to unlock all materials.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate({ name: "course", courseId: lesson.module.courseId })}>
                  View Course
                </Button>
                <Button onClick={() => navigate({ name: "course", courseId: lesson.module.courseId })}>
                  <GraduationCap className="h-4 w-4 mr-1.5" /> Enroll Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - breadcrumb + course position
            ==================================================== */}
        <FadeIn>
          <button
            onClick={() => navigate({ name: "course", courseId: lesson.module.courseId })}
            className="group inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-violet-300 transition-colors tracking-[0.2em] mb-8"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span className="uppercase">{lesson.module.course.shortName}</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="uppercase">{lesson.module.title}</span>
          </button>
        </FadeIn>

        {/* ====================================================
            HEADER - oversized lesson title with ghost shortName
            ==================================================== */}
        <div className="relative">
          {/* Ghost shortName - oversized outline text */}
          <div
            aria-hidden
            className="absolute -top-8 right-0 text-[clamp(4rem,12vw,12rem)] font-bold tracking-[-0.06em] text-outline-violet opacity-30 pointer-events-none select-none leading-none hidden md:block"
          >
            {lesson.module.course.shortName}
          </div>

          {/* NetworkVisualization as subtle accent */}
          <div className="absolute -top-12 -left-12 w-[400px] h-[300px] opacity-25 pointer-events-none hidden lg:block">
            <NetworkVisualization variant="minimal" className="w-full h-full" />
          </div>

          <div className="relative z-10 max-w-4xl">
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono tracking-[0.3em] uppercase border-violet-500/30 text-violet-300 bg-violet-500/5"
                >
                  {lesson.type === "pdf" ? <><FileText className="h-2.5 w-2.5 mr-1.5" /> DOCUMENT</> :
                   lesson.type === "reading" ? <><BookOpen className="h-2.5 w-2.5 mr-1.5" /> READING</> :
                   <><Terminal className="h-2.5 w-2.5 mr-1.5" /> LAB</>}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {lesson.durationMin} MIN
                </span>
                {progress?.completed && (
                  <Badge className="text-[10px] font-mono tracking-[0.3em] uppercase border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1.5" /> COMPLETED
                  </Badge>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-3">
                {lesson.module.title.toUpperCase()}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <h1 className="text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance mb-6">
                <TextReveal text={lesson.title} />
              </h1>
            </ScrollReveal>
          </div>
        </div>

        {/* ====================================================
            PROGRESS BAR - position in course
            ==================================================== */}
        <ScrollReveal delay={0.2}>
          <div className="mt-10 mb-12 max-w-4xl">
            <div className="flex items-center justify-between mb-2 text-[10px] font-mono tracking-[0.2em] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-violet-300" />
                COURSE PROGRESS
              </span>
              <span className="text-violet-300">
                {courseData?.completedLessons ?? 0} / {courseData?.totalLessons ?? 0} LESSONS
                {currentLessonIndex >= 0 && ` · LESSON ${currentLessonIndex + 1}`}
              </span>
            </div>
            <div className="relative h-1 bg-muted overflow-hidden rounded-full">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-1000"
                style={{ width: `${courseProgressPct}%` }}
              />
              {/* Current lesson marker */}
              {lessonPositionInCourse > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-300 ring-4 ring-violet-500/20 shadow-lg shadow-violet-500/50"
                  style={{ left: `calc(${lessonPositionInCourse}% - 6px)` }}
                />
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ====================================================
            MAIN LAYOUT - content + sticky sidebar
            ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ============= MAIN CONTENT ============= */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue={lesson.type === "pdf" ? "document" : "reading"}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <TabsList className="bg-card/30 backdrop-blur border border-border/60">
                  <TabsTrigger value="reading" className="data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Reading
                  </TabsTrigger>
                  {lesson.type === "pdf" && (
                    <TabsTrigger value="document" className="data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200">
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Document
                    </TabsTrigger>
                  )}
                  {quiz && (
                    <TabsTrigger value="quiz" className="data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200">
                      <Award className="h-3.5 w-3.5 mr-1.5" /> Quiz
                    </TabsTrigger>
                  )}
                </TabsList>

                <Button
                  variant={progress?.completed ? "default" : "outline"}
                  size="sm"
                  onClick={() => progressMutation.mutate({ completed: !progress?.completed })}
                  disabled={progressMutation.isPending}
                  className={cn(
                    "btn-premium",
                    progress?.completed
                      ? "bg-emerald-600 hover:bg-emerald-500 text-emerald-50 border-emerald-500/30"
                      : "border-violet-500/40 text-violet-200 hover:bg-violet-500/10"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {progress?.completed ? "Completed" : "Mark Complete"}
                </Button>
              </div>

              <TabsContent value="reading">
                <BlurReveal>
                  <Card className="relative overflow-hidden border-border/60 bg-card/40 backdrop-blur p-8 lg:p-12">
                    <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                    <div className="relative z-10 prose-guardianx max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {lesson.content || "No content available."}
                      </ReactMarkdown>
                    </div>
                  </Card>
                </BlurReveal>
              </TabsContent>

              {lesson.type === "pdf" && (
                <TabsContent value="document">
                  <PdfStyleViewer
                    content={lesson.content}
                    title={lesson.title}
                    totalPages={totalPages}
                    page={page}
                    onPageChange={(p) => {
                      setPage(p)
                      savePosition(p)
                    }}
                  />
                </TabsContent>
              )}

              {quiz && (
                <TabsContent value="quiz">
                  <QuizPanel quiz={quiz} lessonId={lesson.id} />
                </TabsContent>
              )}
            </Tabs>

            {/* ============= PREV / NEXT NAVIGATION ============= */}
            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border/40">
              {prev ? (
                <button
                  onClick={() => navigate({ name: "lesson", lessonId: prev.id, courseId })}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/30 backdrop-blur p-5 text-left hover:border-violet-500/40 transition-all"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-2">
                    <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                    PREVIOUS
                  </div>
                  <div className="text-sm font-medium truncate group-hover:text-violet-200 transition-colors">
                    {prev.title}
                  </div>
                </button>
              ) : <div />}
              {next ? (
                <button
                  onClick={() => navigate({ name: "lesson", lessonId: next.id, courseId })}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/30 backdrop-blur p-5 text-right hover:border-violet-500/40 transition-all"
                >
                  <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-2">
                    NEXT
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="text-sm font-medium truncate group-hover:text-violet-200 transition-colors">
                    {next.title}
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => navigate({ name: "course", courseId })}
                  className="group relative overflow-hidden rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 text-right hover:bg-violet-500/10 transition-all"
                >
                  <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-violet-300 tracking-[0.3em] mb-2">
                    FINISH
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div className="text-sm font-medium truncate text-violet-100">
                    Complete Course
                  </div>
                </button>
              )}
            </div>

            {page > 0 && lesson.type === "pdf" && (
              <div className="text-center text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                PAGE {page} / {totalPages}
              </div>
            )}
          </div>

          {/* ============= SIDEBAR ============= */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-4">
              {/* Module navigation */}
              {courseData && (
                <Card className="relative overflow-hidden border-border/60 bg-card/30 backdrop-blur p-5">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                      <ListTree className="h-4 w-4 text-violet-300" />
                      Module Outline
                    </h3>
                    <Badge variant="outline" className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground">
                      {courseData.totalLessons} LESSONS
                    </Badge>
                  </div>

                  <ScrollArea className="h-[420px] pr-3 -mr-3">
                    <Stagger className="space-y-5" staggerChildren={0.04}>
                      {courseData.course.modules.map((m: CourseModule, mi: number) => {
                        const moduleDone = m.lessons.filter((l) => courseData.lessonProgress[l.id]?.completed).length
                        const isCurrentModule = m.id === lesson.module.id
                        return (
                          <StaggerItem key={m.id} y={12}>
                            <div>
                              <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em]">
                                  {String(mi + 1).padStart(2, "0")}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-mono tracking-[0.2em] uppercase",
                                  isCurrentModule ? "text-violet-300" : "text-muted-foreground"
                                )}>
                                  {m.title}
                                </span>
                                <span className="text-[9px] text-muted-foreground/60 font-mono ml-auto">
                                  {moduleDone}/{m.lessons.length}
                                </span>
                              </div>
                              <div className="space-y-0.5 pl-5 border-l border-border/60">
                                {m.lessons.map((l) => {
                                  const done = courseData.lessonProgress[l.id]?.completed
                                  const isCurrent = l.id === lesson.id
                                  return (
                                    <button
                                      key={l.id}
                                      onClick={() => navigate({ name: "lesson", lessonId: l.id, courseId })}
                                      className={cn(
                                        "group w-full flex items-center gap-2 py-1.5 text-left transition-colors",
                                        isCurrent ? "" : "opacity-70 hover:opacity-100"
                                      )}
                                    >
                                      {done ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                      ) : isCurrent ? (
                                        <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-violet-400 flex items-center justify-center">
                                          <div className="h-1 w-1 rounded-full bg-violet-300" />
                                        </div>
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                                      )}
                                      <span className={cn(
                                        "flex-1 text-xs truncate transition-colors",
                                        isCurrent ? "text-violet-100 font-medium" : "text-muted-foreground group-hover:text-foreground"
                                      )}>
                                        {l.title}
                                      </span>
                                      {isCurrent && (
                                        <ArrowRight className="h-3 w-3 text-violet-300 shrink-0" />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </StaggerItem>
                        )
                      })}
                    </Stagger>
                  </ScrollArea>
                </Card>
              )}

              {/* Lesson metadata */}
              <Card className="relative overflow-hidden border-border/60 bg-card/30 backdrop-blur p-5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
                  <Terminal className="h-4 w-4 text-cyan-300" />
                  Lesson Specs
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono tracking-wider">TYPE</span>
                    <span className="uppercase text-foreground font-mono tracking-wider">{lesson.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono tracking-wider">DURATION</span>
                    <span className="text-foreground font-mono">{lesson.durationMin} min</span>
                  </div>
                  {lesson.type === "pdf" && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono tracking-wider">PAGES</span>
                      <span className="text-foreground font-mono">{totalPages}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono tracking-wider">MODULE</span>
                    <span className="text-foreground font-mono truncate max-w-[140px] text-right">{lesson.module.title}</span>
                  </div>
                  {quiz && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono tracking-wider">QUIZ</span>
                      <span className="text-amber-300 font-mono">{quiz.questions.length} Q</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono tracking-wider">STATUS</span>
                    <span className={cn(
                      "font-mono uppercase tracking-wider",
                      progress?.completed ? "text-emerald-300" : "text-amber-300"
                    )}>
                      {progress?.completed ? "DONE" : "IN PROGRESS"}
                    </span>
                  </div>
                </div>

                {/* Complete button */}
                <Button
                  className="w-full mt-5 btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border-violet-500/30"
                  onClick={() => progressMutation.mutate({ completed: !progress?.completed })}
                  disabled={progressMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {progress?.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
              </Card>

              {/* Notes - floating panel */}
              {notesOpen && (
                <Card className="relative overflow-hidden border-border/60 bg-card/30 backdrop-blur p-5">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <StickyNote className="h-4 w-4 text-amber-300" /> On-the-Go Notes
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                        {notes.length}
                      </Badge>
                      <button
                        onClick={() => setNotesOpen(false)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="Collapse notes"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick add */}
                  <div className="space-y-2 mb-4">
                    <Textarea
                      placeholder="Jot down a quick note, command, or insight..."
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      className="min-h-[80px] text-sm resize-none bg-background/50 border-border/60 focus-visible:ring-violet-500/30"
                    />
                    <Button
                      size="sm"
                      className="w-full btn-premium bg-violet-600 hover:bg-violet-500"
                      disabled={!noteDraft.trim() || addNoteMutation.isPending}
                      onClick={() => addNoteMutation.mutate({
                        title: noteDraft.slice(0, 40) + (noteDraft.length > 40 ? "..." : ""),
                        content: noteDraft,
                        lessonId,
                        courseId,
                        color: "amber",
                      })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Save Note
                    </Button>
                  </div>

                  <div className="h-px bg-border/60 my-3" />

                  {/* Notes list */}
                  <ScrollArea className="h-[340px] pr-3 -mr-3">
                    <div className="space-y-2 mt-3">
                      {notes.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                          <PenLine className="h-6 w-6 mx-auto mb-2 opacity-40" />
                          No notes yet for this lesson.
                        </div>
                      ) : (
                        notes.map((n) => (
                          <NoteCard
                            key={n.id}
                            note={n}
                            onUpdate={(body) => updateNoteMutation.mutate({ id: n.id, ...body })}
                            onDelete={() => deleteNoteMutation.mutate(n.id)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              )}

              {!notesOpen && (
                <Button variant="outline" className="w-full" onClick={() => setNotesOpen(true)}>
                  <StickyNote className="h-4 w-4 mr-1.5" /> Open Notes ({notes.length})
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// ---- PDF-style paginated document viewer (premium frame) ----
function PdfStyleViewer({ content, title, totalPages, page, onPageChange }: {
  content: string; title: string; totalPages: number; page: number; onPageChange: (p: number) => void
}) {
  const pages = React.useMemo(() => {
    const blocks = content.split(/\n(?=#{1,3}\s)/).filter(Boolean)
    if (blocks.length <= 1) {
      const paras = content.split(/\n\n+/)
      const chunks: string[] = []
      for (let i = 0; i < paras.length; i += 3) chunks.push(paras.slice(i, i + 3).join("\n\n"))
      return chunks.length ? chunks : [content]
    }
    return blocks
  }, [content])

  const numPages = Math.max(pages.length, totalPages, 1)
  const current = Math.min(page, numPages)
  const pageContent = pages[current - 1] ?? pages[0] ?? content

  return (
    <BlurReveal>
      <div className="space-y-3">
        {/* Premium toolbar */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border/60 bg-card/40 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/30 blur-md" />
              <FileText className="relative h-4 w-4 text-violet-300" />
            </div>
            <span className="font-mono truncate max-w-[200px]">{title}.pdf</span>
            <span className="text-[9px] text-violet-300/70 font-mono tracking-[0.2em] uppercase ml-2">SECURE DOCUMENT</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-violet-500/10 hover:text-violet-300" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono px-2 text-violet-200">{current} / {numPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-violet-500/10 hover:text-violet-300" disabled={current >= numPages} onClick={() => onPageChange(current + 1)}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Page frame - premium document look */}
        <div className="relative rounded-xl border border-border/60 bg-[oklch(0.97_0.005_150)] dark:bg-[oklch(0.13_0.015_200)] overflow-hidden shadow-2xl shadow-violet-950/20">
          {/* Top atmospheric edge */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 pointer-events-none" />
          {/* Inner violet accent border */}
          <div className="absolute inset-0 rounded-xl pointer-events-none border border-violet-500/10" />

          <div className="p-8 lg:p-12 min-h-[540px]">
            <div className="prose-guardianx max-w-none text-[oklch(0.18_0.02_200)] dark:text-[oklch(0.95_0.01_150)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{pageContent}</ReactMarkdown>
            </div>
          </div>

          <div className="px-8 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono tracking-wider">GUARDIANX · {title}</span>
            <span className="font-mono">PAGE {current} OF {numPages}</span>
          </div>
        </div>

        {/* Page dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {Array.from({ length: Math.min(numPages, 12) }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i + 1)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i + 1 === current ? "w-8 bg-violet-400 shadow-sm shadow-violet-500/50" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </BlurReveal>
  )
}

// ---- Note card ----
function NoteCard({ note, onUpdate, onDelete }: {
  note: NoteItem
  onUpdate: (body: any) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(note.content)
  const colorObj = NOTE_COLORS.find((c) => c.id === note.color) ?? NOTE_COLORS[0]

  React.useEffect(() => setText(note.content), [note.content])

  return (
    <div className={cn("rounded-lg border p-3 transition-all", colorObj.bg, colorObj.border)}>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[60px] text-xs bg-background/50" />
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-violet-500/10" onClick={() => { onUpdate({ content: text }); setEditing(false) }}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setText(note.content); setEditing(false) }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs font-medium line-clamp-1">{note.title}</span>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => onUpdate({ pinned: !note.pinned })} className="text-muted-foreground hover:text-amber-300 p-0.5 transition-colors" aria-label="Pin note">
                <Hash className={cn("h-3 w-3", note.pinned && "text-amber-300")} />
              </button>
              <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-violet-300 p-0.5 transition-colors" aria-label="Edit note">
                <PenLine className="h-3 w-3" />
              </button>
              <button onClick={onDelete} className="text-muted-foreground hover:text-rose-400 p-0.5 transition-colors" aria-label="Delete note">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{note.content}</p>
          <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono tracking-wider">
            {new Date(note.updatedAt).toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  )
}

// ---- Quiz panel (premium) ----
function QuizPanel({ quiz, lessonId }: { quiz: NonNullable<LessonData["quiz"]>; lessonId: string }) {
  const qc = useQueryClient()
  const [answers, setAnswers] = React.useState<Record<string, number>>({})
  const [submitted, setSubmitted] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)

  const submitMutation = useMutation({
    mutationFn: () => api(`/api/quizzes/${quiz.id}/attempt`, { method: "POST", body: JSON.stringify({ answers }) }),
    onSuccess: (data) => {
      setResult(data)
      setSubmitted(true)
      qc.invalidateQueries({ queryKey: ["me"] })
      if (data.passed) toast.success(`Quiz passed! Score: ${data.score}%`)
      else toast.error(`Quiz not passed. Score: ${data.score}%`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined)

  return (
    <BlurReveal>
      <Card className="relative overflow-hidden border-border/60 bg-card/40 backdrop-blur p-6 lg:p-8">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-mono text-amber-300 tracking-[0.3em] mb-1">KNOWLEDGE CHECK</p>
            <h3 className="text-2xl font-bold tracking-tight">{quiz.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono tracking-wider">
              {quiz.questions.length} QUESTIONS · 70% TO PASS
            </p>
          </div>
          {result && (
            <Badge className={cn(
              "text-sm font-mono px-3 py-1.5 border",
              result.passed
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            )}>
              SCORE: {result.score}%
            </Badge>
          )}
        </div>

        <div className="space-y-8">
          {quiz.questions.map((q, qi) => {
            const selected = answers[q.id]
            const correct = result?.breakdown?.find((b: any) => b.questionId === q.id)?.correctIndex
            return (
              <div key={q.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/30 text-xs font-mono text-violet-200">
                    {String(qi + 1).padStart(2, "0")}
                  </span>
                  <p className="font-medium text-sm lg:text-base pt-0.5">{q.text}</p>
                </div>
                <div className="grid gap-2 pl-10">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi
                    const isCorrect = submitted && correct === oi
                    const isWrong = submitted && isSelected && correct !== oi
                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-lg border text-sm text-left transition-all",
                          isSelected && !submitted && "border-violet-500/50 bg-violet-500/10",
                          !isSelected && !submitted && "border-border/60 hover:border-violet-500/30 hover:bg-violet-500/[0.03]",
                          isCorrect && "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
                          isWrong && "border-rose-500/50 bg-rose-500/10 text-rose-200",
                          submitted && !isCorrect && !isWrong && "opacity-50"
                        )}
                      >
                        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-mono font-bold transition-colors",
                          isSelected ? "border-violet-500 bg-violet-500 text-violet-950" :
                          isCorrect ? "border-emerald-500 bg-emerald-500 text-emerald-950" :
                          "border-muted-foreground/40 group-hover:border-violet-500/40")}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        {isWrong && <AlertCircle className="h-4 w-4 text-rose-400" />}
                      </button>
                    )
                  })}
                </div>
                {submitted && result?.breakdown?.find((b: any) => b.questionId === q.id)?.explanation && (
                  <div className="ml-10 p-3 rounded-lg bg-cyan-500/[0.05] border border-cyan-500/20 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {result.breakdown.find((b: any) => b.questionId === q.id).explanation}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!submitted ? (
          <Button
            className="w-full mt-8 btn-premium bg-violet-600 hover:bg-violet-500 text-violet-50 border border-violet-500/30"
            disabled={!allAnswered || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Answers"}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full mt-8 border-violet-500/40 text-violet-200 hover:bg-violet-500/10"
            onClick={() => { setSubmitted(false); setResult(null); setAnswers({}) }}
          >
            Retake Quiz
          </Button>
        )}
      </Card>
    </BlurReveal>
  )
}
