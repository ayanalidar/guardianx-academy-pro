/**
 * Auth assert-level verification — reproduces the exact failure mode that
 * broke production login ("Server error / There is a problem with the
 * server configuration.") and proves the fix.
 *
 * next-auth v4's assertConfig() is the gatekeeper that renders that page.
 * We call it DIRECTLY (same module next-auth uses internally) against the
 * options getAuthOptions() produces, for every action the login flow uses.
 *
 * Run: npx tsx scripts/verify-auth-assert.ts
 */

// Shaped like a .env that triggered the production outage: SMTP configured
// (env fallback — settings DB is unreachable here, which getSettings handles)
// Env fixture MUST be imported before anything else — ESM evaluates
// imports in declaration order, and Prisma/NextAuth read env at import time.
import "./verify-auth-env"
import { getAuthOptions } from "../src/lib/auth"
// Internal (non-public) but stable CJS module — the same assertConfig the
// AuthHandler runs on EVERY request before routing to a provider action.
// next-auth's package.json exports map blocks subpath imports, so load the
// file by direct path instead.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertConfig } = require(
  require("path").join(process.cwd(), "node_modules/next-auth/core/lib/assert.js")
)

type InternalReq = {
  origin: string
  method: string
  action: string
  providerId?: string
  query: Record<string, any>
  cookies: Record<string, string>
  headers: Record<string, string>
  body?: any
}

function req(partial: Partial<InternalReq>): InternalReq {
  return {
    origin: "https://academy.guardianx.cloud",
    method: "GET",
    action: "signin",
    query: { nextauth: ["signin"] },
    cookies: {},
    headers: {},
    ...partial,
  }
}

let failures = 0
function check(name: string, cond: boolean, detail?: unknown) {
  const ok = cond
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : " :: " + JSON.stringify(detail)}`)
  if (!ok && detail !== undefined) console.log(detail)
}

async function main() {
  const options = await getAuthOptions()

  // 1. Provider assembly with SMTP + Google configured.
  // next-auth's parseProviders() merges each provider's `options` (where
  // the user-facing `id` lives) at request time — mirror that here.
  const ids = options.providers.map((p: any) => p.options?.id ?? p.id ?? p.type)
  console.log("providers:", ids.join(", "), "| adapter:", !!options.adapter, "| secret:", !!options.secret)
  check("credentials provider registered", ids.includes("credentials"))
  check("school-login provider registered", ids.includes("school-login"))
  check("google provider registered when configured", ids.includes("google"))
  check("email provider registered when SMTP configured", ids.includes("email"))
  check("adapter present (satisfies EmailProvider requirement)", typeof (options.adapter as any)?.createVerificationToken === "function")
  check("session strategy stays jwt", options.session?.strategy === "jwt")

  // 2. assertConfig across EVERY action the login surface touches.
  //    Pre-fix, with the email provider registered and no adapter, ALL of
  //    these returned a MissingAdapter Error → the exact production page.
  const cases: Array<[string, InternalReq]> = [
    ["POST /api/auth/callback/credentials (email+password login)", req({
      method: "POST", action: "callback", providerId: "credentials",
      query: { nextauth: ["callback", "credentials"] },
      body: { email: "admin@example.com", password: "x", csrfToken: "t" },
    })],
    ["POST /api/auth/callback/school-login (school portal login)", req({
      method: "POST", action: "callback", providerId: "school-login",
      query: { nextauth: ["callback", "school-login"] },
      body: { schoolCode: "GX", adminEmail: "a@b.c", password: "x", csrfToken: "t" },
    })],
    ["GET /api/auth/signin/google (Google button — the page user saw)", req({
      action: "signin", providerId: "google", query: { nextauth: ["signin", "google"] },
    })],
    ["POST /api/auth/signin/email (magic link send)", req({
      method: "POST", action: "signin", providerId: "email",
      query: { nextauth: ["signin", "email"] }, body: { email: "a@b.c", csrfToken: "t" },
    })],
    ["GET /api/auth/callback/email (magic link click)", req({
      action: "callback", providerId: "email",
      query: { nextauth: ["callback", "email"], token: "t", email: "a@b.c" },
    })],
    ["GET /api/auth/session (every page polls this)", req({
      action: "session", query: { nextauth: ["session"] },
    })],
    ["GET /api/auth/providers (login UI gating)", req({
      action: "providers", query: { nextauth: ["providers"] },
    })],
    ["GET /api/auth/csrf", req({ action: "csrf", query: { nextauth: ["csrf"] } })],
  ]

  for (const [name, r] of cases) {
    // @ts-expect-error — internal API, loosely typed
    const result = assertConfig({ options, req: r })
    const isErr = result instanceof Error
    check(`assert OK  :: ${name}`, !isErr, isErr ? `${(result as Error).name}: ${(result as Error).message}` : undefined)
  }

  // 3. Fallback guarantee — production with a missing secret must not throw
  //    out of getAuthOptions; next-auth logs MissingSecret properly instead.
  const prevSecret = process.env.NEXTAUTH_SECRET
  delete process.env.NEXTAUTH_SECRET
  process.env.NODE_ENV = "production"
  const fallback = await getAuthOptions()
  check("fallback options returned when options build throws", Array.isArray(fallback.providers) && fallback.providers.length >= 2)
  check("fallback keeps credentials + school login", fallback.providers.every((p: any) => ["credentials", "school-login"].includes(p.options?.id ?? p.id)))
  process.env.NEXTAUTH_SECRET = prevSecret
  process.env.NODE_ENV = "test"

  // 4. Adapter surface sanity — methods the email/oauth flows call.
  const a = options.adapter as any
  for (const m of ["createUser", "getUser", "getUserByEmail", "getUserByAccount", "updateUser", "linkAccount", "createVerificationToken", "useVerificationToken"]) {
    check(`adapter.${m} implemented`, typeof a?.[m] === "function")
  }

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error("script error:", e)
  process.exit(1)
})
