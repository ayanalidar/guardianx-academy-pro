import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody } from "@/lib/session"

export const runtime = "nodejs"

/**
 * POST /api/admin/leads/import
 *
 * CSV import for leads - the rescue path for Google Form responses that were
 * collected BEFORE the Apps Script webhook was set up (or that failed to sync).
 * The admin exports the Google Form responses sheet as CSV and pastes/uploads
 * it here; every row is upserted by email (like the live webhook does).
 *
 * Body: { csv: string, source?: string }
 *
 * Column mapping is automatic (case/spacing-insensitive contains matching),
 * covering the Google Forms export headers this platform recommends:
 *   Timestamp, Name, Email, Phone, Organization, Type, Requirement, Message
 */

const LEAD_TYPES = ["Individual", "School", "College", "University", "Corporate", "Partner", "Workshop", "CTF", "Webinar"]

/** RFC4180-ish CSV parser: handles quoted fields, embedded commas/newlines, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, "") // strip BOM
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(field); field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.some((c) => c.trim() !== "")) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some((c) => c.trim() !== "")) rows.push(row)
  return rows
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

function mapHeaders(headers: string[]) {
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => {
    const n = norm(h)
    if (idx.name === undefined && ["name", "fullname", "yourname", "studentname", "contactname"].includes(n)) idx.name = i
    else if (idx.email === undefined && ["email", "emailaddress", "mail", "youremail"].includes(n)) idx.email = i
    else if (idx.phone === undefined && ["phone", "mobile", "phonenumber", "contactnumber", "contact", "whatsapp"].includes(n)) idx.phone = i
    else if (idx.organization === undefined && ["organization", "organisation", "organizationinstitution", "institution", "institute", "school", "college", "university", "company", "organizationname"].includes(n)) idx.organization = i
    else if (idx.type === undefined && ["type", "leadtype", "audience", "institutiontype", "category"].includes(n)) idx.type = i
    else if (idx.requirement === undefined && ["requirement", "requirements", "need", "interest", "course", "training", "courseinterest"].includes(n)) idx.requirement = i
    else if (idx.message === undefined && ["message", "query", "question", "comment", "additionalinformation", "anythingelse"].includes(n)) idx.message = i
    else if (idx.timestamp === undefined && ["timestamp", "submittedat", "date", "createdat"].includes(n)) idx.timestamp = i
  })
  return idx
}

function scoreFor(type: string, requirement: string): number {
  let score = 0
  const typeScores: Record<string, number> = {
    University: 40, College: 35, Corporate: 30, School: 25, Partner: 20, Individual: 10,
  }
  score += typeScores[type] || 10
  const req = requirement.toLowerCase()
  if (req.includes("mou") || req.includes("partnership")) score += 20
  if (req.includes("bulk") || req.includes("batch") || req.includes("cohort")) score += 15
  if (req.includes("certification") || req.includes("ceh") || req.includes("cissp")) score += 10
  if (req.includes("campus") || req.includes("on-campus") || req.includes("on-premises")) score += 10
  if (req.includes("budget") || req.includes("funded")) score += 15
  return Math.min(100, score)
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { data, error } = await readJsonBody<{ csv?: string; source?: string }>(req, { maxBytes: 4 * 1024 * 1024 })
  if (error) return error
  const csv = (data?.csv ?? "").trim()
  if (!csv) return NextResponse.json({ error: "CSV content required" }, { status: 400 })

  const rows = parseCsv(csv)
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV needs a header row plus at least one data row" }, { status: 400 })
  }

  const headers = rows[0]!.map((h) => h.trim())
  const idx = mapHeaders(headers)
  if (idx.name === undefined && idx.email === undefined) {
    return NextResponse.json({
      error: "Could not find a Name or Email column in the header row",
      headers,
    }, { status: 400 })
  }

  const source = data?.source?.trim() || "Google Form"
  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!
    const get = (i?: number) => (i !== undefined ? (row[i] ?? "").trim() : "")
    const name = get(idx.name)
    const email = get(idx.email).toLowerCase() || null
    if (!name && !email) { errors.push(`Row ${r + 1}: missing name and email - skipped`); continue }

    const typeRaw = get(idx.type)
    const typeMatch = LEAD_TYPES.find((t) => norm(t) === norm(typeRaw))
    const type = typeMatch ?? "Individual"
    const requirementText = [get(idx.requirement), get(idx.message)].filter(Boolean).join(" - ")
    const score = scoreFor(type, requirementText)
    const ts = get(idx.timestamp)
    const createdAt = ts && !isNaN(Date.parse(ts)) ? new Date(ts) : undefined

    try {
      const existing = email ? await db.lead.findFirst({ where: { email } }) : null
      if (existing) {
        await db.lead.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            phone: get(idx.phone) || existing.phone,
            organization: get(idx.organization) || existing.organization,
            source,
            ...(score > (existing.score ?? 0) ? { score } : {}),
          },
        })
        updated++
      } else {
        const lead = await db.lead.create({
          data: {
            name: name || "Unknown",
            email,
            phone: get(idx.phone) || null,
            organization: get(idx.organization) || null,
            type,
            status: "New",
            source,
            score,
            ...(createdAt ? { createdAt } : {}),
          },
        })
        if (requirementText) {
          await db.leadNote.create({ data: { leadId: lead.id, content: requirementText, authorId: null } }).catch(() => {})
        }
        await db.leadStatusHistory.create({ data: { leadId: lead.id, fromStatus: null, toStatus: "New" } }).catch(() => {})
        created++
      }
    } catch (e: any) {
      errors.push(`Row ${r + 1}: ${String(e?.message || "database error").slice(0, 120)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped: errors.length,
    errors: errors.slice(0, 10),
    mappedColumns: Object.keys(idx),
  })
})
