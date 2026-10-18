"use client"

/**
 * Leads Hub - "Batch Enrollments" segment.
 *
 * Ported from the former standalone Batch Leads Hub (admin-batch-hub.tsx),
 * now living inside the unified Leads Hub as an internal drill-down:
 *   Screen 1 - master: one card per batch with live lead counts.
 *   Screen 2 - per-batch: leads list, pipeline stats, CSV export,
 *              form URL, and the copy-paste Apps Script with a
 *              one-click "Test delivery" button.
 */

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  ArrowLeft, ArrowRight, Users, Calendar, Clock, User, CheckCircle2, Check,
  XCircle, Search, Download, ExternalLink, Loader2, Trash2, Phone,
  Linkedin, Briefcase, Inbox, MessageCircle, LayoutGrid, Signal, Send, Mail,
} from "lucide-react"
import {
  type TrainingBatchRow, type BatchLeadRow, type AppsScriptPayload,
  BATCH_LEAD_STATUSES, BATCH_STATUS_TINT, useWebhookConfig, sendTestLead,
  timeAgo, downloadBatchLeadsCsv, CopyBtn, InfoRow,
} from "./shared"

// ============================================================
// Root - master screen OR per-batch screen (internal state, no navigate)
// ============================================================
export function BatchesSegment({ initialBatchId }: { initialBatchId?: string }) {
  const [openBatchId, setOpenBatchId] = React.useState<string | null>(initialBatchId ?? null)

  // Keep internal state in sync when a deep link re-mounts the segment.
  React.useEffect(() => {
    setOpenBatchId(initialBatchId ?? null)
  }, [initialBatchId])

  const { data: batchesData, isLoading } = useQuery<{ batches: TrainingBatchRow[] }>({
    queryKey: ["leads-hub", "batches"],
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

  if (openBatchId && !openBatch && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return openBatch ? (
    <BatchScreen batch={openBatch} onBack={() => setOpenBatchId(null)} />
  ) : (
    <HubMaster batches={batches} isLoading={isLoading} onOpen={setOpenBatchId} />
  )
}

// ============================================================
// Screen 1 - master grid: one card per batch
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
          <h2 className="text-base font-bold flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-violet-300" /> Batch enrollments
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Open a batch to see its captured leads, pipeline and the copy-paste capture script.
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
              Create your first batch from the Batch Calendar - it will appear here with its own leads screen and capture script.
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
// Screen 2 - ONE BATCH: its own screen with its own leads
// ============================================================
function BatchScreen({ batch, onBack }: { batch: TrainingBatchRow; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [search, setSearch] = React.useState("")
  const [selectedLead, setSelectedLead] = React.useState<BatchLeadRow | null>(null)

  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ leads: BatchLeadRow[]; count: number; byStatus: Record<string, number> }>({
    queryKey: ["leads-hub", "leads", batch.id, statusFilter],
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
      (l.email || "").toLowerCase().includes(q) ||
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
            <h2 className="text-xl font-bold mt-2">{batch.name || `${batch.certification} batch`}</h2>
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
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-violet-300" /> Captured Leads
                <span className="text-[10px] font-mono text-muted-foreground">({total})</span>
                {conversion > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    {conversion}% enrolled
                  </span>
                )}
              </h3>
              <Button
                size="sm"
                variant="outline"
                disabled={leads.length === 0}
                onClick={() => { downloadBatchLeadsCsv(batch.name || batch.certification, leads); toast.success(`Exported ${leads.length} leads to CSV`) }}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, WhatsApp, email, LinkedIn or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                    Copy the Apps Script from the Lead Capture panel into your Google Form - every submission lands here instantly. Use &quot;Test delivery&quot; to verify the pipe end-to-end.
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
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["leads-hub"] })}
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
              {lead.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" /> {lead.email}</span>}
              {lead.jobRole && <span className="flex items-center gap-0.5"><Briefcase className="h-3 w-3" /> {lead.jobRole}</span>}
              {lead.professionalStatus && <span>· {lead.professionalStatus}</span>}
              <span className="flex items-center gap-0.5 ml-auto"><Clock className="h-3 w-3" /> {timeAgo(lead.createdAt)}</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {waDigits && waDigits.length >= 10 && (
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
            <InfoRow icon={Phone} label="WhatsApp" value={lead.whatsappNumber} link={lead.whatsappNumber.replace(/[^0-9]/g, "").length >= 10 ? `https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}` : undefined} />
            <InfoRow icon={Mail} label="Email" value={lead.email || " - "} link={lead.email ? `mailto:${lead.email}` : undefined} />
            <InfoRow icon={Briefcase} label="Job role" value={lead.jobRole || " - "} />
            <InfoRow icon={User} label="Professional status" value={lead.professionalStatus || " - "} />
            <InfoRow icon={Linkedin} label="LinkedIn" value={lead.linkedinProfile ? "View profile" : " - "} link={lead.linkedinProfile || undefined} />
            <InfoRow icon={Clock} label="Captured" value={new Date(lead.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
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

// ============================================================
// CaptureSetup - Google Form URL + VISIBLE copy-paste Apps Script + test
// ============================================================
function CaptureSetup({ batch }: { batch: TrainingBatchRow }) {
  const queryClient = useQueryClient()
  const { data: config } = useWebhookConfig()
  const [formUrl, setFormUrl] = React.useState(batch.googleFormUrl || "")
  const [savingUrl, setSavingUrl] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

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
      queryClient.invalidateQueries({ queryKey: ["leads-hub"] })
      queryClient.invalidateQueries({ queryKey: ["admin-training-batches"] })
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSavingUrl(false)
    }
  }

  const handleTest = async () => {
    if (!config?.token) {
      toast.error(config && !config.configured ? "Webhook token not configured - generate it in the Pipeline tab" : "Webhook config not loaded yet")
      return
    }
    setTesting(true)
    try {
      const r = await sendTestLead(config.batchWebhookUrl, config.token, {
        batchId: batch.id,
        batchName: batch.name,
        certification: batch.certification,
        name: `[TEST] Capture check ${new Date().toLocaleTimeString("en-IN")}`,
        whatsappNumber: "+91 99999 99999",
        email: "capture-test@guardianx.test",
      })
      if (r.ok) {
        toast.success("Test lead delivered! It is in this batch's list (marked [TEST] - delete after checking).")
        queryClient.invalidateQueries({ queryKey: ["leads-hub"] })
      } else {
        toast.error(`Webhook replied ${r.status}: ${(r.body as any).error || "failed"}`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Test request failed")
    } finally {
      setTesting(false)
    }
  }

  // The script itself - fetched as JSON so it can be SHOWN inline.
  const { data: scriptData, isLoading: scriptLoading, error: scriptError } = useQuery<AppsScriptPayload>({
    queryKey: ["leads-hub", "apps-script", batch.id],
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
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-violet-300" /> Google Form
          </h3>
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
              Open this batch&apos;s form <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* ── Apps Script - FULLY VISIBLE for copy-paste ── */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Lead Capture Script
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pre-configured for <span className="text-foreground font-medium">{batch.name || batch.certification}</span> - batch ID and current token baked in, nothing to edit. Paste it into the form&apos;s Script Editor.
          </p>
        </div>

        {scriptLoading ? (
          <div className="flex items-center justify-center py-10 rounded-xl border border-border/40 bg-zinc-950/40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : secretMissing ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
            <p className="font-semibold flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> Webhook token not configured</p>
            <p className="mt-1 text-amber-200/70">
              Open the <span className="font-semibold">Pipeline</span> tab → &quot;Lead capture webhook&quot; card → generate a token, then come back - the script will appear here.
            </p>
          </div>
        ) : scriptError || !scriptData ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200/90">
            Couldn&apos;t load the script. <button className="underline" onClick={() => queryClient.invalidateQueries({ queryKey: ["leads-hub", "apps-script", batch.id] })}>Retry</button>
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
                    copiedLabel="Script copied - paste it into the Google Form Script Editor"
                    size="sm"
                  />
                </div>
              </div>
              <pre className="max-h-[380px] overflow-auto custom-scrollbar p-4 text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre">
                {scriptData.script}
              </pre>
            </div>

            {/* Test delivery */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-[11px] text-muted-foreground">
                <p className="font-medium text-emerald-200">Verify without Google Forms</p>
                <p className="mt-0.5">Sends a [TEST] lead through the real webhook - delete it after checking.</p>
              </div>
              <Button size="sm" onClick={handleTest} disabled={testing || !config?.configured} className="bg-emerald-600 hover:bg-emerald-500 shrink-0">
                {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Test delivery
              </Button>
            </div>

            {/* Form questions */}
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Add these questions to the form (titles containing these words are auto-mapped):</p>
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
                <li className="flex gap-2"><span className="text-violet-300 font-mono">2.</span> Add the questions listed above (titles containing those words are auto-mapped)</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">3.</span> 3-dot menu → <span className="text-foreground">Script editor</span> → delete default code → paste the copied script → Save</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">4.</span> Run <span className="font-mono text-foreground">setupTriggers</span> once and grant permissions - <span className="text-amber-300 font-medium">mandatory, without the trigger nothing is sent</span></li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">5.</span> Press <span className="font-mono text-foreground">Test delivery</span> above - a [TEST] lead should appear in the list on the left</li>
                <li className="flex gap-2"><span className="text-violet-300 font-mono">6.</span> Copy the form URL into the Google Form field above → Save</li>
              </ol>
            </details>
          </>
        )}
      </div>
    </div>
  )
}
