import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { sendEmailDetailed, type EmailAttachment } from "@/lib/email"
import { parseEmiPurpose } from "@/lib/installments"
import { buildReceiptPdf } from "@/lib/receipt-pdf"

/* ============================================================
   Payment receipts - automated, branded, zero-migration
   ------------------------------------------------------------
   Fired from the two payment success paths (Razorpay verify +
   PayPal capture) for every paid order, including each EMI
   installment. Everything below is admin-editable via
   Platform Settings → Payments:

     RECEIPT_COMPANY_NAME  RECEIPT_GSTIN       RECEIPT_TAX_RATE
     RECEIPT_ADDRESS       RECEIPT_SUPPORT_EMAIL
     RECEIPT_FOOTER_NOTE

   Receipt number: GX-RCPT-<year>-<orderId last 8> - derived
   from the order id, so it is unique and needs no DB write.

   The online version lives at /receipt/<orderId> and offers a
   vector PDF download built with the existing invoice PDF
   engine (src/lib/invoice-pdf.ts).
   ============================================================ */

export interface ReceiptBilling {
  companyName: string
  gstin: string
  taxRate: number
  address: string
  supportEmail: string
  footerNote: string
}

export async function getReceiptBilling(): Promise<ReceiptBilling> {
  const s = await getSettings([
    "RECEIPT_COMPANY_NAME", "RECEIPT_GSTIN", "RECEIPT_TAX_RATE",
    "RECEIPT_ADDRESS", "RECEIPT_SUPPORT_EMAIL", "RECEIPT_FOOTER_NOTE",
  ])
  const parsedRate = Number.parseFloat(s.RECEIPT_TAX_RATE || "")
  return {
    companyName: s.RECEIPT_COMPANY_NAME?.trim() || "GuardianX Academy",
    gstin: s.RECEIPT_GSTIN?.trim() || "",
    taxRate: Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 18,
    address: s.RECEIPT_ADDRESS?.trim() || "Nooripora, Baramulla, Kashmir 193401 · Gautam Buddha Nagar, Noida 201301",
    supportEmail: s.RECEIPT_SUPPORT_EMAIL?.trim() || "academy@guardianx.in",
    footerNote: s.RECEIPT_FOOTER_NOTE?.trim() || "This is an electronically generated receipt and does not require a signature.",
  }
}

export function receiptNumberFor(orderId: string): string {
  return `GX-RCPT-${new Date().getFullYear()}-${orderId.slice(-8).toUpperCase()}`
}

