/**
 * offer-letter-pdf.ts - "BLACKOPS Offer" internship offer letter document.
 *
 * The vector A4 PORTRAIT companion to the phantom certificate: SAME theme
 * DNA (deep black-red page, signal-red guilloché double frame with the
 * engine-turned rosette band, HUD corner brackets, scanlines, terminal
 * readout, classification chips, reg no top-left, seal medal, signature
 * squiggles, SHA-256 band + QR verification strip) so an offer letter and
 * a completion certificate are unmistakably one brand family.
 *
 * Everything is drawn with jsPDF primitives (no raster screenshots), so the
 * letter stays razor-sharp at any zoom/print DPI. Runs in Node (email
 * attachment / admin download) and in the browser.
 *
 * Fonts: Inter (Regular/Medium/Bold) committed to /public/fonts and
 * embedded at export time (same pipeline as the invoice); the recipient
 * name + signature names use the built-in Times bold-italic serif - the
 * same elegant-serif fallback the certificate's script stack degrades to.
 */
import { jsPDF } from "jspdf"

export interface OfferLetterInternship {
  title: string
  company: string
  domain: string
  mode: string // remote | onsite | hybrid
  durationWeeks: number
  collegeName: string
  collegeCity?: string | null
  stipend?: string | null
}

export interface OfferLetterData {
  offerRef: string
  issuedAt: string | Date
  studentName: string
  role: string
  mentorName?: string | null
  programDirector?: string | null
  startDate?: string | null
  endDate?: string | null
  internship: OfferLetterInternship
}

export interface OfferLetterOptions {
  /** PNG data-URL of the GuardianX shield logo (Node fetches from origin). */
  logoPngDataUrl?: string | null
  /** PNG data-URL QR of the verify URL (Node builds with the qrcode pkg). */
  qrPngDataUrl?: string | null
  /** Verify URL printed on the letter + encoded in the QR. */
  verifyUrl?: string | null
  /** Injectable font loader - browser uses fetch(), Node scripts use fs. */
  loadFontFile?: (path: string) => Promise<ArrayBuffer>
}

// ---------------------------------------------------------------------------
// phantom palette (mirrors THEME_ASSETS.phantom + .cert.theme-phantom vars)
// ---------------------------------------------------------------------------
type RGB = [number, number, number]
const P = {
  bgA: [10, 5, 7] as RGB, // #0A0507 page top
  bgB: [23, 7, 9] as RGB, // #170709 page bottom
  acc1: [225, 29, 46] as RGB, // #E11D2E signal red (frame + wordmark)
  acc2: [245, 158, 11] as RGB, // #F59E0B amber (kicker + rosette row 2)
  acc3: [255, 90, 78] as RGB, // #FF5A4E coral (gradient tail)
  ink: [250, 247, 245] as RGB, // #FAF7F5
  body: [226, 219, 220] as RGB, // body paragraphs (white ~.86)
  muted: [159, 155, 154] as RGB, // rgba(250,247,245,.62) over the page
  regno: [194, 90, 99] as RGB, // color-mix(acc1 52%, muted)
  bandFill: [8, 4, 5] as RGB, // rgba(8,4,5,.72) glass bands
  sealInk: [42, 5, 8] as RGB, // #2A0508 medal fill
  sealRing: [125, 10, 22] as RGB, // #7D0A16 medal ring + ribbon A
  ribbonB: [245, 158, 11] as RGB, // #F59E0B ribbon B
  squiggle: [255, 107, 94] as RGB, // #FF6B5E signature ink
  wm: [255, 59, 59] as RGB, // #FF3B3B watermark stroke
  green: [34, 197, 94] as RGB,
  chipGreen: [134, 239, 172] as RGB, // #86EFAC
  chipRed: [252, 165, 165] as RGB, // #FCA5A5
  white: [255, 255, 255] as RGB,
}

const MONO_FS = 2.65 // 1em at 7.5pt courier, mm - baseline for tracking math

// ---------------------------------------------------------------------------
// drawing helpers (proven patterns from invoice-pdf.ts)
// ---------------------------------------------------------------------------
function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const GStateCtor = (pdf: jsPDF) =>
  (pdf as any).GState as new (s: { opacity: number; "stroke-opacity"?: number }) => any

function withOpacity(pdf: jsPDF, opacity: number, fn: () => void) {
  pdf.saveGraphicsState()
  // jsPDF maps GState "opacity" -> /ca (FILL alpha only); strokes need the
  // separate "stroke-opacity" (/CA) key or every stroked path renders at
  // full alpha (verified empirically against jspdf 4.2.1)
  pdf.setGState(new (GStateCtor(pdf))({ opacity, "stroke-opacity": opacity }))
  fn()
  pdf.restoreGraphicsState()
}

