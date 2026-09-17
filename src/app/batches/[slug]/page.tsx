import type { Metadata } from "next"
import { PublicPageShell } from "@/components/platform/public-page-shell"
import { BatchDetailClient } from "./batch-detail-client"

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
    }
  } catch {
    return { title: "Batch Details | GuardianX Academy" }
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PublicPageShell>
      <BatchDetailClient slug={params} />
    </PublicPageShell>
  )
}
