"use client"

/**
 * AdminBatchHubView — Batch Leads Hub (redesigned batch/leads surface).
 *
 * Replaces the old "select a batch from a dropdown inside a CRM tab" UX:
 *   • Screen 1 — master: one card per batch with live lead counts
 *     (total + unworked "New"), seats fill, form-connection status.
 *   • Screen 2 — every batch opens its OWN screen: batch hero, pipeline
 *     stats, the leads captured for that batch, CSV export, and the
 *     full Google Apps Script displayed inline with one-click copy-paste
 *     (batch ID baked in, nothing to edit manually).
 *
 * APIs used (all ADMIN-gated):
 *   GET    /api/admin/training-batches                       (list + leadCount/newLeadCount)
 *   GET    /api/admin/training-batches/[id]/leads            (per-batch leads + byStatus)
 *   PATCH  /api/admin/training-batches/[id]/leads/[leadId]   (status / adminNotes)
 *   DELETE /api/admin/training-batches/[id]/leads/[leadId]
 *   GET    /api/admin/training-batches/[id]/apps-script?format=json
 *   PATCH  /api/admin/training-batches/[id]                  (googleFormUrl)
 */

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  ArrowLeft, ArrowRight, Users, Calendar, Clock, User, CheckCircle2,
  XCircle, Search, FileText, FileCode, Copy, Check, Download, ExternalLink,
  Loader2, Trash2, Phone, Linkedin, Briefcase, Inbox, MessageCircle,
  LayoutGrid, Signal,
} from "lucide-react"

// ============================================================
// Types + constants
// ============================================================
interface TrainingBatchRow {
  id: string
  certification: string
  name: string
  schedule: string
  startDate: string
  startIsoDate: string | null
  mode: string
  instructor: string
  seats: number
  enrolled: number
  level: string
  status: string
  description: string
  featured: boolean
  published: boolean
  googleFormUrl: string | null
  leadCount?: number
  newLeadCount?: number
  certColor?: string
  certTint?: string
  certBorder?: string
}

interface BatchLeadRow {
  id: string
  name: string
  whatsappNumber: string
  linkedinProfile: string | null
  professionalStatus: string | null
  jobRole: string | null
  status: string
  adminNotes: string | null
  source: string
  createdAt: string
}

interface AppsScriptPayload {
  ok: boolean
  script: string
  fileName: string
  webhookUrl: string
  batchId: string
  batchName: string
  certification: string
  formQuestions: string[]
}

