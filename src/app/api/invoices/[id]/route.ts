import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody } from "@/lib/session"
import { parseInvoicePayload, computeTotals } from "@/lib/invoice-utils"

export const runtime = "nodejs"

/**
 * GET /api/invoices/[id] — ADMIN. Load one invoice (for re-editing).
 */
export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const invoice = await db.invoice.findUnique({ where: { id } })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  return NextResponse.json({ invoice })
})

/**
 * PATCH /api/invoices/[id] — ADMIN. Update an invoice.
 * Supports quick status changes ({ status: "Paid" }) and full edits.
 * Money columns are recomputed when items/rates change.
 */
export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const { data: body, error: bodyError } = await readJsonBody<any>(req, { maxBytes: 512 * 1024 })
  if (bodyError) return bodyError

  const existing = await db.invoice.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  const { data, error } = parseInvoicePayload(body, { partial: true })
  if (error || !data) {
    return NextResponse.json({ error: error || "Invalid invoice payload" }, { status: 400 })
  }

  // Renumber only if the number actually changed and is free
  if (data.number !== undefined && data.number !== existing.number) {
    const clash = await db.invoice.findUnique({ where: { number: data.number } })
    if (clash) {
      return NextResponse.json({ error: `Invoice number ${data.number} already exists` }, { status: 409 })
    }
  }

  // Recompute totals when any money-affecting field changed
  const affectsTotals =
    data.items !== undefined ||
    data.discountRate !== undefined ||
    data.taxRate !== undefined ||
    data.roundingAdjustment !== undefined

  let totalsPatch: { subtotal?: number; taxAmount?: number; total?: number } = {}
  if (affectsTotals) {
    const items = JSON.parse(data.items ?? existing.items)
    const totals = computeTotals(
      items,
      data.discountRate ?? existing.discountRate,
      data.taxRate ?? existing.taxRate,
      data.roundingAdjustment ?? existing.roundingAdjustment,
    )
    totalsPatch = { subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total }
  }

  const invoice = await db.invoice.update({
    where: { id },
    data: { ...data, ...totalsPatch },
  })
  return NextResponse.json({ invoice })
})

/**
 * DELETE /api/invoices/[id] — ADMIN. Remove a saved invoice.
 */
export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const existing = await db.invoice.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  await db.invoice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
