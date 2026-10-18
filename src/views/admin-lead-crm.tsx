"use client"

/**
 * Leads Hub - ONE surface for every lead (unified redesign).
 *
 * The former split is gone: "Lead / CRM" (general pipeline) and "Batch
 * Leads Hub" (per-batch enrollments) are now two segments of this single
 * view. /admin-batch-hub deep links keep working - they land here with
 * the Batch Enrollments segment pre-opened (see admin-batch-hub.tsx).
 *
 * Segments:
 *   - Pipeline        general inbound leads (contact form, Google Form,
 *                     manual, referral) with a drag-and-drop kanban and
 *                     a full table view.
 *   - Batch Enrollments  per-batch leads captured by each batch's Google
 *                     Form + auto-generated Apps Script (see
 *                     src/views/leads-hub/batch-segment.tsx).
 *
 * Capture reliability (why leads were silently lost before):
 *   - Both webhooks require CRM_WEBHOOK_SECRET. The old default token was
 *     removed in a security pass, so scripts generated before that fail
 *     with 401 forever. The "Lead capture webhook" card below shows the
 *     CURRENT token, can regenerate it, and can fire a one-click test
 *     lead through the real webhook - no more blind setup.
 *   - The Batch Calendar opens the per-batch script dialog right after a
 *     batch is created (LeadCaptureScriptDialog), so the script with the
 *     correct token is in front of the admin at the exact moment.
 *
 * APIs used (all ADMIN-gated unless noted):
 *   GET    /api/admin/leads                                (pipeline + stats)
 *   PATCH  /api/admin/leads/[id]                           (status / follow-up / assignment)
 *   DELETE /api/admin/leads/[id]                           (delete lead)
 *   POST   /api/admin/leads                                (manual add)
 *   POST   /api/admin/leads/import                         (CSV rescue)
 *   GET    /api/admin/leads/webhook-config                 (token + URLs)
 *   POST   /api/admin/leads/webhook-config                 (rotate token)
 *   GET    /api/admin/training-batches                     (batches + lead counts)
 *   ...    per-batch lead endpoints (see leads-hub/batch-segment.tsx)
 *   POST   /api/crm/webhook, /api/crm/batch-webhook        (PUBLIC - token-gated)
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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
  DialogClose,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  ArrowLeft, Users, TrendingUp, ExternalLink, Mail, Phone,
  Building2, Clock, CheckCircle2, AlertCircle, Search, UserPlus,
  FileText, Sparkles, Target, Plus, X, ChevronRight, Calendar,
  Star, Link as LinkIcon, User,
  Zap, Briefcase, GraduationCap, Trophy, Layout as LayoutIcon,
  ListFilter, ArrowRight,
  Download, Check, Loader2, Upload, Webhook, KeyRound, Send, Trash2,
  ShieldCheck, ShieldAlert,
} from "lucide-react"
import {
  type WebhookConfig, useWebhookConfig, sendTestLead, copyText,
  InfoRow, CopyBtn,
} from "@/views/leads-hub/shared"
import { BatchesSegment } from "@/views/leads-hub/batch-segment"

// Re-export so the Batch Calendar can open the capture script dialog
// right after creating a batch without importing from the shared module.
export { LeadCaptureScriptDialog } from "@/views/leads-hub/shared"

const PIPELINE_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Converted", "Lost"] as const
type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

const STATUS_META: Record<PipelineStatus, { color: string; bg: string; border: string; icon: React.ElementType; tint: string }> = {
  New: { color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: AlertCircle, tint: "bg-blue-500/20" },
  Contacted: { color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: Mail, tint: "bg-cyan-500/20" },
  Qualified: { color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", icon: Target, tint: "bg-violet-500/20" },
  Proposal: { color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: FileText, tint: "bg-amber-500/20" },
  Converted: { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2, tint: "bg-emerald-500/20" },
  Lost: { color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: X, tint: "bg-rose-500/20" },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  Individual: User,
  School: GraduationCap,
  College: Briefcase,
  University: Trophy,
  Corporate: Building2,
  Partner: Users,
  Workshop: Sparkles,
  CTF: Target,
  Webinar: Zap,
}

const SOURCE_COLORS: Record<string, string> = {
  "Google Form": "bg-violet-500/10 text-violet-300 border-violet-500/30",
  "Contact Form": "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  Manual: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
  Referral: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
}

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization: string | null
  type: string
  status: string
  source: string
  score: number
  followUpDate: string | null
  assignedTo: string | null
  notes: LeadNote[]
  history: LeadStatusHistory[]
  createdAt: string
  updatedAt: string
}
interface LeadNote {
  id: string
  content: string
  createdAt: string
  authorId: string | null
}
interface LeadStatusHistory {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
}

interface LeadsResponse {
  leads: Lead[]
  stats: {
    total: number
    new: number
    contacted: number
    qualified: number
    proposal: number
    converted: number
    lost: number
    conversionRate: number
    avgTimeToConvertDays: number
    newThisMonth: number
    bySource: Record<string, number>
  }
}

type HubSegment = "pipeline" | "batches"

export function LeadCrmView({
  initialSegment = "pipeline",
  initialBatchId,
}: {
  initialSegment?: HubSegment
  initialBatchId?: string
} = {}) {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()

  const [segment, setSegment] = React.useState<HubSegment>(initialSegment)
  const [view, setView] = React.useState<"kanban" | "table">("kanban")
  const [search, setSearch] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState("all")
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null)
  const [addLeadOpen, setAddLeadOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)

  // Fetch pipeline leads
  const { data, isLoading } = useQuery<LeadsResponse>({
    queryKey: ["admin-leads", search, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (sourceFilter !== "all") params.set("source", sourceFilter)
      const res = await fetch(`/api/admin/leads?${params}`)
      if (!res.ok) return { leads: [], stats: { total: 0, new: 0, contacted: 0, qualified: 0, proposal: 0, converted: 0, lost: 0, conversionRate: 0, avgTimeToConvertDays: 0, newThisMonth: 0, bySource: {} } }
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const leads = data?.leads ?? []
  const stats = data?.stats ?? {
    total: 0, new: 0, contacted: 0, qualified: 0, proposal: 0, converted: 0, lost: 0,
    conversionRate: 0, avgTimeToConvertDays: 0, newThisMonth: 0, bySource: {},
  }

  // Group leads by pipeline status
  const leadsByStatus = React.useMemo(() => {
    const map: Record<PipelineStatus, Lead[]> = {
      New: [], Contacted: [], Qualified: [], Proposal: [], Converted: [], Lost: [],
    }
    for (const l of leads) {
      if (PIPELINE_STATUSES.includes(l.status as PipelineStatus)) {
        map[l.status as PipelineStatus].push(l)
      } else {
        map.New.push(l)
      }
    }
    return map
  }, [leads])

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null

  // Mutations
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to update lead")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] })
    },
    onError: () => toast.error("Failed to update lead"),
  })

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete lead")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] })
      toast.success("Lead deleted")
    },
    onError: () => toast.error("Failed to delete lead"),
  })

  const addNoteMutation = useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Failed to add note")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] })
      toast.success("Note added")
    },
    onError: () => toast.error("Failed to add note"),
  })

  const createLeadMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create lead")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] })
      toast.success("Lead created")
      setAddLeadOpen(false)
    },
    onError: () => toast.error("Failed to create lead"),
  })

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const [activeLead, setActiveLead] = React.useState<Lead | null>(null)

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id)
    setActiveLead(lead ?? null)
  }
  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as PipelineStatus
    if (!PIPELINE_STATUSES.includes(newStatus)) return
    const lead = active.data.current?.lead as Lead | undefined
    if (!lead || lead.status === newStatus) return
    updateLeadMutation.mutate({ id: lead.id, payload: { status: newStatus } })
    toast.success(`${lead.name} → ${newStatus}`)
  }

  function handleCreateProposal(lead: Lead) {
    // We can't easily pre-fill the proposal view (it's a separate view) - store in sessionStorage
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "guardianx-proposal-prefill",
        JSON.stringify({
          institutionName: lead.organization || lead.name,
          contactName: lead.name,
          contactEmail: lead.email || "",
          contactPhone: lead.phone || "",
          institutionType: lead.type === "University" ? "university" : lead.type === "College" ? "college" : "school",
        }),
      )
    }
    toast.success("Opening proposal maker with lead info...")
    navigate({ name: "proposal-maker" })
  }
  function handleCreateInvoice(lead: Lead) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "guardianx-invoice-prefill",
        JSON.stringify({
          clientName: lead.name,
          clientOrg: lead.organization || "",
          clientEmail: lead.email || "",
          clientPhone: lead.phone || "",
        }),
      )
    }
    toast.success("Opening invoice generator with lead info...")
    navigate({ name: "invoice-generator" })
  }

  return (
    <div className="relative min-h-screen bg-mesh">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" /> Leads Hub
            </h1>
            <WebhookStatusChip />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setView(view === "kanban" ? "table" : "kanban")}>
              {view === "kanban" ? <ListFilter className="h-3.5 w-3.5 mr-1.5" /> : <LayoutIcon className="h-3.5 w-3.5 mr-1.5" />}
              {view === "kanban" ? "Table View" : "Kanban View"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddLeadOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Segment toggle: Pipeline vs Batch Enrollments */}
      <div className="border-b border-border/40 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setSegment("pipeline")}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                segment === "pipeline"
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5 inline mr-1.5" /> Pipeline
              <Badge variant="outline" className="ml-2 text-[9px] font-mono">{stats.total}</Badge>
            </button>
            <button
              onClick={() => setSegment("batches")}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                segment === "batches"
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutIcon className="h-3.5 w-3.5 inline mr-1.5" /> Batch Enrollments
            </button>
          </div>
        </div>
      </div>

      {segment === "pipeline" ? (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Leads" value={stats.total} color="text-violet-300" tint="bg-violet-500/10" />
          <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate}%`} color="text-emerald-300" tint="bg-emerald-500/10" />
          <StatCard icon={Clock} label="Avg Time to Convert" value={`${stats.avgTimeToConvertDays}d`} color="text-amber-300" tint="bg-amber-500/10" />
          <StatCard icon={Sparkles} label="New This Month" value={stats.newThisMonth} color="text-cyan-300" tint="bg-cyan-500/10" />
        </div>

        {/* Lead capture webhook - the fix for silently lost leads */}
        <WebhookCaptureCard />

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads by name, email, or organization..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="Google Form">Google Form</SelectItem>
              <SelectItem value="Contact Form">Contact Form</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source breakdown */}
        {Object.keys(stats.bySource).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">By Source:</span>
            {Object.entries(stats.bySource).map(([src, count]) => (
              <Badge key={src} variant="outline" className={cn("text-[9px]", SOURCE_COLORS[src] || "bg-zinc-500/10 text-zinc-300 border-zinc-500/30")}>
                {src}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* === KANBAN VIEW === */}
        {view === "kanban" && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {PIPELINE_STATUSES.map((status) => {
                const meta = STATUS_META[status]
                const columnLeads = leadsByStatus[status]
                return (
                  <KanbanColumn
                    key={status}
                    status={status}
                    meta={meta}
                    count={columnLeads.length}
                    leads={columnLeads}
                    onSelectLead={setSelectedLeadId}
                    activeLeadId={activeLead?.id}
                  />
                )
              })}
            </div>
            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} compact dragging /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* === TABLE VIEW === */}
        {view === "table" && (
          <Card className="overflow-hidden card-premium">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organization</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading leads...</td></tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center">
                        <p className="text-muted-foreground font-medium mb-2">No leads found.</p>
                        <p className="text-xs text-muted-foreground/80 max-w-md mx-auto mb-4">
                          Google Form responses sync automatically once the webhook token is configured (the card above shows it).
                          Already have responses? Rescue them now - download the Form&apos;s responses CSV and use <span className="font-semibold text-violet-300">Import CSV</span> above.
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                          <Upload className="h-3.5 w-3.5 mr-1.5" /> Import existing responses
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const statusMeta = STATUS_META[lead.status as PipelineStatus] ?? STATUS_META.New
                      const TypeIcon = TYPE_ICON[lead.type] ?? User
                      return (
                        <tr key={lead.id} className="border-t border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLeadId(lead.id)}>
                          <td className="py-3 px-4 text-sm font-medium">{lead.name}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{lead.organization || "-"}</td>
                          <td className="py-3 px-4"><Badge variant="outline" className="text-[9px]"><TypeIcon className="h-3 w-3 mr-1" />{lead.type}</Badge></td>
                          <td className="py-3 px-4"><Badge className={cn("text-[9px] border", statusMeta.bg, statusMeta.color, statusMeta.border)}>{lead.status}</Badge></td>
                          <td className="py-3 px-4"><Badge variant="outline" className={cn("text-[9px]", SOURCE_COLORS[lead.source] || "")}>{lead.source}</Badge></td>
                          <td className="py-3 px-4"><ScoreBadge score={lead.score} /></td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                          <td className="py-3 px-4"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      ) : (
        /* Batch Enrollments - former standalone Batch Leads Hub, now inline. */
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <BatchesSegment initialBatchId={initialBatchId} />
        </div>
      )}

      {/* === LEAD DETAIL DIALOG === */}
      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLeadId(null)}
        onUpdate={(payload) => selectedLead && updateLeadMutation.mutate({ id: selectedLead.id, payload })}
        onAddNote={(content) => selectedLead && addNoteMutation.mutate({ leadId: selectedLead.id, content })}
        onDelete={(id) => { setSelectedLeadId(null); deleteLeadMutation.mutate(id) }}
        onCreateProposal={handleCreateProposal}
        onCreateInvoice={handleCreateInvoice}
      />

      {/* === ADD LEAD DIALOG === */}
      <AddLeadDialog open={addLeadOpen} onOpenChange={setAddLeadOpen} onCreate={(payload) => createLeadMutation.mutate(payload)} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

/* ============================================================
   WebhookStatusChip - tiny header indicator.
   ============================================================ */
function WebhookStatusChip() {
  const { data: config, isLoading } = useWebhookConfig()
  if (isLoading) return null
  if (!config) return null
  return config.configured ? (
    <Badge variant="outline" className="text-[9px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
      <ShieldCheck className="h-3 w-3 mr-1" /> webhook ready
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-300">
      <ShieldAlert className="h-3 w-3 mr-1" /> webhook not configured
    </Badge>
  )
}

/* ============================================================
   WebhookCaptureCard - the fix for "why are we not capturing leads".

   Shows the CURRENT webhook token (admins only), can rotate it, and
   can fire a marked test lead through the real general webhook so the
   whole chain is verifiable in one click. Historical root cause: the
   original default token was removed in a security pass, so any Apps
   Script generated before that posts with a dead token and every
   submission bounced with 401 - silently, inside the script's logger.
   ============================================================ */
function WebhookCaptureCard() {
  const queryClient = useQueryClient()
  const { data: config, isLoading } = useWebhookConfig()
  const [revealed, setRevealed] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  const rotateMutation = useMutation({
    mutationFn: async () => {
      return api("/api/admin/leads/webhook-config", {
        method: "POST",
        body: JSON.stringify({ action: "regenerate" }),
      }) as Promise<{ ok: boolean; token: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-hub"] })
      toast.success("New token generated - use it in your Apps Scripts (old scripts will stop working)")
    },
    onError: (e: any) => toast.error(e?.message || "Failed to generate token"),
  })

  const handleTest = async () => {
    if (!config?.token) return
    setTesting(true)
    try {
      const r = await sendTestLead(config.webhookUrl, config.token, {
        name: `[TEST] General capture ${new Date().toLocaleTimeString("en-IN")}`,
        email: "capture-test@guardianx.test",
        phone: "+91 99999 99999",
        organization: "Webhook Test",
        type: "Individual",
        requirement: "Sent from the Leads Hub webhook test button - safe to delete.",
      })
      if (r.ok) {
        toast.success("Test lead delivered! It is now in the Pipeline (marked [TEST] - open it and delete).")
        queryClient.invalidateQueries({ queryKey: ["admin-leads"] })
      } else {
        toast.error(`Webhook replied ${r.status}: ${(r.body as any).error || "failed"}`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Test request failed")
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="p-5 card-premium border-violet-500/20">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="inline-flex p-2.5 rounded-lg bg-violet-500/10">
          <Webhook className="h-5 w-5 text-violet-300" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              Lead capture webhook
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : config?.configured ? (
                <Badge variant="outline" className="text-[9px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-300">
                  <AlertCircle className="h-3 w-3 mr-1" /> not configured - Google Form scripts cannot work until it is
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Every Google Form script must carry THIS token. Scripts generated before the security pass carry a removed
              default and bounce with 401 - regenerate them from the Batch Enrollments tab after rotating the token here.
              Per-batch scripts live in the <span className="text-violet-300 font-medium">Batch Enrollments</span> segment.
            </p>
          </div>

          {/* Webhook URL + token rows */}
          {!isLoading && config && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">GENERAL WEBHOOK URL</div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] text-violet-300 font-mono break-all flex-1">{config.webhookUrl}</code>
                  <CopyBtn text={config.webhookUrl} label="Copy" size="sm" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">TOKEN (paste into scripts)</div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] text-cyan-300 font-mono break-all flex-1">
                    {config.token ? (revealed ? config.token : `${config.token.slice(0, 4)}${"•".repeat(Math.max(config.token.length - 8, 0))}${config.token.slice(-4)}`) : "-"}
                  </code>
                  {config.token && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRevealed((r) => !r)}>
                        {revealed ? "Hide" : "Reveal"}
                      </Button>
                      <CopyBtn text={config.token} label="Copy" copiedLabel="Token copied" size="sm" />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {config?.configured ? (
              <>
                <Button size="sm" onClick={handleTest} disabled={testing} className="bg-emerald-600 hover:bg-emerald-500 btn-premium">
                  {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  Send test lead
                </Button>
                <CopyBtn
                  text={`function onFormSubmit(e) {\n  var payload = {\n    token: "${config?.token ?? "TOKEN"}",\n    lead: {\n      name: e.values[1],\n      email: e.values[2],\n      phone: e.values[3],\n      organization: e.values[4],\n      requirement: e.values[5]\n    }\n  };\n  UrlFetchApp.fetch("${config?.webhookUrl ?? ""}", {\n    method: "post",\n    contentType: "application/json",\n    payload: JSON.stringify(payload),\n    muteHttpExceptions: true\n  });\n}\n\nfunction setupTriggers() {\n  ScriptApp.newTrigger("onFormSubmit").forForm(FormApp.getActiveForm()).onFormSubmit().create();\n}`}
                  label="Copy general Apps Script"
                  copiedLabel="Script copied - paste into your form's Script Editor, then run setupTriggers once"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                  disabled={rotateMutation.isPending}
                  onClick={() => {
                    if (confirm("Rotate the webhook token? Existing Google Form scripts will STOP capturing (401) until you regenerate and re-paste them. Continue?")) {
                      rotateMutation.mutate()
                    }
                  }}
                >
                  {rotateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 mr-1.5" />}
                  Rotate token
                </Button>
                <a href="https://forms.new" target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New lead form
                  </Button>
                </a>
              </>
            ) : (
              <Button size="sm" onClick={() => rotateMutation.mutate()} disabled={rotateMutation.isPending} className="bg-violet-600 hover:bg-violet-500 btn-premium">
                {rotateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 mr-1.5" />}
                Generate webhook token
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================
// Subcomponents (pipeline segment)
// ============================================================

function StatCard({ icon: Icon, label, value, color, tint }: { icon: React.ElementType; label: string; value: string | number; color: string; tint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-premium rounded-xl p-4 flex items-center gap-3"
    >
      <div className={cn("inline-flex p-2.5 rounded-lg", tint)}>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-300" : score >= 40 ? "text-amber-300" : "text-zinc-300"
  const bg = score >= 70 ? "bg-emerald-500/10" : score >= 40 ? "bg-amber-500/10" : "bg-zinc-500/10"
  const border = score >= 70 ? "border-emerald-500/30" : score >= 40 ? "border-amber-500/30" : "border-zinc-500/30"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold border", color, bg, border)}>
      <Star className="h-3 w-3" />{score}
    </span>
  )
}

function KanbanColumn({
  status,
  meta,
  count,
  leads,
  onSelectLead,
  activeLeadId,
}: {
  status: PipelineStatus
  meta: typeof STATUS_META[PipelineStatus]
  count: number
  leads: Lead[]
  onSelectLead: (id: string) => void
  activeLeadId?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border bg-card/40 flex flex-col min-h-[200px] transition-colors",
        isOver ? cn(meta.bg, meta.border) : "border-border/40",
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className={cn("inline-flex p-1.5 rounded-md", meta.bg)}>
            <meta.icon className={cn("h-3.5 w-3.5", meta.color)} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider">{status}</span>
        </div>
        <Badge variant="outline" className="text-[9px]">{count}</Badge>
      </div>
      <div className="p-2 space-y-2 flex-1 max-h-[60vh] overflow-y-auto">
        <AnimatePresence>
          {leads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onSelectLead(lead.id)}
              dragging={activeLeadId === lead.id}
            />
          ))}
        </AnimatePresence>
        {leads.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center py-4 italic">Drop leads here</div>
        )}
      </div>
    </div>
  )
}

function DraggableLeadCard({ lead, onClick, dragging }: { lead: Lead; onClick: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only fire click if not dragging
        if (!isDragging) {
          e.stopPropagation()
          onClick()
        }
      }}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-50")}
    >
      <LeadCard lead={lead} compact dragging={dragging} />
    </div>
  )
}

function LeadCard({ lead, compact, dragging }: { lead: Lead; compact?: boolean; dragging?: boolean }) {
  const TypeIcon = TYPE_ICON[lead.type] ?? User
  const meta = STATUS_META[lead.status as PipelineStatus] ?? STATUS_META.New
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border bg-card p-2.5 hover:border-violet-500/40 transition-colors",
        dragging ? "border-violet-500/60 shadow-xl" : "border-border/40",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn("inline-flex p-1 rounded-md", meta.bg)}>
            <TypeIcon className={cn("h-3 w-3", meta.color)} />
          </div>
          <span className="text-xs font-medium truncate">{lead.name}</span>
        </div>
        <ScoreBadge score={lead.score} />
      </div>
      {lead.organization && (
        <p className="text-[10px] text-muted-foreground mb-1 truncate">{lead.organization}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("text-[8px]", SOURCE_COLORS[lead.source] || "")}>{lead.source}</Badge>
        <span className="text-[9px] text-muted-foreground">
          {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>
      {!compact && lead.email && (
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate flex items-center gap-1">
          <Mail className="h-3 w-3" /> {lead.email}
        </p>
      )}
    </motion.div>
  )
}

/* ============================================================
   LEAD DETAIL DIALOG (+ delete - needed to clean up [TEST] leads)
   ============================================================ */
function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onUpdate,
  onAddNote,
  onDelete,
  onCreateProposal,
  onCreateInvoice,
}: {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (payload: Record<string, unknown>) => void
  onAddNote: (content: string) => void
  onDelete: (id: string) => void
  onCreateProposal: (lead: Lead) => void
  onCreateInvoice: (lead: Lead) => void
}) {
  const [noteText, setNoteText] = React.useState("")
  const [followUpDate, setFollowUpDate] = React.useState("")
  const [assignedTo, setAssignedTo] = React.useState("")

  React.useEffect(() => {
    if (lead) {
      setFollowUpDate(lead.followUpDate ? lead.followUpDate.split("T")[0] : "")
      setAssignedTo(lead.assignedTo || "")
      setNoteText("")
    }
  }, [lead])

  if (!lead) return null

  const meta = STATUS_META[lead.status as PipelineStatus] ?? STATUS_META.New

  function handleSaveFollowUp() {
    onUpdate({ followUpDate: followUpDate || null, assignedTo: assignedTo || null })
    toast.success("Follow-up updated")
  }
  function handleAddNote() {
    if (!noteText.trim()) return
    onAddNote(noteText.trim())
    setNoteText("")
  }
  function handleStatusChange(newStatus: string) {
    onUpdate({ status: newStatus })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("inline-flex p-1.5 rounded-md", meta.bg)}>
              <meta.icon className={cn("h-4 w-4", meta.color)} />
            </div>
            {lead.name}
            <ScoreBadge score={lead.score} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={Building2} label="Organization" value={lead.organization || "-"} />
            <InfoRow icon={Mail} label="Email" value={lead.email || "-"} link={lead.email ? `mailto:${lead.email}` : undefined} />
            <InfoRow icon={Phone} label="Phone" value={lead.phone || "-"} />
            <InfoRow icon={Calendar} label="Created" value={new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          </div>

          {/* Status + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <div className="text-sm mt-1.5"><Badge variant="outline" className={cn("text-[9px]", SOURCE_COLORS[lead.source] || "")}>{lead.source}</Badge></div>
            </div>
          </div>

          {/* Status history timeline */}
          <div>
            <Label className="text-xs mb-2 block">Status History</Label>
            <div className="rounded-lg border border-border/40 bg-card/40 p-3 max-h-40 overflow-y-auto">
              {lead.history.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No status changes yet.</p>
              ) : (
                <div className="space-y-2">
                  {lead.history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <div className="size-2 rounded-full bg-violet-400 shrink-0" />
                      <span className="text-muted-foreground">
                        {h.fromStatus ? <span className="line-through opacity-60">{h.fromStatus}</span> : <span className="opacity-60">New lead</span>}
                        <ArrowRight className="h-3 w-3 inline mx-1" />
                        <span className="font-medium text-foreground">{h.toStatus}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(h.changedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Follow-up + assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Follow-up Date</Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Assigned To</Label>
              <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Staff member" />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleSaveFollowUp}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Save Follow-up
          </Button>

          {/* Notes */}
          <div>
            <Label className="text-xs mb-2 block">Notes</Label>
            <div className="rounded-lg border border-border/40 bg-card/40 p-3 max-h-40 overflow-y-auto mb-2">
              {lead.notes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {lead.notes.map((n) => (
                    <div key={n.id} className="text-xs border-l-2 border-violet-500/40 pl-2">
                      <p className="text-foreground">{n.content}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." rows={2} className="text-xs" />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
            <Button size="sm" variant="outline" onClick={() => onCreateProposal(lead)} className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Create Proposal
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCreateInvoice(lead)} className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
            </Button>
            {lead.email && (
              <a href={`mailto:${lead.email}`}>
                <Button size="sm" variant="ghost"><Mail className="h-3.5 w-3.5 mr-1.5" /> Email</Button>
              </a>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              onClick={() => {
                if (confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) onDelete(lead.id)
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================
   ADD LEAD DIALOG
   ============================================================ */
function AddLeadDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: Record<string, unknown>) => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [organization, setOrganization] = React.useState("")
  const [type, setType] = React.useState("Individual")
  const [source, setSource] = React.useState("Manual")

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    onCreate({ name, email, phone, organization, type, source })
    setName("")
    setEmail("")
    setPhone("")
    setOrganization("")
    setType("Individual")
    setSource("Manual")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lead name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Organization</Label>
            <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="College">College</SelectItem>
                  <SelectItem value="University">University</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Google Form">Google Form</SelectItem>
                  <SelectItem value="Contact Form">Contact Form</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-500">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================
   CsvImportDialog - rescue leads collected before the webhook.
   Google Form → Responses → ⋮ → Download responses (.csv), then
   drop the file (or paste its content) here. Rows are upserted
   by email; the requirement/message lands as the first note.
   ============================================================ */
function CsvImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [csvText, setCsvText] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)

  const reset = () => { setCsvText(""); setFileName(""); setResult(null) }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setCsvText(text)
    setResult(null)
  }

  const doImport = async () => {
    if (!csvText.trim()) { toast.error("Paste CSV content or choose a file first"); return }
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, source: "Google Form" }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `Import failed (HTTP ${res.status})`)
      setResult({ created: j.created ?? 0, updated: j.updated ?? 0, skipped: j.skipped ?? 0, errors: j.errors ?? [] })
      toast.success(`Imported ${j.created ?? 0} new leads${j.updated ? `, updated ${j.updated}` : ""}`)
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] })
    } catch (e: any) {
      toast.error(e?.message || "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="bg-card border-border/60 max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-violet-300" /> Import Leads from CSV
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-violet-200">Rescue your existing Google Form responses:</p>
            <p><span className="text-violet-300 font-semibold">1.</span> Open your Form → <span className="font-semibold">Responses</span> tab → link the Sheets icon or ⋮ menu</p>
            <p><span className="text-violet-300 font-semibold">2.</span> Download responses as <span className="font-mono text-[10px]">.csv</span></p>
            <p><span className="text-violet-300 font-semibold">3.</span> Drop the file below - columns are auto-detected (Name, Email, Phone, Organization, Type, Requirement, Message). Rows with a matching email are updated, not duplicated.</p>
          </div>

          <div>
            <Label className="text-xs">Response file (.csv)</Label>
            <Input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-xs file:mr-3 file:text-xs"
            />
            {fileName && <p className="text-[10px] text-muted-foreground mt-1">Loaded: {fileName}</p>}
          </div>

          <div>
            <Label className="text-xs">…or paste CSV content</Label>
            <Textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setResult(null) }}
              placeholder={"Timestamp,Name,Email,Phone,Organization,Type,Requirement\n2025-11-02 10:14:33,Aarav Sharma,aarav@example.com,+91 98xxx,AzPublic School,School,Cybersecurity workshop for students"}
              className="font-mono text-[11px] min-h-32"
            />
          </div>

          {result && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
              <p className="text-emerald-200 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {result.created} created · {result.updated} updated
                {result.skipped > 0 && ` · ${result.skipped} skipped`}
              </p>
              {result.errors.length > 0 && (
                <div className="text-rose-300/90 space-y-0.5">
                  {result.errors.map((err, i) => <p key={i} className="text-[10px]">{err}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          <Button onClick={doImport} disabled={busy || !csvText.trim()} className="bg-violet-600 hover:bg-violet-500">
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
