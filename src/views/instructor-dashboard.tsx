"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { colorFor, LEVEL_COLORS } from "@/lib/colors"
import { useUser } from "@/hooks/use-user"
import { CalendarWidget } from "@/components/platform/calendar-widget"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend,
} from "recharts"
import {
  Presentation, Users, BookOpen, TrendingUp, Star, Clock, ChevronRight,
  GraduationCap, Award, Activity, ArrowRight, BarChart3, CheckCircle2,
  Plus, Pencil, Trash2, Save, X, FileText, Radio, Calendar as CalendarIcon,
  Image as ImageIcon, Video, Link2, PlayCircle, StopCircle, Eye, Sparkles,
  ClipboardList, MessageSquare, CalendarClock, UserPlus, Palette, Building2,
  Search,
} from "lucide-react"
import { cn, firstNameFor } from "@/lib/utils"
import { toast } from "sonner"
import { InstructorAssignmentsTab } from "@/components/instructor/assignments-tab"
import { InstructorOfficeHoursTab } from "@/components/instructor/office-hours-tab"
import { InstructorMessagingTab } from "@/components/instructor/messaging-tab"
import { InstructorAttendanceTab } from "@/components/instructor/attendance-tab"
import { InstructorBulkImportTab } from "@/components/instructor/bulk-import-tab"
import { InstructorCertificateTemplatesTab } from "@/components/instructor/certificate-templates-tab"

interface InstructorCourse {
  id: string; slug: string; title: string; shortName: string; color: string
  thumbnail: string | null
  description: string; longDescription: string; category: string; level: string
  durationHours: number; price: number; rating: number; studentsCount: number
  tags: string; certBody: string | null
  moduleCount: number; lessonCount: number; enrollmentCount: number
  activeStudents: number; completedStudents: number; avgProgress: number
  recentStudents: {
    userId: string; progress: number; completed: boolean; lastAccessed: string | null
    enrolledAt: string; user: { id: string; name: string; avatar: string | null; title: string | null }
  }[]
}

interface LiveSessionItem {
  id: string; title: string; description: string | null; roomId: string
  status: string; scheduledAt: string; maxStudents: number
  host: { id: string; name: string; title: string | null }
  memberCount: number; isMember: boolean; isHost: boolean
  course: { id: string; title: string; shortName: string } | null
}

const COURSE_CATEGORIES = ["Ethical Hacking", "Networking", "Web Security", "System Administration", "Security Management", "Identity & Access", "Cloud Security"]
const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced"]
const COURSE_COLORS_LIST = ["emerald", "cyan", "teal", "violet", "amber", "orange", "red"]

const INSTRUCTOR_TABS = [
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "live", label: "Live Sessions", icon: Radio },
  { id: "office-hours", label: "Office Hours", icon: CalendarClock },
  { id: "students", label: "My Students", icon: Users },
  { id: "attendance", label: "Attendance", icon: CheckCircle2 },
  { id: "messaging", label: "Messages", icon: MessageSquare },
  { id: "bulk-import", label: "Bulk Import", icon: UserPlus },
  { id: "templates", label: "Cert Templates", icon: Palette },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const

type InstructorTab = typeof INSTRUCTOR_TABS[number]["id"]

