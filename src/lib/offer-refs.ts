import { randomBytes } from "crypto"

/**
 * Offer-letter reference codes for internship records.
 *
 * Distinct from certificate IDs (GXI-2026-XXXXXX): offer refs carry an
 * explicit `-OFF-` segment so every verify surface can tell the two apart
 * AT A GLANCE. This separation is a product guarantee, not styling: an
 * ongoing student holds an OFFER, never a certificate, and the verify page
 * must never render one as the other.
 *
 *   format: GXI-OFF-<year>-<6 uppercase base32ish chars>   e.g. GXI-OFF-2026-K7Q2M4
 *
 * The ref is a random capability code (same trust model as certificateId):
 * possession of the printed ref / QR link is what authorizes verification,
 * with a public rate limit as the anti-enumeration backstop.
 */

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // no I/L/0/O/1 - unambiguous when read aloud

export function generateOfferRef(): string {
  const year = new Date().getFullYear()
  const bytes = randomBytes(6)
  let out = ""
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length]
  return `GXI-OFF-${year}-${out}`
}

export function isPlausibleOfferRef(ref: string): boolean {
  return /^GXI-OFF-\d{4}-[A-Z0-9]{6}$/.test(ref.trim().toUpperCase())
}
