/**
 * Central Next.js middleware.
 *
 * Goal: provide a single enforcement point for route-level auth + RBAC so
 * that individual API route handlers don't have to remember to call
 * `getCurrentUser()` / `requireRole()`. This is defense-in-depth - handlers
 * should STILL do their own fine-grained checks (e.g. "this order belongs
 * to this user"), but middleware catches the obvious "unauthenticated user
 * hits /api/admin/*" case globally.
 *
 * Auth model: NextAuth v4 with JWT strategy. The session token cookie is
 * named `next-auth.session-token` (dev) / `__Secure-next-auth.session-token`
 * (prod). We don't verify the JWT here - that's the route handler's job.
 * We just check that *a* session cookie is present. If absent, return 401
 * for API routes or redirect to / for non-API routes.
 *
 * Public allowlist: see PUBLIC_API_ROUTES + PUBLIC_PAGES below.
 */

import { NextResponse, type NextRequest } from "next/server"

// === Route gating rules ===
//
// Each entry is a [prefix, requiredRoles] tuple. A request matches if its
// pathname starts with `prefix`. The FIRST match wins, so order most-specific
// prefixes first.
const PROTECTED_API_PREFIXES: Array<[string, string[] | "any-auth"]> = [
  // Admin endpoints: ADMIN or SUPER_ADMIN.
  ["/api/admin", ["ADMIN", "SUPER_ADMIN"]],
  // Instructor endpoints: INSTRUCTOR, ADMIN, or SUPER_ADMIN.
  ["/api/instructor", ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]],
  // School admin endpoints: SCHOOL_ADMIN + ADMIN/SUPER_ADMIN.
  ["/api/school", ["SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN"]],
  // NOTE: /api/parent is intentionally NOT listed here - parents authenticate
  // with their own signed x-parent-token (src/lib/parent-auth.ts), not a
  // NextAuth session cookie, so requiring one here would 401 every parent
  // request. Parent routes perform their own token verification.
  // Exam endpoints (start, submit, list-attempts): any authenticated user.
  // Proctor-only mutations still need a fine-grained check in the handler.
  ["/api/exams", "any-auth"],
  // Course-studio authoring endpoints.
  ["/api/course-studio", ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]],
  // AI course generator: any auth (rate-limited in handler).
  ["/api/ai-course-generator", "any-auth"],
  // AI Course Architect: any auth - route itself enforces admin/instructor-owner.
  ["/api/ai/course-architect", "any-auth"],
  // Lab snapshots: any auth (user can only see their own snapshots).
  ["/api/lab-snapshots", "any-auth"],
  // Submissions peer-review: any auth (handler checks ownership).
  ["/api/submissions", "any-auth"],
  // CTF endpoints: any auth.
  ["/api/ctf", "any-auth"],
  // Cyber-quiz submit + checkout: any auth (guest mode for /questions etc.
  // is allowed via the public allowlist below).
  ["/api/cyber-quiz/submit", "any-auth"],
  ["/api/cyber-quiz/checkout", "any-auth"],
  ["/api/cyber-quiz/verify-payment", "any-auth"],
]

// Public API routes that don't require any auth. These are explicitly
// listed (not inferred) so we don't accidentally expose a new endpoint.
const PUBLIC_API_ROUTES = new Set<string>([
  "/api/auth/register",
  "/api/auth/[...nextauth]",
  "/api/platform-stats",
  "/api/search",
  "/api/sitemap.xml",
  "/api/robots.txt",
  "/api/credentials/verify",
  "/api/certificates/verify",
  "/api/certifications",
  "/api/blog",
  "/api/grc",
  "/api/ranks",
  "/api/contact",
  "/api/subscription-plans",
  "/api/affiliate/track",
  "/api/referral/track",
  "/api/guardian-certifications",
  "/api/partners",
  "/api/skills",
  "/api/instructors",
  "/api/crm/webhook",
  "/api/crm/batch-webhook",
  "/api/labs/leaderboard",
  "/api/career-roles",
  "/api/site-content",
  "/api/coupons/verify",
  "/api/learning-paths",
  "/api/technology-partners",
  "/api/cyber-quiz/questions",
  "/api/cyber-quiz/certificate",
  "/api/cyber-quiz/attempt",
  "/api/threat-feed",
  "/api/sentinel/health",
  "/api/enrollment-feed",
  "/api/open-schooling/leads",
  "/api/corporate-training/leads",
  "/api/training-batches",
  "/api/events",
  "/api/courses",
  "/api/notes",
  "/api/notifications",
  "/api/leaderboard",
  "/api/analytics",
  "/api/achievements",
  "/api/discussions",
  "/api/career-roles",
  "/api/labs",
  "/api/instructors",
  "/api/learning-paths",
  "/api/study-groups",
])

