"use client"

/**
 * GlobalSearch → full ⌘K Command Palette (v2).
 *
 * Upgraded from a search-only dropdown to a jump-to-anything palette:
 *   - Empty query: quick actions (theme, sign in/out) + role-aware
 *     navigation commands + public pages.
 *   - Query ≥ 2 chars: live results from GET /api/search grouped by type
 *     (courses / instructors / events / paths / labs), alongside matching
 *     navigation commands (cmdk filters everything as you type).
 *   - Same trigger UI as before in the public header (input variant), plus
 *     a compact icon variant for the app shell top strip.
 *   - ⌘K / Ctrl+K opens the palette from anywhere.
 *   - Results count is announced via aria-live for screen readers.
 *
 * Export name kept as `GlobalSearch` so existing header usages need no edit.
 */

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import { signOut, useSession } from "next-auth/react"
import {
  BookOpen, Users, Calendar, Route, FlaskConical, Search, Loader2,
  Sun, Moon, LogIn, LogOut, ArrowRight, GraduationCap, LayoutDashboard,
} from "lucide-react"
import { useAppStore, type View } from "@/store/app-store"
import { navForRole, PUBLIC_NAV, type NavItem } from "@/lib/nav-data"
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"

/* ----------------------------- API types ----------------------------- */

type CourseHit = { id: string; title: string; shortName: string; description: string; category: string; level: string; tags: string; thumbnail: string | null }
type InstructorHit = { id: string; name: string; title: string | null; bio: string | null; avatar: string | null }
type EventHit = { id: string; slug: string; title: string; description: string; type: string; startDate: string; venue: string }
type PathHit = { id: string; slug: string; title: string; description: string; difficulty: string; duration: string }
type LabHit = { id: string; title: string; slug: string; description: string; category: string; difficulty: string; tags: string }

type SearchResponse = {
  courses: CourseHit[]
  instructors: InstructorHit[]
  events: EventHit[]
  paths: PathHit[]
  labs: LabHit[]
  total: number
  query: string
}

