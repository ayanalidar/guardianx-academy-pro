import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { captureServerError } from "@/lib/sentry-report"

/**
 * Env-driven admin bootstrap (Vercel-friendly).
 *
 * Add to the deployment's environment variables:
 *   ADMIN_EMAILS = admin@academy.guardianx.cloud, other@domain
 *
 * The first time a listed account signs in (or any session check runs for
 * it), its role is upgraded to SUPER_ADMIN - full platform privileges - 
 * and the change PERSISTS in the database. Idempotent: the write only
 * happens while the role is still below SUPER_ADMIN, so it costs nothing
 * on every other request. Removing the env var later does NOT demote
 * the account (by design - promotion is a one-way bootstrap).
 */
const BOOTSTRAP_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  title: true,
  bio: true,
  schoolId: true,
  xp: true,
  level: true,
  streak: true,
  lastActiveDate: true,
} as const

/**
 * Per-lambda in-memory cache for getCurrentUser().
 *
 * Every authenticated API request used to pay a `user.findUnique` round
 * trip on top of session decoding - significant when the DB is distant and
 * the lambda is warm (the common case within a single page load, where a
 * dozen API calls each re-resolve the SAME user). A short 30s TTL keeps
 * role/permission changes effectively real-time while eliminating the
 * repeated read. Bootstrap-admin promotion still runs when the cached role
 * is below SUPER_ADMIN, so ADMIN_EMAILS upgrades propagate within one TTL.
 */
const USER_CACHE_TTL = 30_000
const _userCache = new Map<string, { user: any; expiresAt: number }>()

function userFromCache(id: string) {
  const hit = _userCache.get(id)
  if (hit && Date.now() < hit.expiresAt) return hit.user
  if (hit) _userCache.delete(id)
  return undefined // undefined = miss; null = cached "gone" is not used
}

function userToCache(id: string, user: any) {
  _userCache.set(id, { user, expiresAt: Date.now() + USER_CACHE_TTL })
  // Bound the map defensively (tiny - one entry per active user per lambda).
  if (_userCache.size > 500) {
    const now = Date.now()
    for (const [k, v] of _userCache) {
      if (v.expiresAt <= now) _userCache.delete(k)
    }
  }
}

export async function getCurrentUser() {
  // Dynamic options: same DB-backed provider config as the auth route handler.
  // The secret is identical (requireSecret("NEXTAUTH_SECRET")) so JWT decoding
  // is unaffected - only the provider list differs, which getServerSession
  // does not need.
  const session = await getServerSession(await getAuthOptions())
  if (!session?.user) return null
  const userId = (session.user as any).id

  const cached = userFromCache(userId)
  if (cached !== undefined) return cached

  let user = await db.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  })
  if (
    user &&
    BOOTSTRAP_ADMIN_EMAILS.length > 0 &&
    user.role !== "SUPER_ADMIN" &&
    BOOTSTRAP_ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())
  ) {
    try {
      user = await db.user.update({
        where: { id: user.id },
        data: { role: "SUPER_ADMIN" },
        select: USER_SELECT,
      })
      captureServerError(`ADMIN_EMAILS bootstrap: promoted ${user.email} to SUPER_ADMIN`)
    } catch {
      // Promotion failure must never break the session read (e.g. schema
      // drift on a stale remote DB). The next session read retries.
    }
  }
  // A user row that vanished mid-session must NOT be pinned in cache - 
  // only cache the found shape so the next request re-checks the DB.
  if (user) userToCache(userId, user)
  return user
}

export type SafeUser = Awaited<ReturnType<typeof getCurrentUser>>
export type AuthUser = NonNullable<SafeUser>

/**
 * requireRole(roles) - server-side RBAC gate for API routes.
 *
 * Usage:
 *   const user = await requireRole(["ADMIN"])
 *   if (user instanceof NextResponse) return user  // auth/forbidden failed
 *   // ... user is guaranteed to be in one of the allowed roles
 *
 * Best practice: always include "SUPER_ADMIN" alongside "ADMIN" for admin
 * endpoints, otherwise super-admins will be 403'd. Example:
 *   await requireRole(["ADMIN", "SUPER_ADMIN"])
 */
