"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { buildReceiptPdf, type ReceiptPdfData } from "@/lib/receipt-pdf"

/* ============================================================
   Receipt PDF download - uses the shared receipt PDF builder
   (src/lib/receipt-pdf.ts) so the downloadable PDF is pixel-
   identical to the one attached to payment confirmation emails.
   The document is generated client-side; the only browser-only
   piece is the canvas logo flattening (jsPDF can't embed
   SMask'd PNGs safely for print).
   ============================================================ */

export type { ReceiptPdfData }

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
      const pdf = await buildReceiptPdf(data, { logoPngDataUrl: logo })
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
