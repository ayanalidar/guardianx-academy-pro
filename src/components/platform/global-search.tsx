"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, Users, Calendar, Route, FlaskConical, Search, X, Loader2,
} from "lucide-react"
import { useAppStore, type View } from "@/store/app-store"
import { cn } from "@/lib/utils"

/* ============================================================
   GlobalSearch — debounced, keyboard-navigable, grouped results
   ------------------------------------------------------------
   - 300ms debounce on input changes
   - Calls GET /api/search?q=<query>
   - Renders a dropdown with results grouped by type, each group
     gets its own icon (BookOpen/Users/Calendar/Route/FlaskConical)
   - Clicking a result navigates via the hash router
   - Escape closes; Enter triggers search (focuses first result)
   - Closes on outside-click + on `blur` after a short delay
   ============================================================ */

type CourseHit = {
  id: string
  title: string
  shortName: string
  description: string
  category: string
  level: string
  tags: string
  thumbnail: string | null
}
type InstructorHit = {
  id: string
  name: string
  title: string | null
  bio: string | null
  avatar: string | null
}
type EventHit = {
  id: string
  slug: string
  title: string
  description: string
  type: string
  startDate: string
  venue: string
}
type PathHit = {
  id: string
  slug: string
  title: string
  description: string
  difficulty: string
  duration: string
}
type LabHit = {
  id: string
  title: string
  slug: string
  description: string
  category: string
  difficulty: string
  tags: string
}

type SearchResponse = {
  courses: CourseHit[]
  instructors: InstructorHit[]
  events: EventHit[]
  paths: PathHit[]
  labs: LabHit[]
  total: number
  query: string
}

const GROUPS: Array<{
  key: keyof Omit<SearchResponse, "total" | "query">
  label: string
  icon: React.ComponentType<{ className?: string }>
  tint: string
}> = [
  { key: "courses", label: "Courses", icon: BookOpen, tint: "text-emerald-300" },
  { key: "instructors", label: "Instructors", icon: Users, tint: "text-violet-300" },
  { key: "events", label: "Events", icon: Calendar, tint: "text-amber-300" },
  { key: "paths", label: "Learning Paths", icon: Route, tint: "text-cyan-300" },
  { key: "labs", label: "Labs", icon: FlaskConical, tint: "text-rose-300" },
]

const MIN_QUERY = 2

