import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/open-schooling/leads
 * ADMIN-only. Returns all open-schooling leads with optional filters.
 *
 * Query params:
 *   status  — NEW | CONTACTED | ENROLLED | LOST (optional)
 *   course  — 10th | 12th (optional)
 *   q       — search across name, email, phone (optional)
 *
 * Returns: {
 *   leads: [{ id, name, email, phone, course, dateOfBirth, city, state,
 *            qualification, message, status, adminNotes, source,
 *            createdAt, updatedAt }],
 *   count, byStatus
 * }
 */
export const GET = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const status = url.searchParams.get("status") || undefined
  const course = url.searchParams.get("course") || undefined
  const q = url.searchParams.get("q") || undefined

  const where: any = {}
  if (status && ["NEW", "CONTACTED", "ENROLLED", "LOST"].includes(status)) {
    where.status = status
  }
  if (course && (course === "10th" || course === "12th")) {
    where.course = course
  }
  if (q && q.trim().length > 0) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ]
  }

  const [leads, byStatus] = await Promise.all([
    db.openSchoolingLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    db.openSchoolingLead.groupBy({
      by: ["status"],
      _count: true,
    }),
  ])

  const statusCounts: Record<string, number> = {
    NEW: 0,
    CONTACTED: 0,
    ENROLLED: 0,
    LOST: 0,
  }
  for (const s of byStatus) statusCounts[s.status] = s._count

  return NextResponse.json({
    leads,
    count: leads.length,
    byStatus: statusCounts,
  })
})
