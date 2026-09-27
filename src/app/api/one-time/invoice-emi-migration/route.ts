import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/**
 * ONE-TIME migration route (Invoice EMI columns) - follow-up commit removes it.
 *
 * The project uses the `prisma db push` workflow (no migrations dir) and the
 * Vercel build only runs `prisma generate`, so schema changes must be applied
 * to the production database out-of-band. Prod DB is not reachable from the
 * sandbox, hence this bearer-token-guarded route.
 *
 * POST /api/one-time/invoice-emi-migration
 * Authorization: Bearer <token>
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS - safe to invoke repeatedly.
 */
const EXPECTED_TOKEN =
  "8857180176411ac98c3d4ddfd53c20d7fcff2ddd67184cff"

const STATEMENTS = [
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiSplit" INTEGER NOT NULL DEFAULT 50`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiDue1" TEXT`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiDue2" TEXT`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiPaidCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emiPlan" TEXT`,
]

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = req.headers.get("authorization") || ""
  if (auth !== `Bearer ${EXPECTED_TOKEN}`) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const results: Array<{ sql: string; ok: boolean; error?: string }> = []
  for (const sql of STATEMENTS) {
    try {
      await db.$executeRawUnsafe(sql)
      results.push({ sql, ok: true })
    } catch (e: any) {
      results.push({ sql, ok: false, error: e?.message ?? String(e) })
    }
  }

  let emiColumns: Array<{ column_name: string; data_type: string }> = []
  let columnError: string | undefined
  try {
    emiColumns = (await db.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'Invoice' AND column_name LIKE 'emi%' ORDER BY column_name`,
    )) as { column_name: string; data_type: string }[]
  } catch (e: any) {
    columnError = e?.message ?? String(e)
  }

  let invoiceCount = -1
  let countError: string | undefined
  try {
    const rows = (await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "Invoice"`,
    )) as { count: bigint }[]
    invoiceCount = Number(rows[0]?.count ?? 0)
  } catch (e: any) {
    countError = e?.message ?? String(e)
  }

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    results,
    emiColumns,
    columnError,
    invoiceCount,
    countError,
  })
})