export async function requireRole(
  roles: string[]
): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return user
}

/**
 * Convenience: require an ADMIN or SUPER_ADMIN user. Use this instead of
 * `requireRole(["ADMIN"])` to avoid the common bug of forgetting SUPER_ADMIN.
 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  return requireRole(["ADMIN", "SUPER_ADMIN"])
}

/**
 * withErrorHandler() - higher-order function that wraps an API route handler
 * with try/catch to prevent Prisma/DB stack traces from leaking to clients.
 *
 * On unhandled errors, returns a generic 500 with no stack trace.
 *
 * Usage:
 *   export const GET = withErrorHandler(async (req) => {
 *     // ... your handler code
 *   })
 *
 *   export const POST = withErrorHandler(async (req, { params }) => {
 *     const { id } = await params
 *     // ...
 *   })
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (error: any) {
      // Log the error server-side for debugging
      console.error("[API Error]", error?.message || error)
      // Forward to Sentry when SENTRY_DSN is configured (Admin → Settings).
      // Fire-and-forget: reporting failures must never affect the response.
      void captureServerError(
        `API ${error?.message || "unhandled error"}`,
        {
          path: args[0] instanceof NextRequest ? args[0].nextUrl?.pathname : undefined,
          stack: typeof error?.stack === "string" ? error.stack.slice(0, 1500) : undefined,
        },
      )
      // Return a generic 500 - never leak the stack trace
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}

/**
 * readJsonBody() - parse a request body as JSON with size + shape validation.
 *
 * Returns `{ data, error }`:
 *   - on success, `data` is the parsed object and `error` is null.
 *   - on failure, `data` is null and `error` is a NextResponse (400) ready
 *     to return from the handler.
 *
 * Default max body size is 1 MB. For routes that accept larger uploads
 * (e.g. file attachments), pass a higher limit explicitly.
 *
 * Why: without a body-size cap, a malicious client can POST a 100 MB body
 * and OOM the Node.js process. Next.js does not enforce a default limit.
 */
export async function readJsonBody<T = unknown>(
  req: NextRequest,
  opts: { maxBytes?: number } = {}
): Promise<{ data: T | null; error: NextResponse | null }> {
  const maxBytes = opts.maxBytes ?? 1 * 1024 * 1024 // 1 MB default
  // Use text() so we can length-check BEFORE parsing. req.json() would
  // stream the entire body into memory unconditionally.
  let text: string
  try {
    text = await req.text()
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    }
  }
  if (text.length > maxBytes) {
    return {
      data: null,
      error: NextResponse.json(
        { error: `Body too large (max ${maxBytes} bytes)` },
        { status: 413 }
      ),
    }
  }
  if (!text) {
    return {
      data: null,
      error: NextResponse.json({ error: "Empty request body" }, { status: 400 }),
    }
  }
  try {
    return { data: JSON.parse(text) as T, error: null }
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }
}

/**
 * In-memory rate limiter - single-instance only.
 *
 * For serverless / multi-instance deployments, replace with a Redis-backed
 * limiter (Upstash Ratelimit). The function signature is intentionally
 * minimal so the swap is a one-line change inside this file.
 *
 * Usage:
 *   const ok = rateLimit(`login:${ip}`, { max: 10, windowMs: 60_000 })
 *   if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
 *
 * Identity keys: use a stable prefix + IP + (optional) user ID. Don't use
 * the bare IP - Cloudflare/Vercel can mask it. Prefer `x-forwarded-for`'s
 * first hop + a route-specific prefix.
 */
type RateLimitEntry = { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateLimitEntry>()

// Periodic cleanup so the map doesn't grow unbounded. (Entries naturally
// expire on read, but abandoned keys would otherwise linger.)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < now) rateLimitMap.delete(k)
    }
  }, 5 * 60 * 1000).unref?.()
}

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + opts.windowMs })
    return true
  }
  if (entry.count >= opts.max) return false
  entry.count++
  return true
}

/**
 * Extract a client IP from a NextRequest. Handles x-forwarded-for chains
 * (takes the first hop) and falls back to "unknown".
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    return xff.split(",")[0].trim()
  }
  return req.headers.get("x-real-ip") || "unknown"
}
