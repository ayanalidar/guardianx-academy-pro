"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useAppStore, type View } from "@/store/app-store"
import { PublicPageShell } from "@/components/platform/public-page-shell"
import { ViewRouter } from "@/components/platform/view-router"
import { HomeView } from "@/views/home"

/* ============================================================
   PublicRouteView - wraps a public page rendered at a real
   Next.js route (e.g. /courses/[slug]) with:
     1. The PublicPageShell (header + footer).
     2. The initial view component, server-rendered for SEO.
     3. Hydration of the Zustand store with the initial view so
        the existing view components (which read `useAppStore().view`)
        work without modification.

   PERF (important): only HomeView is statically imported. Every
   other public view is a `next/dynamic` code-split with `ssr: true`,
   so the deep-linked view still server-renders (SEO unchanged) but
   the shared first-load JS bundle no longer ships all ~35 public
   views at once - previously EVERY public page pulled in the JS of
   every other public view, which was the single biggest payload on
   the platform (~1.8 MB of static assets on the homepage).

   The only view whose chunk must load at hydration time is the one
   actually being displayed (it is fetched in parallel with the
   hydration stream, so first paint stays server-rendered HTML).
   All other chunks load on demand - and are pre-warmed during
   browser idle time by ViewPreloader, so SPA navigation into them
   stays instant. The `loading` skeleton below only shows if a user
   navigates to a view whose chunk has not warmed yet.

   Navigation note (path-routing era): `navigate()` now pushes REAL
   paths via history.pushState and updates the store. This component
   simply follows the store reactively - when the user clicks a nav
   item, the new view renders in place (no reload, no hash fallback).
   Views covered by renderView() render from their lazy chunks;
   anything else falls through to the lazy ViewRouter.
   ============================================================ */

