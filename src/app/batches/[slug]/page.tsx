import type { Metadata } from "next"
import { PublicRouteView } from "@/components/platform/public-route-view"
import { pathToView } from "@/lib/url-router"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || "https://academy.guardianx.cloud"}/api/training-batches/${slug}`, { next: { revalidate: 3600 } })
    if (!res.ok) return { title: "Batch Not Found | GuardianX Academy" }
    const { batch } = await res.json()
    return {
      title: `${batch.name} (${batch.certification}) | GuardianX Academy`,
      description: `${batch.name} — ${batch.mode} batch starting ${batch.startDate}. Instructor: ${batch.instructor}. ${batch.seats - batch.enrolled} seats left. Enroll now!`,
      openGraph: {
        title: `${batch.name} | GuardianX Academy`,
        description: `${batch.certification} batch starting ${batch.startDate}. ${batch.schedule}. ${batch.seats - batch.enrolled} seats left.`,
        type: "website",
      },
      alternates: { canonical: `/batches/${slug}` },
    }
  } catch {
    return { title: "Batch Details | GuardianX Academy" }
  }
}

/**
 * Batch detail — a REAL server-routable page (`/batches/<slug>`) that also
 * hydrates into the SPA store via PublicRouteView. This is the fix for the
 * old dead-end: the page previously rendered a static client tree that
 * ignored store navigation, so clicking any header link changed the URL but
 * never the screen. PublicRouteView follows the store reactively, so every
 * nav link, footer link and the browser back button now work in place.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const view = pathToView(`/batches/${slug}`) ?? { name: "batches" as const }
  return <PublicRouteView initialView={view} />
}
