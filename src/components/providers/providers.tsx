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
