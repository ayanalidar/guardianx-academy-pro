"use client"

import * as React from "react"
import { ArrowRight, Check, Copy, Sparkles, Timer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePageContent, getContentValue, getContent } from "@/lib/use-content"
import { useAppStore, type View } from "@/store/app-store"
import { cn } from "@/lib/utils"

/**
 * OfferPopup - CMS-managed promotional offer card shown to public visitors.
 *
 * Configured entirely from Content Studio → "Offer Popup" (CMS page
 * `offer-popup`, section `popup`). Falls back to the same defaults the seed
 * writes, so the popup works even before an admin seeds the rows.
 *
 * Behavior:
 *   - Appears `delaySeconds` after a public page loads (default 5s - instant
 *     popups spike bounce rate, so we let the visitor settle in first).
 *   - Frequency-capped via localStorage: once dismissed, hidden for
 *     `frequencyDays` (default 7) - unless the campaign signature changes
 *     (headline / coupon / deadline edited), which re-arms it for everyone.
 *   - Suppressed on verification surfaces (/verify, /cert/<slug>, cyber-quiz
 *     certificate pages) - employers and recruiters verifying credentials
 *     should never get sales popups.
 *   - Optional countdown chip when `endsAt` is set; an expired offer
 *     disables the popup entirely (data honesty - never advertise a dead deal).
 *   - Optional coupon chip with tap-to-copy; hidden while `couponCode` is
 *     empty so we never show a code that doesn't exist in Admin → Coupons.
 *   - CTA navigates inside the SPA (no reload) to a public view.
 */

const STORAGE_KEY = "gx-offer:dismissed-v1"

/** Views where the popup must never appear (verification / certificate surfaces). */
const SUPPRESSED_VIEWS = new Set<View["name"]>([
  "verify",
  "cert-landing",
  "cyber-quiz-certificate",
  "cyber-quiz-progress",
  "login",
])

/** Public flat views the CTA is allowed to target (validated against the
 *  View union so a typo in Content Studio can never crash navigation). */
const CTA_VIEWS = new Set<string>([
  "catalog", "pricing", "batches", "contact", "support", "learning-paths",
  "exams", "events", "blog", "instructors", "hiring", "cyber-quiz",
  "corporate-training", "institutions",
])

/** Defaults mirror the seed rows in src/lib/cms-seed.ts (page "offer-popup"). */
const DEFAULTS = {
  enabled: "true",
  delaySeconds: "5",
  frequencyDays: "7",
  badge: "LIMITED-TIME OFFER",
  headline: "Flat 20% OFF",
  headlineAccent: "all certification courses.",
  subtext:
    "Enroll this week and train with live mentors, hands-on labs and placement support. Limited seats - offer ends soon.",
  ctaLabel: "Explore Courses",
  ctaView: "catalog",
  couponCode: "",
  endsAt: "",
  skipLabel: "No thanks, maybe later",
}

type DismissRecord = { at: number; campaign: string }

function readDismissed(): DismissRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.at === "number" && typeof parsed.campaign === "string") {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeDismissed(record: DismissRecord) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // localStorage unavailable (private mode) - popup just shows more often.
  }
}

/** Parse `endsAt` into a timestamp. A bare YYYY-MM-DD is treated as the END
 *  of that day (local) so same-day offers don't expire at midnight UTC. */
