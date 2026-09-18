"use client"

/**
 * AppRoot — the application shell decision layer, extracted from the old
 * `src/app/page.tsx` so BOTH the root route (`/`) and the catch-all
 * bridge route (`/[...gx]`) share identical behavior:
 *
 *   - Hydrates the SPA store from the URL (path-based; legacy `#/…` hashes
 *     are transparently rewritten to clean paths via history.replaceState).
 *   - Fetches the session and decides which shell renders:
 *       logged-out + public view → PublicPageShell (header/footer)
 *       logged-out + protected   → AuthScreen (remembers pendingView)
 *       logged-in + public       → PublicPageShell
 *       logged-in + app view     → AppShell (sidebar)
 *   - Re-fetches the session on every navigation (post-login flow).
 *
 * `initialView` is passed by the bridge page for deep links; the root page
 * omits it and hydrates from the URL instead.
 */

import * as React from "react"
import { AuthScreen } from "@/components/platform/auth-screen"
import { AppShell } from "@/components/platform/app-shell"
import { PublicPageShell } from "@/components/platform/public-page-shell"
import { ErrorBoundary } from "@/components/platform/error-boundary"
import { ViewRouter } from "@/components/platform/view-router"
import { useAppStore, type View } from "@/store/app-store"
import { hashToView, replaceViewInUrl, pathToView, PUBLIC_VIEWS } from "@/lib/url-router"

