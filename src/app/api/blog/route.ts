import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/blog - public list of published blog posts (paginated).
 * Query params:
 *   page - 1-based page number (default 1)
 *   pageSize - items per page (default 9, max 24)
 *   category - filter by category (e.g. "Threat Analysis")
 *
 * Returns:
 *   { posts: [...], total, page, pageSize, totalPages, categories }
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const pageSize = Math.min(24, Math.max(1, parseInt(url.searchParams.get("pageSize") || "9", 10) || 9))
  const category = url.searchParams.get("category")?.trim() || undefined

  const where: { published: boolean; category?: string } = { published: true }
  if (category && category !== "All") where.category = category

  const [total, posts, categories] = await Promise.all([
    db.blogPost.count({ where }),
    db.blogPost.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        tags: true,
        thumbnail: true,
        featured: true,
        views: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatar: true, title: true } },
      },
    }),
    db.blogPost.findMany({
      where: { published: true },
      select: { category: true },
      distinct: ["category"],
    }),
  ])

  return NextResponse.json({
    posts,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    categories: categories.map((c) => c.category),
  })
})
