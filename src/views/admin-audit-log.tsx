"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Search, Shield, FileText, User,
  Award, BookOpen, Settings, Download, Loader2,
  Ticket, PenSquare, Trash2, Plus, Edit, CheckCircle2,
  Filter,
} from "lucide-react"

/* ============================================================
   /admin-audit-log — audit log timeline (real data)
   ------------------------------------------------------------
   - Fetches from /api/admin/audit-logs (ADMIN-only)
   - Filterable by action type (resource prefix) + search box
   - Timeline list: avatar, action badge, target, timestamp,
     optional JSON details expandable
   - Pagination (prev/next)
   ============================================================ */

interface AuditLogRow {
  id: string
  userId: string | null
  userName: string
  action: string
  resource: string
  resourceId: string | null
  details: string
  createdAt: string
}

interface AuditLogResponse {
  logs: AuditLogRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Resource prefix → icon
const RESOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Course: BookOpen,
  User: User,
  Coupon: Ticket,
  BlogPost: PenSquare,
  Certificate: Award,
  Batch: FileText,
  Exam: Shield,
}

// Action verb → icon
const VERB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  publish: CheckCircle2,
}

const VERB_COLORS: Record<string, { text: string; bg: string; border: string; label: string }> = {
  create: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Created" },
  update: { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", label: "Updated" },
  delete: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Deleted" },
  publish: { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", label: "Published" },
}

function verbOf(action: string): string {
  const parts = action.split(".")
  return parts[parts.length - 1] || action
}

function resourceOf(action: string, resource: string): string {
  if (resource) return resource
  const parts = action.split(".")
  return parts[0] || ""
}

function verbMeta(action: string) {
  const v = verbOf(action)
  return VERB_COLORS[v] ?? { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", label: v }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  return formatTime(iso)
}

export function AuditLogView() {
  const { navigate } = useAppStore()
  const [search, setSearch] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  // The action filter is the action prefix (e.g. "course", "user", "coupon").
  // Search is sent to the SERVER (q=...) so matches on any page are found —
  // it used to be a client-side filter over just the current 25 rows.
  const serverAction = actionFilter === "all" ? undefined : actionFilter
  const deferredSearch = React.useDeferredValue(search)
  const serverQ = deferredSearch.trim() || undefined

  const { data, isLoading, isError, refetch } = useQuery<AuditLogResponse>({
    queryKey: ["admin-audit-logs", serverAction, serverQ, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      })
      if (serverAction) params.set("action", serverAction)
      if (serverQ) params.set("q", serverQ)
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Failed (${res.status})`)
      }
      return res.json()
    },
    staleTime: 30_000,
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  // Client-side search filter on top of server action filter
  // Server-side search now handles free text; keep a local memo only as an
  // instant filter for the already-fetched page (server results land async).
  const filtered = React.useMemo(() => {
    return logs
  }, [logs])

  // Reset page when the action filter or search changes
  React.useEffect(() => {
    setPage(1)
  }, [actionFilter, serverQ])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    if (!logs.length) return
    // Export the FULL filtered trail (all pages), not just the visible 25 —
    // an audit export of one page is useless for compliance.
    const headers = ["id", "createdAt", "userId", "userName", "action", "resource", "resourceId", "details"]
    const all: any[] = []
    const maxPages = 40 // 40 × 100 = 4000 rows hard cap
    for (let p = 1; p <= maxPages; p++) {
      const params = new URLSearchParams({ page: String(p), pageSize: "100" })
      if (serverAction) params.set("action", serverAction)
      if (serverQ) params.set("q", serverQ)
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, { credentials: "include" })
      if (!res.ok) break
      const j = await res.json()
      all.push(...(j.logs ?? []))
      if (p >= (j.totalPages ?? 1)) break
    }
    if (all.length === 0) return
    const rows = all.map((l) =>
      headers
        .map((h) => `"${String((l as any)[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative min-h-screen">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-400" /> Audit Log Viewer
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              {total} total
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!logs.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, action, resource, details…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="coupon">Coupon</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <Loader2 className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total entries" value={total} tint="text-violet-300" />
          <StatTile label="Creates" value={logs.filter((l) => verbOf(l.action) === "create").length} tint="text-emerald-300" />
          <StatTile label="Updates" value={logs.filter((l) => verbOf(l.action) === "update").length} tint="text-cyan-300" />
          <StatTile label="Deletes" value={logs.filter((l) => verbOf(l.action) === "delete").length} tint="text-rose-300" />
        </div>

        {/* Log timeline */}
        <Card className="overflow-hidden">
          {isLoading && logs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-xs">Loading audit trail…</p>
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-rose-400 text-sm">
              Failed to load audit logs. Check that you&apos;re signed in as an admin.
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Shield className="h-8 w-8 mx-auto mb-3 opacity-50" />
              No audit log entries found.
            </div>
          ) : (
            <ol className="divide-y divide-border/40">
              {filtered.map((log, i) => {
                const Icon = RESOURCE_ICONS[resourceOf(log.action, log.resource)] ?? FileText
                const VerbIcon = VERB_ICONS[verbOf(log.action)] ?? Settings
                const meta = verbMeta(log.action)
                const isExpanded = expanded.has(log.id)
                const hasDetails = log.details && log.details !== "" && log.details !== "{}"
                return (
                  <motion.li
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(0.04 * i, 0.4) }}
                    className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Avatar / actor */}
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {log.userName?.charAt(0)?.toUpperCase() ?? "S"}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                            meta.text, meta.bg, meta.border,
                          )}
                        >
                          <VerbIcon className="h-3 w-3" /> {log.action}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {log.userName || "system"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {relativeTime(log.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-foreground mt-1.5">
                        <span className="text-muted-foreground">{meta.label}</span>{" "}
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Icon className="h-3.5 w-3.5" /> {resourceOf(log.action, log.resource)}
                        </span>
                        {log.resourceId && (
                          <>
                            {" "}
                            <span className="text-muted-foreground">·</span>{" "}
                            <code className="text-[10px] bg-muted/40 px-1 py-0.5 rounded font-mono">
                              {log.resourceId.slice(0, 12)}
                            </code>
                          </>
                        )}
                      </p>

                      <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                        {formatTime(log.createdAt)}
                      </div>

                      {hasDetails && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="text-[10px] text-violet-300 hover:text-violet-200 transition-colors"
                          >
                            {isExpanded ? "Hide details" : "Show details"}
                          </button>
                          {isExpanded && (
                            <pre className="mt-1.5 p-2 rounded-md bg-muted/40 border border-border/40 text-[10px] font-mono overflow-x-auto max-h-40">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(log.details), null, 2)
                                } catch {
                                  return log.details
                                }
                              })()}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Prev
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-lg font-bold font-mono", tint)}>{value}</div>
    </div>
  )
}
