"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Search,
  Globe,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Code2,
  Save,
  FileText,
  Tag,
  Hash,
  ListChecks,
  Braces,
  Bot,
  Building2,
  Award,
  HelpCircle,
  CalendarDays,
  ChevronRight,
  Pencil,
  Gauge,
  Link2,
  Fingerprint,
  Zap,
  Sparkles,
  Info,
  ScanSearch,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   /admin-seo — comprehensive SEO Optimization Dashboard
   ------------------------------------------------------------
   7 sections:
     A. SEO Health Score (circular gauge)
     B. Page Audit Table (all public pages + dynamic content)
     C. Meta Tags Manager (global SEO defaults)
     D. Sitemap Manager (info + actions)
     E. Robots.txt Editor (textarea + save)
     F. Structured Data Overview (JSON-LD schemas)
     G. Keyword Tracker (per-page keywords + coverage check)

   API:
     GET  /api/admin/seo/audit  → audit data
     GET  /api/admin/seo/meta   → all SEO overrides
     POST /api/admin/seo/meta   → upsert per-page / global / robots / keywords
     GET  /api/sitemap.xml      → dynamic XML sitemap (public)
     GET  /api/robots.txt       → robots.txt (public)
   ============================================================ */

/* ----------------------- types ----------------------- */
interface AuditPage {
  name: string
  url: string
  title: string
  titleLength: number
  description: string
  descriptionLength: number
  hasOGImage: boolean
  hasCanonical: boolean
  h1Count: number
  h2Count: number
  wordCount: number
  issues: string[]
  score: number
}

interface AuditResult {
  pages: AuditPage[]
  score: number
  totalPages: number
  totalIssues: number
}

interface MetaResponse {
  bySection: Record<string, Record<string, string>>
}

/* ----------------------- helpers ----------------------- */

/** Color for a 0-100 score. */
function scoreColor(s: number): string {
  if (s < 50) return "#ef4444"
  if (s < 75) return "#f59e0b"
  return "#22c55e"
}

function scoreLabel(s: number): string {
  if (s < 50) return "Poor"
  if (s < 75) return "Needs Work"
  return "Healthy"
}

/** Length quality indicator for title (ideal 30–60) or description (ideal 120–160). */
type LengthState = "good" | "warn" | "bad"
function lengthState(len: number, min: number, max: number): LengthState {
  if (len === 0) return "bad"
  if (len >= min && len <= max) return "good"
  return "warn"
}

const LENGTH_DOT: Record<LengthState, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-rose-400",
}

function LengthIndicator({ len, min, max }: { len: number; min: number; max: number }) {
  const st = lengthState(len, min, max)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", LENGTH_DOT[st])} />
      <span
        className={cn(
          "text-[11px] tabular-nums",
          st === "good"
            ? "text-emerald-400"
            : st === "warn"
              ? "text-amber-400"
              : "text-rose-400",
        )}
      >
        {len}
      </span>
    </span>
  )
}

/* ----------------------- motion ----------------------- */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ----------------------- A. Health Score Gauge ----------------------- */
function ScoreGauge({
  score,
  totalPages,
  totalIssues,
}: {
  score: number
  totalPages: number
  totalIssues: number
}) {
  const radius = 80
  const stroke = 14
  const norm = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (norm / 100) * circumference
  const color = scoreColor(score)
  const label = scoreLabel(score)

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      <div className="relative">
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            className="text-muted opacity-20"
          />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            transform="rotate(-90 100 100)"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold tabular-nums" style={{ color }}>
            {score}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            / 100
          </div>
          <div
            className="mt-1 text-xs font-medium"
            style={{ color }}
          >
            {label}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        <ScoreStat
          label="Pages Audited"
          value={totalPages}
          icon={FileText}
          tint="bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
        />
        <ScoreStat
          label="Issues Found"
          value={totalIssues}
          icon={AlertTriangle}
          tint="bg-amber-500/10 text-amber-300 border-amber-500/20"
        />
        <ScoreStat
          label="Avg. Score"
          value={score}
          icon={Gauge}
          tint="bg-violet-500/10 text-violet-300 border-violet-500/20"
        />
      </div>
    </div>
  )
}

function ScoreStat({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  tint: string
}) {
  return (
    <div className={cn("rounded-xl border p-4 flex items-center gap-3", tint)}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wider mt-1 opacity-80">
          {label}
        </div>
      </div>
    </div>
  )
}

