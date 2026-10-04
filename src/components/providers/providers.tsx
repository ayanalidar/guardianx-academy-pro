"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GamificationToaster } from "@/components/providers/gamification-toaster"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"
import { installChunkGuard } from "@/lib/chunk-guard"
import { VersionWatch } from "@/components/platform/version-watch"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        // 401 RECOVERY: a single unauthorized response (expired server-side
        // session, auth hiccup during a deploy, race right after sign-in)
        // used to leave a query permanently errored - the view rendered its
        // empty state and ONLY a full refresh recovered. On any 401 we now
        // (a) ask AppRoot to force a session re-check - if the session is
        // genuinely gone the shell flips to the auth screen (correct), if
        // it was transient the session stays and the navigation sweeps +
        // remount refetches heal the data, and (b) invalidate [me] so
        // every useUser() consumer re-syncs immediately.
        queryCache: new QueryCache({
          onError: (error) => {
            const status = (error as { status?: number })?.status
            if (status !== 401) return
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("guardianx-auth-hiccup"))
            }
            queryClient.invalidateQueries({ queryKey: ["me"] })
          },
        }),
        defaultOptions: {
          queries: {
            // Self-healing defaults: data is fresh for 30s, then refetched
            // on remount/window focus/reconnect. refetchOnWindowFocus was
            // previously disabled, which let a stale response (e.g. a
            // pre-login `{ user: null }` or a transient failure) stick for
            // the lifetime of the SPA - the "courses don't show" bug.
            staleTime: 30 * 1000,
            // Keep unused query payloads alive for 10 minutes (default was
            // 5). Going BACK to a recently visited view then renders
            // instantly from cache while a background refresh runs -
            // navigation feels immediate without changing freshness rules
            // (staleTime above still governs when data counts as fresh).
            gcTime: 10 * 60 * 1000,
            // Smart retry: never retry client errors (4xx are real answers,
            // e.g. 402 checkout-required); retry network/5xx failures up to
            // 2 more times with exponential backoff so a momentary blip or
            // a watchdog repair window never surfaces an error screen.
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status
              if (status && status >= 400 && status < 500) return false
              return failureCount < 2
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      })
  )

  React.useEffect(() => {
    // Last-resort self-heal: if a lazy view chunk permanently fails to
    // load (deploy racing a long-lived tab, network blip), reload once so
    // the tab recovers itself instead of showing a skeleton forever.
    installChunkGuard()
  }, [])

  // Global session-change hook: when an auth screen signs a user in/out it
  // dispatches "guardianx-session-changed". Without this, queries keep
  // serving responses that were fetched under the PREVIOUS auth state
  // (e.g. the pre-login `{ user: null }` cached by the login page, or the
  // anonymous/empty shape of any list endpoint) - dashboards then render
  // "Operator" with zero data and every `enabled: !!user?.id` query stays
  // disabled. We invalidate EVERYTHING (not just [me]/[courses]/...): any
  // of the ~90 query keys across the app can hold a pre-login payload, and
  // a blanket invalidation is cheap (mounted queries refetch immediately,
  // unmounted ones simply become stale and refetch on next use).
  React.useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries()
    }
    window.addEventListener("guardianx-session-changed", handler)
    return () => window.removeEventListener("guardianx-session-changed", handler)
  }, [queryClient])

  // NAVIGATION DATA-FRESHNESS GUARANTEE - the fix for "clicking a tab opens
  // it without any data unless I refresh".
  //
  // Every tab tap / CTA / link in the app funnels through navigate() (and
  // back/forward through popstate), all of which dispatch
  // "guardianx-navigate". React-query already refetches queries on mount
  // when they are OLDER than staleTime (30s), but several gaps remained:
  //
  //   1. A query cached within the last 30s was considered FRESH forever on
  //      remount, so a view re-entered quickly showed whatever (possibly
  //      empty) payload it had cached - with no refetch for up to the whole
  //      SPA session if the user never focused another window.
  //   2. A transient failure (401 hiccup, cold-start 5xx, aborted request)
  //      could leave an errored/empty cache entry that the user only cleared
  //      with a full browser refresh.
  //   3. Error retries for 4xx are intentionally disabled (402 checkout
  //      etc.), so one unlucky 401 during a deploy window stuck as "no
  //      data" until refresh.
  //
  // The guarantee: after EVERY navigation we sweep all ACTIVE queries
  // (those with a mounted observer - i.e. the view the user is looking at)
  // that are stale and refetch them in the background. Two sweeps are
  // scheduled because the target view's chunk + queries may mount AFTER
  // the navigation event (lazy import). Both sweeps are idempotent -
  // react-query dedupes in-flight fetches per query key - and cache-first
  // rendering is preserved (data shows instantly, refresh happens
  // behind it), so navigation stays instant while data can never go
  // permanently stale or stuck-empty.
  React.useEffect(() => {
    let timer1: ReturnType<typeof setTimeout> | undefined
    let timer2: ReturnType<typeof setTimeout> | undefined
    const handler = () => {
      const sweep = () => {
        queryClient.refetchQueries({ type: "active", stale: true })
      }
      if (timer1) clearTimeout(timer1)
      if (timer2) clearTimeout(timer2)
      // Sweep 1: right after the store swap (queries already mounted).
      timer1 = setTimeout(sweep, 600)
      // Sweep 2: catch views whose chunk mounted later (slow network,
      // un-preloaded chunk) so their queries are revalidated too.
      timer2 = setTimeout(sweep, 1800)
    }
    window.addEventListener("guardianx-navigate", handler)
    window.addEventListener("popstate", handler)
    return () => {
      window.removeEventListener("guardianx-navigate", handler)
      window.removeEventListener("popstate", handler)
      if (timer1) clearTimeout(timer1)
      if (timer2) clearTimeout(timer2)
    }
  }, [queryClient])

  return (
    <SessionProvider session={null} refetchInterval={0} basePath="/api/auth">
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <GamificationToaster />
          <ServiceWorkerRegister />
          <VersionWatch />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
