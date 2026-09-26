import { db } from "@/lib/db"

/* ============================================================
 * Live Feed bootstrap - schema resilience + first-run seed.
 *
 * Same rationale as placements-bootstrap: Vercel deploys run
 * `prisma generate && next build` (no `db push`), so a freshly
 * added model would 500 on production until the schema is
 * pushed. Every live-feed route calls ensureLiveFeedTable():
 *
 *   1. Probe the table with a cheap query (memoized per instance).
 *   2. If Prisma reports the table missing (P2021), run idempotent
 *      `CREATE TABLE IF NOT EXISTS` DDL matching prisma/schema.prisma
 *      EXACTLY, then retry once.
 *
 * seedLiveFeedEntriesIfEmpty() inserts a few CLEARLY-MARKED sample
 * rows (isSample: true) the first time the table is empty, so the
 * homepage "RECENT ENROLLMENTS" widget never launches dead. The
 * owner edits/replaces them from Admin → Platform Stats → Live Feed.
 * ============================================================ */

let tableReady = false

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "LiveFeedEntry" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "city" TEXT,
    "courseTitle" TEXT NOT NULL,
    "courseShortName" TEXT,
    "color" TEXT NOT NULL DEFAULT 'emerald',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LiveFeedEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LiveFeedEntry_active_order_idx" ON "LiveFeedEntry"("active", "order")`,
]

export async function ensureLiveFeedTable(): Promise<boolean> {
  if (tableReady) return true

  // 1) Cheap probe - succeeds instantly once the table exists.
  try {
    await db.liveFeedEntry.findFirst({ select: { id: true }, take: 1 })
    tableReady = true
    return true
  } catch {
    /* fall through to DDL */
  }

  // 2) Idempotent DDL, then re-probe.
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt)
    await db.liveFeedEntry.findFirst({ select: { id: true }, take: 1 })
    tableReady = true
    return true
  } catch (error) {
    console.error("[live-feed] ensureLiveFeedTable failed:", error)
    return false
  }
}

/** Clearly-marked placeholder entries for the very first launch.
 *  Every row carries isSample: true - the UI renders a visible
 *  "Sample" chip and the owner swaps in real updates from Admin. */
export const SAMPLE_LIVE_FEED_ENTRIES = [
  {
    displayName: "Sample Learner 01",
    city: "Srinagar",
    courseTitle: "CEH v13 Practical Ethical Hacking",
    courseShortName: "CEHv13",
    color: "emerald",
    occurredAt: new Date(Date.now() - 26 * 60 * 1000), // 26m ago
    active: true,
    isSample: true,
    order: 0,
  },
  {
    displayName: "Sample Learner 02",
    city: "Delhi",
    courseTitle: "SOC Analyst Complete Bootcamp",
    courseShortName: "SOC",
    color: "violet",
    occurredAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h ago
    active: true,
    isSample: true,
    order: 0,
  },
  {
    displayName: "Sample Learner 03",
    city: "Mumbai",
    courseTitle: "OSCP-style Advanced Penetration Testing",
    courseShortName: "PenTest",
    color: "cyan",
    occurredAt: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9h ago
    active: true,
    isSample: true,
    order: 0,
  },
  {
    displayName: "Sample Learner 04",
    city: "Baramulla",
    courseTitle: "Cloud Security - AWS & Azure Hardening",
    courseShortName: "CloudSec",
    color: "amber",
    occurredAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 1d ago
    active: true,
    isSample: true,
    order: 0,
  },
]

/** Insert the sample rows only when the table has NO rows at all
 *  (first launch). Idempotent - later admin edits/deletes never
 *  resurrect deleted samples. Returns the number inserted. */
export async function seedLiveFeedEntriesIfEmpty(): Promise<number> {
  const existing = await db.liveFeedEntry.count()
  if (existing > 0) return 0
  const res = await db.liveFeedEntry.createMany({ data: SAMPLE_LIVE_FEED_ENTRIES as any })
  return res.count
}