/** Full-page vertical gradient, black-red (#0A0507 -> #170709). */
function paintPageBg(pdf: jsPDF, pw: number, ph: number) {
  const steps = 46
  const sh = ph / steps
  for (let i = 0; i < steps; i++) {
    const c = lerp(P.bgA, P.bgB, i / (steps - 1))
    pdf.setFillColor(c[0], c[1], c[2])
    pdf.rect(0, i * sh, pw, sh + 0.3, "F")
  }
}

/** Radial glow orb approximated with layered translucent discs. */
function drawOrb(pdf: jsPDF, cx: number, cy: number, r: number, color: RGB, rings = 7, maxOpacity = 0.055) {
  for (let i = rings; i >= 1; i--) {
    const t = i / rings
    withOpacity(pdf, maxOpacity * (1.15 - t), () => {
      pdf.setFillColor(color[0], color[1], color[2])
      pdf.circle(cx, cy, r * t, "F")
    })
  }
}

/** Frosted dark glass panel (the cert's band: dark fill + white hairline). */
function glassPanel(pdf: jsPDF, x: number, y: number, w: number, h: number, r = 2.6) {
  withOpacity(pdf, 0.72, () => {
    pdf.setFillColor(P.bandFill[0], P.bandFill[1], P.bandFill[2])
    pdf.roundedRect(x, y, w, h, r, r, "F")
  })
  withOpacity(pdf, 0.14, () => {
    pdf.setDrawColor(P.white[0], P.white[1], P.white[2])
    pdf.setLineWidth(0.25)
    pdf.roundedRect(x, y, w, h, r, r, "S")
  })
}

/** Engine-turned rosette: two interleaved rows of overlapping circles
 *  running the full band between the outer + inner frames (all 4 edges). */
function rosetteBand(pdf: jsPDF, pw: number, ph: number) {
  const mid = 9.5 // band midline from the edge
  const spacing = 3.3
  const drawRow = (
    fixed: number,
    from: number,
    to: number,
    vertical: boolean,
    offset: number,
    r: number,
    color: RGB,
    op: number
  ) => {
    // ONE graphics state for the whole row - per-circle GStates would bloat
    // the PDF with hundreds of ExtGState objects
    withOpacity(pdf, op, () => {
      pdf.setDrawColor(color[0], color[1], color[2])
      pdf.setLineWidth(0.3)
      for (let s = from + offset; s <= to; s += spacing) {
        if (vertical) pdf.circle(fixed, s, r, "S")
        else pdf.circle(s, fixed, r, "S")
      }
    })
  }
  const x0 = 16, x1 = pw - 16, y0 = 16, y1 = ph - 16
  for (const [off, r, color, op] of [
    [0, 1.55, P.acc1, 0.4],
    [spacing / 2, 1.15, P.acc2, 0.26],
  ] as const) {
    drawRow(mid, x0, x1, false, off, r, color, op) // top
    drawRow(ph - mid, x0, x1, false, off, r, color, op) // bottom
    drawRow(mid, y0, y1, true, off, r, color, op) // left
    drawRow(pw - mid, y0, y1, true, off, r, color, op) // right
  }
}

/** Concentric-diamond corner ornaments at the four frame corners. */
function cornerDiamonds(pdf: jsPDF, pw: number, ph: number) {
  const pts: [number, number][] = [
    [9.5, 9.5], [pw - 9.5, 9.5], [9.5, ph - 9.5], [pw - 9.5, ph - 9.5],
  ]
  for (const [cx, cy] of pts) {
    withOpacity(pdf, 0.55, () => {
      for (const [r, color] of [[2.3, P.acc1], [1.5, P.acc2], [0.75, P.acc1]] as const) {
        pdf.setDrawColor(color[0], color[1], color[2])
        pdf.setLineWidth(0.3)
        pdf.lines(
          [[r, -r], [r, r], [-r, r], [-r, -r]],
          cx - r, cy, [1, 1], "S", true
        )
      }
    })
  }
}

/** Phantom scanlines - the repeating dark horizontal gradient. */
function scanlines(pdf: jsPDF, pw: number, ph: number) {
  withOpacity(pdf, 0.14, () => {
    pdf.setFillColor(0, 0, 0)
    for (let y = 0; y < ph; y += 2.4) pdf.rect(0, y, pw, 0.55, "F")
  })
}

