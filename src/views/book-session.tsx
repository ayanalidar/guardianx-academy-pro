"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  CalendarClock,
  Video,
  MapPin,
  MessageCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  GraduationCap,
  Radio,
} from "lucide-react"
import { toast } from "sonner"
import {
  ScrollReveal,
  CursorGlow,
  Stagger,
  StaggerItem,
  Counter,
  FadeIn,
  TextReveal,
  MagneticButton,
} from "@/components/platform/motion-system"

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface UserRef {
  id: string
  name: string
  avatar: string | null
  title: string | null
  bio?: string | null
}

interface CourseRef {
  id: string
  title: string
  shortName: string
  color: string
}

type SlotMode = "video" | "in-person" | "chat"

interface OfficeHourSlot {
  id: string
  startAt: string
  endAt: string
  mode: SlotMode
  location: string
  maxBookings: number
  courseId: string | null
  course: CourseRef | null
  instructor: UserRef
  bookedCount: number
  isFull: boolean
  myBooking: { id: string } | null
}

interface OfficeHourBooking {
  id: string
  topic: string
  notes: string
  status: string
  createdAt: string
  slot: {
    id: string
    startAt: string
    endAt: string
    mode: SlotMode
    location: string
    maxBookings: number
    course: CourseRef | null
    instructor: UserRef
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function ModeIcon({ mode, className }: { mode: SlotMode; className?: string }) {
  if (mode === "video") return <Video className={className} />
  if (mode === "in-person") return <MapPin className={className} />
  return <MessageCircle className={className} />
}

function modeLabel(mode: SlotMode) {
  if (mode === "video") return "Video"
  if (mode === "in-person") return "In-Person"
  return "Chat"
}

function modeColor(mode: SlotMode) {
  if (mode === "video")
    return {
      text: "text-cyan-300",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      dot: "bg-cyan-400",
    }
  if (mode === "in-person")
    return {
      text: "text-amber-300",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      dot: "bg-amber-400",
    }
  return {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/** Group slots by calendar day for a horizontal "calendar" view. */
function groupSlotsByDay(slots: OfficeHourSlot[]): { label: string; slots: OfficeHourSlot[] }[] {
  const groups = new Map<string, OfficeHourSlot[]>()
  for (const s of slots) {
    const d = new Date(s.startAt)
    const key = d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, slots: items }))
}

/* ------------------------------------------------------------------ */
/* Hero perks (premium dark-tech)                                     */
/* ------------------------------------------------------------------ */

const PERKS = [
  {
    icon: ShieldCheck,
    title: "Veteran instructors",
    desc: "Book time with practitioners who've shipped security work at scale.",
    tint: "text-violet-300",
    tintBg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    icon: Zap,
    title: "Instant confirmation",
    desc: "Your slot locks in the moment you click. No back-and-forth email threads.",
    tint: "text-amber-300",
    tintBg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    icon: Radio,
    title: "Video · In-person · Chat",
    desc: "Pick the format that fits the question - camera-on or quick text.",
    tint: "text-cyan-300",
    tintBg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    icon: GraduationCap,
    title: "Course-aware",
    desc: "Slots tagged to a course jump straight into the material you're stuck on.",
    tint: "text-emerald-300",
    tintBg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
] as const

/* ------------------------------------------------------------------ */
/* Main View                                                          */
/* ------------------------------------------------------------------ */

export function BookSessionView() {
  const { navigate } = useAppStore()
  const { user } = useUser()

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[600px] h-[500px] bg-violet-600/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-amber-500/4 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* ====================================================
            HERO
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.3em]">
              1:1 LIVE SESSIONS · INSTRUCTOR ACCESS
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-5 text-balance">
            <TextReveal text="Book a Live Session with a" />{" "}
            <span className="text-gradient-premium">
              <TextReveal text="GuardianX Instructor." delay={0.15} />
            </span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <p className="text-muted-foreground max-w-2xl mb-10 text-base lg:text-lg leading-relaxed">
            Real-time help when you need it most. Reserve focused, individual time
            with a GuardianX instructor - bring your questions, your code, or your
            lab walkthrough, and leave with clarity.
          </p>
        </ScrollReveal>

        {/* Hero perks row */}
        <ScrollReveal delay={0.2}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {PERKS.map((p) => (
              <div
                key={p.title}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-card/20 backdrop-blur p-5 transition-colors hover:bg-card/30",
                  p.border
                )}
              >
                <div className={cn("inline-flex p-2 rounded-lg mb-3", p.tintBg)}>
                  <p.icon className={cn("h-5 w-5", p.tint)} />
                </div>
                <h3 className="text-sm font-semibold mb-1 tracking-tight">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ====================================================
            AVAILABLE SLOTS - calendar grouped
            ==================================================== */}
        <AvailableSlotsSection />

        {/* ====================================================
            MY BOOKINGS (only if authenticated)
            ==================================================== */}
        {user && <MyBookingsSection />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Available Slots Section                                            */
/* ------------------------------------------------------------------ */

function AvailableSlotsSection() {
  const { navigate } = useAppStore()
  const { user } = useUser()
  const [bookSlot, setBookSlot] = React.useState<OfficeHourSlot | null>(null)
  const [filterMode, setFilterMode] = React.useState<"all" | SlotMode>("all")

  const { data, isLoading } = useQuery<{ slots: OfficeHourSlot[] }>({
    queryKey: ["office-hours-available"],
    queryFn: () => api("/api/office-hours/available"),
    refetchInterval: 30000,
  })

  const slots = (data?.slots ?? []).filter(
    (s) => filterMode === "all" || s.mode === filterMode
  )
  const dayGroups = groupSlotsByDay(slots)
  const totalCount = data?.slots?.length ?? 0

  return (
    <section className="mb-20">
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-4 border-b border-border/60">
          <div>
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">
              01 - UPCOMING SLOTS
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Pick a time that works for you
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
              {totalCount} SLOT{totalCount !== 1 ? "S" : ""} OPEN
            </span>
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border/60 bg-card/30 p-0.5">
              {(["all", "video", "in-person", "chat"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={cn(
                    "px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] rounded-md transition-colors",
                    filterMode === m
                      ? "bg-violet-500/15 text-violet-200"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "all" ? "All" : m === "in-person" ? "In-Person" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {!user && (
        <ScrollReveal delay={0.05}>
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] p-6 lg:p-8 mb-8">
            <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
              <div className="inline-flex p-3 rounded-xl border border-violet-500/30 bg-violet-500/10 shrink-0">
                <ShieldCheck className="h-6 w-6 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1 tracking-tight">
                  Sign in to book a session
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Browse the slots below to find a time that works for you, then sign
                  in to confirm your booking with the instructor.
                </p>
              </div>
              <MagneticButton strength={0.3}>
                <Button
                  onClick={() => navigate({ name: "login" })}
                  className="bg-violet-600 hover:bg-violet-500 btn-premium px-5"
                >
                  Sign In to Book <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </MagneticButton>
            </div>
          </div>
        </ScrollReveal>
      )}

      {isLoading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-7 w-56" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-64 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : slots.length === 0 ? (
        <EmptySlotsState hasFilter={filterMode !== "all"} onReset={() => setFilterMode("all")} />
      ) : (
        <div className="space-y-10">
          {dayGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <ScrollReveal>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-violet-300" />
                  <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                    {group.slots.length} SLOT{group.slots.length !== 1 ? "S" : ""}
                  </span>
                </div>
              </ScrollReveal>
              <Stagger
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                staggerChildren={0.06}
              >
                {group.slots.map((s) => (
                  <StaggerItem key={s.id}>
                    <SlotCard
                      slot={s}
                      onBook={() => {
                        if (!user) {
                          navigate({ name: "login" })
                          return
                        }
                        setBookSlot(s)
                      }}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ))}
        </div>
      )}

      <BookSlotDialog slot={bookSlot} onClose={() => setBookSlot(null)} />
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptySlotsState({
  hasFilter,
  onReset,
}: {
  hasFilter: boolean
  onReset: () => void
}) {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
            <CalendarClock className="h-7 w-7 text-violet-300" />
          </div>
          <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">
            {hasFilter ? "No slots match this filter" : "No upcoming sessions"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {hasFilter
              ? "Try a different mode or clear the filter to see all available sessions."
              : "Our instructors haven't opened any slots yet. Check back soon - new sessions appear here in real time."}
          </p>
          {hasFilter && (
            <Button variant="outline" onClick={onReset} className="btn-premium">
              Clear Filter
            </Button>
          )}
        </div>
      </div>
    </FadeIn>
  )
}

/* ------------------------------------------------------------------ */
/* Slot Card - premium                                                */
/* ------------------------------------------------------------------ */

function SlotCard({
  slot,
  onBook,
}: {
  slot: OfficeHourSlot
  onBook: () => void
}) {
  const color = modeColor(slot.mode)
  const start = formatDateTime(slot.startAt)
  const end = formatDateTime(slot.endAt)
  const capacityPct = slot.maxBookings
    ? Math.min(100, Math.round((slot.bookedCount / slot.maxBookings) * 100))
    : 0
  const isBookedByMe = !!slot.myBooking
  const isPast = new Date(slot.endAt).getTime() <= Date.now()

  return (
    <CursorGlow
      className="group h-full"
      color={`oklch(${slot.mode === "video" ? "0.65 0.12 200" : slot.mode === "in-person" ? "0.7 0.15 85" : "0.7 0.15 155"} / 0.06)`}
    >
      <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 flex flex-col hover:-translate-y-1 transition-all duration-300 hover:border-violet-500/30">
        <div className={cn("absolute top-0 left-0 right-0 h-px bg-gradient-to-r to-transparent", color.dot, "via-50")} />

        {/* Instructor */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-11 w-11 border border-border/60">
            {slot.instructor.avatar ? (
              <AvatarImage src={slot.instructor.avatar} alt={slot.instructor.name} />
            ) : null}
            <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs font-medium">
              {initialsOf(slot.instructor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate group-hover:text-violet-200 transition-colors">
              {slot.instructor.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {slot.instructor.title || "Instructor"}
            </div>
          </div>
          {slot.course && (
            <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-violet-500/30 text-violet-300">
              {slot.course.shortName}
            </Badge>
          )}
        </div>

        {/* Date / time */}
        <div className="space-y-1.5 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{start.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              {start.time}-{end.time}
              <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                ({formatDuration(slot.startAt, slot.endAt)})
              </span>
            </span>
          </div>
        </div>

        {/* Mode */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            variant="outline"
            className={cn("gap-1", color.text, color.bg, color.border, "border")}
          >
            <ModeIcon mode={slot.mode} className="h-3 w-3" /> {modeLabel(slot.mode)}
          </Badge>
          {slot.location && (slot.mode === "in-person" || isBookedByMe) && (
            <Badge variant="secondary" className="text-[10px] gap-1 bg-muted/40 border border-border/40">
              <MapPin className="h-2.5 w-2.5" />
              <span className="max-w-[120px] truncate">{slot.location}</span>
            </Badge>
          )}
        </div>

        {/* Capacity */}
        <div className="space-y-1.5 mb-4 mt-auto">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-mono">
              <Counter value={slot.bookedCount} />/{slot.maxBookings}
            </span>
          </div>
          <Progress value={capacityPct} className="h-1.5" />
        </div>

        {/* Action */}
        {isBookedByMe ? (
          <Button variant="secondary" disabled className="w-full gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4" /> Booked
          </Button>
        ) : isPast ? (
          <Button variant="ghost" disabled className="w-full">Session ended</Button>
        ) : slot.isFull ? (
          <Button variant="ghost" disabled className="w-full">Fully booked</Button>
        ) : (
          <Button onClick={onBook} className="w-full gap-1.5 bg-violet-600 hover:bg-violet-500 btn-premium">
            <Sparkles className="h-4 w-4" /> Book Slot
          </Button>
        )}
      </div>
    </CursorGlow>
  )
}

/* ------------------------------------------------------------------ */
/* Book Slot Dialog                                                   */
/* ------------------------------------------------------------------ */

function BookSlotDialog({
  slot,
  onClose,
}: {
  slot: OfficeHourSlot | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [topic, setTopic] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [confirmed, setConfirmed] = React.useState<OfficeHourBooking | null>(null)

  React.useEffect(() => {
    if (slot) {
      setTopic("")
      setNotes("")
      setConfirmed(null)
    }
  }, [slot])

  const bookMutation = useMutation({
    mutationFn: (body: { topic: string; notes: string }) =>
      api(`/api/office-hours/${slot?.id}/book`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data: { booking: OfficeHourBooking }) => {
      toast.success("Session booked!", {
        description: "Check your email for the meeting details.",
      })
      setConfirmed(data.booking)
      qc.invalidateQueries({ queryKey: ["office-hours-available"] })
      qc.invalidateQueries({ queryKey: ["my-office-hour-bookings"] })
    },
    onError: (e: Error) => toast.error("Could not book slot", { description: e.message }),
  })

  const start = slot ? formatDateTime(slot.startAt) : null
  const end = slot ? formatDateTime(slot.endAt) : null
  const color = slot ? modeColor(slot.mode) : null

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarClock className="h-5 w-5 text-violet-300" />
            {confirmed ? "Session confirmed" : "Book this session"}
          </DialogTitle>
          <DialogDescription>
            {confirmed
              ? "Your booking is locked in. A confirmation email is on its way."
              : "Confirm your booking with a GuardianX instructor."}
          </DialogDescription>
        </DialogHeader>

        {!slot || !start || !end || !color ? null : confirmed ? (
          <div className="space-y-4 py-2">
            <div className={cn("rounded-xl border p-4 space-y-2.5", color.border, color.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ModeIcon mode={slot.mode} className={cn("h-4 w-4", color.text)} />
                  {modeLabel(slot.mode)} session
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
                </Badge>
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {start.date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {start.time}-{end.time}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {slot.instructor.name}
                  {slot.instructor.title ? (
                    <span className="text-muted-foreground/80">· {slot.instructor.title}</span>
                  ) : null}
                </div>
              </div>
            </div>
            {(topic || notes) && (
              <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-xs space-y-1.5">
                {topic && (
                  <div>
                    <span className="text-muted-foreground">Topic: </span>
                    <span className="font-medium">{topic}</span>
                  </div>
                )}
                {notes && (
                  <div>
                    <span className="text-muted-foreground">Notes: </span>
                    <span>{notes}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We&apos;ve emailed you and the instructor with the meeting details. You
              can review this booking anytime under “My Bookings”.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className={cn("rounded-xl border p-4 space-y-2", color.border, color.bg)}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <ModeIcon mode={slot.mode} className={cn("h-4 w-4", color.text)} />
                {modeLabel(slot.mode)} session
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {start.date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {start.time}-{end.time}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {slot.instructor.name}
                  {slot.instructor.title ? (
                    <span className="text-muted-foreground/80">· {slot.instructor.title}</span>
                  ) : null}
                </div>
                {slot.course && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                    <span>{slot.course.shortName} - {slot.course.title}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="book-topic">Topic</Label>
              <Input
                id="book-topic"
                placeholder="e.g. Need help with subnetting"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={200}
                className="bg-background/50"
              />
              <p className="text-[10px] text-muted-foreground">
                Optional - gives your instructor a heads-up.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="book-notes">Message</Label>
              <Textarea
                id="book-notes"
                placeholder="Anything specific you want to cover?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] bg-background/50 resize-none"
                maxLength={2000}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {confirmed ? (
            <DialogClose asChild>
              <Button className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5">
                Done <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button
                disabled={bookMutation.isPending || !slot}
                onClick={() =>
                  bookMutation.mutate({ topic: topic.trim(), notes: notes.trim() })
                }
                className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
              >
                {bookMutation.isPending ? "Booking…" : "Confirm Booking"}
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* My Bookings Section                                                */
/* ------------------------------------------------------------------ */

function MyBookingsSection() {
  const { data, isLoading } = useQuery<{ bookings: OfficeHourBooking[] }>({
    queryKey: ["my-office-hour-bookings"],
    queryFn: () => api("/api/office-hours/my-bookings"),
    refetchInterval: 30000,
  })

  const bookings = data?.bookings ?? []

  return (
    <section>
      <ScrollReveal>
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-border/60">
          <div>
            <p className="text-[10px] font-mono text-emerald-400 tracking-[0.3em] mb-1">
              02 - YOUR BOOKINGS
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
              My Bookings
            </h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
            {bookings.length} UPCOMING
          </span>
        </div>
      </ScrollReveal>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-12 text-center">
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 mb-5">
                <CalendarClock className="h-7 w-7 text-emerald-300" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-[-0.02em]">No upcoming bookings</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Pick a slot above to book a live session with a GuardianX instructor.
              </p>
            </div>
          </div>
        </FadeIn>
      ) : (
        <Stagger className="space-y-3" staggerChildren={0.06}>
          {bookings.map((b) => (
            <StaggerItem key={b.id}>
              <BookingCard booking={b} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Booking Card                                                       */
/* ------------------------------------------------------------------ */

function BookingCard({ booking }: { booking: OfficeHourBooking }) {
  const slot = booking.slot
  const color = modeColor(slot.mode)
  const start = formatDateTime(slot.startAt)
  const end = formatDateTime(slot.endAt)

  const statusBadge = (() => {
    switch (booking.status) {
      case "booked":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
            Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="h-3 w-3 mr-1" /> Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{booking.status}</Badge>
    }
  })()

  return (
    <CursorGlow className="group" color="oklch(0.6 0.2 295 / 0.05)">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 hover:border-violet-500/30 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Instructor avatar */}
          <div className="flex items-center gap-3 shrink-0 sm:w-56">
            <Avatar className="h-11 w-11 border border-border/60">
              {slot.instructor.avatar ? (
                <AvatarImage src={slot.instructor.avatar} alt={slot.instructor.name} />
              ) : null}
              <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs font-medium">
                {initialsOf(slot.instructor.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate group-hover:text-violet-200 transition-colors">
                {slot.instructor.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {slot.instructor.title || "Instructor"}
              </div>
            </div>
          </div>

          {/* Time + mode */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-medium text-sm">{start.date}</span>
              <span className="text-sm text-muted-foreground font-mono">
                {start.time}-{end.time}
              </span>
              <Badge
                variant="outline"
                className={cn("gap-1 text-[10px]", color.text, color.bg, color.border, "border")}
              >
                <ModeIcon mode={slot.mode} className="h-2.5 w-2.5" /> {modeLabel(slot.mode)}
              </Badge>
              {slot.course && (
                <Badge variant="outline" className="font-mono text-[10px] border-violet-500/30 text-violet-300">
                  {slot.course.shortName}
                </Badge>
              )}
              {statusBadge}
            </div>
            {booking.topic && (
              <div className="text-sm text-muted-foreground mb-1">
                <span className="text-muted-foreground/80">Topic:</span>{" "}
                <span className="text-foreground">{booking.topic}</span>
              </div>
            )}
            {booking.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{booking.notes}</p>
            )}
            {slot.location && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{slot.location}</span>
              </div>
            )}
          </div>

          {/* Cancel */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs shrink-0 hover:bg-rose-500/10 hover:text-rose-300"
            onClick={() =>
              toast.info("Contact instructor to cancel", {
                description:
                  "Reply to your booking confirmation email or message the instructor directly.",
              })
            }
          >
            <AlertCircle className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    </CursorGlow>
  )
}
