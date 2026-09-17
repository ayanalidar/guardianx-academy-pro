import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicPageShell } from "@/components/platform/public-page-shell"
import { BlogPostView } from "@/views/blog-post"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = await db.blogPost.findUnique({ where: { slug } })
  if (!post) return { title: "Post Not Found" }
  return {
    title: post.title,
    description: post.excerpt || post.title,
    keywords: post.tags?.split(",").map(t => t.trim()) || [],
    openGraph: { title: post.title, description: post.excerpt || "", type: "article", publishedTime: post.createdAt.toISOString(), modifiedTime: post.updatedAt.toISOString() },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const post = await db.blogPost.findUnique({ where: { slug, published: true }, include: { author: { select: { name: true, avatar: true, bio: true } } } })
  if (!post) notFound()
  db.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {})
  return <PublicPageShell><BlogPostView slug={slug} /></PublicPageShell>
}
