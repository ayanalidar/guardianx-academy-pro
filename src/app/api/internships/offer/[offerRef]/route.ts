import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ensureInternshipTables } from "@/lib/internships-bootstrap"
import { isPlausibleOfferRef } from "@/lib/offer-refs"

export const runtime = "nodejs"

/**
 * Targeted self-heal for the offer columns - independent of the shared
 * bootstrap DDL loop (if ANY earlier statement aborts that loop, these
 * never run there). Idempotent; safe to run on every failed lookup.
 */
async function ensureOfferColumns(): Promise<void> {
  for (const stmt of [
    `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "offerRef" TEXT`,
    `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "offerSentAt" TIMESTAMP(3)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "InternshipRecord_offerRef_key" ON "InternshipRecord"("offerRef")`,
  ]) {
    try {
      await db.$executeRawUnsafe(stmt)
    } catch (e) {
      console.error("[internships/offer] targeted DDL failed:", stmt.slice(0, 60), e)
    }
  }
}

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

    // Self-heal the schema BEFORE the Prisma lookup - on a drifted prod DB
    // the offerRef column may not exist until the bootstrap DDL runs; without
    // this the first public verification 500s instead of self-healing + 404.
    await ensureInternshipTables()

    // Public rate limit - this endpoint is used to guess refs (house pattern)
    const { rateLimit, getClientIp } = await import("@/lib/session")
    if (!rateLimit(`internship-offer:${getClientIp(_req as any)}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    let record: Awaited<ReturnType<typeof db.internshipRecord.findUnique>> = null
    try {
      record = await db.internshipRecord.findUnique({
        where: { offerRef },
      })
    } catch (e: any) {
      // P2021/P2022 = table/column drift - heal the offer columns targeted,
      // then retry ONCE. Anything else (or a failed retry) surfaces below.
      console.warn("[internships/offer] lookup failed, healing + retry:", e?.code ?? e?.message)
      await ensureOfferColumns()
      record = await db.internshipRecord.findUnique({ where: { offerRef } })
    }
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
  } catch (error: any) {
    console.error("[internships/offer]", error)
    // code-only (no message) - safe for a public surface, and it makes the
    // failure mode diagnosable from the outside (P2021/P2022 = schema drift)
    return NextResponse.json(
      { error: "Offer lookup failed.", code: error?.code ?? "UNKNOWN" },
      { status: 500 }
    )
  }
}