export function GlobalSearch({ className }: { className?: string }) {
  const { navigate } = useAppStore()
  const [query, setQuery] = React.useState("")
  const [debounced, setDebounced] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [highlightIdx, setHighlightIdx] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---------- ⌘K / Ctrl+K keyboard shortcut (focus + open) ---------- */
  React.useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
        // Focus after the input is visible
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    window.addEventListener("keydown", onKeydown)
    return () => window.removeEventListener("keydown", onKeydown)
  }, [])

  /* ---------- debounce 300ms ---------- */
  React.useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebounced(query.trim())
    }, 300)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [query])

  /* ---------- query (only fires when debounced has MIN_QUERY chars) ---------- */
  const enabled = debounced.length >= MIN_QUERY
  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ["global-search", debounced],
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}&limit=6`)
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
  })

  // Build a flat list of results so keyboard nav can step through all of them.
  const flatResults = React.useMemo(() => {
    if (!data) return []
    const flat: Array<{ type: typeof GROUPS[number]["key"]; item: any }> = []
    for (const g of GROUPS) {
      const list = data[g.key] as any[]
      for (const item of list) {
        flat.push({ type: g.key, item })
      }
    }
    return flat
  }, [data])

  const hasResults = flatResults.length > 0
  const total = data?.total ?? 0

  /* ---------- open/close behaviour ---------- */
  React.useEffect(() => {
    if (debounced.length >= MIN_QUERY) setOpen(true)
    else setOpen(false)
  }, [debounced])

  React.useEffect(() => {
    setHighlightIdx(0)
  }, [debounced])

  /* ---------- outside-click ---------- */
  React.useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [])

  /* ---------- keyboard ---------- */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlightIdx((i) => Math.min(flatResults.length - 1, i + 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(0, i - 1))
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (hasResults && flatResults[highlightIdx]) {
        const { type, item } = flatResults[highlightIdx]
        handleNavigate(type, item)
      }
      return
    }
  }

  /* ---------- navigate to a hit ---------- */
  function handleNavigate(type: typeof GROUPS[number]["key"], item: any) {
    let targetView: View
    switch (type) {
      case "courses":
        targetView = { name: "course", courseId: item.id }
        break
      case "instructors":
        targetView = { name: "instructor-detail", instructorId: item.id }
        break
      case "events":
        targetView = { name: "event-detail", eventSlug: item.slug }
        break
      case "paths":
        targetView = { name: "learning-paths" }
        break
      case "labs":
        targetView = { name: "lab", labSlug: item.slug }
        break
    }
    navigate(targetView)
    setOpen(false)
    setQuery("")
    setDebounced("")
    inputRef.current?.blur()
  }

  function onFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    if (debounced.length >= MIN_QUERY) setOpen(true)
  }

  function onBlur() {
    // Delay so click events on results fire before close
    blurTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function clear() {
    setQuery("")
    setDebounced("")
    setOpen(false)
    inputRef.current?.focus()
  }

  /* ---------- render ---------- */
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search input */}
      <div
        className={cn(
          "group flex items-center gap-2 h-9 lg:h-10 px-3 rounded-xl border transition-all",
          open
            ? "bg-background/80 border-violet-500/40 shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
            : "bg-background/40 border-border/60 hover:border-border hover:bg-background/60",
        )}
      >
        <Search
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            open ? "text-violet-300" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search courses, labs, instructors…"
          aria-label="Global search"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="global-search-results"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-xs lg:text-sm outline-none placeholder:text-muted-foreground/70 min-w-0"
        />
        {/* Loading spinner */}
        {isFetching && (
          <Loader2 className="h-3.5 w-3.5 text-violet-300 animate-spin shrink-0" aria-hidden />
        )}
        {/* Clear button */}
        {query && !isFetching && (
          <button
            onClick={clear}
            type="button"
            aria-label="Clear search"
            className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {/* Keyboard hint */}
        {!query && (
          <kbd
            className="hidden md:inline-flex h-4 px-1.5 items-center text-[9px] font-mono text-muted-foreground/60 border border-border/60 rounded shrink-0"
            aria-hidden
          >
            ⌘K / Ctrl K
          </kbd>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="global-search-results"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-0 right-0 top-full mt-2 z-50",
              "max-h-[min(70vh,560px)] overflow-y-auto",
              "glass-strong rounded-xl border border-border/60 shadow-2xl",
              "w-[min(92vw,30rem)] max-w-none",
            )}
          >
            {debounced.length < MIN_QUERY ? (
              <div className="p-6 text-center">
                <Search className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Type at least {MIN_QUERY} characters to search across courses, labs, instructors, events, and paths.
                </p>
              </div>
            ) : isFetching && !data ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-lg bg-muted/50" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 rounded bg-muted/50" />
                      <div className="h-2.5 w-1/2 rounded bg-muted/40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasResults ? (
              <div className="p-6 text-center">
                <Search className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No results for <span className="font-mono text-foreground">"{debounced}"</span>
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Try searching for a course name, lab topic, instructor, or event.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {/* Result count footer */}
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between">
                  <span>{total} results</span>
                  <span className="flex items-center gap-1">
                    <kbd className="h-4 px-1 inline-flex items-center text-[9px] border border-border/60 rounded">↑↓</kbd>
                    <span className="opacity-70">navigate</span>
                    <kbd className="h-4 px-1 inline-flex items-center text-[9px] border border-border/60 rounded">↵</kbd>
                    <span className="opacity-70">open</span>
                  </span>
                </div>

                {/* Grouped results */}
                {GROUPS.map((g) => {
                  const list = (data?.[g.key] as any[]) ?? []
                  if (list.length === 0) return null
                  const Icon = g.icon
                  return (
                    <div key={g.key} className="mb-1 last:mb-0">
                      {/* Group header */}
                      <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 sticky top-0 bg-background/60 backdrop-blur-sm">
                        <Icon className={cn("h-3 w-3", g.tint)} />
                        <span>{g.label}</span>
                        <span className="ml-auto opacity-60">{list.length}</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-0.5">
                        {list.map((item) => {
                          const flatIdx = flatResults.findIndex(
                            (r) => r.type === g.key && r.item.id === item.id,
                          )
                          const highlighted = flatIdx === highlightIdx
                          return (
                            <button
                              key={`${g.key}-${item.id}`}
                              type="button"
                              role="option"
                              aria-selected={highlighted}
                              onMouseEnter={() => setHighlightIdx(flatIdx)}
                              onClick={() => handleNavigate(g.key, item)}
                              className={cn(
                                "w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition-colors",
                                highlighted
                                  ? "bg-violet-500/10 ring-1 ring-violet-500/20"
                                  : "hover:bg-accent/40",
                              )}
                            >
                              {/* Per-type icon */}
                              <div className={cn(
                                "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center",
                                highlighted ? "bg-violet-500/20" : "bg-muted/40",
                              )}>
                                <Icon className={cn("h-3.5 w-3.5", g.tint)} />
                              </div>
                              {/* Text */}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground leading-snug truncate">
                                  {item.title ?? item.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {g.key === "courses" && `${(item as CourseHit).shortName} · ${(item as CourseHit).level} · ${(item as CourseHit).category}`}
                                  {g.key === "instructors" && (item as InstructorHit).title}
                                  {g.key === "events" && `${(item as EventHit).type} · ${(item as EventHit).startDate || (item as EventHit).venue}`}
                                  {g.key === "paths" && `${(item as PathHit).difficulty} · ${(item as PathHit).duration}`}
                                  {g.key === "labs" && `${(item as LabHit).difficulty} · ${(item as LabHit).category}`}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
