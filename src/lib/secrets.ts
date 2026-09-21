/**
 * Secret resolution helper.
 *
 * In production, secret env vars MUST be set. The old pattern of falling back
 * to `"dev-only-insecure-secret-" + Date.now()` was dangerous: if a production
 * deployment forgot to set NEXTAUTH_SECRET, the server would silently boot
 * with a per-process random secret, which means:
 *   1. JWTs were unforgeable to outsiders (good) but invalidated on every
 *      restart (bad UX).
 *   2. Multi-instance deployments couldn't share sessions (bad).
 *   3. The "warn but boot" behavior masked a misconfigured deploy (very bad).
 *
 * The new behavior:
 *   - production + missing secret → throw on first access (fail fast).
 *   - dev + missing secret → return a random ephemeral value + loud warning
 *     so local dev still works but the developer knows they need to fix it.
 */

let cachedDevSecret: string | null = null

export function requireSecret(name: string): string {
  const value = process.env[name]
  if (value && value.length >= 16) return value

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `FATAL: ${name} is missing or too short (need >=16 chars). ` +
      `Set it in your deployment environment (Vercel project settings, .env, etc.). ` +
      `Generate one with: openssl rand -base64 32`
    )
  }

  // Dev mode - emit warning and use a per-process random fallback.
  if (!cachedDevSecret) {
    // eslint-disable-next-line no-console
    console.warn(
      `\n⚠️  WARNING: ${name} is not set. Using an insecure ephemeral dev secret.\n` +
      `   JWTs will not survive a server restart.\n` +
      `   Generate a real one with: openssl rand -base64 32\n` +
      `   Then add it to your .env file.\n`
    )
    // Lazy-load crypto to keep this module browser-safe.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require("crypto") as typeof import("crypto")
    cachedDevSecret = "dev-ephemeral-" + randomBytes(24).toString("hex")
  }
  return cachedDevSecret
}
