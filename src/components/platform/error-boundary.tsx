"use client"

import * as React from "react"
import { captureClientError } from "@/lib/sentry-report"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
    // Relay to Sentry (via /api/telemetry/client-error) when SENTRY_DSN is
    // configured — rate-limited server-side, fire-and-forget.
    captureClientError(error?.message || "React render error", {
      stack: [error?.stack, errorInfo?.componentStack].filter(Boolean).join("\n"),
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <svg className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              The page encountered an error. Try refreshing, or navigate to a different section.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  window.location.href = "/"
                }}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  // Full reload — also dismisses any stale service-worker
                  // state so the next load is guaranteed fresh.
                  window.location.reload()
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
