"use client"

import * as React from "react"

/**
 * Registers the GuardianX service worker for offline/PWA support.
 * Renders nothing - it's a side-effect only component.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Only register in production builds to avoid HMR/dev conflicts.
    if (process.env.NODE_ENV !== "production") return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* silent - PWA is an enhancement, not a hard requirement */
        })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
