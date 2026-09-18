"use client"

import * as React from "react"
import { PublicHeader } from "@/components/platform/public-header"
import { PublicFooter } from "@/components/platform/public-footer"
import { RouteProgress } from "@/components/platform/route-progress"
import { MobileTabBar } from "@/components/platform/mobile-tab-bar"
import { ViewEnter } from "@/components/platform/view-enter"

/**
 * PublicPageShell - wraps public-facing pages with the sticky header + footer.
 * Used for Home, Impact, Contact, and other unauthenticated pages.
 *
 * Also hosts global chrome: the SPA route progress bar, the animated view
 * enter transition and (when logged in on small screens) the mobile tab bar.
 */
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background bg-mesh">
      <RouteProgress />
      <PublicHeader />
      <main id="main-content" className="flex-1 pt-14 pb-16 lg:pb-0">
        <ViewEnter>{children}</ViewEnter>
      </main>
      <PublicFooter />
      <MobileTabBar />
    </div>
  )
}
