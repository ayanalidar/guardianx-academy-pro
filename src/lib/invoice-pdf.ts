/**
 * invoice-pdf.ts - native vector A4 invoice PDF (jsPDF), replaces the old
 * html2canvas screenshot pipeline (raster quality, dark-theme card floating
 * in the middle of a landscape page).
 *
 * Everything is drawn with jsPDF primitives: text stays razor-sharp at any
 * zoom/print DPI, the document fills the full A4 portrait page.
 *
 * TWO THEMES:
 *  - "dark" - the aurora glass "screen style": full-page deep indigo/violet
 *              aurora gradient, frosted glass panels (translucent white fills
 *              with hairline borders), cyan-violet-fuchsia accent bars, soft
 *              radial glow orbs. Mirrors the on-screen Invoice Generator look.
 *              Best for sharing/emailing (heavy for physical printing).
 *  - "light" - print-friendly white paper invoice (ink-safe).
 *
 * Runs in the browser (QR data-URL passed in) and in Node (qrPngDataUrl:
 * null) for visual verification scripts.
 *
 * Fonts: Inter (Regular/Medium/Bold) is committed to /public/fonts and
 * embedded at export time so the ₹ symbol renders (jsPDF's built-in fonts
 * are WinAnsi-only and have no U+20B9). If the files can't be loaded we
 * degrade gracefully to Helvetica + "Rs." substitution.
 */
import { jsPDF } from "jspdf"

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue"

export interface InvoicePdfItem {
  description: string
  quantity: number
  unitPrice: number
  icon?: string // "training" | "lab" | "cert" | "workshop"
}

export interface InvoicePdfData {
  number: string
  status: InvoiceStatus
  issueDate: string
  dueDate?: string | null
  currency: string
  clientName: string
  clientOrg?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  clientAddress?: string | null
  items: InvoicePdfItem[]
  discountRate: number
  taxRate: number
  roundingAdjustment: number
  gstSplit: boolean
  notes?: string | null
  terms?: string | null
  bankName?: string | null
  accountName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  upiId?: string | null
}

export interface InvoicePdfOptions {
  /** PNG data-URL of the UPI QR code (browser passes one; Node passes null). */
  qrPngDataUrl?: string | null
  /** PNG data-URL of the GuardianX shield logo (browser passes one; Node scripts may read the file directly). */
  logoPngDataUrl?: string | null
  /** "dark" = cyber screen style, "light" = print-friendly paper style. */
  theme?: InvoiceTheme
  /** Injectable font loader - browser uses fetch(), Node scripts use fs. */
  loadFontFile?: (path: string) => Promise<ArrayBuffer>
}

export type InvoiceTheme = "light" | "dark"

// ---------------------------------------------------------------------------
// palettes
// ---------------------------------------------------------------------------
type RGB = [number, number, number]

type Palette = {
  headerLeft: RGB
  headerRight: RGB
  accentA: RGB
  accentB: RGB
  accentC: RGB
  violetDark: RGB
  violet: RGB
  violetSoft: RGB
  ink: RGB
  sub: RGB
  faint: RGB
  line: RGB
  rowLine: RGB
  zebra: RGB
  violetTint: RGB
  avatarBorder: RGB
  white: RGB
  rose: RGB
}

const C_BASE: Palette = {
  headerLeft: [40, 20, 74], // #28144A
  headerRight: [16, 10, 30], // #100A1E
  accentA: [124, 58, 237], // violet-600
  accentB: [217, 70, 239], // fuchsia-500
  accentC: [34, 211, 238], // cyan-400
  violetDark: [46, 16, 101], // #2E1065 table header / total pill
  violet: [124, 58, 237],
  violetSoft: [196, 181, 253], // #C4B5FD
  ink: [24, 24, 27], // zinc-900
  sub: [82, 82, 91], // zinc-600
  faint: [113, 113, 122], // zinc-500
  line: [228, 228, 231], // zinc-200
  rowLine: [238, 240, 244],
  zebra: [250, 249, 255],
  violetTint: [245, 243, 255],
  avatarBorder: [221, 214, 254], // violet-200
  white: [255, 255, 255],
  rose: [225, 29, 72],
}

const C_DARK: Palette = {
  headerLeft: [38, 25, 84], // deep indigo
  headerRight: [16, 11, 36],
  accentA: [139, 92, 246], // violet-500 (brighter on dark)
  accentB: [232, 121, 249], // fuchsia-400
  accentC: [34, 211, 238], // cyan-400
  violetDark: [70, 44, 140], // violet panel tint
  violet: [178, 156, 255], // labels - brighter for contrast on glass
  violetSoft: [210, 196, 255],
  ink: [248, 250, 252], // near-white body text
  sub: [199, 206, 220], // slate-300-ish
  faint: [150, 159, 178],
  line: [58, 50, 84], // violet-gray hairline
  rowLine: [64, 56, 92],
  zebra: [38, 28, 66], // deep violet row tint
  violetTint: [52, 32, 104], // avatar fill
  avatarBorder: [139, 92, 246], // violet-500 ring
  white: [255, 255, 255],
  rose: [251, 113, 133], // rose-400
}

const STATUS_COLOR: Record<InvoiceStatus, RGB> = {
  Draft: [113, 113, 122],
  Sent: [8, 145, 178],
  Paid: [16, 185, 129],
  Overdue: [244, 63, 94],
}

// brighter variants that stay legible as watermark/glow on the dark page
const STATUS_COLOR_DARK: Record<InvoiceStatus, RGB> = {
  Draft: [161, 161, 170],
  Sent: [34, 211, 238],
  Paid: [52, 211, 153],
  Overdue: [251, 113, 133],
}

const ITEM_TAG: Record<string, { letter: string; color: RGB; tint: RGB }> = {
  training: { letter: "T", color: [124, 58, 237], tint: [245, 243, 255] },
  lab: { letter: "L", color: [8, 145, 178], tint: [236, 254, 255] },
  cert: { letter: "C", color: [217, 119, 6], tint: [255, 251, 235] },
  workshop: { letter: "W", color: [5, 150, 105], tint: [236, 253, 245] },
}

// neon tags for the dark theme: bright glyph on a deep tinted chip
const ITEM_TAG_DARK: Record<string, { letter: string; color: RGB; tint: RGB }> = {
  training: { letter: "T", color: [196, 181, 253], tint: [53, 33, 92] },
  lab: { letter: "L", color: [103, 232, 249], tint: [21, 47, 56] },
  cert: { letter: "C", color: [252, 211, 77], tint: [56, 42, 15] },
  workshop: { letter: "W", color: [110, 231, 183], tint: [13, 46, 38] },
}