const BATCH_LEAD_STATUSES = [
  { value: "New", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400" },
  { value: "Contacted", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  { value: "Qualified", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", dot: "bg-violet-400" },
  { value: "Enrolled", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { value: "Lost", color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-400" },
]

const BATCH_STATUS_TINT: Record<string, string> = {
  Open: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  "Almost Full": "text-amber-300 border-amber-500/30 bg-amber-500/10",
  Full: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  Completed: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10",
  Cancelled: "text-rose-300 border-rose-500/30 bg-rose-500/10",
}

// ============================================================
// Helpers
// ============================================================
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function csvEscape(v: string | null | undefined): string {
  const s = v ?? ""
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadLeadsCsv(batchName: string, leads: BatchLeadRow[]) {
  const header = ["Name", "WhatsApp", "LinkedIn", "Professional Status", "Job Role", "Pipeline Status", "Source", "Captured At"]
  const lines = leads.map((l) =>
    [l.name, l.whatsappNumber, l.linkedinProfile, l.professionalStatus, l.jobRole, l.status, l.source, l.createdAt]
      .map(csvEscape)
      .join(",")
  )
  // BOM so Excel opens UTF-8 correctly
  const csv = "\uFEFF" + header.join(",") + "\n" + lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `guardianx-leads-${batchName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "batch"}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Copy button used across the hub (script, webhook URL, etc.). */
function CopyBtn({ text, label, copiedLabel, size = "sm" }: { text: string; label?: string; copiedLabel?: string; size?: "sm" | "default" }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      size={size}
      variant="outline"
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) {
          setCopied(true)
          toast.success(copiedLabel || "Copied to clipboard")
          setTimeout(() => setCopied(false), 2000)
        } else {
          toast.error("Copy failed — select the text manually")
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? (copiedLabel ? "Copied!" : "Copied") : (label || "Copy")}
    </Button>
  )
}

// ============================================================
// Root — master screen OR per-batch screen
// ============================================================
export function AdminBatchHubView({ initialBatchId }: { initialBatchId?: string }) {
  const { navigate } = useAppStore()
  const [openBatchId, setOpenBatchId] = React.useState<string | null>(initialBatchId ?? null)

  // Keep internal state in sync with the URL (browser back/forward).
  React.useEffect(() => {
    setOpenBatchId(initialBatchId ?? null)
  }, [initialBatchId])

  const { data: batchesData, isLoading } = useQuery<{ batches: TrainingBatchRow[] }>({
    queryKey: ["admin-batch-hub", "batches"],
    queryFn: () => api("/api/admin/training-batches"),
    refetchInterval: 30_000,
  })
  const batches = batchesData?.batches ?? []
  const openBatch = batches.find((b) => b.id === openBatchId) ?? null

  // Stale deep-link (batch deleted) → fall back to the master grid.
  React.useEffect(() => {
    if (!isLoading && openBatchId && batches.length > 0 && !openBatch) {
      setOpenBatchId(null)
    }
  }, [isLoading, openBatchId, openBatch, batches.length])

  const openBatchScreen = (id: string) => {
    setOpenBatchId(id)
    navigate({ name: "admin-batch-hub", batchId: id })
  }
  const backToHub = () => {
    setOpenBatchId(null)
    navigate({ name: "admin-batch-hub" })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {openBatchId && !openBatch && isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : openBatch ? (
        <BatchScreen batch={openBatch} onBack={backToHub} />
      ) : (
        <HubMaster
          batches={batches}
          isLoading={isLoading}
          onOpen={openBatchScreen}
        />
      )}
    </div>
  )
}

// ============================================================
// Screen 1 — master grid: one card per batch
// ============================================================
function HubMaster({ batches, isLoading, onOpen }: { batches: TrainingBatchRow[]; isLoading: boolean; onOpen: (id: string) => void }) {
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"order" | "new" | "leads">("order")

  const totalLeads = batches.reduce((s, b) => s + (b.leadCount ?? 0), 0)
  const totalNew = batches.reduce((s, b) => s + (b.newLeadCount ?? 0), 0)

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? batches.filter((b) =>
          b.name.toLowerCase().includes(q) ||
          b.certification.toLowerCase().includes(q) ||
          b.instructor.toLowerCase().includes(q)
        )
      : batches
    if (sortBy === "new") return [...filtered].sort((a, b) => (b.newLeadCount ?? 0) - (a.newLeadCount ?? 0))
    if (sortBy === "leads") return [...filtered].sort((a, b) => (b.leadCount ?? 0) - (a.leadCount ?? 0))
    return filtered
  }, [batches, search, sortBy])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-violet-300" /> Batch Leads Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Every batch gets its own screen — open one to see its captured leads, pipeline and the copy-paste Apps Script.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatPill label="Batches" value={batches.length} />
          <StatPill label="Total leads" value={totalLeads} tone="text-violet-300" />
          <StatPill label="Unworked" value={totalNew} tone={totalNew > 0 ? "text-blue-300" : undefined} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search batches by name, certification or instructor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          {([["order", "Course order"], ["new", "Most new"], ["leads", "Most leads"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSortBy(v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                sortBy === v
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-52 rounded-2xl border border-border/60 bg-card/30 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border/60">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {batches.length === 0 ? "No training batches yet" : "No batches match your search"}
          </p>
          {batches.length === 0 && (
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
              Create your first batch from the Batch Calendar — it will appear here with its own leads screen.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((b) => <BatchCard key={b.id} batch={b} onOpen={() => onOpen(b.id)} />)}
        </div>
      )}
    </div>
  )
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-center min-w-[86px]">
      <div className={cn("text-lg font-bold tabular-nums leading-none", tone)}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function BatchCard({ batch, onOpen }: { batch: TrainingBatchRow; onOpen: () => void }) {
  const pct = batch.seats > 0 ? Math.min(100, Math.round((batch.enrolled / batch.seats) * 100)) : 0
  const barColor = pct >= 100 ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
  const newLeads = batch.newLeadCount ?? 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left rounded-2xl border border-border/60 bg-card/30 p-5 transition-all hover:border-violet-500/40 hover:bg-card/50 flex flex-col gap-3"
    >
      {/* Top row: cert + batch status + form indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn("text-[10px] text-white border-0", batch.certTint || "bg-violet-500/15", batch.certColor || "text-violet-300", "border", batch.certBorder || "border-violet-500/30")}>
          {batch.certification}
        </Badge>
        <Badge variant="outline" className={cn("text-[9px]", BATCH_STATUS_TINT[batch.status] || "")}>{batch.status}</Badge>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium">
          {batch.googleFormUrl ? (
            <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Form live</span>
          ) : (
            <span className="text-amber-300/80 flex items-center gap-1"><XCircle className="h-3 w-3" /> No form</span>
          )}
        </span>
      </div>

      {/* Name + meta */}
      <div className="min-w-0">
        <h3 className="font-semibold text-[15px] truncate group-hover:text-violet-200 transition-colors">{batch.name || `${batch.certification} batch`}</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5 flex-wrap">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {batch.instructor || "TBD"}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {batch.startDate || "TBD"}</span>
          <span className="flex items-center gap-1"><Signal className="h-3 w-3" /> {batch.mode}</span>
        </div>
      </div>

      {/* Seats fill */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {batch.enrolled}/{batch.seats} enrolled</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Leads summary */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40 mt-auto">
        <span className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
          <Users className="h-3.5 w-3.5 text-muted-foreground" /> {batch.leadCount ?? 0}
          <span className="text-[10px] font-normal text-muted-foreground">leads</span>
        </span>
        {newLeads > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            {newLeads} new
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-violet-300 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
          Open batch screen <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

// ============================================================
// Screen 2 — ONE BATCH: its own screen with its own leads
// ============================================================
function BatchScreen({ batch, onBack }: { batch: TrainingBatchRow; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [search, setSearch] = React.useState("")
  const [selectedLead, setSelectedLead] = React.useState<BatchLeadRow | null>(null)

  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ leads: BatchLeadRow[]; count: number; byStatus: Record<string, number> }>({
    queryKey: ["admin-batch-hub", "leads", batch.id, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      return api(`/api/admin/training-batches/${batch.id}/leads?${params.toString()}`)
    },
    refetchInterval: 30_000,
  })

  const leads = leadsData?.leads ?? []
  const byStatus = leadsData?.byStatus ?? { New: 0, Contacted: 0, Qualified: 0, Enrolled: 0, Lost: 0 }
  const total = leadsData?.count ?? 0
  const conversion = total > 0 ? Math.round(((byStatus.Enrolled ?? 0) / total) * 100) : 0

  const filteredLeads = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.whatsappNumber.includes(search.trim()) ||
      (l.linkedinProfile || "").toLowerCase().includes(q) ||
      (l.jobRole || "").toLowerCase().includes(q)
    )
  }, [leads, search])

  const pct = batch.seats > 0 ? Math.min(100, Math.round((batch.enrolled / batch.seats) * 100)) : 0

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All batches
      </button>

      {/* Batch hero */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("text-[10px] text-white border-0 bg-violet-500")}>{batch.certification}</Badge>
              <Badge variant="outline" className="text-[9px]">{batch.level}</Badge>
              <Badge variant="outline" className={cn("text-[9px]", BATCH_STATUS_TINT[batch.status] || "")}>{batch.status}</Badge>
              {batch.featured && <Badge variant="outline" className="text-[9px] border-violet-500/40 text-violet-300">Featured</Badge>}
              {!batch.published && <Badge variant="outline" className="text-[9px] border-zinc-500/40 text-zinc-400">Draft</Badge>}
            </div>
            <h1 className="text-xl font-bold mt-2">{batch.name || `${batch.certification} batch`}</h1>
            {batch.description && <p className="text-xs text-muted-foreground mt-1 max-w-2xl line-clamp-2">{batch.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> {batch.instructor || "TBD"}</span>
            <span className="flex items-center gap-1.5"><Signal className="h-3 w-3" /> {batch.mode}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {batch.schedule || "TBD"}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Starts {batch.startDate || "TBD"}</span>
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {batch.enrolled}/{batch.seats} seats ({pct}%)</span>
            <span className={cn("flex items-center gap-1.5", batch.googleFormUrl ? "text-emerald-300" : "text-amber-300/80")}>
              {batch.googleFormUrl ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {batch.googleFormUrl ? "Form connected" : "Form not connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{total}</div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">Total leads</div>
        </div>
        {BATCH_LEAD_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "ALL" : s.value)}
            className={cn(
              "rounded-xl border p-3 text-center transition-all",
              statusFilter === s.value ? cn(s.border, s.bg, "ring-1 ring-inset ring-current/20") : cn(s.border, "bg-card/40 hover:bg-muted/20")
            )}
          >
            <div className={cn("text-2xl font-bold tabular-nums", s.color)}>{byStatus[s.value] || 0}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{s.value}</div>
          </button>
        ))}
      </div>

      {/* Main: leads (left) + capture setup (right) */}
      <div className="grid gap-5 xl:grid-cols-5">
        {/* Leads */}
        <div className="xl:col-span-3 rounded-2xl border border-border/60 bg-card/40 overflow-hidden flex flex-col">
          <div className="p-4 space-y-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-violet-300" /> Captured Leads
                <span className="text-[10px] font-mono text-muted-foreground">({total})</span>
                {conversion > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    {conversion}% enrolled
                  </span>
                )}
              </h2>
              <Button
                size="sm"
                variant="outline"
                disabled={leads.length === 0}
                onClick={() => { downloadLeadsCsv(batch.name || batch.certification, leads); toast.success(`Exported ${leads.length} leads to CSV`) }}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, WhatsApp, LinkedIn or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {leads.length === 0 ? "No leads captured for this batch yet" : "No leads match your search"}
                </p>
                {leads.length === 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                    Copy the Apps Script from the Lead Capture panel into your Google Form — every submission lands here instantly.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filteredLeads.map((lead) => (
                  <BatchLeadItem key={lead.id} lead={lead} onOpen={() => setSelectedLead(lead)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Capture setup */}
        <div className="xl:col-span-2 space-y-5">
          <CaptureSetup batch={batch} />
        </div>
      </div>

      {/* Lead detail dialog */}
      {selectedLead && (
        <BatchLeadDialog
          lead={selectedLead}
          batchId={batch.id}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["admin-batch-hub"] })}
        />
      )}
    </div>
  )
}

function BatchLeadItem({ lead, onOpen }: { lead: BatchLeadRow; onOpen: () => void }) {
  const statusMeta = BATCH_LEAD_STATUSES.find((s) => s.value === lead.status) || BATCH_LEAD_STATUSES[0]
  const waDigits = lead.whatsappNumber.replace(/[^0-9]/g, "")
  return (
    <div className="w-full p-4 hover:bg-violet-500/[0.04] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="flex items-start gap-3 min-w-0 flex-1 text-left">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/10 text-violet-300 font-semibold text-sm shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="font-medium text-sm truncate">{lead.name}</span>
              <Badge variant="outline" className={cn("text-[9px] shrink-0", statusMeta.color, statusMeta.border, statusMeta.bg)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1", statusMeta.dot)} />
                {lead.status}
              </Badge>
              <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">{lead.source}</Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap mt-0.5">
              <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /> {lead.whatsappNumber}</span>
              {lead.jobRole && <span className="flex items-center gap-0.5"><Briefcase className="h-3 w-3" /> {lead.jobRole}</span>}
              {lead.professionalStatus && <span>· {lead.professionalStatus}</span>}
              <span className="flex items-center gap-0.5 ml-auto"><Clock className="h-3 w-3" /> {timeAgo(lead.createdAt)}</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {waDigits && (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Chat on WhatsApp"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {lead.linkedinProfile && (
            <a
              href={lead.linkedinProfile}
              target="_blank"
              rel="noopener noreferrer"
              title="Open LinkedIn profile"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-sky-400/80 hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          )}
          <button type="button" onClick={onOpen} title="Open lead" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Lead detail dialog (status + notes + delete)
// ============================================================
function BatchLeadDialog({ lead, batchId, onClose, onUpdated }: { lead: BatchLeadRow; batchId: string; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = React.useState(lead.status)
  const [adminNotes, setAdminNotes] = React.useState(lead.adminNotes || "")
  const [saving, setSaving] = React.useState(false)
  const hasChanges = status !== lead.status || adminNotes !== (lead.adminNotes || "")

  const handleSave = async () => {
    setSaving(true)
    try {
      await api(`/api/admin/training-batches/${batchId}/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNotes }),
      })
      toast.success("Lead updated")
      onUpdated()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return
    try {
      await api(`/api/admin/training-batches/${batchId}/leads/${lead.id}`, { method: "DELETE" })
      toast.success("Lead deleted")
      onUpdated()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || "Delete failed")
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 text-violet-300 font-semibold text-sm">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            {lead.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={Phone} label="WhatsApp" value={lead.whatsappNumber} link={`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}`} />
            <InfoRow icon={Briefcase} label="Job role" value={lead.jobRole || "—"} />
            <InfoRow icon={User} label="Professional status" value={lead.professionalStatus || "—"} />
            <InfoRow icon={Linkedin} label="LinkedIn" value={lead.linkedinProfile ? "View profile" : "—"} link={lead.linkedinProfile || undefined} />
          </div>

          <div className="border-t border-border/60 pt-3">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Pipeline status</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {BATCH_LEAD_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[9px] font-medium transition-all",
                    status === s.value ? cn(s.bg, s.color, s.border) : "border-border/60 bg-card/40 hover:bg-muted/20 text-muted-foreground"
                  )}
                >
                  {s.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="hub-lead-notes" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Admin notes</Label>
            <Textarea id="hub-lead-notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Call notes, follow-up reminders..." className="resize-none text-sm" maxLength={5000} />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between flex-row flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ icon: Icon, label, value, link }: { icon: any; label: string; value: string; link?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-2.5">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-300 hover:underline flex items-center gap-1 truncate">
          {value} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
        </a>
      ) : (
        <div className="text-xs font-medium truncate">{value}</div>
      )}
    </div>
  )
}

