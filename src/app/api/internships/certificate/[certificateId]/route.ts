import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyVerificationHash, isPlausibleCredentialId } from "@/lib/credentials"
import { normalizeProjectEntries } from "@/lib/internship-projects"

export const runtime = "nodejs"

/* ============================================================
 * GET /api/internships/certificate/[certificateId] - PUBLIC.
 *
 * Capability-URL pattern (same trust model as /verify): the
 * certificateId is a random unique code, so possession of the
 * link is what grants access to the certificate PDF data. Used
 * by the "Download certificate PDF" button on /internships and
 * by the share links. Returns only non-sensitive fields.
 * ============================================================ */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId: rawId } = await params
    const certificateId = decodeURIComponent(rawId).trim().toUpperCase()

    if (!certificateId || !isPlausibleCredentialId(certificateId)) {
      return NextResponse.json({ error: "Invalid certificate ID." }, { status: 400 })
    }

    // Public rate limit - this endpoint is used to guess IDs (house pattern)
    const { rateLimit, getClientIp } = await import("@/lib/session")
    if (!rateLimit(`internship-cert:${getClientIp(_req as any)}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const record = await db.internshipRecord.findUnique({
      where: { certificateId },
    })
    if (!record) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 })
    }

    // Only showcased (or sample) records are publicly downloadable -
    // a certificate issued but not consented for showcase stays private.
    if (!record.showPublicly) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 })
    }

    const internship = await db.internship.findUnique({
      where: { id: record.internshipId },
      select: {
        title: true,
        company: true,
        domain: true,
        mode: true,
        durationWeeks: true,
        collegeName: true,
        collegeCity: true,
      },
    })

    const hashValid = await verifyVerificationHash(
      record.verificationHash,
      record.certificateId,
      record.id,
      record.internshipId,
      record.certificateIssuedAt
    )

    return NextResponse.json({
      certificate: {
        certificateId: record.certificateId,
        issuedAt: record.certificateIssuedAt.toISOString(),
        studentName: record.studentName,
        role: record.role,
        grade: record.grade,
        mentorName: record.mentorName,
        startDate: record.startDate?.toISOString() ?? null,
        endDate: record.endDate?.toISOString() ?? null,
        // Heals legacy corrupted rows (old bug stored "[object Object]" strings).
        projects: normalizeProjectEntries(record.projects),
        skills: safeParseArray(record.skills),
        internship: internship
          ? {
              title: internship.title,
              company: internship.company,
              domain: internship.domain,
              durationWeeks: internship.durationWeeks,
              collegeName: internship.collegeName,
              collegeCity: internship.collegeCity,
            }
          : null,
        verifyUrl: `/verify/${record.certificateId}`,
        hashValid,
      },
    })
  } catch (error) {
    console.error("[internships/certificate]", error)
    return NextResponse.json({ error: "Certificate lookup failed." }, { status: 500 })
  }
}

function safeParseArray(json: string): unknown[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
