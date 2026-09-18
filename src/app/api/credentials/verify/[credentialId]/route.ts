import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/credentials/verify/[credentialId]
 *
 * PUBLIC endpoint — no auth required. Anyone (employer, recruiter,
 * registrar) can verify a GuardianX credential by its public
 * `credentialId` (e.g. `GX-CERT-2025-XXXX`).
 *
 * Response shape (always 200 unless server error):
 *   { valid: true,  credential: {...} }  — found + active (status === "valid")
 *   { valid: false, credential: {...} }  — found but revoked / expired / suspended
 *   { valid: false, credential: null   }  — not found
 *
 * `credential` (when present) is safe to display publicly — it contains
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
          // NOTE: verificationHash is intentionally NOT returned publicly —
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
            verificationUrl: quizCert.verificationUrl,
          },
        })
      }
    }

    // ── Not found in either table ──
    return NextResponse.json({ valid: false, credential: null })
  } catch (err) {
    console.error("[api/credentials/verify] error:", err)
    return NextResponse.json(
      { valid: false, credential: null, error: "Verification failed" },
      { status: 500 }
    )
  }
}
