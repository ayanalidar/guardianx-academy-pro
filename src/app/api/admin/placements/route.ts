import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensurePlacementTable, seedSamplePlacementsIfEmpty } from "@/lib/placements-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * Placements admin API - manages the outcome records shown on
 * the public /placements wall (Hiring → Placements).
 *
 * GET  /api/admin/placements → ALL records (draft+published) + stats
 * POST /api/admin/placements → create a record (ADMIN only)
 *
 * status: "published" (live on /placements) | "draft" (hidden)
 * isSample rows carry a visible "Sample" chip on the public wall.
 * Every mutation is audit-logged.
 * ============================================================ */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensurePlacementTable()
  await seedSamplePlacementsIfEmpty()

  const [placements, byStatus] = await Promise.all([
    db.placement.findMany({
      orderBy: [{ featured: "desc" }, { order: "asc" }, { year: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
    db.placement.groupBy({ by: ["status"], _count: true }),
  ])

  const statusCounts: Record<string, number> = { published: 0, draft: 0 }
  for (const s of byStatus) statusCounts[s.status] = s._count

  return NextResponse.json({
    placements,
    count: placements.length,
    byStatus: statusCounts,
    samples: placements.filter((p) => p.isSample).length,
  })
})

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const studentName = String(body.studentName || "").trim()
  const role = String(body.role || "").trim()
  const company = String(body.company || "").trim()
  const year = parseInt(String(body.year || ""), 10)
  if (!studentName || !role || !company) {
    return NextResponse.json(
      { error: "studentName, role and company are required" },
      { status: 400 },
    )
  }
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "year must be a valid 4-digit year" }, { status: 400 })
  }

  const created = await db.placement.create({
    data: {
      studentName,
      role,
      company,
      photoUrl: strOrNull(body.photoUrl),
      companyLogo: strOrNull(body.companyLogo),
      ctc: strOrNull(body.ctc),
      track: String(body.track || "").trim() || "General",
      year,
      quote: strOrNull(body.quote),
      story: strOrNull(body.story),
      linkedIn: strOrNull(body.linkedIn),
      featured: !!body.featured,
      status: body.status === "draft" ? "draft" : "published",
      verified: !!body.verified,
      isSample: !!body.isSample,
      order: Number.isFinite(parseInt(String(body.order ?? ""), 10))
        ? parseInt(String(body.order ?? ""), 10)
        : 0,
    },
  })

  await logAction(
    user.id ?? null,
    user.email ?? user.name ?? "admin",
    "placements.create",
    "placement",
    created.id,
    { studentName },
  )

  return NextResponse.json({ placement: created }, { status: 201 })
})