/** HUD corner brackets (2.5pt signal-red L shapes at the 14mm inset). */
function hudBrackets(pdf: jsPDF, pw: number, ph: number) {
  const inset = 14, arm = 8, lw = 0.9
  const corners: [number, number, number, number][] = [
    // [x, y, dx, dy] - dx/dy point INTO the page
    [inset, inset, 1, 1],
    [pw - inset, inset, -1, 1],
    [inset, ph - inset, 1, -1],
    [pw - inset, ph - inset, -1, -1],
  ]
  withOpacity(pdf, 0.9, () => {
    pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.setLineWidth(lw)
    for (const [x, y, dx, dy] of corners) {
      pdf.line(x, y, x + arm * dx, y)
      pdf.line(x, y, x, y + arm * dy)
    }
  })
}

/** Heraldic shield outline drawn with relative bezier segments. */
function shieldPath(pdf: jsPDF, x: number, y: number, w: number, style: "S" | "F") {
  const hw = w / 2
  const hh = w * 1.16
  pdf.lines(
    [
      [w, 0], // full top edge -> right shoulder
      [0, hh * 0.5], // right side down
      [0, hh * 0.26, -hw * 0.2, hh * 0.44, -hw, hh * 0.5], // curve to bottom point
      [-hw * 0.8, -hh * 0.06, -hw * 0.8, -hh * 0.24, -hw, -hh * 0.5], // mirror to left
    ],
    x, y, [1, 1], style, true
  )
}

/** Decorative SHA-256-style fingerprint band (deterministic, visual only). */
function hexFingerprint(seed: string, n: number): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let out = ""
  while (out.length < n) {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    out += ((h >>> 0) % 65536).toString(16).toUpperCase().padStart(4, "0")
  }
  return out.slice(0, n)
}

// ---------------------------------------------------------------------------
// tracked text helpers (jsPDF's align:center ignores charSpace - manual)
// ---------------------------------------------------------------------------
function trackedWidth(pdf: jsPDF, text: string, charSpace: number): number {
  return pdf.getTextWidth(text) + Math.max(0, text.length - 1) * charSpace
}

function textTracked(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  charSpace: number,
  align: "left" | "center" | "right" = "left"
) {
  const w = trackedWidth(pdf, text, charSpace)
  const px = align === "center" ? x - w / 2 : align === "right" ? x - w : x
  pdf.text(text, px, y, { charSpace })
}

/** Shrink-to-fit one line (steps font down, ellipsizes as last resort). */
function fitOne(
  pdf: jsPDF,
  text: string,
  maxW: number,
  kind: "reg" | "med" | "bold" | "mono" | "sig",
  size: number,
  minSize: number
): string {
  const setK = (s: number) => setKind(pdf, kind, s)
  let t = text
  setK(size)
  while (size > minSize && trackedWidth(pdf, t, 0) > maxW) {
    size -= 0.25
    setK(size)
  }
  if (trackedWidth(pdf, t, 0) > maxW) {
    while (t.length > 1 && trackedWidth(pdf, `${t}...`, 0) > maxW) t = t.slice(0, -1)
    t = `${t}...`
  }
  return t
}

function setKind(pdf: jsPDF, kind: "reg" | "med" | "bold" | "mono" | "sig", size: number) {
  switch (kind) {
    case "bold":
      pdf.setFont("Inter", "bold"); break
    case "med":
      pdf.setFont("InterMedium", "normal"); break
    case "mono":
      pdf.setFont("courier", "bold"); break
    case "sig":
      pdf.setFont("times", "bolditalic"); break
    default:
      pdf.setFont("Inter", "normal")
  }
  pdf.setFontSize(size)
}

// ---------------------------------------------------------------------------
// fonts
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

