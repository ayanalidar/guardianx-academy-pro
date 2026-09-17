import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/* PATCH /api/admin/blog/[id] — admin update. Accepts any subset of:
 * { title?, excerpt?, content?, category?, tags?, thumbnail?, published?, featured?, slug? }
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const { title, excerpt, content, category, tags, thumbnail, published, featured, slug } = body as {
      title?: string
      excerpt?: string
      content?: string
      category?: string
      tags?: string
      thumbnail?: string | null
      published?: boolean
      featured?: boolean
      slug?: string
    }

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = String(title).trim()
    if (excerpt !== undefined) updates.excerpt = String(excerpt)
    if (content !== undefined) updates.content = String(content)
    if (category !== undefined) updates.category = String(category).trim() || "General"
    if (tags !== undefined) updates.tags = String(tags)
    if (thumbnail !== undefined) updates.thumbnail = thumbnail ? String(thumbnail).trim() : null
    if (typeof published === "boolean") updates.published = published
    if (typeof featured === "boolean") updates.featured = featured

    if (slug !== undefined && slug !== null) {
      const newSlug = slugify(String(slug))
      if (newSlug && newSlug !== existing.slug) {
        const clash = await db.blogPost.findUnique({ where: { slug: newSlug } })
        if (clash && clash.id !== id) {
          return NextResponse.json({ error: "Slug already in use" }, { status: 400 })
        }
        updates.slug = newSlug
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ post: existing })
    }

    const updated = await db.blogPost.update({
      where: { id },
      data: updates,
      include: { author: { select: { id: true, name: true, avatar: true } } },
    })

    await logAction(
      currentUser.id,
      currentUser.name,
      "blog.update",
      "BlogPost",
      id,
      { before: { title: existing.title, published: existing.published }, after: { title: updated.title, published: updated.published } },
    )

    return NextResponse.json({ post: updated })
  },
)

/* DELETE /api/admin/blog/[id] — hard delete. */
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 })

    await db.blogPost.delete({ where: { id } })

    await logAction(
      currentUser.id,
      currentUser.name,
      "blog.delete",
      "BlogPost",
      id,
      { slug: existing.slug, title: existing.title },
    )

    return NextResponse.json({ ok: true })
  },
)
