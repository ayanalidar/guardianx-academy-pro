"use client"

import * as React from "react"
import { motion, useInView, useMotionValue, useSpring, useTransform, useScroll, AnimatePresence } from "framer-motion"

/* ============================================================
   ScrollReveal — fade + slide up on scroll into view
   ============================================================ */
export function ScrollReveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
  id,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: any
  id?: string
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const MotionTag: any = (motion as any)[as] || motion.div

  return (
    <MotionTag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

/* ============================================================
   Stagger — stagger children reveal
   ============================================================ */
export function Stagger({
  children,
  className,
  delay = 0,
  staggerChildren = 0.08,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  staggerChildren?: number
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren, delayChildren: delay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 20,
}: {
  children: React.ReactNode
  className?: string
  y?: number
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   TextReveal — word-by-word text reveal
   ============================================================ */
export function TextReveal({
  text,
  className,
  delay = 0,
  stagger = 0.04,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const words = text.split(" ")

  return (
    <motion.span
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: "0.5em", filter: "blur(8px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
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
   MagneticButton — cursor-following magnetic effect
   ============================================================ */
export function MagneticButton({
  children,
  className,
  strength = 0.3,
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
  const springX = useSpring(x, { stiffness: 200, damping: 15 })
  const springY = useSpring(y, { stiffness: 200, damping: 15 })

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - rect.width / 2
    const offsetY = e.clientY - rect.top - rect.height / 2
    x.set(offsetX * strength)
    y.set(offsetY * strength)
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
   Parallax — scroll-based parallax movement
   ============================================================ */
export function Parallax({
  children,
  className,
  offset = 50,
}: {
  children: React.ReactNode
  className?: string
  offset?: number
}) {
  const ref = React.useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

/* ============================================================
   Counter — animated number count-up
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
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const [display, setDisplay] = React.useState(0)

  React.useEffect(() => {
    if (!isInView) return
    let startTime: number | null = null
    let raf: number
    const animate = (ts: number) => {
      if (startTime === null) startTime = ts
      const progress = Math.min((ts - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setDisplay(Math.floor(eased * value))
      if (progress < 1) raf = requestAnimationFrame(animate)
      else setDisplay(value)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [isInView, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  )
}

/* ============================================================
   CursorGlow — cursor-responsive lighting on hover
   ============================================================ */
export function CursorGlow({
  children,
  className,
  color = "oklch(0.72 0.15 160 / 0.08)",
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
      style={{
        position: "relative",
      }}
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
   FadeIn — simple fade in on mount
   ============================================================ */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   ScaleIn — scale + fade in on mount
   ============================================================ */
export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   AnimatedSection — section wrapper with scroll-triggered reveal
   ============================================================ */
export function AnimatedSection({
  children,
  className,
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <ScrollReveal id={id} className={className}>
      {children}
    </ScrollReveal>
  )
}
