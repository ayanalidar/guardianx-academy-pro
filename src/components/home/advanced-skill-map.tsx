"use client"

/**
 * AdvancedSkillMap - homepage §5 skill constellation (v2).
 *
 * Design goals (learned from v1 feedback - the hologram was too busy):
 *   - READABLE: domain nodes are real HTML pills (icon + name + %), never
 *     tiny SVG text. The detail panel is a proper card, not an overlay popup.
 *   - RESTRAINED MOTION: one-time entrance (links draw in, nodes pop),
 *     a single slow energy-flow on the ACTIVE link only, smooth panel
 *     transitions. No scanlines, particles, flicker, tilt or sheen.
 *   - PREMIUM: soft guide rings, curved bezier links with per-domain
 *     color, glass pills, generous spacing - matches the platform's
 *     dark cyan/violet design language.
 *
 * Engineering notes:
 *   - Zero new dependencies; framer-motion + CSS/SVG only.
 *   - SSR-safe: all geometry is deterministic math from SKILL_MAP_DATA
 *     angles - no Math.random, no window access during render.
 *   - Fully keyboard accessible: nodes are buttons, panel is aria-live.
 *   - Honors prefers-reduced-motion (entrance + flow animation skipped).
 */

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ShieldCheck } from "lucide-react"
import { SKILL_MAP_DATA, SKILL_DOMAINS } from "@/views/home-data"
import { cn } from "@/lib/utils"

/* One-line tagline per domain, shown in the detail panel. */
const DOMAIN_TAGLINES: Record<string, string> = {
  Offensive: "Break in like an attacker - recon, exploit, escalate.",
  Defensive: "Detect, respond and harden against live threats.",
  Network: "Master the wires, routes and firewalls underneath.",
  Web: "Secure the modern application stack end to end.",
  Cloud: "Identity, workloads and containers across the big three.",
  Forensics: "Follow the evidence across disks, memory and packets.",
  GRC: "Turn security into policy, risk and compliance.",
}

/* Bezier helpers - geometry lives in a 100×100 viewBox. */
const CX = 50
const CY = 50
const NODE_RADIUS = 38
/** Distance fractions along each link where skill "beads" sit. */
const BEAD_TS = [0.45, 0.6, 0.75, 0.9] as const

interface Pt {
  x: number
  y: number
}

function nodePoint(angleDeg: number, radius = NODE_RADIUS): Pt {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

/** Control point for a gentle clockwise arc from center to node. */
function ctrlPoint(p: Pt): Pt {
  const mx = (CX + p.x) / 2
  const my = (CY + p.y) / 2
  const dx = p.x - CX
  const dy = p.y - CY
  const len = Math.hypot(dx, dy) || 1
  // Perpendicular unit vector × bow amount.
  const bow = 7
  return { x: mx + (-dy / len) * bow, y: my + (dx / len) * bow }
}

function bezierAt(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  }
}

