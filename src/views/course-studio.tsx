"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  FileText,
  FileVideo,
  FlaskConical,
  Pencil,
  Eye,
  EyeOff,
  Layers,
  Clock,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Users,
  IndianRupee,
  Settings2,
  Bot,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { COURSE_LIST_FIELDS, parseCourseList } from "@/lib/course-lists"
import {
  BlueprintDialog,
  CurriculumDialog,
  LessonDeepDiveDialog,
} from "@/components/studio/ai-architect"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type LessonType = "reading" | "pdf" | "video" | "lab"

interface CourseListItem {
  id: string
  slug: string
  title: string
  shortName: string
  description: string
  longDescription: string
  category: string
  level: string
  durationHours: number
  price: number
  rating: number
  studentsCount: number
  thumbnail: string | null
  color: string
  tags: string
  certBody: string | null
  // Course extras (JSON-encoded string arrays — see src/lib/course-lists.ts)
  whatYouWillLearn: string
  prerequisites: string
  whoShouldAttend: string
  toolsCovered: string
  careerOutcomes: string
  published: boolean
  createdAt: string
  updatedAt: string
  instructor: { id: string; name: string; title: string | null; avatar: string | null } | null
  moduleCount: number
  lessonCount: number
  labCount: number
  enrollmentCount: number
}

interface AdminLesson {
  id: string
  title: string
  type: LessonType
  content: string
  pdfUrl: string | null
  pdfPages: number
  durationMin: number
  order: number
  preview: boolean
}

interface AdminModule {
  id: string
  title: string
  description: string | null
  order: number
  lessons: AdminLesson[]
}

interface InstructorOption {
  id: string
  name: string
  email: string
  title: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  "Ethical Hacking",
  "Networking",
  "Web Security",
  "System Administration",
  "Security Management",
  "Identity & Access",
  "Cloud Security",
  "DevSecOps",
  "Incident Response",
  "General",
]

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const
const LESSON_TYPES: LessonType[] = ["reading", "pdf", "video", "lab"]

const LESSON_TYPE_META: Record<
  LessonType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  reading: { label: "Reading", icon: FileText, color: "text-violet-300" },
  pdf: { label: "PDF Material", icon: FileText, color: "text-cyan-300" },
  video: { label: "Video", icon: FileVideo, color: "text-amber-300" },
  lab: { label: "Lab", icon: FlaskConical, color: "text-emerald-300" },
}

const LEVEL_BADGE: Record<string, string> = {
  Beginner: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  Intermediate: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
  Advanced: "border-violet-500/40 text-violet-300 bg-violet-500/10",
}

const COURSE_COLOR_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500/30 via-violet-500/10 to-fuchsia-500/10",
  emerald: "from-emerald-500/30 via-emerald-500/10 to-teal-500/10",
  cyan: "from-cyan-500/30 via-cyan-500/10 to-blue-500/10",
  amber: "from-amber-500/30 via-amber-500/10 to-orange-500/10",
  rose: "from-rose-500/30 via-rose-500/10 to-pink-500/10",
  fuchsia: "from-fuchsia-500/30 via-fuchsia-500/10 to-violet-500/10",
  teal: "from-teal-500/30 via-teal-500/10 to-cyan-500/10",
}

