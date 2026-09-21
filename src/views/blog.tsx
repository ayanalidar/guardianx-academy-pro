"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/platform/empty-state"
import { cn } from "@/lib/utils"
import {
  ArrowRight, Sparkles, PenSquare, Eye, Clock,
} from "lucide-react"

/* ============================================================
   /blog - public blog / content hub listing
   ------------------------------------------------------------
   - Hero: "GuardianX Cybersecurity Blog"
   - Featured post (large card)
   - Category filter pills
   - Grid of post cards (thumbnail / title / excerpt / author / date / category)
   - Click a post → navigate to { name: "blog-post", slug }
   ============================================================ */

interface AuthorMini {
  id: string
  name: string
  avatar: string | null
  title: string | null
}

interface BlogPostCard {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string
  thumbnail: string | null
  featured: boolean
  views: number
  createdAt: string
  author: AuthorMini
}

interface BlogListResponse {
  posts: BlogPostCard[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  categories: string[]
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
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
}

function readTime(excerpt: string): string {
  // crude estimate: 200 wpm, assume full post is ~6x excerpt length
  const words = (excerpt || "").split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round((words * 6) / 200))
  return `${minutes} min`
}

export function BlogView() {
  const { navigate } = useAppStore()
  const [category, setCategory] = React.useState<string>("All")
  const [page, setPage] = React.useState(1)

  // Reset page when category changes
  React.useEffect(() => {
    setPage(1)
  }, [category])

  const { data, isLoading } = useQuery<BlogListResponse>({
    queryKey: ["blog-list", category, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "9" })
      if (category !== "All") params.set("category", category)
      const res = await fetch(`/api/blog?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load blog posts")
      return res.json()
    },
    staleTime: 60_000,
  })

  const posts = data?.posts ?? []
  const categories = data?.categories ?? []
  const featured = posts.find((p) => p.featured) ?? null
  const regular = featured ? posts.filter((p) => p.id !== featured.id) : posts

  const allCategories = React.useMemo(() => {
    const seen = new Set<string>(categories)
    return ["All", ...Array.from(seen).filter(Boolean)]
  }, [categories])

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* HERO */}
      <section className="relative py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline" className="mb-5 border-violet-500/30 text-violet-300 bg-violet-500/5">
              <PenSquare className="h-3 w-3 mr-1.5" /> GUARDIANX BLOG
            </Badge>
            <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] mb-4 text-balance">
              GuardianX <span className="text-gradient-premium">Cybersecurity Blog.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Threat analysis, how-to guides, certification tips, and industry news from
              the practitioners teaching our courses. New posts every week.
            </p>
          </motion.div>

          {/* Category pills */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {allCategories.map((c) => {
              const active = c === category
              const a = c !== "All" ? accent(c) : null
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                    active
                      ? a
                        ? `${a.tint} ${a.text} ${a.border}`
                        : "bg-violet-500/10 text-violet-300 border-violet-500/30"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40",
                  )}
                >
                  {c}
                </button>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* BODY */}
      <section className="relative pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-80 rounded-2xl" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
              </div>
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No posts in this category yet"
              description="New guides and writeups are published every week - check back soon or subscribe to the newsletter."
              className="py-16"
            />
          ) : (
            <div className="space-y-10">
              {/* Featured post (large) */}
              {featured && (
                <motion.button
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => navigate({ name: "blog-post", slug: featured.slug })}
                  className="block w-full text-left group"
                >
                  <article className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm grid md:grid-cols-2">
                    <div className="relative h-56 md:h-auto overflow-hidden bg-muted/30">
                      {featured.thumbnail ? (
                        <img
                          src={featured.thumbnail}
                          alt={featured.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <PenSquare className="h-12 w-12 mx-auto text-violet-400/40" />
                            <p className="text-[10px] text-muted-foreground mt-2 font-mono">FEATURED POST</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-violet-600/90 text-white border-0">
                          <Sparkles className="h-3 w-3 mr-1" /> Featured
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8 flex flex-col justify-center">
                      <CategoryBadge category={featured.category} />
                      <h2 className="mt-3 text-xl lg:text-2xl font-bold tracking-tight leading-tight group-hover:text-violet-300 transition-colors">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {featured.excerpt}
                        </p>
                      )}
                      <PostMeta post={featured} className="mt-5" />
                      <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-violet-300">
                        Read article <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </article>
                </motion.button>
              )}

              {/* Grid of regular posts */}
              {regular.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {regular.map((post, i) => (
                    <motion.button
                      key={post.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.04 * i }}
                      onClick={() => navigate({ name: "blog-post", slug: post.slug })}
                      className="block text-left group"
                    >
                      <article className="flex flex-col h-full rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-violet-500/40 transition-all">
                        <div className="relative h-40 overflow-hidden bg-muted/30">
                          {post.thumbnail ? (
                            <img
                              src={post.thumbnail}
                              alt={post.title}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <PenSquare className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <CategoryBadge category={post.category} />
                          <h3 className="mt-2 text-base font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="mt-auto pt-4">
                            <PostMeta post={post} />
                          </div>
                        </div>
                      </article>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-md border border-border/60 text-xs disabled:opacity-40 hover:bg-accent/40 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-muted-foreground px-2">
                    Page {page} of {data.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="px-3 py-1.5 rounded-md border border-border/60 text-xs disabled:opacity-40 hover:bg-accent/40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const a = accent(category)
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border w-fit",
        a.tint, a.text, a.border,
      )}
    >
      {category}
    </span>
  )
}

function PostMeta({ post, className }: { post: BlogPostCard; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-[11px] text-muted-foreground", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
          {post.author.name?.charAt(0)?.toUpperCase() ?? "G"}
        </div>
        <span className="truncate">{post.author.name}</span>
      </div>
      <span className="opacity-50">·</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" /> {formatDate(post.createdAt)}
      </span>
      <span className="opacity-50">·</span>
      <span className="flex items-center gap-1">
        <Eye className="h-3 w-3" /> {post.views}
      </span>
    </div>
  )
}