export function AdvancedSkillMap() {
  const prefersReduced = useReducedMotion()
  const [active, setActive] = React.useState(0)

  const totalSkills = SKILL_MAP_DATA.reduce((n, d) => n + d.skills.length, 0)
  const activeDomain = SKILL_MAP_DATA[active]
  const activeMeta = SKILL_DOMAINS[active]

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_330px] gap-4 lg:gap-6 items-center">
      {/* ================= orbital map ================= */}
      <div className="relative w-full max-w-[560px] mx-auto aspect-square">
        {/* faint radial glow behind the core */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(103,232,249,0.07), rgba(167,139,250,0.04) 38%, transparent 65%)",
          }}
          aria-hidden
        />

        {/* --- SVG layer: guide rings, curved links, skill beads --- */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
          {SKILL_MAP_DATA.map((d, i) => {
            const p = nodePoint(d.angle)
            const c = ctrlPoint(p)
            const isActive = active === i
            return (
              <g key={`link-${d.domain}`}>
                <motion.path
                  d={`M ${CX} ${CY} Q ${c.x} ${c.y} ${p.x} ${p.y}`}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={isActive ? 0.55 : 0.3}
                  strokeOpacity={isActive ? 0.75 : 0.22}
                  strokeLinecap="round"
                  initial={prefersReduced ? false : { pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: "easeOut" }}
                  style={{ transition: "stroke-width 0.3s, stroke-opacity 0.3s" }}
                />
                {isActive && !prefersReduced && (
                  <path
                    d={`M ${CX} ${CY} Q ${c.x} ${c.y} ${p.x} ${p.y}`}
                    fill="none"
                    stroke={d.color}
                    strokeWidth="0.9"
                    strokeOpacity="0.9"
                    strokeLinecap="round"
                    className="gx-skill-flow"
                  />
                )}
              </g>
            )
          })}

          {/* skill beads along each link */}
          {SKILL_MAP_DATA.map((d, i) => {
            const p = nodePoint(d.angle)
            const c = ctrlPoint(p)
            const isActive = active === i
            return (
              <g key={`beads-${d.domain}`}>
                {BEAD_TS.map((t, bi) => {
                  const bp = bezierAt({ x: CX, y: CY }, c, p, t)
                  return (
                    <motion.circle
                      key={bi}
                      cx={bp.x}
                      cy={bp.y}
                      r={isActive ? 0.85 : 0.6}
                      fill={d.color}
                      initial={prefersReduced ? false : { opacity: 0 }}
                      whileInView={{ opacity: isActive ? 0.95 : 0.3 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.7 + i * 0.08 + bi * 0.06 },
                      }}
                      style={{ transition: "r 0.3s" }}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* structural guide rings */}
          <motion.g
            initial={prefersReduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, delay: 0.1 }}
          >
            <circle cx={CX} cy={CY} r={NODE_RADIUS} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="0.22" strokeDasharray="0.4 1.4" />
            <circle cx={CX} cy={CY} r={NODE_RADIUS + 7} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.18" />
            <circle cx={CX} cy={CY} r={13.5} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.2" strokeDasharray="1 2.2" />
          </motion.g>
        </svg>

        {/* --- center core --- */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center size-[92px] sm:size-[104px] rounded-full border border-border/60 bg-card/70 backdrop-blur-md shadow-[0_0_40px_-12px_rgba(103,232,249,0.35)]"
        >
          <ShieldCheck className="size-5 text-cyan-300" aria-hidden />
          <span className="mt-1 text-lg font-bold leading-none tracking-tight">{SKILL_DOMAINS.length}</span>
          <span className="text-[8px] font-mono tracking-[0.28em] text-muted-foreground mt-0.5">DOMAINS</span>
        </motion.div>

        {/* --- domain pills (real HTML, readable) --- */}
        {SKILL_MAP_DATA.map((d, i) => {
          const meta = SKILL_DOMAINS[i]
          const p = nodePoint(d.angle)
          const isActive = active === i
          const Icon = meta.icon
          return (
            <motion.button
              key={d.domain}
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              aria-pressed={isActive}
              aria-label={`${meta.name} domain - ${meta.progress}% complete. Show skills.`}
              initial={prefersReduced ? false : { opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.07, ease: "easeOut" }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full border px-2 sm:px-2.5 py-1 sm:py-1.5 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                borderColor: isActive ? d.color : "rgba(255,255,255,0.12)",
                background: isActive ? `${d.color}26` : "rgba(10,12,18,0.55)",
                boxShadow: isActive ? `0 0 28px -6px ${d.color}80` : "none",
                transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
              }}
            >
              <Icon className="size-3 sm:size-3.5 shrink-0" style={{ color: d.color }} aria-hidden />
              <span className={cn("text-[9px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap", isActive ? "text-foreground" : "text-foreground/80")}>
                {d.domain}
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono tabular-nums" style={{ color: d.color }}>
                {meta.progress}%
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* ================= detail panel ================= */}
      <div
        className="rounded-xl border border-border/60 bg-card/40 overflow-hidden"
        aria-live="polite"
      >
        {/* domain color rail */}
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${activeDomain.color}, transparent)` }} aria-hidden />
        <div className="p-4 lg:p-5 min-h-[290px] sm:min-h-[270px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDomain.domain}
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {/* header */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="flex items-center justify-center size-10 rounded-lg border"
                  style={{ background: `${activeDomain.color}1A`, borderColor: `${activeDomain.color}40` }}
                >
                  <activeMeta.icon className="size-5" style={{ color: activeDomain.color }} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight">{activeMeta.name} Security</h3>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {DOMAIN_TAGLINES[activeDomain.domain] ?? ""}
                  </p>
                </div>
                <span className="ml-auto text-lg font-bold tabular-nums shrink-0" style={{ color: activeDomain.color }}>
                  {activeMeta.progress}
                  <span className="text-[10px] text-muted-foreground font-mono">%</span>
                </span>
              </div>

              {/* progress bar */}
              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden mb-1.5">
                <motion.div
                  key={`bar-${activeDomain.domain}`}
                  className="h-full rounded-full"
                  style={{ background: activeDomain.color }}
                  initial={prefersReduced ? false : { width: 0 }}
                  animate={{ width: `${activeMeta.progress}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mb-4">
                {activeMeta.skills} curriculum skills · {activeDomain.skills.length} mapped
              </p>

              {/* skill list */}
              <ul className="space-y-1">
                {activeDomain.skills.map((s, si) => (
                  <motion.li
                    key={s}
                    initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: 0.08 + si * 0.05, ease: "easeOut" }}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 bg-muted/30 border border-border/40"
                  >
                    <span
                      className="size-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: activeDomain.color, boxShadow: `0 0 6px ${activeDomain.color}99` }}
                      aria-hidden
                    />
                    <span className="text-xs text-foreground/90">{s}</span>
                    <span className="ml-auto text-[9px] font-mono tracking-wider text-muted-foreground/70">
                      {String(si + 1).padStart(2, "0")}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
