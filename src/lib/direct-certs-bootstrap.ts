import { db } from "@/lib/db"

/* ============================================================
 * Direct-certificate bootstrap - schema resilience.
 *
 * Mirrors src/lib/internships-bootstrap.ts (house pattern): the
 * project deploys with `prisma generate && next build` (no
 * `db push` runs on Vercel), so every direct-certificate route
 * calls ensureDirectCertificateTables() first:
 *
 *   1. Probe the table with a cheap query (memoized per instance).
 *   2. If Prisma reports the table missing (P2021) or a column
 *      missing (P2022), run idempotent CREATE TABLE IF NOT EXISTS
 *      + ALTER ADD COLUMN IF NOT EXISTS DDL matching
 *      prisma/schema.prisma EXACTLY, then retry once.
 * ============================================================ */

let tablesReady = false

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "DirectCertificate" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT,
    "photoUrl" TEXT,
    "programTitle" TEXT NOT NULL,
    "collegeName" TEXT,
    "mentorName" TEXT,
    "durationWeeks" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "skills" TEXT NOT NULL DEFAULT '[]',
    "projects" TEXT NOT NULL DEFAULT '[]',
    "grade" TEXT,
    "score" INTEGER,
    "remarks" TEXT,
    "programDirector" TEXT,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "showPublicly" BOOLEAN NOT NULL DEFAULT true,
    "verificationHash" TEXT,
    "certificateIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailedAt" TIMESTAMP(3),
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DirectCertificate_pkey" PRIMARY KEY ("id")
  )`,
  // --- column-drift insurance (Postgres 9.6+ ADD COLUMN IF NOT EXISTS) ---
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "studentEmail" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "collegeName" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "mentorName" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "durationWeeks" INTEGER`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3)`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3)`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "skills" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "projects" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "grade" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "score" INTEGER`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "remarks" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "programDirector" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'valid'`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "showPublicly" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "verificationHash" TEXT`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "emailedAt" TIMESTAMP(3)`,
  `ALTER TABLE "DirectCertificate" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DirectCertificate_certificateId_key" ON "DirectCertificate"("certificateId")`,
  `CREATE INDEX IF NOT EXISTS "DirectCertificate_status_idx" ON "DirectCertificate"("status")`,
  `CREATE INDEX IF NOT EXISTS "DirectCertificate_showPublicly_idx" ON "DirectCertificate"("showPublicly")`,
]

/** True once the table (and all its columns) is present. */
export async function ensureDirectCertificateTables(): Promise<boolean> {
  if (tablesReady) return true

  // 1) Cheap full-row probe - succeeds instantly once the table AND all
  //    its columns exist (P2021/P2022 both fall through to DDL).
  try {
    await db.directCertificate.findFirst({ take: 1 })
    tablesReady = true
    return true
  } catch {
    /* fall through to DDL */
  }

  // 2) Idempotent DDL, then re-probe.
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt)
    await db.directCertificate.findFirst({ take: 1 })
    tablesReady = true
    return true
  } catch (error) {
    console.error("[direct-certs] ensureDirectCertificateTables failed:", error)
    return false
  }
}
