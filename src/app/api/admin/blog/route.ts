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

/* GET /api/admin/blog - admin list (all posts, published + draft). */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() || undefined
  const published = url.searchParams.get("published") // "true" | "false" | undefined

  const where: { published?: boolean; OR?: { title?: { contains: string }; excerpt?: { contains: string } }[] } = {}
  if (published === "true") where.published = true
  if (published === "false") where.published = false
  if (q) {
    where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }]
  }

  const posts = await db.blogPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  })

  return NextResponse.json({ posts, count: posts.length })
})

/* POST /api/admin/blog - admin create.
 * Body: { title, excerpt?, content?, category?, tags?, thumbnail?, published?, featured?, slug? }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

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

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  // Generate slug (prefer user-supplied, fallback to title)
  let finalSlug = slug?.trim() ? slugify(slug) : slugify(title)
  if (!finalSlug) finalSlug = `post-${Date.now().toString(36)}`
  const existing = await db.blogPost.findUnique({ where: { slug: finalSlug } })
  if (existing) {
    finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`
  }

  const created = await db.blogPost.create({
    data: {
      slug: finalSlug,
      title: title.trim(),
      excerpt: excerpt ?? "",
      content: content ?? "",
      category: category?.trim() || "General",
      tags: tags ?? "",
      thumbnail: thumbnail?.trim() || null,
      published: typeof published === "boolean" ? published : false,
      featured: typeof featured === "boolean" ? featured : false,
      authorId: currentUser.id,
    },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  await logAction(
    currentUser.id,
    currentUser.name,
    "blog.create",
    "BlogPost",
    created.id,
    { slug: created.slug, title: created.title, published: created.published },
  )

  return NextResponse.json({ post: created }, { status: 201 })
})
