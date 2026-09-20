"use client"

/**
 * certificate-pdf.ts — "Aurora Luxe" award-grade certificate document.
 *
 * Vector A4 LANDSCAPE certificate produced through the browser print pipeline
 * (same mechanism as before): we build a standalone HTML document, open it in
 * a print window and let the browser's "Save as PDF" render it. Every rule,
 * rosette ring, gradient band and glyph is HTML/CSS/inline-SVG, so the saved
 * PDF stays fully vector at any zoom/print DPI.
 *
 * Page anatomy:
 *  - ornate guilloché border: 1.2pt gold outer rule @8mm + 0.6pt inner rule
 *    @11mm with an engine-turned rosette (overlapping circle rows) clipped
 *    into the band between them, plus concentric-diamond corner ornaments
 *  - giant translucent shield watermark behind the text block
 *  - gold ring logo (real PNG when provided, vector shield fallback otherwise)
 *  - "OF COMPLETION" kicker + wide-tracked CERTIFICATE wordmark
 *  - script-style recipient name with a 3-colour gradient rule underneath
 *  - layered gold seal medal with ribbon tails (bottom-left)
 *  - two signature blocks with bezier squiggles + printed names
 *  - verification strip: QR code, certificate ID, verify URL, issue date
 *
 * Three themes: "aurora" (deep navy-violet, default), "ivory" (cream/gold,
 * print-classic) and "emerald" (deep green). All theming is CSS-variable
 * driven, mirroring the .gx-doc theme contract in globals.css.
 *
 * Fonts: system stacks only (no remote font fetches). The recipient name uses
 * a script/cursive stack with an elegant serif-italic fallback so the page
 * never looks broken when no script face is installed.
 */
import { api } from "@/lib/api"
import { buildLogoDotMatrixSvg } from "@/lib/logo-dots"

export type CertificatePdfTheme = "phantom" | "aurora" | "ivory" | "emerald"

export interface CertificatePdfOptions {
  /**
   * PNG data-URL of the GuardianX shield logo, drawn inside the 22mm gold
   * ring at top center. When omitted a vector shield monogram is drawn
   * instead (graceful fallback). Pass null to force the vector mark.
   */
  logoPngDataUrl?: string | null
  /**
   * PNG data-URL of the verification QR code for the bottom strip.
   *   - undefined (default) → a QR is generated in-browser from the verify
   *     URL (qrcode.react rasterised to a 512px PNG); falls back to a
   *     decorative placeholder if generation fails.
   *   - string → used as-is.   - null → no QR, placeholder only.
   */
  qrPngDataUrl?: string | null
  /** Visual theme. Default "aurora". */
  theme?: CertificatePdfTheme
  /**
   * Absolute verification URL (https://<host>/verify/<id>). Derived from
   * window.location.origin when omitted.
   */
  verifyUrl?: string | null
}

// ---------------------------------------------------------------------------
// theme assets for the inline SVGs (CSS vars cover the rest)
// ---------------------------------------------------------------------------
type ThemeAssets = {
  gold: string
  accent: string // rosette second row
  wm: string // watermark stroke
  sealInk: string
  sealRing: string
  sealRibbonA: string
  sealRibbonB: string
  squiggle: string
}

const THEME_ASSETS: Record<CertificatePdfTheme, ThemeAssets> = {
  phantom: {
    gold: "#E11D2E", // frame rules — signal red
    accent: "#F59E0B", // rosette second row — amber
    wm: "#FF3B3B", // fallback watermark stroke
    sealInk: "#2A0508",
    sealRing: "#7D0A16",
    sealRibbonA: "#7D0A16",
    sealRibbonB: "#F59E0B",
    squiggle: "#FF6B5E",
  },
  aurora: {
    gold: "#D4AF37",
    accent: "#22D3EE",
    wm: "#FFFFFF",
    sealInk: "#4A3405",
    sealRing: "#8C6A14",
    sealRibbonA: "#8B5CF6",
    sealRibbonB: "#E879F9",
    squiggle: "#C4B5FD",
  },
  ivory: {
    gold: "#B8860B",
    accent: "#8C6D1F",
    wm: "#1C1917",
    sealInk: "#5A3C05",
    sealRing: "#8C6A14",
    sealRibbonA: "#B8860B",
    sealRibbonB: "#D4AF37",
    squiggle: "#8C6D1F",
  },
  emerald: {
    gold: "#D4AF37",
    accent: "#2DD4BF",
    wm: "#ECFDF5",
    sealInk: "#3F2D06",
    sealRing: "#8C6A14",
    sealRibbonA: "#10B981",
    sealRibbonB: "#A3E635",
    squiggle: "#99F6E4",
  },
}

