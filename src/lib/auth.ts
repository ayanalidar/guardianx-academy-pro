import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { sendEmail, magicLinkEmailTemplate } from "@/lib/email"
import { requireSecret } from "@/lib/secrets"
import { getSettings } from "@/lib/settings"
import { prismaAuthAdapter, oauthPlaceholderHash } from "@/lib/auth-adapter"

// ---------------------------------------------------------------------------
// Rate limiting for login attempts (in-memory, per IP)
// ---------------------------------------------------------------------------
const LOGIN_RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const LOGIN_RATE_LIMIT_MAX = 10 // 10 login attempts per minute per IP
const loginRateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginRateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    loginRateLimitMap.set(ip, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= LOGIN_RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

function clientIpFromAuthorizeReq(req: unknown): string {
  return (
    (req as any)?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown"
  )
}

// ---------------------------------------------------------------------------
// Credentials provider - email + password for students/instructors/admins.
// Module-scope const: it is stateless (rate-limit map lives above) and shared
// by both the dynamic options and the fallback options below.
// ---------------------------------------------------------------------------
const credentialsProvider = CredentialsProvider({
  id: "credentials",
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials, req) {
    if (!credentials?.email || !credentials?.password) return null
    // Rate limit by IP to prevent brute-force attacks
    if (!checkLoginRateLimit(clientIpFromAuthorizeReq(req))) return null
    try {
      const user = await db.user.findUnique({ where: { email: credentials.email } })
      if (!user) return null
      const ok = bcrypt.compareSync(credentials.password, user.passwordHash)
      if (!ok) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      } as any
    } catch (error) {
      // A DB hiccup must NOT throw out of authorize(): next-auth would
      // redirect with the raw error message in the URL. Returning null
      // degrades to "invalid credentials" and keeps the failure contained.
      console.error("[auth] credentials authorize failed:", error)
      return null
    }
  },
})

