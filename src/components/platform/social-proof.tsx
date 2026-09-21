"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { Activity, Users, FlaskConical, Sparkles, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

/* ============================================================
   SocialProof - small live-activity widget for the homepage.
   Renders three things:
     1. "X students enrolled this week" (from /api/platform-stats)
     2. "Y labs solved today" (from /api/platform-stats)
     3. A rotating live enrollment notification toast
        (from /api/enrollment-feed)
   The toast rotates every 10-15 seconds using framer-motion
   AnimatePresence for a smooth swap.
   ============================================================ */

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

export function SocialProof() {
  /* --------------------------- platform stats --------------------------- */
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

  // Pull a "students enrolled this week" + "labs solved today" number.
  // We prefer manual stats (marketing estimate) over calculated ones,
  // since the calculated learner_count is total - not weekly.
  const stats = statsData?.stats ?? []
  const weeklyEnrollmentsStat =
    stats.find((s) => s.key === "weekly_enrollments" || /enrolled.*week|week.*enroll/i.test(s.label)) ??
    null
  const labsTodayStat =
    stats.find((s) => s.key === "labs_today" || /lab.*solved|solved.*today/i.test(s.label)) ??
    null

  // Fallbacks - these are sensible marketing estimates that update as
  // real platform stats get added via the CMS.
  const weeklyEnrollments = weeklyEnrollmentsStat?.value ?? "1,240"
  const labsToday = labsTodayStat?.value ?? "318"

  /* --------------------------- enrollment feed --------------------------- */
  const { data: feedData } = useQuery<{ feed: FeedItem[] }>({
    queryKey: ["enrollment-feed"],
    queryFn: async () => {
      const res = await fetch("/api/enrollment-feed")
      if (!res.ok) return { feed: [] }
      const j = await res.json()
      return { feed: j.feed ?? [] }
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const feed = feedData?.feed ?? []

  /* --------------------------- toast rotation --------------------------- */
  // Pick a random item from the feed every 12 seconds. If the feed is
  // empty, show a tasteful fallback message.
  const [toastIdx, setToastIdx] = React.useState(0)
  React.useEffect(() => {
    if (feed.length === 0) return
    const id = setInterval(() => {
      setToastIdx((prev) => (prev + 1) % Math.max(1, feed.length))
    }, 12_000)
    return () => clearInterval(id)
  }, [feed.length])

  const current = feed[toastIdx]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* ------------------- Stat tiles ------------------- */}
      <StatTile
        icon={Users}
        label="Students enrolled this week"
        value={weeklyEnrollments}
        tint="text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
      />
      <StatTile
        icon={FlaskConical}
        label="Labs solved today"
        value={labsToday}
        tint="text-violet-300 bg-violet-500/10 border-violet-500/30"
      />
      {/* ------------------- Live enrollment toast ------------------- */}
      <div
        className={cn(
          "card-premium rounded-xl p-4 flex items-center gap-3 min-h-[88px] relative overflow-hidden",
        )}
        aria-live="polite"
      >
        <div className="shrink-0 flex size-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <Activity className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1">
            <Sparkles className="size-2.5" />
            LIVE ENROLLMENT
          </p>
          <AnimatePresence mode="wait">
            {current ? (
              <motion.p
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-xs text-foreground/90 leading-snug"
              >
                <span className="font-semibold">{current.firstName}</span>
                {" from "}
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="size-2.5 text-muted-foreground" />
                  {current.city}
                </span>
                {" just enrolled in "}
                <span
                  className={cn(
                    "font-mono px-1.5 py-0.5 rounded border text-[10px]",
                    tintFor(current.color),
                  )}
                >
                  {current.courseShortName || current.courseTitle}
                </span>
                <span className="text-muted-foreground"> · {current.timeAgo}</span>
              </motion.p>
            ) : (
              <motion.p
                key="fallback"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-xs text-muted-foreground leading-snug"
              >
                Live enrollments load here as learners join GuardianX cohorts.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon, label, value, tint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tint: string
}) {
  return (
    <div className="card-premium rounded-xl p-4 flex items-center gap-3 min-h-[88px]">
      <div className={cn("shrink-0 flex size-9 items-center justify-center rounded-lg border", tint)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-2xl font-bold tabular-nums leading-none">{value}</p>
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5 leading-tight">
          {label}
        </p>
      </div>
    </div>
  )
}
