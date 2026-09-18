import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import { requireSecret } from "@/lib/secrets"

/**
 * Shared credential/certificate crypto helpers.
 *
 * Previously the verification-hash logic lived in two places with two
 * different algorithms:
 *   - src/lib/email.ts: UNKEYED SHA-256 over guessable fields (forgeable)
 *   - src/app/api/exams/[id]/submit: custom 64-bit mixing function (weak)
 *
 * This module replaces both with a keyed HMAC-SHA256 over the same field
 * ordering, plus a legacy-compat verifier so certificates issued before
 * this change still verify.
 */

/** Resolve the signing secret lazily (safe to import at build time). */
export async function getSigningSecret(): Promise<string> {
  return requireSecret("NEXTAUTH_SECRET")
}

/**
 * Tamper-evident hash for credentials & certificates.
 * HMAC-SHA256 keyed with NEXTAUTH_SECRET.
 */
export async function generateVerificationHash(
  credentialId: string,
  userId: string,
  courseId: string,
  issuedAt: Date | string
): Promise<string> {
  const iso = typeof issuedAt === "string" ? issuedAt : issuedAt.toISOString()
  const secret = await getSigningSecret()
  return createHmac("sha256", secret)
    .update(`${credentialId}|${userId}|${courseId}|${iso}`)
    .digest("hex")
}

/**
 * Legacy unkeyed hash (pre-hardening). Kept ONLY so certificates issued
 * before the hardening change still verify. New issuance always uses the
 * keyed HMAC above.
 */
export function legacyVerificationHash(
  credentialId: string,
  userId: string,
  courseId: string,
  issuedAt: Date | string
): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("crypto") as typeof import("crypto")
  const iso = typeof issuedAt === "string" ? issuedAt : issuedAt.toISOString()
  return createHash("sha256")
    .update(`${credentialId}|${userId}|${courseId}|${iso}`)
    .digest("hex")
}

/**
 * Verify a stored hash against recomputed candidates.
 * Accepts the current keyed HMAC or the legacy unkeyed hash.
 * Timing-safe where lengths match.
 */
export async function verifyVerificationHash(
  provided: string | null | undefined,
  credentialId: string,
  userId: string,
  courseId: string,
  issuedAt: Date | string
): Promise<boolean> {
  if (!provided) return true // legacy rows may have no stored hash
  const providedNorm = provided.trim().toLowerCase()
  const candidates = [
    await generateVerificationHash(credentialId, userId, courseId, issuedAt),
    legacyVerificationHash(credentialId, userId, courseId, issuedAt),
  ]
  for (const candidate of candidates) {
    const a = Buffer.from(candidate, "hex")
    const b = Buffer.from(providedNorm, "hex")
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

/**
 * Generate a non-guessable credential id: <prefix>-<YEAR>-<6 hex chars>.
 * 16.7M combos/year (was Math.floor(1000 + Math.random()*9000) = 9k).
 * Collisions are resolved by the caller via DB-unique retry.
 */
export function generateCredentialId(prefix: string): string {
  return `${prefix}-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`
}

/** Basic format check for public verify endpoints (defense-in-depth). */
export function isPlausibleCredentialId(id: string): boolean {
  return /^[A-Z0-9-]{6,64}$/.test(id)
}
