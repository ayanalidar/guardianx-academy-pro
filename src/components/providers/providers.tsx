"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GamificationToaster } from "@/components/providers/gamification-toaster"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"
import { VersionWatch } from "@/components/platform/version-watch"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Self-healing defaults: data is fresh for 15s, then refetched
            // on remount/window focus/reconnect. refetchOnWindowFocus was
            // previously disabled, which let a stale response (e.g. a
            // pre-login `{ user: null }` or a transient failure) stick for
            // the lifetime of the SPA - the "courses don't show" bug.
            staleTime: 15 * 1000,
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

  // Global session-change hook: when an auth screen signs a user in/out it
  // dispatches "guardianx-session-changed". Without this, the [me] query
  // keeps serving the PRE-LOGIN `{ user: null }` response (cached by the
  // login page, fresh for 30s, window-focus refetch disabled) for the
  // lifetime of the SPA session - dashboards then render "Operator" with
  // zero courses and every `enabled: !!user?.id` query stays disabled.
  React.useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      queryClient.invalidateQueries({ queryKey: ["achievements"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
    }
    window.addEventListener("guardianx-session-changed", handler)
    return () => window.removeEventListener("guardianx-session-changed", handler)
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