const SCRIPT_STACK =
  '"Segoe Script","Snell Roundhand","Brush Script MT","Lucida Handwriting","Apple Chancery","URW Chancery L",Georgia,"Times New Roman",serif'

const MONO_STACK =
  'ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace'

// A4 landscape in mm
const PAGE_W = 297
const PAGE_H = 210

// ---------------------------------------------------------------------------
// main export — signature is backward compatible: the options bag is optional
// ---------------------------------------------------------------------------
export async function downloadCertificatePDF(
  certificateId: string,
  options: CertificatePdfOptions = {},
) {
  try {
    const data = await api<{ certificate: any }>(`/api/certificates/${certificateId}/pdf`)
    const cert = data.certificate
    if (!cert) throw new Error("Certificate not found")

    const verifyUrl =
      options.verifyUrl ||
      (typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}/verify/${cert.certificateId}`
        : `/verify/${cert.certificateId}`)

    // undefined → auto-embed the real logo PNG; null → vector mark
    const logoPngDataUrl =
      options.logoPngDataUrl !== undefined
        ? options.logoPngDataUrl
        : await fetchLogoPngDataUrl()

    // undefined → auto-generate in-browser; null → explicitly no QR
    const qrPngDataUrl =
      options.qrPngDataUrl !== undefined ? options.qrPngDataUrl : await buildQrPngDataUrl(verifyUrl)

    const theme = options.theme ?? "phantom"

    // phantom: static particle-logo watermark built from the real brand PNG
    const logoDotsSvg =
      theme === "phantom"
        ? await buildLogoDotMatrixSvg({ step: 6, color: "#ff3b3b", opacity: 0.9 })
        : null

    const html = buildCertificateHTML(cert, {
      theme,
      logoPngDataUrl: logoPngDataUrl ?? null,
      qrPngDataUrl: qrPngDataUrl ?? null,
      verifyUrl,
      logoDotsSvg,
    })

    const w = window.open("", "_blank", "width=1180,height=880")
    if (!w) {
      alert("Please allow pop-ups to download your certificate.")
      return
    }
    w.document.write(html)
    w.document.close()
    // wait for data-URL images to decode, then trigger print
    w.onload = () => {
      setTimeout(() => {
        w.focus()
        w.print()
      }, 500)
    }
  } catch (e: any) {
    console.error("[cert-pdf]", e)
    alert("Failed to generate certificate PDF: " + e.message)
  }
}

// ---------------------------------------------------------------------------
// logo auto-embed — fetches the brand PNG and converts it to a data-URL so the
// standalone print window (document.write on about:blank) can render the REAL
// GuardianX logo. Returns null on any failure (vector fallback kicks in).
// ---------------------------------------------------------------------------
async function fetchLogoPngDataUrl(): Promise<string | null> {
  try {
    if (typeof fetch === "undefined" || typeof document === "undefined") return null
    const res = await fetch("/guardianx-logo-v2.png", { cache: "force-cache" })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn("[certificate-pdf] logo fetch failed — using vector mark", e)
    return null
  }
}

// ---------------------------------------------------------------------------
// QR generation — rasterises qrcode.react's QRCodeSVG to a crisp PNG data-URL
// (same data-URL mechanism invoice-pdf.ts relies on, but self-contained so
// callers don't have to pass one). Returns null on any failure.
// ---------------------------------------------------------------------------
async function buildQrPngDataUrl(value: string): Promise<string | null> {
  try {
    if (typeof document === "undefined") return null
    const [{ flushSync }, { createRoot }, React, { QRCodeSVG }] = await Promise.all([
      import("react-dom"),
      import("react-dom/client"),
      import("react"),
      import("qrcode.react"),
    ])

    const host = document.createElement("div")
    host.style.position = "fixed"
    host.style.opacity = "0"
    host.style.pointerEvents = "none"
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      flushSync(() => {
        root.render(
          React.createElement(QRCodeSVG, {
            value,
            size: 256,
            level: "M",
            bgColor: "#FFFFFF",
            fgColor: "#111111",
          }),
        )
      })
      let svg = host.querySelector("svg")?.outerHTML
      if (!svg) return null
      // standalone image decoding REQUIRES the xmlns attribute
      if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
      const img = new Image()
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
      await img.decode()
      const canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      return canvas.toDataURL("image/png")
    } finally {
      root.unmount()
      host.remove()
    }
  } catch (e) {
    console.warn("[certificate-pdf] QR generation failed — continuing without QR", e)
    return null
  }
}

// ---------------------------------------------------------------------------
// vector ornament helpers (all coordinates in mm — viewBox matches the page)
// ---------------------------------------------------------------------------

/** Engine-turned guilloché band + corner diamonds, drawn between the rules. */
function rosetteSvg(w: number, h: number, gold: string, accent: string): string {
  const mid = 9.5 // band centerline (rules at 8mm / 11mm)
  const F = (v: number) => v.toFixed(2)
  const positions = (span: number): number[] => {
    const start = mid
    const end = span - mid
    const n = Math.max(2, Math.round((end - start) / 6))
    const step = (end - start) / n
    return Array.from({ length: n + 1 }, (_, i) => start + i * step)
  }

  const goldRow: string[] = []
  const accentRow: string[] = []
  for (const y of [mid, h - mid]) {
    for (const x of positions(w)) goldRow.push(`<circle cx="${F(x)}" cy="${F(y)}" r="3"/>`)
    for (const x of positions(w)) accentRow.push(`<circle cx="${F(x + 3)}" cy="${F(y)}" r="2.5"/>`)
  }
  const ys = positions(h)
  for (const x of [mid, w - mid]) {
    for (const y of ys.slice(1, -1)) goldRow.push(`<circle cx="${F(x)}" cy="${F(y)}" r="3"/>`)
    for (const y of ys.slice(1, -1)) accentRow.push(`<circle cx="${F(x)}" cy="${F(y + 3)}" r="2.5"/>`)
  }

  // three concentric diamonds at each corner, just inside the inner rule
  const diamonds = [
    [17, 17],
    [w - 17, 17],
    [17, h - 17],
    [w - 17, h - 17],
  ]
    .map(
      ([cx, cy]) =>
        [4.4, 2.9, 1.5]
          .map(
            (d, i) =>
              `<path d="M ${F(cx)} ${F(cy - d)} L ${F(cx + d)} ${F(cy)} L ${F(cx)} ${F(cy + d)} L ${F(cx - d)} ${F(cy)} Z" fill="${i === 2 ? gold : "none"}" stroke="${gold}" stroke-width="${i === 2 ? 0.35 : 0.5}"/>`,
          )
          .join(""),
    )
    .join("")

  return `<svg class="rosette" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><clipPath id="gxBand" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="M 7.7 7.7 H ${F(w - 7.7)} V ${F(h - 7.7)} H 7.7 Z M 11.3 11.3 H ${F(w - 11.3)} V ${F(h - 11.3)} H 11.3 Z"/></clipPath></defs>
<g clip-path="url(#gxBand)" fill="none" stroke="${gold}" stroke-opacity="0.35" stroke-width="0.5">${goldRow.join("")}</g>
<g clip-path="url(#gxBand)" fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="0.4">${accentRow.join("")}</g>
<g>${diamonds}</g>
</svg>`
}

/** Giant translucent shield watermark. */
function shieldWatermarkSvg(color: string): string {
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="${color}" stroke-width="1">
<path d="M50 3 L89 18.5 V52 C89 75 71.5 93.5 50 99.5 C28.5 93.5 11 75 11 52 V18.5 Z"/>
<path d="M34.5 50 L46 61.5 L68 37.5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
}

/** Vector shield monogram drawn inside the gold ring when no PNG is passed. */
function logoFallbackSvg(color: string): string {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="${color}" stroke-width="5">
<path d="M50 8 L84 22 V52 C84 72 68 88 50 94 C32 88 16 72 16 52 V22 Z"/>
<path d="M36 50 L45 59 L66 38" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
}

/** Layered gold seal medal: ribbon tails + rings + shield glyph. */
function sealSvg(a: ThemeAssets): string {
  return `<svg viewBox="0 0 68 78" width="30mm" height="34.4mm" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path d="M27 44 L38 47 L32 74 L21 65 Z" fill="${a.sealRibbonA}"/>
<path d="M41 44 L30 47 L36 74 L47 65 Z" fill="${a.sealRibbonB}"/>
<circle cx="34" cy="32" r="23" fill="${a.gold}" fill-opacity="0.6" stroke="${a.gold}" stroke-width="0.8"/>
<circle cx="34" cy="32" r="20" fill="none" stroke="${a.sealRing}" stroke-width="0.6" stroke-dasharray="2.4 1.8"/>
<circle cx="34" cy="32" r="17.5" fill="${a.gold}" fill-opacity="0.9" stroke="${a.sealRing}" stroke-width="1"/>
<g transform="translate(34 32) scale(0.34) translate(-50 -50)" fill="${a.sealInk}">
<path d="M50 8 L84 22 V52 C84 72 68 88 50 94 C32 88 16 72 16 52 V22 Z"/>
</g>
<g transform="translate(34 33) scale(0.22) translate(-50 -52)" fill="none" stroke="${a.gold}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
<path d="M36 52 L46 62 L66 40"/>
</g>
</svg>`
}

/** Cursive-feel signature squiggle (bezier flourish + swash underline). */
function squiggleSvg(color: string): string {
  return `<svg viewBox="0 0 120 34" width="30mm" height="8.5mm" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke-linecap="round">
<path d="M6 26 C 18 6, 30 30, 44 16 S 66 4, 78 18 C 88 30, 104 22, 114 10" stroke="${color}" stroke-width="1.7" opacity="0.9"/>
<path d="M16 30.5 C 42 25, 80 25, 104 29.5" stroke="${color}" stroke-width="0.9" opacity="0.45"/>
</svg>`
}

/** Decorative QR placeholder (finder squares only — deliberately unscannable). */
function qrPlaceholderSvg(): string {
  return `<svg viewBox="0 0 40 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="#9CA3AF" stroke-width="1.4">
<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="25" y="3" width="12" height="12" rx="2"/><rect x="3" y="25" width="12" height="12" rx="2"/>
<path d="M25 25 h5 v5 h-5 Z M33 33 h4 M25 34 v3 M34 25 h3" stroke-width="1.6"/>
</svg>`
}

/** Deterministic pseudo-fingerprint (uppercase hex pairs) from a seed. */
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

// ---------------------------------------------------------------------------
// document builder (exported for visual verification scripts; the primary
// entry point remains downloadCertificatePDF)
// ---------------------------------------------------------------------------
export function buildCertificateHTML(
  cert: any,
  opts: {
    theme: CertificatePdfTheme
    logoPngDataUrl: string | null
    qrPngDataUrl: string | null
    verifyUrl: string
    logoDotsSvg?: string | null
  },
): string {
  const A = THEME_ASSETS[opts.theme]
  const isPhantom = opts.theme === "phantom"

  const recipient = escapeHtml(String(cert.user?.name ?? "GuardianX Student"))
  const courseTitle = escapeHtml(String(cert.course?.title ?? "Course Completion"))
  const certBody = escapeHtml(String(cert.course?.certBody || "GuardianX"))
  const category = escapeHtml(String(cert.course?.category ?? "")).trim()
  const level = escapeHtml(String(cert.course?.level ?? "")).trim()
  const instructorName = escapeHtml(String(cert.course?.instructor?.name ?? "GuardianX Academy"))
  const certificateId = escapeHtml(String(cert.certificateId ?? ""))
  const issuedDate = fmtLongDate(cert.issuedAt)
  const score = typeof cert.score === "number" ? Math.round(cert.score) : null
  const dist = score !== null ? distinction(score) : ""
  const verifyUrl = escapeHtml(opts.verifyUrl)

  const metaParts: string[] = []
  if (certBody) metaParts.push(`issued by <b>${certBody}</b>`)
  if (category) metaParts.push(category)
  if (level) metaParts.push(`${level} Level`)
  const metaLine = metaParts.join(" &nbsp;·&nbsp; ")

  const logoInner = opts.logoPngDataUrl
    ? `<img src="${opts.logoPngDataUrl}" alt="GuardianX logo" onerror="this.style.display='none'" />`
    : logoFallbackSvg(A.gold)
  const qrInner = opts.qrPngDataUrl
    ? `<img src="${opts.qrPngDataUrl}" alt="Verification QR code" onerror="this.style.display='none'" />`
    : qrPlaceholderSvg()

  const scoreLine =
    score !== null
      ? `<div class="score-line">final score ${score}%${dist ? ` &nbsp;·&nbsp; ${dist}` : ""}</div>`
      : ""

  // phantom: particle-dot watermark from the real logo (fallback: shield stroke)
  const wmInner = opts.logoDotsSvg
    ? `<div class="wm wm-dots">${opts.logoDotsSvg}</div>`
    : `<div class="wm">${shieldWatermarkSvg(A.wm)}</div>`

  // phantom: terminal command readout
  const terminalLine = isPhantom
    ? `<div class="terminal"><b>root@gx:~$</b> guardianx issue --recipient &quot;${recipient}&quot;${score !== null ? ` --score ${score}%` : ""} <s>--verified ✓</s></div>`
    : ""

  // phantom: classification chips (top-right)
  const chipRow = isPhantom
    ? `<div class="chiprow"><span class="chipx green">✓ verified credential</span><span class="chipx red">gx blackops clearance</span></div>`
    : ""

  // phantom: SHA-256 fingerprint band above the verification strip
  const hexBand = isPhantom
    ? `<div class="hexband"><span class="hexline">SHA-256 ${hexFingerprint(String(cert.certificateId ?? ""), 22)}</span></div>`
    : ""

  const brandWordmark = isPhantom
    ? `<div class="brand">GUARDIANX ACADEMY &nbsp;·&nbsp; CYBER DEFENSE INSTITUTE</div>`
    : `<div class="brand">GUARDIANX ACADEMY &nbsp;·&nbsp; SECURE · LEARN · DEFEND</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>GuardianX Certificate — ${recipient}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 landscape; margin: 0; }
  html, body { width: 100%; }
  body {
    background: #05030c; display: flex; justify-content: center; padding: 18px 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  @media print { body { background: #fff; padding: 0; display: block; } }

  /* ============ theme contract (mirrors .gx-doc in globals.css) ============ */
  .cert {
    --bg-a: #0B0716; --bg-b: #150B33;
    --acc1: #8B5CF6; --acc2: #22D3EE; --acc3: #E879F9;
    --gold: #D4AF37; --gold-soft: rgba(212, 175, 55, 0.55);
    --ink: #F8FAFC; --muted: rgba(248, 250, 252, 0.62);
    --glow1: rgba(139, 92, 246, 0.17); --glow2: rgba(34, 211, 238, 0.10); --glow3: rgba(232, 121, 249, 0.11);
    --band: rgba(6, 4, 16, 0.72); --band-line: rgba(255, 255, 255, 0.14);
    --chip: rgba(255, 255, 255, 0.05); --chip-halo: rgba(212, 175, 55, 0.14);
  }
  .cert.theme-ivory {
    --bg-a: #FDF9EE; --bg-b: #F6EEDB;
    --acc1: #B8860B; --acc2: #8C6D1F; --acc3: #D4AF37;
    --gold: #B8860B; --gold-soft: rgba(184, 134, 11, 0.55);
    --ink: #1C1917; --muted: rgba(28, 25, 23, 0.62);
    --glow1: rgba(184, 134, 11, 0.12); --glow2: rgba(140, 109, 31, 0.08); --glow3: rgba(212, 175, 55, 0.12);
    --band: #FFFDF6; --band-line: rgba(28, 25, 23, 0.22);
    --chip: rgba(184, 134, 11, 0.08); --chip-halo: rgba(184, 134, 11, 0.16);
  }
  .cert.theme-emerald {
    --bg-a: #04150F; --bg-b: #07271B;
    --acc1: #10B981; --acc2: #2DD4BF; --acc3: #A3E635;
    --gold: #D4AF37; --gold-soft: rgba(212, 175, 55, 0.55);
    --ink: #ECFDF5; --muted: rgba(236, 253, 245, 0.62);
    --glow1: rgba(16, 185, 129, 0.14); --glow2: rgba(45, 212, 191, 0.10); --glow3: rgba(163, 230, 53, 0.08);
    --band: rgba(2, 12, 8, 0.72); --band-line: rgba(236, 253, 245, 0.16);
  }
  .cert.theme-phantom {
    --bg-a: #0A0507; --bg-b: #170709;
    --acc1: #E11D2E; --acc2: #F59E0B; --acc3: #FF5A4E;
    --gold: #E11D2E; --gold-soft: rgba(225, 29, 46, 0.55);
    --ink: #FAF7F5; --muted: rgba(250, 247, 245, 0.62);
    --glow1: rgba(225, 29, 46, 0.17); --glow2: rgba(245, 158, 11, 0.08); --glow3: rgba(255, 90, 78, 0.11);
    --band: rgba(8, 4, 5, 0.78); --band-line: rgba(255, 255, 255, 0.14);
    --chip: rgba(255, 255, 255, 0.05); --chip-halo: rgba(225, 29, 46, 0.14);
    --green: #22C55E;
  }

  /* ============ page ============ */
  .cert {
    position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; overflow: hidden;
    color: var(--ink);
    font-family: Georgia, 'Times New Roman', serif;
    background:
      radial-gradient(130mm 90mm at 88% -8%, var(--glow1), transparent 62%),
      radial-gradient(120mm 85mm at -8% 42%, var(--glow2), transparent 58%),
      radial-gradient(130mm 95mm at 55% 115%, var(--glow3), transparent 58%),
      linear-gradient(180deg, var(--bg-a) 0%, var(--bg-b) 100%);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  @media screen { .cert { border-radius: 6px; box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55); } }

  /* fine noise grain — kills gradient banding */
  .grain {
    position: absolute; inset: 0; opacity: 0.16; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.06'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 120px 120px;
  }

  /* ============ guilloché border ============ */
  .frame-outer { position: absolute; inset: 8mm; border: 1.2pt solid var(--gold); border-radius: 2.5mm; pointer-events: none; }
  .frame-inner { position: absolute; inset: 11mm; border: 0.6pt solid var(--gold-soft); border-radius: 1.5mm; pointer-events: none; }
  svg.rosette { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

  /* ============ watermark ============ */
  .wm {
    position: absolute; left: 50%; top: 53%; width: 120mm; height: 120mm;
    transform: translate(-50%, -50%); opacity: 0.06; pointer-events: none;
  }
  /* static particle-logo dots version (phantom) — brighter than the stroke one */
  .wm.wm-dots { width: 132mm; height: 132mm; opacity: 0.17; }

  /* ============ phantom BLACKOPS overlays ============ */
  .scanlines {
    display: none;
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background: repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,0.20) 2px 3px);
    opacity: 0.4;
  }
  .theme-phantom .scanlines { display: block; }
  .hud { display: none; position: absolute; inset: 14mm; pointer-events: none; z-index: 3; }
  .theme-phantom .hud { display: block; }
  .hud i {
    position: absolute; width: 8mm; height: 8mm; border: 0 solid var(--acc1); opacity: 0.9;
  }
  .hud i:nth-child(1) { top: 0; left: 0; border-top-width: 2.5pt; border-left-width: 2.5pt; }
  .hud i:nth-child(2) { top: 0; right: 0; border-top-width: 2.5pt; border-right-width: 2.5pt; }
  .hud i:nth-child(3) { bottom: 0; left: 0; border-bottom-width: 2.5pt; border-left-width: 2.5pt; }
  .hud i:nth-child(4) { bottom: 0; right: 0; border-bottom-width: 2.5pt; border-right-width: 2.5pt; }
  .terminal {
    font-family: ${MONO_STACK}; font-size: 6.4pt; letter-spacing: 0.14em;
    color: var(--muted); margin-top: 1.8mm; white-space: nowrap; overflow: hidden;
    max-width: 220mm;
  }
  .terminal b { color: var(--acc1); font-weight: 700; }
  .terminal s { color: var(--green, #22C55E); text-decoration: none; }
  .hexline {
    font-family: ${MONO_STACK}; font-size: 5.6pt; letter-spacing: 0.16em;
    color: color-mix(in srgb, var(--acc1) 46%, transparent);
    white-space: nowrap; overflow: hidden;
  }
  .hexband {
    position: absolute; left: 20mm; right: 20mm; bottom: 31.5mm;
    display: flex; align-items: center; justify-content: center; gap: 3mm;
    pointer-events: none;
  }
  .hexband::before, .hexband::after {
    content: ""; flex: 1; height: 0.4pt; background: var(--band-line);
  }
  .chiprow {
    display: flex; gap: 2.2mm; justify-content: flex-end;
    position: absolute; top: 15mm; right: 16mm;
  }
  .chipx {
    font-family: ${MONO_STACK}; font-size: 5.4pt; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 1.1mm 2.6mm; border-radius: 10mm; white-space: nowrap;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .chipx.green { color: #86EFAC; border: 0.5pt solid rgba(34, 197, 94, 0.55); background: rgba(34, 197, 94, 0.10); }
  .chipx.red { color: #FCA5A5; border: 0.5pt solid rgba(225, 29, 46, 0.55); background: rgba(225, 29, 46, 0.12); }

  /* ============ header ============ */
  .content {
    position: absolute; inset: 14mm 16mm 0; display: flex; flex-direction: column;
    align-items: center; text-align: center;
  }
  .logo-ring {
    width: 22mm; height: 22mm; border-radius: 50%;
    border: 0.8pt solid var(--gold); background: var(--chip);
    box-shadow: 0 0 0 1.4mm var(--chip-halo);
    display: flex; align-items: center; justify-content: center;
  }
  .logo-ring img { width: 16.5mm; height: 16.5mm; object-fit: contain; border-radius: 50%; background: transparent; }
  .theme-phantom .logo-ring img { filter: brightness(0) invert(1); }
  .logo-ring svg { width: 13mm; height: 13mm; }
  .brand { font-family: ${MONO_STACK}; font-size: 7.5pt; letter-spacing: 0.34em; color: var(--muted); margin-top: 2.6mm; }
  .kicker { font-family: ${MONO_STACK}; font-size: 9.5pt; letter-spacing: 0.5em; padding-left: 0.5em; color: var(--acc2); text-transform: uppercase; margin-top: 3.6mm; }
  .wordmark { font-size: 31pt; font-weight: 700; letter-spacing: 0.42em; padding-left: 0.42em; color: var(--gold); line-height: 1.05; margin-top: 1.4mm; }

  /* ============ recipient ============ */
  .presented { margin-top: 6mm; }
  .presented-label { font-family: ${MONO_STACK}; font-size: 7pt; letter-spacing: 0.32em; color: var(--muted); }
  .recipient {
    font-family: ${SCRIPT_STACK}; font-style: italic; font-weight: 600;
    font-size: 15.5mm; line-height: 1.22; color: var(--ink);
    margin-top: 2.4mm; max-width: 212mm;
  }
  .grad-rule {
    width: 60%; height: 0.8mm; border-radius: 1mm; margin: 3.2mm auto 0;
    background: linear-gradient(90deg, var(--acc1), var(--acc2), var(--acc3)); opacity: 0.9;
  }

  /* ============ body ============ */
  .body-block { margin-top: 5.4mm; }
  .body-kicker { font-family: ${MONO_STACK}; font-size: 7pt; letter-spacing: 0.3em; color: var(--muted); text-transform: uppercase; }
  .course { font-size: 16.5pt; font-weight: 700; letter-spacing: 0.02em; color: var(--ink); margin-top: 1.6mm; }
  .issuer { font-size: 9.5pt; color: var(--muted); margin-top: 1.8mm; }
  .issuer b { color: var(--gold); font-weight: 600; }
  .score-line { font-family: ${MONO_STACK}; font-size: 7.5pt; letter-spacing: 0.22em; color: var(--acc2); text-transform: uppercase; margin-top: 2.2mm; }

  /* ============ seal ============ */
  .seal { position: absolute; left: 16mm; bottom: 34mm; width: 30mm; pointer-events: none; }

  /* ============ signatures ============ */
  .sigs { position: absolute; left: 58mm; right: 16mm; bottom: 37mm; display: flex; gap: 12mm; }
  .sig { flex: 1; text-align: center; }
  .sig-squiggle { display: block; margin: 0 auto 0.8mm; }
  .sig-name { font-family: ${SCRIPT_STACK}; font-style: italic; font-size: 13pt; color: var(--ink); line-height: 1.1; }
  .sig-rule { border-top: 0.6pt solid var(--gold-soft); margin: 1.8mm 6mm 0; padding-top: 1.6mm; }
  .sig-role { font-family: ${MONO_STACK}; font-size: 6.5pt; letter-spacing: 0.3em; color: var(--muted); text-transform: uppercase; }

  /* ============ verification strip ============ */
  .vstrip {
    position: absolute; left: 14mm; right: 14mm; bottom: 14mm; height: 16mm;
    border-radius: 3mm; background: var(--band); border: 0.5pt solid var(--band-line);
    display: flex; align-items: center; gap: 5mm; padding: 0 6mm;
  }
  .vqr {
    width: 12mm; height: 12mm; border-radius: 1.6mm; background: #fff;
    display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
  }
  .vqr img { width: 10.8mm; height: 10.8mm; display: block; }
  .vcell { display: flex; flex-direction: column; gap: 1.1mm; min-width: 0; }
  .vlabel { font-family: ${MONO_STACK}; font-size: 5.8pt; letter-spacing: 0.24em; color: var(--muted); text-transform: uppercase; white-space: nowrap; }
  .vvalue { font-family: ${MONO_STACK}; font-size: 7.6pt; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vvalue.small { font-size: 6.6pt; }
  .vsep { width: 0.4pt; align-self: stretch; background: var(--band-line); margin: 1.5mm 0; flex-shrink: 0; }
  /* light bands need darker micro-labels for print legibility */
  .theme-ivory .vlabel { color: rgba(28, 25, 23, 0.78); }
  .theme-ivory .vvalue { color: #1C1917; }
</style>
</head>
<body>
<div class="cert theme-${opts.theme}">
  <div class="grain"></div>
  ${rosetteSvg(PAGE_W, PAGE_H, A.gold, A.accent)}
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  ${wmInner}
  ${chipRow}

  <div class="content">
    <div class="logo-ring">${logoInner}</div>
    ${brandWordmark}
    ${terminalLine}
    <div class="kicker">&middot; of completion &middot;</div>
    <h1 class="wordmark">CERTIFICATE</h1>

    <div class="presented">
      <div class="presented-label">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
      <div class="recipient">${recipient}</div>
      <div class="grad-rule"></div>
    </div>

    <div class="body-block">
      <div class="body-kicker">for successfully completing the professional course</div>
      <h2 class="course">${courseTitle}</h2>
      <div class="issuer">${metaLine}</div>
      ${scoreLine}
    </div>
  </div>

  <div class="seal">${sealSvg(A)}</div>

  <div class="sigs">
    <div class="sig">
      ${squiggleSvg(A.squiggle)}
      <div class="sig-name">${instructorName}</div>
      <div class="sig-rule"><div class="sig-role">Course Instructor</div></div>
    </div>
    <div class="sig">
      ${squiggleSvg(A.squiggle)}
      <div class="sig-name">GuardianX Academy</div>
      <div class="sig-rule"><div class="sig-role">Program Director</div></div>
    </div>
  </div>

  ${hexBand}

  <div class="scanlines"></div>
  <div class="hud"><i></i><i></i><i></i><i></i></div>

  <div class="vstrip">
    <div class="vqr">${qrInner}</div>
    <div class="vcell">
      <div class="vlabel">Certificate ID</div>
      <div class="vvalue">${certificateId}</div>
    </div>
    <div class="vsep"></div>
    <div class="vcell" style="flex: 1 1 0;">
      <div class="vlabel">Verify at</div>
      <div class="vvalue small">${verifyUrl}</div>
    </div>
    <div class="vsep"></div>
    <div class="vcell">
      <div class="vlabel">Date of issue</div>
      <div class="vvalue">${issuedDate}</div>
    </div>
  </div>
</div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// small shared helpers
// ---------------------------------------------------------------------------
function distinction(score: number): string {
  if (score >= 85) return "with distinction"
  if (score >= 65) return "with merit"
  return ""
}

function fmtLongDate(iso: unknown): string {
  const d = iso ? new Date(iso as string) : null
  if (!d || isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
