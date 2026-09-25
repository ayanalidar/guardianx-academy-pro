"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  FlaskConical,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ============================================================
   PlatformActivityFeed - homepage "Live Feed" (moved from the
   course detail page, upgraded to platform scope).

   Data sources:
     - /api/enrollment-feed  -> recent enrollments (all courses),
                                total, thisWeek, daily30 sparkline
     - /api/platform-stats   -> "labs solved today" marketing stat

   Replaces the old compact SocialProof ticker: its unique stat
   (labs solved today) is absorbed here, and its rotating toast
   is superseded by the visible recent-enrollments list.
   ============================================================ */

interface FeedItem {
  id: string
  firstName: string
  city: string
  courseTitle: string
  courseShortName: string
  color: string
  timeAgo: string
  enrolledAt: string
}

interface PlatformStat {
  id: string
  key: string
  label: string
  value: string
  source: string
  displayStatus: string
  suffix?: string | null
  icon: string
  color: string
  updatedAt: string
}

const COLOR_TINTS: Record<string, string> = {
  emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  violet: "text-violet-300 bg-violet-500/10 border-violet-500/30",
  cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
  amber: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  rose: "text-rose-300 bg-rose-500/10 border-rose-500/30",
}

function tintFor(color: string): string {
  return COLOR_TINTS[color] ?? COLOR_TINTS.emerald!
}

/** Count-up number triggered when scrolled into view (local copy of the
    course-detail helper so the component stays self-contained). */
function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  duration = 1400,
}: {
  value: number
  decimals?: number
  suffix?: string
  duration?: number
}) {
  const [display, setDisplay] = React.useState(0)
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const startedRef = React.useRef(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setDisplay(value)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || startedRef.current) return
          startedRef.current = true
          const start = performance.now()
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setDisplay(value * eased)
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        })
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}

/** Lightweight SVG sparkline (local copy of EnrollSparkline from the
    course detail page - same visual language, no recharts dependency). */
function EnrollSparkline({ series }: { series: number[] }) {
  const w = 260
  const h = 56
  const max = Math.max(1, ...series)
  const pts = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * w
    const y = h - (v / max) * (h - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.join(" ")
  const area = `0,${h} ${line} ${w},${h}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="gx-home-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#gx-home-spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="rgb(52 211 153)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PlatformActivityFeed() {
  const { data: feedData, isLoading } = useQuery<{
    feed: FeedItem[]
    total: number
    thisWeek: number
    daily30?: number[]
  }>({
    queryKey: ["enrollment-feed"],
    queryFn: async () => {
      const res = await fetch("/api/enrollment-feed")
      if (!res.ok) return { feed: [], total: 0, thisWeek: 0, daily30: [] }
      const j = await res.json()
      return {
        feed: j.feed ?? [],
        total: j.total ?? 0,
        thisWeek: j.thisWeek ?? 0,
        daily30: Array.isArray(j.daily30) ? j.daily30 : [],
      }
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: statsData } = useQuery<{ stats: PlatformStat[] }>({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const res = await fetch("/api/platform-stats")
      if (!res.ok) return { stats: [] }
      const j = await res.json()
      return { stats: j.stats ?? [] }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const feed = feedData?.feed ?? []
  const total = feedData?.total ?? 0
  const thisWeek = feedData?.thisWeek ?? 0
  const daily30 =
    Array.isArray(feedData?.daily30) && feedData!.daily30!.length === 30
      ? feedData!.daily30!
      : []

  const labsTodayStat = (statsData?.stats ?? []).find(
    (s) => s.key === "labs_today" || /lab.*solved|solved.*today/i.test(s.label),
  )
  const labsToday = labsTodayStat?.value ?? "318"

  return (
    <div className="grid gap-8 lg:gap-10 lg:grid-cols-12">
      {/* ---------------- Left: heading + stat tiles ---------------- */}
      <div className="lg:col-span-4">
        <p className="text-[10px] font-mono text-emerald-300/90 tracking-[0.25em] mb-2">
          LIVE FEED
        </p>
        <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[0.95] tracking-[-0.03em] text-balance mb-6">
          Who&apos;s
          <span className="text-gradient-premium"> learning.</span>
        </h3>

        <div className="space-y-3">
          <div className="card-premium rounded-xl p-4 flex items-center gap-3">
            <div className="shrink-0 flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Users className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums leading-none">
                <AnimatedNumber value={total} />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mt-1">
                TOTAL LEARNERS ENROLLED
              </div>
            </div>
          </div>

          <div className="card-premium rounded-xl p-4 flex items-center gap-3">
            <div className="shrink-0 flex size-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums leading-none">
                <AnimatedNumber value={thisWeek} />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mt-1">
                ENROLLED THIS WEEK
              </div>
            </div>
          </div>

          <div className="card-premium rounded-xl p-4 flex items-center gap-3">
            <div className="shrink-0 flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              <FlaskConical className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums leading-none font-mono">{labsToday}</div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mt-1">
                LABS SOLVED TODAY
              </div>
            </div>
          </div>

          {daily30.length === 30 && (
            <div className="card-premium rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                  ENROLLMENT VELOCITY - 30 DAYS
                </div>
                <div className="text-[10px] font-mono text-emerald-300 tabular-nums">
                  +{daily30.reduce((a, b) => a + b, 0)}
                </div>
              </div>
              <EnrollSparkline series={daily30} />
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Right: recent enrollments ---------------- */}
      <div className="lg:col-span-8">
        <div className="card-premium rounded-2xl p-5 lg:p-6 h-full">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-4">
            RECENT ENROLLMENTS
          </p>
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-10">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Live enrollments load here as learners join GuardianX cohorts.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {feed.map((a, i) => {
                const initials = (a.firstName || "A").slice(0, 2).toUpperCase()
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-background/30 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all"
                  >
                    <div className="shrink-0 flex size-9 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono font-semibold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {a.firstName}
                        {a.city && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] font-mono text-muted-foreground tracking-wider">
                            <MapPin className="size-2.5" />
                            {a.city}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground tracking-wider truncate">
                        enrolled in {a.courseTitle}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "hidden sm:inline-flex shrink-0 font-mono px-1.5 py-0.5 rounded border text-[10px]",
                        tintFor(a.color),
                      )}
                    >
                      {a.courseShortName || a.courseTitle}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground tracking-wider shrink-0">
                      <Activity className="size-3 text-emerald-300" />
                      {a.timeAgo}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
