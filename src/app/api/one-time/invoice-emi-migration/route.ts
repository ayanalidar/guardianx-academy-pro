import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/**
 * ONE-TIME migration route (Invoice table + EMI columns) - follow-up commit
 * removes it.
 *
 * The project uses the `prisma db push` workflow (no migrations dir) and the
 * Vercel build only runs `prisma generate`, so schema changes must be applied
 * to the production database out-of-band. Prod DB is not reachable from the
 * sandbox, hence this bearer-token-guarded route.
 *
 * DIAGNOSTIC FINDING: the prod database was missing the ENTIRE "Invoice"
 * table (Postgres 42P01) - the Invoice persistence feature shipped with code
 * that assumed a table that had never been pushed. This is the root cause of
 * "PDF invoice not saved in admin": POST /api/invoices 500s in prod.
 *
 * This route: (1) reports server identity + table inventory, (2) creates the
 * full Invoice table with EMI columns and indexes, idempotently.
 *
 * POST /api/one-time/invoice-emi-migration
 * Authorization: Bearer <token>
 */
const EXPECTED_TOKEN =
  "8857180176411ac98c3d4ddfd53c20d7fcff2ddd67184cff"

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientOrg" TEXT,
  "clientEmail" TEXT,
  "clientPhone" TEXT,
  "clientAddress" TEXT,
  "items" TEXT NOT NULL DEFAULT '[]',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gstSplit" BOOLEAN NOT NULL DEFAULT false,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "roundingAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "issueDate" TEXT NOT NULL DEFAULT '',
  "dueDate" TEXT,
  "notes" TEXT,
  "terms" TEXT,
  "bankName" TEXT,
  "accountName" TEXT,
  "accountNumber" TEXT,
  "ifscCode" TEXT,
  "upiId" TEXT,
  "emiEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emiSplit" INTEGER NOT NULL DEFAULT 50,
  "emiDue1" TEXT,
  "emiDue2" TEXT,
  "emiPaidCount" INTEGER NOT NULL DEFAULT 0,
  "emiPlan" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
)`

const INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice"("number")`,
  `CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status")`,
  `CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt")`,
]

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = req.headers.get("authorization") || ""
  if (auth !== `Bearer ${EXPECTED_TOKEN}`) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const steps: Array<{ step: string; ok: boolean; error?: string }> = []
  const run = async (step: string, sql: string) => {
    try {
      await db.$executeRawUnsafe(sql)
      steps.push({ step, ok: true })
    } catch (e: any) {
      steps.push({ step, ok: false, error: e?.message ?? String(e) })
    }
  }

  // ---- diagnostics: which server / database are we on? --------------------
  let serverInfo: unknown = null
  try {
    serverInfo = await db.$queryRawUnsafe(
      `SELECT current_database() AS database, current_user AS "currentUser", version() AS version, inet_server_addr()::text AS server_addr`,
    )
  } catch (e: any) {
    serverInfo = { error: e?.message ?? String(e) }
  }

  // ---- diagnostics: table inventory (all non-system schemas) --------------
  let tables: unknown = null
  try {
    tables = await db.$queryRawUnsafe(
      `SELECT table_schema, table_name FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name LIMIT 300`,
    )
  } catch (e: any) {
    tables = { error: e?.message ?? String(e) }
  }

  // ---- create the missing Invoice table + EMI columns + indexes -----------
  await run("CREATE TABLE Invoice", CREATE_TABLE)
  await run("ALTER emiEnabled", `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiEnabled" BOOLEAN NOT NULL DEFAULT false`)
  await run("ALTER emiSplit", `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiSplit" INTEGER NOT NULL DEFAULT 50`)
  await run("ALTER emiDue1", `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiDue1" TEXT`)
  await run("ALTER emiDue2", `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiDue2" TEXT`)
  await run("ALTER emiPaidCount", `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiPaidCount" INTEGER NOT NULL DEFAULT 0`)
  await run("ALTER emiPlan", `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiPlan" TEXT`)
  for (let i = 0; i < INDEXES.length; i++) {
    await run(`INDEX ${i + 1}`, INDEXES[i])
  }

  // ---- verification --------------------------------------------------------
  let emiColumns: unknown = null
  try {
    emiColumns = await db.$queryRawUnsafe(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'Invoice' ORDER BY ordinal_position`,
    )
  } catch (e: any) {
    emiColumns = { error: e?.message ?? String(e) }
  }

  return NextResponse.json({
    ok: steps.every((s) => s.ok),
    serverInfo,
    tables,
    steps,
    invoiceColumns: emiColumns,
  })
})
