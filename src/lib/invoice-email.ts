/**
 * invoice-email.ts - server-side "email the invoice to the client" pipeline.
 *
 * Mirrors the proven payment-receipt flow (src/lib/receipt.ts): build the
 * SAME vector A4 invoice PDF the admin downloads (src/lib/invoice-pdf.ts runs
 * in Node too - fonts + assets are fetched from the live origin and cached
 * module-level), compose a branded HTML body with the full invoice details
 * (items, EMI schedule, UPI/bank coordinates), and attach the PDF via the
 * existing dual-transport mailer (Hostinger Mail API / SMTP).
 *
 * The emailed PDF is generated from the SAVED database record - the server
 * already owns totals and the EMI snapshot, so what the client receives is
 * always the authoritative version, never stale editor state.
 */
import QRCode from "qrcode"
import { db } from "@/lib/db"
import {
  sendEmailDetailed,
  emailSocialLinksHtml,
  type EmailAttachment,
} from "@/lib/email"
import { serverFontLoader } from "@/lib/receipt-pdf"
import { buildInvoicePdf, type InvoicePdfData, type InvoiceStatus } from "@/lib/invoice-pdf"
import type { EmiPlanRow } from "@/lib/invoice-utils"
import type { Invoice } from "@prisma/client"

const SITE_ORIGIN = "https://academy.guardianx.cloud"

// ---------------------------------------------------------------------------
// asset loading (logo + signatures) - fetched once per lambda instance
// ---------------------------------------------------------------------------
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
        console.warn(`[invoice-email] asset ${path} unavailable - continuing without it:`, e?.message)
        return null
      })
    _assetCache.set(path, p)
  }
  return p
}

// ---------------------------------------------------------------------------
// record -> PDF data mapping (mirrors the editor's collectPdfData())
// ---------------------------------------------------------------------------
export function mapInvoiceRecord(inv: Invoice): InvoicePdfData {
  let items: InvoicePdfData["items"] = []
  try {
    const parsed = JSON.parse(inv.items)
    if (Array.isArray(parsed)) {
      items = parsed.map((it: any) => ({
        description: String(it?.description ?? ""),
        quantity: Number(it?.quantity) || 0,
        unitPrice: Number(it?.unitPrice) || 0,
        icon: typeof it?.icon === "string" ? it.icon : undefined,
      }))
    }
  } catch {
    items = []
  }

  let emiPlan: EmiPlanRow[] | null = null
  if (inv.emiEnabled && inv.emiPlan) {
    try {
      const parsed = JSON.parse(inv.emiPlan)
      if (Array.isArray(parsed) && parsed.length > 0) emiPlan = parsed
    } catch {
      emiPlan = null
    }
  }

  return {
    number: inv.number,
    status: inv.status as InvoiceStatus,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate || null,
    currency: inv.currency,
    clientName: inv.clientName,
    clientOrg: inv.clientOrg,
    clientEmail: inv.clientEmail,
    clientPhone: inv.clientPhone,
    clientAddress: inv.clientAddress,
    items,
    discountRate: inv.discountRate,
    taxRate: inv.taxRate,
    roundingAdjustment: inv.roundingAdjustment,
    gstSplit: inv.gstSplit,
    notes: inv.notes,
    terms: inv.terms,
    bankName: inv.bankName,
    accountName: inv.accountName,
    accountNumber: inv.accountNumber,
    ifscCode: inv.ifscCode,
    upiId: inv.upiId,
    emiPlan,
  }
}

// ---------------------------------------------------------------------------
// PDF + email HTML builders (exported for verification scripts)
// ---------------------------------------------------------------------------

/** Same UPI deep-link payload the on-screen QR carries: when an installment
 *  is pending, the QR charges exactly that part (not the full total). */
function upiUri(data: InvoicePdfData, total: number): string {
  const nextDue = data.emiPlan?.find((r) => r.status !== "Paid") ?? null
  const amount = (nextDue ? nextDue.amount : total).toFixed(2)
  return (
    `upi://pay?pa=${encodeURIComponent(data.upiId || "")}` +
    `&pn=${encodeURIComponent(data.accountName || "GuardianX")}` +
    `&am=${amount}&cu=${data.currency === "INR" ? "INR" : "USD"}` +
    `&tn=${encodeURIComponent(data.number)}`
  )
}

