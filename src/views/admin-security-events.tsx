"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Search, ShieldAlert, Loader2, KeyRound, Clock, LogIn,
  Fingerprint, Ban, Bug, Radar, Filter,
} from "lucide-react"

/* ============================================================
   Security Events panel - lives inside the Audit Log viewer as
   the "Security Events" tab (see admin-audit-log.tsx).
   ------------------------------------------------------------
   - Fetches /api/admin/security-events (ADMIN-only)
   - Event types: login_failed, login_rate_limited, login_success,
     session_invalid (forged/expired cookie), rbac_denied, honeypot_hit
   - 24h summary tiles, type filter, IP/email/path search,
     click-an-IP to pivot, expandable JSON details, pagination
   ============================================================ */

interface SecurityEventRow {
  id: string
  type: string
  severity: string
  ip: string | null
  country: string | null
  city: string | null
  userAgent: string | null
  email: string | null
  path: string | null
  details: string
  createdAt: string
}

interface SecurityEventsResponse {
  events: SecurityEventRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary24h: Array<{ type: string; count: number }>
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  login_failed: { label: "Login failed", icon: KeyRound, cls: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  login_rate_limited: { label: "Rate limited", icon: Clock, cls: "text-orange-300 bg-orange-500/10 border-orange-500/30" },
  login_success: { label: "Login OK", icon: LogIn, cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  session_invalid: { label: "Forged/expired session", icon: Fingerprint, cls: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30" },
  rbac_denied: { label: "RBAC denied", icon: Ban, cls: "text-violet-300 bg-violet-500/10 border-violet-500/30" },
  honeypot_hit: { label: "Honeypot hit", icon: Bug, cls: "text-rose-300 bg-rose-500/10 border-rose-500/30" },
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-cyan-400",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
}

function typeMeta(type: string) {
  return TYPE_META[type] ?? { label: type, icon: ShieldAlert, cls: "text-muted-foreground bg-muted/40 border-border/40" }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
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
  return formatTime(iso)
}

export function SecurityEventsPanel() {
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  const deferredSearch = React.useDeferredValue(search)
  const serverQ = deferredSearch.trim() || undefined
  const serverType = typeFilter === "all" ? undefined : typeFilter

  const { data, isLoading, isError, refetch, isFetching } = useQuery<SecurityEventsResponse>({
    queryKey: ["admin-security-events", serverType, serverQ, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" })
      if (serverType) params.set("type", serverType)
      if (serverQ) params.set("q", serverQ)
      const res = await fetch(`/api/admin/security-events?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Failed (${res.status})`)
      }
      return res.json()
    },
    staleTime: 15_000,
    refetchInterval: 60_000, // light live tail - refreshes once a minute
  })

  const events = data?.events ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const summary = data?.summary24h ?? []
  const summaryTotal = summary.reduce((a, s) => a + s.count, 0)

  React.useEffect(() => {
    setPage(1)
  }, [typeFilter, serverQ])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* 24h summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SecTile label="Events 24h" value={summaryTotal} tint="text-violet-300" />
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <SecTile
            key={type}
            label={meta.label}
            value={summary.find((s) => s.type === type)?.count ?? 0}
            tint={type === "login_success" ? "text-emerald-300" : type === "honeypot_hit" ? "text-rose-300" : "text-amber-300"}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search IP, email, path, user-agent…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <SelectItem key={type} value={type}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <Loader2 className={cn("h-3.5 w-3.5", (isLoading || isFetching) && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Event list */}
      <Card className="overflow-hidden">
        {isLoading && events.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Radar className="h-5 w-5 animate-pulse" />
            <p className="text-xs">Sweeping security telemetry…</p>
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-rose-400 text-sm">
            Failed to load security events. Check that you&apos;re signed in as an admin.
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <ShieldAlert className="h-8 w-8 mx-auto mb-3 opacity-50" />
            No security events recorded{typeFilter !== "all" || serverQ ? " for this filter" : " yet - quiet means healthy"}.
          </div>
        ) : (
          <ol className="divide-y divide-border/40">
            {events.map((ev, i) => {
              const meta = typeMeta(ev.type)
              const Icon = meta.icon
              const isExpanded = expanded.has(ev.id)
              const hasDetails = ev.details && ev.details !== "{}"
              return (
                <motion.li
                  key={ev.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(0.03 * i, 0.3) }}
                  className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SEVERITY_DOT[ev.severity] ?? "bg-cyan-400")} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border", meta.cls)}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                      {ev.email && (
                        <span className="text-xs font-medium text-foreground font-mono truncate max-w-[240px]">{ev.email}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{relativeTime(ev.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs">
                      {ev.ip && (
                        <button
                          type="button"
                          title="Filter by this IP"
                          onClick={() => { setSearch(ev.ip!); }}
                          className="font-mono text-cyan-300 hover:text-cyan-200 transition-colors"
                        >
                          {ev.ip}
                        </button>
                      )}
                      {(ev.city || ev.country) && (
                        <span className="text-[10px] text-muted-foreground">
                          {[ev.city, ev.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {ev.path && (
                        <code className="text-[10px] bg-muted/40 px-1 py-0.5 rounded font-mono">{ev.path}</code>
                      )}
                    </div>

                    {ev.userAgent && (
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate max-w-full" title={ev.userAgent}>
                        {ev.userAgent}
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">{formatTime(ev.createdAt)}</div>

                    {hasDetails && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleExpand(ev.id)}
                          className="text-[10px] text-violet-300 hover:text-violet-200 transition-colors"
                        >
                          {isExpanded ? "Hide details" : "Show details"}
                        </button>
                        {isExpanded && (
                          <pre className="mt-1.5 p-2 rounded-md bg-muted/40 border border-border/40 text-[10px] font-mono overflow-x-auto max-h-40">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(ev.details), null, 2)
                              } catch {
                                return ev.details
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
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
            Prev
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function SecTile({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{label}</div>
      <div className={cn("text-lg font-bold font-mono", tint)}>{value}</div>
    </div>
  )
}
