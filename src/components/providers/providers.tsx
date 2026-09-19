"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GamificationToaster } from "@/components/providers/gamification-toaster"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Global session-change hook: when an auth screen signs a user in/out it
  // dispatches "guardianx-session-changed". Without this, the [me] query
  // keeps serving the PRE-LOGIN `{ user: null }` response (cached by the
  // login page, fresh for 30s, window-focus refetch disabled) for the
  // lifetime of the SPA session — dashboards then render "Operator" with
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
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
