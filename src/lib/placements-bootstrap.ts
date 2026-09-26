import { db } from "@/lib/db"

/* ============================================================
 * Placements bootstrap - schema resilience + first-run seed.
 *
 * The project deploys with `prisma generate && next build` (no
 * `db push` runs on Vercel), so a freshly added model would 500
 * on production until someone manually pushes the schema. To
 * keep client onboarding error-free, every placements route
 * calls ensurePlacementTable() first:
 *
 *   1. Probe the table with a cheap query (memoized per instance).
 *   2. If Prisma reports the table missing (P2021), run idempotent
 *      `CREATE TABLE IF NOT EXISTS` + index DDL matching
 *      prisma/schema.prisma EXACTLY, then retry once.
 *
 * seedSamplePlacementsIfEmpty() inserts a handful of CLEARLY-MARKED
 * sample rows (isSample: true) the very first time the table is
 * empty - so /placements never launches as a blank wall. The owner
 * replaces them from Admin → Hiring & Jobs → Placements.
 * ============================================================ */

let tableReady = false

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "Placement" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companyLogo" TEXT,
    "ctc" TEXT,
    "track" TEXT NOT NULL DEFAULT 'General',
    "year" INTEGER NOT NULL,
    "quote" TEXT,
    "story" TEXT,
    "linkedIn" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Placement_status_featured_order_idx" ON "Placement"("status", "featured", "order")`,
]

export async function ensurePlacementTable(): Promise<boolean> {
  if (tableReady) return true

  // 1) Cheap probe - succeeds instantly once the table exists.
  try {
    await db.placement.findFirst({ select: { id: true }, take: 1 })
    tableReady = true
    return true
  } catch {
    /* fall through to DDL */
  }

  // 2) Idempotent DDL, then re-probe.
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt)
    await db.placement.findFirst({ select: { id: true }, take: 1 })
    tableReady = true
    return true
  } catch (error) {
    console.error("[placements] ensurePlacementTable failed:", error)
    return false
  }
}

/** Extract a comparable LPA number from free-form CTC text ("9.6 LPA",
 *  "₹12 LPA", "12"). Non-Indian currency (e.g. "$90,000") returns null
 *  so it never skews INR averages. */
export function parseLpa(ctc?: string | null): number | null {
  if (!ctc) return null
  if (ctc.includes("$") || /usd/i.test(ctc)) return null
  const m = ctc.match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1])
  return n > 0 && n < 200 ? n : null
}

/** Clearly-marked placeholder rows for the very first launch.
 *  Every row carries isSample: true - the UI renders a visible
 *  "Sample" chip and the owner swaps in real records from Admin. */
export const SAMPLE_PLACEMENTS = [
  {
    studentName: "Sample Student 01",
    role: "SOC Analyst - Tier 1",
    company: "Example Corp",
    ctc: "6.5 LPA",
    track: "SOC Analyst Track",
    year: 2025,
    quote: "Sample record - replace me from Admin → Hiring & Jobs → Placements.",
    story:
      "This is a clearly-marked sample placement so the wall is never empty on first launch. Open Admin → Hiring & Jobs → Placements, edit this row with your real student's details (name, role, company, package, year), uncheck Sample, and it becomes a live outcome. Delete it once replaced.",
    featured: true,
    verified: false,
    isSample: true,
    order: 0,
  },
  {
    studentName: "Sample Student 02",
    role: "Penetration Tester",
    company: "Sample Security Labs",
    ctc: "9 LPA",
    track: "Ethical Hacking Track",
    year: 2025,
    quote: "Sample record - your students' offers go here.",
    story:
      "Sample placement row. Replace from Admin → Hiring & Jobs → Placements with a real student outcome.",
    featured: false,
    verified: false,
    isSample: true,
    order: 0,
  },
  {
    studentName: "Sample Student 03",
    role: "Cloud Security Engineer",
    company: "DemoCloud Systems",
    ctc: "12 LPA",
    track: "Cloud Security Track",
    year: 2024,
    quote: "Sample record - real outcomes land here.",
    story: "Sample placement row. Replace from Admin → Hiring & Jobs → Placements.",
    featured: false,
    verified: false,
    isSample: true,
    order: 0,
  },
  {
    studentName: "Sample Student 04",
    role: "GRC Associate",
    company: "Sample Advisory Group",
    ctc: null,
    track: "GRC & Compliance Track",
    year: 2025,
    quote: "Sample record - package display is optional per student.",
    story:
      "Sample placement row. CTC is optional - leave it empty and the card simply hides the package chip. Replace from Admin → Hiring & Jobs → Placements.",
    featured: false,
    verified: false,
    isSample: true,
    order: 0,
  },
  {
    studentName: "Sample Student 05",
    role: "DevSecOps Engineer",
    company: "Example Software",
    ctc: "14 LPA",
    track: "DevSecOps Track",
    year: 2024,
    quote: "Sample record - featured rows pin to the top of the wall.",
    story: "Sample placement row. Toggle Featured from Admin to pin real students first.",
    featured: false,
    verified: false,
    isSample: true,
    order: 0,
  },
  {
    studentName: "Sample Student 06",
    role: "Security Analyst",
    company: "DemoDefence Ltd",
    ctc: "7.2 LPA",
    track: "SOC Analyst Track",
    year: 2026,
    quote: "Sample record - the newest year shows in filters automatically.",
    story: "Sample placement row. Replace from Admin → Hiring & Jobs → Placements.",
    featured: false,
    verified: false,
    isSample: true,
    order: 0,
  },
]

/** Insert the sample rows only when the table has NO rows at all
 *  (first launch). Idempotent - later admin edits/deletes never
 *  resurrect deleted samples. Returns the number inserted. */
export async function seedSamplePlacementsIfEmpty(): Promise<number> {
  const existing = await db.placement.count()
  if (existing > 0) return 0
  const res = await db.placement.createMany({ data: SAMPLE_PLACEMENTS as any })
  return res.count
}

/** Admin-triggered seed: same rows, but only when there are no
 *  sample rows left (all were replaced/deleted). Never duplicates. */
export async function seedSamplePlacementsIfNoSamples(): Promise<number> {
  const samples = await db.placement.count({ where: { isSample: true } })
  if (samples > 0) return 0
  const res = await db.placement.createMany({ data: SAMPLE_PLACEMENTS as any })
  return res.count
}
