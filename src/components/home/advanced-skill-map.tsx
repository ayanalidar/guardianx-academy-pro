"use client"

/**
 * AdvancedSkillMap — holographic 3D skill constellation for the homepage.
 *
 * Design: pointer-tracked 3D tilt stage (perspective + spring-rotated card)
 * with parallax depth layers — drifting particles behind, counter-rotating
 * holo orbit rings, the SVG skill graph in front, plus scanlines, a sheen
 * sweep and a mouse-follow spotlight on top.
 *
 * Engineering notes:
 * - Zero new dependencies: framer-motion springs + CSS/SVG animations only.
 * - All animations are compositor-friendly (transform / opacity /
 *   stroke-dashoffset). Nothing animates layout.
 * - Tilt + heavy effects activate only for (pointer: fine) devices and are
 *   skipped under prefers-reduced-motion.
 * - Particle field is a DETERMINISTIC constant (no Math.random in render)
 *   so SSR and client markup always match.
 * - Still purely presentational: reads SKILL_MAP_DATA / SKILL_DOMAINS from
 *   home-data; hover/tap interactions preserved.
 */

import * as React from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion"
import { SKILL_MAP_DATA, SKILL_DOMAINS } from "@/views/home-data"

/* Deterministic "dust in the hologram" — [x%, y%, size, drift duration, delay] */
const PARTICLES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [6, 14, 1.5, 9, 0], [14, 78, 1, 11, 1.2], [22, 32, 1.2, 8, 2.1],
  [30, 8, 1, 10, 0.6], [38, 88, 1.5, 12, 1.8], [47, 22, 1, 9, 0.3],
  [55, 70, 1.2, 11, 2.4], [63, 12, 1.5, 8, 1.5], [71, 46, 1, 10, 0.9],
  [79, 84, 1.2, 9, 2.8], [86, 26, 1.5, 12, 0.2], [93, 62, 1, 8, 1.1],
  [10, 52, 1, 10, 2.6], [50, 94, 1, 9, 0.8], [68, 92, 1.2, 11, 1.9],
  [90, 8, 1, 10, 2.2],
]