// ---------------------------------------------------------------------------
// School-login credentials provider - schoolCode + adminEmail + password.
// Used by the "School Portal" tab on the login screen. Each school/college/
// university has a unique schoolCode for login.
// ---------------------------------------------------------------------------
const schoolLoginProvider = CredentialsProvider({
  id: "school-login",
  name: "School Portal",
  credentials: {
    schoolCode: { label: "School Code", type: "text" },
    adminEmail: { label: "Admin Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.schoolCode || !credentials?.adminEmail || !credentials?.password) return null
    try {
      const school = await db.school.findUnique({
        where: { schoolCode: credentials.schoolCode.toUpperCase() },
      })
      if (!school) return null
      if (school.status !== "active") return null
      // Verify admin email matches
      if (school.adminEmail.toLowerCase() !== credentials.adminEmail.toLowerCase()) return null
      const ok = bcrypt.compareSync(credentials.password, school.passwordHash)
      if (!ok) return null
      // Find or create the User record linked to this school for the admin
      let adminUser = await db.user.findUnique({ where: { email: school.adminEmail } })
      if (!adminUser) {
        adminUser = await db.user.create({
          data: {
            email: school.adminEmail,
            name: school.adminName,
            passwordHash: school.passwordHash,
            role: "SCHOOL_ADMIN",
            schoolId: school.id,
            title: `Administrator, ${school.name}`,
          },
        })
        // Link to school as SCHOOL_ADMIN member
        await db.schoolMember.create({
          data: { schoolId: school.id, userId: adminUser.id, role: "SCHOOL_ADMIN" },
        })
      } else if (adminUser.role !== "SCHOOL_ADMIN") {
        // Upgrade existing user to school admin + link school
        await db.user.update({
          where: { id: adminUser.id },
          data: { role: "SCHOOL_ADMIN", schoolId: school.id },
        })
      }
      return {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: "SCHOOL_ADMIN" as const,
        schoolId: school.id,
      } as any
    } catch (error) {
      // Same containment as the credentials provider above.
      console.error("[auth] school-login authorize failed:", error)
      return null
    }
  },
})

// ---------------------------------------------------------------------------
// Callbacks - identical for every option variant (module-scope const).
// ---------------------------------------------------------------------------
const authCallbacks: NextAuthOptions["callbacks"] = {
  async signIn({ user, account }) {
    // For Google OAuth: create or link the user in our DB
    if (account?.provider === "google" && user.email) {
      const existing = await db.user.findUnique({ where: { email: user.email } })
      if (!existing) {
        // Auto-create a new STUDENT account for Google sign-ins.
        // passwordHash is a non-guessable sentinel - credentials login
        // for OAuth-only accounts is impossible.
        await db.user.create({
          data: {
            email: user.email,
            name: user.name || "Google User",
            passwordHash: oauthPlaceholderHash(),
            role: "STUDENT",
            title: "Student",
            avatar: user.image || null,
          },
        })
      }
    }
    // For Email (magic link): auto-create a STUDENT account on first login
    if (account?.provider === "email" && user.email) {
      const existing = await db.user.findUnique({ where: { email: user.email.toLowerCase() } })
      if (!existing) {
        await db.user.create({
          data: {
            email: user.email.toLowerCase(),
            name: user.name || user.email.split("@")[0],
            passwordHash: oauthPlaceholderHash(),
            role: "STUDENT",
            title: "Student",
          },
        })
      }
    }
    return true
  },
  async jwt({ token, user, account }) {
    if (user) {
      token.role = (user as any).role
      token.schoolId = (user as any).schoolId
    }
    // For Google OAuth: look up the user's role from DB
    if (account?.provider === "google" && user?.email) {
      const dbUser = await db.user.findUnique({ where: { email: user.email } })
      if (dbUser) {
        token.role = dbUser.role
        token.sub = dbUser.id
      }
    }
    return token
  },
  async session({ session, token }) {
    if (session.user && token.sub) {
      ;(session.user as any).id = token.sub
      ;(session.user as any).role = token.role
      ;(session.user as any).schoolId = token.schoolId
    }
    return session
  },
}

// ---------------------------------------------------------------------------
// Cookie security - use secure:true in production (HTTPS), false in dev.
// ---------------------------------------------------------------------------
const authCookies: NextAuthOptions["cookies"] = {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
  csrfToken: {
    name: `next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
  callbackUrl: {
    name: `next-auth.callback-url`,
    options: {
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
}

/**
 * buildAuthOptions() - assembles the full options from live settings.
 * The ONLY dynamic part is the optional Google / Email providers; every
 * thing else (adapter, callbacks, cookies) is module-scope and shared.
 */
async function buildAuthOptions(): Promise<NextAuthOptions> {
  const s = await getSettings([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "EMAIL_FROM",
  ])

  const googleConfigured = !!(s.GOOGLE_CLIENT_ID && s.GOOGLE_CLIENT_SECRET)
  const smtpConfigured = !!(s.SMTP_HOST && s.SMTP_USER && s.SMTP_PASSWORD)

  return {
    // Custom Prisma adapter - REQUIRED by next-auth v4 whenever the Email
    // (magic link) provider is registered. Without it, assertConfig()
    // fails with MissingAdapter and EVERY auth endpoint (including plain
    // email+password login!) renders the built-in
    // "Server error / There is a problem with the server configuration."
    // page. It is always registered (not just when SMTP exists) so the
    // auth surface has ONE consistent behavior, and it is deliberately
    // JWT-friendly: sessions stay "jwt", no Account/Session tables exist.
    adapter: prismaAuthAdapter,

    providers: [
      credentialsProvider,
      schoolLoginProvider,

      // Google OAuth provider - "Sign in with Google" button
      // allowDangerousEmailAccountLinking TRUE:
      //   With the adapter registered, next-auth resolves OAuth users by
      //   email. Setting this to `true` keeps the exact access semantics
      //   the app ALWAYS had (pre-adapter): a Google account whose email
      //   matches an existing user signs in as that user, and the signIn
      //   callback auto-creates STUDENT accounts for brand-new emails.
      //   Google-verified emails only - no email enumeration beyond what
      //   Google itself guarantees.
      // Registered only when configured (DB → env fallback) so that the
      // login UI can hide the button when Google OAuth is not set up.
      ...(googleConfigured
        ? [
            GoogleProvider({
              clientId: s.GOOGLE_CLIENT_ID!,
              clientSecret: s.GOOGLE_CLIENT_SECRET!,
              allowDangerousEmailAccountLinking: true,
            }),
          ]
        : []),

      // Email (magic link) provider - passwordless login
      // User enters email → gets a login link → clicks → logged in
      // Requires SMTP settings (Platform Settings DB → env fallback):
      // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
      // If SMTP not configured, the provider is silently skipped.
      // NOTE: this provider REQUIRES the adapter above - that requirement
      // is why login broke platform-wide when SMTP was configured without
      // one (see the adapter comment block).
      ...(smtpConfigured
        ? [
            EmailProvider({
              server: {
                host: s.SMTP_HOST!,
                port: parseInt(s.SMTP_PORT || "465", 10),
                auth: {
                  user: s.SMTP_USER!,
                  pass: s.SMTP_PASSWORD!,
                },
              },
              from: s.EMAIL_FROM || s.SMTP_USER || undefined,
              maxAge: 24 * 60 * 60, // 24 hours
              // Custom sendMagicLink - uses our branded email template
              async sendVerificationRequest({ identifier: email, url }) {
                // Look up the user to personalize the email
                const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
                const name = user?.name || "there"
                await sendEmail({
                  to: email,
                  subject: "Your GuardianX Academy login link",
                  html: magicLinkEmailTemplate(name, url),
                })
              },
              // Auto-create a STUDENT account on first magic-link login
              // (handled by the signIn callback + adapter createUser).
            }),
          ]
        : []),
    ],

    session: { strategy: "jwt" },
    // requireSecret throws in production if NEXTAUTH_SECRET is missing - 
    // getAuthOptions() catches that and degrades gracefully (see below).
    // In dev, a random ephemeral secret is used (with a loud warning) so
    // the server still boots - but JWTs won't survive a restart.
    secret: requireSecret("NEXTAUTH_SECRET"),
    pages: { signIn: "/" },
    callbacks: authCallbacks,
    cookies: authCookies,
  }
}

/**
 * getAuthOptions() - builds NextAuth options dynamically per request.
 *
 * Google OAuth + SMTP credentials are read from the Platform Settings DB
 * (admin-configurable via Admin → Settings) with env-var fallback, so saving
 * keys in the admin panel takes effect on the NEXT request - no redeploy.
 * getSettings() caches values in memory for 5 minutes, so this costs 0-1 DB
 * queries per auth call.
 *
 * FALLBACK GUARANTEE: if anything above throws (settings DB unavailable in a
 * bad way, NEXTAUTH_SECRET unset in production, …), we still return a valid
 * options object with the two credentials providers so that:
 *   - a transient settings problem can never take down password login again
 *   - a missing production secret surfaces as next-auth's own logged
 *     MissingSecret error (server logs say exactly what's wrong) instead of
 *     an unhandled route-handler 500.
 */
export async function getAuthOptions(): Promise<NextAuthOptions> {
  try {
    return await buildAuthOptions()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "[auth] getAuthOptions() failed - falling back to credentials-only options:",
      error
    )
    return {
      adapter: prismaAuthAdapter,
      providers: [credentialsProvider, schoolLoginProvider],
      session: { strategy: "jwt" },
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      pages: { signIn: "/" },
      callbacks: authCallbacks,
      cookies: authCookies,
    }
  }
}
