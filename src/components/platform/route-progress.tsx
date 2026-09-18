"use client"

/**
 * RouteProgress — thin gradient loading bar at the very top of the screen.
 *
 * The platform is a SPA driven by the Zustand store: `navigate()` pushes
 * a real path and swaps the view. Because view swaps are synchronous state
 * changes (with lazy chunks loaded by ViewRouter on first visit), we show
 * the bar during the transition window so navigation always FEELS tracked:
 *
 *   view change → bar animates to ~85% over 300ms → completes & fades
 *
 * Also listens to `guardianx-navigate` (fired by AppRoot/store) and
 * popstate (browser back/forward). Honors prefers-reduced-motion.
 *
 * Timings are tuned for the preloaded-router era: chunks are warmed by
 * view-preloader.ts, so views usually render in <50ms and the bar
 * completes at 380ms — it signals the swap without lingering after the
 * content is already visible.
 */

import * as React from "react"
import { useAppStore } from "@/store/app-store"
import { cn } from "@/lib/utils"

type Phase = "idle" | "loading" | "done"

export function RouteProgress() {
  const view = useAppStore((s) => s.view)
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [progress, setProgress] = React.useState(0)
  const [key, setKey] = React.useState(0)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const firstRun = React.useRef(true)

  const start = React.useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setKey((k) => k + 1)
    setPhase("loading")
    setProgress(18)
    timers.current.push(setTimeout(() => setProgress(55), 90))
    timers.current.push(setTimeout(() => setProgress(82), 220))
    // Views render quickly after the store swap; complete shortly after.
    timers.current.push(setTimeout(() => { setProgress(100); setPhase("done") }, 380))
    timers.current.push(setTimeout(() => { setPhase("idle"); setProgress(0) }, 620))
  }, [])

  // Every real view change (including the first mount) starts the bar.
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    start()
  }, [view.name, start])

  // Back/forward navigation.
  React.useEffect(() => {
    const onPop = () => start()
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [start])

  React.useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const visible = phase !== "idle"

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2.5px] pointer-events-none"
      aria-hidden
    >
      <div
        key={key}
        className={cn(
          "h-full origin-left rounded-r-full",
          "bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400",
          "shadow-[0_0_10px_rgba(103,232,249,0.55)]",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{
          width: `${progress}%`,
          transition: "width 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
        }}
      />
    </div>
  )
}
