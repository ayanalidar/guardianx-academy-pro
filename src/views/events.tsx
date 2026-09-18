"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/platform/empty-state"
import {
  Calendar, ArrowRight, Video, MapPin, Users, Clock, Trophy,
  Mic, FlaskConical, School, Sparkles, Filter, ShieldCheck,
} from "lucide-react"

/* ============================================================
   /events — public workshops / webinars / CTFs / campus
   programs / bootcamps (master-prompt §36)
   ============================================================ */

interface EventRow {
  id: string
  slug: string
  title: string
  description: string
  type: string
  category: string
  startDate: string
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
}

type FilterKey = "all" | "workshop" | "webinar" | "ctf" | "campus" | "bootcamp"

const FILTERS: { key: FilterKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All", icon: Filter },
  { key: "workshop", label: "Workshops", icon: FlaskConical },
  { key: "webinar", label: "Webinars", icon: Mic },
  { key: "ctf", label: "CTFs", icon: Trophy },
  { key: "campus", label: "Campus Programs", icon: School },
  { key: "bootcamp", label: "Bootcamps", icon: Sparkles },
]

// Type → accent color mapping
const TYPE_ACCENTS: Record<string, { tint: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  workshop: { tint: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30", icon: FlaskConical },
  webinar: { tint: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30", icon: Mic },
  ctf: { tint: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30", icon: Trophy },
  campus: { tint: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30", icon: School },
  awareness: { tint: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30", icon: ShieldCheck },
  corporate: { tint: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", icon: Users },
  bootcamp: { tint: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", icon: Sparkles },
}

export function EventsView() {
  const { navigate } = useAppStore()
  const [filter, setFilter] = React.useState<FilterKey>("all")

  const { data, isLoading, isError } = useQuery<{ events: EventRow[]; count: number }>({
    queryKey: ["public-events"],
    queryFn: async () => {
      const res = await fetch("/api/events")
      if (!res.ok) return { events: [], count: 0 }
      return res.json()
    },
    staleTime: 60_000,
  })

  const allEvents = data?.events ?? []
  const filteredEvents = React.useMemo(() => {
    if (filter === "all") return allEvents
    return allEvents.filter((e) => e.type === filter)
  }, [allEvents, filter])

  const featured = filteredEvents.filter((e) => e.featured)
  const regular = filteredEvents.filter((e) => !e.featured)

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* HERO */}
      <section className="relative py-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline" className="mb-5 border-violet-500/30 text-violet-300 bg-violet-500/5">
              <Calendar className="h-3 w-3 mr-1.5" /> GUARDIANX EVENTS
            </Badge>
            <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] mb-4 text-balance">
              Cybersecurity{" "}
              <span className="text-gradient-premium">Events &amp; Workshops.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Live workshops, webinars, CTFs, campus programs, and bootcamps — most are free to attend.
              All sessions are recorded and shared with registered attendees.
            </p>
          </motion.div>

          {/* Mini stats */}
          {allEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5"
            >
              <StatChip icon={Calendar} value={allEvents.length} label="Upcoming" tint="text-violet-300" />
              <StatChip
                icon={Users}
                value={allEvents.reduce((a, e) => a + e.registered, 0)}
                label="Registered"
                tint="text-cyan-300"
              />
              <StatChip
                icon={Sparkles}
                value={allEvents.filter((e) => e.fee.toLowerCase() === "free").length}
                label="Free events"
                tint="text-emerald-300"
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Filter pills */}
      <section className="relative py-4 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] mr-2 hidden sm:inline">
              FILTER
            </span>
            {FILTERS.map((f) => {
              const active = filter === f.key
              const Icon = f.icon
              const count =
                f.key === "all"
                  ? allEvents.length
                  : allEvents.filter((e) => e.type === f.key).length
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                    active
                      ? "bg-violet-500/15 text-violet-200 border-violet-500/40"
                      : "bg-card/40 text-muted-foreground border-border/60 hover:text-foreground hover:border-border",
                  )}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                  <span className={cn(
                    "ml-0.5 text-[10px] font-mono tabular-nums",
                    active ? "text-violet-300" : "text-muted-foreground/70",
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* EVENTS GRID */}
      <section className="relative py-8 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-xl border border-border/60 bg-card animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
              <p className="text-sm text-rose-300">Failed to load events. Please try again later.</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={filter === "all" ? "No events scheduled yet." : `No ${filter}s scheduled.`}
              description="New events are added weekly. Check back soon or subscribe to our newsletter."
              actionLabel="Get notified"
              onAction={() => navigate({ name: "contact" })}
            />
          ) : (
            <>
              {featured.length > 0 && regular.length > 0 && (
                <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-4">
                  FEATURED · {featured.length}
                </p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...featured, ...regular].map((e, i) => {
                  const accent = TYPE_ACCENTS[e.type] ?? TYPE_ACCENTS.workshop!
                  return (
                    <motion.button
                      key={e.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      onClick={() => navigate({ name: "event-detail", eventSlug: e.slug })}
                      className="card-premium rounded-2xl p-5 text-left group cursor-pointer flex flex-col"
                    >
                      {/* Type + featured */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("inline-flex p-2.5 rounded-lg", accent.tint, accent.text)}>
                          <accent.icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {e.featured && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                              FEATURED
                            </span>
                          )}
                          <span
                            className={cn(
                              "text-[9px] font-mono px-2 py-0.5 rounded border uppercase",
                              accent.tint, accent.text, accent.border,
                            )}
                          >
                            {e.type}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-base leading-snug mb-3 line-clamp-2 group-hover:text-violet-300 transition-colors">
                        {e.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                        {e.description}
                      </p>

                      {/* Meta */}
                      <div className="space-y-1.5 text-xs text-muted-foreground mb-4 mt-auto">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>{e.startDate || "TBD"}</span>
                          {e.time && (
                            <span className="text-muted-foreground/60">· {e.time}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {e.mode === "On-Campus" ? <MapPin className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                          <span className="truncate">{e.venue}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          <span>{e.registered} / {e.capacity} registered</span>
                        </div>
                      </div>

                      {/* Fee + CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <span className={cn(
                          "text-sm font-semibold",
                          e.fee.toLowerCase() === "free" ? "text-emerald-300" : "text-amber-300",
                        )}>
                          {e.fee}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium transition-colors",
                          accent.text,
                        )}>
                          View Event
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function StatChip({ icon: Icon, value, label, tint }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; tint: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur">
      <Icon className={cn("h-4 w-4", tint)} />
      <span className="font-mono text-sm font-bold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  )
}
