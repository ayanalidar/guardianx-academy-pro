import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyVerificationHash } from "@/lib/credentials"

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
    return NextResponse.json(
      { valid: false, error: `No certificate found with ID "${certificateId}".` },
      { status: 404 }
    )
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
