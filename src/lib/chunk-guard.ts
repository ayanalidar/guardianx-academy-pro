"use client"

/**
 * ChunkGuard - self-healing for failed lazy-chunk loads.
 *
 * The SPA loads every view as a lazy chunk. If one of those fetches fails
 * PERMANENTLY (a deploy racing a long-lived tab so a hashed chunk 404s, a
 * network blip, a proxy hiccup), React.lazy caches the rejection and the
 * view can never render in that tab - the user sees a skeleton or blank
 * area and describes it as "the page doesn't load unless I refresh".
 *
 * ViewRouter loaders already retry transient failures (withChunkRetry);
 * this guard is the LAST-RESORT layer for what survives that: it listens
 * for chunk-load errors globally and performs a single rate-limited reload
 * (max one per 60s per tab), which fetches fresh HTML + the new chunk
 * graph. Without this, the only recovery was the user manually refreshing.
 */

const RELOAD_KEY = "gx-chunk-reload-at"
const RELOAD_COOLDOWN_MS = 60_000

function isChunkErrorText(text: string): boolean {
  if (!text) return false
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    text
  )
}

function maybeReload(rawMessage: string) {
  if (typeof window === "undefined") return
  if (!isChunkErrorText(rawMessage)) return
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0)
    const now = Date.now()
    if (now - last < RELOAD_COOLDOWN_MS) return
    window.sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    // sessionStorage unavailable (private mode) - still reload, but this
    // could loop if chunks keep failing; accept the trade-off since the
    // cooldown write failing usually means reads fail too (fresh context).
  }
  window.location.reload()
}

let installed = false

export function installChunkGuard() {
  if (typeof window === "undefined" || installed) return
  installed = true

  // Uncaught exceptions from failed dynamic imports bubble here.
  window.addEventListener(
    "error",
    (e) => {
      const err = e as ErrorEvent
      const msg = err?.error?.message || err?.message || ""
      maybeReload(msg)
    },
    true
  )

  // Unhandled promise rejections: React.lazy throws async - many chunk
  // failures surface here instead of the error event.
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent)?.reason
    const msg =
      (reason && typeof reason === "object" && "message" in reason
        ? String((reason as Error).message)
        : String(reason ?? ""))
    maybeReload(msg)
  })
}
