/**
 * Invoice helpers — shared validation + server-side totals for /api/invoices.
 *
 * Totals are ALWAYS recomputed server-side from the line items and rates so
 * the stored record can never be tampered with from the client (the browser
 * sends items + rates, not the money columns).
 */

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"] as const
export const INVOICE_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const
export const INVOICE_ITEM_ICONS = ["training", "lab", "cert", "workshop"] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number]

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  icon: string
}

export interface InvoiceTotals {
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
}

const MAX_ITEMS = 100
const MAX_TEXT = 500
const MAX_SHORT_TEXT = 200

function asTruncatedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  return value.slice(0, max)
}

function clampRate(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? 0))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 100)
}

function clampMoney(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? 0))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 999_999_999)
}

/** Validate + normalize line items. Returns null when the payload is invalid. */
export function parseItems(raw: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(raw)) return null
  if (raw.length > MAX_ITEMS) return null
  const items: InvoiceLineItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") return null
    const description = asTruncatedString((item as any).description, MAX_TEXT)
    if (description === null) return null
    const quantity = clampMoney((item as any).quantity)
    const unitPrice = clampMoney((item as any).unitPrice)
    const iconRaw = (item as any).icon
    const icon = (INVOICE_ITEM_ICONS as readonly string[]).includes(iconRaw) ? iconRaw : "training"
    items.push({ description, quantity, unitPrice, icon })
  }
  return items
}

/** Recompute money columns from items + rates (mirrors the client formula). */
export function computeTotals(
  items: InvoiceLineItem[],
  discountRate: number,
  taxRate: number,
  roundingAdjustment: number,
): InvoiceTotals {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const discountAmount = (subtotal * discountRate) / 100
  const taxableAmount = subtotal - discountAmount
  const taxAmount = (taxableAmount * taxRate) / 100
  const total = taxableAmount + taxAmount + (roundingAdjustment || 0)
  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    total: round2(total),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Validate + normalize the full invoice payload (create or update).
 * Returns { data } on success or { error: "message" } on failure.
 * `partial` skips required-field checks (PATCH of a subset).
 */
export function parseInvoicePayload(
  body: any,
  opts: { partial?: boolean } = {},
): { data?: Record<string, any>; error?: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" }
  const partial = opts.partial === true
  const out: Record<string, any> = {}

  // Number
  if (body.number !== undefined || !partial) {
    const number = asTruncatedString(body.number, 60)?.trim()
    if (!number) return { error: "Invoice number is required" }
    out.number = number
  }

  // Client fields
  const clientName = asTruncatedString(body.clientName, MAX_SHORT_TEXT)?.trim()
  if (clientName) out.clientName = clientName
  else if (!partial) return { error: "Client name is required" }

  for (const [key, max] of [
    ["clientOrg", MAX_SHORT_TEXT],
    ["clientEmail", MAX_SHORT_TEXT],
    ["clientPhone", MAX_SHORT_TEXT],
    ["clientAddress", MAX_TEXT],
  ] as const) {
    if (body[key] !== undefined) {
      const v = asTruncatedString(body[key], max)
      out[key] = v && v.trim() ? v.trim() : null
    }
  }

  // Items (when provided)
  if (body.items !== undefined) {
    const items = parseItems(body.items)
    if (items === null) return { error: "Invalid line items" }
    if (items.length === 0 && !partial) return { error: "At least one line item is required" }
    out.items = JSON.stringify(items)
  } else if (!partial) {
    return { error: "Line items are required" }
  }

  // Currency
  if (body.currency !== undefined) {
    if (!(INVOICE_CURRENCIES as readonly string[]).includes(body.currency)) {
      return { error: "Invalid currency" }
    }
    out.currency = body.currency
  }

  // Status
  if (body.status !== undefined) {
    if (!(INVOICE_STATUSES as readonly string[]).includes(body.status)) {
      return { error: "Invalid status" }
    }
    out.status = body.status
  }

  // Rates + rounding
  if (body.discountRate !== undefined) out.discountRate = clampRate(body.discountRate)
  if (body.taxRate !== undefined) out.taxRate = clampRate(body.taxRate)
  if (body.roundingAdjustment !== undefined) {
    const n = typeof body.roundingAdjustment === "number" ? body.roundingAdjustment : 0
    out.roundingAdjustment = Number.isFinite(n) ? Math.max(-999, Math.min(999, n)) : 0
  }

  // Dates
  for (const key of ["issueDate", "dueDate"] as const) {
    if (body[key] !== undefined) {
      const v = asTruncatedString(body[key], 10)?.trim()
      out[key] = v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : key === "issueDate" ? new Date().toISOString().split("T")[0] : null
    }
  }
  if (!partial && !out.issueDate) {
    out.issueDate = new Date().toISOString().split("T")[0]
  }

  // Long text fields
  for (const key of ["notes", "terms"] as const) {
    if (body[key] !== undefined) {
      const v = asTruncatedString(body[key], 2000)
      out[key] = v && v.trim() ? v : null
    }
  }

  // Bank details
  for (const key of ["bankName", "accountName", "accountNumber", "ifscCode", "upiId"] as const) {
    if (body[key] !== undefined) {
      const v = asTruncatedString(body[key], 100)
      out[key] = v && v.trim() ? v.trim() : null
    }
  }

  return { data: out }
}
