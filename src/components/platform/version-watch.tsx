"use client"

import * as React from "react"

/**
 * VersionWatch - client-side self-healing for stale bundles.
 *
 * Problem this solves: the app is a long-lived SPA (pushState navigation,
 * no reloads). After a server redeploy, every already-open browser tab
 * kept running the OLD JavaScript - old caching behavior, old views, old
 * bugs - while the server had moved on. Users saw symptoms like "courses
 * are gone" that had already been fixed server-side, because their tab
 * never picked up the fix.
 *
 * Mechanism: poll /api/health (cheap, no-store) and compare `buildId`
 * against the one this bundle was loaded with. On mismatch → hand over to
 * update-ux, which reloads IMMEDIATELY if the tab is hidden (invisible to
 * the user) and otherwise shows a "Reload" toast + defers the reload until
 * the tab next goes hidden. A visible user is never interrupted by a
 * sudden refresh. Guards against reload loops via sessionStorage
 * timestamps (shared with the SW swap path). Also re-checks when the
 * browser comes back online.
 *
 * Renders nothing.
 */

import { requestUpdateReload } from "@/components/platform/update-ux"

const STORE_KEY = "gx_build_id"
const POLL_MS = 60 * 1000

export function VersionWatch() {
  React.useEffect(() => {
    if (typeof window === "undefined") return

    let consecutiveFailures = 0
    let stopped = false

    const check = async () => {
      if (stopped) return
      try {
        const res = await fetch("/api/health", {
          credentials: "include",
          headers: { accept: "application/json" },
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        consecutiveFailures = 0
        const buildId: string | null = data?.buildId ?? null
        if (!buildId) return

        const known = window.localStorage.getItem(STORE_KEY)
        if (known && known !== buildId) {
          // New build deployed under this tab. update-ux decides how to
          // apply it: silent reload when hidden, toast + defer when visible.
          window.localStorage.setItem(STORE_KEY, buildId)
          requestUpdateReload()
          return
        }
        window.localStorage.setItem(STORE_KEY, buildId)
      } catch {
        consecutiveFailures += 1
        // Server unreachable - nothing to do here; the host watchdog owns
        // restarts. When it comes back with the same buildId we simply
        // stop failing; if the restart shipped a NEW build, the next
        // successful check triggers the reload path above.
      }
    }

    const onOnline = () => { check() }
    window.addEventListener("online", onOnline)

    // First check after the app has settled, then poll.
    const t0 = setTimeout(check, 8000)
    const interval = setInterval(check, POLL_MS)

    return () => {
      stopped = true
      clearTimeout(t0)
      clearInterval(interval)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  return null
}
