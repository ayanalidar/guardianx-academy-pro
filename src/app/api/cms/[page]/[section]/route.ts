import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// GET /api/cms/[page]/[section] — public.
// Returns { page, section, keys: { [key]: value } }
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ page: string; section: string }> }
) {
  const { page, section } = await params

  const items = await db.siteContent.findMany({
    where: { page, section },
    orderBy: [{ key: "asc" }],
  })

  const keys: Record<string, any> = {}
  let updatedAt: Date | null = null
  for (const it of items) {
    keys[it.key] = it.value
    if (!updatedAt || it.updatedAt > updatedAt) updatedAt = it.updatedAt
  }

  return NextResponse.json({
    page,
    section,
    keys,
    updatedAt: updatedAt?.toISOString() ?? null,
  })
}

// PATCH /api/cms/[page]/[section] — admin only. Single-item update.
// Body: { key, value }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ page: string; section: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { page, section } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { key, value } = body
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 })
  }

  const item = await db.siteContent.upsert({
    where: { page_section_key: { page, section, key } },
    create: { page, section, key, value, updatedBy: user.id },
    update: { value, updatedBy: user.id },
  })

  return NextResponse.json({ item })
}

// DELETE /api/cms/[page]/[section] — admin only.
// Body: { key } — required, which key to delete.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ page: string; section: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { page, section } = await params

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // allow empty body
  }

  const key = body?.key
  if (!key) {
    return NextResponse.json({ error: "key is required in body" }, { status: 400 })
  }

  await db.siteContent.deleteMany({
    where: { page, section, key },
  })

  return NextResponse.json({ deleted: true, page, section, key })
}
