"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

/**
 * Fetch all editable content for a given page (e.g. "home", "global", "contact").
 * Returns the shape: { page, sections: { [section]: { [key]: value } } }
 *
 * Uses localStorage cache for instant initial render, then refetches in
 * the background to pick up admin edits. This eliminates the "text loads
 * late" problem where the page waits for the CMS API before showing
 * fallback content.
 */

const CACHE_PREFIX = "gx-cms:"
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
    localStorage.setItem(CACHE_PREFIX + page, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // ignore quota errors
  }
}

export function usePageContent(page: string) {
  // Read cached data synchronously for instant initial render
  const initialData = React.useMemo(() => readCache(page), [page])

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
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
