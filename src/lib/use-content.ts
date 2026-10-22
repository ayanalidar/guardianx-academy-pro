"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

/**
 * Fetch all editable content for a given page (e.g. "home", "global", "contact").
 * Returns the shape: { page, sections: { [section]: { [key]: value } } }
 *
 * FRESHNESS CONTRACT (v2 - "admin edits must ALWAYS reach the browser"):
 *
 *  1. Instant paint: a localStorage copy renders immediately on mount so
 *     pages never flash empty while the CMS API responds.
 *  2. ALWAYS refetch in the background on mount AND on window focus.
 *     (v1 had refetchOnMount:false + refetchOnWindowFocus:false with the
 *     localStorage copy as initialData - the "background refetch to pick up
 *     admin edits" the old comment promised literally never ran, so Content
 *     Studio edits could stay invisible for a whole session. That is the
 *     bug behind "I did it but the changes don't reflect anywhere".)
 *  3. Cross-tab live sync: Content Studio save calls bustCmsCache(), which
 *     deletes the localStorage copy - the deletion fires a `storage` event
 *     in every OTHER open tab, which invalidates the react-query cache there
 *     so mounted views refetch and re-render with the edit immediately.
 *
 * The refetches are cheap: the payload is a few KB of JSON from a colocated
 * DB, and identical responses no longer rewrite localStorage (see
 * writeCache), so tabs cannot ping-pong storage events at each other.
 */

const CACHE_PREFIX = "gx-cms:"
const CACHE_TTL = 5 * 60 * 1000 // instant-paint copy max age

function readCache(page: string): any | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + page)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > CACHE_TTL) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(page: string, data: any) {
  if (typeof window === "undefined") return
  try {
    const next = JSON.stringify({ ts: Date.now(), data })
    // Skip no-op writes: identical payloads must not fire `storage` events
    // in other tabs, or focused/refreshing tabs would ping-pong refetches.
    if (localStorage.getItem(CACHE_PREFIX + page) === next) return
    localStorage.setItem(CACHE_PREFIX + page, next)
  } catch {
    // ignore quota errors
  }
}

/**
 * Drop the CMS instant-paint copy after an admin edit.
 *
 * Called by Content Studio on every successful save / seed / fill-missing.
 * - Same tab: the caller also invalidates ["cms-content"] queries directly.
 * - Other tabs: the localStorage deletion fires a `storage` event there;
 *   usePageContent()'s listener invalidates their react-query cache, so any
 *   mounted public view refetches and re-renders with the edit LIVE.
 */
export function bustCmsCache(page?: string) {
  if (typeof window === "undefined") return
  try {
    if (page) {
      localStorage.removeItem(CACHE_PREFIX + page)
      return
    }
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_PREFIX)) doomed.push(k)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
  } catch {
    // localStorage unavailable - non-fatal; always-refetch covers it.
  }
}

export function usePageContent(page: string) {
  const queryClient = useQueryClient()

  // Read cached data synchronously for instant initial render
  const initialData = React.useMemo(() => readCache(page), [page])

  // Cross-tab live sync: another tab's Content Studio save deleted its
  // gx-cms:* key - that deletion surfaces here as a storage event with
  // newValue === null. Drop our react-query copy so every mounted view
  // refetches from the API (the source of truth) and re-renders.
  // NOTE: only DELETIONS trigger this - no-op writes are already filtered
  // out in writeCache, so tabs can never ping-pong each other.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(CACHE_PREFIX)) return
      if (e.newValue !== null) return
      queryClient.invalidateQueries({ queryKey: ["cms-content"] })
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [queryClient])

  return useQuery({
    queryKey: ["cms-content", page],
    queryFn: async () => {
      const res = await fetch(`/api/cms/${page}`)
      if (!res.ok) return null
      const data = await res.json()
      writeCache(page, data)
      return data
    },
    initialData,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    // ALWAYS refetch in the background on mount and on tab focus - the
    // instant-paint copy covers perceived performance, the refetch covers
    // correctness. This is what makes Content Studio edits "just show up".
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  })
}

/**
 * Safely get a string value from CMS data.
 */
export function getContent(
  data: any,
  section: string,
  key: string,
  fallback = ""
): string {
  const v = data?.sections?.[section]?.[key]
  return typeof v === "string" ? v : fallback
}

/**
 * Safely get an array value from CMS data.
 */
export function getContentArray<T = any>(
  data: any,
  section: string,
  key: string,
  fallback: T[] = []
): T[] {
  const v = data?.sections?.[section]?.[key]
  return Array.isArray(v) ? (v as T[]) : fallback
}

/**
 * Safely get any (object | primitive) value from CMS data.
 */
export function getContentValue<T = any>(
  data: any,
  section: string,
  key: string,
  fallback: T
): T {
  const v = data?.sections?.[section]?.[key]
  return v === undefined ? fallback : (v as T)
}
