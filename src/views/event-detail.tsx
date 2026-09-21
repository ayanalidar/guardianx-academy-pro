"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Users, Video,
  Trophy, Mic, FlaskConical, School, Sparkles, User, Mail,
  ShieldCheck, Tag, CheckCircle2, CalendarPlus, Loader2, LogIn,
} from "lucide-react"

/* ============================================================
   /event/<slug> - public event detail (master-prompt §36)
   ============================================================ */

interface EventDetail {
  id: string
  slug: string
  title: string
  description: string
  longDescription: string
  type: string
  category: string
  startDate: string
  endDate: string
  time: string
  venue: string
  mode: string
  organizer: string
  instructor?: string | null
  capacity: number
  registered: number
  fee: string
  status: string
  tags: string
  featured: boolean
  startIsoDate?: string | null
}

interface RegisterResponse {
  success: boolean
  message?: string
  registered?: number
  alreadyRegistered?: boolean
  soldOut?: boolean
}

const TYPE_ACCENTS: Record<string, { tint: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  workshop: { tint: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30", icon: FlaskConical },
  webinar: { tint: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30", icon: Mic },
  ctf: { tint: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30", icon: Trophy },
  campus: { tint: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30", icon: School },
  awareness: { tint: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30", icon: ShieldCheck },
  corporate: { tint: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", icon: Users },
  bootcamp: { tint: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", icon: Sparkles },
}

export function EventDetailView() {
  const { view, navigate } = useAppStore()
  const slug = view.name === "event-detail" ? view.eventSlug : ""

  const { data, isLoading, isError } = useQuery<{ event: EventDetail | null; related: EventDetail[] }>({
    queryKey: ["public-event", slug],
    queryFn: async () => {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`)
      if (!res.ok) return { event: null, related: [] }
      return res.json()
    },
    enabled: !!slug,
    staleTime: 60_000,
  })

  const event = data?.event ?? null
  const related = data?.related ?? []
  const accent = event ? (TYPE_ACCENTS[event.type] ?? TYPE_ACCENTS.workshop!) : TYPE_ACCENTS.workshop

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      {/* Back nav */}
      <section className="relative pt-4 pb-2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: "events" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            All events
          </Button>
        </div>
      </section>

      {/* HERO */}
      <section className="relative py-6 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card animate-pulse h-80" />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
              <p className="text-sm text-rose-300">Failed to load event.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate({ name: "events" })}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to all events
              </Button>
            </div>
          ) : !event ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
              <Calendar className="h-10 w-10 text-amber-300/60 mx-auto mb-4" />
              <p className="text-base font-semibold mb-1">Event not found.</p>
              <p className="text-sm text-muted-foreground mb-5">
                This event may have been cancelled, or the link is incorrect.
              </p>
              <Button size="sm" onClick={() => navigate({ name: "events" })} className="bg-violet-600 hover:bg-violet-500">
                See all events <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left: hero card */}
              <div className="lg:col-span-2">
                <div className="card-premium rounded-2xl p-7 lg:p-8">
                  <div className="flex items-center flex-wrap gap-2 mb-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md border uppercase",
                        accent.tint, accent.text, accent.border,
                      )}
                    >
                      <accent.icon className="h-3 w-3" />
                      {event.type}
                    </span>
                    {event.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-md border bg-violet-500/10 text-violet-300 border-violet-500/30">
                        <Sparkles className="h-3 w-3" /> FEATURED
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center text-[10px] font-mono px-2.5 py-1 rounded-md border uppercase ml-auto",
                        event.status === "Open" && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                        event.status === "Full" && "bg-rose-500/10 text-rose-300 border-rose-500/30",
                        event.status === "Completed" && "bg-muted/40 text-muted-foreground border-border/60",
                        event.status === "Cancelled" && "bg-rose-500/10 text-rose-300 border-rose-500/30",
                      )}
                    >
                      {event.status}
                    </span>
                  </div>

                  <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em] mb-3 text-balance">
                    {event.title}
                  </h1>

                  {event.description && (
                    <p className="text-base text-muted-foreground leading-relaxed mb-6">
                      {event.description}
                    </p>
                  )}

                  {/* Quick facts grid */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-5 border-t border-border/40">
                    <Fact icon={Calendar} label="Date" value={event.startDate || "TBD"} tint={accent.text} />
                    {event.endDate && event.endDate !== event.startDate && (
                      <Fact icon={Calendar} label="Ends" value={event.endDate} tint={accent.text} />
                    )}
                    <Fact icon={Clock} label="Time" value={event.time || "TBD"} tint={accent.text} />
                    <Fact
                      icon={event.mode === "On-Campus" ? MapPin : Video}
                      label="Mode"
                      value={`${event.mode}${event.venue && event.venue !== event.mode ? ` · ${event.venue}` : ""}`}
                      tint={accent.text}
                    />
                    <Fact icon={User} label="Organizer" value={event.organizer} tint={accent.text} />
                    {event.instructor && (
                      <Fact icon={User} label="Instructor" value={event.instructor} tint={accent.text} />
                    )}
                    <Fact icon={Users} label="Capacity" value={`${event.registered} / ${event.capacity} registered`} tint={accent.text} />
                    <Fact
                      icon={Tag}
                      label="Fee"
                      value={event.fee}
                      tint={event.fee.toLowerCase() === "free" ? "text-emerald-300" : "text-amber-300"}
                    />
                  </div>
                </div>

                {/* Long description */}
                {event.longDescription && (
                  <div className="card-premium rounded-2xl p-7 lg:p-8 mt-6">
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-4">ABOUT THIS EVENT</p>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-base text-foreground/85 leading-relaxed whitespace-pre-line">
                        {event.longDescription}
                      </p>
                    </div>
                    {event.tags && (
                      <div className="mt-6 pt-5 border-t border-border/40">
                        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] mb-3">TAGS</p>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.split("|").filter(Boolean).map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border/60"
                            >
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: register CTA card */}
              <div className="lg:col-span-1">
                <RegisterCard event={event} />
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Related events */}
      {event && related.length > 0 && (
        <section className="relative py-10 lg:py-12 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-1">RELATED</p>
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight">More {event.type}s</h2>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate({ name: "events" })}>
                All events <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r, i) => {
                const a = TYPE_ACCENTS[r.type] ?? TYPE_ACCENTS.workshop!
                return (
                  <motion.button
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onClick={() => {
                      navigate({ name: "event-detail", eventSlug: r.slug })
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="card-premium rounded-xl p-5 text-left group cursor-pointer flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("inline-flex p-2 rounded-lg", a.tint, a.text)}>
                        <a.icon className="h-4 w-4" />
                      </div>
                      <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded border uppercase", a.tint, a.text, a.border)}>
                        {r.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-violet-300 transition-colors">
                      {r.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {r.startDate || "TBD"}
                      </span>
                      <span className={cn(
                        "font-semibold",
                        r.fee.toLowerCase() === "free" ? "text-emerald-300" : "text-amber-300",
                      )}>
                        {r.fee}
                      </span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Fact({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tint: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("shrink-0 mt-0.5", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-0.5">
          {label}
        </div>
        <div className="text-sm text-foreground leading-snug">{value}</div>
      </div>
    </div>
  )
}

/* ============================================================
   RegisterCard - registration flow for the event detail page.
   - Logged-out users see "Sign in to register".
   - Logged-in users see "Register for this event". On success,
     the card flips to a "You're registered!" confirmation with an
     "Add to calendar" button.
   - Always shows the live "{registered} people registered" count.
   ============================================================ */
function RegisterCard({ event }: { event: EventDetail }) {
  const { navigate } = useAppStore()
  const { user, isLoading: userLoading } = useUser()

  const [registering, setRegistering] = React.useState(false)
  const [result, setResult] = React.useState<RegisterResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Local count state - we keep it in sync with the server response so the
  // "X people registered" counter ticks up immediately after a successful
  // registration without requiring a full refetch of the event.
  const [liveRegistered, setLiveRegistered] = React.useState(event.registered)
  React.useEffect(() => {
    setLiveRegistered(event.registered)
  }, [event.registered])

  const isFree = event.fee.toLowerCase() === "free"
  const seatsLeft = Math.max(0, event.capacity - liveRegistered)
  const isFull = seatsLeft === 0
  const isOpen = event.status === "Open" && !isFull

  async function handleRegister() {
    if (!user) {
      navigate({ name: "login" })
      return
    }
    setRegistering(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.slug)}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id }),
          credentials: "include",
        },
      )
      const j: RegisterResponse = await res.json()
      if (!res.ok || !j.success) {
        setError(j.message || (j.soldOut ? "This event is sold out." : "Failed to register"))
        if (j.soldOut) setLiveRegistered(event.capacity)
        setResult(j)
      } else {
        setResult(j)
        if (typeof j.registered === "number") setLiveRegistered(j.registered)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setRegistering(false)
    }
  }

  // Build a Google Calendar "add to calendar" link.
  const calendarUrl = React.useMemo(() => {
    const title = encodeURIComponent(event.title)
    const details = encodeURIComponent(event.description || "")
    const location = encodeURIComponent(event.venue || event.mode || "")
    const start = event.startIsoDate ? new Date(event.startIsoDate) : null
    const end = start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
    const dates = start && end ? `${fmt(start)}/${fmt(end)}` : ""
    const q = dates ? `?dates=${dates}` : ""
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${q}`
  }, [event])

  return (
    <div className="card-premium rounded-2xl p-6 lg:sticky lg:top-24">
      <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-3">REGISTER</p>

      {/* Fee */}
      <div className="mb-5">
        <span className={cn(
          "text-3xl font-bold",
          isFree ? "text-emerald-300" : "text-amber-300",
        )}>
          {event.fee}
        </span>
        {!isFree && <p className="text-xs text-muted-foreground mt-1">per participant</p>}
      </div>

      {/* Stats row */}
      <div className="space-y-2 text-xs text-muted-foreground mb-5">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          <span>
            <span className="font-mono tabular-nums text-foreground">{liveRegistered}</span>
            {" "}people registered
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span>{event.startDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{event.venue}</span>
        </div>
        {isOpen && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-emerald-300">{seatsLeft} seats left</span>
          </div>
        )}
      </div>

      {/* Registration state */}
      {result?.success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-3 text-center"
        >
          <CheckCircle2 className="h-7 w-7 text-emerald-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-200 mb-1">You&apos;re registered!</p>
          <p className="text-xs text-emerald-200/80">{result.message}</p>
        </motion.div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 mb-3">
          <p className="text-xs text-rose-300 text-center">{error}</p>
        </div>
      ) : null}

      {/* Primary action */}
      {result?.success ? (
        <>
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
            <Button className="bg-violet-600 hover:bg-violet-500 btn-premium w-full">
              <CalendarPlus className="h-4 w-4 mr-1.5" />
              Add to calendar
            </Button>
          </a>
          <Button
            variant="outline"
            onClick={() => navigate({ name: "events" })}
            className="w-full mt-2"
          >
            Browse more events
          </Button>
        </>
      ) : !isOpen ? (
        <Button disabled className="bg-muted text-muted-foreground w-full">
          {event.status === "Full" || isFull ? "Sold out" : event.status === "Cancelled" ? "Cancelled" : "Closed"}
        </Button>
      ) : userLoading ? (
        <Button disabled className="bg-violet-600 hover:bg-violet-500 btn-premium w-full">
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          Loading...
        </Button>
      ) : !user ? (
        <Button
          onClick={() => navigate({ name: "login" })}
          className="bg-violet-600 hover:bg-violet-500 btn-premium w-full"
        >
          <LogIn className="h-4 w-4 mr-1.5" />
          Sign in to register
        </Button>
      ) : (
        <Button
          onClick={handleRegister}
          disabled={registering}
          className="bg-violet-600 hover:bg-violet-500 btn-premium w-full"
        >
          {registering ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              Register for this event
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      )}

      {/* Secondary action */}
      {!result?.success && (
        <Button
          variant="outline"
          onClick={() => navigate({ name: "contact" })}
          className="w-full mt-2"
        >
          <Mail className="h-4 w-4 mr-1.5" />
          Ask a question
        </Button>
      )}

      <p className="text-[10px] text-muted-foreground/70 mt-4 text-center leading-relaxed">
        Free events reserve your seat instantly. Paid events will follow up by email
        with payment instructions.
      </p>
    </div>
  )
}
