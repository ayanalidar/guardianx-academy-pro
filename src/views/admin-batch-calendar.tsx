"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock,
  Users, Video, MapPin, User, Plus, Pencil, Trash2, X, Loader2, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/* ---------------------------------------------------------------- *
 *  Types                                                            *
 * ---------------------------------------------------------------- */
type TrainingBatch = {
  id: string
  certification: string
  name: string
  schedule: string
  startDate: string
  startIsoDate: string | null
  mode: string
  instructor: string
  instructorId: string | null
  seats: number
  enrolled: number
  level: string
  status: string
  description: string
  featured: boolean
  order: number
  published: boolean
  googleFormUrl: string | null
}

type BatchForm = {
  certification: string
  name: string
  schedule: string
  startDate: string
  startIsoDate: string
  mode: string
  instructor: string
  seats: number
  enrolled: number
  level: string
  status: string
  description: string
  featured: boolean
  order: number
  published: boolean
  googleFormUrl: string
}

/* ---------------------------------------------------------------- *
 *  Helpers                                                         *
 * ---------------------------------------------------------------- */

/** Tailwind bg-* class for the calendar dot / chip for a given cert. */
function certColorClass(cert: string): string {
  const s = cert.toLowerCase()
  if (s.includes("security")) return "bg-emerald-500"
  if (s.includes("ceh") || s.includes("ethical")) return "bg-amber-500"
  if (s.includes("ccna")) return "bg-cyan-500"
  if (s.includes("cissp")) return "bg-rose-500"
  return "bg-violet-500"
}

/** Map a batch's start date (display string + optional ISO) to a YYYY-MM-DD
 *  string for matching against the calendar grid. */
