import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/cyber-quiz/certificate/[credentialId]
 * Public endpoint - fetch a certificate by its credential ID (e.g.
 * GX-QUIZ-2026-A1B2). Used by the certificate view + the public verify page.
 *
 * Returns the full certificate + the attempt's domainScores for the
 * progress report.
 */
export const GET = withErrorHandler(async (_req, { params }: { params: Promise<{ credentialId: string }> }) => {
  const { credentialId } = await params

  const cert = await db.cyberQuizCertificate.findUnique({
    where: { credentialId },
  })

  if (!cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  // Parse domainScores from JSON
  let domainScores: Record<string, { correct: number; total: number }> = {}
  try {
    domainScores = JSON.parse(cert.domainScores || "{}")
  } catch {
    // ignore parse error
  }

  return NextResponse.json({
    certificate: {
      credentialId: cert.credentialId,
      candidateName: cert.candidateName,
      email: cert.email,
      difficulty: cert.difficulty,
      score: cert.score,
      totalQuestions: cert.totalQuestions,
      percentage: cert.percentage,
      issueDate: cert.issueDate.toISOString(),
      verificationHash: cert.verificationHash,
      verificationUrl: cert.verificationUrl,
      status: cert.status,
    },
    domainScores,
  })
})
