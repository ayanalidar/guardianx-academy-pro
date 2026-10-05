"use client"

/**
 * PhantomCertSample - marketing SAMPLE of the unified BLACKOPS phantom
 * certificate (the real design lives in views/certificates.tsx
 * CertificatePreviewModal + lib/certificate-pdf.ts). Any course page or
 * landing section can render an honest, clearly-labelled sample that is
 * pixel-faithful to what a learner actually receives.
 *
 * Sample-only conventions:
 *   - recipient defaults to "Your Name Here" (never a fake person)
 *   - credential ID is GX-CERT-<year>-SAMPLE (fails /verify lookups safely)
 *   - QR points at /verify so scanning does something real
 */

import * as React from "react"
import {
  Binary, Calendar, Cpu, Fingerprint, Hash, ShieldCheck, Terminal,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { ParticleLogo } from "@/components/platform/particle-logo"
import { INSTITUTE_REG_NO } from "@/lib/institute"
import { cn } from "@/lib/utils"

/** Deterministic pseudo-fingerprint (uppercase hex pairs) - same math as certificates.tsx. */
function hexFingerprint(seed: string, bytes = 22): string {
  let x = 0x9e3779b9
  let y = 0x85ebca6b
  for (let i = 0; i < seed.length; i++) {
    x = ((x ^ seed.charCodeAt(i)) * 0x01000193) >>> 0
    y = ((y + seed.charCodeAt(i) * (i + 7)) * 0x27d4eb2f) >>> 0
  }
  const out: string[] = []
  for (let i = 0; i < bytes; i++) {
    x = (x * 1664525 + 1013904223) >>> 0
    y = (y ^ (y << 13)) >>> 0
    out.push(((x ^ y) & 0xff).toString(16).padStart(2, "0").toUpperCase())
  }
  return out.join(" ")
}

/** Score dial - circular HUD gauge with centered percentage. */
function ScoreDial({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-12 sm:size-14">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="var(--doc-green, #22c55e)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          style={{ filter: "drop-shadow(0 0 4px rgba(34,197,94,0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm sm:text-base font-bold tabular-nums leading-none" style={{ color: "var(--doc-ink)" }}>
          {pct}%
        </span>
        <span className="text-[5px] sm:text-[6px] font-mono tracking-[0.2em]" style={{ color: "var(--doc-muted)" }}>
          SCORE
        </span>
      </div>
    </div>
  )
}

function CertChip({ tone, children }: { tone: "red" | "green"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 @5xl:px-2.5 @5xl:py-1 rounded-full border backdrop-blur-sm",
        tone === "green"
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-red-500/50 bg-red-500/10",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full shrink-0",
          tone === "green" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.9)]",
        )}
      />
      <span
        className={cn(
          "text-[6px] @xl:text-[7px] @5xl:text-[8px] font-mono uppercase tracking-[0.14em] whitespace-nowrap",
          tone === "green" ? "text-emerald-200" : "text-red-200",
        )}
      >
        {children}
      </span>
    </div>
  )
}

export interface PhantomCertSampleProps {
  /** Program / course title shown as the certificate subject. */
  title: string
  /** Issuing body rendered as "issued by ..." (default: GuardianX Academy). */
  certBody?: string
  /** Extra meta after certBody, e.g. ["40H", "Advanced Level"]. */
  meta?: string[]
  /** Sample recipient name (default: "Your Name Here"). */
  recipient?: string
  /** Sample final score (default: 94). */
  score?: number
  /** Signature name + title (defaults: GuardianX Academy / Course Instructor). */
  instructorName?: string
  instructorTitle?: string
  className?: string
}

