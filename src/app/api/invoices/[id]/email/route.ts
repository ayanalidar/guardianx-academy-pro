import { NextResponse } from "next/server"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { emailInvoiceToClient } from "@/lib/invoice-email"

export const runtime = "nodejs"
// PDF build (font/asset fetch + QR + jsPDF) plus the mailer round-trip can
// take a few seconds on a cold lambda - give it room.
export const maxDuration = 60

/**
 * POST /api/invoices/[id]/email - ADMIN. Generate the saved invoice's PDF
 * server-side and email it to the client with full details (items, EMI
 * schedule, UPI/bank info). Uses the same engine as the payment receipts.
 */
export const POST = withErrorHandler(async (_req: unknown, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const result = await emailInvoiceToClient(id)
  if (!result.ok) {
    // 404 for a missing record; 400-class for "no client email" / build issues
    const status = result.error === "Invoice not found" ? 404 : 400
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }
  return NextResponse.json({ ok: true, transport: result.transport, pages: result.pages })
})