// ============================================================
// CaptureSetup — Google Form URL + VISIBLE copy-paste Apps Script
// ============================================================
function CaptureSetup({ batch }: { batch: TrainingBatchRow }) {
  const queryClient = useQueryClient()
  const [formUrl, setFormUrl] = React.useState(batch.googleFormUrl || "")
  const [savingUrl, setSavingUrl] = React.useState(false)

  // Re-sync the input when the batch row refreshes (e.g. after save).
  React.useEffect(() => {
    setFormUrl(batch.googleFormUrl || "")
  }, [batch.googleFormUrl])

  const handleSaveUrl = async () => {
    setSavingUrl(true)
    try {
      await api(`/api/admin/training-batches/${batch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ googleFormUrl: formUrl.trim() || null }),
      })
      toast.success("Google Form URL saved")
      queryClient.invalidateQueries({ queryKey: ["admin-batch-hub"] })
      queryClient.invalidateQueries({ queryKey: ["admin-training-batches"] })
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSavingUrl(false)
    }
  }

  // The script itself — fetched as JSON so it can be SHOWN inline.
  const { data: scriptData, isLoading: scriptLoading, error: scriptError } = useQuery<AppsScriptPayload>({
    queryKey: ["admin-batch-hub", "apps-script", batch.id],
    queryFn: () => api(`/api/admin/training-batches/${batch.id}/apps-script?format=json`),
    retry: false,
    staleTime: 5 * 60_000,
  })
  const secretMissing = (scriptError as any)?.status === 503
  const downloadUrl = `/api/admin/training-batches/${batch.id}/apps-script`

  return (
    <div className="space-y-5">
      {/* ── Google Form connection ── */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-300" /> Google Form
          </h2>
          <span className={cn("text-[10px] font-medium flex items-center gap-1", batch.googleFormUrl ? "text-emerald-300" : "text-amber-300/80")}>
            {batch.googleFormUrl ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {batch.googleFormUrl ? "Connected" : "Not connected"}
          </span>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Form URL for this batch</Label>
          <div className="flex gap-2">
            <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://forms.gle/..." className="text-sm" />
            <Button onClick={handleSaveUrl} disabled={savingUrl || formUrl === (batch.googleFormUrl || "")} size="sm" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shrink-0">
              {savingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {formUrl && (
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline">
              Open this batch's form <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* ── Apps Script — FULLY VISIBLE for copy-paste ── */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FileCode className="h-4 w-4 text-violet-300" /> Lead Capture Script
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pre-configured for <span className="text-foreground font-medium">{batch.name || batch.certification}</span> — batch ID is baked in, nothing to edit. Paste it into the form's Script Editor.
          </p>
        </div>

        {scriptLoading ? (
          <div className="flex items-center justify-center py-10 rounded-xl border border-border/40 bg-zinc-950/40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : secretMissing ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
            <p className="font-semibold flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> Webhook secret not configured</p>
            <p className="mt-1 text-amber-200/70">
              Set <span className="font-mono">CRM_WEBHOOK_SECRET</span> in Admin → Settings, then reopen this screen — the script will appear here.
            </p>
          </div>
        ) : scriptError || !scriptData ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200/90">
            Couldn't load the script. <button className="underline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-batch-hub", "apps-script", batch.id] })}>Retry</button>
          </div>
        ) : (
          <>
            {/* Code block with header actions */}
            <div className="rounded-xl border border-border/60 bg-zinc-950/60 overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-zinc-900/60 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex gap-1 shrink-0">
                    <span className="h-2 w-2 rounded-full bg-rose-500/60" />
                    <span className="h-2 w-2 rounded-full bg-amber-500/60" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
                  </span>
                  <span className="font-mono text-[11px] text-zinc-300 truncate">{scriptData.fileName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer" title="Download .gs file">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <CopyBtn
                    text={scriptData.script}
                    label="Copy script"
                    copiedLabel="Script copied — paste it into the Google Form Script Editor"
                    size="sm"
                  />
                </div>
              </div>
              <pre className="max-h-[380px] overflow-auto custom-scrollbar p-4 text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre">
                {scriptData.script}
              </pre>
            </div>

            {/* Webhook URL (handy when debugging the script) */}
            <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Webhook endpoint (already baked into the script)</span>
                <CopyBtn text={scriptData.webhookUrl} label="Copy URL" copiedLabel="Webhook URL copied" size="sm" />
              </div>
              <p className="font-mono text-[11px] text-zinc-300 break-all">{scriptData.webhookUrl}</p>
            </div>

            {/* Form questions */}
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Add these 5 questions to the form (exact titles):</p>
              <div className="flex flex-wrap gap-1.5">
                {scriptData.formQuestions.map((q, i) => (
                  <span key={i} className="rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[10px] font-medium">
                    <span className="text-violet-300 font-mono mr-1">{i + 1}.</span>{q}
                  </span>
                ))}
              </div>
            </div>

            {/* Setup checklist */}
            <details className="text-xs text-muted-foreground" open>
              <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">Setup steps (click to collapse)</summary>
              <ol className="space-y-1.5 mt-2 pl-1">
                <li className="flex gap-2"><span className="text-violet-300 font-mono">1.</span> Create a Google Form at <a href="https://forms.new" target="_blank" rel="noreferrer" className="text-violet-300 hover:underline inline-flex items-center gap-0.5">forms.new <ExternalLink className="h-2.5 w-2.5" /></a></li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">2.</span> Add the 5 questions listed above (exact titles make the mapping bulletproof)</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">3.</span> 3-dot menu → <span className="text-foreground">Script editor</span> → delete default code → paste the copied script → Save</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">4.</span> Run <span className="font-mono text-foreground">setupTriggers</span> once and grant permissions</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">5.</span> Optional: run <span className="font-mono text-foreground">testWebhook</span> — a test lead should appear in the list on the left</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">6.</span> Copy the form URL into the Google Form field above → Save</li>
              </ol>
            </details>
          </>
        )}
      </div>
    </div>
  )
}
