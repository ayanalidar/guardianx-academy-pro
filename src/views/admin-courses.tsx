"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, BookOpen, Plus, Pencil, Trash2, X, Loader2,
  CheckCircle2, AlertTriangle, Star, Users, Clock, Layers,
  IndianRupee, Search, GraduationCap, Sparkles,
} from "lucide-react"
import { COURSE_LIST_FIELDS, parseCourseList } from "@/lib/course-lists"
import { toast } from "sonner"

/* ============================================================
   AdminCoursesView — simple form-based course management page.

   - Table of all courses: title, category, level, price, status,
     instructor, plus secondary info (rating, students, lessons).
   - Create Course button → dialog with simple form (title,
     shortName, description, category, level, durationHours,
     price, instructorId dropdown, published checkbox).
   - Edit button → same form, pre-filled.
   - Delete button → confirm dialog (cascade delete).

   Fetches:   /api/admin/courses
   Mutates:   POST /api/admin/courses
              PATCH /api/admin/courses/[id]
              DELETE /api/admin/courses/[id]
   Instructors dropdown is populated from /api/admin/instructors.
   ============================================================ */

/* ------------------------------ types ------------------------------ */
interface AdminCourse {
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
  published: boolean
  createdAt: string
  updatedAt: string
  instructor: { id: string; name: string; title: string | null; avatar: string | null }
  moduleCount: number
  lessonCount: number
  labCount: number
  enrollmentCount: number
}

interface InstructorOption {
  id: string
  name: string
  email: string
  title: string | null
}

/* ------------------------------ form ------------------------------ */
interface CourseForm {
  title: string
  shortName: string
  description: string
  longDescription: string
  tags: string
  certBody: string
  category: string
  level: string
  durationHours: string
  price: string
  instructorId: string
  published: boolean
  // Course extras — one item per line in the UI (see course-lists.ts)
  whatYouWillLearn: string
  prerequisites: string
  whoShouldAttend: string
  toolsCovered: string
  careerOutcomes: string
}

const CATEGORIES = [
  "Ethical Hacking", "Networking", "Web Security", "System Administration",
  "Security Management", "Identity & Access", "Cloud Security",
  "DevSecOps", "Incident Response", "General",
]

const LEVELS = ["Beginner", "Intermediate", "Advanced"]

function emptyForm(): CourseForm {
  return {
    title: "",
    shortName: "",
    description: "",
    longDescription: "",
    tags: "",
    certBody: "",
    category: CATEGORIES[0]!,
    level: LEVELS[0]!,
    durationHours: "40",
    price: "0",
    instructorId: "",
    published: true,
    whatYouWillLearn: "",
    prerequisites: "",
    whoShouldAttend: "",
    toolsCovered: "",
    careerOutcomes: "",
  }
}

function formFromCourse(c: AdminCourse): CourseForm {
  return {
    title: c.title,
    shortName: c.shortName,
    description: c.description,
    longDescription: (c as any).longDescription ?? "",
    tags: (c as any).tags ?? "",
    certBody: (c as any).certBody ?? "",
    category: c.category,
    level: c.level,
    durationHours: String(c.durationHours),
    price: String(c.price),
    instructorId: c.instructor?.id ?? "",
    published: c.published,
    // Stored as JSON arrays — decode to one-item-per-line for the textareas
    ...Object.fromEntries(
      COURSE_LIST_FIELDS.map(({ key }) => [key, parseCourseList((c as any)[key]).join("\n")])
    ),
  } as CourseForm
}

function validateForm(form: CourseForm, instructors: InstructorOption[]): string | null {
  if (!form.title.trim()) return "Title is required"
  if (!form.shortName.trim()) return "Short name (e.g. CEH) is required"
  if (!form.instructorId) return "Instructor is required"
  if (!instructors.some((i) => i.id === form.instructorId)) {
    return "Please select a valid instructor from the list"
  }
  const dur = Number(form.durationHours)
  if (!Number.isFinite(dur) || dur < 1) return "Duration must be a positive number"
  const price = Number(form.price)
  if (!Number.isFinite(price) || price < 0) return "Price must be a non-negative number"
  return null
}

const LEVEL_BADGE: Record<string, string> = {
  Beginner: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  Intermediate: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
  Advanced: "border-violet-500/40 text-violet-300 bg-violet-500/10",
}

