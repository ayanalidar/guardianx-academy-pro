"use client"

import * as React from "react"

/* ============================================================
   ParticleLogo - Logo reconstructed from square particles
   ------------------------------------------------------------
   Phases:
   1. ASSEMBLY  - particles scattered outside → spring to target
                  positions sampled from the logo's pixel data.
                  Staggered arrival over ~2s. (skipped if reduced-motion)
   2. IDLE      - subtle perlin-ish noise floating + opacity flicker.
   3. MOUSE     - cursor repels nearby particles in a soft radius;
                  they spring back when the cursor leaves.

   The logo is NEVER rendered as an image - it exists only as the
   collective arrangement of the particles themselves.
   ============================================================ */

type Phase = "loading" | "assembling" | "idle"

interface Particle {
  // target position (in canvas coords, already DPR-scaled)
  tx: number
  ty: number
  // current position
  x: number
  y: number
  // velocity
  vx: number
  vy: number
  // visual
  size: number
  color: string
  baseOpacity: number
  opacity: number
  // staggered start (0..1 of assembly duration)
  delay: number
  // per-particle noise seed
  seed: number
}

interface ParticleLogoProps {
  size?: number
  className?: string
  /** target particle count on desktop */
  particleCount?: number
  /** enable mouse repulsion */
  interactive?: boolean
  /** show soft glow behind the particle field */
  showGlow?: boolean
  /**
   * Force every particle to a single color (any CSS rgb/hex string)
   * instead of the logo's own pixel colors. Used to re-skin the mark
   * (e.g. brand-red watermark on certificates). Alpha variation from
   * the base opacity flicker is preserved.
   */
  tint?: string | null
}

