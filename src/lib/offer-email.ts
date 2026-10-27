/**
 * offer-email.ts - server-side "generate + email the internship offer
 * letter" pipeline.
 *
 * Mirrors the proven invoice-email.ts flow exactly: build the SAME vector
 * A4 offer letter PDF the admin downloads (src/lib/offer-letter-pdf.ts runs
 * in Node too - fonts + the logo are fetched from the live origin and
 * cached module-level; the QR is rasterised with the qrcode package),
 * compose a branded BLACKOPS-toned HTML body with the offer summary, and
 * attach the PDF via the existing dual-transport mailer (Hostinger Mail
 * API / SMTP).
 *
 * Honesty rule baked into the copy: the email and the letter both state
 * that the certificate is issued SEPARATELY upon successful completion -
 * an ongoing student never receives (or is promised) a certificate.
 */
import QRCode from "qrcode"
import { db } from "@/lib/db"
import { sendEmailDetailed, emailSocialLinksHtml, type EmailAttachment } from "@/lib/email"
import { serverFontLoader } from "@/lib/receipt-pdf"
import { buildOfferLetterPdf, type OfferLetterData } from "@/lib/offer-letter-pdf"
import { generateOfferRef, isPlausibleOfferRef } from "@/lib/offer-refs"

const SITE_ORIGIN = "https://academy.guardianx.cloud"

const _assetCache = new Map<string, Promise<string | null>>()

