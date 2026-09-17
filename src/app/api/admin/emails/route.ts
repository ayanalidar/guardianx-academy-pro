import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const url = new URL(req.url)
  const type = url.searchParams.get("type") || undefined
  const status = url.searchParams.get("status") || undefined
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10)))

  const where: { type?: string; status?: string } = {}
  if (type) where.type = type
  if (status) where.status = status

  const [total, logs] = await Promise.all([
    db.emailLog.count({ where }),
    db.emailLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    logs,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  })
}
