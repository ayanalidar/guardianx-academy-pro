import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicRouteView } from "@/components/platform/public-route-view"
import { courseJsonLd, jsonLdScript } from "@/lib/jsonld"

export const dynamic = "force-dynamic"
interface Props { params: Promise<{ slug: string }> }

// A bare findUnique() selects EVERY Course column — on deployments whose DB
// predates the course-extras columns (Vercel auto-deploying fresh code against
// a stale remote DB) that throws P2022 and the whole page 500s (blank).
// Tier the reads so only columns that actually exist are requested.
async function getCourseBySlug(slug: string): Promise<any> {
  // Tier 1 — everything metadata wants.
  try {
    return await db.course.findUnique({
      where: { slug, published: true },
      select: {
        id: true, slug: true, title: true, shortName: true, description: true,
        category: true, certBody: true, tags: true,
      },
    })
  } catch { /* fall through */ }
  // Tier 2 — v1-era columns only.
  try {
    return await db.course.findUnique({
      where: { slug, published: true },
      select: { id: true, slug: true, title: true, description: true },
    })
  } catch { /* fall through */ }
  // Tier 3 — bare minimum.
  try {
    return await db.course.findUnique({ where: { slug }, select: { id: true } })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)
  if (!course) return { title: "Course Not Found" }
  const ogParams = new URLSearchParams({
    title: course.shortName ? `${course.title} (${course.shortName})` : course.title,
    kicker: "Course",
    badge: (course as any).certBody || course.category || "",
    accent: "violet",
  })
  return {
    title: `${course.title}${course.shortName ? ` (${course.shortName})` : ""}`,
    description: course.description ?? undefined,
    keywords: course.tags?.split(",").map(t => t.trim()).filter(Boolean) || [],
    alternates: { canonical: `/courses/${slug}` },
    openGraph: { title: `${course.title}${course.shortName ? ` (${course.shortName})` : ""}`, description: course.description ?? undefined, images: [`/api/og?${ogParams.toString()}`] },
    twitter: { card: "summary_large_image", title: course.title, description: course.description ?? undefined, images: [`/api/og?${ogParams.toString()}`] },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)
  if (!course) notFound()
  // Rich-result structured data (Google Course info). Only emit when we
  // resolved a real title — tier-3 reads may return just the id.
  const schema = (course as any).title
    ? jsonLdScript(courseJsonLd({
        title: (course as any).title,
        shortName: (course as any).shortName ?? null,
        description: (course as any).description ?? null,
        slug: (course as any).slug ?? slug,
        level: (course as any).level ?? null,
        price: (course as any).price ?? null,
        durationHours: (course as any).durationHours ?? null,
        certBody: (course as any).certBody ?? null,
        tags: (course as any).tags ?? null,
        thumbnail: (course as any).thumbnail ?? null,
      }))
    : undefined
  // PublicRouteView hydrates the SPA store with this view so CourseDetailView
  // (which reads its id from the store) renders on direct/SEO visits.
  return (
    <>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={schema} />}
      <PublicRouteView initialView={{ name: "course", courseId: course.id }} />
    </>
  )
}
