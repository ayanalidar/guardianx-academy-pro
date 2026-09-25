import { db } from "@/lib/db"

/**
 * db-safe - schema-drift resilience for write paths.
 *
 * Production (Vercel Postgres) predates several migrations: newer tables
 * (e.g. AuthoredCourse) may not exist at all and older tables (Course,
 * Module, Lesson) may be missing recently-added columns. Reads already
 * degrade gracefully; this module gives WRITES the same treatment:
 *
 *  - getTableColumns() - discover which columns a table actually has
 *                         (memoized per serverless instance).
 *  - filterToColumns() - keep only the fields whose columns exist, so a
 *                         create/update succeeds with the core fields even
 *                         on a drifted database (missing extras stay empty
 *                         until the schema is synced with `prisma db push`).
 *  - ensureTable() - self-healing DDL: CREATE TABLE IF NOT EXISTS +
 *                         ADD COLUMN IF NOT EXISTS + indexes/FKs, so a
 *                         first-time write bootstraps its own storage
 *                         instead of failing with P2021/P2022.
 *  - withDriftRetry() - run a Prisma op; if it fails with P2021/P2022,
 *                         run ensureTable() and retry once.
 *
 * All DDL is idempotent and safe to run concurrently (IF NOT EXISTS
 * everywhere). Foreign keys are added best-effort - a duplicate or failed
 * FK never breaks the request.
 */

export class DriftError extends Error {}

/** Prisma error codes meaning "table/column missing in the database". */
export function isDriftError(e: unknown): boolean {
  const code = (e as any)?.code
  return code === "P2021" || code === "P2022"
}

// ---------------------------------------------------------------------------
// Column discovery (memoized)
// ---------------------------------------------------------------------------
const columnCache = new Map<string, Set<string>>()

