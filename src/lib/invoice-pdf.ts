/**
 * invoice-pdf.ts — native vector A4 invoice PDF (jsPDF), replaces the old
 * html2canvas screenshot pipeline (raster quality, dark-theme card floating
 * in the middle of a landscape page).
 *
 * Everything is drawn with jsPDF primitives: text stays razor-sharp at any
 * zoom/print DPI, the document fills the full A4 portrait page.
 *
 * TWO THEMES:
 *  - "dark"  — the cyber "screen style": full-page deep-violet/near-black
 *              gradient, holographic violet-fuchsia-cyan accent bars, faint
 *              grid overlay, radial glow orbs, HUD corner brackets, neon
 *              frames. Mirrors the on-screen Invoice Generator look. Best
 *              for sharing/emailing (heavy for physical printing).
 *  - "light" — print-friendly white paper invoice (ink-safe).
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
  /** Injectable font loader — browser uses fetch(), Node scripts use fs. */
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
  headerLeft: [46, 16, 101], // violet-950
  headerRight: [12, 10, 22],
  accentA: [139, 92, 246], // violet-500 (brighter on dark)
  accentB: [232, 121, 249], // fuchsia-400
  accentC: [34, 211, 238], // cyan-400
  violetDark: [91, 33, 182], // violet-800 total pill
  violet: [167, 139, 250], // violet-400 labels
  violetSoft: [196, 181, 253],
  ink: [244, 244, 245], // zinc-100 body text
  sub: [161, 161, 170], // zinc-400
  faint: [113, 113, 122], // zinc-500
  line: [39, 39, 42], // zinc-800 card borders
  rowLine: [46, 42, 56],
  zebra: [26, 20, 40], // deep violet row tint
  violetTint: [46, 16, 101], // avatar fill
  avatarBorder: [124, 58, 237], // violet-600 ring
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

/** Full-page vertical gradient — deep violet top fading to near-black. */
function paintPageBg(pdf: jsPDF, pw: number, ph = 297) {
  const top: RGB = [24, 15, 41] // violet-950 tint
  const mid: RGB = [13, 11, 20]
  const bottom: RGB = [9, 8, 13]
  const steps = 44
  const sh = ph / steps
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const c = t < 0.35 ? lerp(top, mid, t / 0.35) : lerp(mid, bottom, (t - 0.35) / 0.65)
    pdf.setFillColor(c[0], c[1], c[2])
    pdf.rect(0, i * sh, pw, sh + 0.3, "F")
  }
}

