import { NextRequest, NextResponse } from "next/server"
import { logSecurityEvent, securityMetaFromRequest } from "@/lib/security-log"

/**
 * honeypot - decoy endpoints that turn silent scanning into a visible signal.
 * ============================================================================
 *
 * Why: the middleware + handlers only log REJECTED auth, and there is no
 * Edge-runtime sink for anonymous probe traffic. Decoy routes give scanners
 * something to find - every touch is recorded in SecurityEvent (type
 * "honeypot_hit") with IP/geo/UA, and the watchdog sweep flags IPs that hit
 * them repeatedly.
 *
 * Ethics: every payload is fabricated AND self-labelled as synthetic
 * ("example.invalid" hosts + an explicit _honeypot marker). No real PII is
 * ever served from a decoy; researchers who look twice see the truth.
 *
 * Placement: deliberately OUTSIDE the middleware's protected prefixes so an
 * unauthenticated scanner actually reaches the decoy (protected routes 401
 * at the edge before a honeypot handler could run).
 */

export type HoneypotSpec = {
  /** Short decoy identifier stored in SecurityEvent.details. */
  decoy: string
  /** Fabricated (self-labelled) payload returned to the scanner. */
  payload: Record<string, unknown>
}

function buildHandler(spec: HoneypotSpec) {
  return async function handle(req: NextRequest): Promise<NextResponse> {
    const meta = securityMetaFromRequest(req)
    await logSecurityEvent({
      type: "honeypot_hit",
      ...meta,
      details: { decoy: spec.decoy, method: req.method },
    })
    return NextResponse.json(spec.payload, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    })
  }
}

/** Wire a decoy into a route file's GET/POST exports. */
export function honeypotRoute(spec: HoneypotSpec) {
  const handler = buildHandler(spec)
  return { GET: handler, POST: handler }
}
