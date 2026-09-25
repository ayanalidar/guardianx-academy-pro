/**
 * Fast, idempotent repair of the 4 core demo accounts.
 *
 * Used by watchdog v3's self-healing ladder: when the auth probes keep
 * failing while the rest of the platform is healthy, the most likely cause
 * is that the demo accounts were lost (partial DB restore, manual cleanup,
 * data loss). Running the FULL seed for that would be slow; this upserts
 * just the accounts in ~1 second.
 *
 * Run: DATABASE_URL=... bun prisma/ensure-accounts.ts
 */
import { db } from "../src/lib/db"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

const hash = (s: string) => bcrypt.hashSync(s, 10)

// ---------------------------------------------------------------------------
// SECURITY (audit fix): never seed weak default passwords into a production
// database. When running against a cloud/prod database (or NODE_ENV=production)
// and no explicit password env vars are provided, each missing account gets a
// cryptographically random password that is printed ONCE for the operator to
// copy. Weak defaults are only allowed for local development databases.
// ---------------------------------------------------------------------------
const PROD_DB =
  process.env.NODE_ENV === "production" ||
  /neon\.tech|neon\.build|amazonaws|azure\.com|render\.com|rds\./i.test(
    process.env.DATABASE_URL ?? ""
  )

function resolvePassword(envKey: string, devDefault: string): string {
  const fromEnv = process.env[envKey]
  if (fromEnv) return fromEnv
  if (PROD_DB) {
    const generated = randomBytes(18).toString("base64url") // 24 chars, 144 bits
    console.log(
      `  [security] ${envKey} not set against a PROD database - generated strong password for this account (printed ONCE, copy it now): ${generated}`
    )
    return generated
  }
  return devDefault
}

const ACCOUNTS = [
  {
    email: "admin@guardianx.io",
    name: "Alex Mercer",
    passwordHash: hash(resolvePassword("DEMO_ADMIN_PASSWORD", "admin123")),
    role: "ADMIN",
    title: "Platform Administrator",
    bio: "GuardianX platform administrator and lead security architect.",
  },
  {
    email: "sarah.chen@guardianx.io",
    name: "Dr. Sarah Chen",
    passwordHash: hash(resolvePassword("DEMO_INSTRUCTOR1_PASSWORD", "instructor123")),
    role: "INSTRUCTOR",
    title: "Principal Security Instructor",
    bio: "15 years in offensive security; OSCP, OSCE and CEH Master certified.",
  },
  {
    email: "raj.patel@guardianx.io",
    name: "Raj Patel",
    passwordHash: hash(resolvePassword("DEMO_INSTRUCTOR2_PASSWORD", "instructor123")),
    role: "INSTRUCTOR",
    title: "Senior Instructor — Cloud & DFIR",
    bio: "Cloud security architect turned educator; CISSP, CCSP, GCFE.",
  },
  {
    email: "student@guardianx.io",
    name: "Jamie Rivera",
    passwordHash: hash(resolvePassword("DEMO_STUDENT_PASSWORD", "student123")),
    role: "STUDENT",
    title: "Aspiring Security Analyst",
    bio: "Career switcher from finance to cyber security. Currently grinding CEH.",
  },
]

async function main() {
  let ensured = 0
  for (const a of ACCOUNTS) {
    await db.user.upsert({ where: { email: a.email }, update: {}, create: a })
    ensured++
  }
  console.log(`ensure-accounts: ${ensured} core accounts present`)
}

main()
  .catch((e) => {
    console.error("ensure-accounts failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
