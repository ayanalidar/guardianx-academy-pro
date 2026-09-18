"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Save, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown,
  Loader2, Search, Eye, EyeOff, Shield, AlertCircle, CheckCircle2,
  Globe, Home as HomeIcon, Building2, BookOpen, Mail, TrendingUp,
  Layout, LayoutPanelLeft, Sparkles, RefreshCw, Database, Hash,
  Sprout,
} from "lucide-react"
import {
  ScrollReveal, FadeIn,
} from "@/components/platform/motion-system"

/* ============================================================
   Types
   ============================================================ */

type PageId =
  | "home"
  | "impact"
  | "contact"
  | "institutions"
  | "catalog"
  | "auth"
  | "global"

interface PageMeta {
  id: PageId
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  accent: string
}

const PAGES: PageMeta[] = [
  { id: "home",          label: "Home",              icon: HomeIcon,        description: "Landing page hero, audiences, courses, labs, partners", accent: "text-violet-300" },
  { id: "impact",        label: "Impact",            icon: TrendingUp,      description: "Outcomes, success stories, partner counts",            accent: "text-amber-300" },
  { id: "contact",       label: "Contact",           icon: Mail,            description: "Contact form, office info, FAQ",                       accent: "text-cyan-300" },
  { id: "institutions",  label: "Institutions",      icon: Building2,       description: "Hub page: hero, partner types, benefits, flow, models, final CTA", accent: "text-emerald-300" },
  { id: "catalog",       label: "Catalog",           icon: BookOpen,        description: "Course catalog hero and filter labels",                accent: "text-violet-300" },
  { id: "auth",          label: "Auth",              icon: Shield,          description: "Login/register form labels and feature highlights",    accent: "text-amber-300" },
  { id: "global",        label: "Global Header/Footer", icon: Globe,        description: "Brand name (header), footer CTA/brand/contact/social/copyright", accent: "text-cyan-300" },
]

// Sections with friendly names per page (used in the section list)
const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  stats: "Hero Stats",
  trust: "Trust Bar",
  audiences: "Audiences (Who We Serve)",
  courses: "Courses Section",
  labs: "Cinematic Labs",
  corporate: "Corporate Training",
  partners: "Partner Institutions",
  benefits: "Partner Benefits",
  finalCta: "Final CTA",
  contactInfo: "Contact Info",
  formFields: "Form Fields",
  faq: "FAQ",
  partnerTypes: "Partner Types",
  flowSteps: "Flow Steps",
  models: "Partnership Models",
  mission: "Mission / Partner Stats",
  outcomes: "Career Outcomes",
  stories: "Success Stories",
  tabs: "Auth Tabs",
  filters: "Catalog Filters",
  header: "Global Header",
  footer: "Global Footer",
}

/* ============================================================
   Helpers
   ============================================================ */

function formatTimeAgo(iso?: string | null): string {
  if (!iso) return "-"
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString()
}

function detectKind(value: any): "string" | "stringArray" | "objectArray" | "object" | "primitive" {
  if (typeof value === "string") return "string"
  if (Array.isArray(value)) {
    if (value.length === 0) return "stringArray"
    if (value.every((v) => typeof v === "string")) return "stringArray"
    if (value.every((v) => typeof v === "object" && v !== null)) return "objectArray"
    if (value.every((v) => typeof v === "number" || typeof v === "boolean")) return "objectArray"
    return "objectArray"
  }
  if (typeof value === "object" && value !== null) return "object"
  if (typeof value === "number" || typeof value === "boolean") return "primitive"
  return "string"
}

/* ============================================================
   Main view
   ============================================================ */

