"use client"

/**
 * CardFx - platform-wide card effect engine.
 *
 * Applies the hiring-page card treatment to EVERY card on the platform
 * (home, learn, practice, career, institutions, about, admin) without
 * editing each view by hand:
 *
 *   1. 3D tilt on mouse move   - perspective(900px) rotateX/rotateY,
 *     identical math to the hiring JobCard, reset flat on leave.
 *   2. Cursor spotlight        - violet radial glow following the cursor
 *     via --sx/--sy custom properties (injected overlay span).
 *   3. GlowEdge                - rotating conic-gradient ring (violet +
 *     emerald arcs, 7s sweep) revealed on hover (injected overlay span).
 *   4. Hover color cues        - violet border tint + heading lift on
 *     hover (CSS only, defers to cards that define their own colors).
 *
 * How it works:
 *   - A scanner tags card-like containers with .gx-fx / .gx-fx-glow and
 *     injects two overlay spans (spotlight + glow ring). Overlays are
 *     REAL elements so they never collide with existing ::before/::after
 *     styles (card-premium etc.).
 *   - One delegated pointer listener drives tilt + spotlight for the
 *     hovered card (O(1) per mousemove, rAF-throttled).
 *   - A debounced MutationObserver rescans after SPA view swaps, lazy
 *     loads and filtered-list re-renders.
 *
 * Opt out any subtree with data-gx-fx="off" - the hiring page ships its
 * own native effects on job/featured cards and opts out to avoid
 * double-tilt. Touch devices and prefers-reduced-motion skip tilt.
 */

import * as React from "react"

/** Card size gates - keeps tiny chips and page-level wrappers out. */
const MIN_W = 140
const MIN_H = 88
const MAX_W = 1240
const MAX_H = 860

/** Max tilt degrees (hiring JobCard math: offset is -0.5..0.5). */
const TILT_RX = 4.5
const TILT_RY = 6.0

const SKIP_SELECTOR = [
  '[data-gx-fx="off"]',
  "header",
  "nav",
  "footer",
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  "[data-radix-popper-content-wrapper]",
  "[data-sonner-toast]",
  '[aria-hidden="true"]',
].join(", ")

/** Heuristic: does this element look like a card container? */
function looksLikeCard(el: HTMLElement): boolean {
  const cls = el.getAttribute("class")
  if (!cls) return false
  const tokens = cls.split(/\s+/)
  const rounded = tokens.some(
    (t) => /^rounded-(sm|md|lg|xl|2xl|3xl)$/.test(t) || t.startsWith("rounded-[")
  )
  if (!rounded) return false
  const surface = tokens.some(
    (t) =>
      t === "border" ||
      t.startsWith("border-") ||
      t.startsWith("bg-card") ||
      t.startsWith("card-premium") ||
      t.startsWith("shadow-premium")
  )
  return surface
}

/** Inject the spotlight + glow-ring overlay spans (idempotent). */
function ensureOverlays(el: HTMLElement) {
  if (!el.querySelector(":scope > .gx-fx-spot")) {
    const spot = document.createElement("span")
    spot.className = "gx-fx-spot"
    spot.setAttribute("aria-hidden", "true")
    el.insertBefore(spot, el.firstChild)
  }
  if (!el.querySelector(":scope > .gx-fx-ring")) {
    const ring = document.createElement("span")
    ring.className = "gx-fx-ring"
    ring.setAttribute("aria-hidden", "true")
    el.insertBefore(ring, el.firstChild)
  }
}

/** Scan the document for card-like containers and tag them. */
function scan(doc: Document) {
  const all = doc.querySelectorAll<HTMLElement>(
    "div, a, article, section, li, span"
  )
  const candidates: HTMLElement[] = []
  for (const el of all) {
    if (el.classList.contains("gx-fx")) continue
    if (el.closest(SKIP_SELECTOR)) continue
    if (!looksLikeCard(el)) continue
    const cs = window.getComputedStyle(el)
    if (cs.display === "none" || cs.visibility === "hidden") continue
    if (cs.position !== "static" && cs.position !== "relative") continue
    const r = el.getBoundingClientRect()
    if (r.width < MIN_W || r.height < MIN_H) continue
    if (r.width > MAX_W || r.height > MAX_H) continue
    candidates.push(el)
  }
  // Keep only the OUTERMOST card in a nested chain, so inner tiles do
  // not fight the wrapper for tilt ownership.
  for (const el of candidates) {
    let nested = false
    for (const other of candidates) {
      if (other !== el && other.contains(el)) {
        nested = true
        break
      }
    }
    if (nested) continue
    el.classList.add("gx-fx", "gx-fx-glow")
    ensureOverlays(el)
  }
}

export function CardFx() {
  React.useEffect(() => {
    // No mount-time hover guard here: hybrid touch-laptops and some
    // headless environments report (hover: none) even for fine pointers.
    // Instead, handlers below gate on e.pointerType === "mouse" per event.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const state: {
      active: HTMLElement | null
      raf: number
      ev: PointerEvent | null
    } = { active: null, raf: 0, ev: null }

    function applyMove() {
      state.raf = 0
      const el = state.active
      const ev = state.ev
      if (!el || !ev) return
      const r = el.getBoundingClientRect()
      const px = (ev.clientX - r.left) / r.width - 0.5
      const py = (ev.clientY - r.top) / r.height - 0.5
      el.style.setProperty("--sx", `${ev.clientX - r.left}px`)
      el.style.setProperty("--sy", `${ev.clientY - r.top}px`)
      if (!reduceMotion.matches) {
        el.style.transform = `perspective(900px) rotateX(${(-py * TILT_RX).toFixed(2)}deg) rotateY(${(px * TILT_RY).toFixed(2)}deg)`
      }
    }

    function reset(el: HTMLElement | null) {
      if (!el) return
      el.style.transform = ""
      el.style.willChange = ""
    }

    let scanTimer: number | undefined
    function scheduleScan() {
      if (scanTimer) window.clearTimeout(scanTimer)
      scanTimer = window.setTimeout(() => scan(document), 600)
    }

    // Initial scan + a late pass once fonts/images have settled.
    scheduleScan()
    const late = window.setTimeout(() => scan(document), 1800)

    // Rescan after SPA view swaps / lazy content / filtered lists.
    const mo = new MutationObserver(scheduleScan)
    mo.observe(document.body, { childList: true, subtree: true })

    const onOver = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return
      const t = e.target as Element | null
      if (!t || typeof t.closest !== "function") return
      const card = t.closest<HTMLElement>(".gx-fx")
      if (card === state.active) return
      if (state.active) reset(state.active)
      state.active = card
      if (card) card.style.willChange = "transform"
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return
      if (!state.active) return
      state.ev = e
      if (!state.raf) state.raf = window.requestAnimationFrame(applyMove)
    }
    const onGone = () => {
      if (state.active) {
        reset(state.active)
        state.active = null
      }
    }
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) onGone()
    }

    document.addEventListener("pointerover", onOver, { passive: true })
    document.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerout", onOut, { passive: true })
    window.addEventListener("blur", onGone)
    document.addEventListener("visibilitychange", onGone)

    return () => {
      window.clearTimeout(scanTimer)
      window.clearTimeout(late)
      mo.disconnect()
      if (state.raf) window.cancelAnimationFrame(state.raf)
      onGone()
      document.removeEventListener("pointerover", onOver)
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerout", onOut)
      window.removeEventListener("blur", onGone)
      document.removeEventListener("visibilitychange", onGone)
    }
  }, [])

  return null
}

export default CardFx
