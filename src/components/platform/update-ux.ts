/**
 * Shared "new version available" UX for the whole SPA.
 *
 * Problem it solves: after every deploy, returning users were hit with a
 * hard `location.reload()` seconds after opening the site (VersionWatch's
 * build-id check and/or the service-worker controller swap). With frequent
 * deploys this meant the site "auto refreshes" right in front of the user.
 *
 * New policy - NEVER reload a tab the user is actively looking at:
 *   - Tab HIDDEN (background tab / switched app) → reload immediately.
 *     Invisible to the user, and they come back to the fresh build.
 *   - Tab VISIBLE → show one non-blocking toast ("Reload" action) and defer
 *     the reload until the tab is hidden next. Real breakage from stale
 *     chunks is still rescued separately by the chunk-error guard in
 *     layout.tsx / chunk-guard.ts, so deferring is safe.
 *
 * Single module-level state + one shared sessionStorage guard key means the
 * two callers (VersionWatch, ServiceWorkerRegister) can never double-toast
 * or double-reload for the same deploy.
 */

import { toast } from "sonner"

const RELOAD_GUARD_KEY = "gx_update_reload_at"
const MIN_RELOAD_GAP_MS = 15_000

let pending = false
let listenerBound = false
let toastShown = false

function reloadNow(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
    if (Date.now() - last < MIN_RELOAD_GAP_MS) return false
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    /* storage blocked - proceed, one reload is harmless */
  }
  window.location.reload()
  return true
}

function onVisibilityChange() {
  if (!pending) return
  if (document.visibilityState !== "hidden") return
  pending = false
  reloadNow()
}

/**
 * Ask update-ux to apply a newly deployed build.
 * Callers may invoke this on every poll tick / SW event - duplicates are
 * collapsed internally.
 */
export function requestUpdateReload(): void {
  if (typeof window === "undefined") return

  if (document.visibilityState === "hidden") {
    // User isn't looking - apply silently.
    pending = false
    reloadNow()
    return
  }

  // Visible: defer until the tab goes hidden, and tell the user once.
  pending = true
  if (!listenerBound) {
    listenerBound = true
    document.addEventListener("visibilitychange", onVisibilityChange)
  }
  if (!toastShown) {
    toastShown = true
    toast("A new version of GuardianX is ready", {
      description: "It will load automatically - or reload now.",
      action: {
        label: "Reload",
        onClick: () => {
          pending = false
          reloadNow()
        },
      },
      duration: 10_000,
    })
  }
}
