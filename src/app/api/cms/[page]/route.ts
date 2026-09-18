import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

// GET /api/cms/[page] — public. Returns all content for a page.
// Shape: { page, sections: { [section]: { [key]: value } } }
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ page: string }> }) => {
    const { page } = await params

    const items = await db.siteContent.findMany({
      where: { page },
      orderBy: [{ section: "asc" }, { key: "asc" }],
    })

    const sections: Record<string, Record<string, any>> = {}
    let updatedAt: Date | null = null
    for (const it of items) {
      if (!sections[it.section]) sections[it.section] = {}
      sections[it.section][it.key] = it.value
      if (!updatedAt || it.updatedAt > updatedAt) updatedAt = it.updatedAt
    }

    return NextResponse.json({
      page,
      sections,
      updatedAt: updatedAt?.toISOString() ?? null,
    })
  },
)

// PUT /api/cms/[page] — admin only. Batch upsert + delete content for a page.
// Body:
//   {
//     items:    [{ section, key, value }, ...]  // upsert these
//     deletes: [{ section, key }, ...]         // delete these (optional)
//   }
// `deletes` lets the CMS UI remove whole sections or single keys that
// the admin removed from the draft (previously the PUT only upserted,
// so deleted keys silently stayed in the DB).
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ page: string }> }) => {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { page } = await params

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const items: Array<{ section: string; key: string; value: any }> = Array.isArray(body?.items)
      ? body.items
      : []
    const deletes: Array<{ section: string; key: string }> = Array.isArray(body?.deletes)
      ? body.deletes
      : []

    if (items.length === 0 && deletes.length === 0) {
      return NextResponse.json({ error: "items[] or deletes[] is required" }, { status: 400 })
    }

    // Validate each upsert item
    for (const it of items) {
      if (!it.section || !it.key || it.value === undefined) {
        return NextResponse.json(
          { error: "Each item must have section, key, value" },
          { status: 400 }
        )
      }
    }
    // Validate each delete item
    for (const it of deletes) {
      if (!it.section || !it.key) {
        return NextResponse.json(
          { error: "Each delete must have section and key" },
          { status: 400 }
        )
      }
    }

    // Run upserts sequentially (Neon has connection limits; avoids deadlocks on the unique index)
    const upserted: any[] = []
    for (const it of items) {
      const created = await db.siteContent.upsert({
        where: { page_section_key: { page, section: it.section, key: it.key } },
        create: { page, section: it.section, key: it.key, value: it.value, updatedBy: user.id },
        update: { value: it.value, updatedBy: user.id },
      })
      upserted.push(created)
    }

    // Run deletes. deleteMany returns { count: N } so we can report how
    // many rows were actually removed (0 if the key didn't exist).
    let deletedCount = 0
    for (const it of deletes) {
      const r = await db.siteContent.deleteMany({
        where: { page, section: it.section, key: it.key },
      })
      deletedCount += r.count
    }

    return NextResponse.json({ count: upserted.length, deleted: deletedCount, page })
  },
)
