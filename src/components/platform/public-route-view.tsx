"use client"

import * as React from "react"
import { useAppStore, type View } from "@/store/app-store"
import { PublicPageShell } from "@/components/platform/public-page-shell"
import { ViewRouter } from "@/components/platform/view-router"
import { HomeView } from "@/views/home"
import { ImpactView } from "@/views/impact"
import { ContactView } from "@/views/contact"
import { InstitutionsSchoolsView } from "@/views/institutions-schools"
import { InstitutionsCollegesView } from "@/views/institutions-colleges"
import { InstitutionsUniversitiesView } from "@/views/institutions-universities"
import { OpenSchoolingView } from "@/views/open-schooling"
import { CorporateTrainingView } from "@/views/corporate-training"
import { CyberQuizLandingView } from "@/views/cyber-quiz-landing"
import { LearningPathsView } from "@/views/learning-paths"
import { CyberRangeView } from "@/views/cyber-range"
import { CourseCatalogView } from "@/views/course-catalog"
import { BatchesView } from "@/views/batches"
import { BatchDetailView } from "@/views/batch-detail"
import { ExamsView } from "@/views/exams"
import { CredentialsView } from "@/views/credentials"
import { VerifyView } from "@/views/verify"
import { SupportView } from "@/views/support"
import { InstructorsView } from "@/views/instructors"
import { InstructorDetailView } from "@/views/instructor-detail"
import { EventsView } from "@/views/events"
import { EventDetailView } from "@/views/event-detail"
import { BlogView } from "@/views/blog"
import { BlogPostView } from "@/views/blog-post"
import { CertLandingView } from "@/views/cert-landing"
import { PricingView } from "@/views/pricing"
import { CourseDetailView } from "@/views/course-detail"

/* ============================================================
   PublicRouteView — wraps a public page rendered at a real
   Next.js route (e.g. /courses/[slug]) with:
     1. The PublicPageShell (header + footer).
     2. The initial view component, server-rendered for SEO.
     3. Hydration of the Zustand store with the initial view so
        the existing view components (which read `useAppStore().view`)
        work without modification.

   Navigation note (path-routing era): `navigate()` now pushes REAL
   paths via history.pushState and updates the store. This component
   simply follows the store reactively — when the user clicks a nav
   item, the new view renders in place (no reload, no hash fallback).
   Views covered by renderView() render from statically-imported
   components; anything else falls through to the lazy ViewRouter.
   ============================================================ */

function renderView(view: View): React.ReactNode {
  switch (view.name) {
    case "home": return <HomeView />
    case "impact": return <ImpactView />
    case "contact": return <ContactView />
    case "institutions":
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
    case "course": return <CourseDetailView />
    case "learning-paths": return <LearningPathsView />
    case "cyber-range": return <CyberRangeView />
    default: return null
  }
}

export function PublicRouteView({ initialView }: { initialView: View }) {
  const storeView = useAppStore((s) => s.view)
  const hydratedRef = React.useRef(false)

  // Hydrate the store with the initial view after mount. The store is the
  // single source of truth from that point on: clicking any nav link, footer
  // link or pressing the browser back button updates the store and this
  // component re-renders IN PLACE (this is what fixes the old dead-end pages
  // where the URL changed but the screen never did).
  React.useEffect(() => {
    hydratedRef.current = true
    const current = useAppStore.getState().view
    if (JSON.stringify(current) !== JSON.stringify(initialView)) {
      useAppStore.setState({ view: initialView, sidebarOpen: false })
    }
  }, [initialView])

  // SSR + the first client paint must render the DEEP-LINKED view
  // (initialView) — not the store's pristine `{name:"home"}` default, which
  // would otherwise give crawlers and pre-hydration users homepage HTML on
  // detail pages. After the mount effect runs, always follow the store.
  const storeIsPristine = JSON.stringify(storeView) === JSON.stringify({ name: "home" })
  const active = !hydratedRef.current && storeIsPristine ? initialView : storeView

  return (
    <PublicPageShell>
      {renderView(active) ?? <ViewRouter />}
    </PublicPageShell>
  )
}
