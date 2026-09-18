import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { getAuthOptions } from "@/lib/auth"

/**
 * NextAuth route handler — builds options PER REQUEST via getAuthOptions().
 *
 * This is what makes Admin → Settings actually work for Google OAuth + SMTP
 * magic link: credentials saved in the Platform Settings DB are picked up on
 * the next auth request (getSettings caches for 5 min), with env-var fallback.
 * Previously the options were captured once at module init from process.env
 * only, so DB-configured OAuth keys were silently ignored.
 */
async function handler(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return NextAuth(req, ctx, await getAuthOptions())
}

export { handler as GET, handler as POST }
