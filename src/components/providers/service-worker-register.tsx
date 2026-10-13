"use client"

import * as React from "react"

/**
 * Registers the GuardianX service worker on the client.
 *
 * - Runs once after mount in production AND dev (so PWA installability works
 *   in the preview environment).
 * - Listens for the `controllerchange` event and hands over to update-ux
 *   when a new version takes control: reload immediately if the tab is
 *   hidden (invisible), otherwise show a "Reload" toast and defer until
 *   the tab next goes hidden - a visible user is never interrupted by a
 *   sudden refresh (the SW itself calls skipWaiting + clients.claim on
 *   activate).
 * - Proactively checks for worker updates every 10 minutes, when the tab
 *   becomes visible again, and when the network returns. This matters
 *   because GuardianX is a long-lived pushState SPA: without a full page
 *   navigation, the browser gets almost no natural chances to re-fetch
 *   sw.js - a tab opened before a fix shipped could otherwise stay wedged
 *   on the old worker indefinitely.
 */

import { requestUpdateReload } from "@/components/platform/update-ux"

const UPDATE_POLL_MS = 10 * 60 * 1000

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Register the SW in both dev and production so PWA installability works
    // in the preview environment. The SW provides offline caching + makes the
    // app installable on mobile/desktop.

    const onControllerChange = () => {
      // New worker took control. update-ux decides how to apply it: silent
      // reload when hidden, toast + defer when visible. Its shared
      // sessionStorage guard also stands down if VersionWatch reloaded us
      // moments ago for the same deploy.
      requestUpdateReload()
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