export function InstructorDashboardView() {
  const { user } = useUser()
  const [tab, setTab] = React.useState<InstructorTab>("courses")

  if (user && user.role !== "INSTRUCTOR" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return (
      <Card className="p-12 text-center border-dashed">
        <Presentation className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">Instructor access required</p>
        <p className="text-sm text-muted-foreground">This dashboard is for instructors and admins.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <InstructorHero />

      <Tabs value={tab} onValueChange={(v) => setTab(v as InstructorTab)}>
        <ScrollArea className="w-full">
          <TabsList className="grid w-max min-w-full grid-cols-11 h-auto">
            {INSTRUCTOR_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 py-2 px-3">
                <t.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap">{t.label}</span>
                <span className="lg:hidden text-xs whitespace-nowrap">{t.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <TabsContent value="courses" className="mt-4"><MyCoursesTab /></TabsContent>
        <TabsContent value="assignments" className="mt-4"><InstructorAssignmentsTab /></TabsContent>
        <TabsContent value="live" className="mt-4"><LiveSessionsTab /></TabsContent>
        <TabsContent value="office-hours" className="mt-4"><InstructorOfficeHoursTab /></TabsContent>
        <TabsContent value="students" className="mt-4"><MyStudentsTab /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><InstructorAttendanceTab /></TabsContent>
        <TabsContent value="messaging" className="mt-4"><InstructorMessagingTab /></TabsContent>
        <TabsContent value="bulk-import" className="mt-4"><InstructorBulkImportTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><InstructorCertificateTemplatesTab /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><CalendarTab /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function InstructorHero() {
  const { user } = useUser()
  const { data, isLoading } = useQuery<{ courses: InstructorCourse[]; totals: any }>({
    queryKey: ["instructor", "courses"],
    queryFn: () => api("/api/instructor/courses"),
  })
  const totals = data?.totals

  const statCards = [
    { label: "My Courses", value: totals?.courses ?? 0, icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Students", value: totals?.students ?? 0, icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Completed", value: totals?.completed ?? 0, icon: Award, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Avg Progress", value: `${totals?.avgProgress ?? 0}%`, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
  ]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-background to-background p-6 lg:p-8 scanlines">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-mono">
              <Presentation className="h-3 w-3" /> INSTRUCTOR DASHBOARD
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-cyan-400">{firstNameFor(user?.name, "Instructor")}</span>
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Manage your courses, host live workshops, track student progress, and analyze engagement - all in one place.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="text-center px-5 py-3 rounded-xl border border-cyan-500/20 bg-card/40 backdrop-blur">
              <Users className="h-7 w-7 text-cyan-400 mx-auto mb-1" />
              <div className="text-2xl font-bold font-mono text-cyan-400">{totals?.students ?? 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Students</div>
            </div>
            <div className="text-center px-5 py-3 rounded-xl border border-emerald-500/20 bg-card/40 backdrop-blur">
              <Award className="h-7 w-7 text-emerald-400 mx-auto mb-1" />
              <div className="text-2xl font-bold font-mono text-emerald-400">{totals?.completed ?? 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-5 relative overflow-hidden group card-hover">
              <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity", s.bg)} />
              <div className="relative z-10">
                <div className={cn("inline-flex p-2 rounded-lg mb-3", s.bg)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div className="text-3xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ My Courses Tab ============
function MyCoursesTab() {
  const { navigate } = useAppStore()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<string>("all")

  const { data, isLoading } = useQuery<{ courses: InstructorCourse[]; totals: any }>({
    queryKey: ["instructor", "courses"],
    queryFn: () => api("/api/instructor/courses"),
  })
  const courses = data?.courses ?? []

  // Categories that actually occur in the instructor's own catalog —
  // avoids a wall of empty filter chips for single-domain instructors.
  const activeCategories = React.useMemo(() => {
    const set = new Set<string>()
    courses.forEach((c) => c.category && set.add(c.category))
    return Array.from(set).sort()
  }, [courses])

  const filteredCourses = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses.filter((c) => {
      if (category !== "all" && c.category !== category) return false
      if (!q) return true
      return (
        c.title?.toLowerCase().includes(q) ||
        c.shortName?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.tags?.toLowerCase().includes(q)
      )
    })
  }, [courses, search, category])

  const isFiltering = search.trim() !== "" || category !== "all"

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }

  if (editingCourseId) {
    return <CourseEditor courseId={editingCourseId} onBack={() => setEditingCourseId(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" /> My Courses
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage your course catalog</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400">
          <Plus className="h-4 w-4 mr-1.5" /> Create Course
        </Button>
      </div>

      {courses.length > 0 && (
        <div className="space-y-2.5">
          {/* Search — essential once a catalog grows past a screenful */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, tag, category…"
              className="pl-9 h-9 text-sm"
            />
          </div>
          {activeCategories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setCategory("all")}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  category === "all"
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                All ({courses.length})
              </button>
              {activeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? "all" : cat)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    category === cat
                      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No courses yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first course to get started.</p>
          <Button onClick={() => setCreateOpen(true)} className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400">
            <Plus className="h-4 w-4 mr-1.5" /> Create Your First Course
          </Button>
        </Card>
      ) : filteredCourses.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No matches</p>
          <p className="text-sm text-muted-foreground mb-4">
            No courses match your {category !== "all" ? `"${category}" + ` : ""}search. Try different keywords.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCategory("all") }}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Clear filters
          </Button>
        </Card>
      ) : (
        <>
          {isFiltering && (
            <p className="text-xs text-muted-foreground font-mono">
              {filteredCourses.length} of {courses.length} courses
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredCourses.map((c) => (
              <InstructorCourseCard
                key={c.id}
                course={c}
                onOpen={() => navigate({ name: "course", courseId: c.id })}
                onEdit={() => setEditingCourseId(c.id)}
              />
            ))}
          </div>
        </>
      )}

      <CreateCourseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => {
        setCreateOpen(false)
        setEditingCourseId(id)
      }} />
    </div>
  )
}

function InstructorCourseCard({ course, onOpen, onEdit }: {
  course: InstructorCourse
  onOpen: () => void
  onEdit: () => void
}) {
  const qc = useQueryClient()
  const col = colorFor(course.color)

  const deleteCourse = useMutation({
    mutationFn: () => api(`/api/instructor/courses/${course.id}/edit`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Course deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Card className="overflow-hidden card-hover h-full flex flex-col">
      <div className={cn("relative h-24 bg-gradient-to-br", col.gradient, "flex items-center justify-center overflow-hidden")}>
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-grid opacity-40" />
            <span className={cn("relative font-mono font-bold text-2xl", col.text)}>{course.shortName}</span>
          </>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant="outline" className={cn("text-[10px]", LEVEL_COLORS[course.level])}>{course.level}</Badge>
        </div>
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="text-[10px] bg-background/60 backdrop-blur">{course.certBody || course.category}</Badge>
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{course.description}</p>
        <div className="grid grid-cols-3 gap-2 text-center mb-3 pt-2.5 border-t border-border">
          <div>
            <div className="text-sm font-bold text-cyan-400 tabular-nums">{course.enrollmentCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Students</div>
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">{course.completedStudents}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Done</div>
          </div>
          <div>
            <div className="text-sm font-bold text-violet-400 tabular-nums">{course.avgProgress}%</div>
            <div className="text-[9px] text-muted-foreground uppercase">Avg</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onOpen} title="View course">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={() => { if (confirm(`Delete "${course.title}"? This will remove all modules, lessons, and quizzes.`)) deleteCourse.mutate() }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete course"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  )
}

// ---- Create Course Dialog ----
function CreateCourseDialog({ open, onOpenChange, onCreated }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (courseId: string) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    title: "", shortName: "", slug: "", description: "", longDescription: "",
    category: COURSE_CATEGORIES[0], level: "Beginner", durationHours: 40, price: 0,
    color: "emerald", tags: "", certBody: "", thumbnail: "", published: true,
  })

  const create = useMutation({
    mutationFn: () => api("/api/instructor/courses/new", {
      method: "POST",
      body: JSON.stringify(form),
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      qc.invalidateQueries({ queryKey: ["courses"] })
      toast.success("Course created! Now add modules and lessons.")
      onCreated(data.course.id)
      // reset form
      setForm({
        title: "", shortName: "", slug: "", description: "", longDescription: "",
        category: COURSE_CATEGORIES[0], level: "Beginner", durationHours: 40, price: 0,
        color: "emerald", tags: "", certBody: "", thumbnail: "", published: true,
      })
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Course Title</Label>
              <Input id="title" placeholder="e.g. Certified Ethical Hacker" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortName">Short Name</Label>
              <Input id="shortName" placeholder="CEH" maxLength={6} value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input id="slug" placeholder="auto-generated from title" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="certBody">Certification Body</Label>
              <Input id="certBody" placeholder="e.g. EC-Council" value={form.certBody} onChange={(e) => setForm({ ...form, certBody: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Short Description</Label>
            <Input id="description" placeholder="One-line summary" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="longDescription">Full Description</Label>
            <Textarea id="longDescription" placeholder="Detailed course description..." value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} className="min-h-[80px]" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="thumbnail"><ImageIcon className="h-3.5 w-3.5 inline mr-1" /> Thumbnail Image URL</Label>
            <Input id="thumbnail" placeholder="https://example.com/course-thumb.jpg" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
            {form.thumbnail && (
              <div className="mt-2 h-24 rounded-lg overflow-hidden border border-border bg-muted/30">
                <img src={form.thumbnail} alt="thumbnail preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURSE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURSE_COLORS_LIST.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input id="duration" type="number" min={1} value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (comma-sep)</Label>
              <Input id="tags" placeholder="hacking, network, web" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={() => create.mutate()} disabled={!form.title.trim() || !form.shortName.trim() || create.isPending}>
            {create.isPending ? "Creating..." : "Create Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Course Editor (modules/lessons/quizzes) ----
function CourseEditor({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<any>({
    queryKey: ["course", courseId],
    queryFn: () => api(`/api/courses/${courseId}`),
  })
  const course = data?.course
  const [editingLesson, setEditingLesson] = React.useState<string | null>(null)
  const [newLessonModuleId, setNewLessonModuleId] = React.useState<string | null>(null)
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null)
  const [showNewModule, setShowNewModule] = React.useState(false)
  const [editCourseMeta, setEditCourseMeta] = React.useState(false)

  const deleteLesson = useMutation({
    mutationFn: (lessonId: string) => api(`/api/instructor/lessons/${lessonId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Lesson deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteModule = useMutation({
    mutationFn: (moduleId: string) => api(`/api/instructor/modules/${moduleId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Module deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading || !course) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const col = colorFor(course.color)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-cyan-400" /> Edit: {course.title}
            </h2>
            <p className="text-sm text-muted-foreground">{course.modules.length} modules · manage lessons & quizzes</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditCourseMeta(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Course Settings
        </Button>
      </div>

      {editCourseMeta && (
        <EditCourseMetaForm
          courseId={courseId}
          course={course}
          onClose={() => setEditCourseMeta(false)}
        />
      )}

      {/* Modules */}
      {course.modules.map((m: any, mi: number) => (
        <Card key={m.id} className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold", col.bg, col.border, "border", col.text)}>
                {String(mi + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.lessons.length} lesson{m.lessons.length !== 1 ? "s" : ""}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditingModuleId(editingModuleId === m.id ? null : m.id)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNewLessonModuleId(newLessonModuleId === m.id ? null : m.id)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Lesson
              </Button>
              <button
                onClick={() => { if (confirm(`Delete module "${m.title}" and all its lessons?`)) deleteModule.mutate(m.id) }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete module"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {m.lessons.map((l: any) => (
              <div key={l.id} className="p-3 flex items-center gap-3 hover:bg-accent/20 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.title}</div>
                  <div className="text-[10px] text-muted-foreground">{l.type} · {l.durationMin}m{l.pdfPages ? ` · ${l.pdfPages} pages` : ""}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingLesson(editingLesson === l.id ? null : l.id)}>
                  <Pencil className="h-3 w-3 mr-1" /> {editingLesson === l.id ? "Close" : "Edit"}
                </Button>
                <button
                  onClick={() => { if (confirm(`Delete "${l.title}"?`)) deleteLesson.mutate(l.id) }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete lesson"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {editingLesson && m.lessons.some((l: any) => l.id === editingLesson) && (
              <LessonEditor lessonId={editingLesson} courseId={courseId} onClose={() => setEditingLesson(null)} />
            )}
            {newLessonModuleId === m.id && (
              <NewLessonForm moduleId={m.id} courseId={courseId} onClose={() => setNewLessonModuleId(null)} />
            )}
            {editingModuleId === m.id && (
              <ModuleEditor moduleId={m.id} courseId={courseId} currentTitle={m.title} currentDescription={m.description} onClose={() => setEditingModuleId(null)} />
            )}
          </div>
        </Card>
      ))}

      {showNewModule ? (
        <NewModuleForm courseId={courseId} onClose={() => setShowNewModule(false)} />
      ) : (
        <Button variant="outline" className="w-full border-dashed" onClick={() => setShowNewModule(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Module
        </Button>
      )}
    </div>
  )
}

// ---- Edit course meta (thumbnail, title, etc.) ----
function EditCourseMetaForm({ courseId, course, onClose }: {
  courseId: string
  course: any
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    title: course.title || "",
    shortName: course.shortName || "",
    description: course.description || "",
    longDescription: course.longDescription || "",
    category: course.category || COURSE_CATEGORIES[0],
    level: course.level || "Beginner",
    durationHours: course.durationHours || 40,
    price: course.price || 0,
    color: course.color || "emerald",
    tags: course.tags || "",
    certBody: course.certBody || "",
    thumbnail: course.thumbnail || "",
    published: course.published ?? true,
  })

  const save = useMutation({
    mutationFn: () => api(`/api/instructor/courses/${courseId}/edit`, {
      method: "PATCH",
      body: JSON.stringify(form),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      qc.invalidateQueries({ queryKey: ["courses"] })
      toast.success("Course updated")
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Card className="p-4 bg-cyan-500/[0.03] border-cyan-500/20 space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold">Course Settings</span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
        <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })} placeholder="Short name" maxLength={6} />
      </div>
      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
      <Textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} placeholder="Full description" className="min-h-[80px]" />
      <div className="space-y-1.5">
        <Label className="text-xs"><ImageIcon className="h-3 w-3 inline mr-1" /> Thumbnail URL</Label>
        <Input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
        {form.thumbnail && (
          <div className="h-20 rounded-lg overflow-hidden border border-border">
            <img src={form.thumbnail} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COURSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COURSE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COURSE_COLORS_LIST.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Input type="number" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })} placeholder="Hours" />
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Price" />
        <Input value={form.certBody} onChange={(e) => setForm({ ...form, certBody: e.target.value })} placeholder="Cert body" />
      </div>
      <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" />
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </Card>
  )
}

// ---- Module Editor ----
function ModuleEditor({ moduleId, courseId, currentTitle, currentDescription, onClose }: {
  moduleId: string; courseId: string; currentTitle: string; currentDescription?: string; onClose: () => void
}) {
  const qc = useQueryClient()
  const [title, setTitle] = React.useState(currentTitle)
  const [description, setDescription] = React.useState(currentDescription || "")

  const save = useMutation({
    mutationFn: () => api(`/api/instructor/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify({ title, description }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Module saved")
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="p-4 bg-emerald-500/[0.03] space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold">Edit Module</span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title" />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
      <Button size="sm" onClick={() => save.mutate()} disabled={!title.trim() || save.isPending}>
        <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? "Saving..." : "Save Module"}
      </Button>
    </div>
  )
}

function NewModuleForm({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")

  const create = useMutation({
    mutationFn: () => api(`/api/instructor/courses/${courseId}/modules`, {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Module created")
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Card className="p-4 bg-cyan-500/[0.03] border-cyan-500/20 space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold">New Module</span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title (e.g. Module 09 - Cloud Security)" />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
      <Button size="sm" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {create.isPending ? "Creating..." : "Create Module"}
      </Button>
    </Card>
  )
}

// ---- Lesson Editor (with Quiz creator) ----
function LessonEditor({ lessonId, courseId, onClose }: { lessonId: string; courseId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery<any>({
    queryKey: ["lesson", lessonId],
    queryFn: () => api(`/api/lessons/${lessonId}`),
  })
  const lesson = data?.lesson
  const [title, setTitle] = React.useState("")
  const [type, setType] = React.useState("reading")
  const [content, setContent] = React.useState("")
  const [durationMin, setDurationMin] = React.useState(15)
  const [pdfPages, setPdfPages] = React.useState(0)
  const [showQuizEditor, setShowQuizEditor] = React.useState(false)

  React.useEffect(() => {
    if (lesson) {
      setTitle(lesson.title)
      setType(lesson.type)
      setContent(lesson.content)
      setDurationMin(lesson.durationMin)
      setPdfPages(lesson.pdfPages || 0)
    }
  }, [lesson?.id])

  const save = useMutation({
    mutationFn: () => api(`/api/instructor/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify({ title, type, content, durationMin: Number(durationMin), pdfPages: Number(pdfPages) }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Lesson saved")
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (!lesson) return <div className="p-4"><Skeleton className="h-32" /></div>

  return (
    <div className="p-4 bg-emerald-500/[0.03] space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold">Edit Lesson</span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
      <div className="grid sm:grid-cols-3 gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="pdf">PDF Document</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} placeholder="Duration (min)" />
        {type === "pdf" && (
          <Input type="number" value={pdfPages} onChange={(e) => setPdfPages(Number(e.target.value))} placeholder="PDF pages" />
        )}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Lesson content (Markdown supported)..."
        className="min-h-[180px] font-mono text-xs"
      />

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? "Saving..." : "Save Lesson"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowQuizEditor((s) => !s)}>
          <FileText className="h-3.5 w-3.5 mr-1" /> {showQuizEditor ? "Hide Quiz" : "Manage Quiz"}
        </Button>
      </div>

      {showQuizEditor && <QuizEditor lessonId={lessonId} courseId={courseId} />}
    </div>
  )
}

// ---- Quiz Editor ----
function QuizEditor({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<any>({
    queryKey: ["instructor", "lesson", lessonId, "quiz"],
    queryFn: () => api(`/api/instructor/lessons/${lessonId}/quiz`),
  })
  const quiz = data?.quiz
  const [showAddQuestion, setShowAddQuestion] = React.useState(false)

  const createQuiz = useMutation({
    mutationFn: () => api(`/api/instructor/lessons/${lessonId}/quiz`, {
      method: "POST",
      body: JSON.stringify({ title: `Quiz`, description: "" }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor", "lesson", lessonId, "quiz"] })
      toast.success("Quiz created - now add questions!")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteQuiz = useMutation({
    mutationFn: () => api(`/api/instructor/quizzes/${quiz.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor", "lesson", lessonId, "quiz"] })
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] })
      toast.success("Quiz deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <Skeleton className="h-32" />

  return (
    <div className="mt-3 p-4 rounded-lg border border-violet-500/20 bg-violet-500/[0.03] space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold">Quiz</span>
        {quiz && (
          <Badge variant="outline" className="text-[10px] text-violet-400 border-violet-500/30">
            {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {!quiz ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-3">No quiz yet. Create one to test your students.</p>
          <Button size="sm" onClick={() => createQuiz.mutate()} disabled={createQuiz.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Quiz
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {quiz.questions.map((q: any, i: number) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                lessonId={lessonId}
                courseId={courseId}
                quizId={quiz.id}
              />
            ))}
            {quiz.questions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No questions yet. Add your first question below.</p>
            )}
          </div>

          {showAddQuestion ? (
            <QuestionForm
              quizId={quiz.id}
              lessonId={lessonId}
              courseId={courseId}
              onClose={() => setShowAddQuestion(false)}
            />
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddQuestion(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-500"
                onClick={() => { if (confirm("Delete this quiz and all its questions?")) deleteQuiz.mutate() }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Quiz
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function QuestionCard({ question, index, lessonId, courseId, quizId }: {
  question: any
  index: number
  lessonId: string
  courseId: string
  quizId: string
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = React.useState(false)

  const deleteQuestion = useMutation({
    mutationFn: () => api(`/api/instructor/questions/${question.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor", "lesson", lessonId, "quiz"] })
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] })
      toast.success("Question deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (editing) {
    return (
      <QuestionForm
        quizId={quizId}
        lessonId={lessonId}
        courseId={courseId}
        existingQuestion={question}
        onClose={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-background/50">
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1.5">{question.text}</p>
          <div className="space-y-1">
            {question.options.map((opt: string, i: number) => (
              <div key={i} className={cn(
                "text-xs px-2 py-1 rounded flex items-center gap-2",
                i === question.answerIndex ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "text-muted-foreground"
              )}>
                <span className="font-mono">{String.fromCharCode(65 + i)}.</span>
                <span>{opt}</span>
                {i === question.answerIndex && <CheckCircle2 className="h-3 w-3 ml-auto" />}
              </div>
            ))}
          </div>
          {question.explanation && (
            <p className="text-[11px] text-muted-foreground mt-2 italic">Explanation: {question.explanation}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Edit question"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => { if (confirm("Delete this question?")) deleteQuestion.mutate() }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete question"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionForm({ quizId, lessonId, courseId, existingQuestion, onClose }: {
  quizId: string
  lessonId: string
  courseId: string
  existingQuestion?: any
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [text, setText] = React.useState(existingQuestion?.text || "")
  const [options, setOptions] = React.useState<string[]>(
    existingQuestion?.options?.length === 4 ? [...existingQuestion.options] : ["", "", "", ""]
  )
  const [answerIndex, setAnswerIndex] = React.useState(existingQuestion?.answerIndex ?? 0)
  const [explanation, setExplanation] = React.useState(existingQuestion?.explanation || "")

  const save = useMutation({
    mutationFn: async () => {
      if (existingQuestion) {
        return api(`/api/instructor/questions/${existingQuestion.id}`, {
          method: "PATCH",
          body: JSON.stringify({ text, options, answerIndex, explanation }),
        })
      }
      return api(`/api/instructor/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify({ text, options, answerIndex, explanation }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor", "lesson", lessonId, "quiz"] })
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] })
      toast.success(existingQuestion ? "Question updated" : "Question added")
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-xs font-semibold">{existingQuestion ? "Edit Question" : "New Question"}</span>
        <Button size="sm" variant="ghost" className="ml-auto h-6" onClick={onClose}><X className="h-3 w-3" /></Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Question Text</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What is the primary goal of a渗透 test?" className="min-h-[60px] text-xs" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Options (click radio to mark correct answer)</Label>
        <div className="space-y-1.5">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnswerIndex(i)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  i === answerIndex ? "border-emerald-500 bg-emerald-500/20" : "border-border"
                )}
              >
                {i === answerIndex && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
              </button>
              <span className="text-[10px] font-mono text-muted-foreground w-4">{String.fromCharCode(65 + i)}</span>
              <Input
                value={opt}
                onChange={(e) => {
                  const next = [...options]
                  next[i] = e.target.value
                  setOptions(next)
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Explanation (optional)</Label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Shown after the student answers" className="min-h-[40px] text-xs" />
      </div>
      <Button size="sm" onClick={() => save.mutate()} disabled={!text.trim() || options.some((o) => !o.trim()) || save.isPending}>
        <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? "Saving..." : existingQuestion ? "Update Question" : "Add Question"}
      </Button>
    </div>
  )
}

function NewLessonForm({ moduleId, courseId, onClose }: { moduleId: string; courseId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = React.useState("")
  const [type, setType] = React.useState("reading")
  const [content, setContent] = React.useState("")
  const [durationMin, setDurationMin] = React.useState(15)
  const [pdfPages, setPdfPages] = React.useState(0)

  const create = useMutation({
    mutationFn: () => api(`/api/instructor/modules/${moduleId}/lessons`, {
      method: "POST",
      body: JSON.stringify({ title, type, content, durationMin: Number(durationMin), pdfPages: Number(pdfPages) }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] })
      qc.invalidateQueries({ queryKey: ["instructor", "courses"] })
      toast.success("Lesson created")
      onClose()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="p-4 bg-cyan-500/[0.03] space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold">New Lesson</span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
      <div className="grid sm:grid-cols-3 gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="pdf">PDF Document</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} placeholder="Duration (min)" />
        {type === "pdf" && (
          <Input type="number" value={pdfPages} onChange={(e) => setPdfPages(Number(e.target.value))} placeholder="PDF pages" />
        )}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Lesson content (Markdown supported)..."
        className="min-h-[120px] font-mono text-xs"
      />
      <Button size="sm" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {create.isPending ? "Creating..." : "Create Lesson"}
      </Button>
    </div>
  )
}

// ============ Live Sessions Tab ============
function LiveSessionsTab() {
  const { navigate } = useAppStore()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    title: "", description: "", courseId: "", scheduledAt: "", maxStudents: 50,
  })
  const { data: coursesData } = useQuery<{ courses: InstructorCourse[] }>({
    queryKey: ["instructor", "courses"],
    queryFn: () => api("/api/instructor/courses"),
  })
  const myCourses = coursesData?.courses ?? []

  const { data, isLoading } = useQuery<{ sessions: LiveSessionItem[] }>({
    queryKey: ["live-sessions", "instructor", "all"],
    queryFn: () => api("/api/live-sessions?status=all"),
    refetchInterval: 20000,
  })
  const sessions = (data?.sessions ?? []).filter((s) => s.isHost)
  const live = sessions.filter((s) => s.status === "live")
  const scheduled = sessions.filter((s) => s.status === "scheduled")
  const ended = sessions.filter((s) => s.status === "ended")

  const createMutation = useMutation({
    mutationFn: () => api("/api/live-sessions", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        courseId: form.courseId || null,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        maxStudents: Number(form.maxStudents) || 50,
        startNow: !form.scheduledAt,
      }),
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] })
      setCreateOpen(false)
      setForm({ title: "", description: "", courseId: "", scheduledAt: "", maxStudents: 50 })
      toast.success("Live session created!")
      // navigate to live view if it's live
      if (data.session?.status === "live") {
        navigate({ name: "live" })
      }
    },
    onError: (e: any) => toast.error(e.message),
  })

  const startSession = useMutation({
    mutationFn: (id: string) => api(`/api/live-sessions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "start" }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] })
      toast.success("Session started - taking you to the live room")
      navigate({ name: "live" })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const endSession = useMutation({
    mutationFn: (id: string) => api(`/api/live-sessions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "end" }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] })
      toast.success("Session ended")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const cancelSession = useMutation({
    mutationFn: (id: string) => api(`/api/live-sessions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "cancel" }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] })
      toast.success("Session cancelled")
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-400" /> Live Sessions
          </h2>
          <p className="text-sm text-muted-foreground">Schedule and host live workshops</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-red-500/90 hover:bg-red-500 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> Schedule Session
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 pulse-dot" /> Live Now ({live.length})
              </h3>
              {live.map((s) => (
                <LiveSessionRow key={s.id} session={s} onEnd={() => endSession.mutate(s.id)} onJoin={() => navigate({ name: "live" })} />
              ))}
            </div>
          )}

          {scheduled.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-amber-400" /> Upcoming ({scheduled.length})
              </h3>
              {scheduled.map((s) => (
                <LiveSessionRow
                  key={s.id}
                  session={s}
                  onStart={() => startSession.mutate(s.id)}
                  onCancel={() => cancelSession.mutate(s.id)}
                  starting={startSession.isPending}
                />
              ))}
            </div>
          )}

          {ended.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-muted-foreground">Past Sessions</h3>
              {ended.slice(0, 5).map((s) => <LiveSessionRow key={s.id} session={s} ended />)}
            </div>
          )}

          {sessions.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <Radio className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No live sessions yet</p>
              <p className="text-sm text-muted-foreground mb-4">Schedule your first workshop or start one instantly.</p>
              <Button onClick={() => setCreateOpen(true)} className="bg-red-500/90 hover:bg-red-500 text-white">
                <Plus className="h-4 w-4 mr-1.5" /> Schedule Session
              </Button>
            </Card>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Live Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Session Title</Label>
              <Input placeholder="e.g. Live: OWASP Top 10 Workshop" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea placeholder="What will you cover?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[60px]" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Course (optional)</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No course</SelectItem>
                    {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.shortName} - {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max Students</Label>
                <Input type="number" min={1} value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty to start live immediately. Pick a future time to schedule.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.title.trim() || createMutation.isPending}
              className="bg-red-500/90 hover:bg-red-500 text-white"
            >
              {createMutation.isPending ? "Creating..." : form.scheduledAt ? "Schedule" : "Start Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LiveSessionRow({ session, onStart, onEnd, onCancel, onJoin, ended, starting }: {
  session: LiveSessionItem
  onStart?: () => void
  onEnd?: () => void
  onCancel?: () => void
  onJoin?: () => void
  ended?: boolean
  starting?: boolean
}) {
  return (
    <Card className="p-4 card-hover">
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          session.status === "live" ? "bg-red-500/10" : session.status === "scheduled" ? "bg-amber-500/10" : "bg-muted/30"
        )}>
          {session.status === "live" ? (
            <span className="h-2 w-2 rounded-full bg-red-500 pulse-dot" />
          ) : session.status === "scheduled" ? (
            <CalendarIcon className="h-5 w-5 text-amber-400" />
          ) : (
            <StopCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{session.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(session.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            {session.course && <Badge variant="outline" className="text-[9px]">{session.course.shortName}</Badge>}
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{session.memberCount}/{session.maxStudents}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.status === "live" && (
            <>
              <Button size="sm" onClick={onJoin}><Video className="h-3.5 w-3.5 mr-1" /> Join</Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-500" onClick={onEnd}><StopCircle className="h-3.5 w-3.5" /></Button>
            </>
          )}
          {session.status === "scheduled" && (
            <>
              <Button size="sm" onClick={onStart} disabled={starting}>
                <PlayCircle className="h-3.5 w-3.5 mr-1" /> Start
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-500" onClick={onCancel}><X className="h-3.5 w-3.5" /></Button>
            </>
          )}
          {ended && <Badge variant="outline" className="text-[10px] text-muted-foreground">Ended</Badge>}
        </div>
      </div>
    </Card>
  )
}

// ============ My Students Tab ============
function MyStudentsTab() {
  const { data, isLoading } = useQuery<{ courses: InstructorCourse[]; totals: any }>({
    queryKey: ["instructor", "courses"],
    queryFn: () => api("/api/instructor/courses"),
  })
  const courses = data?.courses ?? []
  const allStudents = React.useMemo(() => {
    const map = new Map<string, {
      userId: string; name: string; title: string | null; avatar: string | null
      enrollments: { courseId: string; courseTitle: string; courseShortName: string; courseColor: string; progress: number; completed: boolean; lastAccessed: string | null; enrolledAt: string }[]
    }>()
    for (const c of courses) {
      for (const s of c.recentStudents) {
        if (!map.has(s.userId)) {
          map.set(s.userId, {
            userId: s.userId, name: s.user.name, title: s.user.title, avatar: s.user.avatar,
            enrollments: [],
          })
        }
        const student = map.get(s.userId)!
        student.enrollments.push({
          courseId: c.id,
          courseTitle: c.title,
          courseShortName: c.shortName,
          courseColor: c.color,
          progress: s.progress,
          completed: s.completed,
          lastAccessed: s.lastAccessed,
          enrolledAt: s.enrolledAt,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.enrollments.length - a.enrollments.length)
  }, [courses])

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  }

  if (allStudents.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">No students yet</p>
        <p className="text-sm text-muted-foreground">Students enrolled in your courses will appear here.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" /> My Students
        </h2>
        <p className="text-sm text-muted-foreground">{allStudents.length} student{allStudents.length !== 1 ? "s" : ""} across {courses.length} course{courses.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="space-y-3">
        {allStudents.map((s) => {
          const avgProgress = s.enrollments.length > 0
            ? Math.round(s.enrollments.reduce((a, e) => a + e.progress, 0) / s.enrollments.length)
            : 0
          const completedCount = s.enrollments.filter((e) => e.completed).length
          return (
            <Card key={s.userId} className="p-4 card-hover">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border border-cyan-500/20">
                  <AvatarFallback className="bg-cyan-500/10 text-cyan-400 text-xs">
                    {s.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{s.name}</span>
                    {s.title && <span className="text-[10px] text-muted-foreground">· {s.title}</span>}
                    <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">{s.enrollments.length} course{s.enrollments.length !== 1 ? "s" : ""}</Badge>
                    {completedCount > 0 && (
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> {completedCount} done
                      </Badge>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mt-2">
                    {s.enrollments.map((e) => {
                      const col = colorFor(e.courseColor)
                      return (
                        <div key={e.courseId} className="p-2 rounded-lg border border-border bg-background/50">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn("flex h-6 w-6 items-center justify-center rounded font-mono text-[9px] font-bold", col.bg, col.text)}>
                              {e.courseShortName.slice(0, 4)}
                            </div>
                            <span className="text-xs font-medium truncate flex-1">{e.courseTitle}</span>
                            {e.completed && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={e.progress} className="h-1 flex-1" />
                            <span className={cn("text-[10px] font-mono", e.progress > 0 ? col.text : "text-muted-foreground")}>{e.progress}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-lg font-bold text-violet-400 tabular-nums">{avgProgress}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Avg</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ============ Calendar Tab ============
function CalendarTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-emerald-400" /> Calendar
        </h2>
        <p className="text-sm text-muted-foreground">Your scheduled sessions and deadlines</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarWidget />
        </div>
        <Card className="p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-cyan-400" /> Quick Tips
          </h3>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p><span className="text-red-400 font-medium">●</span> Red dots mark live sessions.</p>
            <p><span className="text-emerald-400 font-medium">●</span> Green dots mark upcoming lessons.</p>
            <p><span className="text-amber-400 font-medium">●</span> Amber dots mark assignment deadlines.</p>
            <p>Click any day to see events scheduled for that date.</p>
            <p>Use the <Badge variant="outline" className="text-[10px]">Today</Badge> button to jump back to the current date.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ============ Analytics Tab ============
const CHART_COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#f97316", "#ef4444", "#14b8a6"]

function AnalyticsTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["instructor", "analytics"],
    queryFn: () => api("/api/instructor/analytics"),
  })

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  }
  if (!data) return null

  const { enrollmentSeries, courseBreakdown, progressDistribution, totals } = data

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-400" /> Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Engagement, completion, and enrollment insights</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Enrollment over time */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Enrollment Trend
              </h3>
              <p className="text-[10px] text-muted-foreground">Last 30 days</p>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
              {totals.enrollments} total
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={enrollmentSeries} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 190 / 0.3)" />
              <XAxis dataKey="label" tick={{ fill: "#6b7d75", fontSize: 9 }} interval={5} axisLine={{ stroke: "#334155" }} />
              <YAxis tick={{ fill: "#6b7d75", fontSize: 10 }} allowDecimals={false} axisLine={{ stroke: "#334155" }} />
              <Tooltip
                contentStyle={{ background: "oklch(0.2 0.014 195)", border: "1px solid oklch(0.3 0.02 190)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e8f5ee" }}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#enrollGrad)" name="Enrollments" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Student progress distribution */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-cyan-400" /> Student Progress
              </h3>
              <p className="text-[10px] text-muted-foreground">Distribution across all courses</p>
            </div>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">
              Avg {totals.avgProgress}%
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progressDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 190 / 0.3)" />
              <XAxis dataKey="range" tick={{ fill: "#6b7d75", fontSize: 9 }} axisLine={{ stroke: "#334155" }} />
              <YAxis tick={{ fill: "#6b7d75", fontSize: 10 }} allowDecimals={false} axisLine={{ stroke: "#334155" }} />
              <Tooltip
                contentStyle={{ background: "oklch(0.2 0.014 195)", border: "1px solid oklch(0.3 0.02 190)", borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: "oklch(0.3 0.02 190 / 0.2)" }}
              />
              <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                {progressDistribution.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Course breakdown */}
        {courseBreakdown.length > 0 && (
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-violet-400" /> Course Breakdown
                </h3>
                <p className="text-[10px] text-muted-foreground">Enrolled vs Active vs Completed per course</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-violet-400 border-violet-500/30">
                {totals.courses} courses
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={courseBreakdown} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 190 / 0.3)" />
                <XAxis dataKey="shortName" tick={{ fill: "#6b7d75", fontSize: 10 }} axisLine={{ stroke: "#334155" }} />
                <YAxis tick={{ fill: "#6b7d75", fontSize: 10 }} allowDecimals={false} axisLine={{ stroke: "#334155" }} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.2 0.014 195)", border: "1px solid oklch(0.3 0.02 190)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "oklch(0.3 0.02 190 / 0.2)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="active" stackId="a" fill="#06b6d4" name="Active" radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  )
}
