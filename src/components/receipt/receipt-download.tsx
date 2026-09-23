"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { buildInvoicePdf } from "@/lib/invoice-pdf"

/* ============================================================
   Receipt PDF download - reuses the native vector A4 invoice
   engine (src/lib/invoice-pdf.ts) so the receipt is print-grade
   without any server-side PDF dependency. The document is
   generated client-side from the receipt data embedded in the
   page.
   ============================================================ */

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

/** Flatten transparent pixels onto the header violet so jsPDF can embed
 *  the shield without an /SMask (Chrome print drops SMask'd images). */
export async function buildReceiptLogoPng(): Promise<string | null> {
  try {
    const img = new Image()
    img.src = "/guardianx-logo-v2.png"
    await img.decode()
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#2E1065"
    ctx.fillRect(0, 0, 256, 256)
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}

export function ReceiptDownloadButton({ data }: { data: ReceiptPdfData }) {
  const [busy, setBusy] = React.useState(false)

  async function handleDownload() {
    setBusy(true)
    try {
      toast.info("Generating PDF receipt…")
      const logo = await buildReceiptLogoPng()
      const pdf = await buildInvoicePdf(
        {
          number: data.number,
          status: "Paid",
          issueDate: data.paidDate,
          dueDate: null,
          currency: data.currency,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          items: [{ description: data.itemDescription, quantity: 1, unitPrice: data.amountPaid }],
          discountRate: 0,
          taxRate: data.gstin ? data.taxRate : 0,
          roundingAdjustment: 0,
          gstSplit: false,
          notes: [
            data.installmentNote,
            `Paid via ${data.provider} - Payment ID ${data.paymentId}`,
            data.gstin ? `GSTIN ${data.gstin} · GST @ ${data.taxRate}% included in the price` : "",
          ].filter(Boolean).join("\n"),
          terms: data.footerNote,
        },
        { qrPngDataUrl: null, logoPngDataUrl: logo, theme: "light" },
      )
      pdf.save(`${data.number}.pdf`)
      toast.success("Receipt PDF downloaded")
    } catch (e: any) {
      console.error("[receipt-pdf]", e)
      toast.error(e?.message || "Failed to generate PDF")
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-[#2e1065] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3b1a80] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download PDF receipt
    </button>
  )
}
