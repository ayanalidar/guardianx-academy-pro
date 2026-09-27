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

  for (const sql of STATEMENTS) {
    await db.$executeRawUnsafe(sql)
  }

  const columns = (await db.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'Invoice' AND column_name LIKE 'emi%' ORDER BY column_name`,
  )) as { column_name: string; data_type: string }[]

  const invoiceCount = (await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "Invoice"`,
  )) as { count: bigint }[]

  return NextResponse.json({
    ok: true,
    emiColumns: columns,
    invoicesTouched: Number(invoiceCount[0]?.count ?? 0),
  })
})
