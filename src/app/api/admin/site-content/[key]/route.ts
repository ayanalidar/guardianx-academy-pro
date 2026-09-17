import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/**
 * PATCH /api/admin/site-content/[key] — upsert a single SiteContent row.
 *
 * The `[key]` path parameter may be in any of these formats:
 *   - "page.section.key"  (3 parts, fully qualified)
 *   - "section.key"       (2 parts, page defaults to body.page or "home")
 *   - "key"               (1 part, requires body.page and body.section)
 *
 * The body may also explicitly specify page/section:
 *   { value: any, page?: string, section?: string }
 *
 * `value` may be any JSON-serializable value (string, number, boolean,
 * array, object). The schema's `value` column is `Json` so we accept
 * any structured value, not just strings. The route uses the
 * `@@unique([page, section, key])` composite unique constraint for the
 * upsert — the previous implementation used `where: { key }` which is
 * invalid because `key` alone is NOT unique (only the composite is).
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ key: string }> }) => {
    const { key: rawKey } = await params

    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    if (body.value === undefined) {
      return NextResponse.json({ error: "value is required" }, { status: 400 })
    }

    // Parse the [key] path param. Support dotted forms: page.section.key
    // or section.key (page falls back to body.page or "home").
    const parts = rawKey.split(".")
    let page: string
    let section: string
    let key: string
    if (parts.length >= 3) {
      page = parts[0]
      section = parts[1]
      key = parts.slice(2).join(".")
    } else if (parts.length === 2) {
      page = typeof body.page === "string" ? body.page : "home"
      section = parts[0]
      key = parts[1]
    } else {
      page = typeof body.page === "string" ? body.page : "home"
      section = typeof body.section === "string" ? body.section : ""
      key = rawKey
    }

    // Body overrides take precedence (explicit page/section always wins).
    if (typeof body.page === "string" && body.page.trim()) page = body.page.trim()
    if (typeof body.section === "string" && body.section.trim()) section = body.section.trim()

    if (!page || !section || !key) {
      return NextResponse.json(
        { error: "page, section, and key are all required (use page.section.key in the URL or supply them in the body)" },
        { status: 400 }
      )
    }

    const item = await db.siteContent.upsert({
      where: { page_section_key: { page, section, key } },
      create: { page, section, key, value: body.value, updatedBy: user.id },
      update: { value: body.value, updatedBy: user.id },
    })

    return NextResponse.json({ item })
  },
)

/**
 * GET /api/admin/site-content/[key] — fetch a single SiteContent row by
 * the same dotted-key convention as PATCH. Returns 404 if not found.
 */
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ key: string }> }) => {
    const { key: rawKey } = await params

    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    // Default page = "home" when only section.key is supplied. Use
    // body-free GET so we have to guess; "home" matches the homepage CMS
    // (the most common edit target).
    const parts = rawKey.split(".")
    let page: string
    let section: string
    let key: string
    if (parts.length >= 3) {
      page = parts[0]
      section = parts[1]
      key = parts.slice(2).join(".")
    } else if (parts.length === 2) {
      page = "home"
      section = parts[0]
      key = parts[1]
    } else {
      return NextResponse.json(
        { error: "Use page.section.key or section.key in the URL (single-token keys are ambiguous)" },
        { status: 400 }
      )
    }

    const item = await db.siteContent.findUnique({
      where: { page_section_key: { page, section, key } },
    })

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ item })
  },
)

/**
 * DELETE /api/admin/site-content/[key] — delete a single SiteContent row
 * by the same dotted-key convention as PATCH.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ key: string }> }) => {
    const { key: rawKey } = await params

    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // empty body is OK
    }

    const parts = rawKey.split(".")
    let page: string
    let section: string
    let key: string
    if (parts.length >= 3) {
      page = parts[0]
      section = parts[1]
      key = parts.slice(2).join(".")
    } else if (parts.length === 2) {
      page = typeof body.page === "string" ? body.page : "home"
      section = parts[0]
      key = parts[1]
    } else {
      page = typeof body.page === "string" ? body.page : "home"
      section = typeof body.section === "string" ? body.section : ""
      key = rawKey
    }
    if (typeof body.page === "string" && body.page.trim()) page = body.page.trim()
    if (typeof body.section === "string" && body.section.trim()) section = body.section.trim()

    if (!page || !section || !key) {
      return NextResponse.json({ error: "page, section, and key are required" }, { status: 400 })
    }

    try {
      await db.siteContent.delete({
        where: { page_section_key: { page, section, key } },
      })
      return NextResponse.json({ deleted: true, page, section, key })
    } catch {
      // already deleted — that's fine
      return NextResponse.json({ deleted: false, page, section, key })
    }
  },
)