export async function buildInvoiceEmailPdf(data: InvoicePdfData, total: number): Promise<{ pdf: Awaited<ReturnType<typeof buildInvoicePdf>>; pages: number }> {
  const [logo, sigDark, sigLight] = await Promise.all([
    fetchAssetDataUrl("/guardianx-logo-v2.png"),
    fetchAssetDataUrl("/signature-dark.png"),
    fetchAssetDataUrl("/signature-light.png"),
  ])

  let qrPngDataUrl: string | null = null
  if (data.upiId && total > 0) {
    try {
      // 512px raster on white - same spec as the browser-side canvas raster
      qrPngDataUrl = await QRCode.toDataURL(upiUri(data, total), {
        width: 512,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
      })
    } catch (e: any) {
      console.warn("[invoice-email] QR generation failed - continuing without QR:", e?.message)
      qrPngDataUrl = null
    }
  }

  const pdf = await buildInvoicePdf(data, {
    theme: "dark",
    logoPngDataUrl: logo,
    qrPngDataUrl,
    signatureDarkThemeDataUrl: sigDark,
    signatureLightThemeDataUrl: sigLight,
    loadFontFile: serverFontLoader(),
  })
  return { pdf, pages: pdf.getNumberOfPages() }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function money(amount: number, currency: string): string {
  const locales: Record<string, { locale: string; symbol: string }> = {
    INR: { locale: "en-IN", symbol: "₹" },
    USD: { locale: "en-US", symbol: "$" },
    EUR: { locale: "de-DE", symbol: "€" },
    GBP: { locale: "en-GB", symbol: "£" },
  }
  const c = locales[currency] ?? locales.INR
  return `${c.symbol}${amount.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/** Branded invoice email body - table-based, inline styles, email-client safe
 *  (same conventions as the receipt email). */
export function buildInvoiceEmailHtml(data: InvoicePdfData, total: number): string {
  const st = data.status
  const stColor =
    st === "Paid" ? "#10b981" : st === "Overdue" ? "#f43f5e" : st === "Sent" ? "#0891b2" : "#71717a"
  const cur = data.currency

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const discountAmount = (subtotal * data.discountRate) / 100
  const taxable = subtotal - discountAmount
  const taxAmount = taxable * (data.taxRate / 100)
  const cgst = data.gstSplit && cur === "INR" ? taxAmount / 2 : 0
  const rows: Array<[string, string]> = []
  rows.push(["Subtotal", money(subtotal, cur)])
  if (data.discountRate > 0) rows.push([`Discount (${data.discountRate}%)`, `-${money(discountAmount, cur)}`])
  if (data.gstSplit && cur === "INR") {
    rows.push([`CGST (${data.taxRate / 2}%)`, money(cgst, cur)])
    rows.push([`SGST (${data.taxRate / 2}%)`, money(cgst, cur)])
  } else {
    rows.push([data.taxRate > 0 ? `Tax (${data.taxRate}%)` : "Tax", money(taxAmount, cur)])
  }
  if (data.roundingAdjustment !== 0)
    rows.push(["Rounding", `${data.roundingAdjustment > 0 ? "+" : "-"}${money(Math.abs(data.roundingAdjustment), cur)}`])

  const itemsHtml = data.items
    .map(
      (it) => `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #e7e2f5;font-size:13px;color:#18181b;">${esc(it.description || "—")}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e7e2f5;font-size:13px;color:#52525b;text-align:center;">${it.quantity}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e7e2f5;font-size:13px;color:#18181b;text-align:right;font-weight:600;">${money(it.quantity * it.unitPrice, cur)}</td>
    </tr>`,
    )
    .join("")

  const totalsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px;font-size:12px;color:#7c7392;text-align:right;">${esc(label)}</td><td style="padding:4px 12px;font-size:12px;color:#18181b;text-align:right;width:110px;">${value}</td></tr>`,
    )
    .join("")

  const emiHtml = data.emiPlan?.length
    ? `<div style="margin:18px 0 0;padding:14px 16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#6d28d9;">PAYMENT SCHEDULE — 2 INSTALLMENTS</p>
        ${data.emiPlan
          .map(
            (r: EmiPlanRow) =>
              `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid #e9e5fb;">
              <span style="font-size:13px;color:#18181b;">${esc(r.label)} · ${r.percent}% <span style="color:#9a92b3;">· due ${fmtDate(r.dueDate)}</span></span>
              <span style="font-size:13px;font-weight:700;color:${r.status === "Paid" ? "#047857" : "#b45309"};">${r.status === "Paid" ? "PAID" : "PENDING"} · ${money(r.amount, cur)}</span>
            </div>`,
          )
          .join("")}
      </div>`
    : ""

  const payHtml = (data.upiId || data.bankName)
    ? `<div style="margin:18px 0 0;padding:14px 16px;background:#f7f6fb;border:1px solid #e7e2f5;border-radius:12px;font-size:12px;color:#3f3a52;line-height:1.7;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#6d28d9;">HOW TO PAY</p>
        ${data.upiId ? `<p style="margin:0;">Scan the UPI QR on the attached PDF, or pay to UPI ID <strong style="color:#18181b;">${esc(data.upiId)}</strong>${data.emiPlan?.length ? ` (the QR charges the next due installment)` : ""}.</p>` : ""}
        ${data.bankName ? `<p style="margin:${data.upiId ? "4px" : "0"} 0 0;">Or bank transfer — ${esc(data.bankName)}${data.accountName ? ` · A/C name: <strong style="color:#18181b;">${esc(data.accountName)}</strong>` : ""}${data.accountNumber ? ` · A/C no: <strong style="color:#18181b;">${esc(data.accountNumber)}</strong>` : ""}${data.ifscCode ? ` · IFSC: ${esc(data.ifscCode)}` : ""}.</p>` : ""}
      </div>`
    : ""

  return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#f2f0f7;">
<div style="max-width:600px;margin:24px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="background:#2e1065;border-radius:16px 16px 0 0;padding:20px 28px;">
    <table role="presentation" width="100%"><tr>
      <td><p style="margin:0;font-size:15px;font-weight:800;color:#ffffff;letter-spacing:0.06em;">GUARDIANX ACADEMY</p>
          <p style="margin:2px 0 0;font-size:11px;color:#c4b5fd;">Cybersecurity Training &amp; Certification</p></td>
      <td style="text-align:right;">
        <p style="margin:0;font-size:12px;color:#e9d5ff;font-weight:600;">INVOICE</p>
        <p style="margin:2px 0 0;font-size:12px;color:#a78bfa;font-family:monospace;">${esc(data.number)}</p>
        <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;background:${stColor};color:#fff;font-size:10px;font-weight:700;letter-spacing:0.08em;">${esc(st.toUpperCase())}</span>
      </td>
    </tr></table>
  </div>
  <div style="background:#ffffff;padding:24px 28px;">
    <table role="presentation" width="100%"><tr>
      <td>
        <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#9a92b3;">BILLED TO</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#18181b;">${esc(data.clientName)}${data.clientOrg ? ` · ${esc(data.clientOrg)}` : ""}</p>
        ${data.clientEmail ? `<p style="margin:2px 0 0;font-size:12px;color:#7c7392;">${esc(data.clientEmail)}</p>` : ""}
      </td>
      <td style="text-align:right;vertical-align:top;">
        <p style="margin:0;font-size:26px;font-weight:800;color:#2e1065;">${money(total, cur)}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#9a92b3;">Issued ${fmtDate(data.issueDate)}${data.dueDate ? ` · Due ${fmtDate(data.dueDate)}` : ""}</p>
      </td>
    </tr></table>

    <table role="presentation" width="100%" style="margin:18px 0 0;border:1px solid #e7e2f5;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
      <tr style="background:#f5f3ff;">
        <td style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6d28d9;">ITEM</td>
        <td style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6d28d9;text-align:center;">QTY</td>
        <td style="padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6d28d9;text-align:right;">AMOUNT</td>
      </tr>
      ${itemsHtml}
    </table>

    <table role="presentation" width="100%" style="margin:10px 0 0;">${totalsHtml}</table>
    <table role="presentation" width="100%" style="margin:8px 0 0;border-top:2px solid #2e1065;">
      <tr><td style="padding:8px 12px 0 0;font-size:12px;font-weight:800;color:#2e1065;text-align:right;letter-spacing:0.06em;">TOTAL</td>
          <td style="padding:8px 0 0;font-size:15px;font-weight:800;color:#2e1065;text-align:right;width:110px;">${money(total, cur)}</td></tr>
    </table>

    ${emiHtml}
    ${payHtml}

    <div style="margin:18px 0 0;padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
      <p style="margin:0;font-size:12px;color:#065f46;"><strong>Attached:</strong> the complete invoice PDF — print it or keep it for your records.</p>
    </div>

    ${data.notes ? `<p style="margin:16px 0 0;font-size:11px;color:#7c7392;line-height:1.6;">${esc(data.notes)}</p>` : ""}
  </div>
  <div style="background:#ece8fa;border-radius:0 0 16px 16px;padding:14px 28px;">
    <p style="margin:0 0 4px;font-size:11px;color:#7c7392;">Questions? Reply to this email or write to <a href="mailto:academy@guardianx.in" style="color:#2e1065;">academy@guardianx.in</a>.</p>
    ${emailSocialLinksHtml("light")}
  </div>
</div>
</body></html>`
}

// ---------------------------------------------------------------------------
// main entry - email a SAVED invoice to its client
// ---------------------------------------------------------------------------
export async function emailInvoiceToClient(
  invoiceId: string,
): Promise<{ ok: boolean; error?: string; transport?: string; pages?: number }> {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return { ok: false, error: "Invoice not found" }
  if (!inv.clientEmail || !inv.clientEmail.trim()) {
    return { ok: false, error: "This invoice has no client email - add one and save first" }
  }

  const data = mapInvoiceRecord(inv)

  // Build the PDF BEFORE sending so an asset/font failure surfaces as a clean
  // error instead of a silently attachment-less email.
  let attachment: EmailAttachment
  let pages = 1
  try {
    const built = await buildInvoiceEmailPdf(data, inv.total)
    pages = built.pages
    const base64 = Buffer.from(built.pdf.output("arraybuffer")).toString("base64")
    attachment = { filename: `${inv.number}.pdf`, content: base64, contentType: "application/pdf" }
  } catch (e: any) {
    console.error("[invoice-email] PDF build failed:", e)
    return { ok: false, error: e?.message || "Failed to build the invoice PDF" }
  }

  const html = buildInvoiceEmailHtml(data, inv.total)
  const result = await sendEmailDetailed({
    to: inv.clientEmail.trim(),
    subject: `Invoice ${inv.number} from GuardianX Academy - ${money(inv.total, inv.currency)}`,
    html,
    attachments: [attachment],
  })
  return { ...result, pages }
}
