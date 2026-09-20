"use client"

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Users, TrendingUp, ExternalLink, Mail, Phone,
  Building2, Clock, CheckCircle2, AlertCircle, Search, UserPlus,
  FileText, Sparkles, Target, Plus, X, ChevronRight, Calendar,
  Star, Filter, Link as LinkIcon, ClipboardList, User, Award,
  Zap, Briefcase, GraduationCap, Trophy, Layout as LayoutIcon,
  ListFilter, ArrowRight,
  Download, Check, Linkedin, Loader2, Trash2, Video, Upload,
} from "lucide-react"
import { toast } from "sonner"

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

const GOOGLE_FORM_URL_KEY = "guardianx-crm-google-form-url"

export function LeadCrmView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()

  const [crmTab, setCrmTab] = React.useState<"general" | "batch">("general")
  const [view, setView] = React.useState<"kanban" | "table">("kanban")
  const [search, setSearch] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState("all")
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null)
  const [addLeadOpen, setAddLeadOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [googleFormUrl, setGoogleFormUrl] = React.useState("")
  const [connectFormOpen, setConnectFormOpen] = React.useState(false)

  // Load saved Google Form URL from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(GOOGLE_FORM_URL_KEY) || ""
      setGoogleFormUrl(saved)
    }
  }, [])

  // Fetch leads
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

  function handleSaveGoogleFormUrl(url: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GOOGLE_FORM_URL_KEY, url)
    }
    setGoogleFormUrl(url)
    setConnectFormOpen(false)
    toast.success(url ? "Google Form connected" : "Google Form disconnected")
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
              <Users className="h-5 w-5 text-amber-400" /> Lead / CRM Pipeline
            </h1>
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

      {/* Tab toggle: General Pipeline vs Batch Leads */}
      <div className="border-b border-border/40 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setCrmTab("general")}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                crmTab === "general"
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5 inline mr-1.5" /> General Pipeline
            </button>
            <button
              onClick={() => setCrmTab("batch")}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                crmTab === "batch"
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5 inline mr-1.5" /> Batch Leads
            </button>
          </div>
        </div>
      </div>

      {crmTab === "general" ? (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Leads" value={stats.total} color="text-violet-300" tint="bg-violet-500/10" />
          <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate}%`} color="text-emerald-300" tint="bg-emerald-500/10" />
          <StatCard icon={Clock} label="Avg Time to Convert" value={`${stats.avgTimeToConvertDays}d`} color="text-amber-300" tint="bg-amber-500/10" />
          <StatCard icon={Sparkles} label="New This Month" value={stats.newThisMonth} color="text-cyan-300" tint="bg-cyan-500/10" />
        </div>

        {/* Google Forms integration */}
        <Card className="p-5 card-premium border-violet-500/20">
          <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
            <div className="inline-flex p-2.5 rounded-lg bg-violet-500/10">
              <ExternalLink className="h-5 w-5 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                Google Forms Integration
                {googleFormUrl && (
                  <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[9px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Create a Google Form for lead capture. Responses sync automatically to this CRM
                via Google Apps Script webhook - no manual entry needed.
              </p>

              {/* Webhook URL */}
              <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">WEBHOOK URL</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-violet-300 font-mono break-all flex-1">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/crm/webhook
                  </code>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/api/crm/webhook`)
                    toast.success("Webhook URL copied!")
                  }}>
                    Copy
                  </Button>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-2">
                  TOKEN: <span className="text-cyan-300">set in Admin → Settings → CRM Webhook</span>
                  <span className="block mt-1 text-amber-300/80">
                    The server REJECTS requests with any other token — the old hardcoded default was removed for security.
                  </span>
                </div>
              </div>

              {/* Setup instructions */}
              <details className="mb-3">
                <summary className="text-xs text-violet-300 cursor-pointer hover:underline">
                  How to set up Google Forms webhook →
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-muted/20 border border-border/30 text-xs text-muted-foreground space-y-1.5">
                  <p><span className="font-bold text-violet-300">1.</span> Create a Google Form at <a href="https://forms.new" target="_blank" rel="noreferrer" className="text-violet-300 underline">forms.new</a></p>
                  <p><span className="font-bold text-violet-300">2.</span> Add questions: Name, Email, Phone, Organization, Type, Requirement, Message</p>
                  <p><span className="font-bold text-violet-300">3.</span> In Google Form → 3-dot menu → Script Editor</p>
                  <p><span className="font-bold text-violet-300">4.</span> Delete default code, paste the GuardianX webhook script</p>
                  <p><span className="font-bold text-violet-300">5.</span> Click Run → "setupTriggers" and grant permissions</p>
                  <p><span className="font-bold text-violet-300">6.</span> Form responses now auto-sync to this CRM!</p>
                  <a href="/google-forms-webhook.js" target="_blank" rel="noreferrer" className="inline-block mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" /> View Apps Script Code
                    </Button>
                  </a>
                </div>
              </details>

              <div className="flex flex-wrap items-center gap-2">
                <a href="https://forms.new" target="_blank" rel="noreferrer">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 btn-premium">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Lead Form
                  </Button>
                </a>
                <Button size="sm" variant="outline" onClick={() => setConnectFormOpen(true)}>
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Connect Form URL
                </Button>
                {googleFormUrl && (
                  <>
                    <a href={googleFormUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Form
                      </Button>
                    </a>
                    <a href={`${googleFormUrl.replace(/\/viewform.*$/, "")}/responses`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost">
                        <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> View Responses
                      </Button>
                    </a>
                  </>
                )}
              </div>
              {googleFormUrl && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <LinkIcon className="h-3 w-3" />
                  <span className="font-mono truncate">{googleFormUrl}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

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
                          Google Form responses sync automatically once the webhook token is set (Admin → Settings → CRM Webhook).
                          Already have responses? Rescue them now — download the Form's responses CSV and use <span className="font-semibold text-violet-300">Import CSV</span> above.
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
        <BatchLeadsView />
      )}

      {/* === LEAD DETAIL DIALOG === */}
      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLeadId(null)}
        onUpdate={(payload) => selectedLead && updateLeadMutation.mutate({ id: selectedLead.id, payload })}
        onAddNote={(content) => selectedLead && addNoteMutation.mutate({ leadId: selectedLead.id, content })}
        onCreateProposal={handleCreateProposal}
        onCreateInvoice={handleCreateInvoice}
      />

      {/* === ADD LEAD DIALOG === */}
      <AddLeadDialog open={addLeadOpen} onOpenChange={setAddLeadOpen} onCreate={(payload) => createLeadMutation.mutate(payload)} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* === CONNECT GOOGLE FORM DIALOG === */}
      <ConnectFormDialog open={connectFormOpen} onOpenChange={setConnectFormOpen} initialUrl={googleFormUrl} onSave={handleSaveGoogleFormUrl} />
    </div>
  )
}

