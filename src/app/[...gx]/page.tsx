import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { AppRoot } from "@/components/platform/app-root"
import { pathToView, viewTitle, viewDescription } from "@/lib/url-router"

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gx } = await params
  const view = viewFromSegments(gx)
  if (!view) {
    return { title: "Page Not Found | GuardianX Academy" }
  }
  return {
    title: viewTitle(view),
    description: viewDescription(view),
    openGraph: {
      title: viewTitle(view),
      description: viewDescription(view),
    },
  }
}

export default async function BridgePage({ params }: Props) {
  const { gx } = await params
  const view = viewFromSegments(gx)
  if (!view) notFound()
  return <AppRoot initialView={view} />
}
