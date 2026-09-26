import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { getAuthOptions } from "@/lib/auth"

/**
 * NextAuth route handler - builds options PER REQUEST via getAuthOptions().
 *
 * This is what makes Admin → Settings actually work for Google OAuth + SMTP
 * magic link: credentials saved in the Platform Settings DB are picked up on
 * the next auth request (getSettings caches for 5 min), with env-var fallback.
 * Previously the options were captured once at module init from process.env
 * only, so DB-configured OAuth keys were silently ignored.
 *
 * The incoming request origin is forwarded as well: getAuthOptions() installs
 * a redirect callback that keeps the user on the host they are actually
 * browsing. Without it, next-auth v4 resolves the base URL from
 * NEXTAUTH_URL / VERCEL_URL (guardianx-academy-pro.vercel.app) and every
 * sign-in / sign-out bounced clients of the custom domain to that URL.
 */
function requestOriginFrom(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host")
  const host = (fwdHost || req.headers.get("host") || "").split(",")[0].trim()
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim()
  const fallback = (() => {
    try {
      return new URL(req.url).origin
    } catch {
      return "https://localhost"
    }
  })()
  if (!host) return fallback
  return `${proto}://${host}`
}

async function handler(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return NextAuth(req, ctx, await getAuthOptions(requestOriginFrom(req)))
}

export { handler as GET, handler as POST }
