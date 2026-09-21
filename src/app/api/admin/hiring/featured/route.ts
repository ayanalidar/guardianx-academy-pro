import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* ============================================================
 * Featured job openings - admin-pinned roles shown in the
 * "Featured openings" strip on the public /hiring page.
 *
 * Zero-migration storage: the featured job id list lives in
 * SiteContent (page "hiring", section "featured", key "ids")
 * as a JSON array. The public jobs API reads the same row.
 *
 * GET  /api/admin/hiring/featured -> { ids: string[] }
 * PUT  /api/admin/hiring/featured { ids: string[] } (max 12)
 * ============================================================ */

const CONTENT_KEY = { page: "hiring", section: "featured", key: "ids" } as const

async function readFeaturedIds(): Promise<string[]> {
  const row = await db.siteContent.findUnique({
    where: { page_section_key: { ...CONTENT_KEY } },
  })
  const v = row?.value
  return Array.isArray(v) ? v.map(String) : []
}

export const GET = withErrorHandler(async () => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser
  const ids = await readFeaturedIds()
  return NextResponse.json({ ids })
})

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.ids)) {
    return NextResponse.json({ error: "ids must be an array" }, { status: 400 })
  }
  // Sanitize: strings only, deduped, capped at 12 featured roles.
  const ids: string[] = Array.from(
    new Set(
      (body.ids as unknown[])
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    )
  ).slice(0, 12)

  await db.siteContent.upsert({
    where: { page_section_key: { ...CONTENT_KEY } },
    create: { ...CONTENT_KEY, value: ids, updatedBy: currentUser.id ?? "admin" },
    update: { value: ids, updatedBy: currentUser.id ?? "admin" },
  })

  await logAction(currentUser.id ?? null, currentUser.email ?? currentUser.name ?? "admin", "hiring.featured.update", "site-content", "hiring:featured", { count: ids.length })

  return NextResponse.json({ ids })
})
