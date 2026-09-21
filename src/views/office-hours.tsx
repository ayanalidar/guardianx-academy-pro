"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  User,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import {
  ScrollReveal, CursorGlow, Stagger, StaggerItem, Counter, FadeIn,
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

function ModeIcon({
  mode,
  className,
}: {
  mode: SlotMode
  className?: string
}) {
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
  if (mode === "video") return { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", glow: "bg-cyan-500/8", dot: "bg-cyan-400" }
  if (mode === "in-person") return { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "bg-amber-500/8", dot: "bg-amber-400" }
  return { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "bg-emerald-500/8", dot: "bg-emerald-400" }
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

/* ------------------------------------------------------------------ */
/* Main View                                                          */
/* ------------------------------------------------------------------ */

export function OfficeHoursView() {
  const [tab, setTab] = React.useState<"available" | "mine">("available")

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 left-0 w-[400px] h-[300px] bg-amber-500/4 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized editorial
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
              1:1 INSTRUCTOR ACCESS · BOOK A SLOT
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            Office <span className="text-gradient-premium">hours.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <p className="text-muted-foreground max-w-xl mb-12 text-sm leading-relaxed">
            Reserve focused, individual time with your instructors.
            Choose video, in-person, or chat - come prepared, leave with clarity.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "available" | "mine")}>
            <TabsList className="bg-card/30 backdrop-blur border border-border/60 h-auto p-1 grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="available" className="py-2 gap-1.5 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200">
                <Calendar className="h-3.5 w-3.5" /> Available Slots
              </TabsTrigger>
              <TabsTrigger value="mine" className="py-2 gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-200">
                <CalendarClock className="h-3.5 w-3.5" /> My Bookings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="mt-8">
              <AvailableSlotsTab />
            </TabsContent>
            <TabsContent value="mine" className="mt-8">
              <MyBookingsTab />
            </TabsContent>
          </Tabs>
        </ScrollReveal>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Available Slots Tab                                                */
/* ------------------------------------------------------------------ */

function AvailableSlotsTab() {
  const [bookSlot, setBookSlot] = React.useState<OfficeHourSlot | null>(null)

  const { data, isLoading } = useQuery<{ slots: OfficeHourSlot[] }>({
    queryKey: ["office-hours-available"],
    queryFn: () => api("/api/office-hours/available"),
    refetchInterval: 30000,
  })

  const slots = data?.slots ?? []

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <EmptySlotsState />
      ) : (
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.06}>
          {slots.map((s) => (
            <StaggerItem key={s.id}>
              <SlotCard slot={s} onBook={() => setBookSlot(s)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <BookSlotDialog
        slot={bookSlot}
        onClose={() => setBookSlot(null)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptySlotsState() {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
            <CalendarClock className="h-7 w-7 text-violet-300" />
          </div>
          <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">No upcoming office hours</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your instructors haven&apos;t opened any slots yet. Check back soon - slots appear here in real time.
          </p>
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
    <CursorGlow className="group h-full" color={`oklch(${slot.mode === "video" ? "0.65 0.12 200" : slot.mode === "in-person" ? "0.7 0.15 85" : "0.7 0.15 155"} / 0.06)`}>
      <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 flex flex-col hover:-translate-y-1 transition-all duration-300 hover:border-violet-500/30">
        {/* Top accent line based on mode */}
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
            <div className="font-semibold text-sm truncate group-hover:text-violet-200 transition-colors">{slot.instructor.name}</div>
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

        {/* Mode + location */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            variant="outline"
            className={cn("gap-1", color.text, color.bg, color.border, "border")}
          >
            <ModeIcon mode={slot.mode} className="h-3 w-3" /> {modeLabel(slot.mode)}
          </Badge>
          {slot.location && (
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

  React.useEffect(() => {
    if (slot) {
      setTopic("")
      setNotes("")
    }
  }, [slot])

  const bookMutation = useMutation({
    mutationFn: (body: { topic: string; notes: string }) =>
      api(`/api/office-hours/${slot?.id}/book`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Slot booked!", {
        description: "Check your email for the meeting details.",
      })
      qc.invalidateQueries({ queryKey: ["office-hours-available"] })
      qc.invalidateQueries({ queryKey: ["my-office-hour-bookings"] })
      onClose()
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
            <CalendarClock className="h-5 w-5 text-violet-300" /> Book Office Hours
          </DialogTitle>
          <DialogDescription>
            Confirm your booking with{" "}
            <span className="font-medium text-foreground">
              {slot?.instructor.name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {!slot || !start || !end || !color ? null : (
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
                {slot.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{slot.location}</span>
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
              <Label htmlFor="book-notes">Notes</Label>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* My Bookings Tab                                                    */
/* ------------------------------------------------------------------ */

function MyBookingsTab() {
  const { data, isLoading } = useQuery<{ bookings: OfficeHourBooking[] }>({
    queryKey: ["my-office-hour-bookings"],
    queryFn: () => api("/api/office-hours/my-bookings"),
    refetchInterval: 30000,
  })

  const bookings = data?.bookings ?? []

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 mb-6">
                <CalendarClock className="h-7 w-7 text-emerald-300" />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">No upcoming bookings</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Browse the Available Slots tab to book office hours with your instructors.
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
    </div>
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
              <div className="font-semibold text-sm truncate group-hover:text-violet-200 transition-colors">{slot.instructor.name}</div>
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
                description: "Reply to your booking confirmation email or message the instructor directly.",
              })
            }
          >
            <User className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    </CursorGlow>
  )
}
