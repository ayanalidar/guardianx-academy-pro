import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/credentials/verify/[credentialId]
 *
 * PUBLIC endpoint - no auth required. Anyone (employer, recruiter,
 * registrar) can verify a GuardianX credential by its public
 * `credentialId` (e.g. `GX-CERT-2025-XXXX`).
 *
 * Response shape (always 200 unless server error):
 *   { valid: true,  credential: {...} } - found + active (status === "valid")
 *   { valid: false, credential: {...} } - found but revoked / expired / suspended
 *   { valid: false, credential: null   } - not found
 *
 * `credential` (when present) is safe to display publicly - it contains
 * the candidate name, certification name, score, issue/expiry dates,
 * status, skillsAssessed, and examType. It does NOT leak the user's
 * internal DB id, email, or any PII beyond the candidate name as it
 * appears on the certificate.
 */
export async function GET(req: Request, { params }: { params: Promise<{ credentialId: string }> }) {
  try {
    // Rate limit: public endpoint used to guess credential IDs
    const { rateLimit, getClientIp } = await import("@/lib/session")
    if (!rateLimit(`cred-verify:${getClientIp(req as any)}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ valid: false, error: "Too many requests" }, { status: 429 })
    }
    const { credentialId } = await params

    // ── Check GuardianCredential (GX-CERT-XXXX format) ──
    const cred = await db.guardianCredential.findUnique({
      where: { credentialId },
      include: { certification: true },
    })

    if (cred) {
      return NextResponse.json({
        valid: cred.status === "valid",
        credential: {
          credentialId: cred.credentialId,
          candidateName: cred.candidateName,
          certificationName: cred.certification.name,
          certificationSlug: cred.certification.slug,
          certificationLevel: cred.certification.level,
          score: cred.score,
          issueDate: cred.issueDate,
          expiryDate: cred.expiryDate,
          status: cred.status,
          skillsAssessed: JSON.parse(cred.skillsAssessed || "[]"),
          examType: cred.examType,
          // Human-facing canonical link - the verify page for this credential.
          // Previously absent, which meant the "Open certificate" button never
          // rendered for exam credentials.
          verificationUrl: `/verify/${cred.credentialId}`,
          // NOTE: verificationHash is intentionally NOT returned publicly - 
          // it is a server-side integrity value, not a display field.
        },
      })
    }

    // ── Check CyberQuizCertificate (GX-QUIZ-XXXX format) ──
    if (credentialId.startsWith("GX-QUIZ-")) {
      const quizCert = await db.cyberQuizCertificate.findUnique({
        where: { credentialId },
      })

      if (quizCert) {
        return NextResponse.json({
          valid: quizCert.status === "valid",
          credential: {
            credentialId: quizCert.credentialId,
            candidateName: quizCert.candidateName,
            certificationName: "Cyber Security Foundation",
            certificationSlug: "cyber-security-foundation",
            certificationLevel: quizCert.difficulty,
            score: quizCert.score,
            totalQuestions: quizCert.totalQuestions,
            percentage: quizCert.percentage,
            issueDate: quizCert.issueDate,
            expiryDate: null,
            status: quizCert.status,
            examType: "online-quiz",
            // verificationHash intentionally omitted (server-side only)
            // OVERRIDE the stored value: old rows point at /verify?id=… (the
            // verification page itself - circular). "Open certificate" must
            // open the FULL certificate page, not the verifier again.
            verificationUrl: `/cyber-quiz/certificate/${quizCert.credentialId}`,
          },
        })
      }
    }

    // ── Check course-completion Certificate (GX-… format) ──
    // The /verify page must be universal: dashboard-issued course
    // certificates (Certificate table) were previously NOT verifiable here
    // at all - pasting their ID returned "not found".
    const courseCert = await db.certificate.findUnique({
      where: { certificateId: credentialId },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true, shortName: true, level: true } },
      },
    })

    if (courseCert) {
      return NextResponse.json({
        valid: true,
        credential: {
          credentialId: courseCert.certificateId,
          candidateName: courseCert.user.name,
          certificationName: courseCert.course.title,
          certificationSlug: courseCert.course.shortName,
          certificationLevel: courseCert.course.level,
          score: courseCert.score,
          issueDate: courseCert.issuedAt,
          expiryDate: null,
          status: "valid",
          examType: "course-completion",
          verificationUrl: `/verify/${courseCert.certificateId}`,
        },
      })
    }

    // ── Check Internship certificate (GXI-… format, /internships page) ──
    // Internship certificates verify with the same public flow. Only
    // showcased records (showPublicly consent gate) are verifiable -
    // everything else answers "not found" (anti-enumeration).
    if (credentialId.startsWith("GXI-")) {
      const iRecord = await db.internshipRecord.findUnique({
        where: { certificateId: credentialId },
      }).catch(() => null)

      if (iRecord && iRecord.showPublicly) {
        const internship = await db.internship.findUnique({
          where: { id: iRecord.internshipId },
          select: {
            title: true, company: true, domain: true,
            collegeName: true, collegeCity: true, durationWeeks: true,
          },
        })

        let iSkills: string[] = []
        try {
          const parsed = JSON.parse(iRecord.skills)
          if (Array.isArray(parsed)) iSkills = parsed.slice(0, 25)
        } catch { /* keep empty */ }

        return NextResponse.json({
          valid: true,
          credential: {
            credentialId: iRecord.certificateId,
            candidateName: iRecord.studentName,
            certificationName: internship?.title ?? iRecord.role,
            certificationSlug: "internship-program",
            certificationLevel: internship?.domain ?? "Internship",
            score: null, // internship certificates carry a letter grade
            grade: iRecord.grade,
            issueDate: iRecord.certificateIssuedAt,
            expiryDate: null,
            status: "valid",
            skillsAssessed: iSkills,
            examType: "internship",
            // internship-specific extras for the verify view
            internshipDetails: {
              role: iRecord.role,
              mentorName: iRecord.mentorName,
              company: internship?.company ?? null,
              collegeName: internship?.collegeName ?? null,
              collegeCity: internship?.collegeCity ?? null,
              durationWeeks: internship?.durationWeeks ?? null,
              startDate: iRecord.startDate?.toISOString() ?? null,
              endDate: iRecord.endDate?.toISOString() ?? null,
              completed: iRecord.status === "completed",
            },
            verificationUrl: `/verify/${iRecord.certificateId}`,
          },
        })
      }
      // GXI- ids that miss (or are not showcased) fall through to not-found
      return NextResponse.json({ valid: false, credential: null })
    }

    // ── Not found in any table ──
    return NextResponse.json({ valid: false, credential: null })
  } catch (err) {
    console.error("[api/credentials/verify] error:", err)
    return NextResponse.json(
      { valid: false, credential: null, error: "Verification failed" },
      { status: 500 }
    )
  }
}
