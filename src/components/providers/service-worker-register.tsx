"use client"

import * as React from "react"

/**
 * Registers the GuardianX service worker on the client.
 *
 * - Runs once after mount in production AND dev (so PWA installability works
 *   in the preview environment).
 * - Listens for the `controllerchange` event and reloads once when a new
 *   version takes control, so markup/JS never disagree with the controlling
 *   worker (the SW itself calls skipWaiting + clients.claim on activate).
 * - Proactively checks for worker updates every 10 minutes, when the tab
 *   becomes visible again, and when the network returns. This matters
 *   because GuardianX is a long-lived pushState SPA: without a full page
 *   navigation, the browser gets almost no natural chances to re-fetch
 *   sw.js - a tab opened before a fix shipped could otherwise stay wedged
 *   on the old worker indefinitely.
 */

const SW_RELOAD_GUARD_KEY = "gx_sw_reload_at"
const MIN_SW_RELOAD_GAP_MS = 15_000
const UPDATE_POLL_MS = 10 * 60 * 1000

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Register the SW in both dev and production so PWA installability works
    // in the preview environment. The SW provides offline caching + makes the
    // app installable on mobile/desktop.

    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      // Guard against pathological reload loops: if something already
      // reloaded us because of a SW swap moments ago, stand down.
      try {
        const last = Number(window.sessionStorage.getItem(SW_RELOAD_GUARD_KEY) ?? 0)
        if (Date.now() - last < MIN_SW_RELOAD_GAP_MS) return
        window.sessionStorage.setItem(SW_RELOAD_GUARD_KEY, String(Date.now()))
      } catch { /* storage blocked - proceed, one reload is harmless */ }
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    const cleanups: Array<() => void> = []

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage?.({ type: "SKIP_WAITING" })
            }
          })
        })

        const checkForUpdate = () => {
          try { reg.update().catch(() => undefined) } catch { /* ignore */ }
        }
        const interval = setInterval(checkForUpdate, UPDATE_POLL_MS)
        cleanups.push(() => clearInterval(interval))

        // Come back from background → re-check (mobile tabs live for days).
        const onVisible = () => {
          if (document.visibilityState === "visible") checkForUpdate()
        }
        document.addEventListener("visibilitychange", onVisible)
        cleanups.push(() => document.removeEventListener("visibilitychange", onVisible))

        // Network returned → the server may have moved on while we were offline.
        window.addEventListener("online", checkForUpdate, { passive: true })
        cleanups.push(() => window.removeEventListener("online", checkForUpdate))

        // First check shortly after load, not just on the poll tick.
        const first = setTimeout(checkForUpdate, 15_000)
        cleanups.push(() => clearTimeout(first))
      } catch (err) {
        console.warn("[GuardianX PWA] Service worker registration failed:", err)
      }
    }
    register()

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      cleanups.forEach((fn) => { try { fn() } catch { /* ignore */ } })
    }
  }, [])

  return null
}
