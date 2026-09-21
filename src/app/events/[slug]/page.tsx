import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicRouteView } from "@/components/platform/public-route-view"
import { eventJsonLd, jsonLdScript } from "@/lib/jsonld"

export const dynamic = "force-dynamic"
interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const event = await db.event.findUnique({ where: { slug } })
  if (!event) return { title: "Event Not Found" }
  return {
    title: event.title,
    description: event.description?.slice(0, 160) || event.title,
    alternates: { canonical: `/events/${slug}` },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const event = await db.event.findUnique({ where: { slug, published: true } })
  if (!event) notFound()
  // Rich-result structured data (Google Event). Emits nothing when the
  // event has no machine-readable start date (invalid markup is worse
  // than no markup).
  const schema = jsonLdScript(eventJsonLd({
    title: event.title,
    description: event.description,
    slug: event.slug,
    startIsoDate: event.startIsoDate,
    endDate: event.endDate,
    mode: event.mode,
    venue: event.venue,
    fee: event.fee,
    imageUrl: event.imageUrl,
    organizerName: event.organizer,
  }))
  return (
    <>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={schema} />}
      <PublicRouteView initialView={{ name: "event-detail", eventSlug: event.slug }} />
    </>
  )
}