export function PhantomCertSample({
  title,
  certBody,
  meta = [],
  recipient = "Your Name Here",
  score = 94,
  instructorName = "GuardianX Academy",
  instructorTitle = "Course Instructor",
  className,
}: PhantomCertSampleProps) {
  const year = new Date().getFullYear()
  const credentialId = `GX-CERT-${year}-SAMPLE`
  const hexline = hexFingerprint(credentialId, 26)
  const issuedLong = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/verify` : "https://academy.guardianx.cloud/verify"
  const body = certBody?.trim() || "GuardianX Academy"
  const metaLine = meta.filter(Boolean).join("  ·  ")

  return (
    <div className="@container w-full">
      {/* Flex column + min-h-[70.7cqw] (= 100cqw / 1.4142, the A4-landscape
          ratio) as a FLOOR: the paper keeps the exact document ratio whenever
          the content fits, and grows with its content (never clips the
          footer) when a narrow card needs more room. The flex-1 chain makes
          the decorative layers always cover the full paper. */}
      <div className={cn("gx-doc gx-theme-phantom gx-paper relative flex flex-col w-full min-h-[70.7cqw]", className)}>
      <div className="gx-guilloche flex-1 flex flex-col min-h-full w-full">
        <div className="gx-guilloche-inner flex-1 flex flex-col min-h-full w-full">
          <div className="gx-aurora-mesh gx-grain relative flex-1 min-h-full w-full overflow-hidden">
            <div className="gx-corner-glows" />

            {/* Particle-logo watermark - same red particle mark as the real
                certificate. Pinned at 50% / 53% exactly like the issued PDF
                (.wm.wm-dots) so it can never drift from the document centre. */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2 opacity-[0.26] w-[46%] max-w-[520px] aspect-square">
                <ParticleLogo
                  size={340}
                  particleCount={850}
                  interactive={false}
                  showGlow={false}
                  tint="rgb(255,59,59)"
                  className="aspect-square w-full! h-auto!"
                />
              </div>
              <div
                className="absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2 w-[48%] max-w-[540px] aspect-square rounded-full blur-[70px]"
                style={{ background: "radial-gradient(circle, rgba(225,29,46,0.14), transparent 65%)" }}
              />
            </div>

            <div className="gx-scanlines" />
            <div className="gx-hud-corners"><span /></div>

            {/* Content - sized with CONTAINER queries (@sm/@xl/@4xl/@5xl are
                card-width steps, not viewport steps) so the document scales
                with its own size: phone card < 384, grid card ~600 (@xl),
                modal ~900 (@4xl), full-width course page 1100+ (@5xl). */}
            <div className="relative z-10 flex-1 flex flex-col items-center text-center px-4 @sm:px-8 @xl:px-10 @5xl:px-14 py-3 @sm:py-5 @xl:py-6 @5xl:py-8">
              {/* Top band: classification chips top-right (mirrors the issued
                  PDF's .chiprow). In-flow so it can never collide with the
                  centred crest, whatever the card width. The institute reg no
                  lives in the bottom verification strip. */}
              <div className="self-end z-20 flex items-center gap-1.5 @5xl:gap-2">
                <CertChip tone="green">
                  <ShieldCheck className="h-2.5 w-2.5 @5xl:h-3 @5xl:w-3" /> Verified credential
                </CertChip>
                <CertChip tone="red">
                  <Fingerprint className="h-2.5 w-2.5 @5xl:h-3 @5xl:w-3" /> GX blackops clearance
                </CertChip>
              </div>

              {/* Header: centered ring logo + institute brand line - the issued
                  PDF's .logo-ring + .brand stack, so the sample leads with the
                  same centred crest as the document learners actually receive. */}
              <div
                className="mt-1 size-9 @sm:size-11 @xl:size-14 @4xl:size-16 @5xl:size-20 shrink-0 rounded-full border flex items-center justify-center"
                style={{
                  borderColor: "color-mix(in oklab, var(--doc-gold) 60%, transparent)",
                  background: "var(--doc-panel)",
                  boxShadow:
                    "0 0 0 4px color-mix(in oklab, var(--doc-gold) 12%, transparent), 0 0 20px rgba(225,29,46,0.3)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/guardianx-logo-v2.png"
                  alt="GuardianX Academy"
                  className="h-6 @sm:h-7 @xl:h-10 @4xl:h-12 @5xl:h-14 w-auto"
                  style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 6px rgba(225,29,46,0.45))" }}
                />
              </div>
              <p
                className="mt-1 @sm:mt-1.5 @xl:mt-2 text-[6px] @sm:text-[7px] @xl:text-[8px] @5xl:text-[10px] font-mono tracking-[0.34em]"
                style={{ color: "var(--doc-muted)" }}
              >
                GUARDIANX ACADEMY&nbsp;&nbsp;·&nbsp;&nbsp;CYBER DEFENSE INSTITUTE
              </p>

              {/* Terminal readout - full-width document tier only (the PDF's
                  .terminal line); cramped grids drop it to protect the layout. */}
              <div className="mt-1 @5xl:mt-1.5 hidden @5xl:flex items-center gap-1.5 max-w-full overflow-hidden">
                <Terminal className="h-2.5 w-2.5 @5xl:h-3 @5xl:w-3 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
                <span className="gx-hexline truncate text-[7px]! @5xl:text-[10px]!" style={{ color: "var(--doc-muted)" }}>
                  <span style={{ color: "var(--doc-accent-1)" }}>root@gx:~$</span>{" "}
                  guardianx issue --recipient &quot;{recipient}&quot; --score {score}%{" "}
                  <span style={{ color: "var(--doc-green, #22c55e)" }}>--verified ✓</span>
                </span>
              </div>

              {/* Kicker + wordmark - the issued PDF's "· OF COMPLETION · /
                  CERTIFICATE" stack (hidden on tiny cards to protect the layout) */}
              <p
                className="mt-1.5 @xl:mt-2 hidden @sm:block text-[6px] @xl:text-[7px] @5xl:text-[11px] font-mono tracking-[0.5em] pl-[0.5em] uppercase"
                style={{ color: "var(--doc-accent-3)" }}
              >
                · of completion ·
              </p>
              <h3
                className="mt-0.5 @sm:mt-1 hidden @sm:block text-sm @xl:text-xl @4xl:text-2xl @5xl:text-4xl font-bold tracking-[0.42em] pl-[0.42em] leading-none"
                style={{ color: "var(--doc-gold)" }}
              >
                CERTIFICATE
              </h3>

              {/* Recipient hero */}
              <p className="mt-1 @xl:mt-2 text-[6px] @xl:text-[8px] font-mono tracking-[0.4em]" style={{ color: "var(--doc-muted)" }}>
                THIS CERTIFICATE IS PROUDLY PRESENTED TO
              </p>
              <p
                className="gx-script text-lg @sm:text-xl @xl:text-3xl @4xl:text-4xl @5xl:text-5xl mt-0.5 @sm:mt-1 leading-tight"
                style={{ color: "var(--doc-ink)", textShadow: "0 0 24px rgba(225,29,46,0.35)" }}
              >
                {recipient}
              </p>
              <hr className="gx-gradient-rule w-40 @xl:w-64 @5xl:w-96 mt-0.5 @sm:mt-1.5" />

              {/* Course block */}
              <p className="mt-1 @sm:mt-1.5 @xl:mt-2 text-[6px] @xl:text-[8px] font-mono tracking-[0.3em] uppercase" style={{ color: "var(--doc-muted)" }}>
                for successfully completing the training operation
              </p>
              <h3 className="text-xs @xl:text-lg @4xl:text-xl @5xl:text-2xl font-bold tracking-tight leading-tight text-balance" style={{ color: "var(--doc-ink)" }}>
                {title}
              </h3>
              <p className="text-[7px] @xl:text-[10px] mt-0.5" style={{ color: "var(--doc-muted)" }}>
                issued by <span className="font-semibold" style={{ color: "var(--doc-accent-1)" }}>{body}</span>
                {metaLine && <span className="hidden sm:inline">{"  ·  "}{metaLine}</span>}
              </p>

              {/* Data HUD row: score · issue date · credential ID */}
              <div className="mt-2 @xl:mt-3 @5xl:mt-4 w-full max-w-lg flex items-center justify-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <ScoreDial value={score} />
                </div>
                <div className="h-8 w-px shrink-0" style={{ background: "var(--doc-line)" }} />
                <div className="text-left">
                  <p className="text-[5px] sm:text-[6px] font-mono tracking-[0.24em] uppercase flex items-center gap-1" style={{ color: "var(--doc-muted)" }}>
                    <Calendar className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> Issue date
                  </p>
                  <p className="text-[8px] @xl:text-[11px] font-semibold" style={{ color: "var(--doc-ink)" }}>{issuedLong}</p>
                </div>
                <div className="h-8 w-px shrink-0" style={{ background: "var(--doc-line)" }} />
                <div className="text-left min-w-0">
                  <p className="text-[5px] sm:text-[6px] font-mono tracking-[0.24em] uppercase flex items-center gap-1" style={{ color: "var(--doc-muted)" }}>
                    <Hash className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> Credential ID
                  </p>
                  <p className="text-[8px] @xl:text-[11px] font-mono font-bold truncate" style={{ color: "var(--doc-accent-2)" }}>
                    {credentialId}
                  </p>
                </div>
              </div>

              {/* Bottom: seal + signatures + QR */}
              <div className="mt-auto w-full flex items-end gap-2 sm:gap-4">
                <div className="relative shrink-0 hidden sm:flex flex-col items-center gap-1 mb-0.5">
                  <div className="gx-seal-phantom relative size-12 lg:size-14 rounded-full flex items-center justify-center">
                    <div className="absolute inset-1 rounded-full border border-dashed border-white/50" />
                    <ShieldCheck className="h-5 w-5 lg:h-6 lg:w-6 text-white/95" />
                  </div>
                  <p className="text-[5px] font-mono tracking-[0.24em] uppercase" style={{ color: "var(--doc-muted)" }}>
                    GX certified
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="gx-script text-xs sm:text-base italic leading-none mb-1 truncate" style={{ color: "var(--doc-ink)" }}>
                    {instructorName}
                  </div>
                  <div className="border-t pt-1" style={{ borderColor: "color-mix(in oklab, var(--doc-accent-1) 45%, transparent)" }}>
                    <p className="text-[6px] sm:text-[7px] font-mono uppercase tracking-[0.22em] truncate" style={{ color: "var(--doc-muted)" }}>
                      {instructorTitle || "Course Instructor"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0 gap-0.5">
                  <div
                    className="size-11 @xl:size-14 rounded-md bg-white p-1"
                    style={{ boxShadow: "0 0 0 1px var(--doc-line), 0 0 14px rgba(225,29,46,0.25)" }}
                  >
                    <QRCodeSVG value={verifyUrl} size={128} bgColor="#FFFFFF" fgColor="#0A0507" level="M" className="size-full" />
                  </div>
                  <p className="text-[5px] sm:text-[6px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--doc-muted)" }}>
                    Scan to verify
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="gx-script text-xs sm:text-base italic leading-none mb-1" style={{ color: "var(--doc-ink)" }}>
                    GuardianX Academy
                  </div>
                  <div className="border-t pt-1" style={{ borderColor: "color-mix(in oklab, var(--doc-accent-1) 45%, transparent)" }}>
                    <p className="text-[6px] sm:text-[7px] font-mono uppercase tracking-[0.22em]" style={{ color: "var(--doc-muted)" }}>
                      Program Director
                    </p>
                  </div>
                </div>
              </div>

              {/* Hex fingerprint strip */}
              <div className="w-full mt-1 sm:mt-1.5 pt-1 border-t flex items-center justify-center gap-2" style={{ borderColor: "var(--doc-line)" }}>
                <Binary className="h-2 w-2 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
                <span className="gx-hexline truncate max-w-[52ch]">SHA-256 {hexline}</span>
                <Cpu className="h-2 w-2 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
              </div>

              {/* Verification strip */}
              <div className="w-full mt-0.5 flex items-center justify-center gap-x-3 gap-y-0.5 flex-wrap" style={{ color: "var(--doc-muted)" }}>
                <span className="text-[6px] sm:text-[8px] font-mono">
                  REG <span style={{ color: "var(--doc-ink)" }}>{INSTITUTE_REG_NO}</span>
                </span>
                <span className="text-[6px] sm:text-[8px] font-mono">
                  ID <span style={{ color: "var(--doc-ink)" }}>{credentialId}</span>
                </span>
                <span className="text-[6px] sm:text-[8px] font-mono break-all max-w-[26ch] sm:max-w-none">
                  {verifyUrl}
                </span>
                <span className="text-[6px] sm:text-[8px] font-mono tracking-wider">
                  ISSUED {issuedLong}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
