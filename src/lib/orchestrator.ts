import { createHmac, timingSafeEqual } from "crypto"

/**
 * Lab-orchestrator shared-secret helpers.
 *
 * The orchestrator mini-service (mini-services/lab-orchestrator) controls
 * Docker on the host. It is therefore gated behind an HMAC-SHA256 request
 * signature using LAB_SHARED_SECRET:
 *
 *   X-Lab-Timestamp: <ms since epoch, ±5 min skew>
 *   X-Lab-Signature: hex hmac_sha256(secret, `${timestamp}.${rawBody}`)
 *
 * The same secret is used by the orchestrator to mint terminal WebSocket
 * tokens and by terminal-gateway to verify them (see signTerminalToken /
 * verifyTerminalToken below), so one env var secures the whole lab chain.
 */

export const ORCHESTRATOR_URL =
  process.env.LAB_ORCHESTRATOR_URL || "http://localhost:3004"

export function getLabSharedSecret(): string | null {
  return process.env.LAB_SHARED_SECRET || null
}

/** Build signed headers for a request to the orchestrator. */
export function signOrchestratorRequest(rawBody: string): Record<string, string> {
  const secret = getLabSharedSecret()
  if (!secret) return {}
  const ts = Date.now().toString()
  const sig = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex")
  return { "X-Lab-Timestamp": ts, "X-Lab-Signature": sig }
}

/** Verify a signed request (used by the orchestrator mini-service). */
export function verifyOrchestratorSignature(
  ts: string | null,
  sig: string | null,
  rawBody: string,
  secret: string
): boolean {
  if (!ts || !sig) return false
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
    return false // reject replayed requests older/newer than 5 minutes
  }
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex")
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(sig, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

/* ---------------- terminal WebSocket tokens ---------------- */

export interface TerminalTokenPayload {
  sid: string // lab session id
  uid: string // user id
  exp: number // epoch ms
}

/** Mint a signed, expiring terminal token (orchestrator side). */
export function signTerminalToken(
  sessionId: string,
  userId: string,
  ttlMs: number,
  secret: string
): string {
  const payload: TerminalTokenPayload = {
    sid: sessionId,
    uid: userId,
    exp: Date.now() + ttlMs,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", secret).update(payloadB64).digest("hex")
  return `${payloadB64}.${sig}`
}

/** Verify a terminal token (terminal-gateway side). */
export function verifyTerminalToken(
  token: string | null,
  secret: string
): TerminalTokenPayload | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  const expected = createHmac("sha256", secret).update(payloadB64).digest("hex")
  if (
    expected.length !== sig.length ||
    !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))
  ) {
    return null
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as TerminalTokenPayload
    if (!payload?.sid || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
