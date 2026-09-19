"use client"

import * as React from "react"

/**
 * VersionWatch — client-side self-healing for stale bundles.
 *
 * Problem this solves: the app is a long-lived SPA (pushState navigation,
 * no reloads). After a server redeploy, every already-open browser tab
 * kept running the OLD JavaScript — old caching behavior, old views, old
 * bugs — while the server had moved on. Users saw symptoms like "courses
 * are gone" that had already been fixed server-side, because their tab
 * never picked up the fix.
 *
 * Mechanism: poll /api/health (cheap, no-store) and compare `buildId`
 * against the one this bundle was loaded with. On mismatch → reload once.
 * Guards against reload loops via sessionStorage timestamps. Also
 * re-checks when the browser comes back online.
 *
 * Renders nothing.
 */

const STORE_KEY = "gx_build_id"
const RELOAD_AT_KEY = "gx_build_reload_at"
const POLL_MS = 60 * 1000
const MIN_RELOAD_GAP_MS = 20 * 1000

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
          const last = Number(window.sessionStorage.getItem(RELOAD_AT_KEY) ?? 0)
          if (Date.now() - last > MIN_RELOAD_GAP_MS) {
            window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
            window.localStorage.setItem(STORE_KEY, buildId)
            // New build deployed under this tab → hard reload to pick it up.
            window.location.reload()
          }
          return
        }
        window.localStorage.setItem(STORE_KEY, buildId)
      } catch {
        consecutiveFailures += 1
        // Server unreachable — nothing to do here; the host watchdog owns
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
