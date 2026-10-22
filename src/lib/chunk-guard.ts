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
 * for chunk-load errors globally and performs a rate-limited reload, which
 * fetches fresh HTML + the new chunk graph.
 *
 * RELOAD POLICY (v2): up to 3 reloads per rolling 60s window per tab.
 * v1 allowed a single reload, which broke when the first recovery reload
 * landed on ANOTHER still-propagating edge (the user saw the blank page
 * AGAIN and had to refresh manually - "this happens every time you deploy
 * anything"). The hard cap of 3 still makes reload loops impossible.
 */

const RELOAD_KEY = "gx-chunk-reload-at"
const WINDOW_MS = 60_000
const MAX_RELOADS_PER_WINDOW = 3

function isChunkErrorText(text: string): boolean {
  if (!text) return false
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module/i.test(
    text
  )
}

/** Rate-limited recovery reload. Returns true when a reload was performed. */
export function maybeReload(rawMessage: string): boolean {
  if (typeof window === "undefined") return false
  if (!isChunkErrorText(rawMessage)) return false
  try {
    const now = Date.now()
    const raw = window.sessionStorage.getItem(RELOAD_KEY)
    const state = raw ? (JSON.parse(raw) as { t: number; n: number }) : null
    const cur = !state || now - state.t > WINDOW_MS ? { t: now, n: 0 } : state
    if (cur.n >= MAX_RELOADS_PER_WINDOW) return false
    cur.n += 1
    cur.t = now
    window.sessionStorage.setItem(RELOAD_KEY, JSON.stringify(cur))
  } catch {
    // sessionStorage unavailable (private mode) - still reload, but this
    // could loop if chunks keep failing; accept the trade-off since the
    // cooldown write failing usually means reads fail too (fresh context).
  }
  window.location.reload()
  return true
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
