import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureLiveFeedTable, seedLiveFeedEntriesIfEmpty } from "@/lib/live-feed-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * Live Feed admin API - manages the curated entries shown in the
 * homepage "Live Feed / RECENT ENROLLMENTS" widget.
 *
 * GET  /api/admin/live-feed → ALL entries (active + inactive) + counts
 * POST /api/admin/live-feed → create an entry (ADMIN only)
 *
 * Curated entries lead the public widget; real enrollments fill the
 * remaining slots. Every mutation is audit-logged.
 * ============================================================ */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureLiveFeedTable()
  await seedLiveFeedEntriesIfEmpty()

  const [entries, byActive] = await Promise.all([
    db.liveFeedEntry.findMany({
      orderBy: [{ order: "asc" }, { occurredAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.liveFeedEntry.groupBy({ by: ["active"], _count: true }),
  ])

  const activeCounts: Record<string, number> = { active: 0, inactive: 0 }
  for (const s of byActive) activeCounts[s.active ? "active" : "inactive"] = s._count

  return NextResponse.json({
    entries,
    count: entries.length,
    byActive: activeCounts,
    samples: entries.filter((e) => e.isSample).length,
  })
})

const ALLOWED_COLORS = new Set(["emerald", "violet", "cyan", "amber", "rose"])

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

function parseOccurredAt(v: unknown): Date {
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function normalizeLiveFeedBody(body: any) {
  return {
    displayName: String(body.displayName || "").trim(),
    city: strOrNull(body.city),
    courseTitle: String(body.courseTitle || "").trim(),
    courseShortName: strOrNull(body.courseShortName),
    color: ALLOWED_COLORS.has(String(body.color || "")) ? String(body.color) : "emerald",
    occurredAt: parseOccurredAt(body.occurredAt),
    active: body.active === undefined ? true : !!body.active,
    isSample: !!body.isSample,
    order: Number.isFinite(parseInt(String(body.order ?? ""), 10))
      ? parseInt(String(body.order ?? ""), 10)
      : 0,
  }
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data = normalizeLiveFeedBody(body)
  if (!data.displayName || !data.courseTitle) {
    return NextResponse.json(
      { error: "displayName and courseTitle are required" },
      { status: 400 },
    )
  }

  const created = await db.liveFeedEntry.create({ data })

  await logAction(
    user.id ?? null,
    user.email ?? user.name ?? "admin",
    "live-feed.create",
    "live-feed-entry",
    created.id,
    { displayName: data.displayName },
  )

  return NextResponse.json({ entry: created }, { status: 201 })
})