export async function getTableColumns(table: string): Promise<Set<string>> {
  const cached = columnCache.get(table)
  if (cached) return cached
  let cols = new Set<string>()
  try {
    const rows = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = ${table} AND table_schema = 'public'`
    cols = new Set(rows.map((r) => r.column_name))
  } catch {
    // Discovery failed - return empty set; callers decide the fallback.
  }
  if (process.env.DB_SAFE_DEBUG === "1") {
    console.error(`[db-safe] getTableColumns(${table}) -> [${[...cols].join(",")}]`)
  }
  columnCache.set(table, cols)
  return cols
}

export function invalidateColumnCache(table: string): void {
  columnCache.delete(table)
}

/**
 * Keep only the entries of `data` whose columns actually exist in `table`.
 * Non-negotiable fields (id/slug/title) are the caller's responsibility - 
 * if those columns are missing the schema is unusable and the write SHOULD
 * fail loudly.
 */
export async function filterToColumns<T extends Record<string, unknown>>(
  table: string,
  data: T
): Promise<Partial<T>> {
  const cols = await getTableColumns(table)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (cols.has(k)) out[k] = v
  }
  return out as Partial<T>
}

// ---------------------------------------------------------------------------
// Self-healing DDL
// ---------------------------------------------------------------------------

type TableSpec = {
  /** Full CREATE TABLE IF NOT EXISTS statement (Prisma PG conventions). */
  create: string
  /** CREATE INDEX IF NOT EXISTS statements. */
  indexes?: string[]
  /** Best-effort ALTER TABLE ... ADD CONSTRAINT statements (errors ignored). */
  constraints?: string[]
  /** ADD COLUMN IF NOT EXISTS insurance for tables that may already exist. */
  addColumns?: string[]
}

const TABLE_SPECS: Record<string, TableSpec> = {
  Course: {
    // The production DB predates the course-extras migration: the five
    // required-with-default columns (whatYouWillLearn, prerequisites,
    // whoShouldAttend, toolsCovered, careerOutcomes) are missing. Prisma
    // ALWAYS includes required-with-default fields in INSERTs (resolved
    // client-side), so ANY course.create fails with P2022 until these
    // columns exist - filtering the write data can NOT fix it. This spec
    // syncs the table to the current Prisma schema, one idempotent
    // ADD COLUMN IF NOT EXISTS at a time (fast defaults, PG11+).
    create: `CREATE TABLE IF NOT EXISTS "Course" (
      "id" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "shortName" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "longDescription" TEXT NOT NULL DEFAULT '',
      "category" TEXT NOT NULL DEFAULT 'Certification',
      "vertical" TEXT NOT NULL DEFAULT 'cyber',
      "level" TEXT NOT NULL DEFAULT 'Beginner',
      "durationHours" INTEGER NOT NULL DEFAULT 40,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
      "studentsCount" INTEGER NOT NULL DEFAULT 0,
      "thumbnail" TEXT,
      "color" TEXT NOT NULL DEFAULT 'emerald',
      "tags" TEXT NOT NULL DEFAULT '',
      "certBody" TEXT,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "prerequisiteIds" TEXT NOT NULL DEFAULT '',
      "whatYouWillLearn" TEXT NOT NULL DEFAULT '[]',
      "prerequisites" TEXT NOT NULL DEFAULT '[]',
      "whoShouldAttend" TEXT NOT NULL DEFAULT '[]',
      "toolsCovered" TEXT NOT NULL DEFAULT '[]',
      "careerOutcomes" TEXT NOT NULL DEFAULT '[]',
      "certificateTemplateId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "instructorId" TEXT NOT NULL,
      CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "Course_slug_key" ON "Course"("slug")`,
      `CREATE INDEX IF NOT EXISTS "Course_instructorId_idx" ON "Course"("instructorId")`,
    ],
    constraints: [
      `ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "title" TEXT`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "shortName" TEXT`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "longDescription" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Certification'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'cyber'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "level" TEXT NOT NULL DEFAULT 'Beginner'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "durationHours" INTEGER NOT NULL DEFAULT 40`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "studentsCount" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "thumbnail" TEXT`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT 'emerald'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "tags" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "certBody" TEXT`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "prerequisiteIds" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "whatYouWillLearn" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "prerequisites" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "whoShouldAttend" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "toolsCovered" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "careerOutcomes" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "certificateTemplateId" TEXT`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "instructorId" TEXT`,
    ],
  },
  AuthoredCourse: {
    create: `CREATE TABLE IF NOT EXISTS "AuthoredCourse" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "config" TEXT NOT NULL DEFAULT '{}',
      "version" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuthoredCourse_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [`CREATE INDEX IF NOT EXISTS "AuthoredCourse_authorId_idx" ON "AuthoredCourse"("authorId")`],
    constraints: [
      `ALTER TABLE "AuthoredCourse" ADD CONSTRAINT "AuthoredCourse_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "title" TEXT`,
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "authorId" TEXT`,
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft'`,
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "config" TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "AuthoredCourse" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  Module: {
    create: `CREATE TABLE IF NOT EXISTS "Module" (
      "id" TEXT NOT NULL,
      "courseId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [`CREATE INDEX IF NOT EXISTS "Module_courseId_idx" ON "Module"("courseId")`],
    constraints: [
      `ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS "courseId" TEXT`,
      `ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS "title" TEXT`,
      `ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS "description" TEXT`,
      `ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`,
    ],
  },
  Lesson: {
    create: `CREATE TABLE IF NOT EXISTS "Lesson" (
      "id" TEXT NOT NULL,
      "moduleId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'reading',
      "content" TEXT NOT NULL DEFAULT '',
      "pdfUrl" TEXT,
      "pdfPages" INTEGER NOT NULL DEFAULT 0,
      "durationMin" INTEGER NOT NULL DEFAULT 15,
      "order" INTEGER NOT NULL DEFAULT 0,
      "preview" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [`CREATE INDEX IF NOT EXISTS "Lesson_moduleId_idx" ON "Lesson"("moduleId")`],
    constraints: [
      `ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "moduleId" TEXT`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "title" TEXT`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'reading'`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "pdfPages" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "durationMin" INTEGER NOT NULL DEFAULT 15`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "preview" BOOLEAN NOT NULL DEFAULT false`,
    ],
  },
}

const ensured = new Set<string>()

/**
 * Ensure a studio-critical table exists and has every column the Prisma
 * model expects. Idempotent; runs at most once per table per instance
 * (unless `force` re-runs it after DDL changes).
 */
export async function ensureTable(table: keyof typeof TABLE_SPECS & string, force = false): Promise<void> {
  if (!force && ensured.has(table)) return
  const spec = TABLE_SPECS[table]
  if (!spec) return
  try {
    await db.$executeRawUnsafe(spec.create)
    for (const stmt of spec.addColumns ?? []) {
      try {
        await db.$executeRawUnsafe(stmt)
      } catch {
        // Column add races/failures are non-fatal - the write fallback
        // (filterToColumns) covers whatever is still missing.
      }
    }
    for (const stmt of spec.indexes ?? []) {
      try {
        await db.$executeRawUnsafe(stmt)
      } catch {}
    }
    for (const stmt of spec.constraints ?? []) {
      try {
        await db.$executeRawUnsafe(stmt)
      } catch {
        // Duplicate constraint / missing parent table - fine.
      }
    }
    invalidateColumnCache(table)
    ensured.add(table)
  } catch (err) {
    // CREATE TABLE itself failed (permissions, connectivity) - do not memoize
    // so a later request can retry; the caller's write fallback still applies.
    console.error(`[db-safe] ensureTable(${table}) failed:`, err)
  }
}

/**
 * Run `op`; if it fails with a drift error (missing table/column), run
 * ensureTable() and retry once. Returns `[result, error]` - exactly one is
 * non-null, so callers keep full control of their response shape.
 */
export async function withDriftRetry<T>(
  table: string,
  op: () => Promise<T>
): Promise<[T | null, unknown | null]> {
  try {
    return [await op(), null]
  } catch (e) {
    if (!isDriftError(e) || !TABLE_SPECS[table]) return [null, e]
    await ensureTable(table, true)
    try {
      return [await op(), null]
    } catch (e2) {
      return [null, e2]
    }
  }
}
