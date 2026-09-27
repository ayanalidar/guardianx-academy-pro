"use client"

/**
 * AdminHiringView - admin management for the /hiring page ("Hiring" tab).
 *
 * • Stats: active / draft / closed / countries / total applicants
 * • List of openings with search + status filter, quick status toggles
 *   (Active / Draft / Closed), edit dialog, delete with confirm.
 * • Create/edit dialog covers every field of the Job model used by the
 *   public page: title, company, logo URL, location, remote, type, salary,
 *   description, requirements (one per line), skills, certs, status.
 *
 * APIs:
 *   GET/POST  /api/admin/hiring/jobs
 *   PATCH/DELETE /api/admin/hiring/jobs/[id]
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Plus, Search, Globe2, MapPin, Home, Building2, Wallet, Users, Pencil,
  Trash2, Loader2, Briefcase, Eye, EyeOff, ExternalLink, RotateCcw,
  Inbox, CheckCircle2, UserPlus, Mail, Phone, Link2, FileText, Clock, Star,
  Trophy, BadgeCheck, GraduationCap,
} from "lucide-react"

// ============================================================
// Types + constants
// ============================================================
interface AdminJob {
  id: string
  title: string
  company: string
  companyLogo: string | null
  location: string
  remote: boolean
  type: string
  salary: string
  description: string
  requirements: string
  requiredCerts: string[]
  requiredSkills: string[]
  status: string
  applicants: number
  createdAt: string
}

interface AdminJobsResponse {
  jobs: AdminJob[]
  count: number
  byStatus: Record<string, number>
  countries: number
}

const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
]

const JOB_STATUSES = [
  { value: "active", label: "Active", color: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  { value: "draft", label: "Draft", color: "text-zinc-300", border: "border-zinc-500/30", bg: "bg-zinc-500/10", dot: "bg-zinc-400" },
  { value: "closed", label: "Closed", color: "text-rose-300", border: "border-rose-500/30", bg: "bg-rose-500/10", dot: "bg-rose-400" },
]

const EMPTY_FORM = {
  title: "",
  company: "GuardianX Academy",
  companyLogo: "",
  location: "",
  remote: false,
  type: "full-time",
  salary: "",
  description: "",
  requirements: "",
  requiredSkills: "",
  requiredCerts: "",
  status: "active",
}

type JobForm = typeof EMPTY_FORM

function toForm(job: AdminJob): JobForm {
  return {
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo || "",
    location: job.location,
    remote: job.remote,
    type: job.type,
    salary: job.salary || "",
    description: job.description || "",
    requirements: job.requirements || "",
    requiredSkills: job.requiredSkills.join(", "),
    requiredCerts: job.requiredCerts.join(", "),
    status: job.status,
  }
}

function deriveCountry(location: string): string {
  const parts = (location || "").split(",").map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || "Global"
}

// ============================================================
// Root
// ============================================================
export function AdminHiringView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = React.useState<"openings" | "applicants" | "placements">("openings")
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [editing, setEditing] = React.useState<AdminJob | null>(null)
  const [creating, setCreating] = React.useState(false)

  const { data, isLoading } = useQuery<AdminJobsResponse>({
    queryKey: ["admin-hiring-jobs"],
    queryFn: () => api("/api/admin/hiring/jobs"),
    refetchInterval: 60_000,
  })

  const jobs = data?.jobs ?? []
  const byStatus = data?.byStatus ?? { active: 0, draft: 0, closed: 0 }
  const totalApplicants = jobs.reduce((s, j) => s + (j.applicants || 0), 0)

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false
      if (q && !`${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [jobs, search, statusFilter])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-hiring-jobs"] })

  // Featured (admin-pinned) roles - zero-migration storage in SiteContent.
  const featuredQ = useQuery<{ ids: string[] }>({
    queryKey: ["admin-hiring-featured"],
    queryFn: () => api("/api/admin/hiring/featured"),
  })
  const featuredIds = featuredQ.data?.ids ?? []
  const featuredMutation = useMutation({
    mutationFn: (ids: string[]) => api("/api/admin/hiring/featured", { method: "PUT", body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      toast.success("Featured roles updated on /hiring")
      queryClient.invalidateQueries({ queryKey: ["admin-hiring-featured"] })
    },
    onError: (e: any) => toast.error(e?.message || "Could not update featured roles"),
  })
  const toggleFeatured = (id: string) => {
    const next = featuredIds.includes(id)
      ? featuredIds.filter((x) => x !== id)
      : [...featuredIds, id].slice(0, 12)
    featuredMutation.mutate(next)
  }

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api(`/api/admin/hiring/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "active" ? "Opening is live on /hiring" : vars.status === "draft" ? "Moved to drafts (hidden from /hiring)" : "Opening closed")
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api(`/api/admin/hiring/jobs/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Opening deleted"); invalidate() },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-violet-300" /> Hiring & Job Openings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage the openings shown on the public <button className="text-violet-300 hover:underline" onClick={() => navigate({ name: "hiring" })}>/hiring page</button> - post roles from anywhere in the world.
          </p>
        </div>
        {tab !== "placements" && (
          <Button className="bg-gradient-to-r from-violet-600 to-violet-500 text-white" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Post a Job Opening
          </Button>
        )}
      </div>

      {/* Tabs: Openings | Applicants */}
      <div className="flex items-center gap-1.5">
        {([
          { id: "openings", label: "Openings", icon: Briefcase },
          { id: "applicants", label: "Applicants", icon: UserPlus },
          { id: "placements", label: "Placements", icon: Trophy },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "applicants" ? (
        <ApplicantsPanel onOpenCrm={() => navigate({ name: "admin-lead-crm" })} />
      ) : tab === "placements" ? (
        <PlacementsPanel />
      ) : (
      <>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatTile label="Active" value={byStatus.active ?? 0} tone="text-emerald-300" />
        <StatTile label="Drafts" value={byStatus.draft ?? 0} />
        <StatTile label="Closed" value={byStatus.closed ?? 0} />
        <StatTile label="Countries" value={data?.countries ?? 0} tone="text-sky-300" />
        <StatTile label="Applicants" value={totalApplicants} tone="text-violet-300" />
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search openings by title, company or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          {[["all", "All"], ["active", "Active"], ["draft", "Drafts"], ["closed", "Closed"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                statusFilter === v
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl border border-border/60 bg-card/30 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 flex flex-col items-center text-center px-6">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {jobs.length === 0 ? "No job openings yet" : "Nothing matches your filters"}
          </p>
          {jobs.length === 0 && (
            <>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
                Post your first opening - it goes live on the Hiring tab the moment you save it.
              </p>
              <Button className="mt-4 bg-gradient-to-r from-violet-600 to-violet-500 text-white" size="sm" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Post a Job Opening
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
          {visible.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              featured={featuredIds.includes(job.id)}
              onToggleFeatured={() => toggleFeatured(job.id)}
              onEdit={() => setEditing(job)}
              onStatus={(s) => statusMutation.mutate({ id: job.id, status: s })}
              onDelete={() => {
                if (confirm(`Delete "${job.title}"? Applications for it will also be removed.`)) deleteMutation.mutate(job.id)
              }}
            />
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      {(creating || editing) && (
        <JobFormDialog
          job={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); invalidate() }}
        />
      )}
      </>
      )}
    </div>
  )
}

// ============================================================
// Pieces
// ============================================================
function StatTile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-center">
      <div className={cn("text-2xl font-bold tabular-nums leading-none", tone)}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function JobRow({ job, featured, onToggleFeatured, onEdit, onStatus, onDelete }: { job: AdminJob; featured: boolean; onToggleFeatured: () => void; onEdit: () => void; onStatus: (s: string) => void; onDelete: () => void }) {
  const statusMeta = JOB_STATUSES.find((s) => s.value === job.status) || JOB_STATUSES[0]
  return (
    <div className="p-4 flex items-start gap-3 hover:bg-violet-500/[0.03] transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{job.title}</span>
          <Badge variant="outline" className={cn("text-[9px]", statusMeta.color, statusMeta.border, statusMeta.bg)}>
            <span className={cn("h-1.5 w-1.5 rounded-full mr-1", statusMeta.dot)} /> {statusMeta.label}
          </Badge>
          {featured && (
            <Badge className="text-[9px] text-amber-950 border-0 bg-gradient-to-r from-amber-300 to-yellow-200">
              <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-900" /> Featured
            </Badge>
          )}
          {job.remote && <Badge variant="outline" className="text-[9px] text-emerald-300 border-emerald-500/30">Remote</Badge>}
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
          {job.salary && <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> {job.salary}</span>}
          {job.applicants > 0 && <span className="inline-flex items-center gap-1 text-violet-300"><Users className="h-3 w-3" /> {job.applicants}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          title={featured ? "Remove from featured" : "Feature on /hiring (shows in the Featured strip)"}
          onClick={onToggleFeatured}
          className={cn("h-8 px-2", featured ? "text-amber-300 hover:bg-amber-500/10" : "text-zinc-500 hover:text-amber-300 hover:bg-amber-500/10")}
        >
          <Star className={cn("h-3.5 w-3.5", featured && "fill-amber-300")} />
        </Button>
        {job.status !== "active" && (
          <Button size="sm" variant="ghost" title="Publish to /hiring" onClick={() => onStatus("active")} className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        {job.status === "active" && (
          <Button size="sm" variant="ghost" title="Unpublish (draft)" onClick={() => onStatus("draft")} className="h-8 px-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-500/10">
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        )}
        {job.status !== "closed" && (
          <Button size="sm" variant="ghost" title="Close this opening" onClick={() => onStatus("closed")} className="h-8 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="sm" variant="ghost" title="Edit" onClick={onEdit} className="h-8 px-2 text-violet-300 hover:bg-violet-500/10">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" title="Delete" onClick={onDelete} className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function JobFormDialog({ job, onClose, onSaved }: { job: AdminJob | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<JobForm>(job ? toForm(job) : EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const isEdit = !!job
  const set = <K extends keyof JobForm>(key: K, value: JobForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        companyLogo: form.companyLogo.trim() || null,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        requiredCerts: form.requiredCerts.split(",").map((s) => s.trim()).filter(Boolean),
      }
      if (isEdit) return api(`/api/admin/hiring/jobs/${job!.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      return api("/api/admin/hiring/jobs", { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(isEdit ? "Opening updated" : "Opening posted - it's live on /hiring")
      onSaved()
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const canSave = form.title.trim() && form.company.trim() && form.location.trim() && form.description.trim() && !saving

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit - ${job!.title}` : "Post a Job Opening"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Job title *">
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Security Engineer" />
            </Field>
            <Field label="Company *">
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="GuardianX Academy" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Location * (City, Country - or “Remote - Worldwide”)">
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Dubai, UAE" />
            </Field>
            <Field label="Salary / compensation (display text)">
              <Input value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="$90,000-$130,000" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Role type">
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (live on /hiring)</SelectItem>
                  <SelectItem value="draft">Draft (hidden)</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Remote">
              <button
                type="button"
                onClick={() => set("remote", !form.remote)}
                className={cn(
                  "h-10 w-full rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                  form.remote
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {form.remote ? <><CheckCircle2 className="h-3.5 w-3.5" /> Remote OK</> : "On-site / hybrid"}
              </button>
            </Field>
          </div>

          <Field label="Company logo URL (optional)">
            <Input value={form.companyLogo} onChange={(e) => set("companyLogo", e.target.value)} placeholder="https://.../logo.png" />
          </Field>

          <Field label="Description * (blank line = new paragraph)">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} placeholder="What the role is about, team, impact..." />
          </Field>

          <Field label="Requirements (one per line - rendered as a checklist)">
            <Textarea
              value={form.requirements}
              onChange={(e) => set("requirements", e.target.value)}
              rows={5}
              placeholder={"3+ years in cloud security\nDeep IAM / KMS experience\nOSCP or equivalent"}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Skills (comma-separated)">
              <Input value={form.requiredSkills} onChange={(e) => set("requiredSkills", e.target.value)} placeholder="AWS, Terraform, IAM" />
            </Field>
            <Field label="Certifications (comma-separated)">
              <Input value={form.requiredCerts} onChange={(e) => set("requiredCerts", e.target.value)} placeholder="OSCP, CISSP" />
            </Field>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Globe2 className="h-3 w-3 text-sky-300" />
            Openings appear instantly on the public Hiring tab; drafts stay hidden until you publish them.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            disabled={!canSave}
            onClick={() => saveMutation.mutate()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {isEdit ? "Save changes" : "Post opening"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

// ============================================================
// Applicants panel - guest applications (no account) captured
// on the public /hiring page, stored as Leads of type
// "Job Application" (source "Hiring Page") and managed here or
// in the full Lead CRM. PATCH /api/admin/leads/[id] supports
// pipeline status updates with history logging.
// ============================================================
interface ApplicantLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization: string | null
  type: string
  status: string
  source: string
  score: number
  notes: { id: string; content: string; createdAt: string; authorId: string | null }[]
  createdAt: string
}

const APPLICANT_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Converted", "Lost"]

function parseApplicantNote(lead: ApplicantLead) {
  const first = lead.notes?.[0]?.content || ""
  const lines = first.split(/\r?\n/)
  const after = (prefix: string) =>
    lines.find((l) => l.startsWith(prefix))?.slice(prefix.length).trim() || ""
  const noteIdx = lines.findIndex((l) => l.trim() === "Applicant note:")
  return {
    role: after("Role: "),
    linkedin: after("LinkedIn / Portfolio: "),
    applicantNote: noteIdx >= 0 ? lines.slice(noteIdx + 1).join("\n").trim() : "",
    fullNote: first,
  }
}

function statusTint(s: string): string {
  const map: Record<string, string> = {
    New: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    Contacted: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    Qualified: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
    Proposal: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    Negotiation: "text-orange-300 border-orange-500/30 bg-orange-500/10",
    Converted: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    Lost: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
  }
  return map[s] || "text-zinc-300 border-zinc-500/30 bg-zinc-500/10"
}

function relTime(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d < 1) return "today"
  if (d === 1) return "yesterday"
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function ApplicantsPanel({ onOpenCrm }: { onOpenCrm: () => void }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<{ leads: ApplicantLead[] }>({
    queryKey: ["admin-hiring-applicants"],
    queryFn: () => api(`/api/admin/leads?type=${encodeURIComponent("Job Application")}`),
    refetchInterval: 60_000,
  })
  const leads = data?.leads ?? []

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Applicant status updated")
      queryClient.invalidateQueries({ queryKey: ["admin-hiring-applicants"] })
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  const counts = {
    total: leads.length,
    fresh: leads.filter((l) => l.status === "New").length,
    active: leads.filter((l) => ["Contacted", "Qualified", "Proposal", "Negotiation"].includes(l.status)).length,
    hired: leads.filter((l) => l.status === "Converted").length,
  }

  return (
    <div className="space-y-4">
      {/* summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="Total applicants" value={counts.total} tone="text-violet-300" />
        <StatTile label="New" value={counts.fresh} tone="text-emerald-300" />
        <StatTile label="In pipeline" value={counts.active} tone="text-sky-300" />
        <StatTile label="Hired" value={counts.hired} tone="text-amber-300" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Applications from the public Hiring page arrive here instantly, no platform account needed. They also appear in the Lead / CRM pipeline.
        </p>
        <Button size="sm" variant="outline" onClick={onOpenCrm}>
          Open Lead / CRM
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl border border-border/60 bg-card/30 animate-pulse" />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 flex flex-col items-center text-center px-6">
          <UserPlus className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-md">
            When someone applies on the /hiring page without an account, their application shows up here with their note, links and contact details.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
          {leads.map((lead) => {
            const parsed = parseApplicantNote(lead)
            const open = expanded === lead.id
            return (
              <div key={lead.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{lead.name}</span>
                      {parsed.role && (
                        <Badge variant="outline" className="text-[10px] text-violet-300 border-violet-500/30 bg-violet-500/10">
                          <Briefcase className="h-2.5 w-2.5 mr-0.5" /> {parsed.role}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn("text-[10px]", statusTint(lead.status))}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[11px] text-muted-foreground">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </a>
                      )}
                      {parsed.linkedin && /^https?:\/\//.test(parsed.linkedin) && (
                        <a href={parsed.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 transition-colors">
                          <Link2 className="h-3 w-3" /> Profile link
                        </a>
                      )}
                      {lead.organization && (
                        <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {lead.organization}</span>
                      )}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> applied {relTime(lead.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={lead.status} onValueChange={(s) => statusMutation.mutate({ id: lead.id, status: s })}>
                      <SelectTrigger className="w-[130px] h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICANT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : lead.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileText className="h-3 w-3" /> {open ? "Hide note" : "View note"}
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="mt-3 rounded-xl border border-border/50 bg-background/50 p-3 text-xs text-foreground/85 whitespace-pre-wrap leading-relaxed">
                    {parsed.fullNote || "(no note attached)"}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Placements panel - outcome records on the public /placements
// wall (Hiring → Placements). Full CRUD over /api/admin/placements
// plus one-click loading of the clearly-marked sample rows.
// ============================================================

type AdminPlacement = {
  id: string
  studentName: string
  photoUrl: string | null
  role: string
  company: string
  companyLogo: string | null
  ctc: string | null
  track: string
  year: number
  quote: string | null
  story: string | null
  linkedIn: string | null
  featured: boolean
  status: string
  verified: boolean
  isSample: boolean
  order: number
  createdAt: string
}

type AdminPlacementsResponse = {
  placements: AdminPlacement[]
  count: number
  byStatus: Record<string, number>
  samples: number
}

const EMPTY_PLACEMENT_FORM = {
  studentName: "",
  role: "",
  company: "",
  photoUrl: "",
  companyLogo: "",
  ctc: "",
  track: "General",
  year: String(new Date().getFullYear()),
  quote: "",
  story: "",
  linkedIn: "",
  featured: false,
  verified: false,
  isSample: false,
  status: "published",
  order: "0",
}

function toPlacementForm(p: AdminPlacement) {
  return {
    studentName: p.studentName,
    role: p.role,
    company: p.company,
    photoUrl: p.photoUrl || "",
    companyLogo: p.companyLogo || "",
    ctc: p.ctc || "",
    track: p.track,
    year: String(p.year),
    quote: p.quote || "",
    story: p.story || "",
    linkedIn: p.linkedIn || "",
    featured: p.featured,
    verified: p.verified,
    isSample: p.isSample,
    status: p.status,
    order: String(p.order ?? 0),
  }
}

function placementInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function PlacementsPanel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [editing, setEditing] = React.useState<AdminPlacement | null>(null)
  const [creating, setCreating] = React.useState(false)

  const { data, isLoading } = useQuery<AdminPlacementsResponse>({
    queryKey: ["admin-placements"],
    queryFn: () => api("/api/admin/placements"),
    refetchInterval: 60_000,
  })

  const placements = data?.placements ?? []
  const byStatus = data?.byStatus ?? { published: 0, draft: 0 }
  const samples = data?.samples ?? 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-placements"] })

  const seedMutation = useMutation({
    mutationFn: () => api("/api/admin/placements/seed", { method: "POST" }),
    onSuccess: (d: any) => {
      toast.success(
        d?.inserted > 0
          ? `Loaded ${d.inserted} sample rows - replace them with real students`
          : "Sample rows are already present - nothing to load",
      )
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Could not load samples"),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/admin/placements/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "published" ? "Record is live on /placements" : "Record hidden (draft)")
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api(`/api/admin/placements/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/placements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Placement record deleted")
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return placements.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (q && !`${p.studentName} ${p.role} ${p.company} ${p.track}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [placements, search, statusFilter])

  return (
    <div className="space-y-4">
      {/* header strip: stats + actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Live on wall" value={byStatus.published ?? 0} tone="text-emerald-400" />
          <StatTile label="Drafts" value={byStatus.draft ?? 0} tone="text-zinc-400" />
          <StatTile label="Samples left" value={samples} tone="text-amber-400" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
            Load sample rows
          </Button>
          <Button className="bg-gradient-to-r from-violet-600 to-violet-500 text-white" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Placement
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rows marked <span className="font-mono text-amber-300">Sample</span> are placeholders shown on the public wall - edit
        one with a real student (name, role, company, package), untick Sample, and it goes live. Verified badges appear on the wall too.
      </p>

      {/* filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students, roles, companies…" className="pl-8 h-9 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-10 text-center">
          <Trophy className="mx-auto h-7 w-7 text-violet-300/70" />
          <p className="mt-3 text-sm font-medium">No placement records{search || statusFilter !== "all" ? " match those filters" : " yet"}.</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first real outcome, or load the sample rows as a template.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3.5 py-3 flex-wrap"
            >
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-violet-500/60 to-fuchsia-500/60 text-[11px] font-bold text-white shrink-0">
                {placementInitials(p.studentName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold">{p.studentName}</span>
                  {p.verified && <span title="Verified"><BadgeCheck className="h-3.5 w-3.5 text-emerald-400" /></span>}
                  {p.featured && <span title="Featured on wall"><Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" /></span>}
                  {p.isSample && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-amber-300">
                      Sample
                    </span>
                  )}
                  {p.status === "draft" && (
                    <span className="rounded-full border border-zinc-500/40 bg-zinc-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-zinc-300">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {p.role} · {p.company} · {p.track} · {p.year}
                  {p.ctc ? ` · ${p.ctc}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  title={p.featured ? "Unpin from wall top" : "Pin to wall top (featured)"}
                  onClick={() => patchMutation.mutate({ id: p.id, patch: { featured: !p.featured } })}
                  className={cn("h-8 px-2", p.featured ? "text-amber-300" : "text-zinc-400")}
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title={p.verified ? "Remove verified badge" : "Mark offer as verified"}
                  onClick={() => patchMutation.mutate({ id: p.id, patch: { verified: !p.verified } })}
                  className={cn("h-8 px-2", p.verified ? "text-emerald-400" : "text-zinc-400")}
                >
                  <BadgeCheck className="h-4 w-4" />
                </Button>
                <Select value={p.status} onValueChange={(s) => statusMutation.mutate({ id: p.id, status: s })}>
                  <SelectTrigger className="w-[120px] h-8 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Live on wall</SelectItem>
                    <SelectItem value="draft">Draft (hidden)</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(p)} className="h-8 px-2 text-violet-300 hover:bg-violet-500/10">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete the placement record for ${p.studentName}?`)) deleteMutation.mutate(p.id)
                  }}
                  className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PlacementFormDialog
          record={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

function PlacementFormDialog({ record, onClose, onSaved }: { record: AdminPlacement | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState(record ? toPlacementForm(record) : EMPTY_PLACEMENT_FORM)
  const [saving, setSaving] = React.useState(false)
  const isEdit = !!record
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        photoUrl: form.photoUrl.trim() || null,
        companyLogo: form.companyLogo.trim() || null,
        ctc: form.ctc.trim() || null,
        quote: form.quote.trim() || null,
        story: form.story.trim() || null,
        linkedIn: form.linkedIn.trim() || null,
        year: parseInt(form.year, 10),
        order: parseInt(form.order || "0", 10) || 0,
      }
      if (isEdit) return api(`/api/admin/placements/${record!.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      return api("/api/admin/placements", { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(isEdit ? "Placement updated" : "Placement added - it's live on /placements")
      onSaved()
      onClose()
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const canSave = form.studentName.trim() && form.role.trim() && form.company.trim() && /^\d{4}$/.test(form.year.trim()) && !saving

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit - ${record!.studentName}` : "Add a Placement Outcome"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Student name *">
              <Input value={form.studentName} onChange={(e) => set("studentName", e.target.value)} placeholder="e.g. Priya Sharma" />
            </Field>
            <Field label="Role landed *">
              <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="SOC Analyst - Tier 1" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Company *">
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" />
            </Field>
            <Field label="Package (display text, optional)">
              <Input value={form.ctc} onChange={(e) => set("ctc", e.target.value)} placeholder="9.6 LPA (leave blank to hide)" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Track / course taken">
              <Input value={form.track} onChange={(e) => set("track", e.target.value)} placeholder="SOC Analyst Track" />
            </Field>
            <Field label="Placement year *">
              <Input value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2026" inputMode="numeric" />
            </Field>
            <Field label="Sort order (lower first)">
              <Input value={form.order} onChange={(e) => set("order", e.target.value)} placeholder="0" inputMode="numeric" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Student photo URL (optional)">
              <Input value={form.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Company logo URL (optional)">
              <Input value={form.companyLogo} onChange={(e) => set("companyLogo", e.target.value)} placeholder="https://…" />
            </Field>
          </div>

          <Field label="LinkedIn / portfolio URL (optional)">
            <Input value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/…" />
          </Field>

          <Field label="One-line quote (shows on the card)">
            <Input value={form.quote} onChange={(e) => set("quote", e.target.value)} placeholder="The mock interviews made all the difference…" />
          </Field>

          <Field label="Full story (shows in the detail popup)">
            <Textarea rows={4} value={form.story} onChange={(e) => set("story", e.target.value)} placeholder="The journey: track enrolled, projects, interview rounds…" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Live on wall</SelectItem>
                  <SelectItem value="draft">Draft (hidden)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Featured">
              <Select value={form.featured ? "yes" : "no"} onValueChange={(v) => set("featured", v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes (pinned first)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Verified offer">
              <Select value={form.verified ? "yes" : "no"} onValueChange={(v) => set("verified", v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes (badge)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sample row">
              <Select value={form.isSample ? "yes" : "no"} onValueChange={(v) => set("isSample", v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No - real outcome</SelectItem>
                  <SelectItem value="yes">Yes (marked on wall)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add to the wall"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
