"use client"

/**
 * CountUp — animated number that counts up when scrolled into view.
 *
 * Used for stat tiles (hero stats, dashboards) so key metrics feel alive.
 * Renders a plain <span> with tabular-nums; formatting (commas, suffix)
 * is preserved. Honors prefers-reduced-motion (jumps straight to value).
 */

import * as React from "react"
import { useInView, useReducedMotion } from "framer-motion"

interface CountUpProps {
  value: number
  duration?: number // ms
  prefix?: string
  suffix?: string
  /** Format the integer part each frame (default: en-US grouping). */
  format?: (n: number) => string
  className?: string
}

export function CountUp({
  value,
  duration = 1100,
  prefix = "",
  suffix = "",
  format,
  className,
}: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const prefersReduced = useReducedMotion()
  const [display, setDisplay] = React.useState(0)

  const fmt = React.useCallback(
    (n: number) => (format ? format(n) : Math.round(n).toLocaleString("en-US")),
    [format],
  )

  React.useEffect(() => {
    if (!inView) return
    if (prefersReduced) {
      setDisplay(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration, prefersReduced])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {fmt(display)}
      {suffix}
    </span>
  )
}
