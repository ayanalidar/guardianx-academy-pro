import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/blog/[slug] - public single blog post.
 *  - Returns the post with its author.
 *  - Increments `views` (best-effort, fire-and-forget).
 *  - Also returns up to 4 related posts (same category, excluding self).
 */
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params

    const post = await db.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { id: true, name: true, avatar: true, title: true, bio: true } } },
    })

    if (!post || !post.published) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Increment view count (best-effort)
    db.blogPost
      .update({ where: { id: post.id }, data: { views: { increment: 1 } } })
      .catch(() => {
        /* swallow - views are best-effort */
      })

    // Related posts (same category, excluding self), published only
    const related = await db.blogPost.findMany({
      where: {
        published: true,
        category: post.category,
        id: { not: post.id },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        thumbnail: true,
        category: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    })

    return NextResponse.json({ post, related })
  },
)