/** Skeleton shown while a (not-yet-warmed) view chunk streams in. */
function ViewLoading() {
  return (
    <div className="min-h-[60vh] flex items-start justify-center pt-16 px-6" aria-hidden>
      <div className="w-full max-w-5xl space-y-4">
        <div className="h-8 w-56 max-w-full rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded bg-muted/40 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-6">
          <div className="h-44 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-44 rounded-xl bg-muted/40 animate-pulse [animation-delay:120ms]" />
          <div className="h-44 rounded-xl bg-muted/40 animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  )
}

// ── Lazy public views (ssr:true keeps deep-link SEO; chunk loads on demand) ──
const ContactView = dynamic(() => import("@/views/contact").then(m => ({ default: m.ContactView })), { ssr: true, loading: ViewLoading })
const InstitutionsView = dynamic(() => import("@/views/institutions").then(m => ({ default: m.InstitutionsView })), { ssr: true, loading: ViewLoading })
const InstitutionsSchoolsView = dynamic(() => import("@/views/institutions-schools").then(m => ({ default: m.InstitutionsSchoolsView })), { ssr: true, loading: ViewLoading })
const InstitutionsCollegesView = dynamic(() => import("@/views/institutions-colleges").then(m => ({ default: m.InstitutionsCollegesView })), { ssr: true, loading: ViewLoading })
const InstitutionsUniversitiesView = dynamic(() => import("@/views/institutions-universities").then(m => ({ default: m.InstitutionsUniversitiesView })), { ssr: true, loading: ViewLoading })
const OpenSchoolingView = dynamic(() => import("@/views/open-schooling").then(m => ({ default: m.OpenSchoolingView })), { ssr: true, loading: ViewLoading })
const CorporateTrainingView = dynamic(() => import("@/views/corporate-training").then(m => ({ default: m.CorporateTrainingView })), { ssr: true, loading: ViewLoading })
const CyberQuizLandingView = dynamic(() => import("@/views/cyber-quiz-landing").then(m => ({ default: m.CyberQuizLandingView })), { ssr: true, loading: ViewLoading })
const LearningPathsView = dynamic(() => import("@/views/learning-paths").then(m => ({ default: m.LearningPathsView })), { ssr: true, loading: ViewLoading })
const CyberRangeView = dynamic(() => import("@/views/cyber-range").then(m => ({ default: m.CyberRangeView })), { ssr: true, loading: ViewLoading })
const CourseCatalogView = dynamic(() => import("@/views/course-catalog").then(m => ({ default: m.CourseCatalogView })), { ssr: true, loading: ViewLoading })
const BatchesView = dynamic(() => import("@/views/batches").then(m => ({ default: m.BatchesView })), { ssr: true, loading: ViewLoading })
const BatchDetailView = dynamic(() => import("@/views/batch-detail").then(m => ({ default: m.BatchDetailView })), { ssr: true, loading: ViewLoading })
const ExamsView = dynamic(() => import("@/views/exams").then(m => ({ default: m.ExamsView })), { ssr: true, loading: ViewLoading })
const CredentialsView = dynamic(() => import("@/views/credentials").then(m => ({ default: m.CredentialsView })), { ssr: true, loading: ViewLoading })
const VerifyView = dynamic(() => import("@/views/verify").then(m => ({ default: m.VerifyView })), { ssr: true, loading: ViewLoading })
const SupportView = dynamic(() => import("@/views/support").then(m => ({ default: m.SupportView })), { ssr: true, loading: ViewLoading })
const InstructorsView = dynamic(() => import("@/views/instructors").then(m => ({ default: m.InstructorsView })), { ssr: true, loading: ViewLoading })
const InstructorDetailView = dynamic(() => import("@/views/instructor-detail").then(m => ({ default: m.InstructorDetailView })), { ssr: true, loading: ViewLoading })
const EventsView = dynamic(() => import("@/views/events").then(m => ({ default: m.EventsView })), { ssr: true, loading: ViewLoading })
const EventDetailView = dynamic(() => import("@/views/event-detail").then(m => ({ default: m.EventDetailView })), { ssr: true, loading: ViewLoading })
const BlogView = dynamic(() => import("@/views/blog").then(m => ({ default: m.BlogView })), { ssr: true, loading: ViewLoading })
const BlogPostView = dynamic(() => import("@/views/blog-post").then(m => ({ default: m.BlogPostView })), { ssr: true, loading: ViewLoading })
const CertLandingView = dynamic(() => import("@/views/cert-landing").then(m => ({ default: m.CertLandingView })), { ssr: true, loading: ViewLoading })
const PricingView = dynamic(() => import("@/views/pricing").then(m => ({ default: m.PricingView })), { ssr: true, loading: ViewLoading })
const HiringView = dynamic(() => import("@/views/hiring").then(m => ({ default: m.HiringView })), { ssr: true, loading: ViewLoading })
const PlacementsView = dynamic(() => import("@/views/placements").then(m => ({ default: m.PlacementsView })), { ssr: true, loading: ViewLoading })
const CourseDetailView = dynamic(() => import("@/views/course-detail").then(m => ({ default: m.CourseDetailView })), { ssr: true, loading: ViewLoading })

function renderView(view: View): React.ReactNode {
  switch (view.name) {
    case "home": return <HomeView />
    case "contact": return <ContactView />
    case "institutions":
      return <InstitutionsView />
    case "institutions-schools": return <InstitutionsSchoolsView />
    case "institutions-colleges": return <InstitutionsCollegesView />
    case "institutions-universities": return <InstitutionsUniversitiesView />
    case "institutions-open-schooling": return <OpenSchoolingView />
    case "corporate-training": return <CorporateTrainingView />
    case "cyber-quiz": return <CyberQuizLandingView />
    case "catalog": return <CourseCatalogView />
    case "batches": return <BatchesView />
    case "batch-detail": return "batchSlug" in view ? <BatchDetailView slug={view.batchSlug} /> : null
    case "exams": return <ExamsView />
    case "credentials": return <CredentialsView />
    case "verify": return <VerifyView />
    case "support": return <SupportView />
    case "instructors": return <InstructorsView />
    case "instructor-detail": return <InstructorDetailView />
    case "events": return <EventsView />
    case "event-detail": return <EventDetailView />
    case "blog": return <BlogView />
    case "blog-post": return "slug" in view ? <BlogPostView slug={view.slug} /> : <BlogView />
    case "cert-landing": return "certSlug" in view ? <CertLandingView certSlug={view.certSlug} /> : null
    case "pricing": return <PricingView />
    case "hiring": return <HiringView />
    case "placements": return <PlacementsView />
    case "course": return <CourseDetailView />
    case "learning-paths": return <LearningPathsView />
    case "cyber-range": return <CyberRangeView />
    default: return null
  }
}

export function PublicRouteView({ initialView }: { initialView: View }) {
  const storeView = useAppStore((s) => s.view)
  // Hydration flag: false during SSR + the very first client render (so the
  // DEEP-LINKED view paints), true after the mount effect (so the store - 
  // the single source of truth - drives every subsequent render). This used
  // to be a ref read during render, which is illegal in React.
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate the store with the initial view after mount. The store is the
  // single source of truth from that point on: clicking any nav link, footer
  // link or pressing the browser back button updates the store and this
  // component re-renders IN PLACE (this is what fixes the old dead-end pages
  // where the URL changed but the screen never did).
  React.useEffect(() => {
    setHydrated(true)
    const current = useAppStore.getState().view
    if (JSON.stringify(current) !== JSON.stringify(initialView)) {
      useAppStore.setState({ view: initialView, sidebarOpen: false })
    }
  }, [initialView])

  // SSR + the first client paint must render the DEEP-LINKED view
  // (initialView) - not the store's pristine `{name:"home"}` default, which
  // would otherwise give crawlers and pre-hydration users homepage HTML on
  // detail pages. After the mount effect runs, always follow the store.
  const storeIsPristine = JSON.stringify(storeView) === JSON.stringify({ name: "home" })
  const active = !hydrated && storeIsPristine ? initialView : storeView

  return (
    <PublicPageShell>
      {renderView(active) ?? <ViewRouter />}
    </PublicPageShell>
  )
}
