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
  // Security telemetry (src/lib/security-log.ts). No FKs - the log must be
  // writable even when referenced identities no longer exist.
  SecurityEvent: {
    create: `CREATE TABLE IF NOT EXISTS "SecurityEvent" (
      "id" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "severity" TEXT NOT NULL DEFAULT 'info',
      "ip" TEXT,
      "country" TEXT,
      "city" TEXT,
      "userAgent" TEXT,
      "email" TEXT,
      "path" TEXT,
      "details" TEXT NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "SecurityEvent_ip_createdAt_idx" ON "SecurityEvent"("ip", "createdAt")`,
    ],
  },
  TrainingBatch: {
    // The production table predates the courseId migration (Batch Calendar
    // course-link feature): the nullable "courseId" column is missing. Unlike
    // required-with-default columns, a missing nullable column only breaks
    // queries that SELECT or filter on it - but the admin training-batches
    // routes use findUnique (full row) and the course-page batches route
    // filters on courseId, so EVERY query on this model fails with P2022
    // until the column exists. This spec adds it idempotently; ensureTable
    // is invoked from the routes that touch the new column (lazy self-heal)
    // and from the watchdog/health schema-sync loop.
    create: `CREATE TABLE IF NOT EXISTS "TrainingBatch" (
      "id" TEXT NOT NULL,
      "certification" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL DEFAULT '',
      "schedule" TEXT NOT NULL DEFAULT '',
      "startDate" TEXT NOT NULL DEFAULT '',
      "startIsoDate" TEXT,
      "mode" TEXT NOT NULL DEFAULT 'Live Online',
      "instructor" TEXT NOT NULL DEFAULT '',
      "instructorId" TEXT,
      "seats" INTEGER NOT NULL DEFAULT 20,
      "enrolled" INTEGER NOT NULL DEFAULT 0,
      "level" TEXT NOT NULL DEFAULT 'Beginner',
      "status" TEXT NOT NULL DEFAULT 'Open',
      "certColor" TEXT NOT NULL DEFAULT 'text-emerald-300',
      "certTint" TEXT NOT NULL DEFAULT 'bg-emerald-500/15',
      "certBorder" TEXT NOT NULL DEFAULT 'border-emerald-500/30',
      "levelColor" TEXT NOT NULL DEFAULT 'text-emerald-300',
      "levelTint" TEXT NOT NULL DEFAULT 'bg-emerald-500/10',
      "levelBorder" TEXT NOT NULL DEFAULT 'border-emerald-500/30',
      "borderColor" TEXT NOT NULL DEFAULT 'border-border/60',
      "btnClass" TEXT NOT NULL DEFAULT 'bg-emerald-600 hover:bg-emerald-500',
      "description" TEXT NOT NULL DEFAULT '',
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "googleFormUrl" TEXT,
      "courseId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingBatch_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "TrainingBatch_courseId_idx" ON "TrainingBatch"("courseId")`,
    ],
    constraints: [
      `ALTER TABLE "TrainingBatch" ADD CONSTRAINT "TrainingBatch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "TrainingBatch" ADD COLUMN IF NOT EXISTS "courseId" TEXT`,
    ],
  },
  // Lead CRM trio: the contact form, CRM webhook and the admin Lead CRM all
  // write/read Lead + LeadNote + LeadStatusHistory. LeadStatusHistory was
  // introduced late (f34e16b) - prod may predate it, and a missing table
  // there made EVERY contact-form lead creation throw (silently swallowed
  // by a .catch(() => null)), so enquiries never reached the CRM. These
  // specs let the first touch self-heal instead of losing the lead.
  Lead: {
    create: `CREATE TABLE IF NOT EXISTS "Lead" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "organization" TEXT,
      "type" TEXT NOT NULL DEFAULT 'Individual',
      "status" TEXT NOT NULL DEFAULT 'New',
      "source" TEXT NOT NULL DEFAULT 'Contact Form',
      "score" INTEGER NOT NULL DEFAULT 0,
      "followUpDate" TIMESTAMP(3),
      "assignedTo" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status")`,
      `CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email")`,
    ],
    addColumns: [
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "name" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "email" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "organization" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'Individual'`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'New'`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'Contact Form'`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpDate" TIMESTAMP(3)`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  LeadNote: {
    create: `CREATE TABLE IF NOT EXISTS "LeadNote" (
      "id" TEXT NOT NULL,
      "leadId" TEXT NOT NULL,
      "authorId" TEXT,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "LeadNote_leadId_idx" ON "LeadNote"("leadId")`,
    ],
    constraints: [
      `ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "LeadNote" ADD COLUMN IF NOT EXISTS "leadId" TEXT`,
      `ALTER TABLE "LeadNote" ADD COLUMN IF NOT EXISTS "authorId" TEXT`,
      `ALTER TABLE "LeadNote" ADD COLUMN IF NOT EXISTS "content" TEXT`,
      `ALTER TABLE "LeadNote" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  LeadStatusHistory: {
    create: `CREATE TABLE IF NOT EXISTS "LeadStatusHistory" (
      "id" TEXT NOT NULL,
      "leadId" TEXT NOT NULL,
      "fromStatus" TEXT,
      "toStatus" TEXT NOT NULL,
      "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "LeadStatusHistory_leadId_idx" ON "LeadStatusHistory"("leadId")`,
    ],
    constraints: [
      `ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "LeadStatusHistory" ADD COLUMN IF NOT EXISTS "leadId" TEXT`,
      `ALTER TABLE "LeadStatusHistory" ADD COLUMN IF NOT EXISTS "fromStatus" TEXT`,
      `ALTER TABLE "LeadStatusHistory" ADD COLUMN IF NOT EXISTS "toStatus" TEXT`,
      `ALTER TABLE "LeadStatusHistory" ADD COLUMN IF NOT EXISTS "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  // Tutors admin tab: pastExperience arrived with the Tutors admin feature.
  // Old prod tables lack the column - self-heal it before the first profile
  // write so tutor edits never fail on drifted databases.
  InstructorProfile: {
    create: `CREATE TABLE IF NOT EXISTS "InstructorProfile" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "phone" TEXT,
      "expertise" TEXT NOT NULL DEFAULT '[]',
      "yearsExperience" INTEGER NOT NULL DEFAULT 0,
      "certifications" TEXT NOT NULL DEFAULT '[]',
      "pastExperience" TEXT NOT NULL DEFAULT '[]',
      "linkedinUrl" TEXT,
      "maxBatches" INTEGER NOT NULL DEFAULT 3,
      "currentBatches" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InstructorProfile_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "InstructorProfile_userId_key" ON "InstructorProfile"("userId")`,
    ],
    constraints: [
      `ALTER TABLE "InstructorProfile" ADD CONSTRAINT "InstructorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    addColumns: [
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "expertise" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "yearsExperience" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "certifications" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "pastExperience" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "maxBatches" INTEGER NOT NULL DEFAULT 3`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "currentBatches" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "InstructorProfile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },

  // Uploaded media (partner logos, signed MoU PDFs). Served back by
  // GET /api/media/<id>. Self-heal matters here: the first Content Studio
  // upload on a drifted prod DB bootstraps its own storage instead of 500ing.
  MediaAsset: {
    create: `CREATE TABLE IF NOT EXISTS "MediaAsset" (
      "id" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "mime" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "data" BYTEA NOT NULL,
      "uploadedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt")`,
    ],
    constraints: [],
    addColumns: [
      `ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "filename" TEXT`,
      `ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "mime" TEXT`,
      `ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "size" INTEGER`,
      `ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "data" BYTEA`,
      `ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT`,
      `ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },

  // Footer visitor counter (anonymous per-day visitor rows).
  SiteVisit: {
    create: `CREATE TABLE IF NOT EXISTS "SiteVisit" (
      "id" TEXT NOT NULL,
      "visitorId" TEXT NOT NULL,
      "day" TEXT NOT NULL,
      "views" INTEGER NOT NULL DEFAULT 1,
      "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "SiteVisit_visitorId_day_key" ON "SiteVisit"("visitorId", "day")`,
      `CREATE INDEX IF NOT EXISTS "SiteVisit_day_idx" ON "SiteVisit"("day")`,
      `CREATE INDEX IF NOT EXISTS "SiteVisit_lastSeen_idx" ON "SiteVisit"("lastSeen")`,
    ],
    constraints: [],
    addColumns: [
      `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "visitorId" TEXT`,
      `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "day" TEXT`,
      `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  // Singleton row (id='global') holding the visitor-counter baseline offset.
  // Lets the footer counter start at an owner-chosen number (e.g. 14326)
  // while every subsequent real unique visitor adds exactly +1 on top -
  // without touching the real per-day SiteVisit rows.
  SiteVisitMeta: {
    create: `CREATE TABLE IF NOT EXISTS "SiteVisitMeta" (
      "id" TEXT NOT NULL,
      "baselineOffset" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SiteVisitMeta_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [],
    constraints: [],
    addColumns: [
      `ALTER TABLE "SiteVisitMeta" ADD COLUMN IF NOT EXISTS "baselineOffset" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "SiteVisitMeta" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  // Per-batch enrollment leads captured via the per-batch Google Forms
  // webhook (/api/crm/batch-webhook). email is optional - some forms only
  // collect WhatsApp; older deployments may predate the email column.
  BatchLead: {
    create: `CREATE TABLE IF NOT EXISTS "BatchLead" (
      "id" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "whatsappNumber" TEXT NOT NULL,
      "email" TEXT,
      "linkedinProfile" TEXT,
      "professionalStatus" TEXT,
      "jobRole" TEXT,
      "status" TEXT NOT NULL DEFAULT 'New',
      "adminNotes" TEXT,
      "source" TEXT NOT NULL DEFAULT 'Google Form',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BatchLead_pkey" PRIMARY KEY ("id")
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "BatchLead_batchId_idx" ON "BatchLead"("batchId")`,
      `CREATE INDEX IF NOT EXISTS "BatchLead_status_idx" ON "BatchLead"("status")`,
      `CREATE INDEX IF NOT EXISTS "BatchLead_createdAt_idx" ON "BatchLead"("createdAt")`,
    ],
    constraints: [],
    addColumns: [
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "batchId" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "name" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "email" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "linkedinProfile" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "professionalStatus" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "jobRole" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'New'`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'Google Form'`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "BatchLead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
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
