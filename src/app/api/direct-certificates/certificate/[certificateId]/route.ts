import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyDirectCertHash, mapDirectCertToCertificatePayload } from "@/lib/direct-certs"
import { isPlausibleCredentialId } from "@/lib/credentials"
import { ensureDirectCertificateTables } from "@/lib/direct-certs-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * GET /api/direct-certificates/certificate/[certificateId] - PUBLIC.
 *
 * Capability-URL pattern (same trust model as /verify and the
 * internship certificate endpoint): the certificateId is a random
 * unique code, so possession of the link is what grants access to
 * the certificate PDF data. Used by the "Certificate PDF" button on
 * the verify card and in the admin Direct Certificates tab. Returns
 * only non-sensitive fields (never the student email).
 *
 * showPublicly is the consent gate: a certificate with the gate off
 * answers "not found" (anti-enumeration). A REVOKED certificate does
 * NOT serve a printable PDF - the verify card is the honest surface
 * for revocation; the PDF stays dead with the credential.
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
    if (!rateLimit(`direct-cert:${getClientIp(_req as any)}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    await ensureDirectCertificateTables()

    const record = await db.directCertificate.findUnique({
      where: { certificateId },
    })
    // Gate off or revoked -> indistinguishable "not found" (no oracle).
    if (!record || !record.showPublicly || record.status === "revoked") {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 })
    }

    // A row found by certificateId always has its hash + issue date set
    // (both written in the same issuance transaction) - fallbacks only
    // satisfy the nullable Prisma types.
    const hashValid = await verifyDirectCertHash(
      record.verificationHash ?? "",
      record.certificateId,
      record.id,
      record.certificateIssuedAt ?? new Date()
    )

    const payload = mapDirectCertToCertificatePayload(record)
    return NextResponse.json({ ...payload, certificate: { ...payload.certificate, hashValid } })
  } catch (error) {
    console.error("[direct-certificates/certificate]", error)
    return NextResponse.json({ error: "Certificate lookup failed." }, { status: 500 })
  }
}
