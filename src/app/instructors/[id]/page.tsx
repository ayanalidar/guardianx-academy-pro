import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicRouteView } from "@/components/platform/public-route-view"
import { personJsonLd, jsonLdScript } from "@/lib/jsonld"

export const dynamic = "force-dynamic"
interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const instructor = await db.user.findUnique({ where: { id }, select: { name: true, title: true, bio: true } })
  if (!instructor) return { title: "Instructor Not Found" }
  return {
    title: `${instructor.name} - Cybersecurity Instructor`,
    description: instructor.bio?.slice(0, 160) || instructor.title || `Learn from ${instructor.name} at GuardianX Academy.`,
    alternates: { canonical: `/instructors/${id}` },
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const instructor = await db.user.findUnique({ where: { id, role: "INSTRUCTOR" } })
  if (!instructor) notFound()
  // Rich-result structured data (Person).
  const schema = jsonLdScript(personJsonLd({
    id: instructor.id,
    name: instructor.name,
    headline: instructor.title,
    bio: instructor.bio,
    avatar: instructor.avatar,
  }))
  return (
    <>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={schema} />}
      <PublicRouteView initialView={{ name: "instructor-detail", instructorId: instructor.id }} />
    </>
  )
}