// ---------------------------------------------------------------------------
// currency helpers
// ---------------------------------------------------------------------------
const CURRENCY: Record<string, { locale: string; symbol: string; name: string; sub: string }> = {
  INR: { locale: "en-IN", symbol: "₹", name: "Rupees", sub: "Paise" },
  USD: { locale: "en-US", symbol: "$", name: "US Dollars", sub: "Cents" },
  EUR: { locale: "de-DE", symbol: "€", name: "Euros", sub: "Cents" },
  GBP: { locale: "en-GB", symbol: "£", name: "Pounds", sub: "Pence" },
}

function money(currency: string, amount: number, rupeeFallback: boolean): string {
  const c = CURRENCY[currency] ?? CURRENCY.INR
  const symbol = rupeeFallback && c.symbol === "₹" ? "Rs. " : c.symbol
  const n = amount.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol}${n}`
}

// ---------------------------------------------------------------------------
// amount in words (Indian numbering for INR, western fallback)
// ---------------------------------------------------------------------------
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function wordsBelow100(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return TENS[t] + (o ? `-${ONES[o]}` : "")
}

function wordsBelow1000(n: number): string {
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (!h) return wordsBelow100(rest)
  return `${ONES[h]} Hundred${rest ? ` ${wordsBelow100(rest)}` : ""}`
}

function amountToWords(currency: string, total: number): string {
  const c = CURRENCY[currency] ?? CURRENCY.INR
  const isINR = currency === "INR"
  let whole = Math.floor(total)
  let frac = Math.round((total - whole) * 100)
  if (frac === 100) {
    whole += 1
    frac = 0
  }
  const parts: string[] = []
  let n = whole
  if (isINR) {
    const crore = Math.floor(n / 1e7)
    n %= 1e7
    if (crore) parts.push(crore > 999 ? `${crore} Crore` : `${wordsBelow1000(crore)} Crore`)
    const lakh = Math.floor(n / 1e5)
    n %= 1e5
    if (lakh) parts.push(`${wordsBelow100(lakh)} Lakh`)
    const thousand = Math.floor(n / 1000)
    n %= 1000
    if (thousand) parts.push(`${wordsBelow100(thousand)} Thousand`)
    if (n) parts.push(wordsBelow1000(n))
  } else {
    const million = Math.floor(n / 1e6)
    n %= 1e6
    if (million) parts.push(million > 999 ? `${million} Million` : `${wordsBelow1000(million)} Million`)
    const thousand = Math.floor(n / 1000)
    n %= 1000
    if (thousand) parts.push(`${wordsBelow1000(thousand)} Thousand`)
    if (n) parts.push(wordsBelow1000(n))
  }
  const wholeWords = whole === 0 ? "Zero" : parts.join(" ").replace(/\s+/g, " ").trim()
  let out = `${c.name} ${wholeWords}`
  if (frac > 0) out += ` and ${wordsBelow100(frac)} ${c.sub}`
  return `${out} Only`
}

// ---------------------------------------------------------------------------
// font embedding
// ---------------------------------------------------------------------------
const FONT_FILES: Array<{ file: string; family: string; style: string }> = [
  { file: "Inter-Regular.ttf", family: "Inter", style: "normal" },
  { file: "Inter-Medium.ttf", family: "InterMedium", style: "normal" },
  { file: "Inter-Bold.ttf", family: "Inter", style: "bold" },
]

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

async function embedFonts(pdf: jsPDF, opts: InvoicePdfOptions): Promise<boolean> {
  const loader =
    opts.loadFontFile ??
    ((path: string) =>
      fetch(path, { cache: "force-cache" }).then((r) => {
        if (!r.ok) throw new Error(`font ${path}: ${r.status}`)
        return r.arrayBuffer()
      }))
  try {
    for (const f of FONT_FILES) {
      const buf = await loader(`/fonts/${f.file}`)
      pdf.addFileToVFS(f.file, toBase64(buf))
      pdf.addFont(f.file, f.family, f.style)
    }
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// small drawing helpers
// ---------------------------------------------------------------------------
function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function gradientBand(pdf: jsPDF, x: number, y: number, w: number, h: number, from: RGB, to: RGB, steps = 48) {
  const sw = w / steps
  for (let i = 0; i < steps; i++) {
    const c = lerp(from, to, i / (steps - 1))
    pdf.setFillColor(c[0], c[1], c[2])
    pdf.rect(x + i * sw, y, sw + 0.25, h, "F")
  }
}

function gradientBand3(pdf: jsPDF, x: number, y: number, w: number, h: number, c1: RGB, c2: RGB, c3: RGB, steps = 64) {
  const sw = w / steps
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const c = t < 0.5 ? lerp(c1, c2, t * 2) : lerp(c2, c3, (t - 0.5) * 2)
    pdf.setFillColor(c[0], c[1], c[2])
    pdf.rect(x + i * sw, y, sw + 0.25, h, "F")
  }
}

function setFont(pdf: jsPDF, kind: "reg" | "med" | "bold", size: number, color: RGB) {
  pdf.setFont(kind === "bold" ? "Inter" : kind === "med" ? "InterMedium" : "Inter", kind === "bold" ? "bold" : "normal")
  pdf.setFontSize(size)
  pdf.setTextColor(color[0], color[1], color[2])
}

// ---------------------------------------------------------------------------
// cyber ornaments (dark theme only)
// ---------------------------------------------------------------------------
const GStateCtor = (pdf: jsPDF) => (pdf as any).GState as new (s: { opacity: number }) => any

function withOpacity(pdf: jsPDF, opacity: number, fn: () => void) {
  pdf.saveGraphicsState()
  pdf.setGState(new (GStateCtor(pdf))({ opacity }))
  fn()
  pdf.restoreGraphicsState()
}

/** Full-page vertical aurora gradient - indigo → violet → deep navy. */
function paintPageBg(pdf: jsPDF, pw: number, ph = 297) {
  const top: RGB = [15, 11, 34] // deep indigo glow
  const mid: RGB = [10, 8, 24] // violet night
  const bottom: RGB = [6, 6, 14] // near-black navy
  const steps = 44
  const sh = ph / steps
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const c = t < 0.35 ? lerp(top, mid, t / 0.35) : lerp(mid, bottom, (t - 0.35) / 0.65)
    pdf.setFillColor(c[0], c[1], c[2])
    pdf.rect(0, i * sh, pw, sh + 0.3, "F")
  }
}

/** Radial glow orb approximated with layered opaque-disc rings. */
function drawOrb(pdf: jsPDF, cx: number, cy: number, r: number, color: RGB, rings = 7, maxOpacity = 0.055) {
  for (let i = rings; i >= 1; i--) {
    const t = i / rings
    const op = maxOpacity * (1.15 - t)
    withOpacity(pdf, op, () => {
      pdf.setFillColor(color[0], color[1], color[2])
      pdf.circle(cx, cy, r * t, "F")
    })
  }
}

/** Frosted glass panel - translucent fill + crisp brand border (the sample's
 * boxed-card look: a thin coloured outline instead of a bare white hairline). */
function glassPanel(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 3,
  border: RGB = [255, 255, 255],
  borderOpacity = 0.16,
  borderWidth = 0.25,
  fillOpacity = 0.055
) {
  withOpacity(pdf, fillOpacity, () => {
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(x, y, w, h, r, r, "F")
  })
  withOpacity(pdf, borderOpacity, () => {
    pdf.setDrawColor(border[0], border[1], border[2])
    pdf.setLineWidth(borderWidth)
    pdf.roundedRect(x, y, w, h, r, r, "S")
  })
}

// ---------------------------------------------------------------------------
// main builder
// ---------------------------------------------------------------------------
export async function buildInvoicePdf(data: InvoicePdfData, opts: InvoicePdfOptions = {}): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
  const interOk = await embedFonts(pdf, opts)
  const rupeeFallback = !interOk

  const cur = CURRENCY[data.currency] ?? CURRENCY.INR
  const sym = (n: number) => money(data.currency, n, rupeeFallback)

  // ---- totals (identical math to the on-screen preview) -------------------
  const items = data.items
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const discountAmount = (subtotal * data.discountRate) / 100
  const taxable = subtotal - discountAmount
  const taxAmount = (taxable * data.taxRate) / 100
  const total = taxable + taxAmount + (data.roundingAdjustment || 0)
  const cgst = data.gstSplit && data.currency === "INR" ? taxAmount / 2 : 0
  const sgst = cgst
  // minus BEFORE the symbol for negative money (₹-12 looks wrong, -₹12 is right)
  const signed = (v: number) => (v < 0 ? `-${sym(Math.abs(v))}` : sym(v))

  // ---- geometry -----------------------------------------------------------
  const PW = 210
  const ML = 14
  const MR = 196 // right text edge
  const CW = MR - ML

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso || " - "
    return d.toLocaleDateString(cur.locale, { day: "numeric", month: "short", year: "numeric" })
  }

  const safe = (s: string) => (rupeeFallback ? s.replace(/₹/g, "Rs. ") : s)

  // single-line shrink-to-fit: step the font down first, ellipsize as a last
  // resort; leaves the font set at the final size so the caller draws at once
  const fitOne = (
    text: string,
    maxW: number,
    kind: "reg" | "med" | "bold",
    size: number,
    minSize: number,
    color: RGB
  ): string => {
    let t = safe(text)
    let s = size
    setFont(pdf, kind, s, color)
    while (s > minSize && pdf.getTextWidth(t) > maxW) {
      s -= 0.2
      setFont(pdf, kind, s, color)
    }
    if (pdf.getTextWidth(t) > maxW) {
      while (t.length > 1 && pdf.getTextWidth(`${t}...`) > maxW) t = t.slice(0, -1)
      t = `${t}...`
    }
    return t
  }

  // ---- theme ---------------------------------------------------------------
  const theme: InvoiceTheme = opts.theme ?? "dark"
  const DARK = theme === "dark"
  const C = DARK ? C_DARK : C_BASE
  const TAGS = DARK ? ITEM_TAG_DARK : ITEM_TAG
  const ST = (s: InvoiceStatus) => (DARK ? STATUS_COLOR_DARK : STATUS_COLOR)[s]
  const accentTick = (x: number, y: number, w = 13) => {
    gradientBand3(pdf, x, y, w, 0.7, C.accentA, C.accentB, C.accentC, 16)
  }

  let footerMarked = false

  // page-frame inset - everything (header band, content, footer) lives inside
  const FRAME = 5

  // ---- page frame (both themes): the sample's signature background - a thin
  // rounded border around the whole page. Brand-gradient on dark, softer
  // violet on light, plus cyan L-bracket accents at the four corners. ----
  function drawFrame() {
    const y1 = 293 // 4mm bottom inset (5mm top/sides) - imperceptible, but
    // gives the two footer lines clean clearance inside the frame
    const x0 = FRAME
    const y0 = FRAME
    const x1 = PW - FRAME
    const R = 3.2
    const sx = x1 - x0 - 2 * R
    const sy = y1 - y0 - 2 * R
    const arc = (Math.PI * R) / 2
    const perim = 2 * sx + 2 * sy + 4 * arc
    const pos = (d: number): [number, number] => {
      if (d < sx) return [x0 + R + d, y0]
      d -= sx
      if (d < arc) {
        const a = -Math.PI / 2 + (d / arc) * (Math.PI / 2)
        return [x1 - R + R * Math.cos(a), y0 + R + R * Math.sin(a)]
      }
      d -= arc
      if (d < sy) return [x1, y0 + R + d]
      d -= sy
      if (d < arc) {
        const a = (d / arc) * (Math.PI / 2)
        return [x1 - R + R * Math.cos(a), y1 - R + R * Math.sin(a)]
      }
      d -= arc
      if (d < sx) return [x1 - R - d, y1]
      d -= sx
      if (d < arc) {
        const a = Math.PI / 2 + (d / arc) * (Math.PI / 2)
        return [x0 + R + R * Math.cos(a), y1 - R + R * Math.sin(a)]
      }
      d -= arc
      if (d < sy) return [x0, y1 - R - d]
      d -= sy
      const a = Math.PI + (d / arc) * (Math.PI / 2)
      return [x0 + R + R * Math.cos(a), y0 + R + R * Math.sin(a)]
    }
    const N = 220
    pdf.setLineWidth(0.5)
    for (let i = 0; i < N; i++) {
      const t = i / N
      const c = t < 0.5 ? lerp(C.accentA, C.accentB, t * 2) : lerp(C.accentB, C.accentC, (t - 0.5) * 2)
      pdf.setDrawColor(c[0], c[1], c[2])
      const p0 = pos(t * perim)
      const p1 = pos((i + 1) / N * perim)
      pdf.line(p0[0], p0[1], p1[0], p1[1])
    }
    // corner accent ticks (the sample's double-line corner marks) - short
    // L-brackets just inside each corner; no full inner hairline, which
    // would cross the footer text
    const tick = (tx: number, ty: number, dx: number, dy: number) => {
      withOpacity(pdf, 0.75, () => {
        pdf.setDrawColor(C.accentC[0], C.accentC[1], C.accentC[2])
        pdf.setLineWidth(0.45)
        pdf.line(tx, ty, tx + dx, ty + dy)
      })
    }
    const T = 6
    const O = 1.6
    tick(x0 + O, y0 + O, T, 0)
    tick(x0 + O, y0 + O, 0, T)
    tick(x1 - O, y0 + O, -T, 0)
    tick(x1 - O, y0 + O, 0, T)
    tick(x0 + O, y1 - O, T, 0)
    tick(x0 + O, y1 - O, 0, -T)
    tick(x1 - O, y1 - O, -T, 0)
    tick(x1 - O, y1 - O, 0, -T)
  }

  function drawFooter() {
    if (footerMarked) return
    const pageNo = pdf.getNumberOfPages()
    drawFrame()
    if (DARK) {
      withOpacity(pdf, 0.04, () => {
        pdf.setFillColor(255, 255, 255)
        pdf.rect(FRAME + 0.5, 283.6, PW - 2 * (FRAME + 0.5), 7.2, "F")
      })
      gradientBand3(pdf, FRAME + 0.5, 284.4, PW - 2 * (FRAME + 0.5), 0.7, C.accentA, C.accentB, C.accentC, 72)
    } else {
      pdf.setDrawColor(C.line[0], C.line[1], C.line[2])
      pdf.setLineWidth(0.2)
      pdf.line(ML, 284.4, MR, 284.4)
      gradientBand3(pdf, ML, 284.4, 42, 0.9, C.accentA, C.accentB, C.accentC, 24)
    }
    // two short lines sit fully inside the frame (bottom edge at y=293):
    // the old layout pushed the address to y=292 - across the page edge -
    // with the page number floating between the two baselines
    setFont(pdf, "reg", 7, C.faint)
    pdf.text(safe("GuardianX Academy  ·  Reg No: UDYAM-JK-03-0034470"), ML, 286.5)
    pdf.text(safe("Nooripora, Baramulla, Kashmir 193401  ·  Gautam Buddha Nagar, Noida 201301"), ML, 290)
    pdf.text(safe(`Page ${pageNo} of {total_pages_count_string}`), MR, 286.5, { align: "right" })
    footerMarked = true
  }

  function newContentPage(): number {
    drawFooter()
    footerMarked = false
    pdf.addPage()
    if (DARK) {
      paintPageBg(pdf, PW)
      drawOrb(pdf, 202, 18, 22, C.accentA, 7, 0.05)
    }
    // slim continuation band, inset inside the page frame (rounded top corners)
    pdf.saveGraphicsState()
    pdf.roundedRect(FRAME, FRAME, PW - 2 * FRAME, 11, 3.2, 3.2, null)
    pdf.clip()
    pdf.discardPath()
    gradientBand(pdf, FRAME, FRAME, PW - 2 * FRAME, 11, C.headerLeft, C.headerRight, 32)
    if (DARK) gradientBand3(pdf, FRAME, FRAME, PW - 2 * FRAME, 1.4, C.accentA, C.accentB, C.accentC, 64)
    pdf.restoreGraphicsState()
    gradientBand3(pdf, FRAME, 16, PW - 2 * FRAME, 1.4, C.accentA, C.accentB, C.accentC, 48)
    setFont(pdf, "bold", 9.5, C.white)
    pdf.text("GUARDIANX ACADEMY", ML, 9.6)
    setFont(pdf, "med", 8, C.violetSoft)
    pdf.text(safe(`Invoice ${data.number} - continued`), MR, 9.6, { align: "right" })
    return 28
  }

  function drawTableHeader(y: number) {
    if (DARK) {
      glassPanel(pdf, ML, y, CW, 8, 2, C.violet, 0.4, 0.32)
    } else {
      pdf.setFillColor(C.violetDark[0], C.violetDark[1], C.violetDark[2])
      pdf.rect(ML, y, CW, 8, "F")
    }
    // aurora sheen over the header row (both themes) - Luxe table header
    gradientBand3(pdf, ML, y, CW, 8, C.accentA, C.accentB, C.accentC, DARK ? 30 : 34)
    setFont(pdf, "bold", 7.4, C.white)
    pdf.text("ITEM", 26, y + 5.2, { charSpace: 0.4 })
    pdf.text("QTY", 123, y + 5.2, { align: "center" })
    pdf.text("UNIT PRICE", 162, y + 5.2, { align: "right" })
    pdf.text("AMOUNT", MR, y + 5.2, { align: "right" })
    if (DARK) gradientBand3(pdf, ML, y + 8, CW, 0.6, C.accentA, C.accentB, C.accentC, 60)
    return y + 8
  }

  // =========================================================================
  // PAGE CANVAS - the cyber screen background (dark theme only)
  // =========================================================================
  if (DARK) {
    paintPageBg(pdf, PW)
    drawOrb(pdf, 196, 5, 30, C.accentA, 8, 0.06)
    drawOrb(pdf, 2, 54, 24, C.accentC, 7, 0.05)
    drawOrb(pdf, 208, 250, 26, C.accentB, 7, 0.045)
    drawOrb(pdf, 105, 140, 34, C.accentA, 6, 0.028)
  }

  // =========================================================================
  // HEADER BAND (aurora hero, inset inside the page frame, 5→52mm)
  // =========================================================================
  pdf.saveGraphicsState()
  pdf.roundedRect(FRAME, FRAME, PW - 2 * FRAME, 47, 3.2, 3.2, null)
  pdf.clip()
  pdf.discardPath()
  gradientBand(pdf, FRAME, FRAME, PW - 2 * FRAME, 47, C.headerLeft, C.headerRight, 56)
  if (DARK) {
    // glass edge: top aurora bar inside the band
    gradientBand3(pdf, FRAME, FRAME, PW - 2 * FRAME, 2.2, C.accentA, C.accentB, C.accentC, 72)
    // soft glass sheen over the band
    withOpacity(pdf, 0.05, () => {
      pdf.setFillColor(255, 255, 255)
      pdf.rect(FRAME, FRAME + 2.2, PW - 2 * FRAME, 44.8, "F")
    })
  }
  // aurora mesh glows INSIDE the band (fuchsia top-right, cyan lower-center)
  drawOrb(pdf, 178, 9, 17, C.accentB, 6, 0.06)
  drawOrb(pdf, 96, 45, 14, C.accentC, 5, 0.05)
  drawOrb(pdf, 205, 40, 12, C.accentA, 5, 0.05)
  pdf.restoreGraphicsState()
  if (DARK) {
    gradientBand3(pdf, FRAME, 52, PW - 2 * FRAME, 1.1, C.accentA, C.accentB, C.accentC, 72)
  } else {
    gradientBand3(pdf, FRAME, 52, PW - 2 * FRAME, 2.2, C.accentA, C.accentB, C.accentC, 72)
  }

  // logo - large GuardianX shield on a glowing 40mm badge (Aurora Luxe hero);
  // falls back to the drawn GX badge if the image is unavailable.
  let logoDrawn = false
  if (opts.logoPngDataUrl) {
    try {
      // glow badge behind the shield - big, app-icon presence
      pdf.saveGraphicsState()
      pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }))
      pdf.setFillColor(C.violetDark[0], C.violetDark[1], C.violetDark[2])
      pdf.roundedRect(12, 7, 40, 40, 6, 6, "F")
      pdf.setLineWidth(0.4)
      pdf.setDrawColor(C.violet[0], C.violet[1], C.violet[2])
      pdf.roundedRect(12, 7, 40, 40, 6, 6, "S")
      // inner hairline for a framed, premium edge
      pdf.setLineWidth(0.2)
      pdf.setDrawColor(C.violetSoft[0], C.violetSoft[1], C.violetSoft[2])
      pdf.roundedRect(13.2, 8.2, 37.6, 37.6, 5, 5, "S")
      pdf.restoreGraphicsState()
      pdf.addImage(opts.logoPngDataUrl, "PNG", 14.5, 9.5, 35, 35)
      logoDrawn = true
    } catch {
      logoDrawn = false
    }
  }
  if (!logoDrawn) {
    if (opts.logoPngDataUrl) {
      // addImage failed after the chip was drawn - paint the chip area back
      // with the local gradient colour so the fallback badge sits clean.
      const bg = lerp(C.headerLeft, C.headerRight, 14 / PW)
      pdf.setFillColor(bg[0], bg[1], bg[2])
      pdf.rect(12, 7, 40, 40, "F")
    }
    pdf.setFillColor(C.accentA[0], C.accentA[1], C.accentA[2])
    pdf.roundedRect(ML, 12, 30, 30, 5, 5, "F")
    setFont(pdf, "bold", 26, C.white)
    pdf.text("GX", ML + 15, 32.5, { align: "center" })
  }

  const brandX = logoDrawn ? 58 : 52

  // brand
  setFont(pdf, "bold", 17, C.white)
  pdf.text("GUARDIANX ACADEMY", brandX, 19.5)
  setFont(pdf, "med", 8.6, C.violetSoft)
  pdf.text(safe("Cybersecurity Training & Certification"), brandX, 25.5)
  setFont(pdf, "reg", 7.4, [161, 140, 250])
  pdf.text(safe("academy@guardianx.in   ·   academy@guardianx.cloud"), brandX, 31)
  pdf.text(safe("Nooripora, Baramulla, Kashmir 193401   ·   Gautam Buddha Nagar, Noida 201301"), brandX, 35.5)
  pdf.text(safe("Reg No: UDYAM-JK-03-0034470"), brandX, 40)

  // right: INVOICE display wordmark + number + status stamp
  setFont(pdf, "bold", 27, C.white)
  pdf.text("INVOICE", MR, 21.5, { align: "right", charSpace: 1.2 })
  // Shrink-to-fit: a long invoice number must never collide with the brand
  // tagline on its left - step the font down first, ellipsis as a last resort.
  setFont(pdf, "med", 8.6, C.violetSoft)
  const numLeftLimit = brandX + pdf.getTextWidth(safe("Cybersecurity Training & Certification")) + 6
  let numText = safe(data.number || " - ")
  let numSize = 11.5
  setFont(pdf, "med", numSize, C.violetSoft)
  while (numSize > 7.5 && pdf.getTextWidth(numText) > MR - numLeftLimit) {
    numSize -= 0.5
    setFont(pdf, "med", numSize, C.violetSoft)
  }
  if (pdf.getTextWidth(numText) > MR - numLeftLimit) {
    while (numText.length > 4 && pdf.getTextWidth(`${numText}...`) > MR - numLeftLimit) {
      numText = numText.slice(0, -1)
    }
    numText = `${numText}...`
  }
  pdf.text(numText, MR, 28, { align: "right" })

  const stColor = ST(data.status)
  setFont(pdf, "bold", 8.6, C.white)
  const badgeW = pdf.getTextWidth(data.status.toUpperCase()) + 12 // mm + stamp padding
  const badgeH = 7.6
  const badgeX = MR - badgeW
  // rubber-stamp feel: filled body + contrasting ring + inner hairline
  pdf.setFillColor(stColor[0], stColor[1], stColor[2])
  pdf.roundedRect(badgeX, 32, badgeW, badgeH, 1.6, 1.6, "F")
  const ring = lerp(stColor, C.white, DARK ? 0.45 : 0.3)
  pdf.setDrawColor(ring[0], ring[1], ring[2])
  pdf.setLineWidth(0.45)
  pdf.roundedRect(badgeX, 32, badgeW, badgeH, 1.6, 1.6, "S")
  const ring2 = lerp(stColor, C.white, 0.7)
  pdf.setDrawColor(ring2[0], ring2[1], ring2[2])
  pdf.setLineWidth(0.2)
  pdf.roundedRect(badgeX + 0.9, 32.9, badgeW - 1.8, badgeH - 1.8, 1, 1, "S")
  pdf.text(data.status.toUpperCase(), badgeX + badgeW / 2, 37.6, { align: "center", charSpace: 0.9 })

  // =========================================================================
  // watermark for Paid / Overdue
  // =========================================================================
  if (data.status === "Paid" || data.status === "Overdue") {
    pdf.saveGraphicsState()
    const g = new (pdf as any).GState({ opacity: DARK ? 0.1 : 0.07 })
    pdf.setGState(g)
    const wc = ST(data.status)
    pdf.setTextColor(wc[0], wc[1], wc[2])
    pdf.setFontSize(64)
    pdf.setFont("Inter", "bold")
    pdf.text(data.status.toUpperCase(), 105, 180, { align: "center", angle: 38 })
    pdf.restoreGraphicsState()
  }

  // =========================================================================
  // BILL TO / INVOICE DETAILS - frosted panels (Aurora Luxe)
  // =========================================================================
  let y = 63

  // ---- client block: measure pass (no drawing) so the BILL TO card can
  // GROW to fit long names/emails instead of letting text overflow it ----
  const CLIENT_W = 72 // panel right edge 102.5 - text x 26 - breathing room
  // wrap + trim to maxLines, appending "..." when lines had to be dropped;
  // metrics use whichever font is active when this is called
  const fitText = (text: string, maxW: number, maxLines: number): string[] => {
    const lines = pdf.splitTextToSize(safe(text), maxW) as string[]
    if (lines.length <= maxLines) return lines
    const cut = lines.slice(0, maxLines) as string[]
    let last = cut[maxLines - 1]
    while (last.length > 1 && pdf.getTextWidth(`${last}...`) > maxW) last = last.slice(0, -1)
    cut[maxLines - 1] = `${last}...`
    return cut
  }

  setFont(pdf, "bold", 11, C.ink)
  const nameLines = fitText(data.clientName || "Client Name", CLIENT_W, 2)
  setFont(pdf, "med", 8.6, C.sub)
  const orgLines = data.clientOrg ? fitText(data.clientOrg, CLIENT_W, 2) : []
  setFont(pdf, "reg", 8.2, C.sub)
  const emailLines = data.clientEmail ? fitText(data.clientEmail, CLIENT_W, 2) : []
  const phoneLines = data.clientPhone ? fitText(data.clientPhone, CLIENT_W, 1) : []
  setFont(pdf, "reg", 8, C.faint)
  const addrLines = data.clientAddress ? fitText(data.clientAddress, 74, 3) : []

  // baseline walk identical to the draw pass below (y is still 63 here)
  let simCy = y + 6.5 + 1.2
  simCy += (nameLines.length - 1) * 4.7 + 5.4
  if (orgLines.length) simCy += (orgLines.length - 1) * 3.6 + 4.8
  if (emailLines.length) simCy += (emailLines.length - 1) * 3.4 + 4.4
  if (phoneLines.length) simCy += (phoneLines.length - 1) * 3.4 + 4.4
  const clientBottom = addrLines.length
    ? simCy + (addrLines.length - 1) * 3.3
    : simCy - 4.4 // no address: the last field's trailing gap was already added

  // backdrop panels behind both columns (drawn first, content sits on top);
  // the left panel grows when the contact block is taller than its fixed 43mm
  const PANEL_TOP = 58
  const PANEL_BOTTOM = Math.max(PANEL_TOP + 43, clientBottom + 6)
  const panelH = PANEL_BOTTOM - PANEL_TOP
  if (DARK) {
    glassPanel(pdf, ML - 2.5, PANEL_TOP, 91, panelH, 3, C.violet, 0.38, 0.32)
    glassPanel(pdf, 105.5, PANEL_TOP, MR - 103, 27, 3, C.violet, 0.38, 0.32)
  } else {
    const bLight = lerp(C.white, C.accentA, 0.5)
    pdf.setFillColor(C.violetTint[0], C.violetTint[1], C.violetTint[2])
    pdf.setDrawColor(bLight[0], bLight[1], bLight[2])
    pdf.setLineWidth(0.3)
    pdf.roundedRect(ML - 2.5, PANEL_TOP, 91, panelH, 3, 3, "FD")
    pdf.roundedRect(105.5, PANEL_TOP, MR - 103, 27, 3, 3, "FD")
  }
  // right text edge inside the details panel (panel spans 105.5→198.5)
  const DET_RIGHT = 194.5

  setFont(pdf, "bold", 7.4, C.violet)
  pdf.text("BILL TO", ML, y, { charSpace: 0.7 })
  // manual width incl. letter-spacing - jsPDF's align:"right" ignores
  // charSpace, which pushed "INVOICE DETAILS" past the panel border
  const dtTitle = "INVOICE DETAILS"
  const dtW = pdf.getTextWidth(dtTitle) + 0.7 * (dtTitle.length - 1)
  pdf.text(dtTitle, DET_RIGHT - dtW, y, { charSpace: 0.7 })
  if (DARK) {
    accentTick(ML, y + 1.8, 11)
    accentTick(DET_RIGHT - 11, y + 1.8, 11)
  }

  y += 6.5
  // client block
  const initial = (data.clientName || data.clientOrg || "?").charAt(0).toUpperCase()
  pdf.setFillColor(C.violetTint[0], C.violetTint[1], C.violetTint[2])
  pdf.setDrawColor(C.avatarBorder[0], C.avatarBorder[1], C.avatarBorder[2])
  pdf.setLineWidth(0.25)
  pdf.circle(ML + 4.6, y + 3.6, 4.6, "FD")
  setFont(pdf, "bold", 9.5, C.violet)
  pdf.text(initial, ML + 4.6, y + 5.1, { align: "center" })

  let cy = y + 1.2
  setFont(pdf, "bold", 11, C.ink)
  nameLines.forEach((ln, i) => {
    pdf.text(ln, ML + 12, cy)
    if (i < nameLines.length - 1) cy += 4.7
  })
  cy += 5.4
  if (orgLines.length) {
    setFont(pdf, "med", 8.6, C.sub)
    orgLines.forEach((ln, i) => {
      pdf.text(ln, ML + 12, cy)
      if (i < orgLines.length - 1) cy += 3.6
    })
    cy += 4.8
  }
  if (emailLines.length) {
    setFont(pdf, "reg", 8.2, C.sub)
    emailLines.forEach((ln, i) => {
      pdf.text(ln, ML + 12, cy)
      if (i < emailLines.length - 1) cy += 3.4
    })
    cy += 4.4
  }
  if (phoneLines.length) {
    setFont(pdf, "reg", 8.2, C.sub)
    phoneLines.forEach((ln, i) => {
      pdf.text(ln, ML + 12, cy)
      if (i < phoneLines.length - 1) cy += 3.4
    })
    cy += 4.4
  }
  if (addrLines.length) {
    setFont(pdf, "reg", 8, C.faint)
    addrLines.forEach((ln, i) => {
      pdf.text(ln, ML + 12, cy)
      if (i < addrLines.length - 1) cy += 3.3
    })
  }

  // right column - dates / currency. The old fixed label x (MR-34) collided
  // with longer values ("Issue Date26 Sept 2026") and values sat flush on
  // the panel edge. Now: value shrink-to-fit, label right-aligned against
  // the value column with a fixed 3mm gutter, 4mm inner padding both sides.
  const rows: Array<[string, string]> = [
    ["Issue Date", fmtDate(data.issueDate)],
    ["Due Date", data.dueDate ? fmtDate(data.dueDate) : " - "],
    ["Currency", `${cur.symbol === "₹" && rupeeFallback ? "Rs." : cur.symbol} ${data.currency}`],
  ]
  let ry = y + 1.6
  for (const [label, value] of rows) {
    const v = fitOne(value, 50, "med", 8.6, 6.8, C.ink)
    const vw = pdf.getTextWidth(v)
    pdf.text(v, DET_RIGHT, ry, { align: "right" })
    setFont(pdf, "reg", 8.2, C.faint)
    pdf.text(label, DET_RIGHT - vw - 3, ry, { align: "right" })
    ry += 5.6
  }

  y = Math.max(cy, ry, PANEL_BOTTOM) + 6
  pdf.setDrawColor(C.line[0], C.line[1], C.line[2])
  pdf.setLineWidth(0.2)
  pdf.line(ML, y, MR, y)
  gradientBand3(pdf, ML, y, 26, 0.7, C.accentA, C.accentB, C.accentC, 40)
  y += 8

  // =========================================================================
  // ITEMS TABLE
  // =========================================================================
  const TABLE_BOTTOM_LIMIT = 228 // leave room for totals+qr on the same page
  y = drawTableHeader(y)

  const rowLines = (desc: string) => {
    setFont(pdf, "reg", 8.8, C.ink)
    return pdf.splitTextToSize(safe(desc || "-"), 84) as string[]
  }

  items.forEach((item, idx) => {
    const lines = rowLines(item.description)
    const rowH = Math.max(9.6, lines.length * 4.3 + 5.2)
    if (y + rowH > TABLE_BOTTOM_LIMIT) {
      y = drawTableHeader(newContentPage())
    }
    if (idx % 2 === 1) {
      if (DARK) {
        withOpacity(pdf, 0.035, () => {
          pdf.setFillColor(255, 255, 255)
          pdf.rect(ML, y, CW, rowH, "F")
        })
      } else {
        pdf.setFillColor(C.zebra[0], C.zebra[1], C.zebra[2])
        pdf.rect(ML, y, CW, rowH, "F")
      }
    }

    // item tag
    const tag = TAGS[item.icon ?? "training"] ?? TAGS.training
    pdf.setFillColor(tag.tint[0], tag.tint[1], tag.tint[2])
    pdf.setDrawColor(C.line[0], C.line[1], C.line[2])
    pdf.setLineWidth(0.2)
    pdf.roundedRect(ML + 0.6, y + (rowH - 7) / 2, 7, 7, 1.6, 1.6, "FD")
    setFont(pdf, "bold", 7.6, tag.color)
    pdf.text(tag.letter, ML + 4.1, y + (rowH - 7) / 2 + 4.9, { align: "center" })

    // description
    setFont(pdf, "reg", 8.8, C.ink)
    pdf.text(lines, 26, y + 5.6)

    // qty / unit / amount
    setFont(pdf, "reg", 8.8, C.sub)
    pdf.text(String(item.quantity), 123, y + 5.6, { align: "center" })
    pdf.text(sym(item.unitPrice), 162, y + 5.6, { align: "right" })
    setFont(pdf, "med", 8.8, C.ink)
    pdf.text(sym(item.quantity * item.unitPrice), MR, y + 5.6, { align: "right" })

    y += rowH
    pdf.setDrawColor(C.rowLine[0], C.rowLine[1], C.rowLine[2])
    pdf.setLineWidth(0.15)
    pdf.line(ML, y, MR, y)
  })

  if (items.length === 0) {
    setFont(pdf, "reg", 8.8, C.faint)
    pdf.text("No line items", 26, y + 5.6)
    y += 9.6
  }

  y += 6

  // =========================================================================
  // UPI QR CARD (left) + TOTALS (right)
  // =========================================================================
  const totalsRows: Array<{ label: string; value: string; color?: RGB }> = [
    { label: "Subtotal", value: sym(subtotal) },
  ]
  if (data.discountRate > 0) totalsRows.push({ label: `Discount (${data.discountRate}%)`, value: signed(-discountAmount), color: C.rose })
  if (data.gstSplit && data.currency === "INR") {
    totalsRows.push({ label: `CGST (${data.taxRate / 2}%)`, value: sym(cgst) })
    totalsRows.push({ label: `SGST (${data.taxRate / 2}%)`, value: sym(sgst) })
  } else {
    totalsRows.push({ label: data.taxRate > 0 ? `Tax (${data.taxRate}%)` : "Tax", value: sym(taxAmount) })
  }
  if (data.roundingAdjustment !== 0)
    totalsRows.push({ label: "Rounding", value: signed(data.roundingAdjustment) })

  // left: UPI card (frosted glass; QR sits on a white patch for scannability)
  let leftBottom = y
  if (data.upiId && opts.qrPngDataUrl && total > 0) {
    const cardH = 40
    if (DARK) {
      glassPanel(pdf, ML, y, 88, cardH, 2.4, C.violet, 0.38, 0.32)
    } else {
      const bLight = lerp(C.white, C.accentA, 0.5)
      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(bLight[0], bLight[1], bLight[2])
      pdf.setLineWidth(0.3)
      pdf.roundedRect(ML, y, 88, cardH, 2.4, 2.4, "FD")
    }
    setFont(pdf, "bold", 7.2, C.violet)
    pdf.text("SCAN TO PAY · UPI", ML + 4, y + 6, { charSpace: 0.5 })
    const qrSize = 27
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(ML + 3.2, y + 7.7, qrSize + 1.6, qrSize + 1.6, 1.4, 1.4, "F")
    pdf.addImage(opts.qrPngDataUrl, "PNG", ML + 4, y + 8.5, qrSize, qrSize)
    let qy = y + 12.5
    // labels start 4mm clear of the QR (it ends at ML+31 - the old ML+30/32
    // labels sat under the QR corner); each value is shrink-to-fit within
    // the space LEFT of the value column after its own label + 3mm gutter
    const upiLabelX = ML + 35
    const upiRight = ML + 84.5
    const upiRow = (label: string, value: string, kind: "med" | "bold", size: number) => {
      setFont(pdf, "reg", 7.4, C.sub)
      pdf.text(label, upiLabelX, qy)
      const lw = pdf.getTextWidth(label)
      const v = fitOne(value, upiRight - upiLabelX - lw - 3, kind, size, 5.6, C.ink)
      pdf.text(v, upiRight, qy, { align: "right" })
      qy += 5.2
    }
    upiRow("UPI ID", data.upiId || " - ", "med", 7.8)
    upiRow("Amount", sym(total), "bold", 7.8)
    upiRow("Account", data.accountNumber || " - ", "med", 7.2)
    upiRow("IFSC", data.ifscCode || " - ", "med", 7.2)
    leftBottom = y + cardH
  }

  // right: totals
  let ty = y
  for (const row of totalsRows) {
    setFont(pdf, "reg", 8.6, C.sub)
    pdf.text(safe(row.label), 120, ty + 4.4)
    setFont(pdf, "med", 8.6, row.color ?? C.ink)
    pdf.text(safe(row.value), MR, ty + 4.4, { align: "right" })
    ty += 6
  }
  // total pill - oversized hero total (dark: frosted glass, light: solid)
  if (DARK) {
    glassPanel(pdf, 108, ty + 1, MR - 108, 15, 2.6, C.violet, 0.38, 0.32)
    gradientBand3(pdf, 108, ty + 0.2, MR - 108, 0.8, C.accentA, C.accentB, C.accentC, 48)
    gradientBand3(pdf, 108, ty + 16.1, MR - 108, 0.8, C.accentC, C.accentB, C.accentA, 48)
  } else {
    pdf.setFillColor(C.violetDark[0], C.violetDark[1], C.violetDark[2])
    pdf.roundedRect(108, ty + 1, MR - 108, 15, 2.6, 2.6, "F")
    gradientBand3(pdf, 108, ty + 0.4, MR - 108, 0.8, C.accentA, C.accentB, C.accentC, 55)
    gradientBand3(pdf, 108, ty + 15.9, MR - 108, 0.8, C.accentC, C.accentB, C.accentA, 55)
  }
  setFont(pdf, "bold", 9, C.white)
  pdf.text("TOTAL", 113, ty + 9.9, { charSpace: 0.9 })
  setFont(pdf, "bold", 17, C.white)
  pdf.text(safe(sym(total)), MR - 4, ty + 10.6, { align: "right" })
  ty += 19.5

  // amount in words under the pill
  setFont(pdf, "reg", 7.4, C.sub)
  const wordsLines = pdf.splitTextToSize(safe(`Amount in words: ${amountToWords(data.currency, total)}`), 88).slice(0, 3)
  pdf.text(wordsLines, MR - 88 + 0.5, ty + 1)
  ty += wordsLines.length * 3.6 + 2

  y = Math.max(leftBottom, ty) + 6

  // =========================================================================
  // BANK DETAILS + SIGNATURE
  // =========================================================================
  if (y > 244) {
    y = newContentPage() + 4
  }

  const bankRows: Array<[string, string]> = []
  if (data.bankName) bankRows.push(["Bank", data.bankName])
  if (data.accountName) bankRows.push(["Account Name", data.accountName])
  if (data.accountNumber) bankRows.push(["Account No", data.accountNumber])
  if (data.ifscCode) bankRows.push(["IFSC", data.ifscCode])
  if (data.upiId) bankRows.push(["UPI", data.upiId])

  let bankBottom = y
  if (bankRows.length) {
    setFont(pdf, "bold", 7.4, C.violet)
    pdf.text("BANK DETAILS", ML, y, { charSpace: 0.7 })
    if (DARK) accentTick(ML, y + 1.8, 11)
    let by = y + 5.4
    for (const [label, value] of bankRows) {
      setFont(pdf, "reg", 8, C.faint)
      pdf.text(safe(label), ML, by)
      setFont(pdf, "med", 8.2, C.ink)
      // wrap long bank/account names; right edge stays clear of the
      // signature band (flourish starts at MR-54, dash line at MR-58)
      const vLines = fitText(value, 88, 2)
      vLines.forEach((ln, i) => {
        pdf.text(ln, ML + 30, by)
        if (i < vLines.length - 1) by += 3.5
      })
      by += 4.6
    }
    bankBottom = by
  }

  // signature (right, same band as bank details) - cursive flourish + line
  const sigY = y + 2
  setFont(pdf, "reg", 7.4, C.faint)
  pdf.text("For GUARDIANX ACADEMY", MR, sigY, { align: "right" })
  // hand-signed flourish above the line (three bezier strokes, kept clear
  // of the "For GUARDIANX ACADEMY" text which starts ~33mm left of MR)
  pdf.setDrawColor(DARK ? 210 : 70, DARK ? 196 : 58, DARK ? 255 : 122)
  pdf.setLineWidth(0.45)
  pdf.lines(
    [
      [2.6, -1.8, 4, -4.6, 5.6, -1.4],
      [1.6, 1.9, 3, 3.2, 4.6, 0.5],
      [1.2, -2, 2.6, -3.6, 4.6, -1],
    ],
    MR - 54,
    sigY + 2.6
  )
  pdf.setDrawColor(161, 161, 170)
  pdf.setLineWidth(0.3)
  pdf.setLineDashPattern([1, 0.9], 0)
  pdf.line(MR - 58, sigY + 4.5, MR, sigY + 4.5)
  pdf.setLineDashPattern([], 0)
  setFont(pdf, "bold", 8.8, C.ink)
  pdf.text("Authorized Signatory", MR, sigY + 9.4, { align: "right" })

  y = Math.max(bankBottom, sigY + 11) + 4

  // =========================================================================
  // NOTES & TERMS
  // =========================================================================
  const FOOTER_TOP = 283
  let notesTermsTop = y + 2
  if (notesTermsTop > FOOTER_TOP - 34) {
    notesTermsTop = newContentPage() + 4
  }
  if (data.notes || data.terms) {
    const colW = 86
    const spaceFor = (FOOTER_TOP - 4 - notesTermsTop - 6) / 3.7
    if (data.notes) {
      setFont(pdf, "bold", 7.4, C.violet)
      pdf.text("NOTES", ML, notesTermsTop, { charSpace: 0.7 })
      if (DARK) accentTick(ML, notesTermsTop + 1.8, 11)
      setFont(pdf, "reg", 7.4, C.sub)
      const lines = pdf.splitTextToSize(safe(data.notes), colW).slice(0, Math.max(2, Math.floor(spaceFor)))
      pdf.text(lines, ML, notesTermsTop + 5)
    }
    if (data.terms) {
      setFont(pdf, "bold", 7.4, C.violet)
      pdf.text("TERMS & CONDITIONS", 106, notesTermsTop, { charSpace: 0.7 })
      if (DARK) accentTick(106, notesTermsTop + 1.8, 11)
      setFont(pdf, "reg", 7.4, C.sub)
      const lines = pdf.splitTextToSize(safe(data.terms), 90).slice(0, Math.max(2, Math.floor(spaceFor)))
      pdf.text(lines, 106, notesTermsTop + 5)
    }
  }

  // =========================================================================
  // finalize
  // =========================================================================
  drawFooter()
  footerMarked = false
  pdf.putTotalPages("{total_pages_count_string}")
  return pdf
}
