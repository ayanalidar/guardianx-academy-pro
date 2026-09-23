/**
 * receipt-pdf.ts - shared receipt PDF builder (browser AND server).
 *
 * Single source of truth for turning ReceiptPdfData into the vector A4
 * receipt via the invoice PDF engine (src/lib/invoice-pdf.ts, light theme).
 * Used by:
 *   - the /receipt/[orderId] page download button (browser, canvas-flattened logo)
 *   - sendPaymentReceipt() in src/lib/receipt.ts (server, attached to the
 *     payment confirmation email through the Hostinger Mail API / SMTP)
 *   - the admin "Email" test button (sample attachment end-to-end check)
 *
 * SERVER FONT NOTE: the engine's default font loader fetches "/fonts/..."
 * with a RELATIVE url - that works in the browser but not in Node. When
 * window is undefined we inject an absolute-URL loader against the site
 * origin with a module-level cache, so the rupee glyph renders identically
 * in emailed PDFs. If the fetch fails the engine degrades gracefully to
 * Helvetica + "Rs.".
 */
import { buildInvoicePdf } from "@/lib/invoice-pdf"

export interface ReceiptPdfData {
  number: string
  paidDate: string
  currency: string
  clientName: string
  clientEmail: string
  itemDescription: string
  amountPaid: number
  gstin: string
  taxRate: number
  taxIncluded: number
  provider: string
  paymentId: string
  installmentNote: string
  footerNote: string
}

const SITE_ORIGIN = "https://academy.guardianx.cloud"

/** Module-level font cache - one fetch per lambda/container instance. */
const _fontCache = new Map<string, Promise<ArrayBuffer>>()

function serverFontLoader(): (path: string) => Promise<ArrayBuffer> {
  return (path: string) => {
    let p = _fontCache.get(path)
    if (!p) {
      p = fetch(`${SITE_ORIGIN}${path}`, { cache: "force-cache" }).then((r) => {
        if (!r.ok) throw new Error(`font ${path}: ${r.status}`)
        return r.arrayBuffer()
      })
      _fontCache.set(path, p)
      // Don't cache failures - the next send may succeed (cold network etc.)
      p.catch(() => _fontCache.delete(path))
    }
    return p
  }
}

export async function buildReceiptPdf(
  data: ReceiptPdfData,
  opts: { logoPngDataUrl?: string | null; loadFontFile?: (path: string) => Promise<ArrayBuffer> } = {},
): Promise<ReturnType<typeof buildInvoicePdf>> {
  // Receipts are TAX-INCLUSIVE: the student pays `amountPaid` as the final
  // total. The engine adds tax ON TOP of the item price (Subtotal + Tax =
  // Total), so feed it an ex-tax unit price such that Subtotal + Tax equals
  // `amountPaid` exactly. Without a GSTIN there is no tax row and the unit
  // price is the full amount (previous behaviour, unchanged).
  const rate = data.gstin ? data.taxRate : 0
  const unitPrice = rate > 0 ? Math.round((data.amountPaid / (1 + rate / 100)) * 100) / 100 : data.amountPaid

  return buildInvoicePdf(
    {
      number: data.number,
      status: "Paid",
      issueDate: data.paidDate,
      dueDate: null,
      currency: data.currency,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      items: [{ description: data.itemDescription, quantity: 1, unitPrice }],
      discountRate: 0,
      taxRate: rate,
      roundingAdjustment: 0,
      gstSplit: false,
      notes: [
        data.installmentNote,
        `Paid via ${data.provider} - Payment ID ${data.paymentId}`,
        data.gstin ? `GSTIN ${data.gstin} - GST @ ${data.taxRate}% included in the price` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      terms: data.footerNote,
    },
    {
      qrPngDataUrl: null,
      logoPngDataUrl: opts.logoPngDataUrl ?? null,
      theme: "light",
      // Browser: engine default (relative fetch). Server: absolute-URL loader.
      loadFontFile: opts.loadFontFile ?? (typeof window === "undefined" ? serverFontLoader() : undefined),
    },
  )
}
