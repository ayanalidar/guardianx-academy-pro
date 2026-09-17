import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/corporate-training/leads
 * ADMIN-only. Returns all corporate training leads with filters.
 *
 * Query params: status, teamSize, q (search across company + contact + email + phone)
 */
export const GET = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const status = url.searchParams.get("status") || undefined
  const teamSize = url.searchParams.get("teamSize") || undefined
  const q = url.searchParams.get("q") || undefined

  const where: any = {}
  if (status && ["NEW", "CONTACTED", "CONVERTED", "LOST"].includes(status)) {
    where.status = status
  }
  if (teamSize && ["1-10", "11-50", "51-200", "200+"].includes(teamSize)) {
    where.teamSize = teamSize
  }
  if (q && q.trim().length > 0) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { workEmail: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ]
  }

  const [leads, byStatus] = await Promise.all([
    db.corporateLead.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.corporateLead.groupBy({ by: ["status"], _count: true }),
  ])

  const statusCounts: Record<string, number> = {
    NEW: 0, CONTACTED: 0, CONVERTED: 0, LOST: 0,
  }
  for (const s of byStatus) statusCounts[s.status] = s._count

  return NextResponse.json({ leads, count: leads.length, byStatus: statusCounts })
})
