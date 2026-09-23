import * as React from "react"
import { db } from "@/lib/db"
import { getReceiptBilling, receiptNumberFor } from "@/lib/receipt"
import { parseEmiPurpose } from "@/lib/installments"
import { ReceiptDownloadButton } from "@/components/receipt/receipt-download"
import { ShieldCheck } from "lucide-react"

/* GET /receipt/[orderId]
 * ---------------------
 * Public receipt page keyed by the (unguessable) order id - the same
 * link embedded in receipt emails. Renders a print-friendly light
 * receipt with a vector PDF download (client-side via the invoice PDF
 * engine). No auth so students can open the emailed link on any device.
 */

export const dynamic = "force-dynamic"

function fmt(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "₹"
  return `${symbol}${amount.toLocaleString(currency === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Row({ label, value, mono, strong }: { label: string; value: React.ReactNode; mono?: boolean; strong?: boolean }) {
  return (
    <tr>
      <td className="py-1.5 text-[13px] text-[#7c7392] align-top">{label}</td>
      <td className={`py-1.5 text-[13px] text-right align-top ${mono ? "font-mono" : ""} ${strong ? "font-semibold text-[#1f1235]" : "text-[#332a4d]"}`}>
        {value}
      </td>
    </tr>
  )
}

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
  })

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f4f2fb] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#e5e1f5] p-10 text-center max-w-md">
          <div className="text-[#2e1065] text-lg font-bold mb-2">Receipt not found</div>
          <p className="text-sm text-[#7c7392]">This receipt link is invalid or the payment record no longer exists.</p>
        </div>
      </main>
    )
  }

  const billing = await getReceiptBilling()
  const number = receiptNumberFor(order.id)
  const emi = parseEmiPurpose(order.purpose)
  const isEmi = !!emi
  const isPaid = order.status === "paid"

  const courseTitle = order.course?.title || "GuardianX Academy Course"
  const itemDescription = isEmi ? `${courseTitle} (Installment ${emi!.index} of ${emi!.total})` : courseTitle
  const paidDate = (order.updatedAt || order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const paymentId = order.razorpayPaymentId || (order.razorpaySignature?.startsWith("paypal") ? order.razorpayOrderId || "" : "")
  const provider = order.razorpaySignature?.startsWith("paypal") ? "PayPal" : "Razorpay"
  const taxIncluded = billing.gstin
    ? Math.round(((order.finalAmount * billing.taxRate) / (100 + billing.taxRate)) * 100) / 100
    : 0

  return (
    <main className="min-h-screen bg-[#f4f2fb] py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-[#2e1065] rounded-t-2xl px-7 py-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-white text-lg font-bold tracking-wide">{billing.companyName}</div>
            <div className="text-[#c4b5fd] text-xs mt-0.5">Cybersecurity Training &amp; Certification</div>
            <div className="text-[#ddd6fe] text-[11px] mt-2 leading-relaxed">{billing.address}</div>
          </div>
          <div className="shrink-0 w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-[#c4b5fd]" />
          </div>
        </div>

        {/* Body */}
        <div className="bg-white border-x border-b border-[#e5e1f5] px-7 py-7">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#1f1235]">Payment Receipt</h1>
            <span className={`text-[11px] font-semibold uppercase tracking-wider rounded-full px-3 py-1 ${
              isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isPaid ? "Paid" : order.status === "created" ? "Pending payment" : order.status}
            </span>
          </div>

          <table className="w-full mt-4">
            <tbody>
              <Row label="Receipt no." value={number} mono />
              <Row label="Date" value={paidDate} />
              <Row label="Billed to" value={`${order.user?.name || "Student"} <${order.user?.email || ""}>`} />
              {isPaid && <Row label="Payment method" value={provider} />}
              {isPaid && paymentId && <Row label="Payment ID" value={paymentId} mono />}
              {isEmi && <Row label="Installment plan" value={`Installment ${emi!.index} of ${emi!.total}`} />}
            </tbody>
          </table>

          {/* Item + totals */}
          <table className="w-full mt-5 border-t border-[#eee9fb]">
            <tbody>
              <tr>
                <td className="py-3 text-[13px] font-semibold text-[#1f1235]">{itemDescription}</td>
                <td className="py-3 text-right font-mono text-[13px] text-[#1f1235]">{fmt(order.finalAmount, order.currency)}</td>
              </tr>
              {order.discount > 0 && (
                <tr>
                  <td className="py-1 text-[12px] text-emerald-700">Coupon {order.couponCode || ""} discount applied</td>
                  <td className="py-1 text-right font-mono text-[12px] text-emerald-700">included</td>
                </tr>
              )}
              {billing.gstin && taxIncluded > 0 && (
                <tr>
                  <td className="py-1 text-[12px] text-[#7c7392]">Includes GST @ {billing.taxRate}% (GSTIN {billing.gstin})</td>
                  <td className="py-1 text-right font-mono text-[12px] text-[#7c7392]">{fmt(taxIncluded, order.currency)}</td>
                </tr>
              )}
              <tr>
                <td className="pt-4 pb-1 border-t border-[#eee9fb] text-[14px] font-bold text-[#1f1235]">
                  {isPaid ? "Total paid" : "Amount due"}
                </td>
                <td className="pt-4 pb-1 border-t border-[#eee9fb] text-right font-mono text-xl font-bold text-[#2e1065]">
                  {fmt(order.finalAmount, order.currency)}
                </td>
              </tr>
            </tbody>
          </table>

          {isEmi && (
            <p className="text-[12px] text-[#7c7392] mt-4 leading-relaxed">
              This payment covers installment {emi!.index} of {emi!.total} of your installment plan for this course.
              {emi!.index < emi!.total! && " Remaining installments can be paid anytime from your dashboard."}
            </p>
          )}

          {isPaid && (
            <div className="mt-6">
              <ReceiptDownloadButton
                data={{
                  number,
                  paidDate,
                  currency: order.currency,
                  clientName: order.user?.name || "Student",
                  clientEmail: order.user?.email || "",
                  itemDescription,
                  amountPaid: order.finalAmount,
                  gstin: billing.gstin,
                  taxRate: billing.taxRate,
                  taxIncluded,
                  provider,
                  paymentId: paymentId || order.id,
                  installmentNote: isEmi ? `Installment ${emi!.index} of ${emi!.total} for the course "${courseTitle}".` : "",
                  footerNote: billing.footerNote,
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#ece8fa] rounded-b-2xl px-7 py-4">
          <p className="text-[11px] text-[#7c7392]">Questions? Contact {billing.supportEmail}</p>
          <p className="text-[11px] text-[#9a92b3] mt-0.5">{billing.footerNote}</p>
        </div>

        <p className="text-center text-[11px] text-[#9a92b3] mt-4">
          Keep this link safe - anyone with it can view this receipt.
        </p>
      </div>
    </main>
  )
}
