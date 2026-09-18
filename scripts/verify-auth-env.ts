/**
 * Env fixture for scripts/verify-auth-assert.ts — evaluated BEFORE the app
 * imports (ESM import order matters: Prisma/NextAuth read env at import time).
 * Shaped like the production state that triggered the outage: SMTP + Google
 * configured. The settings DB is unreachable in this script; getSettings()
 * catches that and falls back to these env vars (the documented behavior).
 */
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "verify-assert-secret-0123456789"
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/verify"
process.env.SMTP_HOST = "smtp.verify.local"
process.env.SMTP_PORT = "465"
process.env.SMTP_USER = "noreply@verify.local"
process.env.SMTP_PASSWORD = "verify-pass"
process.env.GOOGLE_CLIENT_ID = "verify.apps.googleusercontent.com"
process.env.GOOGLE_CLIENT_SECRET = "verify-secret"