function parseEndsAt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T23:59:59` : trimmed
  const ts = Date.parse(iso)
  return Number.isNaN(ts) ? null : ts
}

function formatRemaining(ms: number): string {
  const totalMin = Math.max(1, Math.floor(ms / 60_000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

export function OfferPopup() {
  const { data } = usePageContent("offer-popup")
  const navigate = useAppStore((s) => s.navigate)
  const viewName = useAppStore((s) => s.view.name)

  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [now, setNow] = React.useState(() => Date.now())

  // ---- Config (CMS values with seed-identical fallbacks) ------------------
  const rawEnabled = getContentValue<string | boolean>(data, "popup", "enabled", DEFAULTS.enabled)
  const enabled = rawEnabled === true || rawEnabled === "true"
  const delaySeconds = React.useMemo(() => {
    const n = parseInt(String(getContentValue(data, "popup", "delaySeconds", DEFAULTS.delaySeconds)), 10)
    return Number.isFinite(n) ? Math.min(60, Math.max(0, n)) : 5
  }, [data])
  const frequencyDays = React.useMemo(() => {
    const n = parseInt(String(getContentValue(data, "popup", "frequencyDays", DEFAULTS.frequencyDays)), 10)
    return Number.isFinite(n) ? Math.min(365, Math.max(0, n)) : 7
  }, [data])

  const badge = getContent(data, "popup", "badge", DEFAULTS.badge)
  const headline = getContent(data, "popup", "headline", DEFAULTS.headline)
  const headlineAccent = getContent(data, "popup", "headlineAccent", DEFAULTS.headlineAccent)
  const subtext = getContent(data, "popup", "subtext", DEFAULTS.subtext)
  const ctaLabel = getContent(data, "popup", "ctaLabel", DEFAULTS.ctaLabel)
  const ctaViewRaw = getContent(data, "popup", "ctaView", DEFAULTS.ctaView)
  const couponCode = getContent(data, "popup", "couponCode", DEFAULTS.couponCode).trim()
  const endsAtRaw = getContent(data, "popup", "endsAt", DEFAULTS.endsAt)
  const skipLabel = getContent(data, "popup", "skipLabel", DEFAULTS.skipLabel)

  const endsAt = React.useMemo(() => parseEndsAt(endsAtRaw), [endsAtRaw])
  const expired = endsAt !== null && endsAt <= now

  // Changing any of these re-arms the popup for visitors who dismissed it.
  const campaign = React.useMemo(
    () => [headline, headlineAccent, couponCode, endsAtRaw].join("|"),
    [headline, headlineAccent, couponCode, endsAtRaw],
  )

  const suppressed = SUPPRESSED_VIEWS.has(viewName)

  // ---- Show timer ---------------------------------------------------------
  React.useEffect(() => {
    if (!enabled || suppressed || expired) return
    const t = setTimeout(() => {
      const dismissed = readDismissed()
      if (
        dismissed &&
        dismissed.campaign === campaign &&
        Date.now() - dismissed.at < frequencyDays * 24 * 60 * 60 * 1000
      ) {
        return
      }
      setNow(Date.now())
      setOpen(true)
    }, delaySeconds * 1000)
    return () => clearTimeout(t)
  }, [enabled, suppressed, expired, delaySeconds, frequencyDays, campaign, viewName])

  // Navigating onto a suppressed view closes the popup WITHOUT recording a
  // dismissal (the visitor never chose to dismiss it).
  React.useEffect(() => {
    if (suppressed && open) setOpen(false)
  }, [suppressed, open])

  // ---- Countdown ticker (only while open with a live deadline) ------------
  React.useEffect(() => {
    if (!open || endsAt === null || expired) return
    const iv = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(iv)
  }, [open, endsAt, expired])

  /** Record a dismissal (user-initiated or converted CTA). */
  const dismiss = React.useCallback(() => {
    writeDismissed({ at: Date.now(), campaign })
    setOpen(false)
  }, [campaign])

  const handleCta = React.useCallback(() => {
    const target = (CTA_VIEWS.has(ctaViewRaw) ? ctaViewRaw : "catalog") as View["name"]
    // Treat the tap as conversion: cap the popup like a dismissal.
    writeDismissed({ at: Date.now(), campaign })
    setOpen(false)
    navigate({ name: target } as View)
  }, [ctaViewRaw, campaign, navigate])

  const handleCopy = React.useCallback(async () => {
    if (!couponCode) return
    try {
      await navigator.clipboard.writeText(couponCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked - the code is visible/selectable text anyway.
    }
  }, [couponCode])

  // Expired offers never render (no dead deals advertised).
  if (expired) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
        else setOpen(true)
      }}
    >
      <DialogContent
        showCloseButton
        className={cn(
          "max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl border border-emerald-500/25",
          "bg-[#060b09] p-0 text-left shadow-[0_0_90px_-20px_rgba(16,185,129,0.45)] sm:max-w-md",
        )}
        onInteractOutside={(e) => {
          // Keep the default behavior (dismiss) but avoid double-handling.
          e.preventDefault()
          dismiss()
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          dismiss()
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative p-6 sm:p-7">
          {badge ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-300">
              <Sparkles className="h-3 w-3" aria-hidden />
              {badge}
            </span>
          ) : null}

          <DialogTitle className="mt-4 text-2xl font-bold leading-tight text-white">
            {headline}{" "}
            {headlineAccent ? <span className="text-emerald-400">{headlineAccent}</span> : null}
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm leading-relaxed text-zinc-400">
            {subtext}
          </DialogDescription>

          {couponCode || (!expired && endsAt !== null) ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {couponCode ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={`Copy coupon code ${couponCode}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 px-3 py-2 font-mono text-sm text-emerald-300 transition-colors hover:bg-emerald-500/10"
                >
                  <span>{couponCode}</span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  )}
                </button>
              ) : null}
              {couponCode ? (
                <span className="text-[11px] text-zinc-500">{copied ? "Copied!" : "Tap to copy"}</span>
              ) : null}
              {!expired && endsAt !== null ? (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  {formatRemaining(endsAt - now)}
                </span>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCta}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {skipLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
