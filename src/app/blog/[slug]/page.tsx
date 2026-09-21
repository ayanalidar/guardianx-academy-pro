import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicRouteView } from "@/components/platform/public-route-view"
import { articleJsonLd, jsonLdScript } from "@/lib/jsonld"

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
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: post.title, description: post.excerpt || "", type: "article", publishedTime: post.createdAt.toISOString(), modifiedTime: post.updatedAt.toISOString() },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const post = await db.blogPost.findUnique({ where: { slug, published: true }, include: { author: { select: { name: true, avatar: true, bio: true } } } })
  if (!post) notFound()
  db.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {})
  // Rich-result structured data (Google Article).
  const schema = jsonLdScript(articleJsonLd({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    slug: post.slug,
    authorName: post.author?.name ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    thumbnail: post.thumbnail,
    tags: post.tags,
  }))
  return (
    <>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={schema} />}
      <PublicRouteView initialView={{ name: "blog-post", slug }} />
    </>
  )
}