export function receiptUrlFor(orderId: string): string {
  return `https://academy.guardianx.cloud/receipt/${orderId}`
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function fmt(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "₹"
  return `${symbol}${amount.toLocaleString(currency === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Send the branded HTML receipt email for a paid order, with the same
 * vector PDF receipt (as the /receipt page download) attached.
 * Best-effort by contract: callers wrap this in try/catch so an
 * email failure can never fail a completed payment. A PDF-generation
 * failure degrades to sending the email without the attachment.
 */
export async function sendPaymentReceipt(params: {
  order: { id: string; purpose?: string | null; amount: number; currency: string; finalAmount: number; discount: number; couponCode: string | null; courseId: string | null; razorpayPaymentId: string | null; createdAt: Date; updatedAt: Date }
  user: { id: string; name?: string | null; email?: string | null }
  provider: "Razorpay" | "PayPal"
  paymentId: string
}): Promise<boolean> {
  const { order, user, provider, paymentId } = params
  if (!user.email) return false

  const billing = await getReceiptBilling()
  const number = receiptNumberFor(order.id)
  let courseTitle = "GuardianX Academy Course"
  let purposeLabel = ""

  const parsed = parseEmiPurpose(order.purpose)
  if (parsed) {
    purposeLabel = `Installment ${parsed.index} of ${parsed.total}`
  }
  if (order.courseId) {
    const course = await db.course.findUnique({ where: { id: order.courseId }, select: { title: true } })
    if (course) courseTitle = course.title
  }

  const paidDate = (order.updatedAt || order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const taxIncluded = billing.gstin
    ? Math.round(((order.finalAmount * billing.taxRate) / (100 + billing.taxRate)) * 100) / 100
    : 0

  const itemDesc = purposeLabel ? `${courseTitle} (${purposeLabel})` : courseTitle

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f2fb;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#2e1065;border-radius:16px 16px 0 0;padding:24px 28px;">
      <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">${esc(billing.companyName)}</div>
      <div style="color:#c4b5fd;font-size:12px;margin-top:2px;">Cybersecurity Training &amp; Certification</div>
      <div style="color:#ddd6fe;font-size:11px;margin-top:8px;">${esc(billing.address)}</div>
    </div>
    <div style="background:#ffffff;padding:28px;border:1px solid #e5e1f5;border-top:none;">
      <div style="font-size:20px;font-weight:700;color:#1f1235;">Payment Receipt</div>
      <table style="width:100%;font-size:13px;color:#4b4263;margin-top:12px;border-collapse:collapse;">
        <tr><td style="padding:3px 0;color:#7c7392;">Receipt no.</td><td style="text-align:right;font-family:monospace;color:#1f1235;font-weight:600;">${esc(number)}</td></tr>
        <tr><td style="padding:3px 0;color:#7c7392;">Date</td><td style="text-align:right;">${esc(paidDate)}</td></tr>
        <tr><td style="padding:3px 0;color:#7c7392;">Billed to</td><td style="text-align:right;">${esc(user.name || "Student")} &lt;${esc(user.email)}&gt;</td></tr>
        <tr><td style="padding:3px 0;color:#7c7392;">Payment method</td><td style="text-align:right;">${esc(provider)}</td></tr>
        <tr><td style="padding:3px 0;color:#7c7392;">Payment ID</td><td style="text-align:right;font-family:monospace;font-size:12px;">${esc(paymentId)}</td></tr>
      </table>

      <table style="width:100%;margin-top:20px;border-top:1px solid #eee9fb;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:12px 0;color:#1f1235;font-weight:600;">${esc(itemDesc)}</td>
          <td style="padding:12px 0;text-align:right;font-family:monospace;color:#1f1235;">${fmt(order.finalAmount, order.currency)}</td>
        </tr>
        ${order.discount > 0 ? `<tr><td style="padding:3px 0;color:#0d9464;">Coupon ${esc(order.couponCode || "")} discount applied</td><td style="padding:3px 0;text-align:right;color:#0d9464;font-family:monospace;">included</td></tr>` : ""}
        ${taxIncluded > 0 ? `<tr><td style="padding:3px 0;color:#7c7392;">Includes GST @ ${billing.taxRate}% (GSTIN ${esc(billing.gstin)})</td><td style="padding:3px 0;text-align:right;font-family:monospace;color:#7c7392;">${fmt(taxIncluded, order.currency)}</td></tr>` : ""}
        <tr>
          <td style="padding:14px 0 4px;border-top:1px solid #eee9fb;font-weight:700;color:#1f1235;">Total paid</td>
          <td style="padding:14px 0 4px;border-top:1px solid #eee9fb;text-align:right;font-weight:700;font-size:17px;color:#2e1065;font-family:monospace;">${fmt(order.finalAmount, order.currency)}</td>
        </tr>
      </table>

      <a href="${receiptUrlFor(order.id)}" style="display:inline-block;margin-top:22px;background:#2e1065;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 22px;border-radius:8px;">View &amp; download PDF receipt</a>

      ${purposeLabel ? `<p style="font-size:12px;color:#7c7392;margin-top:16px;">This payment covers ${esc(purposeLabel.toLowerCase())} of your installment plan. Remaining installments can be paid anytime from your <a href="https://academy.guardianx.cloud/dashboard" style="color:#2e1065;">dashboard</a>.</p>` : ""}
    </div>
    <div style="padding:16px 28px;background:#ece8fa;border-radius:0 0 16px 16px;">
      <p style="font-size:11px;color:#7c7392;margin:0 0 4px;">Questions? Contact ${esc(billing.supportEmail)}</p>
      <p style="font-size:11px;color:#9a92b3;margin:0;">${esc(billing.footerNote)}</p>
    </div>
  </div>
</body>
</html>`

  // Build the identical vector PDF the receipt page offers and attach it.
  // Any failure here is non-fatal - the email still goes out with the
  // online receipt link inside.
  let attachments: EmailAttachment[] | undefined
  try {
    const pdf = await buildReceiptPdf({
      number,
      paidDate,
      currency: order.currency,
      clientName: user.name || "Student",
      clientEmail: user.email,
      itemDescription: itemDesc,
      amountPaid: order.finalAmount,
      gstin: billing.gstin,
      taxRate: billing.taxRate,
      taxIncluded,
      provider,
      paymentId,
      installmentNote: parsed
        ? `Installment ${parsed.index} of ${parsed.total} for the course "${courseTitle}".`
        : "",
      footerNote: billing.footerNote,
    })
    const base64 = Buffer.from(pdf.output("arraybuffer")).toString("base64")
    attachments = [{ filename: `${number}.pdf`, content: base64, contentType: "application/pdf" }]
  } catch (e) {
    console.warn("[receipt] PDF attachment generation failed - sending email without attachment:", e)
  }

  const result = await sendEmailDetailed({
    to: user.email,
    subject: `Payment receipt ${number} - ${purposeLabel ? `${purposeLabel} - ` : ""}${courseTitle}`,
    html,
    attachments,
  })
  return result.ok
}
