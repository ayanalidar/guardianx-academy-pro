"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import { CountUp } from "@/components/platform/count-up"
import { cn } from "@/lib/utils"

/**
 * StatTile - compact premium dashboard stat tile. Big number + label + icon,
 * with optional suffix and trend indicator.
 *
 * Used across the dashboard, instructor metrics, and lab progress overview.
 */

export interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string | number
  suffix?: string
  /** Tailwind text color class for icon + accent (e.g. "text-cyan-300") */
  color?: string
  /** Tailwind bg tint class (e.g. "bg-cyan-500/10") */
  tint?: string
  trend?: { value: number; direction: "up" | "down" }
  className?: string
}

export function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  color = "text-violet-300",
  tint = "bg-violet-500/10",
  trend,
  className,
}: StatTileProps) {
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "card-premium relative flex flex-col gap-3 rounded-xl p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border border-border/50",
            tint,
            color
          )}
          aria-hidden
        >
          <Icon className="size-[18px]" />
        </span>

        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
              trend.direction === "up"
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-rose-500/10 text-rose-300"
            )}
            aria-label={`Trend ${trend.direction} ${trend.value} percent`}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="size-3" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden />
            )}
            {trend.value}%
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "font-mono text-2xl font-bold tabular-nums leading-none text-foreground"
          )}
        >
          {typeof value === "number" ? (
            <CountUp value={value} />
          ) : (
            value
          )}
          {suffix && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    </motion.div>
  )
}
