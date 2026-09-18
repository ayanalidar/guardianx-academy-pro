import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicRouteView } from "@/components/platform/public-route-view"

export const dynamic = "force-dynamic"
interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const course = await db.course.findUnique({ where: { slug } })
  if (!course) return { title: "Course Not Found" }
  return { title: `${course.title} (${course.shortName}) | GuardianX Academy`, description: course.description, keywords: course.tags?.split(",").map(t => t.trim()).filter(Boolean) || [] }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const course = await db.course.findUnique({ where: { slug, published: true } })
  if (!course) notFound()
  // PublicRouteView hydrates the SPA store with this view so CourseDetailView
  // (which reads its id from the store) renders on direct/SEO visits.
  return <PublicRouteView initialView={{ name: "course", courseId: course.id }} />
}