async function embedFonts(pdf: jsPDF, opts: OfferLetterOptions): Promise<boolean> {
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
// main builder
// ---------------------------------------------------------------------------
export async function buildOfferLetterPdf(
  data: OfferLetterData,
  opts: OfferLetterOptions = {}
): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
  await embedFonts(pdf, opts)

  const PW = 210
  const PH = 297
  const CX = PW / 2
  const ML = 20
  const MR = PW - 20
  const CW = MR - ML

  const fmtLong = (iso: string | Date | null | undefined) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  }

  const student = String(data.studentName || "GuardianX Student").trim()
  const firstName = student.split(/\s+/)[0] || student
  const role = String(data.role || "Cyber Security Intern").trim()
  const program = String(data.internship?.title || "Internship Program").trim()
  const college = String(data.internship?.collegeName || "").trim()
  const collegeLine = college
    ? `${college}${data.internship?.collegeCity ? `, ${data.internship.collegeCity}` : ""}`
    : "GuardianX Academy"
  const company = String(data.internship?.company || "GuardianX Academy").trim()
  const weeks = Number(data.internship?.durationWeeks) || 8
  const mode = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" }[
    String(data.internship?.mode || "remote").toLowerCase()
  ] ?? "Remote"
  const startDate = fmtLong(data.startDate || null)
  const issued = fmtLong(data.issuedAt)
  const verifyUrl = String(opts.verifyUrl || `https://academy.guardianx.cloud/verify/${data.offerRef}`)
  const mentor = String(data.mentorName || "").trim()
  const director = String(data.programDirector || "GuardianX Academy").trim() || "GuardianX Academy"
  const stipend = String(data.internship?.stipend || "").trim()

  // ---- page atmosphere -----------------------------------------------------
  paintPageBg(pdf, PW, PH)
  drawOrb(pdf, 158, 22, 46, P.acc1, 7, 0.1)
  drawOrb(pdf, 0, 118, 42, P.acc2, 6, 0.07)
  drawOrb(pdf, 214, 282, 52, P.acc1, 7, 0.08)
  scanlines(pdf, PW, PH)

  // ---- guilloché frame + rosette + diamonds + HUD --------------------------
  withOpacity(pdf, 1, () => {
    pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.setLineWidth(0.45)
    pdf.roundedRect(8, 8, PW - 16, PH - 16, 2.5, 2.5, "S")
  })
  withOpacity(pdf, 0.55, () => {
    pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.setLineWidth(0.22)
    pdf.roundedRect(11, 11, PW - 22, PH - 22, 1.5, 1.5, "S")
  })
  rosetteBand(pdf, PW, PH)
  cornerDiamonds(pdf, PW, PH)
  hudBrackets(pdf, PW, PH)

  // ---- shield watermark (behind the header block, like the cert's 53%
  //      watermark - faint enough to never fight the text) -------------------
  withOpacity(pdf, 0.05, () => {
    pdf.setDrawColor(P.wm[0], P.wm[1], P.wm[2])
    pdf.setLineWidth(1.2)
    shieldPath(pdf, CX - 33, 22, 66, "S")
  })

  // ---- reg no (top-left) + classification chips (top-right) ----------------
  setKind(pdf, "mono", 5.6)
  pdf.setTextColor(P.regno[0], P.regno[1], P.regno[2])
  textTracked(pdf, "REG. NO. UDYAM-JK-03-0034470", 26, 21.5, 1.0)

  const chip = (
    label: string,
    right: number,
    txtColor: RGB,
    edgeColor: RGB,
    fillOp: number,
    edgeOp: number,
    withCheck: boolean
  ): number => {
    setKind(pdf, "mono", 5.4)
    const tw = trackedWidth(pdf, label, 0.85)
    const checkW = withCheck ? 3.4 : 0
    const w = tw + checkW + 5.2
    const y = 18.2, h = 5.4, x = right - w
    withOpacity(pdf, fillOp, () => {
      pdf.setFillColor(edgeColor[0], edgeColor[1], edgeColor[2])
      pdf.roundedRect(x, y, w, h, h / 2, h / 2, "F")
    })
    withOpacity(pdf, edgeOp, () => {
      pdf.setDrawColor(edgeColor[0], edgeColor[1], edgeColor[2])
      pdf.setLineWidth(0.35)
      pdf.roundedRect(x, y, w, h, h / 2, h / 2, "S")
    })
    let tx = x + 2.6
    if (withCheck) {
      withOpacity(pdf, 0.95, () => {
        pdf.setDrawColor(P.green[0], P.green[1], P.green[2])
        pdf.setLineWidth(0.55)
        pdf.line(tx, y + h / 2, tx + 1.15, y + h / 2 + 1.15)
        pdf.line(tx + 1.15, y + h / 2 + 1.15, tx + 3.1, y + h / 2 - 1.35)
      })
      tx += checkW
    }
    pdf.setTextColor(txtColor[0], txtColor[1], txtColor[2])
    textTracked(pdf, label, tx, y + h / 2 + 0.75, 0.85)
    return x
  }
  const c2 = chip("GX OFFER CLEARANCE", PW - 26, P.chipRed, P.acc1, 0.12, 0.55, false)
  chip("VERIFIED CREDENTIAL", c2 - 2.6, P.chipGreen, P.green, 0.1, 0.55, true)

  // ---- logo ring -------------------------------------------------------------
  const logoY = 36
  withOpacity(pdf, 0.1, () => {
    pdf.setFillColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.circle(CX, logoY, 12.4, "F")
  })
  pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
  pdf.setLineWidth(0.8)
  pdf.circle(CX, logoY, 11, "S")
  if (opts.logoPngDataUrl) {
    try {
      pdf.addImage(opts.logoPngDataUrl, "PNG", CX - 8.25, logoY - 8.25, 16.5, 16.5)
    } catch {
      drawVectorMark(pdf, CX, logoY)
    }
  } else {
    drawVectorMark(pdf, CX, logoY)
  }

  // ---- brand + terminal + kicker + wordmark ---------------------------------
  setKind(pdf, "mono", 7)
  pdf.setTextColor(P.muted[0], P.muted[1], P.muted[2])
  textTracked(pdf, "GUARDIANX ACADEMY · CYBER DEFENSE INSTITUTE", CX, 51.5, 1.55, "center")

  // terminal readout: root@gx:~$ guardianx issue-offer --recipient "NAME" --verified ok
  const termName = student.length > 34 ? `${student.slice(0, 33)}...` : student
  setKind(pdf, "mono", 6.4)
  const segPrompt = "root@gx:~$ "
  const segCmd = "guardianx issue-offer "
  const segArg = `--recipient "${termName}" `
  const segOk = "--verified ok"
  const segGap = 0.55
  const totalW =
    trackedWidth(pdf, segPrompt, segGap) +
    trackedWidth(pdf, segCmd, segGap) +
    trackedWidth(pdf, segArg, segGap) +
    trackedWidth(pdf, segOk, segGap)
  let tx = CX - totalW / 2
  const drawSeg = (s: string, color: RGB) => {
    pdf.setTextColor(color[0], color[1], color[2])
    textTracked(pdf, s, tx, 58.5, segGap)
    tx += trackedWidth(pdf, s, segGap)
  }
  drawSeg(segPrompt, P.acc1)
  drawSeg(segCmd, P.muted)
  drawSeg(segArg, P.muted)
  drawSeg(segOk, P.green)

  setKind(pdf, "mono", 9)
  pdf.setTextColor(P.acc2[0], P.acc2[1], P.acc2[2])
  textTracked(pdf, "· LETTER OF INTERNSHIP OFFER ·", CX, 66.5, 3.1, "center")

  setKind(pdf, "bold", 29)
  pdf.setTextColor(P.acc1[0], P.acc1[1], P.acc1[2])
  textTracked(pdf, "OFFER LETTER", CX, 78.5, 4.1, "center")

  // ---- recipient --------------------------------------------------------------
  setKind(pdf, "mono", 6.5)
  pdf.setTextColor(P.muted[0], P.muted[1], P.muted[2])
  textTracked(pdf, "THIS OFFER IS PROUDLY EXTENDED TO", CX, 87, 2.2, "center")

  const nameSize = student.length > 30 ? 19 : student.length > 22 ? 21.5 : 24.5
  setKind(pdf, "sig", nameSize)
  pdf.setTextColor(P.ink[0], P.ink[1], P.ink[2])
  const fittedName = fitOne(pdf, student, CW - 24, "sig", nameSize, 13)
  pdf.text(fittedName, CX, 97.5, { align: "center" })

  // 3-colour gradient rule (acc1 -> acc2 -> acc3)
  const grX = CX - 47, grW = 94, grY = 102.5, steps = 64
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const c = t < 0.5 ? lerp(P.acc1, P.acc2, t * 2) : lerp(P.acc2, P.acc3, (t - 0.5) * 2)
    pdf.setFillColor(c[0], c[1], c[2])
    pdf.rect(grX + (i * grW) / steps, grY, grW / steps + 0.25, 0.8, "F")
  }

  // ---- body --------------------------------------------------------------------
  setKind(pdf, "reg", 11)
  pdf.setTextColor(P.ink[0], P.ink[1], P.ink[2])
  pdf.text(`Dear ${firstName},`, ML, 112)

  // ---- body paragraphs (ADAPTIVE) ----------------------------------------------
  // The bottom band (seal + signatures + SHA-256 + verify strip) is FIXED -
  // long records must never collide with it. The prose compresses through a
  // tier ladder until everything fits above the signature zone.
  const SIG_TOP = 244 // squiggle strokes may rise ~2.5mm above this line
  const p1Full =
    `It is our pleasure to formally confirm your selection as a ${role} for the ` +
    `${program}, conducted by GuardianX Academy${college ? ` in partnership with ${collegeLine}` : ""}. ` +
    `Your selection follows a competitive review of applicants, and reflects the promise you have ` +
    `shown in ${data.internship?.domain || "cyber security"}. Over the next ${weeks} weeks you will ` +
    `train and build alongside our security engineers on live tools, assessments and playbooks - ` +
    `the same track our university cohorts follow.`
  const p1Short =
    `It is our pleasure to formally confirm your selection as a ${role} for the ` +
    `${program}, conducted by GuardianX Academy${college ? ` in partnership with ${collegeLine}` : ""}.`
  const p2Full =
    `This letter is the official confirmation of your internship. Your status remains ` +
    `ONGOING for the duration of the program - GuardianX Academy issues your verifiable ` +
    `certificate of internship completion separately, only after you successfully finish. ` +
    `Until that day, no certificate exists in your name, and this offer reference is what ` +
    `anyone can honestly verify.`
  const p2Trim =
    `This letter is the official confirmation of your internship. Your status remains ` +
    `ONGOING for the duration of the program - your verifiable certificate of internship ` +
    `completion is issued separately, only after you successfully finish.`
  const p3Full =
    `${startDate ? `Your internship begins on ${startDate}. ` : "Your start date will be shared by our program team. "}` +
    `We will reach out shortly with onboarding details and your mentor introduction. ` +
    `We look forward to seeing what you build.`
  const p3Short =
    `${startDate ? `Your internship begins on ${startDate}. ` : ""}We look forward to seeing what you build.`

  // panel rows (needed for measuring - row height varies per tier)
  const rows: Array<[string, string]> = [
    ["POSITION", role],
    ["PROGRAM", program],
    ["INSTITUTION", collegeLine],
    ["HOSTED BY", company],
    [
      "DURATION",
      `${weeks} weeks${startDate ? ` · begins ${startDate}` : ""}${data.endDate ? ` · ends ${fmtLong(data.endDate)}` : ""}`,
    ],
    ["MODE", mode],
  ]
  if (mentor) rows.push(["MENTOR", mentor])
  if (stipend) rows.push(["STIPEND", stipend])

  const BODY_START = 118.5
  const tierLadder = [
    { size: 9.6, lh: 5.1, rowH: 6.6, valSize: 9.4, texts: [p1Full, p2Full, p3Full] },
    { size: 9.2, lh: 4.7, rowH: 6.6, valSize: 9.4, texts: [p1Full, p2Full, p3Full] },
    { size: 9.2, lh: 4.7, rowH: 6.1, valSize: 9.0, texts: [p1Full, p2Full, p3Short] },
    { size: 8.8, lh: 4.4, rowH: 5.9, valSize: 8.8, texts: [p1Short, p2Trim, ""] },
  ]
  const tierNeeds = (t: (typeof tierLadder)[number]): number => {
    setKind(pdf, "reg", t.size)
    const l1 = (pdf.splitTextToSize(t.texts[0], CW) as string[]).length
    const l2 = (pdf.splitTextToSize(t.texts[1], CW) as string[]).length
    const l3 = t.texts[2] ? (pdf.splitTextToSize(t.texts[2], CW) as string[]).length : 0
    const panelH = 13.5 + rows.length * t.rowH
    return BODY_START + l1 * t.lh + 3.5 + panelH + 6 + l2 * t.lh + (l3 ? 2.5 + l3 * t.lh : 0)
  }
  const tier = tierLadder.find((t) => tierNeeds(t) <= SIG_TOP - 5) ?? tierLadder[tierLadder.length - 1]

  setKind(pdf, "reg", tier.size)
  pdf.setTextColor(P.body[0], P.body[1], P.body[2])
  let y = BODY_START
  for (const line of pdf.splitTextToSize(tier.texts[0], CW) as string[]) {
    pdf.text(line, ML, y)
    y += tier.lh
  }

  // ---- programme details glass panel ----------------------------------------
  y += 3.5
  const panelTop = y
  const panelH = 13.5 + rows.length * tier.rowH
  glassPanel(pdf, ML, panelTop, CW, panelH, 3)
  setKind(pdf, "mono", 6.5)
  pdf.setTextColor(P.acc2[0], P.acc2[1], P.acc2[2])
  textTracked(pdf, "PROGRAMME DETAILS", ML + 5, panelTop + 6.6, 1.5)
  let ry = panelTop + 13.2
  for (const [label, value] of rows) {
    setKind(pdf, "mono", 5.8)
    pdf.setTextColor(P.muted[0], P.muted[1], P.muted[2])
    textTracked(pdf, label, ML + 5, ry, 1.0)
    setKind(pdf, "med", tier.valSize)
    pdf.setTextColor(P.ink[0], P.ink[1], P.ink[2])
    const v = fitOne(pdf, value, CW - 66, "med", tier.valSize, 7.2)
    pdf.text(v, ML + 34, ry)
    ry += tier.rowH
    withOpacity(pdf, 0.08, () => {
      pdf.setDrawColor(P.white[0], P.white[1], P.white[2])
      pdf.setLineWidth(0.2)
      if (ry < panelTop + panelH - 2) pdf.line(ML + 5, ry - tier.rowH / 2, MR - 5, ry - tier.rowH / 2)
    })
  }
  y = panelTop + panelH + 6

  // ---- closing paragraphs ------------------------------------------------------
  setKind(pdf, "reg", tier.size)
  pdf.setTextColor(P.body[0], P.body[1], P.body[2])
  for (const line of pdf.splitTextToSize(tier.texts[1], CW) as string[]) {
    pdf.text(line, ML, y)
    y += tier.lh
  }
  if (tier.texts[2]) {
    y += 2.5
    for (const line of pdf.splitTextToSize(tier.texts[2], CW) as string[]) {
      pdf.text(line, ML, y)
      y += tier.lh
    }
  }

  // ---- signature blocks + seal (fixed bottom band) ----------------------------
  const sigBase = 246
  drawSquiggle(pdf, 66, sigBase)
  drawSquiggle(pdf, 136, sigBase)
  setKind(pdf, "sig", 11.5)
  pdf.setTextColor(P.ink[0], P.ink[1], P.ink[2])
  pdf.text(fitOne(pdf, mentor || "GuardianX Academy", 58, "sig", 11.5, 8), 79, sigBase + 7, { align: "center" })
  pdf.text(fitOne(pdf, director, 58, "sig", 11.5, 8), 149, sigBase + 7, { align: "center" })
  withOpacity(pdf, 0.55, () => {
    pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.setLineWidth(0.25)
    pdf.line(66, sigBase + 10.5, 124, sigBase + 10.5)
    pdf.line(136, sigBase + 10.5, 194, sigBase + 10.5)
  })
  setKind(pdf, "mono", 6)
  pdf.setTextColor(P.muted[0], P.muted[1], P.muted[2])
  textTracked(pdf, "PROGRAM MENTOR", 95, sigBase + 14.2, 1.35, "center")
  textTracked(pdf, "PROGRAM DIRECTOR", 165, sigBase + 14.2, 1.35, "center")

  drawSeal(pdf, 33, 248)

  // ---- SHA-256 band + verification strip ---------------------------------------
  setKind(pdf, "mono", 5.6)
  const hexText = `SHA-256 ${hexFingerprint(data.offerRef, 22)}`
  const hexW = trackedWidth(pdf, hexText, 0.9)
  withOpacity(pdf, 0.5, () => {
    pdf.setDrawColor(P.white[0], P.white[1], P.white[2])
    pdf.setLineWidth(0.25)
    pdf.line(ML + 8, 268.4, CX - hexW / 2 - 4, 268.4)
    pdf.line(CX + hexW / 2 + 4, 268.4, MR - 8, 268.4)
  })
  pdf.setTextColor(158, 52, 63) // acc1 @ ~50% over the page
  textTracked(pdf, hexText, CX, 270.2, 0.9, "center")

  const vsY = 273.6, vsH = 11.6
  glassPanel(pdf, 14, vsY, PW - 28, vsH, 2.4)
  // QR tile
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(17.5, vsY + 2.2, 8.2, 8.2, 1.2, 1.2, "F")
  if (opts.qrPngDataUrl) {
    try {
      pdf.addImage(opts.qrPngDataUrl, "PNG", 18.1, vsY + 2.8, 7, 7)
    } catch {
      /* QR is decorative-redundant (the ref is printed next to it) */
    }
  }
  let vx = 29.5
  const vcell = (label: string, value: string, valueSize = 7.6, gap = 0): number => {
    setKind(pdf, "mono", 5.2)
    pdf.setTextColor(P.muted[0], P.muted[1], P.muted[2])
    textTracked(pdf, label, vx + gap, vsY + 4.9, 1.05)
    setKind(pdf, "mono", valueSize)
    pdf.setTextColor(P.ink[0], P.ink[1], P.ink[2])
    const v = fitOne(pdf, value, valueSize >= 7.6 ? 62 : 88, "mono", valueSize, 5.4)
    textTracked(pdf, v, vx + gap, vsY + 10.3, 0.35)
    const w =
      Math.max(trackedWidth(pdf, label, 1.05), trackedWidth(pdf, v, 0.35)) + gap
    return w
  }
  vx += vcell("OFFER REF", data.offerRef) + 4
  withOpacity(pdf, 0.14, () => {
    pdf.setDrawColor(P.white[0], P.white[1], P.white[2])
    pdf.setLineWidth(0.25)
    pdf.line(vx, vsY + 2, vx, vsY + vsH - 2)
  })
  vx += 4
  vx += vcell("VERIFY AT", verifyUrl.replace(/^https?:\/\//, ""), 6.6) + 4
  withOpacity(pdf, 0.14, () => {
    pdf.setDrawColor(P.white[0], P.white[1], P.white[2])
    pdf.setLineWidth(0.25)
    pdf.line(vx, vsY + 2, vx, vsY + vsH - 2)
  })
  vx += 4
  vcell("DATE OF ISSUE", issued)

  return pdf
}

/** Vector GuardianX mark (shield + GX monogram) when the PNG is unavailable. */
function drawVectorMark(pdf: jsPDF, cx: number, cy: number) {
  withOpacity(pdf, 0.9, () => {
    pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.setLineWidth(0.7)
    shieldPath(pdf, cx - 6, cy - 7.5, 12, "S")
  })
  setKind(pdf, "bold", 7.5)
  pdf.setTextColor(P.acc1[0], P.acc1[1], P.acc1[2])
  pdf.text("GX", cx, cy + 1.6, { align: "center" })
}

/** Layered gold-seal medal with ribbon tails (mirrors the cert's seal). */
function drawSeal(pdf: jsPDF, cx: number, cy: number) {
  // ribbons first (they tuck behind the medal)
  withOpacity(pdf, 0.95, () => {
    pdf.setFillColor(P.sealRing[0], P.sealRing[1], P.sealRing[2])
    pdf.lines([[3.6, 2.4], [-1.6, 8.6], [-3.6, -2.2]], cx - 3.4, cy + 2, [1, 1], "F", true)
    pdf.setFillColor(P.ribbonB[0], P.ribbonB[1], P.ribbonB[2])
    pdf.lines([[3.4, 2.2], [-1.8, 8.8], [-3.4, -2.0]], cx + 0.2, cy + 2, [1, 1], "F", true)
  })
  // medal
  pdf.setFillColor(P.sealInk[0], P.sealInk[1], P.sealInk[2])
  pdf.circle(cx, cy, 10, "F")
  pdf.setDrawColor(P.sealRing[0], P.sealRing[1], P.sealRing[2])
  pdf.setLineWidth(1.2)
  pdf.circle(cx, cy, 10, "S")
  withOpacity(pdf, 0.55, () => {
    pdf.setDrawColor(P.acc1[0], P.acc1[1], P.acc1[2])
    pdf.setLineWidth(0.45)
    pdf.circle(cx, cy, 7.7, "S")
  })
  // dot ring
  withOpacity(pdf, 0.6, () => {
    pdf.setFillColor(P.acc1[0], P.acc1[1], P.acc1[2])
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      pdf.circle(cx + Math.cos(a) * 8.85, cy + Math.sin(a) * 8.85, 0.5, "F")
    }
  })
  setKind(pdf, "bold", 8.5)
  pdf.setTextColor(P.acc1[0], P.acc1[1], P.acc1[2])
  pdf.text("GX", cx, cy + 1.4, { align: "center" })
  setKind(pdf, "mono", 3.9)
  pdf.setTextColor(P.muted[0], P.muted[1], P.muted[2])
  textTracked(pdf, "SECURE·LEARN·DEFEND", cx, cy + 4.6, 0.4, "center")
}

/** Signature squiggle - two smooth bezier waves (the cert's sig ink). */
function drawSquiggle(pdf: jsPDF, x: number, y: number) {
  withOpacity(pdf, 0.9, () => {
    pdf.setDrawColor(P.squiggle[0], P.squiggle[1], P.squiggle[2])
    pdf.setLineWidth(0.6)
    pdf.lines(
      [
        [5, -2.6, 10, 2.6, 15, -2],
        [4, -1.6, 8, 2, 12, -2.4],
      ],
      x, y, [1, 1], "S"
    )
  })
}