/* ----------------------- B. Page Audit Table ----------------------- */
function PageAuditTable({
  pages,
  onEdit,
}: {
  pages: AuditPage[]
  onEdit: (p: AuditPage) => void
}) {
  const [filter, setFilter] = React.useState<"all" | "issues" | "healthy">("all")
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    let list = pages
    if (filter === "issues") list = list.filter((p) => p.issues.length > 0)
    else if (filter === "healthy") list = list.filter((p) => p.issues.length === 0)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.url.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q),
      )
    }
    return list
  }, [pages, filter, search])

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-0 overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-b border-border/60 bg-muted/20">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-cyan-300" /> Page Audit
          <Badge variant="secondary" className="ml-1">
            {filtered.length} / {pages.length}
          </Badge>
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search pages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm sm:w-56"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-8 text-sm sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pages</SelectItem>
              <SelectItem value="issues">With issues</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden xl:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-border/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <div className="col-span-3">Page</div>
        <div className="col-span-2">Title (len)</div>
        <div className="col-span-2">Description (len)</div>
        <div className="col-span-1">OG / Can</div>
        <div className="col-span-1">H1 / H2</div>
        <div className="col-span-1">Words</div>
        <div className="col-span-1">Issues</div>
        <div className="col-span-1 text-right">Action</div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No pages match your filter.</p>
        </div>
      ) : (
        <div className="max-h-[640px] overflow-y-auto divide-y divide-border/40 custom-scrollbar">
          {filtered.map((p) => (
            <div
              key={`${p.name}-${p.url}`}
              className="grid grid-cols-1 xl:grid-cols-12 gap-3 px-5 py-3 hover:bg-muted/15 transition-colors items-start xl:items-center"
            >
              {/* Page name + url */}
              <div className="xl:col-span-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: scoreColor(p.score) }}
                  />
                  <span className="font-medium text-sm truncate">{p.name}</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5 ml-4">
                  {p.url}
                </div>
              </div>

              {/* Title */}
              <div className="xl:col-span-2 min-w-0">
                <div className="flex items-center gap-2">
                  <LengthIndicator len={p.titleLength} min={30} max={60} />
                </div>
                <div
                  className="text-[11px] truncate mt-0.5"
                  title={p.title}
                >
                  {p.title || <span className="text-rose-400">Missing</span>}
                </div>
              </div>

              {/* Description */}
              <div className="xl:col-span-2 min-w-0">
                <div className="flex items-center gap-2">
                  <LengthIndicator len={p.descriptionLength} min={120} max={160} />
                </div>
                <div
                  className="text-[11px] truncate mt-0.5"
                  title={p.description}
                >
                  {p.description || <span className="text-rose-400">Missing</span>}
                </div>
              </div>

              {/* OG + Canonical */}
              <div className="xl:col-span-1 flex items-center gap-2 text-sm">
                <span title="OG image">
                  {p.hasOGImage ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  )}
                </span>
                <span title="Canonical">
                  {p.hasCanonical ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  )}
                </span>
              </div>

              {/* H1 / H2 */}
              <div className="xl:col-span-1 text-xs tabular-nums">
                <span
                  className={cn(
                    p.h1Count === 1 ? "text-emerald-400" : "text-amber-400",
                  )}
                >
                  {p.h1Count}H1
                </span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-muted-foreground">{p.h2Count}H2</span>
              </div>

              {/* Word count */}
              <div className="xl:col-span-1 text-xs tabular-nums">
                <span
                  className={cn(
                    p.wordCount >= 300
                      ? "text-emerald-400"
                      : p.wordCount >= 150
                        ? "text-amber-400"
                        : "text-rose-400",
                  )}
                >
                  {p.wordCount.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">w</span>
              </div>

              {/* Issues */}
              <div className="xl:col-span-1">
                <Badge
                  className={cn(
                    "text-[10px] border",
                    p.issues.length === 0
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30",
                  )}
                >
                  {p.issues.length === 0
                    ? "OK"
                    : `${p.issues.length} issue${p.issues.length === 1 ? "" : "s"}`}
                </Badge>
                {p.issues.length > 0 && (
                  <div className="hidden xl:block mt-1 text-[10px] text-muted-foreground line-clamp-2">
                    {p.issues.join(" · ")}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="xl:col-span-1 flex justify-start xl:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onEdit(p)}
                >
                  <Pencil className="h-3 w-3 mr-1.5" /> Edit SEO
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ----------------------- Edit SEO Dialog ----------------------- */
function EditSeoDialog({
  page,
  open,
  onOpenChange,
  onSaved,
}: {
  page: AuditPage | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [ogImage, setOgImage] = React.useState("")
  const [keywords, setKeywords] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  // Sync form state when the dialog opens
  React.useEffect(() => {
    if (open && page) {
      setTitle(page.title || "")
      setDescription(page.description || "")
      setOgImage("")
      setKeywords("")
      // The keywords are not in audit data; fetch on open if needed.
      // For simplicity, we leave keywords blank for the user to type fresh,
      // but if we already have them in the meta cache we could pre-fill.
    }
  }, [open, page])

  if (!page) return null

  async function handleSave() {
    if (!page) return
    setSaving(true)
    try {
      // Derive the page key from the audit page url — strip the leading "#/"
      // (or "/" for home). For dynamic pages the key is "course-<slug>" etc.
      // (matches the audit route's section naming).
      const pageKey = urlToPageKey(page.url)
      const res = await fetch("/api/admin/seo/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: pageKey,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          ogImage: ogImage.trim() || undefined,
          keywords: keywords.trim() || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to save")
      toast.success(`SEO meta saved for "${page.name}"`)
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save SEO meta")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-amber-300" />
            Edit SEO — {page.name}
          </DialogTitle>
          <DialogDescription>
            Override the default title / description / OG image / keywords
            for this page. Leave a field empty to keep the existing value (or
            fall back to the default).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-title" className="text-xs">Title</Label>
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  title.length >= 30 && title.length <= 60
                    ? "text-emerald-400"
                    : title.length === 0
                      ? "text-muted-foreground"
                      : "text-amber-400",
                )}
              >
                {title.length} / 30–60 ideal
              </span>
            </div>
            <Input
              id="seo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title — keep between 30–60 chars"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-desc" className="text-xs">Meta description</Label>
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  description.length >= 120 && description.length <= 160
                    ? "text-emerald-400"
                    : description.length === 0
                      ? "text-muted-foreground"
                      : "text-amber-400",
                )}
              >
                {description.length} / 120–160 ideal
              </span>
            </div>
            <Textarea
              id="seo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short page description for search engines + social cards"
              rows={3}
              maxLength={400}
            />
          </div>

          {/* OG image */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-og" className="text-xs">OG image URL</Label>
            <Input
              id="seo-og"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              placeholder="https://academy.guardianx.cloud/og/…"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-kw" className="text-xs">
              Keywords (comma-separated)
            </Label>
            <Input
              id="seo-kw"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="cybersecurity, CEH, ethical hacking"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={saving}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-500">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Map an audit page URL → SiteContent section key used by the SEO meta route. */
function urlToPageKey(url: string): string {
  // Home
  if (url === "/" || url === "") return "home"
  // Strip "#/" prefix
  const hash = url.replace(/^#\//, "")
  const parts = hash.split("/").filter(Boolean)
  if (parts.length === 0) return "home"
  if (parts.length === 1) return parts[0]
  // /course/<slug>, /blog/<slug>, /event/<slug>, /cert/<slug> → <type>-<slug>
  return `${parts[0]}-${parts.slice(1).join("-")}`
}

/* ----------------------- C. Meta Tags Manager ----------------------- */
function MetaTagsManager({
  global,
  onSaved,
}: {
  global: Record<string, string>
  onSaved: () => void
}) {
  const [titleTemplate, setTitleTemplate] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [ogImage, setOgImage] = React.useState("")
  const [twitterCard, setTwitterCard] = React.useState("summary_large_image")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setTitleTemplate(global.titleTemplate || "GuardianX Academy — %s")
    setDescription(
      global.description ||
        "Master cybersecurity by actually breaking things. Real cyber range, hands-on labs, certification tracks, CTF arena, and career paths. Learn. Break. Defend. Prove.",
    )
    setOgImage(global.ogImage || "")
    setTwitterCard(global.twitterCard || "summary_large_image")
  }, [global])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/seo/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          titleTemplate: titleTemplate.trim(),
          description: description.trim(),
          ogImage: ogImage.trim(),
          twitterCard,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to save")
      toast.success("Global SEO defaults saved")
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-5 lg:p-6">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
        <Code2 className="h-4 w-4 text-violet-300" /> Global SEO Defaults
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        These defaults apply to every page that doesn't have a per-page
        override. The <code className="text-violet-300">%s</code> placeholder in
        the title template is replaced by each page's specific title.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title template */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="g-title" className="text-xs">Default title template</Label>
          <Input
            id="g-title"
            value={titleTemplate}
            onChange={(e) => setTitleTemplate(e.target.value)}
            placeholder="GuardianX Academy — %s"
          />
          <p className="text-[10px] text-muted-foreground">
            Use <code>%s</code> as the placeholder for the page-specific title.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="g-desc" className="text-xs">Default description</Label>
          <Textarea
            id="g-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={200}
          />
          <p className="text-[10px] text-muted-foreground">
            {description.length} / 120–160 recommended
          </p>
        </div>

        {/* OG image */}
        <div className="space-y-1.5">
          <Label htmlFor="g-og" className="text-xs">Default OG image URL</Label>
          <Input
            id="g-og"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://academy.guardianx.cloud/og-default.png"
          />
        </div>

        {/* Twitter card */}
        <div className="space-y-1.5">
          <Label htmlFor="g-tw" className="text-xs">Twitter card type</Label>
          <Select value={twitterCard} onValueChange={setTwitterCard}>
            <SelectTrigger id="g-tw">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="summary_large_image">Summary (large image)</SelectItem>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="app">App</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-500"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          Save Global Defaults
        </Button>
      </div>
    </Card>
  )
}

/* ----------------------- D. Sitemap Manager ----------------------- */
function SitemapManager({ totalUrls }: { totalUrls: number }) {
  const sitemapUrl = "https://academy.guardianx.cloud/api/sitemap.xml"
  const gscUrl = `https://search.google.com/search-console?resource_id=${encodeURIComponent(
    "https://academy.guardianx.cloud/",
  )}`

  const [copied, setCopied] = React.useState(false)
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(sitemapUrl)
      setCopied(true)
      toast.success("Sitemap URL copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy — please copy manually")
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-5 lg:p-6">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
        <Hash className="h-4 w-4 text-cyan-300" /> Sitemap Manager
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        The sitemap is generated dynamically from the database — every time
        Google fetches the URL, it sees the latest published courses, blog
        posts, events, and certifications.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">Sitemap URL</Label>
          <div className="mt-1 flex gap-2">
            <Input
              readOnly
              value={sitemapUrl}
              className="font-mono text-xs flex-1"
            />
            <Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <a href={sitemapUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
              </Button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SitemapStat label="Total URLs" value={totalUrls} icon={Link2} />
          <SitemapStat
            label="Last Generated"
            value="Live"
            icon={RefreshCw}
            sub="On every request"
          />
          <SitemapStat label="Format" value="XML" icon={FileText} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <a href={sitemapUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Open Sitemap in New Tab
            </Button>
          </a>
          <a href={gscUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-500">
              <Globe className="h-4 w-4 mr-1.5" /> Submit to Google Search Console
            </Button>
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Tip: in Google Search Console, paste the sitemap URL above into the
          “Sitemaps” tool to submit it for crawling.
        </p>
      </div>
    </Card>
  )
}

function SitemapStat({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center gap-3">
      <Icon className="h-4 w-4 text-cyan-300 shrink-0" />
      <div>
        <div className="text-base font-semibold leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {label}
        </div>
        {sub && (
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>
        )}
      </div>
    </div>
  )
}

/* ----------------------- E. Robots.txt Editor ----------------------- */
const DEFAULT_ROBOTS = `# robots.txt — GuardianX Academy
# Default policy: allow all crawlers, point at the sitemap.

User-agent: *
Allow: /
Disallow: /api/auth/
Disallow: /api/me
Disallow: /api/admin/

# Sitemap
Sitemap: https://academy.guardianx.cloud/api/sitemap.xml
`

function RobotsEditor({
  content,
  onSaved,
}: {
  content: string
  onSaved: () => void
}) {
  const [value, setValue] = React.useState(DEFAULT_ROBOTS)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    setValue(content || DEFAULT_ROBOTS)
    setDirty(false)
  }, [content])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/seo/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "robots", content: value }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to save")
      toast.success("robots.txt saved")
      setDirty(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-300" /> robots.txt Editor
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Controls which crawlers can access which parts of the site. The
            sitemap URL is appended automatically — keep one at the end.
          </p>
        </div>
        <a
          href="https://academy.guardianx.cloud/api/robots.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Live
          </Button>
        </a>
      </div>

      <div className="mt-4">
        <Textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setDirty(true)
          }}
          rows={14}
          className="font-mono text-xs"
          spellCheck={false}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">
            {value.length} chars · {value.split("\n").length} lines
            {dirty && " · unsaved changes"}
          </span>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save robots.txt
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ----------------------- F. Structured Data Overview ----------------------- */
interface JsonLdSchema {
  id: string
  type: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  json: object
}

function StructuredDataOverview({
  totalPages,
  courseCount,
  eventCount,
  blogCount,
  certCount,
}: {
  totalPages: number
  courseCount: number
  eventCount: number
  blogCount: number
  certCount: number
}) {
  const [activeSchema, setActiveSchema] = React.useState<JsonLdSchema | null>(null)

  const schemas: JsonLdSchema[] = [
    {
      id: "organization",
      type: "Organization",
      name: "Organization schema",
      description: "Corporate / brand identity used in knowledge panels.",
      icon: Building2,
      active: true,
      json: {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "GuardianX Academy",
        url: "https://academy.guardianx.cloud",
        logo: "https://academy.guardianx.cloud/guardianx-logo-v2.png",
        description:
          "Cyber security training operating system — courses, labs, certifications, and a live cyber range.",
        sameAs: [
          "https://twitter.com/guardianx",
          "https://linkedin.com/company/guardianx",
        ],
      },
    },
    {
      id: "website",
      type: "WebSite",
      name: "Website schema",
      description: "Sitename + search action used in sitelinks search box.",
      icon: Globe,
      active: true,
      json: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "GuardianX Academy",
        url: "https://academy.guardianx.cloud",
        potentialAction: {
          "@type": "SearchAction",
          target:
            "https://academy.guardianx.cloud/#/catalog?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    },
    {
      id: "courses",
      type: "Course",
      name: `Course schema (${courseCount} active)`,
      description: "Emitted on every course detail page (/course/<slug>).",
      icon: Award,
      active: courseCount > 0,
      json: {
        "@context": "https://schema.org",
        "@type": "Course",
        name: "Certified Ethical Hacker (CEH)",
        description:
          "Master ethical hacking: reconnaissance, scanning, exploitation, and post-exploitation.",
        provider: {
          "@type": "Organization",
          name: "GuardianX Academy",
          sameAs: "https://academy.guardianx.cloud",
        },
        hasCourseInstance: [
          {
            "@type": "CourseInstance",
            courseMode: "Online",
            courseWorkload: "PT40H",
          },
        ],
      },
    },
    {
      id: "events",
      type: "Event",
      name: `Event schema (${eventCount} active)`,
      description: "Emitted on every published event detail page.",
      icon: CalendarDays,
      active: eventCount > 0,
      json: {
        "@context": "https://schema.org",
        "@type": "Event",
        name: "Live CEH Workshop",
        startDate: "2026-10-15T13:30:00+05:30",
        endDate: "2026-10-15T15:30:00+05:30",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
          "@type": "VirtualLocation",
          url: "https://academy.guardianx.cloud/#/event/live-ceh-workshop",
        },
        organizer: {
          "@type": "Organization",
          name: "GuardianX Academy",
        },
      },
    },
    {
      id: "blog",
      type: "Article",
      name: `Article schema (${blogCount} active)`,
      description: "Emitted on every published blog post.",
      icon: FileText,
      active: blogCount > 0,
      json: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to Pass the CEH Exam on Your First Try",
        author: {
          "@type": "Person",
          name: "GuardianX Instructor",
        },
        publisher: {
          "@type": "Organization",
          name: "GuardianX Academy",
        },
        datePublished: "2026-01-15",
      },
    },
    {
      id: "faq",
      type: "FAQPage",
      name: "FAQ schema",
      description:
        "Emitted on cert landing pages + contact page when FAQ items are present.",
      icon: HelpCircle,
      active: true,
      json: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How long is the CEH certification valid?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "3 years — you can renew with EC-Council's ECE credits.",
            },
          },
        ],
      },
    },
    {
      id: "breadcrumb",
      type: "BreadcrumbList",
      name: "Breadcrumb schema",
      description: "Emitted on every nested page (course / event / blog / cert).",
      icon: ChevronRight,
      active: totalPages > 0,
      json: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://academy.guardianx.cloud/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Catalog",
            item: "https://academy.guardianx.cloud/#/catalog",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Certified Ethical Hacker",
            item:
              "https://academy.guardianx.cloud/#/course/certified-ethical-hacker",
          },
        ],
      },
    },
    {
      id: "cert",
      type: "EducationalOccupationalProgram",
      name: `Certification schema (${certCount} active)`,
      description: "Emitted on /cert/<slug> landing pages.",
      icon: Fingerprint,
      active: certCount > 0,
      json: {
        "@context": "https://schema.org",
        "@type": "EducationalOccupationalProgram",
        name: "Certified Ethical Hacker",
        description:
          "EC-Council's flagship ethical hacking certification covering 20 domains.",
        provider: {
          "@type": "Organization",
          name: "GuardianX Academy",
        },
        timeToComplete: "PT120H",
      },
    },
  ]

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-5 lg:p-6">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
        <Braces className="h-4 w-4 text-violet-300" /> Structured Data (JSON-LD)
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        These JSON-LD schemas are emitted in the <code>&lt;head&gt;</code> on
        relevant pages so search engines can build rich results (course
        snippets, event cards, FAQ accordions, breadcrumbs, etc.).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {schemas.map((s) => (
          <div
            key={s.id}
            className={cn(
              "rounded-lg border p-3 flex flex-col gap-2",
              s.active
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border/40 bg-muted/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <s.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    s.active ? "text-emerald-300" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {s.type}
                  </div>
                </div>
              </div>
              {s.active ? (
                <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  Active
                </Badge>
              ) : (
                <Badge className="text-[9px] bg-muted/40 text-muted-foreground border-border/40">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex-1">
              {s.description}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveSchema(s)}
            >
              <Code2 className="h-3 w-3 mr-1.5" /> View JSON-LD
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!activeSchema} onOpenChange={(v) => !v && setActiveSchema(null)}>
        <DialogContent className="sm:max-w-2xl">
          {activeSchema && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <activeSchema.icon className="h-4 w-4 text-violet-300" />
                  {activeSchema.name}
                </DialogTitle>
                <DialogDescription>
                  JSON-LD emitted in the <code>&lt;head&gt;</code> of relevant pages.
                </DialogDescription>
              </DialogHeader>
              <pre className="text-[11px] font-mono bg-muted/40 border border-border/40 rounded-lg p-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                {JSON.stringify(activeSchema.json, null, 2)}
              </pre>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Close</Button>
                </DialogClose>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(JSON.stringify(activeSchema.json, null, 2))
                      .then(() => toast.success("JSON-LD copied"))
                      .catch(() => toast.error("Couldn't copy"))
                  }}
                >
                  Copy JSON
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ----------------------- G. Keyword Tracker ----------------------- */
function KeywordTracker({
  pages,
  bySection,
  onSaved,
}: {
  pages: AuditPage[]
  bySection: Record<string, Record<string, string>>
  onSaved: () => void
}) {
  const [search, setSearch] = React.useState("")
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  // Build keyword rows: for each audit page, look up the stored keywords
  // from bySection.keywords[pageKey]
  const rows = React.useMemo(() => {
    return pages.map((p) => {
      const pageKey = urlToPageKey(p.url)
      const kwStr = bySection.keywords?.[pageKey] || ""
      const keywords = kwStr
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
      return { page: p, pageKey, keywords, kwStr }
    })
  }, [pages, bySection])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        r.page.name.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q)),
    )
  }, [rows, search])

  function openEditor(pageKey: string, kwStr: string) {
    setEditingKey(pageKey)
    setDraft(kwStr)
  }

  async function handleSave() {
    if (!editingKey) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/seo/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "keywords",
          key: editingKey,
          value: draft.trim(),
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to save")
      toast.success("Keywords saved")
      setEditingKey(null)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  /** For a given keyword, check if it appears in title / description / "H1" (page name). */
  function coverage(kw: string, page: AuditPage) {
    const k = kw.toLowerCase()
    return {
      inTitle: page.title.toLowerCase().includes(k),
      inDescription: page.description.toLowerCase().includes(k),
      inH1: page.name.toLowerCase().includes(k),
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-b border-border/60 bg-muted/20">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-300" /> Keyword Tracker
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Track target keywords per page and see if they appear in the title,
            description, or H1.
          </p>
        </div>
        <Input
          placeholder="Filter pages or keywords…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No pages match.
        </div>
      ) : (
        <div className="max-h-[640px] overflow-y-auto divide-y divide-border/40 custom-scrollbar">
          {filtered.map((r) => (
            <div key={r.page.url} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {r.page.name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {r.page.url}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.keywords.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        No keywords tracked yet
                      </span>
                    ) : (
                      r.keywords.map((kw) => {
                        const c = coverage(kw, r.page)
                        const allGood = c.inTitle && c.inDescription && c.inH1
                        const partial = c.inTitle || c.inDescription || c.inH1
                        return (
                          <span
                            key={kw}
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border",
                              allGood
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : partial
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-300 border-rose-500/30",
                            )}
                            title={`In title: ${c.inTitle ? "✓" : "✗"} · In description: ${c.inDescription ? "✓" : "✗"} · In H1: ${c.inH1 ? "✓" : "✗"}`}
                          >
                            {kw}
                            {allGood ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                          </span>
                        )
                      })
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => openEditor(r.pageKey, r.kwStr)}
                >
                  <Pencil className="h-3 w-3 mr-1.5" /> Edit Keywords
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Keywords Dialog */}
      <Dialog open={!!editingKey} onOpenChange={(v) => !v && setEditingKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-300" /> Edit Keywords —{" "}
              {editingKey}
            </DialogTitle>
            <DialogDescription>
              Enter one keyword or phrase per line (or comma-separated).
              Coverage is checked against the page's current title,
              description, and H1.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder={"cybersecurity\nCEH\nethical hacking"}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save Keywords
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* =================== Autopilot — one-click audit + fix =================== */

interface AutopilotIssue {
  type: string
  id: string
  label: string
  url: string
  issue: string
  severity: "critical" | "warning" | "info"
  autoFixable: boolean
}

interface AutopilotFix {
  type: string
  id: string
  label: string
  field: string
  before: string
  after: string
  pingUrl: string
  applied?: boolean
}

interface AutopilotReport {
  ok: boolean
  mode: "dry-run" | "apply"
  scoreBefore: number
  scoreAfter: number
  issues: AutopilotIssue[]
  fixes: AutopilotFix[]
  fixed: AutopilotFix[]
  skipped: { label: string; field: string; reason: string }[]
  humanActions: { label: string; reason: string }[]
  ping: { submitted: number; status: number | null; ok: boolean; note?: string } | null
  counts: { total: number; byType: Record<string, number> }
}

function scoreTextClass(score: number): string {
  if (score >= 90) return "text-emerald-300"
  if (score >= 70) return "text-amber-300"
  return "text-rose-300"
}

function SeoAutopilot({ onFixed }: { onFixed: () => void }) {
  const [running, setRunning] = React.useState<"dry-run" | "apply" | null>(null)
  const [report, setReport] = React.useState<AutopilotReport | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  async function run(mode: "dry-run" | "apply") {
    setRunning(mode)
    try {
      const r = await fetch("/api/admin/seo/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const j = await r.json()
      if (!r.ok || !j.ok) throw new Error(j.error || `Request failed (${r.status})`)
      setReport(j as AutopilotReport)
      if (mode === "apply") {
        const n = (j.fixed as AutopilotFix[] | undefined)?.length ?? 0
        if (n > 0) toast.success(`Autopilot fixed ${n} issue${n === 1 ? "" : "s"}`)
        else toast.info("Nothing left to auto-fix — you are all clean")
        onFixed()
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Hero action card */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden>
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-violet-500/30 blur-3xl" />
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
          <div className="flex items-start gap-4">
            <span className="h-12 w-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6 text-amber-300" />
            </span>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                SEO Autopilot
                <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] uppercase tracking-wider">One Click</Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Scans every course, blog post, event and certification for missing
                descriptions, excerpts and slugs — then fixes them automatically from
                each item&apos;s own content and pings search engines to recrawl instantly.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              variant="outline"
              disabled={running !== null}
              onClick={() => run("dry-run")}
            >
              {running === "dry-run" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4 mr-1.5" />
              )}
              Run Smart Audit
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white"
              disabled={running !== null}
              onClick={() => (report?.mode === "dry-run" ? setConfirmOpen(true) : run("apply"))}
            >
              {running === "apply" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1.5" />
              )}
              Fix Everything Automatically
            </Button>
          </div>
        </div>
      </Card>

      {/* Report */}
      {report && (
        <FadeIn>
          <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-5 lg:p-6 space-y-5">
            {/* Score row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
                <div className={cn("text-2xl font-bold mt-1", scoreTextClass(report.scoreBefore))}>
                  {report.scoreBefore}
                  {report.scoreAfter !== report.scoreBefore && (
                    <span className="text-sm font-medium text-muted-foreground"> → </span>
                  )}
                  {report.scoreAfter !== report.scoreBefore && (
                    <span className={scoreTextClass(report.scoreAfter)}>{report.scoreAfter}</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {report.mode === "apply" ? "measured after fixes" : "projected after fixes"}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Issues Found</div>
                <div className="text-2xl font-bold mt-1">{report.issues.length}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">across {report.counts.total} pages</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-Fixed</div>
                <div className="text-2xl font-bold mt-1 text-emerald-300">{report.fixed.length}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {report.mode === "apply" ? "written just now" : "available to apply"}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Search Engine Ping</div>
                <div className="text-2xl font-bold mt-1 flex items-center gap-1.5">
                  {report.ping ? (
                    report.ping.ok ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-300" />
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {report.ping ? <span className="text-sm">{report.ping.submitted} URLs</span> : ""}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">IndexNow (Bing &amp; co.)</div>
              </div>
            </div>

            {report.ping?.note && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border/40 p-3">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {report.ping.note}
              </div>
            )}

            {/* Fixes applied / available */}
            {report.fixes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  {report.mode === "apply" ? "Fixes Written" : "Fixes Ready To Apply"} ({report.fixes.length})
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {report.fixes.slice(0, 50).map((f, i) => (
                    <div key={`${f.id}-${f.field}-${i}`} className="rounded-lg border border-border/50 bg-muted/10 p-3 flex items-start gap-3">
                      <Badge variant="outline" className="text-[9px] uppercase mt-0.5 shrink-0">{f.type}</Badge>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{f.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="text-amber-300/90 uppercase text-[10px] font-mono mr-1">{f.field}</span>
                          {f.before ? (
                            <span className="line-through opacity-60">{f.before.slice(0, 90)}{f.before.length > 90 ? "…" : ""}</span>
                          ) : (
                            <span className="opacity-60">(empty)</span>
                          )}
                          <span className="mx-1.5">→</span>
                          <span className="text-emerald-300/90">{f.after.slice(0, 110)}{f.after.length > 110 ? "…" : ""}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {report.fixes.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      + {report.fixes.length - 50} more…
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Remaining issues (apply mode) */}
            {report.mode === "apply" && report.issues.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Still Open ({report.issues.length})
                </h3>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {report.issues.slice(0, 30).map((is, i) => (
                    <div key={`${is.id}-${i}`} className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                          is.severity === "critical" ? "bg-rose-400" : is.severity === "warning" ? "bg-amber-400" : "bg-slate-400",
                        )}
                      />
                      <span className="truncate">{is.label}</span>
                      <span className="text-muted-foreground">— {is.issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Human actions */}
            {report.humanActions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-cyan-300" />
                  Needs You ({report.humanActions.length})
                </h3>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {report.humanActions.slice(0, 20).map((h, i) => (
                    <div key={i} className="rounded-lg border border-border/40 bg-cyan-500/5 p-2.5 text-xs">
                      <span className="font-medium">{h.label}</span>
                      <span className="text-muted-foreground"> — {h.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </FadeIn>
      )}

      {/* Confirm apply */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply {report?.fixes.length ?? 0} automatic fixes?</DialogTitle>
            <DialogDescription>
              Generated descriptions, excerpts and slugs will be written to the live
              content. Only empty or too-short fields are touched — existing well-formed
              content is never overwritten. Search engines are pinged afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={running !== null} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white"
              disabled={running !== null}
              onClick={() => {
                setConfirmOpen(false)
                run("apply")
              }}
            >
              {running === "apply" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
              Yes, fix everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* =================== main view =================== */
export function AdminSeoView() {
  const { navigate } = useAppStore()
  const qc = useQueryClient()
  const [tab, setTab] = React.useState("autopilot")
  const [editingPage, setEditingPage] = React.useState<AuditPage | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  // Audit query
  const auditQuery = useQuery<AuditResult>({
    queryKey: ["admin", "seo", "audit"],
    queryFn: async () => {
      const r = await fetch("/api/admin/seo/audit")
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "Failed to audit")
      return j as AuditResult
    },
    staleTime: 60_000,
  })

  // Meta query (global + per-page overrides + keywords + robots)
  const metaQuery = useQuery<MetaResponse>({
    queryKey: ["admin", "seo", "meta"],
    queryFn: async () => {
      const r = await fetch("/api/admin/seo/meta")
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || "Failed to load SEO meta")
      return { bySection: j.bySection || {} } as MetaResponse
    },
    staleTime: 30_000,
  })

  // Estimate sitemap URL count = static routes + dynamic content count
  // We can't fetch /api/sitemap.xml as XML easily here — use the audit count
  // as a proxy (it includes all dynamic content + static pages).
  const sitemapUrlCount = auditQuery.data?.totalPages ?? 0

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ["admin", "seo"] })
    toast.success("SEO data refreshed")
  }

  function handleEditPage(p: AuditPage) {
    setEditingPage(p)
    setEditOpen(true)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Search className="h-4 w-4 text-cyan-300" />
              </span>
              SEO Optimization
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              Live Audit
            </span>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {auditQuery.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : auditQuery.error ? (
          <Card className="p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
            <p className="font-medium mb-1">Failed to load SEO audit</p>
            <p className="text-sm text-muted-foreground">
              {(auditQuery.error as Error).message}
            </p>
            <Button variant="outline" className="mt-4" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
            </Button>
          </Card>
        ) : (
          <>
            {/* A. Health Score */}
            <FadeIn>
              <Card className="bg-card/40 backdrop-blur-xl border-border/60 p-6 lg:p-8">
                <ScoreGauge
                  score={auditQuery.data?.score ?? 0}
                  totalPages={auditQuery.data?.totalPages ?? 0}
                  totalIssues={auditQuery.data?.totalIssues ?? 0}
                />
              </Card>
            </FadeIn>

            {/* Tabs for the remaining sections */}
            <FadeIn delay={0.05}>
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 bg-muted/40">
                  <TabsTrigger value="autopilot" className="text-xs">
                    <Zap className="h-3.5 w-3.5" /> Autopilot
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs">
                    <ListChecks className="h-3.5 w-3.5" /> Page Audit
                  </TabsTrigger>
                  <TabsTrigger value="meta" className="text-xs">
                    <Code2 className="h-3.5 w-3.5" /> Meta Tags
                  </TabsTrigger>
                  <TabsTrigger value="sitemap" className="text-xs">
                    <Hash className="h-3.5 w-3.5" /> Sitemap
                  </TabsTrigger>
                  <TabsTrigger value="robots" className="text-xs">
                    <Bot className="h-3.5 w-3.5" /> robots.txt
                  </TabsTrigger>
                  <TabsTrigger value="structured" className="text-xs">
                    <Braces className="h-3.5 w-3.5" /> Structured Data
                  </TabsTrigger>
                  <TabsTrigger value="keywords" className="text-xs">
                    <Tag className="h-3.5 w-3.5" /> Keywords
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="autopilot" className="mt-4">
                  <SeoAutopilot
                    onFixed={() =>
                      qc.invalidateQueries({ queryKey: ["admin", "seo"] })
                    }
                  />
                </TabsContent>
                <TabsContent value="audit" className="mt-4">
                  <PageAuditTable
                    pages={auditQuery.data?.pages ?? []}
                    onEdit={handleEditPage}
                  />
                </TabsContent>
                <TabsContent value="meta" className="mt-4">
                  <MetaTagsManager
                    global={metaQuery.data?.bySection.global ?? {}}
                    onSaved={() =>
                      qc.invalidateQueries({ queryKey: ["admin", "seo", "meta"] })
                    }
                  />
                </TabsContent>
                <TabsContent value="sitemap" className="mt-4">
                  <SitemapManager totalUrls={sitemapUrlCount} />
                </TabsContent>
                <TabsContent value="robots" className="mt-4">
                  <RobotsEditor
                    content={metaQuery.data?.bySection.robots?.content ?? ""}
                    onSaved={() =>
                      qc.invalidateQueries({ queryKey: ["admin", "seo", "meta"] })
                    }
                  />
                </TabsContent>
                <TabsContent value="structured" className="mt-4">
                  <StructuredDataOverview
                    totalPages={auditQuery.data?.totalPages ?? 0}
                    courseCount={
                      auditQuery.data?.pages.filter((p) =>
                        p.name.startsWith("Course: "),
                      ).length ?? 0
                    }
                    eventCount={
                      auditQuery.data?.pages.filter((p) =>
                        p.name.startsWith("Event: "),
                      ).length ?? 0
                    }
                    blogCount={
                      auditQuery.data?.pages.filter((p) =>
                        p.name.startsWith("Blog: "),
                      ).length ?? 0
                    }
                    certCount={
                      auditQuery.data?.pages.filter((p) =>
                        p.name.startsWith("Cert: "),
                      ).length ?? 0
                    }
                  />
                </TabsContent>
                <TabsContent value="keywords" className="mt-4">
                  <KeywordTracker
                    pages={auditQuery.data?.pages ?? []}
                    bySection={metaQuery.data?.bySection ?? {}}
                    onSaved={() =>
                      qc.invalidateQueries({ queryKey: ["admin", "seo", "meta"] })
                    }
                  />
                </TabsContent>
              </Tabs>
            </FadeIn>
          </>
        )}
      </div>

      <EditSeoDialog
        page={editingPage}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "seo"] })
        }}
      />
    </div>
  )
}
