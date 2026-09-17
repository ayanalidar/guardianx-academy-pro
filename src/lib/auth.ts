import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { sendEmail, magicLinkEmailTemplate } from "@/lib/email"
import { requireSecret } from "@/lib/secrets"

// Generate a sentinel password hash for OAuth/magic-link accounts.
// These accounts cannot log in via the credentials provider — the hash is
// just a placeholder so the NOT NULL constraint is satisfied.
function oauthPlaceholderHash(): string {
  // 32 random bytes hex-encoded, then hashed with bcrypt. The plaintext is
  // never stored or used, so it's safe — but it's also not a constant
  // (unlike "!oauth-only") so attackers can't identify OAuth accounts by
  // hash prefix.
  const random = randomBytes(32).toString("hex")
  return bcrypt.hashSync(random, 12)
}

// Rate limiting for login attempts (in-memory, per IP)
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

export const authOptions: NextAuthOptions = {
  providers: [
    // Standard credentials provider — email + password for students/instructors/admins
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null
        // Rate limit by IP to prevent brute-force attacks
        const ip = (req as any)?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown"
        if (!checkLoginRateLimit(ip)) return null
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
      },
    }),

    // School-login credentials provider — schoolCode + adminEmail + password
    // Used by the "School Portal" tab on the login screen.
    // Each school/college/university has a unique schoolCode for login.
    CredentialsProvider({
      id: "school-login",
      name: "School Portal",
      credentials: {
        schoolCode: { label: "School Code", type: "text" },
        adminEmail: { label: "Admin Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.schoolCode || !credentials?.adminEmail || !credentials?.password) return null
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
      },
    }),

    // Google OAuth provider — "Sign in with Google" button
    // allowDangerousEmailAccountLinking is FALSE: prevents account-takeover
    // via the password-then-OAuth merge path. Users who try to OAuth with an
    // email already registered via password will be asked to sign in with
    // the original method first.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: false,
    }),

    // Email (magic link) provider — passwordless login
    // User enters email → gets a login link → clicks → logged in
    // Requires SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)
    // If SMTP not configured, the provider is silently skipped
    ...(process.env.SMTP_HOST ? [EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "465", 10),
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      maxAge: 24 * 60 * 60, // 24 hours
      // Custom sendMagicLink — uses our branded email template
      async sendVerificationRequest({ identifier: email, url, token, theme }) {
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
      // (same pattern as Google OAuth)
    })] : []),
  ],
  session: { strategy: "jwt" },
  // requireSecret throws in production if NEXTAUTH_SECRET is missing.
  // In dev, a random ephemeral secret is used (with a loud warning) so the
  // server still boots — but JWTs won't survive a restart.
  secret: requireSecret("NEXTAUTH_SECRET"),
  pages: { signIn: "/" },
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth: create or link the user in our DB
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } })
        if (!existing) {
          // Auto-create a new STUDENT account for Google sign-ins.
          // passwordHash is a non-guessable sentinel — credentials login
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
        (session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).schoolId = token.schoolId
      }
      return session
    },
  },
  // Cookie security — use secure:true in production (HTTPS), false in dev (HTTP)
  cookies: {
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
  },
}
