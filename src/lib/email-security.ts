import { createHash, randomBytes } from "crypto"
import { db } from "@/lib/db"
import { requireSecret } from "@/lib/secrets"
import { CANONICAL_AUTH_ORIGIN } from "@/lib/auth"

/**
 * Registration email-security helpers.
 *
 * 1. Disposable-email blocklist - stops throwaway/temp-mail signups
 *    (spam accounts, referral-coupon farming, fake enrollment numbers).
 *    Curated list of widely-known disposable providers, checked on the
 *    exact lowercased domain. Exact-match only on purpose: a subdomain of
 *    a real mailbox provider should never be blocked.
 *
 * 2. createEmailVerificationLink() - mints a one-click "confirm your
 *    email + sign in" link that reuses the platform's existing next-auth
 *    Email (magic link) flow, so NO schema change is required.
 *
 *    How it works (next-auth v4, verified against node_modules source):
 *    - The URL carries the PLAIN random token plus the identifier (email).
 *    - The VerificationToken table stores sha256(token + secret) - next-auth
 *      hashes before calling the adapter (core/lib/utils.ts hashToken()).
 *    - On click, GET /api/auth/callback/email hashes the incoming token,
 *      looks up + DELETES the row via the adapter (single-use), and issues
 *      a session through the normal signIn callback.
 *
 *    The link is only minted when SMTP is configured in Platform Settings
 *    (the same condition under which the EmailProvider is registered in
 *    getAuthOptions()) - otherwise there is no route to consume it.
 */

// Widely-known disposable / temp-mail providers (exact lowercase domains).
const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com", "yopmail.com", "yopmail.net", "cool.fr.nf", "jetable.fr.nf",
  "guerrillamail.com", "guerrillamail.info", "guerrillamail.net", "guerrillamail.org",
  "guerrillamailblock.com", "sharklasers.com", "grr.la", "pokemail.net", "spam4.me",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "temp-mail.io",
  "tempmail.com", "tempmail.email", "tempmailaddress.com", "tempmailo.com",
  "throwawaymail.com", "getnada.com", "dispostable.com", "maildrop.cc",
  "mailnesia.com", "fakeinbox.com", "trashmail.com", "trashmail.de", "trashmail.me",
  "mytrashmail.com", "mailcatch.com", "spamgourmet.com", "emailondeck.com",
  "moakt.com", "mohmal.com", "tempr.email", "mintemail.com", "mail7.io",
  "inboxbear.com", "spambog.com", "spambog.de", "tempinbox.com", "discard.email",
  "discardmail.com", "byom.de", "trash-mail.de", "wegwerfmail.de", "harakirimail.com",
  "mailde.de", "mailde.info", "1secmail.com", "1secmail.net", "1secmail.org",
  "mvrht.net", "emltmp.com", "mail-temporaire.fr", "binkmail.com", "bobmail.info",
  "chammy.info", "devnullmail.com", "letthemeatspam.com", "mailin8r.com",
  "mailinater.com", "mailinator2.com", "notmailinator.com", "reallymymail.com",
  "sogetthis.com", "suremail.info", "thisisnotmyrealemail.com", "spam.la",
  "mailtothis.com", "dumpmail.com", "tempemail.net", "mytemp.email",
])

/**
 * True when the address uses a known disposable/temp-mail domain.
 * Malformed addresses (no @ / no domain) return false - the email format
 * itself is validated separately by the caller's zod schema.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase()
  if (!domain) return false
  return DISPOSABLE_EMAIL_DOMAINS.has(domain)
}

/**
 * Mint a single-use "confirm your email / one-click sign in" link for the
 * given (already-created) account. Returns null when the EmailProvider
 * prerequisites are missing (no SMTP settings, no NEXTAUTH_SECRET) so the
 * caller can silently skip - registration must never fail because of this.
 *
 * The plain token lives ONLY in the emailed link; the DB stores the
 * sha256(token + NEXTAUTH_SECRET) hash, exactly as next-auth does.
 */
export async function createEmailVerificationLink(email: string): Promise<string | null> {
  try {
    const secret = requireSecret("NEXTAUTH_SECRET")
    const token = randomBytes(32).toString("hex")
    const hashedToken = createHash("sha256").update(`${token}${secret}`).digest("hex")

    // Opportunistic cleanup of expired rows (same pattern as the auth adapter).
    await db.verificationToken.deleteMany({ where: { expires: { lt: new Date() } } })

    await db.verificationToken.create({
      data: {
        identifier: email,
        token: hashedToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h, same as magic links
      },
    })

    const callbackUrl = encodeURIComponent(`${CANONICAL_AUTH_ORIGIN}/`)
    return (
      `${CANONICAL_AUTH_ORIGIN}/api/auth/callback/email` +
      `?callbackUrl=${callbackUrl}&token=${token}&email=${encodeURIComponent(email)}`
    )
  } catch (e) {
    console.error("[email-security] verification link not minted:", e)
    return null
  }
}
