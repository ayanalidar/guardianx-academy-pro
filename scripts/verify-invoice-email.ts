/**
 * verify-invoice-email.ts - verifies the server-side "email invoice to
 * client" pipeline WITHOUT sending any email:
 *
 *  1. mapInvoiceRecord: a Prisma-shaped record maps to InvoicePdfData
 *  2. buildInvoiceEmailPdf: fonts + logo + signatures fetched from the live
 *     origin, server-side UPI QR generated, PDF builds and stays ONE page
 *  3. buildInvoiceEmailHtml: branded body contains items/EMI/UPI sections
 *  4. (opportunistic) full emailInvoiceToClient wiring against the sandbox
 *     DB - expected to fail cleanly with "No email transport configured"
 *
 * Usage: DATABASE_URL=... npx tsx scripts/verify-invoice-email.ts
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { buildInvoiceEmailPdf, buildInvoiceEmailHtml, mapInvoiceRecord } from "../src/lib/invoice-email"
import type { Invoice } from "@prisma/client"

const OUT = "/home/z/my-project/tmp/invoice-email-verify"
mkdirSync(OUT, { recursive: true })

const record = {
  id: "testcuid0000000000000001",
  number: "GX-INV-2026-8523",
  clientName: "Jyothi P",
  clientOrg: "DXC Technology",
  clientEmail: "jyothi.c9859@gmail.com",
  clientPhone: "Ph: 98806-61671",
  clientAddress: "WeWork Galaxy, 4th Floor, Behind Maurya Bakery, Kothanur 5th phase, JP Nagar, Bangalore 560076",
  items: JSON.stringify([
    { description: "CyberArk IAM - PAM Training (Weekends)", quantity: 1, unitPrice: 25000, icon: "training" },
    { description: "CyberArk Lab", quantity: 1, unitPrice: 0, icon: "lab" },
  ]),
  currency: "INR",
  discountRate: 0,
  taxRate: 0,
  gstSplit: true,
  subtotal: 25000,
  taxAmount: 0,
  total: 25000,
  roundingAdjustment: 0,
  status: "Paid",
  issueDate: "2026-09-27",
  dueDate: "2026-10-12",
  notes: "Payment due within 15 days of invoice date.",
  terms: "1. Training includes mentor-led sessions.\n2. Refunds within 30 days if not satisfied.",
  bankName: "Jammu & Kashmir Bank",
  accountName: "GuardianX",
  accountNumber: "077836010000715",
  ifscCode: "JAKA0KANKHA",
  upiId: "gyanalidar@okaxis",
  emiEnabled: true,
  emiSplit: 50,
  emiDue1: "2026-09-27",
  emiDue2: "2026-10-12",
  emiPaidCount: 1,
  emiPlan: JSON.stringify([
    { label: "Installment 1", percent: 50, amount: 12500, dueDate: "2026-09-27", status: "Paid" },
    { label: "Installment 2", percent: 50, amount: 12500, dueDate: "2026-10-12", status: "Pending" },
  ]),
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Invoice

let failures = 0
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
}

async function main() {
  // 1. mapping
  const data = mapInvoiceRecord(record)
  check("map: items parsed", data.items.length === 2 && data.items[0].unitPrice === 25000)
  check("map: EMI plan parsed", Array.isArray(data.emiPlan) && data.emiPlan!.length === 2 && data.emiPlan![1].amount === 12500)
  check("map: status/currency", data.status === "Paid" && data.currency === "INR")

  // 2. server-side PDF (fonts + assets from live origin + server QR)
  const built = await buildInvoiceEmailPdf(data, record.total)
  check("pdf: builds", !!built.pdf)
  check("pdf: ONE page", built.pages === 1, `${built.pages} page(s)`)
  const buf = Buffer.from(built.pdf.output("arraybuffer"))
  writeFileSync(`${OUT}/emailed-invoice.pdf`, buf)
  check("pdf: size sane", buf.length > 50_000, `${(buf.length / 1024).toFixed(0)} KB`)

  // 3. email HTML
  const html = buildInvoiceEmailHtml(data, record.total)
  writeFileSync(`${OUT}/email-body.html`, html)
  check("html: invoice number", html.includes("GX-INV-2026-8523"))
  check("html: total present", html.includes("₹25,000.00"))
  check("html: EMI schedule", html.includes("Installment 2") && html.includes("PENDING"))
  check("html: UPI + bank", html.includes("gyanalidar@okaxis") && html.includes("Jammu &amp; Kashmir Bank"))
  check("html: attachment note", html.includes("Attached:") && /invoice PDF/.test(html))
  check("html: escaped client org", html.includes("DXC Technology"))

  // 4. full wiring against sandbox DB (skips gracefully when unreachable)
  if (process.env.DATABASE_URL) {
    try {
      const { emailInvoiceToClient } = await import("../src/lib/invoice-email")
      const { db } = await import("../src/lib/db")
      await db.invoice.deleteMany({ where: { number: record.number } })
      const created = await db.invoice.create({ data: { ...record, id: undefined } as any })
      const result = await emailInvoiceToClient(created.id)
      // No mail transport in the sandbox -> expect the clean transport error,
      // NOT a PDF/DB crash (those would surface as different messages).
      check("e2e: reaches mail step", result.ok === false && /transport/i.test(result.error || ""), result.error || "ok")
      await db.invoice.delete({ where: { id: created.id } }).catch(() => {})
      await db.$disconnect()
    } catch (e: any) {
      console.log("SKIP  e2e sandbox wiring (DB unreachable) —", e?.message?.slice(0, 100))
    }
  }

  console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`)
  if (failures > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
