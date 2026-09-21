"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAppStore } from "@/store/app-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, ArrowRight, Clock, Eye, Link2, Share2,
  Twitter, Linkedin, Loader2, PenSquare,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   /blog/<slug> - single blog post view
   ------------------------------------------------------------
   - Article layout: title, author avatar + name, date, category badge
   - Markdown content rendered with ReactMarkdown + remark-gfm
   - Share buttons (copy link + Twitter + LinkedIn)
   - Related posts (same category) at bottom
   ============================================================ */

interface AuthorFull {
  id: string
  name: string
  avatar: string | null
  title: string | null
  bio: string | null
}

interface BlogPostFull {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string
  thumbnail: string | null
  featured: boolean
  views: number
  published: boolean
  createdAt: string
  updatedAt: string
  author: AuthorFull
}

interface RelatedPost {
  id: string
  slug: string
  title: string
  excerpt: string
  thumbnail: string | null
  category: string
  createdAt: string
  author: { name: string }
}

interface BlogDetailResponse {
  post: BlogPostFull
  related: RelatedPost[]
}

const CATEGORY_ACCENTS: Record<string, { tint: string; text: string; border: string }> = {
  "Threat Analysis": { tint: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30" },
  "How-To": { tint: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  "Certification Tips": { tint: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  "Industry News": { tint: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30" },
  General: { tint: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30" },
}

function accent(category: string) {
  return CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.General
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
}

function readTimeFrom(content: string): string {
  const words = (content || "").split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 200))
  return `${minutes} min read`
}

export function BlogPostView({ slug }: { slug: string }) {
  const { navigate } = useAppStore()

  const { data, isLoading, isError } = useQuery<BlogDetailResponse>({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to load post")
      }
      return res.json()
    },
    staleTime: 60_000,
  })

  const post = data?.post
  const related = data?.related ?? []

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading article…</p>
        </div>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-lg font-semibold mb-2">Article not found</p>
          <p className="text-sm text-muted-foreground mb-6">
            This post may have been removed or is no longer published.
          </p>
          <Button onClick={() => navigate({ name: "blog" })} variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to blog
          </Button>
        </div>
      </div>
    )
  }

  const a = accent(post.category)

  const handleCopyLink = () => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/#/blog/${post.slug}`
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Could not copy link"),
    )
  }

  const handleShareTwitter = () => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/#/blog/${post.slug}`
    const text = encodeURIComponent(post.title)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer")
  }

  const handleShareLinkedIn = () => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/#/blog/${post.slug}`
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      <article className="relative">
        {/* Back link */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-6">
          <button
            type="button"
            onClick={() => navigate({ name: "blog" })}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All articles
          </button>
        </div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-6 pb-8"
        >
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border",
              a.tint, a.text, a.border,
            )}
          >
            {post.category}
          </span>
          <h1 className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight leading-[1.1] text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Author + meta row */}
          <div className="mt-6 flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {post.author.name?.charAt(0)?.toUpperCase() ?? "G"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{post.author.name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{formatDate(post.createdAt)}</span>
                  <span className="opacity-50">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {readTimeFrom(post.content)}
                  </span>
                  <span className="opacity-50">·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {post.views}
                  </span>
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 px-2 text-muted-foreground"
                aria-label="Copy link"
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareTwitter}
                className="h-8 px-2 text-muted-foreground"
                aria-label="Share on Twitter"
              >
                <Twitter className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareLinkedIn}
                className="h-8 px-2 text-muted-foreground"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Cover image (optional) */}
        {post.thumbnail && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-8"
          >
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-border/60">
              <img
                src={post.thumbnail}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </motion.div>
        )}

        {/* Body (markdown) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-16"
        >
          <div className="prose-guardianx max-w-none">
            {post.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">This article has no content yet.</p>
            )}
          </div>

          {/* Tags */}
          {post.tags && (
            <div className="mt-8 pt-6 border-t border-border/60 flex flex-wrap gap-2">
              {post.tags
                .split(/[|,]/)
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] text-muted-foreground">
                    #{t.replace(/\s+/g, "-")}
                  </Badge>
                ))}
            </div>
          )}

          {/* Author bio */}
          {post.author.bio && (
            <div className="mt-8 p-5 rounded-xl border border-border/60 bg-card/40 flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-base font-bold flex items-center justify-center shrink-0">
                {post.author.name?.charAt(0)?.toUpperCase() ?? "G"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Written by
                </div>
                <div className="text-sm font-bold mt-0.5">{post.author.name}</div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                  {post.author.bio}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="relative border-t border-border/60 bg-sidebar/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-2 mb-6">
              <Share2 className="h-4 w-4 text-violet-400" />
              <h2 className="text-lg font-bold tracking-tight">Related articles</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((r, i) => (
                <motion.button
                  key={r.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  onClick={() => navigate({ name: "blog-post", slug: r.slug })}
                  className="block text-left group"
                >
                  <article className="flex flex-col h-full rounded-xl border border-border/60 bg-card/40 overflow-hidden hover:border-violet-500/40 transition-all">
                    <div className="relative h-32 overflow-hidden bg-muted/30">
                      {r.thumbnail ? (
                        <img
                          src={r.thumbnail}
                          alt={r.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PenSquare className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                        {r.title}
                      </h3>
                      <div className="mt-auto pt-3 text-[10px] text-muted-foreground flex items-center gap-1">
                        <span>{r.author.name}</span>
                        <span className="opacity-50">·</span>
                        <span>{formatDate(r.createdAt)}</span>
                      </div>
                    </div>
                  </article>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative py-12 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Liked this article? Explore our certification courses.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => navigate({ name: "blog" })}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> More articles
            </Button>
            <Button
              onClick={() => navigate({ name: "catalog" })}
              size="sm"
              className="bg-violet-600 hover:bg-violet-500"
            >
              Browse Courses <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
