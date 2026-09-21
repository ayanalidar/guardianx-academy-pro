"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  GraduationCap,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Send,
  Loader2,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Trash2,
  Download,
  RefreshCw,
  ArrowRight,
} from "lucide-react"

// ============================================================
// Types
// ============================================================
interface OpenSchoolingLead {
  id: string
  name: string
  email: string
  phone: string
  course: "10th" | "12th"
  dateOfBirth: string | null
  city: string | null
  state: string | null
  qualification: string | null
  message: string | null
  status: "NEW" | "CONTACTED" | "ENROLLED" | "LOST"
  adminNotes: string | null
  source: string
  createdAt: string
  updatedAt: string
}

interface LeadsResponse {
  leads: OpenSchoolingLead[]
  count: number
  byStatus: Record<string, number>
}

const STATUSES: { value: OpenSchoolingLead["status"]; label: string; color: string; bg: string; icon: any }[] = [
  { value: "NEW", label: "New", color: "text-violet-300", bg: "bg-violet-500/10 border-violet-500/30", icon: Send },
  { value: "CONTACTED", label: "Contacted", color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/30", icon: PhoneCall },
  { value: "ENROLLED", label: "Enrolled", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  { value: "LOST", label: "Lost", color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/30", icon: XCircle },
]

const STATUS_DOT: Record<string, string> = {
  NEW: "bg-violet-400",
  CONTACTED: "bg-cyan-400",
  ENROLLED: "bg-emerald-400",
  LOST: "bg-rose-400",
}

// ============================================================
// Main view
// ============================================================
export function AdminOpenSchoolingLeadsView() {
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const [courseFilter, setCourseFilter] = React.useState<string>("ALL")
  const [search, setSearch] = React.useState("")
  const [selectedLead, setSelectedLead] = React.useState<OpenSchoolingLead | null>(null)
  const queryClient = useQueryClient()

  const queryKey = React.useMemo(
    () => ["admin-open-schooling-leads", { statusFilter, courseFilter, search }],
    [statusFilter, courseFilter, search]
  )

  const { data, isLoading } = useQuery<LeadsResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (courseFilter !== "ALL") params.set("course", courseFilter)
      if (search.trim()) params.set("q", search.trim())
      return api(`/api/admin/open-schooling/leads?${params.toString()}`)
    },
    refetchInterval: 30000, // refresh every 30s so new leads show up
  })

  const leads = data?.leads ?? []
  const byStatus = data?.byStatus ?? { NEW: 0, CONTACTED: 0, ENROLLED: 0, LOST: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold tracking-tight">Open Schooling Leads</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Students who registered interest in completing 10th or 12th through open schooling. Contact them to complete registration.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="New" value={byStatus.NEW || 0} icon={Send} color="text-violet-300" bg="bg-violet-500/10" border="border-violet-500/30" />
        <StatCard label="Contacted" value={byStatus.CONTACTED || 0} icon={PhoneCall} color="text-cyan-300" bg="bg-cyan-500/10" border="border-cyan-500/30" />
        <StatCard label="Enrolled" value={byStatus.ENROLLED || 0} icon={CheckCircle2} color="text-emerald-300" bg="bg-emerald-500/10" border="border-emerald-500/30" />
        <StatCard label="Lost" value={byStatus.LOST || 0} icon={XCircle} color="text-rose-300" bg="bg-rose-500/10" border="border-rose-500/30" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All courses</SelectItem>
            <SelectItem value="10th">10th</SelectItem>
            <SelectItem value="12th">12th</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads list */}
      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No leads found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {search || statusFilter !== "ALL" || courseFilter !== "ALL"
                ? "Try adjusting your filters."
                : "New registrations will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[700px] overflow-y-auto custom-scrollbar">
            {leads.map((lead) => {
              const statusMeta = STATUSES.find((s) => s.value === lead.status)!
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-violet-500/[0.03] transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/10 text-violet-300 font-semibold text-sm shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{lead.name}</span>
                          <Badge variant="outline" className={cn("shrink-0", statusMeta.color, statusMeta.bg)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", STATUS_DOT[lead.status])} />
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </span>
                          {lead.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {lead.city}{lead.state ? `, ${lead.state}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          <Badge variant="secondary" className="font-mono">
                            {lead.course}
                          </Badge>
                          {lead.qualification && (
                            <span className="text-muted-foreground">· {lead.qualification}</span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                            <Clock className="h-3 w-3" /> {formatTime(lead.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail + edit dialog */}
      {selectedLead && (
        <LeadDetailDialog
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-open-schooling-leads"] })
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Stat card
// ============================================================
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  border,
}: {
  label: string
  value: number
  icon: any
  color: string
  bg: string
  border: string
}) {
  return (
    <div className={cn("rounded-xl border p-4", border, bg)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

// ============================================================
// Lead detail dialog (view + update status + notes)
// ============================================================
function LeadDetailDialog({
  lead,
  onClose,
  onUpdated,
}: {
  lead: OpenSchoolingLead
  onClose: () => void
  onUpdated: () => void
}) {
  const queryClient = useQueryClient()
  const [status, setStatus] = React.useState(lead.status)
  const [adminNotes, setAdminNotes] = React.useState(lead.adminNotes || "")
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const hasChanges = status !== lead.status || adminNotes !== (lead.adminNotes || "")

  const handleSave = async () => {
    setSaving(true)
    try {
      await api(`/api/admin/open-schooling/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNotes }),
      })
      onUpdated()
      onClose()
    } catch (e) {
      console.error("Failed to update lead:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api(`/api/admin/open-schooling/leads/${lead.id}`, { method: "DELETE" })
      onUpdated()
      onClose()
    } catch (e) {
      console.error("Failed to delete lead:", e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-400" />
            Lead - {lead.name}
          </DialogTitle>
          <DialogDescription>
            Registered {formatTime(lead.createdAt)} · Source: {lead.source}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contact info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow label="Email" value={lead.email} icon={Mail} />
            <InfoRow label="Phone" value={lead.phone} icon={Phone} />
            <InfoRow label="Course" value={lead.course} icon={GraduationCap} />
            <InfoRow label="Date of birth" value={lead.dateOfBirth || "Not provided"} icon={Calendar} />
            <InfoRow label="City" value={lead.city || "Not provided"} icon={MapPin} />
            <InfoRow label="State" value={lead.state || "Not provided"} icon={MapPin} />
            <InfoRow label="Qualification" value={lead.qualification || "Not provided"} icon={Users} />
            <InfoRow label="Source" value={lead.source} icon={TrendingUp} />
          </div>

          {/* Message */}
          {lead.message && (
            <div>
              <Label className="text-xs font-mono text-muted-foreground tracking-[0.15em] uppercase mb-1.5 block">
                Message from student
              </Label>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm leading-relaxed">
                {lead.message}
              </div>
            </div>
          )}

          {/* Status + notes (editable) */}
          <div className="border-t border-border/60 pt-4 space-y-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground tracking-[0.15em] uppercase mb-1.5 block">
                Pipeline status
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUSES.map((s) => {
                  const Icon = s.icon
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all",
                        status === s.value
                          ? cn(s.bg, s.color, "shadow-sm")
                          : "border-border/60 bg-card/40 hover:bg-muted/20 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="admin-notes" className="text-xs font-mono text-muted-foreground tracking-[0.15em] uppercase mb-1.5 block">
                Admin notes
              </Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Call notes, document status, next follow-up date, etc."
                rows={3}
                className="resize-none"
                maxLength={5000}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {adminNotes.length}/5000
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 flex-row flex-wrap">
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-xs text-rose-300">Are you sure?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Confirm delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================
function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
