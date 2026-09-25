import { createHmac, timingSafeEqual } from "crypto"
import { requireSecret } from "@/lib/secrets"

/**
 * HMAC-signed result tokens for guest (anonymous) quiz attempts.
 *
 * Problem being solved: after a guest completes the Cyber Awareness Quiz,
 * the results view fetches /api/cyber-quiz/attempt/[attemptId]. Attempt IDs
 * are CUIDs - NOT security tokens - so the endpoint needs proof that the
 * requester is the person the result belongs to. Previously the endpoint
 * required the guest's email as a query param (weak, and the results view
 * didn't even send it → guest results 403'd), with a TODO to sign links.
 *
 * Solution: the server HMAC-signs the attemptId with NEXTAUTH_SECRET and
 * returns `resultToken` in the submit response. The client appends
 * ?t=<attemptId>.<sig> when fetching the result. The signature is
 * unforgeable without the server secret, and verification is
 * timing-safe. Session-authenticated users (owner/admin) can still fetch
 * without a token.
 *
 * Signatures are derived from the long-lived NEXTAUTH_SECRET, so tokens
 * survive restarts and remain valid across server instances.
 */

const TOKEN_CONTEXT = "gx-quiz-attempt-v1"

/** Sign an attempt id → "<attemptId>.<hmac-32hex>". */
export function signAttemptToken(attemptId: string): string {
  const secret = requireSecret("NEXTAUTH_SECRET")
  const sig = createHmac("sha256", secret)
    .update(`${TOKEN_CONTEXT}:${attemptId}`)
    .digest("hex")
    .slice(0, 32)
  return `${attemptId}.${sig}`
}

/** Verify "<attemptId>.<sig>" - timing-safe, no information leaks. */
export function verifyAttemptToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== "string") return null
  const dot = token.lastIndexOf(".")
  if (dot <= 0 || dot === token.length - 1) return null

  const attemptId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(attemptId) || !/^[a-f0-9]{32}$/.test(sig)) {
    return null
  }

  const secret = requireSecret("NEXTAUTH_SECRET")
  const expected = createHmac("sha256", secret)
    .update(`${TOKEN_CONTEXT}:${attemptId}`)
    .digest("hex")
    .slice(0, 32)

  const a = Buffer.from(sig, "hex")
  const b = Buffer.from(expected, "hex")
  if (a.length !== b.length) return null
  return timingSafeEqual(a, b) ? attemptId : null
}
