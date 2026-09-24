"use client"

import * as React from "react"
import { motion, useInView, useMotionValue, useSpring, useTransform, useScroll, MotionValue } from "framer-motion"

/* ============================================================
   PREMIUM MOTION SYSTEM
   A coherent motion language for the entire website.
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const
const EASE_OUT = [0.22, 1, 0.36, 1] as const

/* ============================================================
   ScrollReveal - fade + slide up, refined
   ============================================================ */
export function ScrollReveal({
  children,
  delay = 0,
  y = 10,
  className,
  once = true,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once, amount: 0.05 })

  return (
    <motion.div
      ref={ref}
      data-gx-reveal=""
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   ClipReveal - clip-path mask reveal for images/sections
   ============================================================ */
export function ClipReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right"
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  const clipPaths = {
    up: "inset(100% 0% 0% 0%)",
    down: "inset(0% 0% 100% 0%)",
    left: "inset(0% 100% 0% 0%)",
    right: "inset(0% 0% 0% 100%)",
  }

  return (
    <motion.div
      ref={ref}
      data-gx-reveal=""
      initial={{ clipPath: clipPaths[direction] }}
      animate={isInView ? { clipPath: "inset(0% 0% 0% 0%)" } : {}}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   TextReveal - word-by-word reveal with blur
   ============================================================ */
export function TextReveal({
  text,
  className,
  delay = 0,
  stagger = 0.06,
  once = true,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once, amount: 0 })
  const words = text.split(" ")

  return (
    <motion.span
      ref={ref}
      data-gx-reveal=""
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          data-gx-reveal=""
          variants={{
            hidden: { opacity: 0, y: "0.12em", filter: "blur(2px)" },
            visible: {
              opacity: 1, y: 0, filter: "blur(0px)",
              transition: { duration: 0.35, ease: EASE },
            },
          }}
          className="inline-block"
          style={{ marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

/* ============================================================
   Stagger - stagger children container
   (Simplified: no scroll-triggered animation to prevent blinking.
    Children render immediately. Kept for backwards compatibility.)
   ============================================================ */
export function Stagger({
  children,
  className,
  delay = 0,
  staggerChildren = 0.1,
  once = true,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  staggerChildren?: number
  once?: boolean
}) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 30,
}: {
  children: React.ReactNode
  className?: string
  y?: number
}) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

/* ============================================================
   MagneticButton - cursor-following magnetic effect
   ============================================================ */
export function MagneticButton({
  children,
  className,
  strength = 0.06,
  onClick,
  ...props
}: {
  children: React.ReactNode
  className?: string
  strength?: number
  onClick?: () => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 34 })
  const springY = useSpring(y, { stiffness: 260, damping: 34 })

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * strength)
    y.set((e.clientY - rect.top - rect.height / 2) * strength)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   Parallax - scroll-based parallax movement
   ============================================================ */
export function Parallax({
  children,
  className,
  offset = 16,
}: {
  children: React.ReactNode
  className?: string
  offset?: number
}) {
  const ref = React.useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

/* ============================================================
   Counter - animated number count-up
   ============================================================ */
export function Counter({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
  className,
}: {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}) {
  const isInteger = Number.isInteger(value)
  const valueStr = isInteger ? value.toLocaleString() : String(value)

  return (
    <span className={className} data-target={value}>
      {prefix}{valueStr}{suffix}
    </span>
  )
}

/* ============================================================
   CursorGlow - cursor-responsive lighting on hover
   ============================================================ */
export function CursorGlow({
  children,
  className,
  color = "oklch(0.55 0.24 295 / 0.06)",
}: {
  children: React.ReactNode
  className?: string
  color?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={className}
      style={{ position: "relative" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${color}, transparent 40%)`,
        }}
      />
      {children}
    </div>
  )
}

/* ============================================================
   PinnedSection - sticky/pinned section that stays while content scrolls
   ============================================================ */
export function PinnedSection({
  children,
  className,
  height = "200vh",
}: {
  children: (progress: MotionValue<number>) => React.ReactNode
  className?: string
  height?: string
}) {
  const ref = React.useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  return (
    <div ref={ref} style={{ height }} className={cn("relative", className)}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {children(scrollYProgress)}
      </div>
    </div>
  )
}

/* ============================================================
   HorizontalScroll - vertical scroll drives horizontal movement
   ============================================================ */
export function HorizontalScroll({
  children,
  className,
  panels = 4,
}: {
  children: (index: number) => React.ReactNode
  className?: string
  panels?: number
}) {
  const ref = React.useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${(panels - 1) * 100 / panels * (panels / (panels - 1))}%`])

  return (
    <div ref={ref} style={{ height: `${panels * 80}vh` }} className={cn("relative", className)}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <motion.div style={{ x }} className="flex gap-8 px-8">
          {Array.from({ length: panels }).map((_, i) => (
            <div key={i} className="shrink-0 w-screen max-w-7xl mx-auto">
              {children(i)}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/* ============================================================
   ScrollText - large typography that transforms on scroll
   ============================================================ */
export function ScrollText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const ref = React.useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1])
  const y = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <motion.div
      ref={ref}
      style={{ opacity, scale, y }}
      className={className}
    >
      {text}
    </motion.div>
  )
}

/* ============================================================
   FadeIn / ScaleIn - simple entrance
   ============================================================ */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.6,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      data-gx-reveal=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   ScaleReveal - scale + fade on scroll into view
   ============================================================ */
export function ScaleReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      data-gx-reveal=""
      initial={{ opacity: 0, scale: 0.98 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   BlurReveal - blur to focus on scroll
   ============================================================ */
export function BlurReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      data-gx-reveal=""
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={isInView ? { opacity: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// cn utility (re-export to avoid import cycle in this file)
function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(" ")
}
