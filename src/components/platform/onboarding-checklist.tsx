"use client"

/**
 * OnboardingChecklist — first-login welcome + achievement checklist.
 *
 * Shows on the student dashboard while onboarding isn't complete:
 *   - Greeting banner with the user's name.
 *   - Checklist derived from REAL account state (enrollments, lessons,
 *     profile completeness) — no fake data.
 *   - Overall completion shown as an animated ProgressRing.
 *   - Dismissible (persists in localStorage) once the user is done with it;
 *     auto-hides permanently when every step is complete.
 */

import * as React from "react"
import { motion } from "framer-motion"
import {
  GraduationCap, UserRound, PlayCircle, Target, X, Sparkles,
} from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { useUser } from "@/hooks/use-user"
import { ProgressRing } from "@/components/platform/progress-ring"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

const STORAGE_KEY = "gx-onboarding-dismissed"

interface Step {
  id: string
  label: string
  description: string
  done: boolean
  action?: () => void
}

export function OnboardingChecklist() {
  const { user } = useUser()
  const { navigate } = useAppStore()
  const [dismissed, setDismissed] = React.useState(true) // SSR-safe default

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1")
    } catch { /* private mode */ }
  }, [])

  /* --- real account state --- */
  const { data: me } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => api("/api/me"),
    enabled: !!user,
    staleTime: 60_000,
  })

  if (!user || dismissed) return null

  const enrollments: any[] = Array.isArray(me?.enrollments) ? me.enrollments : []
  const completedLessons = Number(me?.stats?.completedLessons ?? me?.completedLessons ?? 0)

  const profileFields = [user.name, user.bio, user.title, user.avatar]
  const profileFilled = profileFields.filter(Boolean).length >= 3

  const steps: Step[] = [
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add a bio, title and avatar so instructors recognize you.",
      done: profileFilled,
      action: () => navigate({ name: "profile" }),
    },
    {
      id: "enroll",
      label: "Enroll in your first course",
      description: "Pick a path — CEH, SOC Analyst or Blue Team fundamentals.",
      done: enrollments.length > 0,
      action: () => navigate({ name: "catalog" }),
    },
    {
      id: "lesson",
      label: "Finish your first lesson",
      description: "Every lesson moves your rank ladder one step up.",
      done: completedLessons > 0,
      action: () => navigate({ name: "learning" }),
    },
    {
      id: "lab",
      label: "Try a hands-on lab",
      description: "Spin up a browser lab and hunt your first flag.",
      done: (me?.stats?.labsCompleted ?? me?.labsCompleted ?? 0) > 0,
      action: () => navigate({ name: "labs" }),
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  const dismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(STORAGE_KEY, "1") } catch { /* ignore */ }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-label="Getting started checklist"
      className="relative overflow-hidden rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5 mb-6"
    >
      {/* soft gradient wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(600px circle at 85% -10%, rgba(103,232,249,0.08), transparent 55%)" }}
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <ProgressRing value={pct} size={72} strokeWidth={7} className="text-emerald-400 hidden sm:inline-flex" aria-label={`Onboarding ${pct}% complete`}>
          <span className="text-sm font-bold tabular-nums">{pct}%</span>
        </ProgressRing>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-cyan-300" aria-hidden />
            <h2 className="text-sm font-bold tracking-tight">
              Welcome to GuardianX, {user.name?.split(" ")[0] ?? "Recruit"}!
            </h2>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss onboarding checklist"
              className="ml-auto h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            You're rank <span className="font-mono text-foreground">RECRUIT</span>.
            {steps.length - doneCount > 0
              ? ` ${steps.length - doneCount} step${steps.length - doneCount === 1 ? "" : "s"} to your first promotion:`
              : " Everything below is already done — nice work!"}
          </p>

          <ul className="grid sm:grid-cols-2 gap-1.5">
            {steps.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.08 + i * 0.05 }}
              >
                <button
                  type="button"
                  onClick={s.done ? undefined : s.action}
                  disabled={s.done}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-all outline-none",
                    "focus-visible:ring-2 focus-visible:ring-cyan-400/60",
                    s.done
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-border/50 bg-background/40 hover:border-cyan-500/40 hover:bg-cyan-500/5 cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex items-center justify-center size-4 rounded-full border shrink-0",
                      s.done ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-muted-foreground/40 text-transparent",
                    )}
                    aria-hidden
                  >
                    <GraduationCap className="size-2.5" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-xs font-medium leading-tight", s.done && "text-muted-foreground line-through decoration-emerald-400/50")}>
                      {s.label}
                    </span>
                    {!s.done && <span className="block text-[10px] text-muted-foreground mt-0.5 leading-snug">{s.description}</span>}
                  </span>
                  {!s.done && <PlayCircle className="size-3.5 text-muted-foreground/50 ml-auto shrink-0 mt-0.5" aria-hidden />}
                </button>
              </motion.li>
            ))}
          </ul>

          {doneCount === steps.length && (
            <p className="text-xs text-emerald-300 mt-2 flex items-center gap-1.5">
              <Target className="size-3.5" aria-hidden /> All steps complete — promotion unlocked!
            </p>
          )}
        </div>
      </div>

      {/* mobile progress bar */}
      <div className="sm:hidden mt-3 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="sr-only">{doneCount} of {steps.length} onboarding steps complete</span>
    </motion.section>
  )
}
