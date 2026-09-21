"use client"

/**
 * ProgressRing - animated circular progress indicator.
 *
 * Used on dashboards/profile where a percentage deserves more presence
 * than a flat bar. Animates stroke-dashoffset when scrolled into view;
 * static under prefers-reduced-motion.
 */

import * as React from "react"
import { useInView, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  /** 0-100 */
  value: number
  size?: number // px
  strokeWidth?: number
  /** Tailwind color class for the track, e.g. "text-muted/40" */
  trackClassName?: string
  /** Tailwind color class for the progress arc, e.g. "text-emerald-400" */
  className?: string
  children?: React.ReactNode // center label
  "aria-label"?: string
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  trackClassName = "text-muted/40",
  className = "text-cyan-400",
  children,
  "aria-label": ariaLabel,
}: ProgressRingProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-30px" })
  const prefersReduced = useReducedMotion()

  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const shown = (prefersReduced || inView ? clamped : 0) / 100

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={ariaLabel ?? `${clamped}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={strokeWidth}
          className={trackClassName} stroke="currentColor"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
