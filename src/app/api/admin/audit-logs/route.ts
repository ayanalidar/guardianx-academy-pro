import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/audit-logs — ADMIN only.
 * Query params:
 *   page      — 1-based page (default 1)
 *   pageSize  — items per page (default 25, max 100)
 *   action    — dotted action prefix filter (e.g. "course", "user.delete")
 *   userId    — exact userId filter
 *   resource  — exact resource filter (e.g. "Course")
 *
 * Returns: { logs, total, page, pageSize, totalPages }
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10) || 25))
  const action = url.searchParams.get("action")?.trim() || undefined
  const userId = url.searchParams.get("userId")?.trim() || undefined
  const resource = url.searchParams.get("resource")?.trim() || undefined
  // Server-side free-text search — previously the search box only filtered
  // the current page client-side, hiding matches on other pages.
  const q = url.searchParams.get("q")?.trim() || undefined

  const where: {
    action?: { contains: string }
    OR?: Array<{ action?: { contains: string } } | { resource?: { contains: string } } | { userName?: { contains: string } }>
    userId?: string
    resource?: string
  } = {}
  if (action) where.action = { contains: action }
  if (userId) where.userId = userId
  if (resource) where.resource = resource
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { resource: { contains: q } },
      { userName: { contains: q } },
    ]
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})
