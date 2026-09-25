import { NextResponse } from "next/server"

/**
 * http-cache - Cache-Control helpers for Route Handlers.
 *
 * WHY: Vercel serverless functions pay ~1.5-2.5s on cold start (bundle init
 * + Prisma engine + first DB connection). Public, non-personalized GET
 * endpoints (course catalog, platform stats, learning paths, batches, …)
 * were paying that cost for EVERY visitor. Marking their responses
 * `public, s-maxage=N, stale-while-revalidate=M` lets the Vercel edge CDN
 * serve them in ~10-50ms and shields the origin from request storms - 
 * origin is hit at most once per s-maxage window per URL variant.
 *
 * RULES:
 *  - ONLY use `cachedJson()` for responses that are byte-identical for all
 *    visitors (no session/user data, no cookies influencing output).
 *  - Personalized responses MUST use `NO_STORE` (or no header at all).
 *  - Mutating handlers (POST/PUT/PATCH/DELETE) are never cached.
 */

export type CacheOpts = {
  /** Edge cache lifetime in seconds (default 120). */
  sMax?: number
  /** Stale-while-revalidate window in seconds (default 600). */
  swr?: number
  /** HTTP status (default 200). */
  status?: number
}

export function cachedJson(data: unknown, opts?: CacheOpts): NextResponse {
  const sMax = opts?.sMax ?? 120
  const swr = opts?.swr ?? 600
  return NextResponse.json(data, {
    status: opts?.status ?? 200,
    headers: {
      "Cache-Control": `public, s-maxage=${sMax}, stale-while-revalidate=${swr}`,
    },
  })
}

/** Headers for responses that must never be cached (personalized / authed). */
export const NO_STORE: Record<string, string> = {
  "Cache-Control": "private, no-store",
}

/** Wrap an existing NextResponse with no-store headers (keeps status/body). */
export function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "private, no-store")
  return res
}