function toIsoDate(b: TrainingBatch): string | null {
  if (b.startIsoDate) return b.startIsoDate.slice(0, 10)
  // Parse "MonthName DD" or "MonthName DD, YYYY"
  const m = b.startDate.match(/^(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/)
  if (!m) return null
  const monthName = m[1]
  const day = parseInt(m[2], 10)
  const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear()
  const monthIdx = MONTHS.findIndex(x => x === monthName)
  if (monthIdx < 0) return null
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Derive the day-of-week list (0=Sun,6=Sat) a batch runs on, from its
 *  human-readable schedule string. */
function deriveDays(schedule: string): number[] {
  const s = schedule.toLowerCase()
  const days = new Set<number>()
  // Explicit weekend markers
  if (s.includes("sat")) days.add(6)
  if (s.includes("sun")) days.add(0)
  // Weekdays - match any of Mon/Tue/Wed/Thu/Fri tokens (avoid false-positive
  // from "Saturday/Sunday" by checking weekday tokens specifically)
  if (/\bmon\b|\bmon[-,]/.test(s)) days.add(1)
  if (/\btue\b|\btue[-,]/.test(s)) days.add(2)
  if (/\bwed\b|\bwed[-,]/.test(s)) days.add(3)
  if (/\bthu\b|\bthu[-,]/.test(s)) days.add(4)
  if (/\bfri\b|\bfri[-,]/.test(s)) days.add(5)
  return Array.from(days)
}

function emptyForm(): BatchForm {
  return {
    certification: "",
    name: "",
    schedule: "",
    startDate: "",
    startIsoDate: "",
    mode: "Live Online",
    instructor: "",
    seats: 20,
    enrolled: 0,
    level: "Beginner",
    status: "Open",
    description: "",
    featured: false,
    order: 0,
    published: true,
    googleFormUrl: "",
  }
}

function formFromBatch(b: TrainingBatch): BatchForm {
  return {
    certification: b.certification,
    name: b.name,
    schedule: b.schedule,
    startDate: b.startDate,
    startIsoDate: b.startIsoDate ?? "",
    mode: b.mode,
    instructor: b.instructor,
    seats: b.seats,
    enrolled: b.enrolled,
    level: b.level,
    status: b.status,
    description: b.description,
    featured: b.featured,
    order: b.order,
    published: b.published,
    googleFormUrl: b.googleFormUrl || "",
  }
}

/** Validate the form's required fields. Returns the first error message or null. */
function validateForm(form: BatchForm): string | null {
  if (!form.certification.trim()) return "Certification is required"
  if (!form.name.trim()) return "Batch name is required"
  if (!form.schedule.trim()) return "Schedule is required"
  if (!form.startDate.trim()) return "Start date is required"
  if (!form.instructor.trim()) return "Instructor is required"
  return null
}

/* ---------------------------------------------------------------- *
 *  Component                                                        *
 * ---------------------------------------------------------------- */
export function BatchCalendarView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [view, setView] = React.useState<"month" | "week">("month")
  const [selectedBatch, setSelectedBatch] = React.useState<TrainingBatch | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editingBatch, setEditingBatch] = React.useState<TrainingBatch | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingBatch, setDeletingBatch] = React.useState<TrainingBatch | null>(null)
  const [form, setForm] = React.useState<BatchForm>(emptyForm())
  const [submitting, setSubmitting] = React.useState(false)

  /* ----------------------------- DB query ----------------------------- */
  // staleTime: 60s - repeat visits are instant (data is cached for 1 minute).
  // The first compile of the API route is unavoidably slow on Turbopack, so the
  // skeleton + spinner below gives the user immediate visual feedback.
  const { data, isLoading, isError, error, isFetching } = useQuery<{ batches: TrainingBatch[]; count: number }>({
    queryKey: ["admin-training-batches"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/admin/training-batches")
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized - please sign in as an admin")
        if (res.status === 403) throw new Error("Forbidden - admin role required")
        throw new Error("Failed to load batches")
      }
      return res.json()
    },
  })
  const batches = data?.batches ?? []

  /* ----------------------------- calendar math ----------------------------- */
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }
  function goToday() { setCurrentDate(new Date()) }

  function getBatchesForDay(day: number): TrainingBatch[] {
    const dayOfWeek = new Date(year, month, day).getDay()
    return batches.filter(b => {
      const days = deriveDays(b.schedule)
      if (!days.includes(dayOfWeek)) return false
      return b.status !== "Cancelled" && b.status !== "Completed"
    })
  }

  function getStartingBatches(day: number): TrainingBatch[] {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return batches.filter(b => toIsoDate(b) === iso)
  }

  /* ----------------------------- invalidation helper ----------------------------- */
  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["admin-training-batches"] })
    queryClient.invalidateQueries({ queryKey: ["home-training-batches"] })
    queryClient.invalidateQueries({ queryKey: ["batches-view-training-batches"] })
  }

  /* ----------------------------- create / edit / delete ----------------------------- */
  async function handleCreate() {
    const err = validateForm(form)
    if (err) { toast.error(err); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/training-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to create batch")
      }
      toast.success("Batch created successfully")
      invalidateAll()
      setCreateOpen(false)
      setForm(emptyForm())
    } catch (e: any) {
      toast.error(e.message || "Failed to create batch")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate() {
    if (!editingBatch) return
    const err = validateForm(form)
    if (err) { toast.error(err); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/training-batches/${editingBatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to update batch")
      }
      toast.success("Batch updated successfully")
      invalidateAll()
      setEditOpen(false)
      setEditingBatch(null)
    } catch (e: any) {
      toast.error(e.message || "Failed to update batch")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingBatch) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/training-batches/${deletingBatch.id}`, { method: "DELETE" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to delete batch")
      }
      toast.success("Batch deleted")
      invalidateAll()
      setDeleteOpen(false)
      setDeletingBatch(null)
      // Close the detail modal too if we were viewing this batch
      if (selectedBatch?.id === deletingBatch.id) setSelectedBatch(null)
    } catch (e: any) {
      toast.error(e.message || "Failed to delete batch")
    } finally {
      setSubmitting(false)
    }
  }

  function openCreate() {
    setForm(emptyForm())
    setCreateOpen(true)
  }

  function openEdit(b: TrainingBatch) {
    setEditingBatch(b)
    setForm(formFromBatch(b))
    setEditOpen(true)
  }

  function openDelete(b: TrainingBatch) {
    setDeletingBatch(b)
    setDeleteOpen(true)
  }

  /* ----------------------------- render ----------------------------- */
  return (
    <div className="relative min-h-screen">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-400" /> Batch Calendar
            </h1>
            {batches.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {batches.length} {batches.length === 1 ? "batch" : "batches"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-500 btn-premium">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Batch
            </Button>
            <Button size="sm" variant="outline" onClick={goToday}>Today</Button>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium min-w-[140px] text-center">{MONTHS[month]} {year}</span>
              <Button size="sm" variant="ghost" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            {/* view toggle (preserved from previous layout) */}
            <div className="hidden sm:flex items-center gap-1 border border-border/40 rounded-md p-0.5">
              {(["month", "week"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors",
                    view === v ? "bg-cyan-500/15 text-cyan-200" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* ----------------------------- loading state ----------------------------- */}
        {/* Immediate, friendly loading state - never a blank page. Shown both on
            the first load (isLoading) and on background re-fetches (isFetching). */}
        {(isLoading || isFetching) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" aria-hidden />
              <span>Loading batches...</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-24" />
              ))}
            </div>
            <Card className="p-4 overflow-hidden">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(d => (
                  <Skeleton key={d} className="h-6" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square sm:aspect-[4/3] rounded-lg" />
                ))}
              </div>
            </Card>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------- error state ----------------------------- */}
        {isError && !isLoading && (
          <Card className="p-8 text-center border-rose-500/30 bg-rose-500/5">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
              <AlertTriangle className="size-5 text-rose-300" aria-hidden />
            </div>
            <h3 className="text-base font-semibold mb-2">Couldn&apos;t load batches</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              {(error as Error)?.message || "An error occurred while fetching the batch calendar."}
            </p>
            <Button variant="outline" onClick={() => queryClient.refetchQueries({ queryKey: ["admin-training-batches"] })}>
              Retry
            </Button>
          </Card>
        )}

        {/* ----------------------------- empty state ----------------------------- */}
        {!isLoading && !isError && batches.length === 0 && (
          <Card className="p-10 text-center border-border/60">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
              <Calendar className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <h3 className="text-base font-semibold mb-2">No training batches yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Create your first certification batch to start scheduling live instructor-led training sessions.
            </p>
            <Button onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-500 btn-premium">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create your first batch
            </Button>
          </Card>
        )}

        {/* ----------------------------- main calendar (only when we have batches) ----------------------------- */}
        {!isLoading && !isError && batches.length > 0 && (
          <>
            {/* Batch legend */}
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {batches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatch(b)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className={cn("h-2.5 w-2.5 rounded", certColorClass(b.certification))} />
                  {b.certification}
                </button>
              ))}
            </div>

            {/* Calendar grid */}
            <Card className="p-4 overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square sm:aspect-[4/3] rounded-lg bg-muted/20" />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dayBatches = getBatchesForDay(day)
                  const starting = getStartingBatches(day)
                  const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
                  return (
                    <div
                      key={day}
                      className={cn(
                        "aspect-square sm:aspect-[4/3] rounded-lg border p-1 sm:p-1.5 relative cursor-pointer hover:border-violet-500/40 transition-colors",
                        isToday ? "border-violet-500 bg-violet-500/5" : "border-border/40 bg-card",
                      )}
                    >
                      <span className={cn("text-[10px] sm:text-xs", isToday ? "text-violet-300 font-bold" : "text-muted-foreground")}>{day}</span>
                      <div className="mt-1 space-y-0.5">
                        {starting.slice(0, 2).map(b => (
                          <button
                            key={`start-${b.id}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedBatch(b) }}
                            className={cn("block w-full text-left text-[8px] sm:text-[9px] px-1 py-0.5 rounded text-white font-medium truncate hover:opacity-80 transition-opacity", certColorClass(b.certification))}
                            title={`${b.name} - STARTS TODAY`}
                          >
                            ▶ {b.certification.split(" ")[0]}
                          </button>
                        ))}
                        {dayBatches.slice(0, 3 - starting.length).map(b => (
                          <button
                            key={b.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedBatch(b) }}
                            className={cn("block w-full h-1 sm:h-1.5 rounded-full hover:opacity-80 transition-opacity", certColorClass(b.certification))}
                            title={`${b.name} (${b.schedule})`}
                          />
                        ))}
                        {(starting.length + dayBatches.length) > 3 && (
                          <div className="text-[8px] text-muted-foreground">+{(starting.length + dayBatches.length) - 3}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Upcoming batches list */}
            <div className="mt-6 flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold">Upcoming Batches</h2>
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Batch
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {batches.map(b => {
                const iso = toIsoDate(b)
                const fmtDate = iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : b.startDate
                return (
                  <Card key={b.id} className="p-4 hover:border-violet-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge className={cn("text-[9px] text-white border-0 shrink-0", certColorClass(b.certification))}>
                          {b.certification.split(" ")[0]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] shrink-0",
                            b.status === "Almost Full" && "border-amber-500/40 text-amber-300 bg-amber-500/10",
                            b.status === "Full" && "border-rose-500/40 text-rose-300 bg-rose-500/10",
                            b.status === "Cancelled" && "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",
                            b.status === "Completed" && "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
                            b.status === "Open" && "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
                          )}
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{b.mode}</Badge>
                    </div>
                    <button
                      onClick={() => setSelectedBatch(b)}
                      className="block w-full text-left"
                    >
                      <h3 className="font-semibold text-sm mb-1">{b.name}</h3>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" /> {b.instructor}</div>
                        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" /> {b.schedule}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /> Starts {fmtDate}</div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 shrink-0" /> {b.enrolled} / {b.seats} enrolled
                          {!b.published && <span className="text-amber-300"> · Unpublished</span>}
                          {b.featured && <span className="text-violet-300"> · Featured</span>}
                        </div>
                      </div>
                    </button>
                    <div className="mt-3 pt-3 border-t border-border/40 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                        onClick={() => openDelete(b)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ----------------------------- batch detail modal ----------------------------- */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedBatch(null)}>
          <Card className="max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className={cn("text-xs text-white border-0", certColorClass(selectedBatch.certification))}>
                  {selectedBatch.certification}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{selectedBatch.mode}</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedBatch(null)} className="h-7 w-7 p-0">✕</Button>
            </div>
            <h2 className="text-lg font-bold mb-3">{selectedBatch.name}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4 shrink-0" /> {selectedBatch.instructor}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 shrink-0" /> {selectedBatch.schedule}</div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" /> Starts {selectedBatch.startDate}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {selectedBatch.mode === "Live Online" ? <Video className="h-4 w-4 shrink-0" /> : <MapPin className="h-4 w-4 shrink-0" />} {selectedBatch.mode}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" /> {selectedBatch.enrolled} / {selectedBatch.seats} enrolled
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{selectedBatch.level}</Badge>
                <Badge variant="outline" className="text-[10px]">{selectedBatch.status}</Badge>
                {selectedBatch.featured && <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-300">Featured</Badge>}
                {!selectedBatch.published && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">Unpublished</Badge>}
              </div>
              {selectedBatch.description && (
                <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                  {selectedBatch.description}
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border/40 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditOpen(true)
                  setEditingBatch(selectedBatch)
                  setForm(formFromBatch(selectedBatch))
                  setSelectedBatch(null)
                }}
              >
                <Pencil className="h-3 w-3 mr-1.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                onClick={() => {
                  setDeletingBatch(selectedBatch)
                  setDeleteOpen(true)
                  setSelectedBatch(null)
                }}
              >
                <Trash2 className="h-3 w-3 mr-1.5" /> Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ----------------------------- Create Batch Dialog ----------------------------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" /> Create New Batch
            </DialogTitle>
            <DialogDescription>
              Add a new live instructor-led certification batch. Color classes are auto-computed from the certification and level.
            </DialogDescription>
          </DialogHeader>
          <BatchFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-500 btn-premium">
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- Edit Batch Dialog ----------------------------- */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingBatch(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-400" /> Edit Batch
            </DialogTitle>
            <DialogDescription>
              {editingBatch ? `${editingBatch.certification} - ${editingBatch.name}` : "Update batch details."}
            </DialogDescription>
          </DialogHeader>
          <BatchFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditingBatch(null) }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting} className="bg-amber-600 hover:bg-amber-500 btn-premium">
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- Delete confirm Dialog ----------------------------- */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeletingBatch(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" /> Delete Batch
            </DialogTitle>
            <DialogDescription>
              {deletingBatch ? (
                <>Are you sure you want to delete <span className="font-semibold text-foreground">{deletingBatch.name}</span>? This action cannot be undone.</>
              ) : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletingBatch(null) }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleDelete} disabled={submitting} className="bg-rose-600 hover:bg-rose-500">
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Delete Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------------------------------------------------------- *
 *  Form fields - shared between Create + Edit dialogs              *
 * ---------------------------------------------------------------- */
function BatchFormFields({
  form,
  setForm,
}: {
  form: BatchForm
  setForm: React.Dispatch<React.SetStateAction<BatchForm>>
}) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <Label className="text-xs">Certification *</Label>
        <Input
          value={form.certification}
          onChange={(e) => setForm({ ...form, certification: e.target.value })}
          placeholder="e.g. CompTIA Security+, CEH, CCNA, CISSP"
        />
      </div>
      <div>
        <Label className="text-xs">Batch Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Security+ Weekend Batch"
        />
      </div>
      <div>
        <Label className="text-xs">Schedule *</Label>
        <Input
          value={form.schedule}
          onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          placeholder="e.g. Sat + Sun, 7:00 PM-9:00 PM IST"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Start Date (display) *</Label>
          <Input
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            placeholder="e.g. October 12"
          />
        </div>
        <div>
          <Label className="text-xs">Start Date (ISO)</Label>
          <Input
            type="date"
            value={form.startIsoDate}
            onChange={(e) => setForm({ ...form, startIsoDate: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Delivery Mode</Label>
          <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Live Online">Live Online</SelectItem>
              <SelectItem value="On-Campus">On-Campus</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Level</Label>
          <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Instructor *</Label>
        <Input
          value={form.instructor}
          onChange={(e) => setForm({ ...form, instructor: e.target.value })}
          placeholder="e.g. Dr. Sarah Chen"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Seats</Label>
          <Input
            type="number"
            min={1}
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Enrolled</Label>
          <Input
            type="number"
            min={0}
            value={form.enrolled}
            onChange={(e) => setForm({ ...form, enrolled: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Order</Label>
          <Input
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Almost Full">Almost Full</SelectItem>
            <SelectItem value="Full">Full</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional longer description of the batch curriculum."
          rows={3}
        />
      </div>
      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={form.featured}
            onCheckedChange={(v) => setForm({ ...form, featured: v === true })}
          />
          <span className="text-xs">Featured on homepage</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={form.published}
            onCheckedChange={(v) => setForm({ ...form, published: v === true })}
          />
          <span className="text-xs">Published</span>
        </label>
      </div>

      {/* Google Form URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Google Form URL (optional)</label>
        <Input
          value={form.googleFormUrl}
          onChange={(e) => setForm({ ...form, googleFormUrl: e.target.value })}
          placeholder="https://forms.gle/..."
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Paste the Google Form URL for this batch's enrollment. Users will see an "Enroll" button linking to this form.
        </p>
      </div>
    </div>
  )
}
