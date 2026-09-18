import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicRouteView } from "@/components/platform/public-route-view"

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
  return <PublicRouteView initialView={{ name: "blog-post", slug }} />
}