export function CMSDashboardView() {
  const { user, isLoading } = useUser()
  const [selectedPage, setSelectedPage] = React.useState<PageId>("home")
  const [search, setSearch] = React.useState("")
  const qc = useQueryClient()

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== "ADMIN") {
    return <AccessDenied />
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-violet-600/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <Hero />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* ============ LEFT SIDEBAR ============ */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <PageSidebar
              selected={selectedPage}
              onSelect={setSelectedPage}
              search={search}
              onSearch={setSearch}
            />
          </aside>

          {/* ============ MAIN PANEL ============ */}
          <main className="min-w-0">
            <PageEditor key={selectedPage} page={selectedPage} />
          </main>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Hero
   ============================================================ */

function Hero() {
  return (
    <FadeIn>
      <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-amber-500/8 blur-[100px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-dot" />
              <span className="text-[10px] font-mono text-amber-300/80 tracking-[0.25em]">
                CONTENT STUDIO · CMS
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Edit every word your users see.
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Pick a page from the left, expand any section, edit text or arrays, and hit Save Changes.
              Updates are live instantly across the platform - no redeploy needed.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/5">
              <Sparkles className="h-3 w-3 mr-1" /> ADMIN
            </Badge>
            <Badge variant="outline" className="border-violet-500/30 text-violet-300 bg-violet-500/5">
              <Database className="h-3 w-3 mr-1" /> Prisma-backed
            </Badge>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

/* ============================================================
   Access Denied
   ============================================================ */

function AccessDenied() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <FadeIn className="relative z-10 text-center max-w-md">
        <div className="inline-flex p-5 rounded-2xl border border-red-500/30 bg-red-500/10 mb-6">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <div className="text-[10px] font-mono text-red-400 tracking-[0.3em] mb-3">
          ACCESS RESTRICTED · CONTENT STUDIO
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3 text-balance">
          Admin access required
        </h1>
        <p className="text-muted-foreground">
          Only platform administrators can edit public site content.
        </p>
      </FadeIn>
    </div>
  )
}

/* ============================================================
   Page Sidebar
   ============================================================ */

function PageSidebar({
  selected,
  onSelect,
  search,
  onSearch,
}: {
  selected: PageId
  onSelect: (p: PageId) => void
  search: string
  onSearch: (q: string) => void
}) {
  const filtered = PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Card className="bg-card shadow-lg border border-border p-3 lg:p-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <nav className="space-y-1">
          {filtered.map((p) => {
            const active = selected === p.id
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all group border",
                  active
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "border-transparent hover:bg-accent/50"
                )}
              >
                <div className={cn(
                  "inline-flex items-center justify-center h-7 w-7 rounded-md shrink-0 mt-0.5",
                  active ? "bg-amber-500/15" : "bg-muted/40"
                )}>
                  <p.icon className={cn("h-3.5 w-3.5", active ? p.accent : "text-muted-foreground")} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "text-sm font-medium truncate",
                    active ? "text-amber-300" : "text-foreground"
                  )}>
                    {p.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                    {p.description}
                  </div>
                </div>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-amber-400 rounded-r" />}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">
              No pages match "{search}"
            </div>
          )}
        </nav>
      </div>
    </Card>
  )
}

/* ============================================================
   Page Editor
   ============================================================ */

interface SectionData {
  [key: string]: any
}
interface PageDataShape {
  page: string
  sections: Record<string, SectionData>
  updatedAt?: string | null
}

