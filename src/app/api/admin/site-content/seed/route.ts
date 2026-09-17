import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/**
 * POST /api/admin/site-content/seed — re-seed default CMS content for
 * one or all pages from the in-repo seed module. Lets admins fix an
 * empty Content Studio from the UI without shell access.
 *
 * Body:
 *   { page?: "home" | "impact" | "contact" | "institutions" | "catalog" | "auth" | "global" }
 *   - If page is omitted or "*", all pages are (re)seeded.
 *   - Existing rows are upserted (their values are overwritten with the
 *     seed defaults). Rows whose page+section+key does NOT appear in the
 *     seed are left untouched (so admin-edited custom keys are preserved).
 *
 * Returns: { page, seeded: number }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // empty body is OK — defaults to "all pages"
  }

  const pageFilter = typeof body?.page === "string" && body.page !== "*"
    ? body.page
    : null

  // Import the seed content from the shared lib module so we don't
  // import the self-executing seed-cms.ts (which spins up its own
  // PrismaClient and would write through it, bypassing the request's
  // auth/audit context).
  const { SEED_CMS } = await import("@/lib/cms-seed")

  const items = pageFilter
    ? SEED_CMS.filter((it) => it.page === pageFilter)
    : SEED_CMS

  if (items.length === 0) {
    return NextResponse.json(
      { error: `Unknown page: ${pageFilter}` },
      { status: 400 }
    )
  }

  let seeded = 0
  for (const it of items) {
    await db.siteContent.upsert({
      where: {
        page_section_key: { page: it.page, section: it.section, key: it.key },
      },
      create: {
        page: it.page,
        section: it.section,
        key: it.key,
        value: it.value,
        updatedBy: user.id,
      },
      update: {
        value: it.value,
        updatedBy: user.id,
      },
    })
    seeded++
  }

  return NextResponse.json({ page: pageFilter ?? "*", seeded })
})