export function ParticleLogo({
  size = 520,
  className,
  particleCount,
  interactive = true,
  showGlow = true,
  tint = null,
}: ParticleLogoProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const rafRef = React.useRef<number>(0)
  const particlesRef = React.useRef<Particle[]>([])
  const phaseRef = React.useRef<Phase>("loading")
  const mouseRef = React.useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  })
  const startRef = React.useRef<number>(0)
  const dprRef = React.useRef<number>(1)

  // Determine target particle count based on screen size
  const getTargetCount = React.useCallback(() => {
    if (particleCount) return particleCount
    if (typeof window === "undefined") return 1800
    const w = window.innerWidth
    if (w < 640) return 650 // mobile
    if (w < 1024) return 1100 // tablet
    return 2000 // desktop
  }, [particleCount])

  // Reduced motion check
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  /* ----- Build particles from the logo image ----- */
  const buildParticles = React.useCallback(async () => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    dprRef.current = dpr

    const renderSize = size
    canvas.width = renderSize * dpr
    canvas.height = renderSize * dpr
    canvas.style.width = `${renderSize}px`
    canvas.style.height = `${renderSize}px`

    // Load the logo image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = "/guardianx-logo-v2.png"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("logo load failed"))
    })

    // Draw to offscreen canvas at a sampling resolution.
    // We sample at a moderate resolution (e.g. 300px) to get enough
    // detail without reading millions of pixels.
    const sampleRes = 300
    const off = document.createElement("canvas")
    off.width = sampleRes
    off.height = sampleRes
    const offCtx = off.getContext("2d", { willReadFrequently: true })!
    offCtx.drawImage(img, 0, 0, sampleRes, sampleRes)
    const data = offCtx.getImageData(0, 0, sampleRes, sampleRes).data

    // Collect non-transparent pixel positions + colors
    const candidates: { x: number; y: number; r: number; g: number; b: number }[] = []
    for (let y = 0; y < sampleRes; y += 2) {
      for (let x = 0; x < sampleRes; x += 2) {
        const i = (y * sampleRes + x) * 4
        const a = data[i + 3]
        if (a > 60) {
          candidates.push({
            x: (x / sampleRes) * renderSize * dpr,
            y: (y / sampleRes) * renderSize * dpr,
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
          })
        }
      }
    }

    // Subsample to target count
    const target = getTargetCount()
    let chosen = candidates
    if (candidates.length > target) {
      // Shuffle and take first N
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
      }
      chosen = candidates.slice(0, target)
    }

    // Scale factor: logo occupies ~78% of the canvas (centered with padding)
    const logoScale = 0.78

    const assemblyDuration = prefersReducedMotion ? 0 : 2200 // ms

    const particles: Particle[] = chosen.map((c, i) => {
      // Scale around center so logo occupies logoScale of the canvas
      const cx = (renderSize * dpr) / 2
      const cy = (renderSize * dpr) / 2
      const scaledTx = cx + (c.x - cx) * logoScale
      const scaledTy = cy + (c.y - cy) * logoScale

      // Starting position: scattered in a ring around the logo
      const angle = Math.random() * Math.PI * 2
      const dist = renderSize * dpr * (0.55 + Math.random() * 0.35)
      const startX = cx + Math.cos(angle) * dist
      const startY = cy + Math.sin(angle) * dist

      const psz = (1.6 + Math.random() * 2.2) * dpr
      const baseOpacity = 0.7 + Math.random() * 0.3
      return {
        tx: scaledTx,
        ty: scaledTy,
        x: prefersReducedMotion ? scaledTx : startX,
        y: prefersReducedMotion ? scaledTy : startY,
        vx: 0,
        vy: 0,
        size: psz,
        color: tint ?? `rgb(${c.r},${c.g},${c.b})`,
        baseOpacity,
        opacity: prefersReducedMotion ? baseOpacity : 0,
        delay: Math.random(), // 0..1, used as fraction of assemblyDuration
        seed: Math.random() * 1000,
      }
    })

    particlesRef.current = particles
    startRef.current = performance.now()
    phaseRef.current = prefersReducedMotion ? "idle" : "assembling"
  }, [size, getTargetCount, prefersReducedMotion, tint])

  /* ----- Animation loop ----- */
  const animateRef = React.useRef<() => void>(() => {})

  const animate = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      rafRef.current = requestAnimationFrame(() => animateRef.current())
      return
    }
    const ctx = canvas.getContext("2d")!
    const particles = particlesRef.current
    if (particles.length === 0) {
      rafRef.current = requestAnimationFrame(() => animateRef.current())
      return
    }

    const now = performance.now()
    const dpr = dprRef.current

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const phase = phaseRef.current
    const assemblyElapsed = now - startRef.current
    const assemblyDuration = 2200

    const mouse = mouseRef.current
    const repelRadius = 110 * dpr // larger shatter radius
    const repelStrength = 0.6

    // Global idle noise time
    const t = now * 0.001

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // --- Phase logic ---
      let arrived = 1 // 0 = not started, 1 = fully arrived
      if (phase === "assembling") {
        const particleStart = p.delay * assemblyDuration * 0.6
        const particleDur = assemblyDuration * 0.55
        const localT = (assemblyElapsed - particleStart) / particleDur
        arrived = Math.max(0, Math.min(1, localT))
        // Ease out cubic
        const eased = 1 - Math.pow(1 - arrived, 3)
        p.opacity = p.baseOpacity * eased
      }

      if (arrived > 0) {
        // Spring toward target
        const ax = (p.tx - p.x) * 0.08
        const ay = (p.ty - p.y) * 0.08
        p.vx += ax
        p.vy += ay

        // Idle noise - subtle floating (only when mostly assembled)
        if (phase === "idle" || arrived > 0.8) {
          const noiseAmp = 1.2 * dpr
          const nx = Math.sin(t * 0.8 + p.seed) * Math.cos(t * 0.5 + p.seed * 0.7) * noiseAmp
          const ny = Math.cos(t * 0.7 + p.seed * 1.3) * Math.sin(t * 0.6 + p.seed * 0.5) * noiseAmp
          p.vx += nx * 0.04
          p.vy += ny * 0.04

          // Opacity flicker
          p.opacity = p.baseOpacity * (0.82 + Math.sin(t * 1.5 + p.seed) * 0.18)
        }

        // Mouse SHATTER + hover brightness boost
        // Near the cursor, particles violently explode away then spring back
        if (interactive && mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < repelRadius * repelRadius && dist2 > 0.01) {
            const dist = Math.sqrt(dist2)
            // Shatter force: much stronger near the cursor, falls off with distance
            // Inner zone (0-40% of radius): violent shatter
            // Outer zone (40-100%): gentle push
            const normalizedDist = dist / repelRadius
            const shatterForce =
              normalizedDist < 0.4
                ? (1 - normalizedDist / 0.4) * 18 // violent inner shatter
                : (1 - normalizedDist) * repelStrength * 4 // gentle outer push
            p.vx += (dx / dist) * shatterForce
            p.vy += (dy / dist) * shatterForce

            // Shattered particles briefly brighten then fade
            if (normalizedDist < 0.5) {
              p.opacity = Math.min(1, p.opacity * 1.5)
            }
          }
          // Hover brightness: particles within 1.8x repel radius get brighter
          if (dist2 < (repelRadius * 1.8) * (repelRadius * 1.8)) {
            p.opacity = Math.min(1, p.opacity * 1.25)
          }
        }

        // Damping - slightly less damping so shatter feels energetic
        p.vx *= 0.84
        p.vy *= 0.84
      }

      p.x += p.vx
      p.y += p.vy

      // Draw square
      const op = Math.max(0, Math.min(1, p.opacity))
      if (op < 0.02) continue

      ctx.globalAlpha = op
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }

    // Reset alpha
    ctx.globalAlpha = 1

    // Transition to idle phase
    if (phase === "assembling" && assemblyElapsed > assemblyDuration + 300) {
      phaseRef.current = "idle"
    }

    rafRef.current = requestAnimationFrame(() => animateRef.current())
  }, [size, interactive])

  // Keep ref in sync so the recursive rAF call always uses the latest closure
  React.useEffect(() => {
    animateRef.current = animate
  }, [animate])

  /* ----- Setup & lifecycle ----- */
  React.useEffect(() => {
    let mounted = true

    const init = async () => {
      await buildParticles()
      if (!mounted) return
      rafRef.current = requestAnimationFrame(() => animateRef.current())
    }
    init()

    // Mouse tracking - relative to canvas center
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = dprRef.current
      // Only active when cursor is within a generous bounding box of the canvas
      const pad = 60
      if (
        e.clientX < rect.left - pad ||
        e.clientX > rect.right + pad ||
        e.clientY < rect.top - pad ||
        e.clientY > rect.bottom + pad
      ) {
        mouseRef.current.active = false
        return
      }
      mouseRef.current.x = (e.clientX - rect.left) * dpr
      mouseRef.current.y = (e.clientY - rect.top) * dpr
      mouseRef.current.active = true
    }
    const onLeave = () => {
      mouseRef.current.active = false
    }

    // Pause when tab hidden
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current)
      } else {
        rafRef.current = requestAnimationFrame(() => animateRef.current())
      }
    }

    // Resize handler - rebuild particles on significant size change
    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!document.hidden) {
          buildParticles()
        }
      }, 300)
    }

    if (interactive) {
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseleave", onLeave)
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("resize", onResize)

    return () => {
      mounted = false
      cancelAnimationFrame(rafRef.current)
      if (interactive) {
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseleave", onLeave)
      }
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("resize", onResize)
      clearTimeout(resizeTimer)
    }
  }, [buildParticles, interactive]) // animate accessed via animateRef

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
      role="img"
      aria-label="GuardianX Academy logo"
    >
      {/* Soft atmospheric glow behind particles */}
      {showGlow && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "8%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.28), rgba(56,189,248,0.12) 40%, transparent 68%)",
            filter: "blur(32px)",
            pointerEvents: "none",
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  )
}
