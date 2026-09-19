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

const hash = (s: string) => bcrypt.hashSync(s, 10)

const ACCOUNTS = [
  {
    email: "admin@guardianx.io",
    name: "Alex Mercer",
    passwordHash: hash("admin123"),
    role: "ADMIN",
    title: "Platform Administrator",
    bio: "GuardianX platform administrator and lead security architect.",
  },
  {
    email: "sarah.chen@guardianx.io",
    name: "Dr. Sarah Chen",
    passwordHash: hash("instructor123"),
    role: "INSTRUCTOR",
    title: "Principal Security Instructor",
    bio: "15 years in offensive security; OSCP, OSCE and CEH Master certified.",
  },
  {
    email: "raj.patel@guardianx.io",
    name: "Raj Patel",
    passwordHash: hash("instructor123"),
    role: "INSTRUCTOR",
    title: "Senior Instructor — Cloud & DFIR",
    bio: "Cloud security architect turned educator; CISSP, CCSP, GCFE.",
  },
  {
    email: "student@guardianx.io",
    name: "Jamie Rivera",
    passwordHash: hash("student123"),
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