function PageEditor({ page }: { page: PageId }) {
  const qc = useQueryClient()
  const [draft, setDraft] = React.useState<Record<string, SectionData> | null>(null)
  const [openSection, setOpenSection] = React.useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false)
  const [addSectionOpen, setAddSectionOpen] = React.useState(false)
  const [newSectionName, setNewSectionName] = React.useState("")
  const [newSectionKey, setNewSectionKey] = React.useState("")

  const meta = PAGES.find((p) => p.id === page)!

  const { data, isLoading, isError, refetch } = useQuery<PageDataShape>({
    queryKey: ["cms-content", page],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/cms/${page}`)
        if (!res.ok) return { page, sections: {}, updatedAt: null }
        return res.json()
      } catch {
        return { page, sections: {}, updatedAt: null }
      }
    },
    staleTime: 30_000,
    retry: 1,
    // Force the query to run on every mount — fixes the issue where the
    // CMS page showed an empty editor because the query didn't fire
    // after navigating from the admin dashboard.
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  })

  // Safety net: if the query hasn't loaded after 500ms, force a refetch.
  // This handles edge cases where React Query doesn't auto-fire on mount.
  React.useEffect(() => {
    if (!data && !isLoading && !isError) {
      const t = setTimeout(() => refetch(), 500)
      return () => clearTimeout(t)
    }
  }, [data, isLoading, isError, refetch])

  // Reset draft whenever data changes (initial load + invalidations).
  // Using `data?.sections` (a stable object identity per fetch) avoids
  // resetting the form on every keystroke — the parent's draft state
  // is the source of truth while the user is editing.
  React.useEffect(() => {
    if (data?.sections) {
      setDraft(JSON.parse(JSON.stringify(data.sections)))
    }
  }, [data?.sections])

  // Re-seed the current page from the canonical defaults. Lets admins
  // recover an empty CMS without shell access, or revert custom edits
  // back to the seed. Custom keys not in the seed are preserved.
  const seedMutation = useMutation({
    mutationFn: async () => {
      return api(`/api/admin/site-content/seed`, {
        method: "POST",
        body: JSON.stringify({ page }),
      })
    },
    onSuccess: (res: any) => {
      toast.success(`Seeded ${res?.seeded ?? 0} default items for ${page}`)
      qc.invalidateQueries({ queryKey: ["cms-content", page] })
      // The view's useEffect will repopulate `draft` from the new data.
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to seed defaults")
    },
  })

  const handleSeed = () => seedMutation.mutate()

  // Add a brand-new section to the draft (and on Save, it will be
  // persisted via the PUT /api/cms/[page] batch upsert).
  const handleAddSection = () => {
    const name = newSectionName.trim().replace(/\s+/g, "")
    const firstKey = newSectionKey.trim().replace(/\s+/g, "") || "newKey"
    if (!name) {
      toast.error("Section name is required")
      return
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      toast.error("Section name must start with a letter and only contain letters, digits, dashes or underscores")
      return
    }
    setDraft((prev) => {
      const next = prev ? { ...prev } : {}
      if (next[name]) {
        toast.error(`Section "${name}" already exists`)
        return prev
      }
      next[name] = { [firstKey]: "" }
      return next
    })
    setAddSectionOpen(false)
    setNewSectionName("")
    setNewSectionKey("")
    setOpenSection(name)
    toast.success(`Added section "${name}" — Save to publish`)
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      items: Array<{ section: string; key: string; value: any }>
      deletes: Array<{ section: string; key: string }>
    }) => {
      return api(`/api/cms/${page}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (res: any) => {
      const upserted = res?.count ?? 0
      const deleted = res?.deleted ?? 0
      const parts: string[] = []
      if (upserted) parts.push(`${upserted} saved`)
      if (deleted) parts.push(`${deleted} deleted`)
      toast.success(parts.length ? `Changes saved · ${parts.join(" · ")} · live now` : "No changes to save")
      qc.invalidateQueries({ queryKey: ["cms-content", page] })
      // Also invalidate other pages (in case shared global content changed)
      if (page === "global") {
        qc.invalidateQueries({ queryKey: ["cms-content"] })
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to save")
    },
  })

  const handleSave = () => {
    if (!draft) return
    const items: Array<{ section: string; key: string; value: any }> = []
    const deletes: Array<{ section: string; key: string }> = []

    // Upserts: every key currently in the draft
    for (const [section, keys] of Object.entries(draft)) {
      for (const [key, value] of Object.entries(keys)) {
        items.push({ section, key, value })
      }
    }

    // Deletes: any (section, key) that exists in the saved data but
    // is missing from the draft (admin removed the key or the whole
    // section via the Delete button). Without this, removing a key
    // from the UI silently kept it in the DB.
    if (data?.sections) {
      for (const [section, keys] of Object.entries(data.sections)) {
        const draftKeys = draft[section]
        if (!draftKeys) {
          // whole section removed — delete every key in it
          for (const key of Object.keys(keys)) {
            deletes.push({ section, key })
          }
        } else {
          // section exists in draft — delete any key that's missing
          for (const key of Object.keys(keys)) {
            if (!(key in draftKeys)) {
              deletes.push({ section, key })
            }
          }
        }
      }
    }

    if (items.length === 0 && deletes.length === 0) return
    saveMutation.mutate({ items, deletes })
  }

  const handleReset = () => {
    setResetDialogOpen(false)
    if (data?.sections) {
      setDraft(JSON.parse(JSON.stringify(data.sections)))
      toast.info("Reverted to last saved version")
    }
  }

  const isDirty = React.useMemo(() => {
    if (!draft || !data?.sections) return false
    return JSON.stringify(draft) !== JSON.stringify(data.sections)
  }, [draft, data])

  // Compute changes count (including deletions)
  const changesCount = React.useMemo(() => {
    if (!draft || !data?.sections) return 0
    let n = 0
    // changed / added keys
    for (const [section, keys] of Object.entries(draft)) {
      for (const [key, value] of Object.entries(keys)) {
        const orig = data.sections[section]?.[key]
        if (JSON.stringify(orig) !== JSON.stringify(value)) n++
      }
    }
    // deleted keys (in data but not in draft)
    for (const [section, keys] of Object.entries(data.sections)) {
      const draftKeys = draft[section]
      if (!draftKeys) {
        n += Object.keys(keys).length
      } else {
        for (const key of Object.keys(keys)) {
          if (!(key in draftKeys)) n++
        }
      }
    }
    return n
  }, [draft, data])

  const sectionList = draft ? Object.keys(draft).sort() : []

  return (
    <div className="space-y-4">
      {/* === Top bar === */}
      <Card className="bg-card shadow-lg border border-border p-4 lg:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              "inline-flex items-center justify-center h-10 w-10 rounded-xl shrink-0",
              "bg-amber-500/10"
            )}>
              <meta.icon className={cn("h-5 w-5", meta.accent)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight">{meta.label}</h2>
                <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-300 bg-amber-500/5">
                  <Hash className="h-2.5 w-2.5 mr-1" />{page}
                </Badge>
                {sectionList.length > 0 && (
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {sectionList.length} sections
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {meta.description}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                Last saved: {formatTimeAgo(data?.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-9"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddSectionOpen(true)}
              disabled={saveMutation.isPending || seedMutation.isPending}
              className="h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Section
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={saveMutation.isPending || seedMutation.isPending}
              className="h-9"
              title={`Re-seed ${page} from the default content (overwrites values of seeded keys; preserves any custom keys you added)`}
            >
              {seedMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Seeding...</>
              ) : (
                <><Sprout className="h-3.5 w-3.5 mr-1.5" /> Seed Defaults</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              disabled={!isDirty || saveMutation.isPending}
              className="h-9"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 h-9"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>

        {/* Dirty indicator */}
        {isDirty && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-dot" />
              {changesCount} unsaved {changesCount === 1 ? "change" : "changes"}
            </span>
            <span className="text-muted-foreground">
              Click "Save Changes" to publish.
            </span>
          </div>
        )}
      </Card>

      {/* === Loading state === */}
      {isLoading && <LoadingSkeleton />}

      {/* === Error state === */}
      {isError && (
        <Card className="bg-card shadow-lg border border-red-500/30 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <div className="font-semibold text-sm">Failed to load content</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Check your connection or try refreshing.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* === Sections === */}
      {!isLoading && !isError && draft && sectionList.length === 0 && (
        <Card className="bg-card shadow-lg border border-dashed border-amber-500/40 p-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <Sprout className="h-7 w-7 text-amber-300" />
          </div>
          <h3 className="font-semibold text-base">No content yet for the {meta.label} page</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            You can either re-seed this page from the platform's default content
            (recommended — gives you every section the page renders), or start
            from scratch by adding your own section.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            <Button
              onClick={handleSeed}
              disabled={seedMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 h-9"
            >
              {seedMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Seeding...</>
              ) : (
                <><Sprout className="h-3.5 w-3.5 mr-1.5" /> Seed default content</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddSectionOpen(true)}
              disabled={seedMutation.isPending}
              className="h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add a section manually
            </Button>
          </div>
        </Card>
      )}

      {!isLoading && !isError && draft && sectionList.length > 0 && (
        <Accordion
          type="single"
          collapsible
          value={openSection ?? undefined}
          onValueChange={(v) => setOpenSection(v || null)}
          className="space-y-2"
        >
          {sectionList.map((section) => (
            <AccordionItem
              key={section}
              value={section}
              className="rounded-xl border border-border/60 bg-card shadow-md overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/30">
                <div className="flex items-center gap-3 flex-1">
                  <div className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-violet-500/10 shrink-0">
                    <LayoutPanelLeft className="h-3.5 w-3.5 text-violet-300" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {SECTION_LABELS[section] ?? section}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {section} · {Object.keys(draft[section] || {}).length} keys
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (
                        confirm(
                          `Delete section "${section}"?\n\nThis removes ALL of its keys from your draft. To publish the deletion, click "Save Changes". To undo before saving, click "Reset".`
                        )
                      ) {
                        setDraft((prev) => {
                          if (!prev) return prev
                          const next = { ...prev }
                          delete next[section]
                          return next
                        })
                        toast.success(`Deleted section "${section}" — Save to publish`)
                      }
                    }}
                    title="Delete this section from the draft"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-1">
                <SectionKeysEditor
                  section={section}
                  keys={draft[section] || {}}
                  onChange={(newKeys) => {
                    setDraft((prev) => ({ ...prev!, [section]: newKeys }))
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* === Reset dialog === */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to last saved?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your unsaved changes ({changesCount} {changesCount === 1 ? "item" : "items"})
            will be discarded. The live content on the site will not change.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReset} className="bg-amber-500 hover:bg-amber-400 text-amber-950">
              Revert changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Add Section dialog === */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new section to {meta.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-section-name" className="text-xs font-mono text-muted-foreground">
                Section name (camelCase or kebab-case, e.g. <code>hero</code>, <code>finalCta</code>, <code>partners</code>)
              </Label>
              <Input
                id="new-section-name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="newSection"
                className="h-9 font-mono text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-section-key" className="text-xs font-mono text-muted-foreground">
                First key (optional — defaults to <code>newKey</code>)
              </Label>
              <Input
                id="new-section-key"
                value={newSectionKey}
                onChange={(e) => setNewSectionKey(e.target.value)}
                placeholder="title"
                className="h-9 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The new section will appear in the accordion below. Edit its keys, then click
              <span className="font-mono mx-1 text-amber-300">Save Changes</span>
              to publish. The new section will be visible to consumers that read it
              via <code>usePageContent("{page}").sections.{newSectionName || "newSection" || "[section]"}</code>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSection} className="bg-amber-500 hover:bg-amber-400 text-amber-950">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============================================================
   Loading skeleton
   ============================================================ */

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-card shadow-md border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              <div className="h-2 w-48 bg-muted/60 animate-pulse rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ============================================================
   Section keys editor
   ============================================================ */

function SectionKeysEditor({
  section,
  keys,
  onChange,
}: {
  section: string
  keys: Record<string, any>
  onChange: (newKeys: Record<string, any>) => void
}) {
  const sortedKeys = Object.keys(keys).sort()

  const updateKey = (key: string, value: any) => {
    onChange({ ...keys, [key]: value })
  }

  const deleteKey = (key: string) => {
    const next = { ...keys }
    delete next[key]
    onChange(next)
    toast.success(`Deleted key "${key}"`)
  }

  const addKey = () => {
    let name = "newKey"
    let i = 1
    while (keys[name]) {
      name = `newKey${++i}`
    }
    onChange({ ...keys, [name]: "" })
    toast.success(`Added key "${name}"`)
  }

  return (
    <div className="space-y-3">
      {sortedKeys.map((key) => (
        <KeyEditor
          key={key}
          section={section}
          keyName={key}
          value={keys[key]}
          onChange={(v) => updateKey(key, v)}
          onDelete={() => deleteKey(key)}
        />
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addKey}
        className="w-full border-dashed text-xs h-9"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add new key
      </Button>
    </div>
  )
}

/* ============================================================
   Key editor - dispatches by value type
   ============================================================ */

function KeyEditor({
  section,
  keyName,
  value,
  onChange,
  onDelete,
}: {
  section: string
  keyName: string
  value: any
  onChange: (v: any) => void
  onDelete: () => void
}) {
  const [showRaw, setShowRaw] = React.useState(false)
  const kind = detectKind(value)

  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
          <code className="text-xs font-mono font-medium truncate">{keyName}</code>
          <Badge variant="outline" className="text-[9px] font-mono shrink-0">
            {kind}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(kind === "objectArray" || kind === "object") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowRaw((s) => !s)}
            >
              {showRaw ? (
                <><Eye className="h-3 w-3 mr-1" /> Form</>
              ) : (
                <><EyeOff className="h-3 w-3 mr-1" /> JSON</>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <KeyEditorBody
        section={section}
        keyName={keyName}
        value={value}
        kind={kind}
        showRaw={showRaw}
        onChange={onChange}
      />
    </div>
  )
}

function KeyEditorBody({
  section,
  keyName,
  value,
  kind,
  showRaw,
  onChange,
}: {
  section: string
  keyName: string
  value: any
  kind: ReturnType<typeof detectKind>
  showRaw: boolean
  onChange: (v: any) => void
}) {
  // String
  if (kind === "string") {
    const isLong = (value as string).length > 60 || (value as string).includes("\n")
    return isLong ? (
      <Textarea
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="resize-y text-xs"
      />
    ) : (
      <Input
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs"
      />
    )
  }

  // Number / boolean primitive
  if (kind === "primitive") {
    return (
      <Input
        value={String(value)}
        onChange={(e) => {
          const v = e.target.value
          if (typeof value === "number") {
            const n = Number(v)
            onChange(Number.isNaN(n) ? 0 : n)
          } else if (typeof value === "boolean") {
            onChange(v === "true" || v === "1")
          } else {
            onChange(v)
          }
        }}
        className="h-9 text-xs font-mono"
      />
    )
  }

  // String array
  if (kind === "stringArray" && !showRaw) {
    return <StringArrayEditor value={value as string[]} onChange={onChange} />
  }

  // Object array (with structured editor)
  if (kind === "objectArray" && !showRaw) {
    return <ObjectArrayEditor value={value as any[]} onChange={onChange} />
  }

  // Object (single)
  if (kind === "object" && !showRaw) {
    return <ObjectEditor value={value as Record<string, any>} onChange={onChange} />
  }

  // Fallback: raw JSON editor
  return <JsonEditor value={value} onChange={onChange} />
}

/* ============================================================
   String array editor
   ============================================================ */

function StringArrayEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const items = Array.isArray(value) ? value : []

  const update = (idx: number, v: string) => {
    const next = [...items]
    next[idx] = v
    onChange(next)
  }
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx))
  }
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }
  const add = () => {
    onChange([...items, ""])
  }

  return (
    <div className="space-y-1.5">
      {items.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic px-1 py-1">
          Empty array - add items below.
        </div>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-mono w-6 shrink-0 text-right">
            {String(i + 1).padStart(2, "0")}
          </span>
          <Input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => move(i, -1)}
            disabled={i === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => move(i, 1)}
            disabled={i === items.length - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full border-dashed text-[10px] h-7"
      >
        <Plus className="h-3 w-3 mr-1" /> Add item
      </Button>
    </div>
  )
}

/* ============================================================
   Object array editor - card-based with all fields
   ============================================================ */

function ObjectArrayEditor({
  value,
  onChange,
}: {
  value: any[]
  onChange: (v: any[]) => void
}) {
  const items = Array.isArray(value) ? value : []

  // Get the union of all keys across items (handles heterogeneous items)
  const allKeys = Array.from(
    items.reduce<Set<string>>((set, item) => {
      if (item && typeof item === "object") {
        Object.keys(item).forEach((k) => set.add(k))
      }
      return set
    }, new Set())
  )

  const update = (idx: number, field: string, v: any) => {
    const next = items.map((it, i) =>
      i === idx ? { ...it, [field]: v } : it
    )
    onChange(next)
  }
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx))
  }
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }
  const add = () => {
    const blank = allKeys.reduce<Record<string, any>>((acc, k) => {
      acc[k] = ""
      return acc
    }, {})
    onChange([...items, blank])
  }

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground italic">
          Empty array.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={add}
          className="w-full border-dashed text-[10px] h-7"
        >
          <Plus className="h-3 w-3 mr-1" /> Add first item
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <Card key={i} className="bg-background/40 border border-border/60 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              #{String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(item).sort().map((field) => {
              const fv = item[field]
              const fk = detectKind(fv)
              return (
                <div
                  key={field}
                  className={cn(
                    "space-y-1",
                    fk === "string" && (String(fv).length > 50) && "sm:col-span-2"
                  )}
                >
                  <Label className="text-[10px] font-mono text-muted-foreground">
                    {field}
                    <span className="ml-1 text-muted-foreground/60">({fk})</span>
                  </Label>
                  {fk === "string" ? (
                    String(fv).length > 50 || String(fv).includes("\n") ? (
                      <Textarea
                        value={fv}
                        onChange={(e) => update(i, field, e.target.value)}
                        rows={2}
                        className="text-xs resize-y"
                      />
                    ) : (
                      <Input
                        value={fv}
                        onChange={(e) => update(i, field, e.target.value)}
                        className="h-8 text-xs"
                      />
                    )
                  ) : fk === "primitive" ? (
                    <Input
                      value={String(fv)}
                      onChange={(e) => {
                        const v = e.target.value
                        if (typeof fv === "number") {
                          const n = Number(v)
                          update(i, field, Number.isNaN(n) ? 0 : n)
                        } else if (typeof fv === "boolean") {
                          update(i, field, v === "true" || v === "1")
                        } else {
                          update(i, field, v)
                        }
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  ) : (
                    <JsonEditor
                      value={fv}
                      onChange={(v) => update(i, field, v)}
                      compact
                    />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full border-dashed text-[10px] h-7"
      >
        <Plus className="h-3 w-3 mr-1" /> Add item
      </Button>
    </div>
  )
}

/* ============================================================
   Object editor - single object with mixed value types
   ============================================================ */

function ObjectEditor({
  value,
  onChange,
}: {
  value: Record<string, any>
  onChange: (v: Record<string, any>) => void
}) {
  const keys = Object.keys(value).sort()

  const update = (k: string, v: any) => onChange({ ...value, [k]: v })
  const remove = (k: string) => {
    const next = { ...value }
    delete next[k]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {keys.map((k) => {
        const v = value[k]
        const kind = detectKind(v)
        return (
          <div key={k} className="rounded-md border border-border/40 p-2 bg-background/30">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[10px] font-mono text-muted-foreground">
                {k} <span className="text-muted-foreground/60">({kind})</span>
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => remove(k)}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
            {kind === "string" ? (
              String(v).length > 50 ? (
                <Textarea
                  value={v}
                  onChange={(e) => update(k, e.target.value)}
                  rows={2}
                  className="text-xs resize-y"
                />
              ) : (
                <Input
                  value={v}
                  onChange={(e) => update(k, e.target.value)}
                  className="h-8 text-xs"
                />
              )
            ) : (
              <JsonEditor value={v} onChange={(nv) => update(k, nv)} compact />
            )}
          </div>
        )
      })}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          let n = "newField"
          let i = 1
          while (value[n]) n = `newField${++i}`
          onChange({ ...value, [n]: "" })
        }}
        className="w-full border-dashed text-[10px] h-7"
      >
        <Plus className="h-3 w-3 mr-1" /> Add field
      </Button>
    </div>
  )
}

/* ============================================================
   JSON editor (raw, with validation)
   ============================================================ */

function JsonEditor({
  value,
  onChange,
  compact = false,
}: {
  value: any
  onChange: (v: any) => void
  compact?: boolean
}) {
  const [text, setText] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  // Sync text whenever value changes externally
  React.useEffect(() => {
    try {
      setText(JSON.stringify(value, null, compact ? 0 : 2))
      setError(null)
    } catch {
      setText(String(value ?? ""))
    }
  }, [value, compact])

  const handle = (raw: string) => {
    setText(raw)
    if (raw.trim() === "") {
      setError(null)
      onChange(null)
      return
    }
    try {
      const parsed = JSON.parse(raw)
      setError(null)
      onChange(parsed)
    } catch (e: any) {
      setError(e?.message ?? "Invalid JSON")
      // Don't propagate the invalid value to parent
    }
  }

  const isLarge = text.length > 200

  return (
    <div className="space-y-1.5">
      {isLarge ? (
        <Textarea
          value={text}
          onChange={(e) => handle(e.target.value)}
          rows={Math.min(12, Math.max(4, Math.ceil(text.length / 60)))}
          className="font-mono text-[11px] resize-y leading-relaxed"
        />
      ) : (
        <Textarea
          value={text}
          onChange={(e) => handle(e.target.value)}
          rows={Math.min(6, Math.max(2, Math.ceil(text.split("\n").length * 1.2)))}
          className="font-mono text-[11px] resize-y leading-relaxed"
        />
      )}
      {error ? (
        <div className="flex items-start gap-1.5 text-[10px] text-red-400 font-mono">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-mono">
          <CheckCircle2 className="h-3 w-3" />
          <span>Valid JSON</span>
        </div>
      )}
    </div>
  )
}