function fetchAssetDataUrl(path: string): Promise<string | null> {
  let p = _assetCache.get(path)
  if (!p) {
    p = fetch(`${SITE_ORIGIN}${path}`, { cache: "force-cache" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`)
        const buf = Buffer.from(await r.arrayBuffer())
        return `data:image/png;base64,${buf.toString("base64")}`
      })
      .catch((e: any) => {
        console.warn(`[offer-email] asset ${path} unavailable - continuing without it:`, e?.message)
        return null
      })
    _assetCache.set(path, p)
  }
  return p
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function mapRecordToOfferData(
  record: {
    offerRef: string | null
    studentName: string
    role: string
    mentorName: string | null
    programDirector: string | null
    startDate: Date | null
    endDate: Date | null
    createdAt: Date
  },
  internship: {
    title: string
    company: string
    domain: string
    mode: string
    durationWeeks: number
    collegeName: string
    collegeCity: string | null
    stipend: string | null
  } | null,
  offerRef: string
): OfferLetterData {
  return {
    offerRef,
    issuedAt: record.startDate ?? record.createdAt,
    studentName: record.studentName,
    role: record.role,
    mentorName: record.mentorName,
    programDirector: record.programDirector,
    startDate: record.startDate?.toISOString() ?? null,
    endDate: record.endDate?.toISOString() ?? null,
    internship: {
      title: internship?.title ?? record.role,
      company: internship?.company ?? "GuardianX Academy",
      domain: internship?.domain ?? "Cyber Security",
      mode: internship?.mode ?? "remote",
      durationWeeks: internship?.durationWeeks ?? 8,
      collegeName: internship?.collegeName ?? "GuardianX Academy",
      collegeCity: internship?.collegeCity ?? null,
      stipend: internship?.stipend ?? null,
    },
  }
}

/** Build the offer letter PDF for a record (used by the email + admin download). */
export async function buildOfferEmailPdf(
  data: OfferLetterData
): Promise<{ pdf: Awaited<ReturnType<typeof buildOfferLetterPdf>>; pages: number }> {
  const logo = await fetchAssetDataUrl("/guardianx-logo-v2.png")
  const verifyUrl = `${SITE_ORIGIN}/verify/${encodeURIComponent(data.offerRef)}`

  let qrPngDataUrl: string | null = null
  try {
    qrPngDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    })
  } catch (e: any) {
    console.warn("[offer-email] QR generation failed - continuing without QR:", e?.message)
  }

  const pdf = await buildOfferLetterPdf(data, {
    logoPngDataUrl: logo,
    qrPngDataUrl,
    verifyUrl,
    loadFontFile: serverFontLoader(),
  })
  return { pdf, pages: pdf.getNumberOfPages() }
}

/** Branded offer email body - dark BLACKOPS-toned shell, email-client safe. */
export function buildOfferEmailHtml(data: OfferLetterData): string {
  const d = data
  const weeks = d.internship.durationWeeks
  const mode = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" }[d.internship.mode] ?? d.internship.mode
  const verifyUrl = `${SITE_ORIGIN}/verify/${encodeURIComponent(d.offerRef)}`

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#8e8598;white-space:nowrap;padding-right:14px;">${esc(label)}</td>
      <td style="padding:6px 0;font-size:13px;color:#faf7f5;font-weight:600;">${esc(value)}</td>
    </tr>`

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0507;border-radius:12px;border:1px solid #3a1218;">
  <div style="text-align:center;padding:30px 40px 0;">
    <h1 style="color:#ffffff;font-size:24px;margin:0;">Guardian<span style="color:#e11d2e;">X</span> Academy</h1>
    <p style="color:#8e8598;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;margin-top:5px;">Cyber Defense Institute</p>
    <div style="height:2px;width:64px;background:linear-gradient(90deg,#e11d2e,#f59e0b,#ff5a4e);margin:18px auto 0;border-radius:2px;"></div>
  </div>
  <div style="padding:22px 40px 8px;">
    <p style="color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:0.28em;margin:0 0 10px;">INTERNSHIP OFFER LETTER</p>
    <h2 style="color:#ffffff;font-size:19px;margin:0 0 14px;">Congratulations, ${esc(d.studentName.split(/\s+/)[0] || "student")} - you're in.</h2>
    <p style="color:#c2b9bd;font-size:13.5px;line-height:1.7;margin:0 0 18px;">
      Your official offer letter for the internship below is attached as a PDF. Keep it safe -
      it is the formal confirmation of your selection, and its reference can be verified online by anyone.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#150709;border:1px solid #3a1218;border-radius:10px;padding:14px 18px;">
      ${row("CANDIDATE", d.studentName)}
      ${row("POSITION", d.role)}
      ${row("PROGRAM", d.internship.title)}
      ${row("INSTITUTION", d.internship.collegeName)}
      ${row("DURATION", `${weeks} weeks · ${mode}`)}
      ${d.startDate ? row("BEGINS", fmtDate(d.startDate)) : ""}
      ${row("OFFER REF", d.offerRef)}
    </table>
    <div style="margin:18px 0 0;padding:12px 16px;background:#1a0b0e;border:1px solid #e11d2e40;border-radius:10px;">
      <p style="margin:0;font-size:12px;color:#d8a0a8;line-height:1.6;">
        <strong style="color:#ff6b5e;">Note:</strong> your status is <strong style="color:#f59e0b;">ONGOING</strong> -
        the verifiable certificate of internship completion is issued separately by GuardianX Academy once you
        successfully complete the program. Until then this offer letter is your official credential.
      </p>
    </div>
    <div style="text-align:center;margin:22px 0 4px;">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#e11d2e,#b3141f);color:#ffffff;font-size:14px;font-weight:700;padding:13px 30px;border-radius:8px;text-decoration:none;letter-spacing:0.04em;">Verify the offer letter</a>
    </div>
  </div>
  <hr style="border:none;border-top:1px solid #2a0f13;margin:16px 0 0;" />
  <div style="padding:14px 40px 22px;text-align:center;">
    <p style="color:#6d6266;font-size:11px;margin:0 0 4px;">GuardianX Academy · Cyber Security Training in India · <a href="${SITE_ORIGIN}" style="color:#8e8598;text-decoration:none;">academy.guardianx.cloud</a></p>
    ${emailSocialLinksHtml("dark")}
  </div>
</div>`
}

/**
 * Ensure the record has an offerRef (generate + persist when missing),
 * build the PDF and email it to the student. Records the send time.
 *
 * Never throws: email failure is returned as { ok:false, error } so a mail
 * outage can never block the admin's add-student flow.
 */
export async function emailOfferLetterToStudent(
  recordId: string,
  opts: { offerRef?: string } = {}
): Promise<{ ok: boolean; error?: string; transport?: string; offerRef?: string; skipped?: string }> {
  const record = await db.internshipRecord.findUnique({ where: { id: recordId } })
  if (!record) return { ok: false, error: "Internship record not found" }
  if (!record.studentEmail || !record.studentEmail.trim()) {
    return { ok: false, skipped: "no-email", error: "This student has no email on the record - add one first." }
  }

  // Ensure a stable offer ref: reuse the provided one, else whatever is on
  // the record, else mint + persist a fresh one (idempotent per record).
  let offerRef = opts.offerRef || record.offerRef || ""
  if (!isPlausibleOfferRef(offerRef)) {
    offerRef = generateOfferRef()
    await db.internshipRecord.update({ where: { id: record.id }, data: { offerRef } }).catch(() => null)
  }

  const internship = await db.internship.findUnique({
    where: { id: record.internshipId },
    select: {
      title: true, company: true, domain: true, mode: true, durationWeeks: true,
      collegeName: true, collegeCity: true, stipend: true,
    },
  })

  const data = mapRecordToOfferData(record, internship, offerRef)

  // Build the PDF BEFORE sending so an asset/font failure surfaces as a clean
  // error instead of a silently attachment-less email.
  let attachment: EmailAttachment
  let pages = 1
  try {
    const built = await buildOfferEmailPdf(data)
    pages = built.pages
    const base64 = Buffer.from(built.pdf.output("arraybuffer")).toString("base64")
    attachment = {
      filename: `GuardianX-Offer-Letter-${data.offerRef}.pdf`,
      content: base64,
      contentType: "application/pdf",
    }
  } catch (e: any) {
    console.error("[offer-email] PDF build failed:", e)
    return { ok: false, error: e?.message || "Failed to build the offer letter PDF", offerRef }
  }

  const html = buildOfferEmailHtml(data)
  const result = await sendEmailDetailed({
    to: record.studentEmail.trim(),
    subject: `Internship Offer - ${data.role} at GuardianX Academy (${data.offerRef})`,
    html,
    attachments: [attachment],
  })

  if (result.ok) {
    await db.internshipRecord
      .update({ where: { id: record.id }, data: { offerSentAt: new Date() } })
      .catch(() => null)
  }
  console.log(`[offer-email] offer ${data.offerRef} for ${record.studentName}: ok=${result.ok} pages=${pages} transport=${result.transport ?? "none"}`)
  return { ...result, offerRef }
}
