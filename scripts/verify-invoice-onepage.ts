/**
 * verify-invoice-onepage.ts — regression harness for the single-page invoice
 * requirement. Replicates the user's real EMI invoice (GX-INV-2026-8523) and
 * asserts the PDF stays on ONE page; also smoke-tests non-EMI, light theme,
 * and the multi-item flow so nothing else regressed.
 *
 * Usage: npx tsx scripts/verify-invoice-onepage.ts
 * Output: PDFs + page-count report in /home/z/my-project/tmp/invoice-verify/
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { buildInvoicePdf, type InvoicePdfData } from "../src/lib/invoice-pdf"

const OUT = "/home/z/my-project/tmp/invoice-verify"
mkdirSync(OUT, { recursive: true })

// Resolve the repo root relative to THIS script so the harness works from
// any checkout / git worktree (the old hard-coded clone path broke when the
// sandbox was reset to an older commit without the newer public assets).
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..")
const logoDataUrl = `data:image/png;base64,${readFileSync(`${REPO}/public/guardianx-logo-v2.png`).toString("base64")}`
const sigDark = `data:image/png;base64,${readFileSync(`${REPO}/public/signature-dark.png`).toString("base64")}`
const sigLight = `data:image/png;base64,${readFileSync(`${REPO}/public/signature-light.png`).toString("base64")}`
// 1x1 white PNG - layout only, scannability is irrelevant to pagination
const qrStub = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const loadFontFile = async (path: string) => readFileSync(`${REPO}/public${path}`)

/** The user's real invoice (from the 2-page sample they attached). */
const userInvoice: InvoicePdfData = {
  number: "GX-INV-2026-8523",
  status: "Paid",
  issueDate: "2026-09-27T00:00:00.000Z",
  dueDate: "2026-10-12T00:00:00.000Z",
  currency: "INR",
  clientName: "Jyothi P",
  clientOrg: "DXC Technology",
  clientEmail: "jyothi.c9859@gmail.com",
  clientPhone: "Ph: 98806-61671",
  clientAddress: "WeWork Galaxy, 4th Floor, Behind Maurya Bakery, Kothanur 5th phase, JP Nagar, Bangalore 560076",
  items: [
    { description: "CyberArk IAM - PAM Training (Weekends)", quantity: 1, unitPrice: 25000, icon: "training" },
    { description: "CyberArk Lab", quantity: 1, unitPrice: 0, icon: "lab" },
  ],
  discountRate: 0,
  taxRate: 0,
  roundingAdjustment: 0,
  gstSplit: true,
  notes: "Payment due within 15 days of invoice date. Late payments subject to applicable taxes. Prices are inclusive of all taxes unless otherwise stated.",
  terms: "1. Training includes mentor-led sessions, study materials, and lab access.\n2. Certification exam support and guidance provided.\n3. Refunds within 30 days if not satisfied.\n4. Cancellation 7+ days before batch start - no refund applicable.\n5. GuardianX Academy is not liable for third-party certification exam outcomes.",
  bankName: "Jammu & Kashmir Bank",
  accountName: "GuardianX",
  accountNumber: "077836010000715",
  ifscCode: "JAKA0KANKHA",
  upiId: "gyanalidar@okaxis",
  emiPlan: [
    { label: "Installment 1", percent: 50, amount: 12500, dueDate: "2026-09-27T00:00:00.000Z", status: "Paid" },
    { label: "Installment 2", percent: 50, amount: 12500, dueDate: "2026-10-12T00:00:00.000Z", status: "Pending" },
  ],
}

/** Same invoice WITHOUT EMI - must stay a comfortable single page. */
const noEmi: InvoicePdfData = { ...userInvoice, emiPlan: null, status: "Sent" }

/** Richer invoice: 4 items, 18% GST, discount - a realistic stress case. */
const stress: InvoicePdfData = {
  ...userInvoice,
  number: "GX-INV-2026-8600",
  status: "Sent",
  items: [
    { description: "CyberArk IAM - PAM Training (Weekend cohort, live mentor sessions)", quantity: 1, unitPrice: 25000, icon: "training" },
    { description: "CyberArk Lab Access - 31 adversarial lab environments, 3 months", quantity: 1, unitPrice: 5000, icon: "lab" },
    { description: "Official Certification Exam Voucher + Proctored Attempt", quantity: 1, unitPrice: 12000, icon: "cert" },
    { description: "Resume & Interview Workshop", quantity: 2, unitPrice: 1500, icon: "workshop" },
  ],
  discountRate: 5,
  taxRate: 18,
}

async function main() {
  const cases: Array<{ name: string; data: InvoicePdfData; expectMax: number; theme: "dark" | "light" }> = [
    { name: "user-emi-dark", data: userInvoice, expectMax: 1, theme: "dark" },
    { name: "user-emi-light", data: userInvoice, expectMax: 1, theme: "light" },
    { name: "no-emi-dark", data: noEmi, expectMax: 1, theme: "dark" },
    { name: "stress-emi-dark", data: stress, expectMax: 2, theme: "dark" },
  ]
  let failures = 0
  for (const c of cases) {
    const pdf = await buildInvoicePdf(c.data, {
      theme: c.theme,
      logoPngDataUrl: logoDataUrl,
      qrPngDataUrl: qrStub,
      signatureDarkThemeDataUrl: sigDark,
      signatureLightThemeDataUrl: sigLight,
      loadFontFile,
    })
    const pages = pdf.getNumberOfPages()
    const ok = pages <= c.expectMax
    if (!ok) failures++
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}: ${pages} page(s) (max ${c.expectMax})`)
    writeFileSync(`${OUT}/${c.name}.pdf`, Buffer.from(pdf.output("arraybuffer")))
  }
  console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`)
  if (failures > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