/* ------------------------------ view ------------------------------ */
export function AdminCoursesView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editingCourse, setEditingCourse] = React.useState<AdminCourse | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingCourse, setDeletingCourse] = React.useState<AdminCourse | null>(null)
  const [form, setForm] = React.useState<CourseForm>(emptyForm())
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  /* ------------------- DB queries ------------------- */
  const { data, isLoading, isFetching, error } = useQuery<{ courses: AdminCourse[]; total: number }>({
    queryKey: ["admin-courses"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/admin/courses")
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized — please sign in as an admin")
        if (res.status === 403) throw new Error("Forbidden — admin role required")
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Failed to load courses")
      }
      return res.json()
    },
  })

  const {
    data: instructorData,
    isError: instructorsError,
    refetch: refetchInstructors,
  } = useQuery<{ instructors: InstructorOption[] }>({
    queryKey: ["admin-instructors-mini"],
    staleTime: 5 * 60_000,
    retry: 2,
    queryFn: async () => {
      const res = await fetch("/api/admin/instructors")
      if (!res.ok) {
        // A 401/500 must NOT silently degrade to an empty dropdown — an empty
        // list dead-ends course creation with "Instructor is required" and no
        // hint why. Throw so the query error state can show the banner below.
        throw new Error(`Instructor list failed (HTTP ${res.status})`)
      }
      const j = await res.json()
      const list: InstructorOption[] = (j.instructors ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        title: i.title ?? null,
      }))
      return { instructors: list }
    },
  })

  const courses = data?.courses ?? []
  const instructors = instructorData?.instructors ?? []

  // Client-side filter (admin course count is small enough)
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

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["admin-courses"] })
  }

  function openCreate() {
    setForm(emptyForm())
    setFormError(null)
    setCreateOpen(true)
  }

  function openEdit(c: AdminCourse) {
    setEditingCourse(c)
    setForm(formFromCourse(c))
    setFormError(null)
    setEditOpen(true)
  }

  function openDelete(c: AdminCourse) {
    setDeletingCourse(c)
    setDeleteOpen(true)
  }

  /* ------------------- mutations ------------------- */
  async function handleSubmitCreate() {
    const err = validateForm(form, instructors)
    if (err) { setFormError(err); return }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortName: form.shortName,
          description: form.description,
          longDescription: form.longDescription,
          tags: form.tags,
          certBody: form.certBody,
          category: form.category,
          level: form.level,
          durationHours: Number(form.durationHours),
          price: Number(form.price),
          instructorId: form.instructorId,
          ...Object.fromEntries(COURSE_LIST_FIELDS.map(({ key }) => [key, (form as any)[key]])),
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to create course")
      // The create endpoint hardcodes published=true; toggle if user unchecked it
      if (!form.published && j.course?.id) {
        await fetch(`/api/admin/courses/${j.course.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: false }),
        })
      }
      toast.success(`Course "${form.shortName.toUpperCase()}" created`)
      setCreateOpen(false)
      refetch()
    } catch (e: any) {
      setFormError(e.message || "Failed to create course")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitEdit() {
    if (!editingCourse) return
    const err = validateForm(form, instructors)
    if (err) { setFormError(err); return }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortName: form.shortName,
          description: form.description,
          longDescription: form.longDescription,
          tags: form.tags,
          certBody: form.certBody,
          category: form.category,
          level: form.level,
          durationHours: Number(form.durationHours),
          price: Number(form.price),
          instructorId: form.instructorId,
          published: form.published,
          ...Object.fromEntries(COURSE_LIST_FIELDS.map(({ key }) => [key, (form as any)[key]])),
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to update course")
      toast.success(`Course "${form.shortName.toUpperCase()}" updated`)
      setEditOpen(false)
      refetch()
    } catch (e: any) {
      setFormError(e.message || "Failed to update course")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCourse) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/courses/${deletingCourse.id}`, { method: "DELETE" })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to delete course")
      toast.success(`Course "${deletingCourse.shortName}" deleted`)
      setDeleteOpen(false)
      refetch()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete course")
    } finally {
      setSubmitting(false)
    }
  }

  /* ------------------- render ------------------- */
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <FadeInRow>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate({ name: "admin" })}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-amber-300 transition-colors mb-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> BACK TO ADMIN
              </button>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <BookOpen className="h-4.5 w-4.5 text-amber-300" />
                </span>
                Courses
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                Create, edit, and publish courses. Assign instructors, set pricing, and manage the catalog from one place.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="bg-amber-600 hover:bg-amber-500 text-amber-50 btn-premium h-10 px-5"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Course
            </Button>
          </div>
        </FadeInRow>

        {/* Instructor-load failure banner: course creation is impossible
            without the dropdown, so never let that failure be silent. */}
        {instructorsError && (
          <FadeInRow>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
              <span className="text-red-300 font-medium">
                Instructor list failed to load — course creation is blocked until it loads.
              </span>
              <button
                type="button"
                onClick={() => refetchInstructors()}
                className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/25 transition-colors"
              >
                Retry
              </button>
            </div>
          </FadeInRow>
        )}

        {/* Stats strip */}
        <FadeInRow>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Total Courses"
              value={courses.length}
              icon={BookOpen}
              tint="bg-amber-500/10 text-amber-300"
            />
            <StatTile
              label="Published"
              value={courses.filter((c) => c.published).length}
              icon={CheckCircle2}
              tint="bg-emerald-500/10 text-emerald-300"
            />
            <StatTile
              label="Drafts"
              value={courses.filter((c) => !c.published).length}
              icon={Layers}
              tint="bg-cyan-500/10 text-cyan-300"
            />
            <StatTile
              label="Total Enrollments"
              value={courses.reduce((acc, c) => acc + c.enrollmentCount, 0)}
              icon={Users}
              tint="bg-violet-500/10 text-violet-300"
            />
          </div>
        </FadeInRow>

        {/* Search bar */}
        <FadeInRow>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by title, short name, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/40 border-border/60"
            />
          </div>
        </FadeInRow>

        {/* Table card */}
        <FadeInRow>
          <Card className="bg-card/40 backdrop-blur-xl border-border/60 overflow-hidden p-0">
            {/* Header row */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/20">
              <h2 className="text-sm font-semibold">All Courses ({filtered.length})</h2>
              {isFetching && !isLoading && (
                <span className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> SYNCING
                </span>
              )}
            </div>

            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-border/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Course</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-1">Level</div>
              <div className="col-span-1">Price</div>
              <div className="col-span-2">Instructor</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
                <p className="font-medium mb-1">Failed to load courses</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">{search ? "No courses match your search" : "No courses yet"}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {search
                    ? "Try a different search term."
                    : "Create your first course to populate the catalog."}
                </p>
                {!search && (
                  <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-500 btn-premium h-9">
                    <Plus className="h-4 w-4 mr-1.5" /> Create Course
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[640px] overflow-y-auto">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-3 px-5 py-3.5 hover:bg-muted/15 transition-colors items-center"
                  >
                    {/* Course */}
                    <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-violet-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{c.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">{c.shortName}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 text-amber-300" />
                            {c.rating.toFixed(1)}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" />
                            {c.enrollmentCount}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Layers className="h-2.5 w-2.5" />
                            {c.moduleCount}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {c.durationHours}h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="lg:col-span-2 text-sm text-muted-foreground truncate">
                      <span className="lg:hidden text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mr-1">Category:</span>
                      {c.category}
                    </div>

                    {/* Level */}
                    <div className="lg:col-span-1">
                      <Badge variant="outline" className={cn("text-[9px] uppercase", LEVEL_BADGE[c.level] ?? LEVEL_BADGE.Beginner)}>
                        {c.level}
                      </Badge>
                    </div>

                    {/* Price */}
                    <div className="lg:col-span-1 text-sm font-medium tabular-nums flex items-center">
                      <span className="lg:hidden text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mr-1">Price:</span>
                      {c.price === 0 ? (
                        <span className="text-emerald-300">Free</span>
                      ) : (
                        <span className="flex items-center">
                          <IndianRupee className="h-3 w-3" />
                          {c.price.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {/* Instructor */}
                    <div className="lg:col-span-2 text-sm truncate">
                      <span className="lg:hidden text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mr-1">Instructor:</span>
                      {c.instructor?.name ?? "—"}
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase",
                          c.published
                            ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                            : "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",
                        )}
                      >
                        {c.published ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1 flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(c)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-300 hover:bg-amber-500/10"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDelete(c)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </FadeInRow>
      </div>

      {/* Create / Edit dialog */}
      <CourseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Course"
        description="Add a new course to the catalog. The slug is auto-generated from the title."
        form={form}
        setForm={setForm}
        instructors={instructors}
        submitting={submitting}
        error={formError}
        onSubmit={handleSubmitCreate}
        submitLabel="Create Course"
      />
      <CourseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Edit Course ${editingCourse ? `"${editingCourse.shortName}"` : ""}`}
        description="Update course details. Changes are visible immediately in the catalog."
        form={form}
        setForm={setForm}
        instructors={instructors}
        submitting={submitting}
        error={formError}
        onSubmit={handleSubmitEdit}
        submitLabel="Save Changes"
      />

      {/* Delete alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" /> Delete course?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono font-bold text-foreground">{deletingCourse?.shortName}</span>
              {" "}— <span className="text-foreground">{deletingCourse?.title}</span>. All modules, lessons,
              enrollments, and certificates linked to this course will be cascade-deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60" disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-500 text-rose-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------ sub-components ------------------------------ */
function StatTile({
  label, value, icon: Icon, tint,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tint: string }) {
  return (
    <Card className="bg-card/40 border-border/60 p-4 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 truncate">{label}</div>
      </div>
    </Card>
  )
}

function FadeInRow({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setShown(true), 50)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 300ms ease-out, transform 300ms ease-out",
      }}
    >
      {children}
    </div>
  )
}

function CourseFormDialog({
  open, onOpenChange, title, description, form, setForm, instructors,
  submitting, error, onSubmit, submitLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  form: CourseForm
  setForm: React.Dispatch<React.SetStateAction<CourseForm>>
  instructors: InstructorOption[]
  submitting: boolean
  error: string | null
  onSubmit: () => void
  submitLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-4 w-4 text-amber-300" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title + shortName */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="course-title" className="text-xs font-medium">Title</Label>
              <Input
                id="course-title"
                placeholder="e.g. Certified Ethical Hacker v13"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-short" className="text-xs font-medium">Short Name</Label>
              <Input
                id="course-short"
                placeholder="CEH"
                value={form.shortName}
                onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value.toUpperCase() }))}
                className="bg-background/60 border-border/60 font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="course-desc" className="text-xs font-medium">Description</Label>
            <Textarea
              id="course-desc"
              placeholder="One-line course description shown in cards and search results."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-background/60 border-border/60 min-h-[80px]"
            />
          </div>

          {/* Long Description */}
          <div className="space-y-1.5">
            <Label htmlFor="course-long-desc" className="text-xs font-medium">Long Description</Label>
            <Textarea
              id="course-long-desc"
              placeholder="Full course description shown on the course detail page. This drives the 'What you'll learn' section."
              value={form.longDescription}
              onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
              className="bg-background/60 border-border/60 min-h-[120px]"
            />
          </div>

          {/* Tags + Cert Body */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-tags" className="text-xs font-medium">Tags (comma-separated)</Label>
              <Input
                id="course-tags"
                placeholder="OWASP, Penetration Testing, Web Security"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-cert" className="text-xs font-medium">Certification Body</Label>
              <Input
                id="course-cert"
                placeholder="e.g. EC-Council, CompTIA, ISC2"
                value={form.certBody || ""}
                onChange={(e) => setForm((f) => ({ ...f, certBody: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
          </div>

          {/* Category + Level */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-category" className="text-xs font-medium">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="course-category" className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-level" className="text-xs font-medium">Level</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
              >
                <SelectTrigger id="course-level" className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration + Price */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-duration" className="text-xs font-medium">Duration (hours)</Label>
              <Input
                id="course-duration"
                type="number"
                min={1}
                value={form.durationHours}
                onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-price" className="text-xs font-medium">
                Price (₹) <span className="text-muted-foreground font-normal">(0 = Free)</span>
              </Label>
              <Input
                id="course-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
          </div>

          {/* Course page sections — what you'll learn, prerequisites, etc. */}
          <div className="rounded-lg border border-border/60 bg-background/30 p-3 space-y-3">
            <div>
              <div className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Course page sections
              </div>
              <p className="text-[10px] text-muted-foreground">One item per line — rendered exactly as typed on the public course page.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {COURSE_LIST_FIELDS.map(({ key, label, hint, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`course-${key}`} className="text-xs font-medium">{label}</Label>
                  <Textarea
                    id={`course-${key}`}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="bg-background/60 border-border/60 min-h-[72px] text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">{hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Instructor dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="course-instructor" className="text-xs font-medium">Instructor</Label>
            {instructors.length === 0 ? (
              <p className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                No instructors found. Create an instructor first via Admin → Instructor Assign.
              </p>
            ) : (
              <Select
                value={form.instructorId || "__NONE__"}
                onValueChange={(v) => setForm((f) => ({ ...f, instructorId: v === "__NONE__" ? "" : v }))}
              >
                <SelectTrigger id="course-instructor" className="bg-background/60 border-border/60">
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
                        {i.title && <span className="text-[10px] text-muted-foreground">· {i.title}</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Published checkbox */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Published</div>
              <p className="text-[10px] text-muted-foreground">Unpublished courses are drafts — hidden from the public catalog.</p>
            </div>
            <Checkbox
              checked={form.published}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, published: !!checked }))}
            />
          </div>

          {/* Error */}
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
              <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-500 text-amber-50 btn-premium"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            {submitting ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
