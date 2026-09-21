import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// GET /api/admin/certifications - list all certifications (admin only)
export async function GET() {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const certs = await db.certification.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ certifications: certs })
}

// POST /api/admin/certifications - create a new certification
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json()
  const { short, full, body: certBody, level, category, color, duration, desc, popular, order } = body

  if (!short?.trim()) return NextResponse.json({ error: "Short code required" }, { status: 400 })
  if (!full?.trim()) return NextResponse.json({ error: "Full name required" }, { status: 400 })

  // Determine next order if not provided
  let orderVal = typeof order === "number" ? order : 0
  if (typeof order !== "number") {
    const max = await db.certification.aggregate({ _max: { order: true } })
    orderVal = (max._max.order ?? -1) + 1
  }

  const cert = await db.certification.create({
    data: {
      short: short.trim(),
      full: full.trim(),
      body: certBody?.trim() || "",
      level: level || "Beginner",
      category: category || "General",
      color: color || "emerald",
      duration: duration || "30h",
      desc: desc?.trim() || "",
      popular: !!popular,
      order: orderVal,
    },
  })

  return NextResponse.json({ certification: cert })
}
