import { db } from "@/lib/db"

/* ============================================================
 * Internships bootstrap - schema resilience + first-run seed.
 *
 * Mirrors src/lib/placements-bootstrap.ts exactly (house
 * pattern): the project deploys with `prisma generate && next
 * build` (no `db push` runs on Vercel), so every internships
 * route calls ensureInternshipTables() first:
 *
 *   1. Probe the tables with a cheap query (memoized per instance).
 *   2. If Prisma reports a table missing (P2021) or a column
 *      missing (P2022), run idempotent CREATE TABLE IF NOT EXISTS
 *      + ALTER ADD COLUMN IF NOT EXISTS DDL matching
 *      prisma/schema.prisma EXACTLY, then retry once.
 *
 * seedSampleInternshipsIfEmpty() inserts CLEARLY-MARKED sample
 * data the very first time the tables are empty (2 colleges ->
 * 4 internships -> 6 student records, every row isSample: true)
 * so /internships never launches as a blank page. The owner
 * replaces/deletes them from Admin -> Internships.
 * ============================================================ */

let tablesReady = false

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "Internship" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "collegeName" TEXT NOT NULL,
    "collegeCity" TEXT,
    "collegeLogo" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT 'GuardianX Academy',
    "domain" TEXT NOT NULL DEFAULT 'Cyber Security',
    "mode" TEXT NOT NULL DEFAULT 'remote',
    "durationWeeks" INTEGER NOT NULL DEFAULT 8,
    "stipend" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "description" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Internship_pkey" PRIMARY KEY ("id")
  )`,
  // --- column-drift insurance (Postgres 9.6+ ADD COLUMN IF NOT EXISTS) ---
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "collegeId" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "collegeCity" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "collegeLogo" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "stipend" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "description" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS "Internship_published_featured_order_idx" ON "Internship"("published", "featured", "order")`,
  `CREATE INDEX IF NOT EXISTS "Internship_collegeName_idx" ON "Internship"("collegeName")`,
  `CREATE TABLE IF NOT EXISTS "InternshipRecord" (
    "id" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "studentEmail" TEXT,
    "role" TEXT NOT NULL,
    "mentorName" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "projects" TEXT NOT NULL DEFAULT '[]',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "tools" TEXT NOT NULL DEFAULT '[]',
    "testimonial" TEXT,
    "grade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "certificateId" TEXT NOT NULL,
    "verificationHash" TEXT NOT NULL,
    "certificateIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "showPublicly" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternshipRecord_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "studentId" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "studentEmail" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "mentorName" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3)`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3)`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "projects" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "skills" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "tools" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "testimonial" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "grade" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'completed'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "showPublicly" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InternshipRecord_certificateId_key" ON "InternshipRecord"("certificateId")`,
  `CREATE INDEX IF NOT EXISTS "InternshipRecord_internshipId_idx" ON "InternshipRecord"("internshipId")`,
  `CREATE INDEX IF NOT EXISTS "InternshipRecord_showPublicly_isSample_sortOrder_idx" ON "InternshipRecord"("showPublicly", "isSample", "sortOrder")`,
]

/** True once both tables (and all their columns) are present. */
export async function ensureInternshipTables(): Promise<boolean> {
  if (tablesReady) return true

  // 1) Full-row probe on both tables - succeeds instantly once the tables
  // AND all their columns exist (P2021/P2022 both fall through to DDL).
  try {
    await db.internship.findFirst({ take: 1 })
    await db.internshipRecord.findFirst({ take: 1 })
    tablesReady = true
    return true
  } catch {
    /* fall through to DDL */
  }

  // 2) Idempotent DDL, then re-probe.
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt)
    await db.internship.findFirst({ take: 1 })
    await db.internshipRecord.findFirst({ take: 1 })
    tablesReady = true
    return true
  } catch (error) {
    console.error("[internships] ensureInternshipTables failed:", error)
    return false
  }
}

/**
 * Auto-seed the clearly-marked sample dataset - ONE TIME per environment.
 *
 * Previously this ran "whenever the tables were empty", which resurrected
 * the whole sample dataset every time the owner deleted it from Admin
 * (reported: "i deleted the sample internships from admin but they keep
 * appearing back again and again"). Now the first call consumes a
 * PlatformSetting flag (seed.auto.internships) and - as the transition -
 * deletes any sample rows still present, completing the owner's earlier
 * deletions. After that this function is a no-op: admin deletions stick
 * permanently and the page shows its honest empty states.
 */
export async function seedSampleInternshipsIfEmpty(): Promise<number> {
  const { isAutoSeedConsumed, markAutoSeedConsumed } = await import("@/lib/settings")

  // One-time opportunity: once consumed, never seed (and never resurrect).
  if (await isAutoSeedConsumed("internships")) return 0
  await markAutoSeedConsumed("internships")

  // Transition cleanup: the owner already deleted the samples from Admin
  // (repeatedly - they kept resurrecting). Finish that deletion: purge the
  // marked sample rows (records first, then internships, for the FK).
  // Real rows (isSample=false) are never touched.
  await db.internshipRecord.deleteMany({ where: { isSample: true } })
  await db.internship.deleteMany({ where: { isSample: true } })
  return 0
}