export function AppRoot({ initialView }: { initialView?: View }) {
  const { view, pendingView, setPendingView } = useAppStore()
  const [session, setSession] = React.useState<any>(null)
  const [sessionChecked, setSessionChecked] = React.useState(false)
  const [, forceRender] = React.useState(0)

  // Listen for navigation events — re-fetch the session after every navigate.
  // This is critical for the post-login flow: signIn() sets the session cookie,
  // then auth-screen calls navigate({name:"dashboard"}); without re-fetching
  // the session here, the root still thinks session=null and bounces back to
  // the AuthScreen. Re-fetching on the navigate event ensures the session
  // state is fresh right before we decide which shell to render.
  React.useEffect(() => {
    const handler = () => {
      forceRender((v: number) => v + 1)
      fetch("/api/auth/session", { credentials: "include" })
        .then(r => r.json())
        .then(data => { setSession(data?.user ? data : null); setSessionChecked(true) })
        .catch(() => { /* keep existing session state */ })
    }
    window.addEventListener("guardianx-navigate", handler)
    return () => window.removeEventListener("guardianx-navigate", handler)
  }, [forceRender])

  // Hydrate the view from the URL after mount. Handles three cases:
  //   1. Legacy hash URL (`/#/skill-assessments`) → rewrite the address bar
  //      to the clean path (`/skill-assessments`) via history.replaceState
  //      (no reload, no history entry) and hydrate the store from that view.
  //      All previously shared `#/…` links keep working forever.
  //   2. Bridge page passed an `initialView` (path already parsed on the
  //      server) → hydrate the store with it.
  //   3. Plain path → parse pathname into the view.
  React.useEffect(() => {
    const hash = window.location.hash
    if (hash && hash !== "#" && hash.startsWith("#")) {
      // 1. Legacy hash → clean path (in place, no reload)
      const legacyView = hashToView(hash)
      replaceViewInUrl(legacyView)
      const current = useAppStore.getState().view
      if (JSON.stringify(legacyView) !== JSON.stringify(current)) {
        useAppStore.setState({ view: legacyView, sidebarOpen: false })
        window.dispatchEvent(new CustomEvent("guardianx-navigate", { detail: legacyView }))
      }
      return
    }
    // 2/3. Path-based hydration (bridge initialView already matches the
    // pathname, so both branches parse to the same view).
    const fromPath = initialView ?? pathToView(window.location.pathname + window.location.search) ?? { name: "home" as const }
    const current = useAppStore.getState().view
    if (JSON.stringify(fromPath) !== JSON.stringify(current)) {
      useAppStore.setState({ view: fromPath, sidebarOpen: false })
      window.dispatchEvent(new CustomEvent("guardianx-navigate", { detail: fromPath }))
    }
    // Normalize the URL (e.g. "/" instead of empty) without polluting
    // history. Skip when query params exist (e.g. ?ref=xyz) so we never
    // strip them before they're captured.
    if (!window.location.search) replaceViewInUrl(fromPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Capture referral id from `?ref=` query param on first visit. We store
  // it in localStorage so the value survives the SPA navigation from the
  // landing page to the auth screen, and is later attached to the
  // /api/auth/register call (see auth-screen.handleRegister).
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")
      if (ref && /^[a-z0-9]{20,30}$/i.test(ref)) {
        window.localStorage.setItem("gx_ref", ref)
      }
    } catch {
      // localStorage may be unavailable (private mode) — non-fatal.
    }
  }, [])

  // Check session via fetch instead of useSession hook (avoids CLIENT_FETCH_ERROR blocking).
  // Re-runs whenever the view name changes so that after a successful login +
  // navigate(), the session state is refreshed before the shell decision.
  React.useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setSession(data?.user ? data : null); setSessionChecked(true) })
      .catch(() => { setSession(null); setSessionChecked(true) })
  }, [view.name])

  // Force re-render when view changes
  React.useEffect(() => {
    const handler = () => forceRender((v: number) => v + 1)
    const unsub = useAppStore.subscribe(handler)
    return () => { unsub() }
  }, [forceRender])

  const isPublicView = PUBLIC_VIEWS.has(view.name) || view.name === "login"

  if (!sessionChecked && !isPublicView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-grid">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-emerald-400 font-mono text-xs">GX</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">INITIALIZING SECURE SESSION...</p>
        </div>
      </div>
    )
  }

  // If logged in and view is a public page (home/impact/contact), still show the app shell
  // so the user can navigate back to their dashboard via the sidebar.
  // If NOT logged in:
  //   - "login" view → show AuthScreen (full-screen, has its own header)
  //   - public views (home/impact/contact) → show PublicPageShell with header + footer
  //   - any other view → remember where the user was trying to go (pendingView)
  //     and show AuthScreen. After login, AuthScreen redirects them back to
  //     pendingView instead of the role dashboard.
  if (!session) {
    if (view.name === "login") {
      return <AuthScreen />
    }
    if (PUBLIC_VIEWS.has(view.name)) {
      return (
        <PublicPageShell>
          <ViewRouter />
        </PublicPageShell>
      )
    }
    // Protected view, not logged in → remember the intended destination
    // (if not already set) and show the login screen. We use a microtask
    // to avoid setState during render.
    if (!pendingView) {
      Promise.resolve().then(() => setPendingView(view))
    }
    return <AuthScreen />
  }

  // Logged in: if user explicitly navigates to a public view, show it with public shell
  // BUT: if the view is still the default "home" and the user just logged in,
  // redirect to their role-appropriate dashboard instead.
  if (session && view.name === "home") {
    // Auto-redirect to role dashboard on first load after login
    const role = (session as any)?.user?.role
    const targetView: string = role === "ADMIN" ? "admin" : role === "INSTRUCTOR" ? "instructor" : "dashboard"
    if ((view.name as string) !== targetView) {
      // Use a microtask to avoid setState during render
      Promise.resolve().then(() => {
        useAppStore.getState().navigate({ name: targetView as any })
      })
    }
  }

  if (PUBLIC_VIEWS.has(view.name) && view.name !== "home") {
    return (
      <PublicPageShell>
        <ViewRouter />
      </PublicPageShell>
    )
  }

  // If logged in and view is "home" (shouldn't happen after redirect above, but fallback)
  if (session && view.name === "home") {
    return (
      <AppShell>
        <ViewRouter />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <ViewRouter />
      </ErrorBoundary>
    </AppShell>
  )
}