function gradientFor(color: string | null | undefined) {
  if (color && COURSE_COLOR_GRADIENTS[color]) return COURSE_COLOR_GRADIENTS[color]
  return COURSE_COLOR_GRADIENTS.violet
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function CourseStudioView() {
  const { user, isLoading: userLoading } = useUser()
  const [selectedCourse, setSelectedCourse] = React.useState<CourseListItem | null>(null)

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="p-12 text-center border-dashed bg-card/40 border-border/60">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Sign in to access the Course Studio</p>
          <p className="text-sm text-muted-foreground">
            You need a GuardianX admin account to manage courses.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <AnimatePresence mode="wait">
        {selectedCourse ? (
          <motion.div
            key={`editor-${selectedCourse.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <EditorView
              course={selectedCourse}
              onBack={() => setSelectedCourse(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ListView onOpen={setSelectedCourse} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------
function ListView({ onOpen }: { onOpen: (c: CourseListItem) => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)

  const { data, isLoading, isError, error, isFetching } = useQuery<{
    courses: CourseListItem[]
    total: number
  }>({
    queryKey: ["admin-courses-studio"],
    queryFn: () => api("/api/admin/courses"),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  const { data: instructorData } = useQuery<{ instructors: InstructorOption[] }>({
    queryKey: ["admin-instructors-studio"],
    queryFn: async () => {
      const j = await api<any>("/api/admin/instructors")
      const list: InstructorOption[] = (j.instructors ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        title: i.title ?? null,
      }))
      return { instructors: list }
    },
    staleTime: 5 * 60_000,
  })

  const courses = data?.courses ?? []
  const instructors = instructorData?.instructors ?? []

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }, [courses, search])

  const totalLessons = courses.reduce((acc, c) => acc + c.lessonCount, 0)
  const publishedCount = courses.filter((c) => c.published).length
  const draftCount = courses.length - publishedCount

  const invalidateList = () => qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-card to-card p-6 lg:p-8 scanlines">
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <div className="glow-orb h-48 w-48 bg-violet-600/30" style={{ top: "-20%", right: "-5%" }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-mono">
              <Sparkles className="h-3 w-3" /> COURSE STUDIO
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Build your <span className="text-gradient-premium">cyber curriculum</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Manage every course in the catalog — design modules, craft lessons, and ship
              production-ready content. All wired directly to the live database.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-violet-600 hover:bg-violet-500 btn-premium h-10 px-5"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Course
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Total Courses"
          value={courses.length}
          icon={BookOpen}
          tint="bg-violet-500/10 text-violet-300"
        />
        <StatTile
          label="Published"
          value={publishedCount}
          icon={CheckCircle2}
          tint="bg-emerald-500/10 text-emerald-300"
        />
        <StatTile
          label="Drafts"
          value={draftCount}
          icon={Layers}
          tint="bg-cyan-500/10 text-cyan-300"
        />
        <StatTile
          label="Total Lessons"
          value={totalLessons}
          icon={FileText}
          tint="bg-fuchsia-500/10 text-fuchsia-300"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by title, short name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/40 border-border/60"
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/70 ml-auto">
          {isFetching && !isLoading && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> SYNCING
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-violet-300"
            onClick={() => invalidateList()}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-12 text-center border-rose-500/30 bg-card/40">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <p className="font-medium mb-1">Failed to load courses</p>
          <p className="text-sm text-muted-foreground mb-4">
            {(error as Error)?.message}
          </p>
          <Button onClick={() => invalidateList()} variant="outline">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed bg-card/40">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">
            {search ? "No courses match your search" : "No courses yet"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "Try a different search term."
              : "Create your first course to populate the catalog."}
          </p>
          {!search && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-violet-600 hover:bg-violet-500 btn-premium"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Course
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} onOpen={() => onOpen(c)} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        instructors={instructors}
        onCreated={(course) => {
          invalidateList()
          setCreateOpen(false)
          onOpen(course)
        }}
      />
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tint: string
}) {
  return (
    <Card className="bg-card/40 border-border/60 p-4 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 truncate">
          {label}
        </div>
      </div>
    </Card>
  )
}

function CourseCard({ course, onOpen }: { course: CourseListItem; onOpen: () => void }) {
  return (
    <Card
      onClick={onOpen}
      className="bg-card/40 border-border/60 overflow-hidden cursor-pointer group hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
    >
      <div className={cn("h-24 bg-gradient-to-br relative", gradientFor(course.color))}>
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] uppercase",
              course.published
                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                : "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",
            )}
          >
            {course.published ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-3">
          <span className="text-xs font-mono text-violet-200/80 uppercase tracking-wider">
            {course.shortName || "CRS"}
          </span>
        </div>
        <div className="absolute bottom-2 right-3">
          <span className="text-[9px] font-mono text-muted-foreground/80">
            {(course.tags || "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 2)
              .map((t) => `#${t}`)
              .join(" ")}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-violet-300 transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[9px] uppercase border-violet-500/30 text-violet-300 bg-violet-500/10">
            {course.category}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] uppercase", LEVEL_BADGE[course.level] ?? LEVEL_BADGE.Beginner)}>
            {course.level}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" /> {course.moduleCount} modules
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> {course.lessonCount} lessons
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {course.enrollmentCount} students
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {course.durationHours}h
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <GraduationCap className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
            <span className="truncate">{course.instructor?.name ?? "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium tabular-nums">
            {!course.price || course.price === 0 ? (
              <span className="text-emerald-300">Free</span>
            ) : (
              <span className="flex items-center">
                <IndianRupee className="h-3 w-3" />
                {Number(course.price).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Create Course Dialog
// ---------------------------------------------------------------------------
interface CreateForm {
  title: string
  shortName: string
  description: string
  category: string
  level: string
  durationHours: string
  price: string
  instructorId: string
  published: boolean
}

function emptyCreateForm(): CreateForm {
  return {
    title: "",
    shortName: "",
    description: "",
    category: CATEGORIES[0]!,
    level: LEVELS[0],
    durationHours: "40",
    price: "0",
    instructorId: "",
    published: true,
  }
}

function CreateCourseDialog({
  open,
  onOpenChange,
  instructors,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  instructors: InstructorOption[]
  onCreated: (c: CourseListItem) => void
}) {
  const [form, setForm] = React.useState<CreateForm>(emptyCreateForm())
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setForm(emptyCreateForm())
      setFormError(null)
    }
  }, [open])

  // Pre-select first instructor if available
  React.useEffect(() => {
    if (open && !form.instructorId && instructors.length > 0) {
      setForm((f) => ({ ...f, instructorId: instructors[0]!.id }))
    }
  }, [open, instructors, form.instructorId])

  function validate(): string | null {
    if (!form.title.trim()) return "Title is required"
    if (!form.shortName.trim()) return "Short name (e.g. CEH) is required"
    if (!form.instructorId) return "Instructor is required"
    const dur = Number(form.durationHours)
    if (!Number.isFinite(dur) || dur < 1) return "Duration must be a positive number"
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) return "Price must be a non-negative number"
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await api<{ course: any }>("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          shortName: form.shortName,
          description: form.description,
          category: form.category,
          level: form.level,
          durationHours: Number(form.durationHours),
          price: Number(form.price),
          instructorId: form.instructorId,
        }),
      })
      // The endpoint hardcodes published=true; toggle if user unchecked
      if (!form.published && created.course?.id) {
        await api(`/api/admin/courses/${created.course.id}`, {
          method: "PATCH",
          body: JSON.stringify({ published: false }),
        })
      }
      toast.success(`Course "${form.shortName.toUpperCase()}" created`)
      onCreated(created.course as unknown as CourseListItem)
    } catch (e: any) {
      setFormError(e.message || "Failed to create course")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-4 w-4 text-violet-300" /> Create Course
          </DialogTitle>
          <DialogDescription>
            Add a new course to the catalog. The slug is auto-generated from the title.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Title</Label>
              <Input
                placeholder="e.g. Certified Ethical Hacker v13"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Short Name</Label>
              <Input
                placeholder="CEH"
                value={form.shortName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shortName: e.target.value.toUpperCase() }))
                }
                className="bg-background/60 border-border/60 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              placeholder="One-line course description shown in cards and search results."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-background/60 border-border/60 min-h-[80px]"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Level</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
              >
                <SelectTrigger className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duration (hours)</Label>
              <Input
                type="number"
                min={1}
                value={form.durationHours}
                onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Price (₹) <span className="text-muted-foreground font-normal">(0 = Free)</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Instructor</Label>
            {instructors.length === 0 ? (
              <p className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                No instructors found. Assign an instructor first via Admin → Instructors.
              </p>
            ) : (
              <Select
                value={form.instructorId || "__NONE__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, instructorId: v === "__NONE__" ? "" : v }))
                }
              >
                <SelectTrigger className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Select an instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">
                    <span className="flex items-center gap-2 text-muted-foreground italic">
                      <GraduationCap className="h-3.5 w-3.5" /> No instructor selected
                    </span>
                  </SelectItem>
                  {instructors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-cyan-300" />
                        <span>{i.name}</span>
                        {i.title && (
                          <span className="text-[10px] text-muted-foreground">· {i.title}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Published</div>
              <p className="text-[10px] text-muted-foreground">
                Unpublished courses are drafts — hidden from the public catalog.
              </p>
            </div>
            <Checkbox
              checked={form.published}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, published: !!checked }))}
            />
          </div>
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border/60" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-500 btn-premium"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            {submitting ? "Creating..." : "Create Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Editor View
// ---------------------------------------------------------------------------
function EditorView({
  course,
  onBack,
}: {
  course: CourseListItem
  onBack: () => void
}) {
  const qc = useQueryClient()
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  // "content" = modules/lessons tree, "details" = course metadata + extras
  const [tab, setTab] = React.useState<"content" | "details">("content")
  const [architectOpen, setArchitectOpen] = React.useState(false)

  const modulesKey = ["course-studio-modules", course.id]
  const { data, isLoading, isError, error, refetch } = useQuery<{ modules: AdminModule[] }>({
    queryKey: modulesKey,
    queryFn: () => api(`/api/admin/courses/${course.id}/modules`),
    enabled: !!course.id,
  })

  const modules = data?.modules ?? []

  // Auto-expand first module + select first lesson on first load
  React.useEffect(() => {
    if (modules.length && expanded.size === 0) {
      const first = modules[0]!
      setExpanded(new Set([first.id]))
      setSelectedModuleId(first.id)
      if (first.lessons.length && !selectedLessonId) {
        setSelectedLessonId(first.lessons[0]!.id)
      }
    }
  }, [modules.length, expanded.size, selectedLessonId])

  const toggleExpand = (moduleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
    setSelectedModuleId(moduleId)
  }

  // Find selected lesson across modules
  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null
  const selectedLesson =
    modules
      .flatMap((m) => m.lessons)
      .find((l) => l.id === selectedLessonId) ?? null

  // ----- Mutations -----
  const addModuleMutation = useMutation({
    mutationFn: () =>
      api<{ module: AdminModule }>(`/api/admin/courses/${course.id}/modules`, {
        method: "POST",
        body: JSON.stringify({ title: `Module ${modules.length + 1}` }),
      }),
    onSuccess: (res) => {
      toast.success("Module added")
      qc.invalidateQueries({ queryKey: modulesKey })
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
      const newId = res.module?.id
      if (newId) {
        setExpanded((prev) => new Set(prev).add(newId))
        setSelectedModuleId(newId)
        setSelectedLessonId(null)
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to add module"),
  })

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: string) =>
      api(`/api/admin/modules/${moduleId}`, { method: "DELETE" }),
    onSuccess: (_res, moduleId) => {
      toast.success("Module deleted")
      qc.invalidateQueries({ queryKey: modulesKey })
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
      if (selectedModuleId === moduleId) {
        setSelectedModuleId(null)
        setSelectedLessonId(null)
      }
      setExpanded((prev) => {
        const next = new Set(prev)
        next.delete(moduleId)
        return next
      })
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete module"),
  })

  const addLessonMutation = useMutation({
    mutationFn: (moduleId: string) =>
      api<{ lesson: AdminLesson }>(`/api/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify({ title: "New Lesson", type: "reading" }),
      }),
    onSuccess: (res, moduleId) => {
      toast.success("Lesson added")
      qc.invalidateQueries({ queryKey: modulesKey })
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
      setExpanded((prev) => new Set(prev).add(moduleId))
      setSelectedModuleId(moduleId)
      const newId = res.lesson?.id
      if (newId) setSelectedLessonId(newId)
    },
    onError: (e: any) => toast.error(e.message || "Failed to add lesson"),
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      api(`/api/admin/lessons/${lessonId}`, { method: "DELETE" }),
    onSuccess: (_res, lessonId) => {
      toast.success("Lesson deleted")
      qc.invalidateQueries({ queryKey: modulesKey })
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
      if (selectedLessonId === lessonId) setSelectedLessonId(null)
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete lesson"),
  })

  // ----- Render -----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <Skeleton className="h-[70vh] rounded-xl" />
          <Skeleton className="h-[70vh] rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="p-8 text-center border-rose-500/30 bg-card/40">
        <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <p className="font-medium text-rose-300 mb-2">Failed to load course content</p>
        <p className="text-sm text-muted-foreground mb-4">{(error as Error)?.message}</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
          <Button onClick={onBack} variant="ghost">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to list
          </Button>
        </div>
      </Card>
    )
  }

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)

  return (
    <div className="space-y-4">
      {/* Top header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="shrink-0 border-border/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to list
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold truncate">{course.title}</h2>
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-violet-300 border-violet-500/30 bg-violet-500/10 uppercase"
              >
                {course.shortName}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] uppercase",
                  course.published
                    ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                    : "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",
                )}
              >
                {course.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {modules.length} modules · {totalLessons} lessons · {course.durationHours}h ·{" "}
              {course.instructor?.name ?? "Unassigned"}
            </p>
          </div>
        </div>

        {/* Tab switcher — Content (modules/lessons) vs Course Details */}
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border/60 bg-card/40">
          <button
            onClick={() => setTab("content")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              tab === "content"
                ? "bg-violet-500/15 text-violet-200 border border-violet-500/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            <Layers className="h-3.5 w-3.5" /> Content
          </button>
          <button
            onClick={() => setTab("details")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              tab === "details"
                ? "bg-violet-500/15 text-violet-200 border border-violet-500/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" /> Course Details
          </button>
        </div>
      </div>

      {tab === "details" ? (
        <CourseDetailsEditor key={course.id} course={course} />
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        {/* LEFT - module/lesson outline */}
        <Card className="bg-card/40 border-border/60 flex flex-col max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-300" />
              <h3 className="text-sm font-semibold">Modules</h3>
              <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                {modules.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                onClick={() => setArchitectOpen(true)}
                title="Generate an in-depth curriculum with the AI Course Architect"
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="ml-1 hidden md:inline">AI Curriculum</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                onClick={() => addModuleMutation.mutate()}
                disabled={addModuleMutation.isPending}
              >
                {addModuleMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span className="ml-1 hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1.5">
            {modules.length === 0 ? (
              <div className="p-8 text-center">
                <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">No modules yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Add your first module — or let the AI Course Architect design an
                  in-depth curriculum from its domain knowledge.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => setArchitectOpen(true)}
                    className="bg-violet-600 hover:bg-violet-500"
                  >
                    <Bot className="h-3.5 w-3.5 mr-1.5" /> Generate with AI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addModuleMutation.mutate()}
                    disabled={addModuleMutation.isPending}
                    className="border-border/60"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Module
                  </Button>
                </div>
              </div>
            ) : (
              modules.map((m, idx) => (
                <ModuleRow
                  key={m.id}
                  module={m}
                  index={idx}
                  expanded={expanded.has(m.id)}
                  onToggle={() => toggleExpand(m.id)}
                  selectedLessonId={selectedLessonId}
                  onSelectLesson={(lessonId) => {
                    setSelectedModuleId(m.id)
                    setSelectedLessonId(lessonId)
                  }}
                  onAddLesson={() => addLessonMutation.mutate(m.id)}
                  onDeleteLesson={(lessonId) => deleteLessonMutation.mutate(lessonId)}
                  onDeleteModule={() => deleteModuleMutation.mutate(m.id)}
                  courseId={course.id}
                />
              ))
            )}
          </div>

          {modules.length > 0 && (
            <div className="px-3 py-2.5 border-t border-border/60">
              <Button
                size="sm"
                variant="outline"
                className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                onClick={() => addModuleMutation.mutate()}
                disabled={addModuleMutation.isPending}
              >
                {addModuleMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Add Module
              </Button>
            </div>
          )}
        </Card>

        {/* RIGHT - lesson editor */}
        <Card className="bg-card/40 border-border/60 min-h-[60vh]">
          {selectedLesson ? (
            <LessonEditor
              key={selectedLesson.id}
              lesson={selectedLesson}
              courseId={course.id}
              course={course}
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[60vh] p-12 text-center">
              <div className="max-w-sm space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6 text-violet-300" />
                </div>
                <h3 className="font-semibold">No lesson selected</h3>
                <p className="text-sm text-muted-foreground">
                  Pick a lesson from the sidebar to edit its content, or add a new lesson to a
                  module to get started.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
      )}

      {/* AI Course Architect — curriculum generator (append-only, review-before-apply) */}
      <CurriculumDialog
        open={architectOpen}
        onOpenChange={setArchitectOpen}
        course={course}
        existingModuleCount={modules.length}
        onApplied={() => {
          qc.invalidateQueries({ queryKey: modulesKey })
          qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Course Details Editor — full metadata + course extras (what you'll learn,
// prerequisites, who should attend, tools, career outcomes). Persists via
// PATCH /api/admin/courses/[id].
// ---------------------------------------------------------------------------
function CourseDetailsEditor({
  course,
}: {
  course: CourseListItem
  onPublishedChange?: (published: boolean) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState(() => ({
    title: course.title,
    shortName: course.shortName,
    description: course.description,
    longDescription: course.longDescription ?? "",
    category: course.category,
    level: course.level,
    durationHours: String(course.durationHours),
    price: String(course.price),
    color: course.color,
    tags: course.tags ?? "",
    certBody: course.certBody ?? "",
    thumbnail: course.thumbnail ?? "",
    published: course.published,
    // Extras: decode stored JSON arrays into one-item-per-line textarea text
    ...Object.fromEntries(
      COURSE_LIST_FIELDS.map(({ key }) => [key, parseCourseList((course as any)[key]).join("\n")])
    ),
  }))
  const [saving, setSaving] = React.useState(false)
  const [blueprintOpen, setBlueprintOpen] = React.useState(false)

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () =>
      api<{ course: CourseListItem }>(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title,
          shortName: form.shortName,
          description: form.description,
          longDescription: form.longDescription,
          category: form.category,
          level: form.level,
          durationHours: Number(form.durationHours) || 0,
          price: Number(form.price) || 0,
          color: form.color,
          tags: form.tags,
          certBody: form.certBody,
          thumbnail: form.thumbnail,
          published: form.published,
          // extras — newline text is normalized server-side (course-lists.ts)
          ...Object.fromEntries(COURSE_LIST_FIELDS.map(({ key }) => [key, (form as any)[key]])),
        }),
      }),
    onSuccess: () => {
      toast.success("Course details saved")
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
      qc.invalidateQueries({ queryKey: ["course", course.slug] })
      qc.invalidateQueries({ queryKey: ["course", course.id] })
      qc.invalidateQueries({ queryKey: ["catalog"] })
    },
    onError: (e: any) => toast.error(e.message || "Failed to save course details"),
  })

  return (
    <Card className="bg-card/40 border-border/60">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-violet-300" />
          <h3 className="text-sm font-semibold">Course Details</h3>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            everything shown on the public course page
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} />
            {form.published ? "Published" : "Draft"}
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBlueprintOpen(true)}
            className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
            title="Generate course page sections with the AI Course Architect"
          >
            <Bot className="h-3.5 w-3.5 mr-1.5" /> AI Architect
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saving || saveMutation.isPending}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto custom-scroll">
        {/* Basics */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="bg-background/60" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Short name (badge)</Label>
            <Input value={form.shortName} onChange={(e) => set("shortName", e.target.value)} className="bg-background/60" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Short description (cards & previews)</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} className="bg-background/60" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Long description (course page overview)</Label>
          <Textarea rows={5} value={form.longDescription} onChange={(e) => set("longDescription", e.target.value)} className="bg-background/60" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Level</Label>
            <Select value={form.level} onValueChange={(v) => set("level", v)}>
              <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Duration (hours)</Label>
            <Input type="number" min="0" value={form.durationHours} onChange={(e) => set("durationHours", e.target.value)} className="bg-background/60" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Price (₹)</Label>
            <Input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} className="bg-background/60" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Theme color</Label>
            <Select value={form.color} onValueChange={(v) => set("color", v)}>
              <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(COURSE_COLOR_GRADIENTS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} className="bg-background/60" placeholder="pentesting, linux, nmap" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Certification body</Label>
            <Input value={form.certBody} onChange={(e) => set("certBody", e.target.value)} className="bg-background/60" placeholder="EC-Council" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Thumbnail URL</Label>
            <Input value={form.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} className="bg-background/60" placeholder="https://…" />
          </div>
        </div>

        {/* Course extras — the sections on the public course page */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center gap-2 mb-3 mt-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <h4 className="text-sm font-semibold">Course page sections</h4>
            <span className="text-[11px] text-muted-foreground">one item per line — shown exactly as typed</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            {COURSE_LIST_FIELDS.map(({ key, label, hint, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Textarea
                  rows={4}
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="bg-background/60 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Course Architect — course page sections blueprint (fills the form, human saves) */}
      <BlueprintDialog
        open={blueprintOpen}
        onOpenChange={setBlueprintOpen}
        course={{
          id: course.id,
          title: course.title,
          category: course.category,
          level: course.level,
          description: course.description,
          tags: course.tags,
          durationHours: course.durationHours,
          certBody: course.certBody,
        }}
        onApply={(fields) => {
          for (const [k, v] of Object.entries(fields)) set(k, v)
          toast.success("Architect content applied — review and hit Save")
        }}
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Module Row (sidebar)
// ---------------------------------------------------------------------------
function ModuleRow({
  module: m,
  index,
  expanded,
  onToggle,
  selectedLessonId,
  onSelectLesson,
  onAddLesson,
  onDeleteLesson,
  onDeleteModule,
  courseId,
}: {
  module: AdminModule
  index: number
  expanded: boolean
  onToggle: () => void
  selectedLessonId: string | null
  onSelectLesson: (lessonId: string) => void
  onAddLesson: () => void
  onDeleteLesson: (lessonId: string) => void
  onDeleteModule: () => void
  courseId: string
}) {
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [deleteModuleOpen, setDeleteModuleOpen] = React.useState(false)
  const [deleteLessonId, setDeleteLessonId] = React.useState<string | null>(null)

  return (
    <div className="rounded-lg border border-border/40 bg-background/30 overflow-hidden">
      {/* Module header (clickable to expand) */}
      <div
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-2.5 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors",
          expanded && "border-b border-border/40",
        )}
      >
        <span className="text-[10px] font-mono text-muted-foreground/70 w-5 text-center shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{m.title}</div>
          <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
            <FileText className="h-2.5 w-2.5" />
            {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-violet-300 hover:bg-violet-500/10"
          onClick={(e) => {
            e.stopPropagation()
            setRenameOpen(true)
          }}
          title="Rename module"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteModuleOpen(true)
          }}
          title="Delete module"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-1.5 space-y-0.5">
              {m.lessons.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/70 px-3 py-2 italic">
                  No lessons yet
                </div>
              ) : (
                m.lessons.map((l, li) => {
                  const meta = LESSON_TYPE_META[l.type] ?? LESSON_TYPE_META.reading
                  const Icon = meta.icon
                  const isSelected = l.id === selectedLessonId
                  return (
                    <div
                      key={l.id}
                      onClick={() => onSelectLesson(l.id)}
                      className={cn(
                        "group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors",
                        isSelected
                          ? "bg-violet-500/15 border border-violet-500/30"
                          : "hover:bg-muted/30 border border-transparent",
                      )}
                    >
                      <span className="text-[9px] font-mono text-muted-foreground/60 w-5 text-center shrink-0">
                        {String(li + 1).padStart(2, "0")}
                      </span>
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-xs truncate",
                            isSelected ? "text-violet-200 font-medium" : "text-foreground/90",
                          )}
                        >
                          {l.title}
                        </div>
                        <div className="text-[9px] text-muted-foreground/80 flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2 w-2" />
                            {l.durationMin}m
                          </span>
                          {l.preview && (
                            <span className="flex items-center gap-0.5 text-amber-300">
                              <Eye className="h-2 w-2" />
                              preview
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteLessonId(l.id)
                          setDeleteModuleOpen(false)
                        }}
                        title="Delete lesson"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )
                })
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddLesson()
                }}
                disabled={false}
                className="w-full mt-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Lesson
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename module dialog */}
      <RenameModuleDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        module={m}
        courseId={courseId}
      />

      {/* Delete module alert */}
      <AlertDialog open={deleteModuleOpen} onOpenChange={setDeleteModuleOpen}>
        <AlertDialogContent className="bg-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" /> Delete module?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-mono font-bold text-foreground">{m.title}</span> and all{" "}
              <span className="font-bold text-foreground">{m.lessons.length}</span> lesson
              {m.lessons.length === 1 ? "" : "s"} inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteModule()
                setDeleteModuleOpen(false)
              }}
              className="bg-rose-600 hover:bg-rose-500 text-rose-50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete lesson alert */}
      <AlertDialog
        open={!!deleteLessonId}
        onOpenChange={(o) => !o && setDeleteLessonId(null)}
      >
        <AlertDialogContent className="bg-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" /> Delete lesson?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this lesson. Student progress linked to this lesson may
              be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteLessonId) {
                  onDeleteLesson(deleteLessonId)
                  setDeleteLessonId(null)
                }
              }}
              className="bg-rose-600 hover:bg-rose-500 text-rose-50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rename Module Dialog
// ---------------------------------------------------------------------------
function RenameModuleDialog({
  open,
  onOpenChange,
  module: m,
  courseId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  module: AdminModule
  courseId: string
}) {
  const qc = useQueryClient()
  const [title, setTitle] = React.useState(m.title)
  const [description, setDescription] = React.useState(m.description ?? "")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setTitle(m.title)
      setDescription(m.description ?? "")
      setError(null)
    }
  }, [open, m.title, m.description])

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api(`/api/admin/modules/${m.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim(), description }),
      })
      toast.success("Module updated")
      qc.invalidateQueries({ queryKey: ["course-studio-modules", courseId] })
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
      onOpenChange(false)
    } catch (e: any) {
      setError(e.message || "Failed to update module")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-violet-300" /> Rename Module
          </DialogTitle>
          <DialogDescription>Update the title and description of this module.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/60 border-border/60"
              placeholder="e.g. Introduction to Network Security"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/60 border-border/60 min-h-[80px]"
              placeholder="Short description of what this module covers."
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border/60" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Lesson Editor (right panel)
// ---------------------------------------------------------------------------
function LessonEditor({ lesson, courseId, course }: { lesson: AdminLesson; courseId: string; course: CourseListItem }) {
  const qc = useQueryClient()
  const modulesKey = ["course-studio-modules", courseId]

  // Local working copy
  const [title, setTitle] = React.useState(lesson.title)
  const [type, setType] = React.useState<LessonType>(lesson.type)
  const [content, setContent] = React.useState(lesson.content ?? "")
  const [durationMin, setDurationMin] = React.useState(String(lesson.durationMin ?? 15))
  const [preview, setPreview] = React.useState(!!lesson.preview)
  const [pdfUrl, setPdfUrl] = React.useState(lesson.pdfUrl ?? "")
  const [pdfPages, setPdfPages] = React.useState(String(lesson.pdfPages ?? 0))
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [aiOpen, setAiOpen] = React.useState(false)

  // Reset local state when lesson prop changes
  React.useEffect(() => {
    setTitle(lesson.title)
    setType(lesson.type)
    setContent(lesson.content ?? "")
    setDurationMin(String(lesson.durationMin ?? 15))
    setPreview(!!lesson.preview)
    setPdfUrl(lesson.pdfUrl ?? "")
    setPdfPages(String(lesson.pdfPages ?? 0))
    setDirty(false)
    setError(null)
  }, [lesson.id, lesson.title, lesson.type, lesson.content, lesson.durationMin, lesson.preview, lesson.pdfUrl, lesson.pdfPages])

  const markDirty = () => setDirty(true)

  const saveMutation = useMutation({
    mutationFn: () =>
      api<{ lesson: AdminLesson }>(`/api/admin/lessons/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          type,
          content,
          durationMin: Number(durationMin) || 0,
          preview,
          ...(type === "pdf" ? { pdfUrl, pdfPages: Number(pdfPages) || 0 } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("Lesson saved")
      setDirty(false)
      qc.invalidateQueries({ queryKey: modulesKey })
      qc.invalidateQueries({ queryKey: ["admin-courses-studio"] })
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to save lesson")
      setError(e.message || "Failed to save lesson")
    },
  })

  const handleSave = () => {
    if (!title.trim()) {
      setError("Lesson title is required")
      return
    }
    setError(null)
    saveMutation.mutate()
  }

  const meta = LESSON_TYPE_META[type] ?? LESSON_TYPE_META.reading
  const Icon = meta.icon

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-muted/30 border border-border/40")}>
            <Icon className={cn("h-4 w-4", meta.color)} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">Lesson Editor</h3>
            <p className="text-[10px] text-muted-foreground font-mono">
              ID: {lesson.id.slice(0, 8)}…
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1 animate-pulse" /> unsaved
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAiOpen(true)}
            className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
            title="Expand this lesson into full teaching content with the AI Course Architect"
          >
            <Bot className="h-3.5 w-3.5 mr-1.5" /> AI Deep-Dive
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending || !dirty}
            className="bg-violet-600 hover:bg-violet-500 btn-premium"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="lesson-title" className="text-xs font-medium">
            Lesson Title
          </Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              markDirty()
            }}
            className="bg-background/60 border-border/60"
            placeholder="e.g. Introduction to Phishing Attacks"
          />
        </div>

        {/* Type + Duration */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-type" className="text-xs font-medium">
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as LessonType)
                markDirty()
              }}
            >
              <SelectTrigger id="lesson-type" className="bg-background/60 border-border/60">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {LESSON_TYPES.map((t) => {
                  const M = LESSON_TYPE_META[t]
                  const TIcon = M.icon
                  return (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <TIcon className={cn("h-3.5 w-3.5", M.color)} />
                        {M.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lesson-duration" className="text-xs font-medium">
              Duration (minutes)
            </Label>
            <Input
              id="lesson-duration"
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => {
                setDurationMin(e.target.value)
                markDirty()
              }}
              className="bg-background/60 border-border/60"
            />
          </div>
        </div>

        {/* Preview switch */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              {preview ? (
                <Eye className="h-4 w-4 text-amber-300" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Free Preview</div>
              <p className="text-[10px] text-muted-foreground">
                Allow non-enrolled students to view this lesson for free.
              </p>
            </div>
          </div>
          <Switch checked={preview} onCheckedChange={(v) => { setPreview(v); markDirty() }} />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <Label htmlFor="lesson-content" className="text-xs font-medium">
            Content (Markdown / HTML)
          </Label>
          <Textarea
            id="lesson-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              markDirty()
            }}
            className="bg-background/60 border-border/60 min-h-[240px] font-mono text-xs"
            placeholder={"# Introduction\n\nWrite your lesson content here...\n\n- bullet\n- bullet"}
          />
          <p className="text-[10px] text-muted-foreground">
            Markdown and HTML are supported. For reading lessons this is the page content; for
            video lessons include an embed URL; for labs include lab instructions.
          </p>
        </div>

        {/* PDF-specific fields */}
        <AnimatePresence initial={false}>
          {type === "pdf" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5" /> PDF Material
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-pdf-url" className="text-xs font-medium">
                    PDF URL
                  </Label>
                  <Input
                    id="lesson-pdf-url"
                    value={pdfUrl}
                    onChange={(e) => {
                      setPdfUrl(e.target.value)
                      markDirty()
                    }}
                    className="bg-background/60 border-border/60"
                    placeholder="https://example.com/lesson.pdf"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Direct URL to the PDF file. Will be embedded in the lesson viewer with a
                    page-by-page reader.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-pdf-pages" className="text-xs font-medium">
                    PDF Page Count
                  </Label>
                  <Input
                    id="lesson-pdf-pages"
                    type="number"
                    min={0}
                    value={pdfPages}
                    onChange={(e) => {
                      setPdfPages(e.target.value)
                      markDirty()
                    }}
                    className="bg-background/60 border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Used for progress tracking and to size the reader.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* AI Course Architect — single lesson deep-dive (fills the editor, human saves) */}
      <LessonDeepDiveDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        course={{
          id: courseId,
          title: course.title,
          category: course.category,
          level: course.level,
          description: course.description,
          tags: course.tags,
          durationHours: course.durationHours,
          certBody: course.certBody,
        }}
        lesson={{ id: lesson.id, title: lesson.title, type: lesson.type, content: lesson.content }}
        onApply={(content, title, durationMin) => {
          setTitle(title)
          setContent(content)
          setDurationMin(String(durationMin))
          markDirty()
          toast.success("Architect lesson applied — review and Save")
        }}
      />
    </div>
  )
}
