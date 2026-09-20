import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// GET /api/cms — list all content (admin only).
// Optional ?page= filter.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page")

  const items = await db.siteContent.findMany({
    where: page ? { page } : undefined,
    orderBy: [{ page: "asc" }, { section: "asc" }, { key: "asc" }],
  })

  return NextResponse.json({ items, count: items.length })
}

// POST /api/cms — upsert one content item (admin only).
// Body: { page, section, key, value }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { page, section, key, value } = body
  if (!page || !section || !key) {
    return NextResponse.json({ error: "page, section, key are required" }, { status: 400 })
  }
  if (value === undefined) {
    return NextResponse.json({ error: "value is required" }, { status: 400 })
  }

  const item = await db.siteContent.upsert({
    where: { page_section_key: { page, section, key } },
    create: { page, section, key, value, updatedBy: user.id },
    update: { value, updatedBy: user.id },
  })

  return NextResponse.json({ item })
}
