"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  CalendarClock,
  Plus,
  Trash2,
  Video,
  MapPin,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Save,
  CheckCircle2,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================
interface InstructorCourse {
  id: string
  title: string
  shortName: string
  color: string
}

interface SlotBooking {
  id: string
  status: string
  topic: string
  notes: string
  createdAt: string
  student: {
    id: string
    name: string
    avatar: string | null
    title: string | null
    email: string
  }
}

interface OfficeHourSlot {
  id: string
  startAt: string
  endAt: string
  mode: "video" | "in-person" | "chat"
  location: string
  maxBookings: number
  courseId: string | null
  course: { id: string; title: string; shortName: string; color: string } | null
  createdAt: string
  bookingsCount: number
  bookings: SlotBooking[]
}

// ============================================================================
// Helpers
// ============================================================================
const MODE_OPTIONS = [
  { value: "video", label: "Video Call", icon: Video, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { value: "in-person", label: "In Person", icon: MapPin, color: "text-amber-400", bg: "bg-amber-500/10" },
  { value: "chat", label: "Chat", icon: MessageSquare, color: "text-violet-400", bg: "bg-violet-500/10" },
]

function modeMeta(mode: string) {
  return MODE_OPTIONS.find((m) => m.value === mode) ?? MODE_OPTIONS[0]
}

function toLocalDateTimeInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatTimeRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "-"
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  const durMin = Math.round((e.getTime() - s.getTime()) / 60000)
  const dur = durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin}m`
  return `${fmt(s)}-${fmt(e)} (${dur})`
}

// ============================================================================
// Main Tab
// ============================================================================
export function InstructorOfficeHoursTab() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ slots: OfficeHourSlot[] }>({
    queryKey: ["instructor", "office-hours"],
    queryFn: () => api("/api/instructor/office-hours"),
    refetchInterval: 30000,
  })
  const slots = data?.slots ?? []

  const stats = React.useMemo(() => {
    const now = Date.now()
    const upcoming = slots.filter((s) => new Date(s.startAt).getTime() >= now).length
    const totalBookings = slots.reduce((a, s) => a + s.bookingsCount, 0)
    return { total: slots.length, upcoming, totalBookings }
  }, [slots])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-400" />
            Office Hours
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Schedule availability windows for student 1:1 bookings.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Slot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Slots" value={stats.total} icon={CalendarClock} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} color="text-cyan-400" bg="bg-cyan-500/10" />
        <StatCard label="Total Bookings" value={stats.totalBookings} icon={Users} color="text-amber-400" bg="bg-amber-500/10" />
      </div>

      {/* Slots */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : slots.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No office hours scheduled"
          description="Create a slot to let students book time with you."
        />
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {createOpen && (
        <CreateSlotDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["instructor", "office-hours"] })
            setCreateOpen(false)
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}) {
  return (
    <Card className="p-4 relative overflow-hidden card-hover">
      <div className={cn("absolute -right-3 -top-3 h-16 w-16 rounded-full blur-2xl opacity-50", bg)} />
      <div className="relative z-10">
        <div className={cn("inline-flex p-1.5 rounded-md mb-2", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="text-2xl font-bold tabular-nums font-mono">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </Card>
  )
}

// ============================================================================
// Slot Card
// ============================================================================
function SlotCard({ slot }: { slot: OfficeHourSlot }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const meta = modeMeta(slot.mode)
  const ModeIcon = meta.icon
  const capacityPct = slot.maxBookings > 0 ? (slot.bookingsCount / slot.maxBookings) * 100 : 0
  const isPast = new Date(slot.endAt).getTime() < Date.now()
  const activeBookings = slot.bookings.filter((b) => b.status !== "cancelled")

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/instructor/office-hours/${slot.id}`, { method: "DELETE" }),
    onSuccess: (r: any) => {
      const cancelled = r?.cancelledBookings ?? 0
      toast.success(
        cancelled > 0
          ? `Slot deleted - ${cancelled} booking${cancelled !== 1 ? "s" : ""} cancelled`
          : "Slot deleted"
      )
      qc.invalidateQueries({ queryKey: ["instructor", "office-hours"] })
      setDeleteOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className={cn("p-4 card-hover", isPast && "opacity-70")}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px]", meta.bg, meta.color, "border-current/20")}>
              <ModeIcon className="h-3 w-3 mr-1" /> {meta.label}
            </Badge>
            {slot.course && (
              <Badge variant="outline" className="text-[10px] bg-muted/30">
                {slot.course.shortName}
              </Badge>
            )}
            {isPast && (
              <Badge variant="outline" className="text-[10px] bg-muted/30 text-muted-foreground">
                Past
              </Badge>
            )}
          </div>
          <div>
            <div className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              {formatDateTime(slot.startAt)}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeRange(slot.startAt, slot.endAt)}
            </div>
          </div>
          {slot.location && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-mono">{slot.location}</span>
            </div>
          )}

          {/* Capacity bar */}
          <div className="space-y-1 max-w-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Capacity</span>
              <span className={cn("font-mono", capacityPct >= 100 ? "text-rose-400" : "text-emerald-400")}>
                {slot.bookingsCount} / {slot.maxBookings}
              </span>
            </div>
            <Progress
              value={capacityPct}
              className={cn("h-1.5", capacityPct >= 100 && "[&>div]:bg-rose-500")}
            />
          </div>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-1.5 shrink-0">
          {activeBookings.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              {activeBookings.length} booking{activeBookings.length !== 1 ? "s" : ""}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)} className="text-rose-400 hover:text-rose-300">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Bookings list */}
      {expanded && activeBookings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Booked Students</div>
          {activeBookings.map((b) => {
            const initials = b.student.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
            return (
              <div key={b.id} className="flex items-start gap-3 p-2 rounded-md bg-muted/20">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{b.student.name}</div>
                  {b.topic && (
                    <div className="text-xs text-foreground/80 mt-0.5">
                      <span className="text-muted-foreground">Topic: </span>{b.topic}
                    </div>
                  )}
                  {b.notes && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      <span className="font-medium">Notes: </span>{b.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this office hours slot?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeBookings.length > 0
                ? `This will cancel ${activeBookings.length} active booking${activeBookings.length !== 1 ? "s" : ""} and notify the affected student${activeBookings.length !== 1 ? "s" : ""}.`
                : "This slot has no active bookings."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-rose-500 hover:bg-rose-600 text-white"
              disabled={deleteMutation.isPending}
            >
              Delete Slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================================
// Create Slot Dialog
// ============================================================================
function CreateSlotDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const [startAt, setStartAt] = React.useState("")
  const [endAt, setEndAt] = React.useState("")
  const [mode, setMode] = React.useState("video")
  const [location, setLocation] = React.useState("")
  const [maxBookings, setMaxBookings] = React.useState(1)
  const [courseId, setCourseId] = React.useState("")
  const [courses, setCourses] = React.useState<InstructorCourse[]>([])

  React.useEffect(() => {
    if (open) {
      api("/api/instructor/courses").then((r: any) => setCourses(r.courses ?? [])).catch(() => setCourses([]))
    }
  }, [open])

  const createMutation = useMutation({
    mutationFn: () =>
      api("/api/instructor/office-hours", {
        method: "POST",
        body: JSON.stringify({
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          mode,
          location,
          maxBookings: Number(maxBookings),
          courseId: courseId || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Office hours slot created")
      onCreated()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startAt || !endAt) {
      toast.error("Start and end times are required")
      return
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      toast.error("End time must be after start time")
      return
    }
    createMutation.mutate()
  }

  // Default location placeholder based on mode
  const locationPlaceholder = mode === "video"
    ? "https://meet.guardianx.academy/..."
    : mode === "in-person"
    ? "Room 4B, Lab Building"
    : "Discord / Slack channel"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-400" />
            Create Office Hours Slot
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oh-start">Start *</Label>
              <Input
                id="oh-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-end">End *</Label>
              <Input
                id="oh-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oh-mode">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="oh-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-1.5">
                        <m.icon className={cn("h-3.5 w-3.5", m.color)} />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-max">Max Bookings</Label>
              <Input
                id="oh-max"
                type="number"
                min={1}
                max={50}
                value={maxBookings}
                onChange={(e) => setMaxBookings(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oh-loc">Location / Meeting Link</Label>
            <Input
              id="oh-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={locationPlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oh-course">Linked Course (optional)</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="oh-course">
                <SelectValue placeholder="No specific course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">- None -</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.shortName || c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={createMutation.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              Create Slot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Empty State
// ============================================================================
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card className="p-8 text-center border-dashed">
      <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-emerald-400" />
      </div>
      <p className="font-medium mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
    </Card>
  )
}
