import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isPlausibleOfferRef } from "@/lib/offer-refs"

export const runtime = "nodejs"

/* ============================================================
 * GET /api/internships/offer/[offerRef] - PUBLIC.
 *
 * Capability-URL pattern (same trust model as /verify): the offer
 * ref is a random unique code printed on the letter + encoded in
 * its QR, so possession of the link is what grants access. Used by
 * the QR on the offer letter and by /verify/<offerRef>.
 *
 * Returns ONLY non-sensitive fields - no email, no internal ids.
 * Verifying an OFFER is not verifying a CERTIFICATE: the response
 * is explicit that the certificate is issued separately on
 * completion (ongoing internships never expose one).
 * ============================================================ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offerRef: string }> }
) {
  try {
    const { offerRef: raw } = await params
    const offerRef = decodeURIComponent(raw).trim().toUpperCase()

    if (!isPlausibleOfferRef(offerRef)) {
      return NextResponse.json({ error: "Invalid offer reference." }, { status: 400 })
    }

    // Public rate limit - this endpoint is used to guess refs (house pattern)
    const { rateLimit, getClientIp } = await import("@/lib/session")
    if (!rateLimit(`internship-offer:${getClientIp(_req as any)}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const record = await db.internshipRecord.findUnique({
      where: { offerRef },
    })
    if (!record) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 })
    }

    const internship = await db.internship.findUnique({
      where: { id: record.internshipId },
      select: {
        title: true, company: true, domain: true, mode: true,
        durationWeeks: true, collegeName: true, collegeCity: true,
      },
    })

    return NextResponse.json({
      offer: {
        offerRef: record.offerRef,
        issuedAt: (record.startDate ?? record.createdAt).toISOString(),
        sentAt: record.offerSentAt?.toISOString() ?? null,
        studentName: record.studentName,
        role: record.role,
        status: record.status, // ongoing | completed - shown honestly
        startDate: record.startDate?.toISOString() ?? null,
        endDate: record.endDate?.toISOString() ?? null,
        // Honest state: a certificate only exists once the admin issues one.
        certificateIssued: !!record.certificateId,
        internship: internship
          ? {
              title: internship.title,
              company: internship.company,
              domain: internship.domain,
              mode: internship.mode,
              durationWeeks: internship.durationWeeks,
              collegeName: internship.collegeName,
              collegeCity: internship.collegeCity,
            }
          : null,
        verifyUrl: `/verify/${record.offerRef}`,
      },
    })
  } catch (error) {
    console.error("[internships/offer]", error)
    return NextResponse.json({ error: "Offer lookup failed." }, { status: 500 })
  }
}