const RESULT_GROUPS: Array<{ key: keyof Omit<SearchResponse, "total" | "query">; label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = [
  { key: "courses", label: "Courses", icon: BookOpen, tint: "text-emerald-300" },
  { key: "instructors", label: "Instructors", icon: Users, tint: "text-violet-300" },
  { key: "events", label: "Events", icon: Calendar, tint: "text-amber-300" },
  { key: "paths", label: "Learning Paths", icon: Route, tint: "text-cyan-300" },
  { key: "labs", label: "Labs", icon: FlaskConical, tint: "text-rose-300" },
]

const MIN_QUERY = 2

/* --------------------------- component --------------------------- */

interface GlobalSearchProps {
  className?: string
  /** "input" = header pill (default) · "icon" = compact icon button */
  variant?: "input" | "icon"
}

export function GlobalSearch({ className, variant = "input" }: GlobalSearchProps) {
  const { navigate } = useAppStore()
  const { data: session } = useSession()
  const { user } = useUser()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [debounced, setDebounced] = React.useState("")

  /* ---------- ⌘K / Ctrl+K opens the palette ---------- */
  React.useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKeydown)
    return () => window.removeEventListener("keydown", onKeydown)
  }, [])

  /* ---------- debounce ---------- */
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  /* ---------- search (only when open + enough chars) ---------- */
  const searching = open && debounced.length >= MIN_QUERY
  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ["global-search", debounced],
    enabled: searching,
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}&limit=6`)
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
  })

  const resultCount = data?.total ?? 0

  /* ---------- reset query when the palette closes ---------- */
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setDebounced("")
    }
  }, [open])

  /* ---------- actions ---------- */
  const go = React.useCallback(
    (view: View) => {
      setOpen(false)
      navigate(view)
    },
    [navigate],
  )

  const runCommand = React.useCallback((cmd: CommandId) => {
    setOpen(false)
    switch (cmd) {
      case "toggle-theme":
        setTheme(theme === "dark" ? "light" : "dark")
        break
      case "sign-out":
        signOut({ callbackUrl: "/" })
        break
      case "sign-in":
        navigate({ name: "login" })
        break
    }
  }, [setTheme, theme, navigate])

  /* ---------- hit navigation (same mapping as v1) ---------- */
  function navigateHit(type: (typeof RESULT_GROUPS)[number]["key"], item: any) {
    switch (type) {
      case "courses": go({ name: "course", courseId: item.id }); break
      case "instructors": go({ name: "instructor-detail", instructorId: item.id }); break
      case "events": go({ name: "event-detail", eventSlug: item.slug }); break
      case "paths": go({ name: "learning-paths" }); break
      case "labs": go({ name: "lab", labSlug: item.slug }); break
    }
  }

  /* ---------- command model ---------- */
  const role = user?.role ?? (session?.user as any)?.role
  const roleNav = React.useMemo(() => (role ? navForRole(role) : []), [role])
  const authed = !!role

  const topRoleNav = roleNav.slice(0, 8)

  return (
    <>
      {/* ---------- trigger ---------- */}
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette (Ctrl+K)"
          aria-haspopup="dialog"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <div className={cn("relative", className)}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="group flex items-center gap-2 w-full h-9 lg:h-10 px-3 rounded-xl border text-left transition-all bg-background/40 border-border/60 hover:border-border hover:bg-background/60 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden />
            <span className="flex-1 text-xs lg:text-sm text-muted-foreground/70 truncate">
              Search courses, labs, instructors…
            </span>
            <kbd
              className="hidden md:inline-flex h-4 px-1.5 items-center text-[9px] font-mono text-muted-foreground/60 border border-border/60 rounded shrink-0"
              aria-hidden
            >
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ---------- palette ---------- */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Search or jump anywhere on GuardianX"
        className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-input]]:h-12"
      >
        <CommandInput
          placeholder="Search courses, labs, instructors… or jump to"
          value={query}
          onValueChange={setQuery}
        />
        {/* screen-reader announcement */}
        <div aria-live="polite" role="status" className="sr-only">
          {searching ? `${resultCount} results for ${debounced}` : ""}
        </div>

        <CommandList className="max-h-[min(70vh,460px)]">
          <CommandEmpty>
            {searching && !isFetching ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground">
                  No results for <span className="font-mono text-foreground">"{debounced}"</span>
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Try a course name, lab topic, instructor or event.</p>
              </div>
            ) : null}
          </CommandEmpty>

          {/* ---- live search results ---- */}
          {searching && (
            <>
              {isFetching && !data && (
                <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Searching…
                </div>
              )}
              {RESULT_GROUPS.map((g) => {
                const list = (data?.[g.key] as any[]) ?? []
                if (!searching || list.length === 0) return null
                const Icon = g.icon
                return (
                  <CommandGroup key={g.key} heading={g.label}>
                    {list.map((item) => (
                      <CommandItem
                        key={`${g.key}-${item.id}`}
                        value={`search ${g.key} ${item.title ?? item.name ?? ""}`}
                        onSelect={() => navigateHit(g.key, item)}
                      >
                        <span className={cn("flex items-center justify-center size-7 rounded-md bg-muted/50 shrink-0")}>
                          <Icon className={cn("size-3.5", g.tint)} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{item.title ?? item.name}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {g.key === "courses" && `${item.shortName} · ${item.level} · ${item.category}`}
                            {g.key === "instructors" && item.title}
                            {g.key === "events" && `${item.type} · ${item.startDate || item.venue}`}
                            {g.key === "paths" && `${item.difficulty} · ${item.duration}`}
                            {g.key === "labs" && `${item.difficulty} · ${item.category}`}
                          </span>
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground/50 shrink-0" aria-hidden />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              <CommandSeparator />
            </>
          )}

          {/* ---- quick actions ---- */}
          <CommandGroup heading="Actions">
            <CommandItem value="toggle theme dark light appearance" onSelect={() => runCommand("toggle-theme")}>
              {theme === "dark" ? <Sun className="size-4 text-amber-300" aria-hidden /> : <Moon className="size-4 text-cyan-300" aria-hidden />}
              <span>Switch to {theme === "dark" ? "light" : "dark"} theme</span>
            </CommandItem>
            {authed ? (
              <CommandItem value="sign out logout" onSelect={() => runCommand("sign-out")}>
                <LogOut className="size-4 text-rose-300" aria-hidden />
                <span>Sign out{user?.name ? ` (${user.name})` : ""}</span>
              </CommandItem>
            ) : (
              <CommandItem value="sign in login account" onSelect={() => runCommand("sign-in")}>
                <LogIn className="size-4 text-emerald-300" aria-hidden />
                <span>Sign in to GuardianX</span>
              </CommandItem>
            )}
          </CommandGroup>

          {/* ---- role navigation (logged in) ---- */}
          {authed && topRoleNav.length > 0 && (
            <CommandGroup heading="Go to">
              {topRoleNav.map((item) => (
                <CommandItem key={item.label} value={`go to ${item.label}`} onSelect={() => go(item.view)}>
                  <item.icon className="size-4 text-violet-300" aria-hidden />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
              {roleNav.length > topRoleNav.length && (
                <CommandItem value="go to more navigation" onSelect={() => go({ name: "dashboard" })}>
                  <LayoutDashboard className="size-4 text-violet-300" aria-hidden />
                  <span>Dashboard <span className="text-[10px] text-muted-foreground ml-1">— full menu in sidebar</span></span>
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {/* ---- public pages ---- */}
          <CommandGroup heading={authed ? "Explore" : "Go to"}>
            {PUBLIC_NAV.map((item: NavItem) => (
              <CommandItem key={item.label} value={`explore ${item.label}`} onSelect={() => go(item.view)}>
                <item.icon className="size-4 text-cyan-300" aria-hidden />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {/* ---- footer hint ---- */}
          <div className="border-t border-border/40 px-4 py-2 flex items-center gap-3 text-[10px] font-mono text-muted-foreground/70">
            <span className="flex items-center gap-1"><kbd className="h-3.5 px-1 inline-flex items-center border border-border/60 rounded">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="h-3.5 px-1 inline-flex items-center border border-border/60 rounded">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="h-3.5 px-1 inline-flex items-center border border-border/60 rounded">esc</kbd> close</span>
            <span className="ml-auto flex items-center gap-1"><GraduationCap className="size-3" aria-hidden /> GuardianX</span>
          </div>
        </CommandList>
      </CommandDialog>
    </>
  )
}

/* keep a stable command-id union for future additions */
type CommandId = "toggle-theme" | "sign-out" | "sign-in"
