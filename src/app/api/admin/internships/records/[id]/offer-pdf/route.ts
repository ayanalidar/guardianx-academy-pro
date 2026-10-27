import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureInternshipTables } from "@/lib/internships-bootstrap"
import { generateOfferRef, isPlausibleOfferRef } from "@/lib/offer-refs"
import { mapRecordToOfferData, buildOfferEmailPdf } from "@/lib/offer-email"

export const runtime = "nodejs"

/* ============================================================
 * GET /api/admin/internships/records/[id]/offer-pdf
 *
 * Admin-only download of the student's offer letter PDF.
 * Server-built from the SAVED record (the authoritative version -
 * exactly what the emailed letter carries). Legacy records without
 * an offerRef get one minted + persisted on the fly, so the
 * downloaded ref is stable from this call onwards.
 * ============================================================ */
export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()
  const { id } = await params

  const record = await db.internshipRecord.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: "Internship record not found" }, { status: 404 })

  // Stable ref: reuse, or mint + persist for legacy records.
  let offerRef = record.offerRef ?? ""
  if (!isPlausibleOfferRef(offerRef)) {
    offerRef = generateOfferRef()
    await db.internshipRecord
      .update({ where: { id: record.id }, data: { offerRef } })
      .catch(() => null)
  }

  const internship = await db.internship.findUnique({
    where: { id: record.internshipId },
    select: {
      title: true, company: true, domain: true, mode: true, durationWeeks: true,
      collegeName: true, collegeCity: true, stipend: true,
    },
  })

  const data = mapRecordToOfferData(record, internship, offerRef)
  const built = await buildOfferEmailPdf(data)
  const bytes = Buffer.from(built.pdf.output("arraybuffer"))

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.record.offer.pdf", "internshipRecord", id, {
    studentName: record.studentName,
    offerRef,
  })

  const safeName = record.studentName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "student"
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="GuardianX-Offer-Letter-${safeName}-${offerRef}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
})
