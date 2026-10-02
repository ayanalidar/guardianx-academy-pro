"use client"

/**
 * AdminInternshipsView - Admin → Internships.
 *
 * Full CRUD over /api/admin/internships (+ /records). Two tabs:
 *   1. Internships - the programs under each college (college name,
 *      title, domain, mode, duration, seats, status, published toggle)
 *   2. Students - internship records per student. A certificate
 *      (certificateId + tamper-evident hash) is issued automatically on
 *      creation; the showPublicly toggle is the consent gate that puts
 *      the record + its downloadable certificate on the public page.
 *
 * Sample rows (isSample) carry a visible chip; delete them once real
 * data replaces them.
 */

import * as React from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
} from "@/components/ui/dialog"
import {
  FlaskConical, Users, Plus, Loader2, Trash2, Pencil, Copy,
  Eye, EyeOff, Search, GraduationCap, Building2, Award,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

type AdminInternship = {
  id: string
  collegeId: string | null
  collegeName: string
  collegeCity: string | null
  collegeLogo: string | null
  title: string
  company: string
  domain: string
  mode: string
  durationWeeks: number
  stipend: string | null
  seats: number
  status: string
  startsAt: string | null
  endsAt: string | null
  description: string | null
  skills: string
  featured: boolean
  published: boolean
  isSample: boolean
  order: number
  recordCount: number
}

type AdminInternshipRecord = {
  id: string
  internshipId: string
  studentId: string | null
  studentName: string
  photoUrl: string | null
  studentEmail: string | null
  role: string
  mentorName: string | null
  startDate: string | null
  endDate: string | null
  projects: string
  skills: string
  tools: string
  testimonial: string | null
  grade: string | null
  status: string
  certificateId: string
  showPublicly: boolean
  isSample: boolean
  sortOrder: number
}

type AdminInternshipsResponse = {
  internships: AdminInternship[]
  count: number
  samples: number
}

type AdminRecordsResponse = {
  records: AdminInternshipRecord[]
  internships: {
    id: string
    title: string
    collegeName: string
    collegeCity: string | null
    domain: string
    mode: string
    durationWeeks: number
    status: string
    company: string
  }[]
  count: number
  samples: number
}

const EMPTY_INTERNSHIP_FORM = {
  collegeName: "",
  collegeCity: "",
  title: "",
  company: "GuardianX Academy",
  domain: "Cyber Security",
  mode: "remote",
  durationWeeks: "8",
  stipend: "",
  seats: "10",
  status: "upcoming",
  description: "",
  skills: "",
  featured: false,
  published: true,
  order: "0",
}

const EMPTY_RECORD_FORM = {
  internshipId: "",
  studentName: "",
  studentEmail: "",
  role: "",
  mentorName: "",
  grade: "",
  startDate: "",
  endDate: "",
  projects: "",
  skills: "",
  tools: "",
  testimonial: "",
  status: "completed",
  showPublicly: false,
}

function csvOrJson(v: string): string[] {
  const t = v.trim()
  if (!t) return []
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return t.split(",").map((s) => s.trim()).filter(Boolean)
}

// ============================================================
// Main view
// ============================================================

export function AdminInternshipsView() {
  const [tab, setTab] = React.useState<"internships" | "students">("internships")

  const { data: iData, isLoading: iLoading } = useQuery<AdminInternshipsResponse>({
    queryKey: ["admin-internships"],
    queryFn: () => api("/api/admin/internships"),
    refetchInterval: 60_000,
  })

  const { data: rData, isLoading: rLoading } = useQuery<AdminRecordsResponse>({
    queryKey: ["admin-internship-records"],
    queryFn: () => api("/api/admin/internships/records"),
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Internships</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the public /internships page - college programs, student records and
          their verifiable certificates.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            { id: "internships", label: "Internships", icon: FlaskConical, count: iData?.count },
            { id: "students", label: "Students", icon: Users, count: rData?.count },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {typeof t.count === "number" && (
              <span className="rounded-full bg-muted/60 px-1.5 text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "internships" ? (
        <InternshipsTab data={iData} loading={iLoading} />
      ) : (
        <StudentsTab data={rData} loading={rLoading} />
      )}
    </div>
  )
}

// ============================================================
// Tab 1: Internships CRUD
// ============================================================

function InternshipsTab({
  data,
  loading,
}: {
  data?: AdminInternshipsResponse
  loading: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminInternship | null>(null)
  const [form, setForm] = React.useState(EMPTY_INTERNSHIP_FORM)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-internships"] })
    queryClient.invalidateQueries({ queryKey: ["admin-internship-records"] })
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: Record<string, unknown> }) =>
      id
        ? api(`/api/admin/internships/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : api("/api/admin/internships", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Internship updated" : "Internship created")
      setDialogOpen(false)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/internships/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Internship deleted (with its student records)")
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  const togglePublished = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/api/admin/internships/${id}`, { method: "PATCH", body: JSON.stringify({ published }) }),
    onSuccess: (_d, vars) => {
      toast.success(vars.published ? "Published to /internships" : "Hidden from the public page")
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_INTERNSHIP_FORM)
    setDialogOpen(true)
  }

  function openEdit(i: AdminInternship) {
    setEditing(i)
    let skills = ""
    try {
      skills = JSON.parse(i.skills || "[]").join(", ")
    } catch {
      skills = ""
    }
    setForm({
      collegeName: i.collegeName,
      collegeCity: i.collegeCity || "",
      title: i.title,
      company: i.company,
      domain: i.domain,
      mode: i.mode,
      durationWeeks: String(i.durationWeeks),
      stipend: i.stipend || "",
      seats: String(i.seats),
      status: i.status,
      description: i.description || "",
      skills,
      featured: i.featured,
      published: i.published,
      order: String(i.order ?? 0),
    })
    setDialogOpen(true)
  }

  function submit() {
    const payload = {
      ...form,
      durationWeeks: Number(form.durationWeeks) || 8,
      seats: Number(form.seats) || 10,
      order: Number(form.order) || 0,
      skills: csvOrJson(form.skills),
    }
    saveMutation.mutate({ id: editing?.id, payload })
  }

  const internships = (data?.internships ?? []).filter((i) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      i.title.toLowerCase().includes(q) ||
      i.collegeName.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search internships..."
            className="w-72 pl-9"
          />
        </div>
        <Button onClick={openCreate} className="gap-1.5 ml-auto">
          <Plus className="h-4 w-4" /> New internship
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2.5">
        {internships.map((i) => (
          <div
            key={i.id}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{i.title}</h3>
                {i.isSample && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
                    Sample
                  </span>
                )}
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {i.domain}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" /> {i.collegeName}
                {i.collegeCity ? ` · ${i.collegeCity}` : ""} · {i.recordCount} student
                {i.recordCount === 1 ? "" : "s"} · {i.durationWeeks}w · {i.mode} · {i.status}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {i.published ? <Eye className="h-3.5 w-3.5 text-emerald-300" /> : <EyeOff className="h-3.5 w-3.5" />}
                <Switch
                  checked={i.published}
                  onCheckedChange={(v) => togglePublished.mutate({ id: i.id, published: v })}
                  disabled={togglePublished.isPending}
                  aria-label="Toggle published"
                />
              </label>
              <Button size="sm" variant="outline" onClick={() => openEdit(i)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-rose-300 hover:text-rose-200"
                onClick={() => {
                  if (confirm(`Delete "${i.title}" and ALL its student records?`)) {
                    deleteMutation.mutate(i.id)
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!loading && internships.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-10 text-center">
            <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No internships yet. Create the first one, or load the public page once to
              auto-seed clearly-marked samples.
            </p>
          </div>
        )}
      </div>

      {/* create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit internship" : "New internship"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">College name *</label>
              <Input value={form.collegeName} onChange={(e) => setForm({ ...form, collegeName: e.target.value })} placeholder="e.g. Ronald Institute of Technology" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">College city</label>
              <Input value={form.collegeCity} onChange={(e) => setForm({ ...form, collegeCity: e.target.value })} placeholder="e.g. Bengaluru" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Internship title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cyber Security Internship - VAPT Track" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Host company</label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Domain</label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="VAPT / SOC / GRC / Cloud Security" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mode</label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Duration (weeks)</label>
              <Input type="number" min={1} max={52} value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Seats</label>
              <Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Stipend (display text)</label>
              <Input value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} placeholder="e.g. Performance-based stipend" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Skills (comma separated)</label>
              <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Burp Suite, Nmap, OWASP Top 10" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured (pinned first)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> Published
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={saveMutation.isPending || !form.collegeName.trim() || !form.title.trim()}
              className="gap-1.5"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create internship"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Tab 2: Student records CRUD
// ============================================================

function StudentsTab({
  data,
  loading,
}: {
  data?: AdminRecordsResponse
  loading: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminInternshipRecord | null>(null)
  const [form, setForm] = React.useState(EMPTY_RECORD_FORM)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-internship-records"] })
    queryClient.invalidateQueries({ queryKey: ["admin-internships"] })
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: Record<string, unknown> }) =>
      id
        ? api(`/api/admin/internships/records/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : api("/api/admin/internships/records", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.id
          ? "Student record updated"
          : "Student added - certificate issued automatically"
      )
      setDialogOpen(false)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/internships/records/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Student record deleted")
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  const togglePublic = useMutation({
    mutationFn: ({ id, showPublicly }: { id: string; showPublicly: boolean }) =>
      api(`/api/admin/internships/records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ showPublicly }),
      }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.showPublicly
          ? "Showcased publicly (with downloadable certificate)"
          : "Removed from the public page"
      )
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_RECORD_FORM, internshipId: data?.internships?.[0]?.id ?? "" })
    setDialogOpen(true)
  }

  function openEdit(r: AdminInternshipRecord) {
    setEditing(r)
    const parse = (s: string) => {
      try {
        return JSON.parse(s || "[]").join(", ")
      } catch {
        return ""
      }
    }
    const local = (iso: string | null) => (iso ? iso.slice(0, 10) : "")
    setForm({
      internshipId: r.internshipId,
      studentName: r.studentName,
      studentEmail: r.studentEmail || "",
      role: r.role,
      mentorName: r.mentorName || "",
      grade: r.grade || "",
      startDate: local(r.startDate),
      endDate: local(r.endDate),
      projects: r.projects
        ? (() => {
            try {
              return JSON.parse(r.projects)
                .map((p: any) => (typeof p === "string" ? p : p?.title || ""))
                .filter(Boolean)
                .join(" | ")
            } catch {
              return ""
            }
          })()
        : "",
      skills: parse(r.skills),
      tools: parse(r.tools),
      testimonial: r.testimonial || "",
      status: r.status,
      showPublicly: r.showPublicly,
    })
    setDialogOpen(true)
  }

  function submit() {
    const payload = {
      internshipId: form.internshipId,
      studentName: form.studentName,
      studentEmail: form.studentEmail || undefined,
      role: form.role,
      mentorName: form.mentorName || undefined,
      grade: form.grade || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      projects: form.projects
        ? form.projects
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((title) => ({ title }))
        : [],
      skills: csvOrJson(form.skills),
      tools: csvOrJson(form.tools),
      testimonial: form.testimonial || undefined,
      status: form.status,
      showPublicly: form.showPublicly,
    }
    saveMutation.mutate({ id: editing?.id, payload })
  }

  function copyCertId(certId: string) {
    navigator.clipboard
      .writeText(certId)
      .then(() => toast.success("Certificate ID copied"))
      .catch(() => toast.error("Could not copy"))
  }

  const internshipTitle = (id: string) => {
    const i = data?.internships.find((x) => x.id === id)
    return i ? `${i.title} · ${i.collegeName}` : id
  }

  const records = (data?.records ?? []).filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.certificateId.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students, roles, certificate IDs..."
            className="w-72 pl-9"
          />
        </div>
        <Button onClick={openCreate} className="gap-1.5 ml-auto" disabled={!data?.internships?.length}>
          <Plus className="h-4 w-4" /> Add student
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2.5">
        {records.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{r.studentName}</h3>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {r.role}
                </span>
                {r.isSample && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
                    Sample
                  </span>
                )}
                {r.showPublicly ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    Public
                  </span>
                ) : (
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Private
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-3 w-3" /> {internshipTitle(r.internshipId)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Award className="h-3 w-3 text-violet-300" /> {r.certificateId}
                <button
                  onClick={() => copyCertId(r.certificateId)}
                  className="ml-1 inline-flex text-muted-foreground hover:text-foreground"
                  aria-label="Copy certificate ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {r.showPublicly ? <Eye className="h-3.5 w-3.5 text-emerald-300" /> : <EyeOff className="h-3.5 w-3.5" />}
                <Switch
                  checked={r.showPublicly}
                  onCheckedChange={(v) => togglePublic.mutate({ id: r.id, showPublicly: v })}
                  disabled={togglePublic.isPending}
                  aria-label="Toggle showcase"
                />
              </label>
              <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-rose-300 hover:text-rose-200"
                onClick={() => {
                  if (confirm(`Delete the record for ${r.studentName}? The certificate stops verifying.`)) {
                    deleteMutation.mutate(r.id)
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!loading && records.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No student records yet. Add a student to an internship - the certificate is
              issued automatically and you choose when to showcase it.
            </p>
          </div>
        )}
      </div>

      {/* create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.studentName}` : "Add student to an internship"}
            </DialogTitle>
          </DialogHeader>
          {!editing && (
            <p className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 text-xs text-muted-foreground">
              A verifiable certificate (ID + tamper-proof hash) is issued the moment you
              save. Use the Public toggle to showcase the student on /internships with a
              downloadable certificate.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Internship *</label>
              <Select value={form.internshipId} onValueChange={(v) => setForm({ ...form, internshipId: v })}>
                <SelectTrigger><SelectValue placeholder="Pick an internship" /></SelectTrigger>
                <SelectContent>
                  {(data?.internships ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.title} · {i.collegeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Student name *</label>
              <Input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Student email (internal)</label>
              <Input type="email" value={form.studentEmail} onChange={(e) => setForm({ ...form, studentEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role *</label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. VAPT Intern" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mentor</label>
              <Input value={form.mentorName} onChange={(e) => setForm({ ...form, mentorName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Grade</label>
              <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Outstanding / A+ ..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Skills (comma separated)</label>
              <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Tools (comma separated)</label>
              <Input value={form.tools} onChange={(e) => setForm({ ...form, tools: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Projects (separate multiple with | )
              </label>
              <Input
                value={form.projects}
                onChange={(e) => setForm({ ...form, projects: e.target.value })}
                placeholder="Web App VAPT Capstone | Network Pentest Drill"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Testimonial (shown on the card)</label>
              <Textarea rows={2} value={form.testimonial} onChange={(e) => setForm({ ...form, testimonial: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Switch
                checked={form.showPublicly}
                onCheckedChange={(v) => setForm({ ...form, showPublicly: v })}
              />
              Showcase publicly (consent given - appears on /internships with downloadable certificate)
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={saveMutation.isPending || !form.studentName.trim() || !form.role.trim() || !form.internshipId}
              className="gap-1.5"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add student & issue certificate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
