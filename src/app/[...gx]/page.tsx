import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { AppRoot } from "@/components/platform/app-root"
import { pathToView, viewTitle, viewDescription } from "@/lib/url-router"
import { db } from "@/lib/db"

/**
 * Catch-all bridge route — gives EVERY SPA view a real, crawlable URL.
 *
 * e.g. /skill-assessments, /dashboard, /lab/<slug>, /cyber-quiz/start/Easy
 *
 * The path is parsed into a View on the server (unknown paths → branded
 * 404), then AppRoot hydrates the SPA store and renders the view with the
 * exact same session/shell logic as the root route. Real dedicated pages
 * (e.g. /courses/[slug], /blog/[slug]) take precedence over this route —
 * Next.js matches specific segments before the catch-all.
 *
 * SEO: metadata is content-aware. Detail views resolve their DB row so the
 * bridge URL carries the item's REAL title/description, and detail views
 * that have a dedicated route emit a canonical pointing there — this kills
 * the old duplicate-URL pair (/course/<x> vs /courses/<slug>).
 *
 * This is what replaces the old hash URLs (`/#/skill-assessments`):
 * legacy links are rewritten to these clean paths on first load.
 */

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ gx: string[] }>
}

function viewFromSegments(segments: string[]) {
  // Next.js already decodes each segment; rejoin for the parser.
  const path = "/" + segments.join("/")
  return pathToView(path)
}

/* ---------- content resolvers (fail-open: null → generic metadata) ---------- */

async function resolveCourse(slugOrId: string) {
  return db.course
    .findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }], published: true },
      select: { slug: true, title: true, shortName: true, description: true },
    })
    .catch(() => null)
}

async function resolveBlogPost(slugOrId: string) {
  const bySlug = await db.blogPost
    .findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }], published: true },
      select: { slug: true, title: true, excerpt: true },
    })
    .catch(() => null)
  return bySlug
}

async function resolveEvent(slugOrId: string) {
  return db.event
    .findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }], published: true },
      select: { slug: true, title: true, description: true },
    })
    .catch(() => null)
}

async function resolveCert(slug: string) {
  return db.guardianCertification
    .findFirst({
      where: { OR: [{ slug }, { id: slug }], published: true },
      select: { slug: true, name: true, description: true, level: true },
    })
    .catch(() => null)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gx } = await params
  const view = viewFromSegments(gx)
  if (!view) {
    return { title: "Page Not Found", robots: { index: false, follow: true } }
  }
  const selfPath = "/" + gx.join("/")

  // Detail views with a DEDICATED route → canonical points there and the
  // title/description come from the real DB row.
  try {
    if (view.name === "course") {
      const c = await resolveCourse(view.courseId)
      if (c) {
        return {
          title: c.shortName ? `${c.title} (${c.shortName})` : c.title,
          description: c.description ?? undefined,
          alternates: { canonical: `/courses/${c.slug}` },
          openGraph: { title: c.title, description: c.description ?? undefined },
        }
      }
    }
    if (view.name === "blog-post") {
      const p = await resolveBlogPost(view.slug)
      if (p) {
        return {
          title: p.title,
          description: p.excerpt || undefined,
          alternates: { canonical: `/blog/${p.slug}` },
          openGraph: { title: p.title, description: p.excerpt ?? undefined, type: "article" },
        }
      }
    }
    if (view.name === "event-detail") {
      const e = await resolveEvent(view.eventSlug)
      if (e) {
        return {
          title: e.title,
          description: e.description?.slice(0, 160) || undefined,
          alternates: { canonical: `/events/${e.slug}` },
          openGraph: { title: e.title, description: e.description ?? undefined },
        }
      }
    }
    // Views WITHOUT a dedicated route → self-canonical + real row content.
    if (view.name === "cert-landing") {
      const cert = await resolveCert(view.certSlug)
      if (cert) {
        return {
          title: `${cert.name} Certification`,
          description: cert.description ?? undefined,
          alternates: { canonical: `/cert/${cert.slug}` },
          openGraph: { title: `${cert.name} — GuardianX Academy`, description: cert.description ?? undefined },
        }
      }
      return {
        title: viewTitle(view),
        description: viewDescription(view),
        alternates: { canonical: selfPath },
      }
    }
  } catch {
    // DB hiccup → fall through to generic view metadata (never 500).
  }

  return {
    title: viewTitle(view),
    description: viewDescription(view),
    alternates: { canonical: selfPath },
  }
}

export default async function BridgePage({ params }: Props) {
  const { gx } = await params
  const view = viewFromSegments(gx)
  if (!view) notFound()
  return <AppRoot initialView={view} />
}