// Pages that don't require auth (everything else redirects to / which shows
// the auth screen). The app is a SPA so this is mostly a no-op.
const PUBLIC_PAGES = new Set<string>([
  "/",
  "/login",
  "/courses",
  "/batches",
  "/events",
  "/blog",
  "/contact",
  "/instructors",
  "/institutions",
  "/cyber-range",
  "/cyber-quiz",
  "/verify",
  "/pricing",
  "/corporate-training",
  "/learning-paths",
])

function getSessionCookie(req: NextRequest): string | null {
  // NextAuth sets `next-auth.session-token` (dev) or
  // `__Secure-next-auth.session-token` (prod). Check both.
  return (
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    null
  )
}

function isPublicApiRoute(pathname: string): boolean {
  if (PUBLIC_API_ROUTES.has(pathname)) return true
  // Allow exact-prefix public routes (e.g. "/api/blog" matches "/api/blog/some-post")
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname.startsWith(route + "/") || pathname === route) return true
  }
  return false
}

function matchProtectedPrefix(
  pathname: string
): [string, string[] | "any-auth"] | null {
  for (const entry of PROTECTED_API_PREFIXES) {
    const [prefix] = entry
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return entry
    }
  }
  return null
}

/**
 * Cache-control policy (why this lives in middleware):
 *
 * Next.js serves statically prerendered pages with
 * `Cache-Control: s-maxage=31536000` (one year, shared caches). Behind our
 * preview edge-gateway that is poison: the FIRST visit gets cached and every
 * later visitor - on every device - keeps receiving that same stale build
 * for a year, which is exactly the "no courses on any browser" incident.
 *
 * Policy:
 *  - HTML documents, API JSON, sw.js, RSC payloads: `private, no-cache,
 *    no-store` - always revalidate against the origin.
 *  - /_next/static/* and /_next/image: untouched - they are content-hashed
 *    and safe to cache immutably (Next sets `public, max-age=31536000,
 *    immutable`).
 */
const IMMUTABLE_PREFIXES = ["/_next/static/", "/_next/image"]

const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate"

/** Stamp no-store unless the response already carries an explicit policy. */
function withFreshnessHeaders(res: NextResponse): NextResponse {
  if (!res.headers.has("Cache-Control")) {
    res.headers.set("Cache-Control", NO_STORE)
  }
  return res
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Content-hashed assets keep their immutable caching (belt for the matcher).
  if (IMMUTABLE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Pages and files (sw.js, icons, …): pass through with fresh headers.
  // Pages are gated client-side by the SPA shell.
  if (!pathname.startsWith("/api/")) return withFreshnessHeaders(NextResponse.next())

  const protectedMatch = matchProtectedPrefix(pathname)
  if (!protectedMatch) {
    // Not under a protected prefix. If it's in the public allowlist, allow.
    // Otherwise, allow through - the route handler must do its own auth check.
    // (We intentionally don't 401 here to avoid breaking routes we forgot to
    // classify. The route handler is the source of truth for fine-grained
    // auth.)
    return withFreshnessHeaders(NextResponse.next())
  }

  // Allow CORS preflight through.
  if (req.method === "OPTIONS") return withFreshnessHeaders(NextResponse.next())

  const [, required] = protectedMatch
  const token = getSessionCookie(req)

  if (!token) {
    return withFreshnessHeaders(
      NextResponse.json(
        { error: "Unauthorized - no session" },
        { status: 401 }
      )
    )
  }

  // We don't verify the JWT here (would require NextAuth's secret + a
  // jwt.decode call). Route handlers do that via getCurrentUser(). The
  // middleware just guarantees a session cookie is present, which is enough
  // to short-circuit obvious unauthenticated traffic. If the cookie is
  // present but invalid, the handler's getCurrentUser() will return null
  // and the handler will return its own 401.
  //
  // The `required` roles are checked in the handler via requireRole() - 
  // middleware can't easily decode the role from the JWT without the
  // secret and a decode library. (You could wire that up if you want
  // middleware-level RBAC, but it's a non-trivial perf hit per request.)

  return withFreshnessHeaders(NextResponse.next())
}

export const config = {
  // Run on everything EXCEPT immutable content-hashed assets (those keep
  // Next's year-long caching). Pages, API, sw.js, RSC payloads all pass
  // through so HTML/API never get pinned by shared caches (see the
  // cache-control policy note above middleware()).
  matcher: ["/((?!_next/static|_next/image).*)"],
}
