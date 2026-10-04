import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyVerificationHash } from "@/lib/credentials"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


/**
 * PUBLIC certificate verification endpoint.
 * Anyone (including non-authenticated visitors on the homepage) can verify
 * a certificate by its certificateId.
 *
 * GET /api/certificates/verify?certificateId=GX-XXXXX
 */
export async function GET(req: Request) {
  // Rate limit: this endpoint is public and used to guess credential IDs
  const { rateLimit, getClientIp } = await import("@/lib/session")
  if (!rateLimit(`cert-verify:${getClientIp(req as any)}`, { max: 30, windowMs: 60 * 1000 })) {
    return NextResponse.json({ valid: false, error: "Too many requests" }, { status: 429 })
  }
  const { searchParams } = new URL(req.url)
  const certificateId = (searchParams.get("certificateId") ?? "").trim().toUpperCase()

  if (!certificateId) {
    return NextResponse.json(
      { valid: false, error: "Please enter a certificate ID." },
      { status: 400 }
    )
  }

  const cert = await db.certificate.findUnique({
    where: { certificateId },
    include: {
      user: { select: { name: true, title: true } },
      course: {
        select: {
          title: true,
          shortName: true,
          certBody: true,
          instructor: { select: { name: true, title: true } },
        },
      },
      template: true,
    },
  })

  if (!cert) {
    // ---- Internship certificate fallback (GXI-* ids) ----
    // Internship certificates live on InternshipRecord (public
    // /internships page). They verify with the same keyed HMAC and
    // return the SAME response shape the /verify view already
    // renders, plus kind: "internship" + internship-specific fields.
    const record = await db.internshipRecord.findUnique({
      where: { certificateId },
    }).catch(() => null)

    if (!record || !record.showPublicly) {
      return NextResponse.json(
        { valid: false, error: `No certificate found with ID "${certificateId}".` },
        { status: 404 }
      )
    }

    const internship = await db.internship.findUnique({
      where: { id: record.internshipId },
      select: { title: true, company: true, domain: true, collegeName: true, collegeCity: true, durationWeeks: true },
    })

    const iHashValid = await verifyVerificationHash(
      record.verificationHash,
      record.certificateId,
      record.id,
      record.internshipId,
      record.certificateIssuedAt
    )

    let iSkills: string[] = []
    try {
      const parsed = JSON.parse(record.skills)
      if (Array.isArray(parsed)) iSkills = parsed.slice(0, 25)
    } catch { /* keep empty */ }

    return NextResponse.json({
      valid: true,
      hashValid: iHashValid,
      kind: "internship",
      certificate: {
        certificateId: record.certificateId,
        issuedAt: record.certificateIssuedAt,
        score: null, // internship certs carry a grade, not a percentage
        studentName: record.studentName,
        studentTitle: "Internship Program Graduate",
        courseTitle: internship?.title ?? record.role,
        courseShortName: internship?.domain ?? "Internship",
        certBody: internship?.company ?? "GuardianX Academy",
        instructorName: record.mentorName ?? "GuardianX Academy",
        instructorTitle: record.mentorName ? "Internship Mentor" : "Program Director",
        // Second signatory (admin-editable; null = GuardianX Academy default)
        programDirector: record.programDirector,
        template: null,
        // internship-specific extras (rendered when present)
        grade: record.grade,
        skillsAssessed: iSkills,
        internshipDetails: {
          role: record.role,
          collegeName: internship?.collegeName ?? null,
          collegeCity: internship?.collegeCity ?? null,
          durationWeeks: internship?.durationWeeks ?? null,
          startDate: record.startDate?.toISOString() ?? null,
          endDate: record.endDate?.toISOString() ?? null,
          status: record.status,
        },
      },
    })
  }

  // Verify the tamper-evident hash (keyed HMAC; legacy unkeyed hashes still accepted)
  const hashValid = await verifyVerificationHash(
    cert.verificationHash, cert.certificateId, cert.userId, cert.courseId, cert.issuedAt
  )

  return NextResponse.json({
    valid: true,
    hashValid,
    certificate: {
      certificateId: cert.certificateId,
      issuedAt: cert.issuedAt,
      score: cert.score,
      studentName: cert.user.name,
      studentTitle: cert.user.title,
      courseTitle: cert.course.title,
      courseShortName: cert.course.shortName,
      certBody: cert.course.certBody,
      instructorName: cert.course.instructor.name,
      instructorTitle: cert.course.instructor.title,
      template: cert.template
        ? {
            name: cert.template.name,
            borderStyle: cert.template.borderStyle,
            sealStyle: cert.template.sealStyle,
            primaryColor: cert.template.primaryColor,
          }
        : null,
    },
  })
}
