/**
 * Minimal CSV parser - handles quoted fields with embedded commas and
 * double-quote escaping. No external dependency.
 *
 * Expected input: a CSV string with a header row.
 */

/** Parse a CSV string into rows of string arrays (header included). */
export function parseCsv(input: string): string[][] {
  if (!input) return []
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        row.push(field)
        field = ""
      } else if (ch === "\n") {
        row.push(field)
        rows.push(row)
        row = []
        field = ""
      } else {
        field += ch
      }
    }
  }
  // Flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop completely empty trailing rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

/** Parse CSV into objects keyed by lowercased header. */
export function parseCsvObjects(input: string): Record<string, string>[] {
  const rows = parseCsv(input)
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const out: Record<string, string>[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const obj: Record<string, string> = {}
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (row[j] ?? "").trim()
    }
    out.push(obj)
  }
  return out
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/** Generate a temporary password like `GX-A7K9PQ`. */
export function generateTempPassword(): string {
  // Avoid ambiguous characters (0/O, 1/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return `GX-${out}`
}
