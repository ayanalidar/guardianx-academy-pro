"use client"

import * as React from "react"
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion"

/* ============================================================
   GuardianX Animated Logo - DeepSeek-style 3D tilt + specular
   ------------------------------------------------------------
   Behaviour (replicated from DeepSeek reference video):
   - The logo is a single solid 3D object (the transparent PNG).
   - It tilts toward the mouse cursor:
       mouse RIGHT  → logo rotates +Y (turns right)
       mouse LEFT   → logo rotates -Y (turns left)
       mouse DOWN   → logo rotates +X (nods down)
       mouse UP     → logo rotates -X (nods up)
   - A specular highlight (radial gradient overlay) tracks the
     cursor position across the logo's surface - the glint moves
     to wherever the mouse is pointing.
   - Motion is springy / damped (not instant 1:1).
   - Minimal Z rotation (stays upright).
   - No particles, no shards, no scan arc - just clean 3D + light.
   ============================================================ */

interface AnimatedLogoProps {
  size?: number
  className?: string
  /** enable mouse-tracking tilt (default true) */
  parallax?: boolean
  /** show the soft outer bloom glow */
  showBloom?: boolean
  /** show the reflection beneath the logo */
  showReflection?: boolean
  /** max tilt in degrees */
  maxTilt?: number
}

export function AnimatedLogo({
  size = 320,
  className,
  parallax = true,
  showBloom = true,
  showReflection = true,
  maxTilt = 22,
}: AnimatedLogoProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Normalised mouse position relative to viewport center: [-0.5, 0.5]
  // x > 0 means mouse is on the RIGHT, y > 0 means mouse is BELOW.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)

  // Spring-smoothed values - gives the "heavy / premium" damped feel
  const sx = useSpring(mx, { stiffness: 90, damping: 18, mass: 0.8 })
  const sy = useSpring(my, { stiffness: 90, damping: 18, mass: 0.8 })

  // Tilt rotations (degrees)
  // mouse RIGHT (x>0) → rotateY positive (turn right)
  // mouse DOWN  (y>0) → rotateX positive (nod down / chin toward viewer-bottom)
  const rotateY = useTransform(sx, [-0.5, 0.5], [-maxTilt, maxTilt])
  const rotateX = useTransform(sy, [-0.5, 0.5], [maxTilt, -maxTilt])

  // Specular highlight position (percentage within the logo box)
  // When mouse is center, glint is center. When mouse is top-right, glint
  // is upper-right, etc.
  const glintX = useTransform(sx, [-0.5, 0.5], ["28%", "72%"])
  const glintY = useTransform(sy, [-0.5, 0.5], ["28%", "72%"])
  const glint = useMotionTemplate`radial-gradient(circle at ${glintX} ${glintY}, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 18%, transparent 42%)`

  // Secondary ambient glow that also tracks the cursor (cooler tint)
  const ambientX = useTransform(sx, [-0.5, 0.5], ["30%", "70%"])
  const ambientY = useTransform(sy, [-0.5, 0.5], ["30%", "70%"])
  const ambient = useMotionTemplate`radial-gradient(circle at ${ambientX} ${ambientY}, rgba(124,58,237,0.35) 0%, rgba(56,189,248,0.15) 30%, transparent 55%)`

  // Subtle scale on extreme tilt to enhance the 3D feel
  const scale = useTransform(
    [sx, sy],
    ([x, y]: number[]) => 1 - (Math.abs(x) + Math.abs(y)) * 0.04
  )

  // Outer bloom opacity - intensifies slightly with movement
  const bloomOpacity = useTransform(
    [sx, sy],
    ([x, y]: number[]) => 0.4 + (Math.abs(x) + Math.abs(y)) * 0.4
  )

  React.useEffect(() => {
    if (!parallax) return
    const handler = (e: MouseEvent) => {
      // Normalise to viewport center, clamp to [-0.5, 0.5]
      const x = (e.clientX / window.innerWidth - 0.5)
      const y = (e.clientY / window.innerHeight - 0.5)
      mx.set(Math.max(-0.5, Math.min(0.5, x)))
      my.set(Math.max(-0.5, Math.min(0.5, y)))
    }
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [parallax, mx, my])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        perspective: 900,
        position: "relative",
      }}
    >
      {/* Outer atmospheric bloom - soft glow behind the logo */}
      {showBloom && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.45), rgba(56,189,248,0.18) 35%, transparent 68%)",
            filter: "blur(36px)",
            opacity: bloomOpacity,
          }}
        />
      )}

      {/* 3D scene */}
      <motion.div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          rotateX,
          rotateY,
          scale,
        }}
      >
        {/* The actual transparent logo PNG - the core 3D object */}
        <motion.img
          src="/guardianx-logo-v2.png"
          alt="GuardianX Logo"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          style={{
            transform: "translateZ(20px)",
            filter:
              "drop-shadow(0 12px 32px rgba(124,58,237,0.35)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
          }}
          draggable={false}
        />

        {/* Specular highlight overlay - the glint that tracks the cursor.
            This is clipped to the logo's alpha shape by using the logo
            image as a mask, so the highlight only appears ON the logo
            surface (not in the transparent corners). */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: glint,
            // Mask: use the logo PNG itself as the alpha mask so the
            // specular only shows on the logo's actual pixels.
            WebkitMaskImage: "url('/guardianx-logo-v2.png')",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: "url('/guardianx-logo-v2.png')",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            transform: "translateZ(21px)",
            mixBlendMode: "screen",
          }}
        />

        {/* Ambient color glow overlay - also masked to logo shape,
            adds the violet/cyan tint shift as the cursor moves. */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: ambient,
            WebkitMaskImage: "url('/guardianx-logo-v2.png')",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: "url('/guardianx-logo-v2.png')",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            transform: "translateZ(22px)",
            mixBlendMode: "screen",
            opacity: 0.6,
          }}
        />

        {/* Edge rim-light - a thin Fresnel-style outline that appears
            when the logo tilts away, simulating light catching the edge. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 60%, rgba(167,139,250,0.25) 78%, transparent 85%)",
            WebkitMaskImage: "url('/guardianx-logo-v2.png')",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: "url('/guardianx-logo-v2.png')",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            transform: "translateZ(23px)",
            mixBlendMode: "screen",
          }}
        />
      </motion.div>

      {/* Ground reflection - mirrors the logo below with a fade */}
      {showReflection && (
        <div
          aria-hidden
          className="absolute left-0 right-0 pointer-events-none overflow-hidden"
          style={{
            top: "82%",
            height: size * 0.18,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
          }}
        >
          <img
            src="/guardianx-logo-v2.png"
            alt=""
            className="w-full h-full object-contain opacity-30"
            style={{
              transform: "scaleY(-1)",
              filter: "blur(3px)",
            }}
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}

/* Lightweight variant for nav/footer - static with hover tilt */
export function AnimatedLogoMark({
  size = 36,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: size, height: size, perspective: 400 }}
    >
      <motion.img
        src="/guardianx-logo-v2.png"
        alt="GuardianX"
        className="w-full h-full object-contain"
        style={{
          filter: "drop-shadow(0 0 8px rgba(124,58,237,0.5))",
        }}
        whileHover={{
          scale: 1.05,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        draggable={false}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.3), transparent 65%)",
          filter: "blur(6px)",
          zIndex: -1,
        }}
        animate={{ opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </div>
  )
}
