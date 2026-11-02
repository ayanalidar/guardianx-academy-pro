import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureDirectCertificateTables } from "@/lib/direct-certs-bootstrap"
import {
  mintUniqueDirectCertificateId,
  generateDirectCertHash,
  mapDirectCertToAdminRow,
} from "@/lib/direct-certs"
import { projectsJson } from "@/lib/internship-projects"

export const runtime = "nodejs"

/* ============================================================
 * Direct-certificate admin API.
 *
 * GET  /api/admin/direct-certificates        -> all issued certificates.
 * POST /api/admin/direct-certificates        -> issue a NEW certificate
 *      WITHOUT an internship enrollment. The record is created WITH its
 *      GXI- certificateId + tamper-evident hash in one transaction (the
 *      admin's explicit act IS the issuance - no separate "issue later"
 *      step, no auto-anything). When the record carries a studentEmail
 *      and sendEmail !== false, the credential email (certificate ID +
 *      verify link) is sent best-effort; the response reports the
 *      outcome honestly.
 *
 * showPublicly defaults TRUE (direct certificates are minted
 * deliberately for the student to share). Gate it off per record to
 * make the certificate un-verifiable (anti-enumeration: 404).
 * Every mutation is audit-logged.
 * ============================================================ */

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

function dateOrNull(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function intOrNull(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : null
}

function jsonArr(v: unknown): string {
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 25))
  if (typeof v === "string") return JSON.stringify(v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25))
  return "[]"
}

export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureDirectCertificateTables()
  const rows = await db.directCertificate.findMany({
    orderBy: { certificateIssuedAt: "desc" },
    take: 500,
  })
  return NextResponse.json({ certificates: rows.map((r) => mapDirectCertToAdminRow(r)) })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureDirectCertificateTables()
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const studentName = strOrNull((body as any).studentName)
  const programTitle = strOrNull((body as any).programTitle)
  if (!studentName) return NextResponse.json({ error: "Student name is required." }, { status: 400 })
  if (!programTitle) return NextResponse.json({ error: "Program title is required." }, { status: 400 })

  // Issue = create: certificateId + hash are minted in THIS transaction.
  const certificateId = await mintUniqueDirectCertificateId()
  const issuedAt = dateOrNull((body as any).certificateIssuedAt) ?? new Date()

  const created = await db.directCertificate.create({
    data: {
      certificateId,
      studentName,
      studentEmail: strOrNull((body as any).studentEmail)?.toLowerCase() ?? null,
      programTitle,
      collegeName: strOrNull((body as any).collegeName),
      mentorName: strOrNull((body as any).mentorName),
      durationWeeks: intOrNull((body as any).durationWeeks, 1, 104),
      startDate: dateOrNull((body as any).startDate),
      endDate: dateOrNull((body as any).endDate),
      skills: jsonArr((body as any).skills),
      projects: projectsJson((body as any).projects),
      grade: strOrNull((body as any).grade)?.slice(0, 60) ?? null,
      score: intOrNull((body as any).score, 0, 100),
      remarks: strOrNull((body as any).remarks)?.slice(0, 400) ?? null,
      programDirector: strOrNull((body as any).programDirector)?.slice(0, 120) ?? null,
      showPublicly: (body as any).showPublicly === undefined ? true : !!(body as any).showPublicly,
      // Placeholder binding replaced right below once the row id exists -
      // the HMAC covers certificateId|recordId|domain|issuedAt.
      verificationHash: await generateDirectCertHash(certificateId, "pending", issuedAt),
      certificateIssuedAt: issuedAt,
    },
  })

  // Re-bind the hash to the real record id and persist.
  const verificationHash = await generateDirectCertHash(certificateId, created.id, issuedAt)
  const row = await db.directCertificate.update({
    where: { id: created.id },
    data: { verificationHash },
  })

  await logAction(
    user.id ?? null,
    user.email ?? user.name ?? "admin",
    "direct-certificate.issue",
    "directCertificate",
    row.id,
    { studentName, programTitle, certificateId, showPublicly: row.showPublicly }
  )

  // Best-effort credential email (never blocks the issue flow).
  let email: { ok: boolean; error?: string; skipped?: string } = { ok: false, skipped: "not-requested" }
  if (row.studentEmail && (body as any).sendEmail !== false) {
    const { emailDirectCertificate } = await import("@/lib/direct-cert-email")
    email = await emailDirectCertificate(row.id)
  }

  return NextResponse.json({ ok: true, certificate: mapDirectCertToAdminRow(row), email }, { status: 201 })
})