export function AdvancedSkillMap() {
  const prefersReduced = useReducedMotion()
  const [finePointer, setFinePointer] = React.useState(false)
  const [hoveredDomain, setHoveredDomain] = React.useState<number | null>(null)
  const [selectedDomain, setSelectedDomain] = React.useState<number | null>(null)

  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)")
    const update = () => setFinePointer(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const enableTilt = finePointer && !prefersReduced

  /* --- 3D tilt: pointer position -> spring-rotated stage ---------------- */
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 140, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 140, damping: 20 })

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      px.set(x)
      py.set(y)
      e.currentTarget.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`)
      e.currentTarget.style.setProperty("--my", `${(y * 100).toFixed(2)}%`)
    },
    [px, py]
  )

  const handlePointerLeave = React.useCallback(() => {
    px.set(0.5)
    py.set(0.5)
  }, [px, py])

  /* --- graph geometry ---------------------------------------------------- */
  const centerX = 50
  const centerY = 50
  const domainRadius = 32
  const skillRadius = 14

  const activeIdx = hoveredDomain ?? selectedDomain

  return (
    <div
      className="relative"
      onPointerMove={enableTilt ? handlePointerMove : undefined}
      onPointerLeave={enableTilt ? handlePointerLeave : undefined}
    >
      {/* Legend bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" /> Completed</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-violet-400/40" /> Available</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-muted-foreground/30" /> Locked</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-300/90 holo-flicker">
          35 SKILLS / 7 DOMAINS
        </span>
      </div>

      {/* ================= holographic 3D stage ================= */}
      <div className="holo-stage relative aspect-square max-w-[620px] mx-auto">
        <motion.div
          className="holo-layer absolute inset-0"
          style={{ rotateX: enableTilt ? rotateX : 0, rotateY: enableTilt ? rotateY : 0, willChange: "transform" }}
        >
          {/* ---- DEPTH LAYER 1 (z -70): drifting particles + nebula glows ---- */}
          <div className="absolute inset-0" style={{ transform: "translateZ(-70px)" }} aria-hidden>
            {PARTICLES.map(([x, y, s, d, delay], i) => (
              <span
                key={`p-${i}`}
                className="holo-particle absolute rounded-full bg-cyan-200"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${s}px`,
                  height: `${s}px`,
                  boxShadow: "0 0 6px 1px rgba(103,232,249,0.55)",
                  animationDuration: `${d}s`,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
            <div className="absolute left-[15%] top-[10%] w-48 h-48 rounded-full bg-violet-600/12 blur-[70px]" />
            <div className="absolute right-[12%] bottom-[14%] w-56 h-56 rounded-full bg-cyan-500/10 blur-[80px]" />
          </div>

          {/* ---- DEPTH LAYER 2 (z -30): counter-rotating holo orbit rings ---- */}
          <div className="absolute inset-0" style={{ transform: "translateZ(-30px)" }} aria-hidden>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <circle cx={centerX} cy={centerY} r={domainRadius + 14} fill="none" stroke="rgba(103,232,249,0.10)" strokeWidth="0.25" strokeDasharray="0.5 1.5">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${centerX} ${centerY}`} to={`360 ${centerX} ${centerY}`} dur="38s" repeatCount="indefinite" />
              </circle>
              <circle cx={centerX} cy={centerY} r={domainRadius + 10} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="0.2" strokeDasharray="1 2">
                <animateTransform attributeName="transform" type="rotate" from={`360 ${centerX} ${centerY}`} to={`0 ${centerX} ${centerY}`} dur="26s" repeatCount="indefinite" />
              </circle>
              <circle cx={centerX} cy={centerY} r={domainRadius + 17.5} fill="none" stroke="rgba(52,211,153,0.07)" strokeWidth="0.15" strokeDasharray="0.2 2.2">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${centerX} ${centerY}`} to={`360 ${centerX} ${centerY}`} dur="52s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* ---- DEPTH LAYER 3 (z +15): the skill graph itself ---- */}
          <div className="absolute inset-0" style={{ transform: "translateZ(15px)" }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="holo-core-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(167,139,250,0.55)" />
                  <stop offset="55%" stopColor="rgba(103,232,249,0.16)" />
                  <stop offset="100%" stopColor="rgba(103,232,249,0)" />
                </radialGradient>
                <linearGradient id="holo-core-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="50%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>

              {/* Structural guide rings */}
              <circle cx={centerX} cy={centerY} r={domainRadius + 8} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" strokeDasharray="0.5 1" />
              <circle cx={centerX} cy={centerY} r={domainRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
              <circle cx={centerX} cy={centerY} r={domainRadius - 12} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />

              {/* Center -> domain links with flowing energy */}
              {SKILL_MAP_DATA.map((d, i) => {
                const rad = (d.angle * Math.PI) / 180
                const x = centerX + domainRadius * Math.cos(rad)
                const y = centerY + domainRadius * Math.sin(rad)
                const isActive = activeIdx === i
                return (
                  <g key={`link-${i}`}>
                    <line
                      x1={centerX} y1={centerY} x2={x} y2={y}
                      stroke={isActive ? d.color : "rgba(255,255,255,0.12)"}
                      strokeWidth={isActive ? "0.6" : "0.3"}
                      style={{ transition: "all 0.3s" }}
                    />
                    <line
                      x1={centerX} y1={centerY} x2={x} y2={y}
                      className="holo-line-flow"
                      stroke={isActive ? d.color : "rgba(103,232,249,0.35)"}
                      strokeWidth={isActive ? "0.8" : "0.45"}
                      opacity={isActive ? 0.95 : 0.4}
                      style={{ transition: "all 0.3s" }}
                    />
                  </g>
                )
              })}

              {/* Domain -> skill links + pulsing sub-skill nodes */}
              {SKILL_MAP_DATA.map((d, di) => {
                const drad = (d.angle * Math.PI) / 180
                const dx = centerX + domainRadius * Math.cos(drad)
                const dy = centerY + domainRadius * Math.sin(drad)
                const isActive = activeIdx === di

                return d.skills.map((skill, si) => {
                  const spread = 50
                  const skillAngle = d.angle - spread / 2 + (spread / (d.skills.length - 1)) * si
                  const srad = (skillAngle * Math.PI) / 180
                  const sx = dx + skillRadius * Math.cos(srad)
                  const sy = dy + skillRadius * Math.sin(srad)

                  return (
                    <g key={`skill-${di}-${si}`}>
                      <line
                        x1={dx} y1={dy} x2={sx} y2={sy}
                        stroke={isActive ? d.color : "rgba(255,255,255,0.06)"}
                        strokeWidth={isActive ? "0.3" : "0.15"}
                        style={{ transition: "all 0.3s" }}
                      />
                      <circle
                        cx={sx} cy={sy}
                        r={isActive ? "1.5" : "1"}
                        fill={isActive ? d.color : "rgba(255,255,255,0.2)"}
                        style={{ transition: "all 0.3s", cursor: "pointer" }}
                        onClick={() => setSelectedDomain(selectedDomain === di ? null : di)}
                      >
                        <animate attributeName="opacity" values="0.45;1;0.45" dur="2.6s" begin={`${((di * 5 + si) * 0.16).toFixed(2)}s`} repeatCount="indefinite" />
                      </circle>
                      {isActive && (
                        <text
                          x={sx} y={sy - 2.5} textAnchor="middle"
                          fill={d.color} fontSize="1.5" fontFamily="monospace"
                          style={{ pointerEvents: "none" }}
                          className="holo-flicker"
                        >
                          {skill.length > 12 ? skill.substring(0, 10) + "..." : skill}
                        </text>
                      )}
                    </g>
                  )
                })
              })}

              {/* Domain nodes with progress rings + holo pulse */}
              {SKILL_MAP_DATA.map((d, i) => {
                const rad = (d.angle * Math.PI) / 180
                const x = centerX + domainRadius * Math.cos(rad)
                const y = centerY + domainRadius * Math.sin(rad)
                const isActive = activeIdx === i
                const domain = SKILL_DOMAINS[i]
                const status = domain.progress >= 70 ? "completed" : domain.progress >= 30 ? "in-progress" : domain.progress > 0 ? "available" : "locked"

                return (
                  <g
                    key={`domain-${i}`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredDomain(i)}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onClick={() => setSelectedDomain(selectedDomain === i ? null : i)}
                  >
                    {/* expanding holo rings when active */}
                    {isActive && (
                      <>
                        <circle cx={x} cy={y} r="5" fill="none" stroke={d.color} strokeWidth="0.3" opacity="0.4">
                          <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.45;0.05;0.45" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={x} cy={y} r="5" fill="none" stroke={d.color} strokeWidth="0.2" opacity="0.3">
                          <animate attributeName="r" values="4;7;4" dur="2s" begin="0.7s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.35;0.03;0.35" dur="2s" begin="0.7s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}
                    <circle
                      cx={x} cy={y}
                      r={isActive ? "4" : "3.5"}
                      fill={d.color}
                      fillOpacity={isActive ? "0.3" : status === "locked" ? "0.05" : "0.15"}
                      stroke={d.color}
                      strokeWidth={isActive ? "0.6" : "0.4"}
                      style={{ transition: "all 0.3s", filter: isActive ? `drop-shadow(0 0 1.2px ${d.color})` : undefined }}
                    />
                    <text
                      x={x} y={y + 7} textAnchor="middle"
                      fill={isActive ? d.color : "rgba(255,255,255,0.55)"}
                      fontSize="2" fontWeight="bold" fontFamily="monospace"
                      style={{ pointerEvents: "none", transition: "all 0.3s" }}
                    >
                      {d.domain.toUpperCase()}
                    </text>
                    <circle
                      cx={x} cy={y} r="3.5" fill="none" stroke={d.color}
                      strokeWidth="0.8"
                      strokeDasharray={`${(domain.progress / 100) * 22} 22`}
                      strokeDashoffset="0"
                      transform={`rotate(-90 ${x} ${y})`}
                      opacity="0.65"
                      style={{ transition: "all 0.3s" }}
                    />
                  </g>
                )
              })}

              {/* Holographic core */}
              <circle cx={centerX} cy={centerY} r="11" fill="url(#holo-core-glow)" className="holo-core" style={{ transformBox: "view-box", transformOrigin: "50px 50px" }} />
              <circle cx={centerX} cy={centerY} r="7.5" fill="rgba(167,139,250,0.12)" stroke="url(#holo-core-ring)" strokeWidth="0.5" />
              <circle cx={centerX} cy={centerY} r="6" fill="none" stroke="rgba(103,232,249,0.35)" strokeWidth="0.3" strokeDasharray="1 1">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${centerX} ${centerY}`} to={`360 ${centerX} ${centerY}`} dur="14s" repeatCount="indefinite" />
              </circle>
              <circle cx={centerX} cy={centerY} r="4.5" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="0.25" strokeDasharray="0.6 1.2">
                <animateTransform attributeName="transform" type="rotate" from={`360 ${centerX} ${centerY}`} to={`0 ${centerX} ${centerY}`} dur="9s" repeatCount="indefinite" />
              </circle>
              <text x={centerX} y={centerY - 0.8} textAnchor="middle" fill="url(#holo-core-ring)" fontSize="2.5" fontWeight="bold" fontFamily="monospace">CYBER</text>
              <text x={centerX} y={centerY + 2.2} textAnchor="middle" fill="url(#holo-core-ring)" fontSize="2.5" fontWeight="bold" fontFamily="monospace">SEC</text>
            </svg>
          </div>

          {/* ---- DEPTH LAYER 4 (z +45): scanlines + sheen sweep ---- */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden" style={{ transform: "translateZ(45px)" }} aria-hidden>
            <div className="holo-scanline absolute inset-0" />
            <div className="holo-sweep absolute left-0 right-0 h-[18%]" />
            <div className="holo-sheen absolute top-0 bottom-0 w-[35%]" />
          </div>
        </motion.div>

        {/* ---- mouse-follow spotlight (fixed to the card, not tilted) ---- */}
        {enableTilt && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl z-10"
            style={{
              background:
                "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(103,232,249,0.09), rgba(167,139,250,0.05) 40%, transparent 68%)",
            }}
            aria-hidden
          />
        )}

        {/* ---- corner HUD brackets ---- */}
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
          <span className="absolute left-1 top-1 w-4 h-4 border-l border-t border-cyan-400/40 rounded-tl" />
          <span className="absolute right-1 top-1 w-4 h-4 border-r border-t border-cyan-400/40 rounded-tr" />
          <span className="absolute left-1 bottom-1 w-4 h-4 border-l border-b border-cyan-400/40 rounded-bl" />
          <span className="absolute right-1 bottom-1 w-4 h-4 border-r border-b border-cyan-400/40 rounded-br" />
        </div>

        {/* ---- holographic hover detail panel ---- */}
        {hoveredDomain !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-2 left-2 right-2 lg:left-auto lg:right-2 lg:max-w-xs z-20 rounded-xl p-[1px]"
            style={{ background: "linear-gradient(135deg, rgba(103,232,249,0.5), rgba(167,139,250,0.5), rgba(52,211,153,0.5))" }}
          >
            <div className="rounded-[11px] border border-border/40 bg-background/85 backdrop-blur-xl p-3 shadow-[0_8px_32px_-12px_rgba(103,232,249,0.35)]">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: SKILL_MAP_DATA[hoveredDomain].color, boxShadow: `0 0 8px ${SKILL_MAP_DATA[hoveredDomain].color}` }}
                />
                <span className="text-xs font-bold uppercase tracking-wider">{SKILL_DOMAINS[hoveredDomain].name} Security</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">{SKILL_DOMAINS[hoveredDomain].progress}%</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {SKILL_MAP_DATA[hoveredDomain].skills.map(s => (
                  <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/40">{s}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile tap hint */}
      <p className="text-center text-[10px] text-muted-foreground/60 mt-2 lg:hidden">Tap a domain to explore skills</p>
    </div>
  )
}