// ============================================================
// Subcomponents
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

function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onUpdate,
  onAddNote,
  onCreateProposal,
  onCreateInvoice,
}: {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (payload: Record<string, unknown>) => void
  onAddNote: (content: string) => void
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
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow icon={Building2} label="Organization" value={lead.organization || "-"} />
            <InfoRow icon={Mail} label="Email" value={lead.email || "-"} />
            <InfoRow icon={Phone} label="Phone" value={lead.phone || "-"} />
            <InfoRow icon={Calendar} label="Created" value={new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          </div>

          {/* Status + Source */}
          <div className="grid sm:grid-cols-2 gap-3">
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
          <div className="grid sm:grid-cols-2 gap-3">
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  )
}

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
   CsvImportDialog — rescue leads collected before the webhook.
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
            <p><span className="text-violet-300 font-semibold">3.</span> Drop the file below — columns are auto-detected (Name, Email, Phone, Organization, Type, Requirement, Message). Rows with a matching email are updated, not duplicated.</p>
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

function ConnectFormDialog({
  open,
  onOpenChange,
  initialUrl,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialUrl: string
  onSave: (url: string) => void
}) {
  const [url, setUrl] = React.useState(initialUrl)

  React.useEffect(() => {
    setUrl(initialUrl)
  }, [initialUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Google Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste your Google Form URL below. Leads submitted through this form will be tracked
            in this CRM. You can also create a new form at{" "}
            <a href="https://forms.new" target="_blank" rel="noreferrer" className="text-violet-300 underline">
              forms.new
            </a>
            .
          </p>
          <div>
            <Label className="text-xs">Google Form URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/..."
              className="font-mono text-xs"
            />
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-300 shrink-0 mt-0.5" />
              <span>
                Tip: Set up a Google Apps Script webhook to automatically sync form responses
                to GuardianX, or paste them manually here using the &quot;Add Lead&quot; button.
              </span>
            </p>
          </div>
        </div>
        <DialogFooter>
          {initialUrl && (
            <Button variant="ghost" onClick={() => onSave("")} className="mr-auto text-rose-300">
              Disconnect
            </Button>
          )}
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={() => onSave(url.trim())} className="bg-violet-600 hover:bg-violet-500">
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// BatchLeadsView — per-batch leads management in the CRM
// ============================================================
interface TrainingBatchLite {
  id: string
  certification: string
  name: string
  schedule: string
  startDate: string
  mode: string
  instructor: string
  seats: number
  enrolled: number
  status: string
  level: string
  featured: boolean
  published: boolean
  googleFormUrl: string | null
}

interface BatchLead {
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

const BATCH_LEAD_STATUSES = [
  { value: "New", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400" },
  { value: "Contacted", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  { value: "Qualified", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", dot: "bg-violet-400" },
  { value: "Enrolled", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { value: "Lost", color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-400" },
]

function BatchLeadsView() {
  const queryClient = useQueryClient()
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [search, setSearch] = React.useState("")
  const [selectedLead, setSelectedLead] = React.useState<BatchLead | null>(null)

  // Fetch all training batches for the selector
  const { data: batchesData } = useQuery<{ batches: TrainingBatchLite[] }>({
    queryKey: ["admin-training-batches-for-crm"],
    queryFn: async () => {
      const res = await fetch("/api/admin/training-batches")
      if (!res.ok) return { batches: [] }
      return res.json()
    },
  })
  const batches = batchesData?.batches ?? []
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || null

  // Auto-select first batch when data loads
  React.useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id)
    }
  }, [batches, selectedBatchId])

  // Fetch leads for the selected batch
  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ leads: BatchLead[]; count: number; byStatus: Record<string, number> }>({
    queryKey: ["batch-leads-crm", selectedBatchId, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      return api(`/api/admin/training-batches/${selectedBatchId}/leads?${params.toString()}`)
    },
    enabled: !!selectedBatchId,
    refetchInterval: 30000,
  })

  const leads = leadsData?.leads ?? []
  const byStatus = leadsData?.byStatus ?? { New: 0, Contacted: 0, Qualified: 0, Enrolled: 0, Lost: 0 }
  const filteredLeads = search.trim()
    ? leads.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.whatsappNumber.includes(search) ||
        (l.linkedinProfile || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.jobRole || "").toLowerCase().includes(search.toLowerCase())
      )
    : leads

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Batch selector */}
      <div>
        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 block">Select a batch</Label>
        <Select value={selectedBatchId || ""} onValueChange={(v) => { setSelectedBatchId(v); setStatusFilter("ALL"); setSearch("") }}>
          <SelectTrigger className="w-full max-w-2xl">
            <SelectValue placeholder="Select a batch to view its leads" />
          </SelectTrigger>
          <SelectContent>
            {batches.length === 0 ? (
              <SelectItem value="_none" disabled>No batches available</SelectItem>
            ) : (
              batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.certification} — {b.name} ({b.startDate})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedBatch ? (
        <>
          {/* Batch info strip */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs text-white border-0", "bg-violet-500")}>{selectedBatch.certification}</Badge>
              <Badge variant="outline" className="text-[10px]">{selectedBatch.level}</Badge>
              <Badge variant="outline" className="text-[10px]">{selectedBatch.status}</Badge>
              {selectedBatch.featured && <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-300">Featured</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedBatch.instructor}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedBatch.schedule}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {selectedBatch.startDate}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {selectedBatch.enrolled}/{selectedBatch.seats}</span>
              {selectedBatch.googleFormUrl && <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Form connected</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-2">
            {BATCH_LEAD_STATUSES.map((s) => (
              <div key={s.value} className={cn("rounded-lg border p-3 text-center", s.border, s.bg)}>
                <div className="text-2xl font-bold tabular-nums">{byStatus[s.value] || 0}</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, WhatsApp, LinkedIn, role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {BATCH_LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Leads list */}
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No leads for this batch yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                  Set up the Google Form below — when someone fills it, the lead will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredLeads.map((lead) => {
                  const statusMeta = BATCH_LEAD_STATUSES.find((s) => s.value === lead.status) || BATCH_LEAD_STATUSES[0]
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full p-4 hover:bg-violet-500/[0.03] transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
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
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /> {lead.whatsappNumber}</span>
                              {lead.jobRole && <span className="flex items-center gap-0.5"><Briefcase className="h-3 w-3" /> {lead.jobRole}</span>}
                              {lead.professionalStatus && <span>· {lead.professionalStatus}</span>}
                              <span className="flex items-center gap-0.5 ml-auto"><Clock className="h-3 w-3" /> {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Google Form Setup */}
          <GoogleFormSetupSection batch={selectedBatch} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Select a batch above</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Each batch has its own leads + Google Form setup</p>
        </div>
      )}

      {/* Lead detail dialog */}
      {selectedLead && selectedBatchId && (
        <BatchLeadDetailDialog
          lead={selectedLead}
          batchId={selectedBatchId}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["batch-leads-crm", selectedBatchId] })
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// BatchLeadDetailDialog — view + edit a single batch lead
// ============================================================
function BatchLeadDetailDialog({ lead, batchId, onClose, onUpdated }: { lead: BatchLead; batchId: string; onClose: () => void; onUpdated: () => void }) {
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
    if (!confirm("Delete this lead?")) return
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
          {/* Lead fields */}
          <div className="grid grid-cols-2 gap-3">
            <BatchInfoRow icon={Phone} label="WhatsApp" value={lead.whatsappNumber} />
            <BatchInfoRow icon={Briefcase} label="Job role" value={lead.jobRole || "—"} />
            <BatchInfoRow icon={User} label="Status" value={lead.professionalStatus || "—"} />
            <BatchInfoRow icon={Linkedin} label="LinkedIn" value={lead.linkedinProfile ? "View profile" : "—"} link={lead.linkedinProfile || undefined} />
          </div>

          {/* Status updater */}
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

          {/* Admin notes */}
          <div>
            <Label htmlFor="batch-lead-notes" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Admin notes</Label>
            <Textarea id="batch-lead-notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Call notes, follow-up reminders..." className="resize-none text-sm" maxLength={5000} />
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

function BatchInfoRow({ icon: Icon, label, value, link }: { icon: any; label: string; value: string; link?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-2.5">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-300 hover:underline flex items-center gap-1">
          {value} <ExternalLink className="h-2.5 w-2.5" />
        </a>
      ) : (
        <div className="text-xs font-medium truncate">{value}</div>
      )}
    </div>
  )
}

// ============================================================
// GoogleFormSetupSection — per-batch Apps Script + form URL
// ============================================================
function GoogleFormSetupSection({ batch }: { batch: TrainingBatchLite }) {
  const queryClient = useQueryClient()
  const [formUrl, setFormUrl] = React.useState(batch.googleFormUrl || "")
  const [saving, setSaving] = React.useState(false)

  const handleSaveUrl = async () => {
    setSaving(true)
    try {
      await api(`/api/admin/training-batches/${batch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ googleFormUrl: formUrl.trim() || null }),
      })
      toast.success("Google Form URL saved")
      queryClient.invalidateQueries({ queryKey: ["admin-training-batches-for-crm"] })
      queryClient.invalidateQueries({ queryKey: ["admin-training-batches"] })
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const scriptUrl = `/api/admin/training-batches/${batch.id}/apps-script`

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <FileText className="h-5 w-5 text-violet-300 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">Google Form Setup for this batch</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Each batch has its own Apps Script with the batch ID baked in — no manual editing needed.</p>
        </div>
      </div>

      {/* Download Apps Script */}
      <div className="flex items-center gap-3 flex-wrap">
        <a href={scriptUrl} target="_blank" rel="noopener noreferrer">
          <Button className="bg-gradient-to-r from-violet-600 to-violet-500 text-white" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download Apps Script (.gs)
          </Button>
        </a>
        {formUrl && (
          <a href={formUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Google Form
            </Button>
          </a>
        )}
      </div>

      {/* Setup checklist */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">Setup checklist (click to expand)</summary>
        <ol className="space-y-1.5 mt-2 pl-2">
          <li className="flex gap-2"><span className="text-violet-300 font-mono">1.</span> Create a Google Form at <a href="https://forms.new" target="_blank" rel="noreferrer" className="text-violet-300 hover:underline flex items-center gap-0.5">forms.new <ExternalLink className="h-2.5 w-2.5" /></a></li>
          <li className="flex gap-2"><span className="text-violet-300 font-mono">2.</span> Add 5 questions: Name, WhatsApp (with country code), LinkedIn profile link, Current professional status, Current job role</li>
          <li className="flex gap-2"><span className="text-violet-300 font-mono">3.</span> Click 3-dot menu → Script Editor → paste the downloaded script → Save</li>
          <li className="flex gap-2"><span className="text-violet-300 font-mono">4.</span> Run "setupTriggers" and grant permissions</li>
          <li className="flex gap-2"><span className="text-violet-300 font-mono">5.</span> Copy the Google Form URL → paste below → Save</li>
          <li className="flex gap-2"><span className="text-violet-300 font-mono">6.</span> Leads from this form will appear in the list above</li>
        </ol>
      </details>

      {/* Google Form URL */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Google Form URL</Label>
        <div className="flex gap-2">
          <Input
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://forms.gle/..."
            className="text-sm"
          />
          <Button onClick={handleSaveUrl} disabled={saving || formUrl === (batch.googleFormUrl || "")} size="sm" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shrink-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
          </Button>
        </div>
      </div>
    </div>
  )
}
