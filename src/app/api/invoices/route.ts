import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody } from "@/lib/session"
import { parseInvoicePayload, computeTotals } from "@/lib/invoice-utils"

export const runtime = "nodejs"

/**
 * GET /api/invoices — ADMIN. List saved invoices, newest first.
 * Capped at 500 rows; the generator view only needs the recent list.
 */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  return NextResponse.json({ invoices, count: invoices.length })
})

/**
 * POST /api/invoices — ADMIN. Create a saved invoice.
 *
 * Money columns (subtotal/taxAmount/total) are ALWAYS recomputed server-side
 * from the validated line items + rates — the client payload can never
 * tamper with them. Duplicate invoice numbers return 409.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { data: body, error: bodyError } = await readJsonBody<any>(req, { maxBytes: 512 * 1024 })
  if (bodyError) return bodyError

  const { data, error } = parseInvoicePayload(body, { partial: false })
  if (error || !data) {
    return NextResponse.json({ error: error || "Invalid invoice payload" }, { status: 400 })
  }

  const clash = await db.invoice.findUnique({ where: { number: data.number } })
  if (clash) {
    return NextResponse.json(
      { error: `Invoice number ${data.number} already exists` },
      { status: 409 }
    )
  }

  const items = JSON.parse(data.items as string)
  const totals = computeTotals(
    items,
    (data.discountRate as number) ?? 0,
    (data.taxRate as number) ?? 0,
    (data.roundingAdjustment as number) ?? 0,
  )

  const invoice = await db.invoice.create({
    data: {
      ...(data as any),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      createdById: user.id,
    },
  })

  return NextResponse.json({ invoice }, { status: 201 })
})
