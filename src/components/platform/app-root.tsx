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
 *   - Re-fetches the session only when we have none (post-login flow).
 *     Per-tap session refetches were removed: each one added a serverless
 *     roundtrip to every navigation.
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
import { roleHomeFor } from "@/lib/nav-data"
import { startIdlePreload, attachIntentPrefetch } from "@/lib/view-preloader"

export function AppRoot({ initialView }: { initialView?: View }) {
  const { view, pendingView, setPendingView } = useAppStore()
  const [session, setSession] = React.useState<any>(null)
  const [sessionChecked, setSessionChecked] = React.useState(false)
  const [, forceRender] = React.useState(0)

  // Mirror of `session` readable from event handlers (stale-closure safe)
  // plus a throttle timestamp so rapid navigation never spams the endpoint.
  const sessionRef = React.useRef<any>(null)
  const lastSessionFetchAt = React.useRef(0)

  /** Fetch the session once, unless one is already known or we fetched
   *  within the last 5s. `force` bypasses both guards. */
  const fetchSession = React.useCallback((force = false) => {
    const now = Date.now()
    if (!force && (sessionRef.current || now - lastSessionFetchAt.current < 5000)) return
    lastSessionFetchAt.current = now
    fetch("/api/auth/session", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        const next = data?.user ? data : null
        sessionRef.current = next
        setSession(next)
        setSessionChecked(true)
      })
      .catch(() => {
        sessionRef.current = null
        setSession(null)
        setSessionChecked(true)
      })
  }, [])

  // Listen for navigation events. Re-check the session ONLY when we don't
  // already have one — that is exactly the post-login flow (signIn() sets
  // the cookie, then auth-screen calls navigate()). Logged-in taps no
  // longer pay a serverless roundtrip per navigation.
  // NOTE: the refetch is FORCED when we have no session yet — the 5s
  // throttle previously swallowed the post-login refetch (login → navigate
  // happened within 5s of the mount fetch), leaving `session` null and
  // bouncing the fresh-logged-in user back to the auth/home screens.
  React.useEffect(() => {
    const handler = () => {
      forceRender((v: number) => v + 1)
      if (!sessionRef.current) fetchSession(true)
      else fetchSession()
    }
    window.addEventListener("guardianx-navigate", handler)
    return () => window.removeEventListener("guardianx-navigate", handler)
  }, [fetchSession])

  // Cross-component session signal: auth screens dispatch this right after
  // signIn() resolves so the shell refetches immediately (belt-and-braces
  // with the forced navigate refetch above).
  React.useEffect(() => {
    const handler = () => fetchSession(true)
    window.addEventListener("guardianx-session-changed", handler)
    return () => window.removeEventListener("guardianx-session-changed", handler)
  }, [fetchSession])

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

  // Check the session ONCE on mount (via fetch instead of the useSession
  // hook — avoids CLIENT_FETCH_ERROR blocking). Post-login refreshes are
  // handled by the navigate listener above; sign-out does a full reload.
  React.useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Warm every view chunk during idle time + prefetch on hover/touch
  // intent. Together they make taps render instantly instead of paying
  // a chunk-download roundtrip on first visit to each view.
  React.useEffect(() => {
    startIdlePreload()
    return attachIntentPrefetch()
  }, [])

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
          <ErrorBoundary>
            <ViewRouter />
          </ErrorBoundary>
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
  // BUT: role separation — if the view is still the default "home", or a staff
  // member somehow landed on the student "dashboard", redirect to their
  // role-appropriate dashboard. (Reverse cases — e.g. a student opening an
  // admin view — are handled by RoleGate panels in the ViewRouter.)
  if (session) {
    const role = (session as any)?.user?.role
    const roleHome: string = roleHomeFor(role)
    const strayStudentDashboard = view.name === "dashboard" && roleHome !== "dashboard"
    if ((view.name === "home" || strayStudentDashboard) && (view.name as string) !== roleHome) {
      // Use a microtask to avoid setState during render
      Promise.resolve().then(() => {
        useAppStore.getState().navigate({ name: roleHome as any })
      })
    }
  }

  if (PUBLIC_VIEWS.has(view.name) && view.name !== "home") {
    return (
      <PublicPageShell>
        <ErrorBoundary>
          <ViewRouter />
        </ErrorBoundary>
      </PublicPageShell>
    )
  }

  // If logged in and view is "home" (shouldn't happen after redirect above, but fallback)
  if (session && view.name === "home") {
    return (
      <AppShell>
        <ErrorBoundary>
          <ViewRouter />
        </ErrorBoundary>
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
