import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { ensureTable, isDriftError } from "@/lib/db-safe"

export const runtime = "nodejs"

/* GET /api/admin/security-events - ADMIN only. Security telemetry feed for
 * the Admin → Audit Log viewer's "Security Events" tab.
 * Query params:
 *   page     - 1-based page (default 1)
 *   pageSize - items per page (default 25, max 100)
 *   type     - exact event type filter (login_failed | session_invalid | ...)
 *   severity - info | warning | critical
 *   ip       - exact IP filter
 *   q        - free-text over email / ip / path / userAgent
 *
 * Returns: { events, total, page, pageSize, totalPages, summary24h: [{type,count}] }
 *
 * Drift-resilient: on first call the SecurityEvent table may not exist yet -
 * it is bootstrapped via db-safe and an empty page is returned.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10) || 25))
  const type = url.searchParams.get("type")?.trim() || undefined
  const severity = url.searchParams.get("severity")?.trim() || undefined
  const ip = url.searchParams.get("ip")?.trim() || undefined
  const q = url.searchParams.get("q")?.trim() || undefined

  const where: {
    type?: string
    severity?: string
    ip?: string
    OR?: Array<{ email?: { contains: string } } | { ip?: { contains: string } } | { path?: { contains: string } } | { userAgent?: { contains: string } }>
  } = {}
  if (type && type !== "all") where.type = type
  if (severity && severity !== "all") where.severity = severity
  if (ip) where.ip = ip
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { ip: { contains: q } },
      { path: { contains: q } },
      { userAgent: { contains: q } },
    ]
  }

  const summary24hWhere = { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }

  try {
    const [total, events, summary] = await Promise.all([
      db.securityEvent.count({ where }),
      db.securityEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.securityEvent.groupBy({ by: ["type"], where: summary24hWhere, _count: true }),
    ])
    return NextResponse.json({
      events,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary24h: summary.map((s) => ({ type: s.type, count: s._count as number })),
    })
  } catch (e) {
    if (!isDriftError(e)) throw e
    // First-touch bootstrap: create the table, return the (empty) page.
    await ensureTable("SecurityEvent", true)
    const [total, events] = await Promise.all([
      db.securityEvent.count({ where }),
      db.securityEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return NextResponse.json({
      events,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary24h: [],
    })
  }
})
