/**
 * render-sample-invoice.ts — builds sample invoice PDFs in Node for visual
 * verification of BOTH themes (dark cyber / light print), including a
 * multi-page Paid invoice with watermark.
 *
 * Usage: npx tsx scripts/render-sample-invoice.ts
 * Output: /home/z/my-project/download/sample-invoice-{dark,light}*.pdf
 */
import { readFileSync } from "node:fs"
import { buildInvoicePdf, type InvoicePdfData } from "../src/lib/invoice-pdf"

const OUT = "/home/z/my-project/download"

const logoB64 = readFileSync("/home/z/my-project/repo-guardianx/public/guardianx-logo-v2.png").toString("base64")
const logoDataUrl = `data:image/png;base64,${logoB64}`

const base: InvoicePdfData = {
  number: "GX-INV-2026-0080",
  status: "Sent",
  issueDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 15 * 864e5).toISOString(),
  currency: "INR",
  clientName: "Rohan Mehta",
  clientOrg: "NexaTech Solutions Pvt. Ltd.",
  clientEmail: "rohan@nexatech.in",
  clientPhone: "+91 98450 12345",
  clientAddress: "4th Floor, Prestige Tech Park, Outer Ring Road, Kadubeesanahalli, Bengaluru 560103",
  items: [
    { description: "CEH v13 Certification Training Batch — weekend cohort with live mentor labs", quantity: 1, unitPrice: 35000, icon: "training" },
    { description: "Hands-on Cyber Lab Access (3 months) — 31 adversarial lab environments", quantity: 1, unitPrice: 5000, icon: "lab" },
    { description: "Official Exam Voucher + Proctored Certification Attempt", quantity: 1, unitPrice: 12000, icon: "cert" },
  ],
  discountRate: 5,
  taxRate: 18,
  roundingAdjustment: 0,
  gstSplit: true,
  notes: "Payment due within 15 days of invoice date. Late payments subject to 2% monthly interest.",
  terms: "Training includes instructor-led sessions, study material and lab access. Certification exam fee is separate unless stated. Cancellation: 50% refund if cancelled 7+ days before start.",
  bankName: "Jammu & Kashmir Bank",
  accountName: "GuardianX",
  accountNumber: "07840410200005715",
  ifscCode: "JAKA0KUDUCHI",
  upiId: "guardianx@okaxis",
}

const multi: InvoicePdfData = {
  ...base,
  status: "Paid",
  items: Array.from({ length: 14 }, (_, i) => ({
    description: `Secure Code Review Module ${i + 1} — static & dynamic analysis workshop with guided lab exercises`,
    quantity: 1,
    unitPrice: 4500,
    icon: (["training", "lab", "cert", "workshop"] as const)[i % 4],
  })),
}

async function main() {
  const loadFontFile = async (path: string) => readFileSync(`/home/z/my-project/repo-guardianx/public${path}`)
  for (const theme of ["dark", "light"] as const) {
    const single = await buildInvoicePdf(base, { theme, logoPngDataUrl: logoDataUrl, qrPngDataUrl: null, loadFontFile })
    single.save(`${OUT}/sample-invoice-${theme}.pdf`)
    console.log(`saved sample-invoice-${theme}.pdf`)

    const multiPdf = await buildInvoicePdf(multi, { theme, logoPngDataUrl: logoDataUrl, qrPngDataUrl: null, loadFontFile })
    multiPdf.save(`${OUT}/sample-invoice-${theme}-multipage.pdf`)
    console.log(`saved sample-invoice-${theme}-multipage.pdf`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
