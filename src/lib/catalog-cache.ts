"use client"

/**
 * LocalStorage-backed catalog cache — the "last good catalog" snapshot.
 *
 * Why: a momentary network blip (preview-proxy hiccup, watchdog repair
 * restart, tunnel jitter) used to blank the course catalog behind an
 * error screen even though the user saw the full catalog seconds ago.
 * Every successful /api/courses response is snapshotted here; the catalog
 * view seeds react-query with it (instant paint) and falls back to it
 * (with a reconnect banner) whenever a refetch fails.
 *
 * Keep-alive rules:
 *  - One storage entry, keyed per filter combination (query/sort/filters)
 *  - LRU-capped entries, 24h age limit, all failures silently ignored
 *  - SSR-safe (no window -> no-op)
 */

const STORAGE_KEY = "gx-catalog-cache-v1"
const MAX_ENTRIES = 8
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000

type CacheEntry = { ts: number; data: unknown }
type CacheMap = Record<string, CacheEntry>

function readMap(): CacheMap {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as CacheMap
  } catch {
    return {}
  }
}

function writeMap(map: CacheMap) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Quota exceeded / private mode — the cache is best-effort, ignore.
  }
}

/** Stable cache key from a react-query queryKey (strings + primitives). */
export function catalogCacheKey(parts: readonly unknown[]): string {
  return parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join("|")
}

export function saveCatalog(key: string, data: unknown) {
  if (typeof window === "undefined" || !data) return
  const map = readMap()
  map[key] = { ts: Date.now(), data }
  // LRU prune to MAX_ENTRIES most-recent keys
  const pruned = Object.entries(map)
    .sort((a, b) => b[1].ts - a[1].ts)
    .slice(0, MAX_ENTRIES)
  writeMap(Object.fromEntries(pruned))
}

export function readCatalog<T>(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | null {
  const hit = readMap()[key]
  if (!hit || typeof hit.ts !== "number") return null
  if (Date.now() - hit.ts > maxAgeMs) return null
  return (hit.data as T) ?? null
}