/** Faint blueprint grid inside a region (mirrors the on-screen header overlay). */
function drawGrid(pdf: jsPDF, x: number, y: number, w: number, h: number, step = 9, opacity = 0.05) {
  withOpacity(pdf, opacity, () => {
    pdf.setDrawColor(255, 255, 255)
    pdf.setLineWidth(0.08)
    for (let gx = x + step; gx < x + w; gx += step) pdf.line(gx, y, gx, y + h)
    for (let gy = y + step; gy < y + h; gy += step) pdf.line(x, gy, x + w, gy)
  })
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

/** HUD corner brackets — terminal-style L marks. */
function drawBracket(pdf: jsPDF, x: number, y: number, s: number, color: RGB, dir: "tl" | "tr" | "bl" | "br") {
  pdf.setDrawColor(color[0], color[1], color[2])
  pdf.setLineWidth(0.55)
  const dx = dir === "tl" || dir === "bl" ? 1 : -1
  const dy = dir === "tl" || dir === "tr" ? 1 : -1
  pdf.line(x, y, x + dx * s, y)
  pdf.line(x, y, x, y + dy * s)
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
    if (isNaN(d.getTime())) return iso || "—"
    return d.toLocaleDateString(cur.locale, { day: "numeric", month: "short", year: "numeric" })
  }

  const safe = (s: string) => (rupeeFallback ? s.replace(/₹/g, "Rs. ") : s)

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

  function drawFooter() {
    if (footerMarked) return
    const pageNo = pdf.getNumberOfPages()
    if (DARK) {
      drawGrid(pdf, 0, 284.2, PW, 12.8, 8, 0.035)
      gradientBand3(pdf, 0, 285.5, PW, 0.7, C.accentA, C.accentB, C.accentC, 72)
    } else {
      pdf.setDrawColor(C.line[0], C.line[1], C.line[2])
      pdf.setLineWidth(0.2)
      pdf.line(ML, 285.5, MR, 285.5)
      gradientBand3(pdf, ML, 285.5, 42, 0.9, C.accentA, C.accentB, C.accentC, 24)
    }
    setFont(pdf, "reg", 7, C.faint)
    pdf.text(safe("GuardianX Academy  ·  Nooripora, Baramulla, Kashmir 193401  ·  Gautam Buddha Nagar, Noida 201301"), ML, 289.4)
    pdf.text(safe(`Page ${pageNo} of {total_pages_count_string}`), MR, 289.4, { align: "right" })
    footerMarked = true
  }

  function newContentPage(): number {
    drawFooter()
    footerMarked = false
    pdf.addPage()
    if (DARK) {
      paintPageBg(pdf, PW)
      drawOrb(pdf, 202, 18, 22, C.accentA, 7, 0.05)
      gradientBand3(pdf, 0, 0, PW, 1.6, C.accentA, C.accentB, C.accentC, 64)
    }
    // slim continuation band
    gradientBand(pdf, 0, 0, PW, 16, C.headerLeft, C.headerRight, 32)
    gradientBand3(pdf, 0, 16, PW, 1.4, C.accentA, C.accentB, C.accentC, 48)
    setFont(pdf, "bold", 9.5, C.white)
    pdf.text("GUARDIANX ACADEMY", ML, 9.6)
    setFont(pdf, "med", 8, C.violetSoft)
    pdf.text(safe(`Invoice ${data.number} — continued`), MR, 9.6, { align: "right" })
    return 28
  }

  function drawTableHeader(y: number) {
    pdf.setFillColor(C.violetDark[0], C.violetDark[1], C.violetDark[2])
    pdf.rect(ML, y, CW, 8, "F")
    setFont(pdf, "bold", 7.4, C.white)
    pdf.text("ITEM", 26, y + 5.2, { charSpace: 0.4 })
    pdf.text("QTY", 123, y + 5.2, { align: "center" })
    pdf.text("UNIT PRICE", 162, y + 5.2, { align: "right" })
    pdf.text("AMOUNT", MR, y + 5.2, { align: "right" })
    if (DARK) gradientBand3(pdf, ML, y + 8, CW, 0.6, C.accentA, C.accentB, C.accentC, 60)
    return y + 8
  }

  // =========================================================================
  // PAGE CANVAS — the cyber screen background (dark theme only)
  // =========================================================================
  if (DARK) {
    paintPageBg(pdf, PW)
    drawOrb(pdf, 196, 5, 30, C.accentA, 8, 0.05)
    drawOrb(pdf, 2, 54, 24, C.accentB, 7, 0.045)
    drawOrb(pdf, 208, 250, 26, C.accentC, 7, 0.04)
  }

  // =========================================================================
  // HEADER BAND (full-bleed dark gradient)
  // =========================================================================
  gradientBand(pdf, 0, 0, PW, 42, C.headerLeft, C.headerRight, 56)
  if (DARK) {
    // holographic frame: top bar + hairline under the band + blueprint grid
    gradientBand3(pdf, 0, 0, PW, 2.4, C.accentA, C.accentB, C.accentC, 72)
    drawGrid(pdf, 0, 2.4, PW, 39.6, 9, 0.05)
    gradientBand3(pdf, 0, 42, PW, 1.1, C.accentA, C.accentB, C.accentC, 72)
    drawBracket(pdf, ML - 2, 49.5, 3.6, C.accentC, "tl")
    drawBracket(pdf, MR + 2, 49.5, 3.6, C.accentC, "tr")
    drawBracket(pdf, ML - 2, 279.5, 3.6, C.accentC, "bl")
    drawBracket(pdf, MR + 2, 279.5, 3.6, C.accentC, "br")
  } else {
    gradientBand3(pdf, 0, 42, PW, 2.2, C.accentA, C.accentB, C.accentC, 72)
  }

  // logo — real GuardianX shield on a violet glow chip (mirrors the on-screen
  // header); falls back to the drawn GX badge if the image is unavailable.
  let logoDrawn = false
  if (opts.logoPngDataUrl) {
    try {
      // glow chip (app-icon style) behind the shield
      pdf.saveGraphicsState()
      pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }))
      pdf.setFillColor(C.violetDark[0], C.violetDark[1], C.violetDark[2])
      pdf.roundedRect(12.5, 6.5, 18, 18, 3.6, 3.6, "F")
      pdf.setLineWidth(0.25)
      pdf.setDrawColor(C.violet[0], C.violet[1], C.violet[2])
      pdf.roundedRect(12.5, 6.5, 18, 18, 3.6, 3.6, "S")
      pdf.restoreGraphicsState()
      pdf.addImage(opts.logoPngDataUrl, "PNG", 13.5, 7.5, 16, 16)
      logoDrawn = true
    } catch {
      logoDrawn = false
    }
  }
  if (!logoDrawn) {
    if (opts.logoPngDataUrl) {
      // addImage failed after the chip was drawn — paint the chip area back
      // with the local gradient colour so the fallback badge sits clean.
      const bg = lerp(C.headerLeft, C.headerRight, 14 / PW)
      pdf.setFillColor(bg[0], bg[1], bg[2])
      pdf.rect(12.5, 6.5, 18, 18, "F")
    }
    pdf.setFillColor(C.accentA[0], C.accentA[1], C.accentA[2])
    pdf.roundedRect(ML, 8, 13, 13, 2.6, 2.6, "F")
    setFont(pdf, "bold", 12, C.white)
    pdf.text("GX", ML + 6.5, 16.4, { align: "center" })
  }

  const brandX = logoDrawn ? 34.5 : 31

  // brand
  setFont(pdf, "bold", 15.5, C.white)
  pdf.text("GUARDIANX ACADEMY", brandX, 13.6)
  setFont(pdf, "med", 8, C.violetSoft)
  pdf.text(safe("Cybersecurity Training & Certification"), brandX, 18.6)
  setFont(pdf, "reg", 7.2, [161, 140, 250])
  pdf.text(safe("academy@guardianx.in   ·   academy@guardianx.cloud"), brandX, 23.6)
  pdf.text(safe("Nooripora, Baramulla, Kashmir 193401   ·   Gautam Buddha Nagar, Noida 201301"), brandX, 27.6)

  // right: INVOICE + number + status badge
  setFont(pdf, "bold", 19.5, C.white)
  pdf.text("INVOICE", MR, 13.6, { align: "right" })
  setFont(pdf, "med", 9, C.violetSoft)
  pdf.text(safe(data.number || "—"), MR, 18.8, { align: "right" })

  const stColor = ST(data.status)
  setFont(pdf, "bold", 7.4, C.white)
  const badgeW = pdf.getTextWidth(data.status.toUpperCase()) + 7 // mm + padding
  const badgeH = 5.6
  const badgeX = MR - badgeW
  pdf.setFillColor(stColor[0], stColor[1], stColor[2])
  pdf.roundedRect(badgeX, 21.6, badgeW, badgeH, 2.8, 2.8, "F")
  if (DARK) {
    const ring = lerp(stColor, C.white, 0.45)
    pdf.setDrawColor(ring[0], ring[1], ring[2])
    pdf.setLineWidth(0.3)
    pdf.roundedRect(badgeX, 21.6, badgeW, badgeH, 2.8, 2.8, "S")
  }
  pdf.text(data.status.toUpperCase(), badgeX + badgeW / 2, 25.35, { align: "center", charSpace: 0.5 })

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
  // BILL TO / INVOICE DETAILS
  // =========================================================================
  let y = 52

  setFont(pdf, "bold", 7.4, C.violet)
  pdf.text("BILL TO", ML, y, { charSpace: 0.7 })
  pdf.text("INVOICE DETAILS", MR, y, { align: "right", charSpace: 0.7 })
  if (DARK) {
    accentTick(ML, y + 1.8, 11)
    accentTick(MR - 11, y + 1.8, 11)
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
  pdf.text(safe(data.clientName || "Client Name"), ML + 12, cy)
  cy += 5.4
  if (data.clientOrg) {
    setFont(pdf, "med", 8.6, C.sub)
    pdf.text(safe(data.clientOrg), ML + 12, cy)
    cy += 4.8
  }
  setFont(pdf, "reg", 8.2, C.sub)
  if (data.clientEmail) {
    pdf.text(safe(data.clientEmail), ML + 12, cy)
    cy += 4.4
  }
  if (data.clientPhone) {
    pdf.text(safe(data.clientPhone), ML + 12, cy)
    cy += 4.4
  }
  if (data.clientAddress) {
    setFont(pdf, "reg", 8, C.faint)
    const addrLines = pdf.splitTextToSize(safe(data.clientAddress), 74).slice(0, 3)
    pdf.text(addrLines, ML + 12, cy)
  }

  // right column — dates / currency (right aligned rows)
  const rows: Array<[string, string]> = [
    ["Issue Date", fmtDate(data.issueDate)],
    ["Due Date", data.dueDate ? fmtDate(data.dueDate) : "—"],
    ["Currency", `${cur.symbol === "₹" && rupeeFallback ? "Rs." : cur.symbol} ${data.currency}`],
  ]
  let ry = y + 1.6
  for (const [label, value] of rows) {
    setFont(pdf, "reg", 8.2, C.faint)
    pdf.text(label, MR - 34, ry)
    setFont(pdf, "med", 8.6, C.ink)
    pdf.text(safe(value), MR, ry, { align: "right" })
    ry += 5.6
  }

  y = Math.max(cy, ry) + 3
  pdf.setDrawColor(C.line[0], C.line[1], C.line[2])
  pdf.setLineWidth(0.2)
  pdf.line(ML, y, MR, y)
  y += 8

  // =========================================================================
  // ITEMS TABLE
  // =========================================================================
  const TABLE_BOTTOM_LIMIT = 225 // leave room for totals+qr on the same page
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
      pdf.setFillColor(C.zebra[0], C.zebra[1], C.zebra[2])
      pdf.rect(ML, y, CW, rowH, "F")
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

  // left: UPI card
  let leftBottom = y
  if (data.upiId && opts.qrPngDataUrl && total > 0) {
    const cardH = 34
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(DARK ? C.accentA[0] : C.line[0], DARK ? C.accentA[1] : C.line[1], DARK ? C.accentA[2] : C.line[2])
    pdf.setLineWidth(DARK ? 0.4 : 0.25)
    pdf.roundedRect(ML, y, 88, cardH, 2.4, 2.4, "FD")
    setFont(pdf, "bold", 7.2, C.violet)
    pdf.text("SCAN TO PAY · UPI", ML + 4, y + 6, { charSpace: 0.5 })
    const qrSize = 24
    pdf.addImage(opts.qrPngDataUrl, "PNG", ML + 4, y + 8.5, qrSize, qrSize)
    let qy = y + 12.5
    setFont(pdf, "reg", 7.4, C.sub)
    pdf.text("UPI ID", ML + 32, qy)
    setFont(pdf, "med", 7.8, C.ink)
    pdf.text(safe(data.upiId), ML + 84, qy, { align: "right" })
    qy += 5
    setFont(pdf, "reg", 7.4, C.sub)
    pdf.text("Amount", ML + 32, qy)
    setFont(pdf, "bold", 7.8, C.ink)
    pdf.text(sym(total), ML + 84, qy, { align: "right" })
    qy += 5
    setFont(pdf, "reg", 7.4, C.sub)
    pdf.text("A/C · IFSC", ML + 30, qy)
    setFont(pdf, "med", 7.2, C.ink)
    pdf.text(safe(`${data.accountNumber ?? "—"}  ${data.ifscCode ?? ""}`), ML + 84, qy, { align: "right" })
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
  // total pill (dark: neon-framed gradient-trimmed pill)
  pdf.setFillColor(C.violetDark[0], C.violetDark[1], C.violetDark[2])
  pdf.roundedRect(108, ty + 1, MR - 108, 12, 2.4, 2.4, "F")
  if (DARK) {
    gradientBand3(pdf, 108, ty + 0.2, MR - 108, 0.7, C.accentA, C.accentB, C.accentC, 48)
    gradientBand3(pdf, 108, ty + 13.1, MR - 108, 0.7, C.accentC, C.accentB, C.accentA, 48)
    pdf.setDrawColor(C.accentA[0], C.accentA[1], C.accentA[2])
    pdf.setLineWidth(0.35)
    pdf.roundedRect(108, ty + 1, MR - 108, 12, 2.4, 2.4, "S")
  }
  setFont(pdf, "bold", 8.4, C.white)
  pdf.text("TOTAL", 113, ty + 8.6, { charSpace: 0.7 })
  setFont(pdf, "bold", 13.5, C.white)
  pdf.text(safe(sym(total)), MR - 4, ty + 9.2, { align: "right" })
  ty += 16.5

  // amount in words under the pill
  setFont(pdf, "reg", 7.4, C.sub)
  const wordsLines = pdf.splitTextToSize(safe(`Amount in words: ${amountToWords(data.currency, total)}`), 88).slice(0, 3)
  pdf.text(wordsLines, MR - 88 + 0.5, ty + 1)
  ty += wordsLines.length * 3.6 + 2

  y = Math.max(leftBottom, ty) + 6

  // =========================================================================
  // BANK DETAILS + SIGNATURE
  // =========================================================================
  if (y > 240) {
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
      pdf.text(safe(value), ML + 30, by)
      by += 4.6
    }
    bankBottom = by
  }

  // signature (right, same band as bank details)
  const sigY = y + 2
  setFont(pdf, "reg", 7.4, C.faint)
  pdf.text("For GUARDIANX ACADEMY", MR, sigY, { align: "right" })
  pdf.setDrawColor(161, 161, 170)
  pdf.setLineWidth(0.3)
  pdf.setLineDashPattern([1, 0.9], 0)
  pdf.line(MR - 55, sigY + 4.5, MR, sigY + 4.5)
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
