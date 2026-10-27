"use client"

/**
 * AdminInternshipsView - Admin → Internships.
 *
 * Full CRUD over /api/admin/internships (+ /records). Two tabs:
 *   1. Internships - the programs under each college (college name,
 *      title, domain, mode, duration, seats, status, published toggle)
 *   2. Students - internship records per student. Students join with
 *      status "ongoing" and NO certificate; the admin issues the
 *      verifiable certificate (certificateId + tamper-evident hash)
 *      explicitly via the "Issue certificate" button whenever they
 *      wish. showPublicly is the consent gate that puts the record +
 *      its downloadable certificate on the public page.
 *
 * Sample rows (isSample) carry a visible chip; delete them once real
 * data replaces them.
 */

import * as React from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { normalizeProjectEntries, type ProjectEntry } from "@/lib/internship-projects"
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
  Eye, EyeOff, Search, GraduationCap, Building2, Award, Clock,
  Mail, Send, FileDown, MailX,
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
  isPaid: boolean
  feeInr: number
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
  paidCount: number
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
  certificateId: string | null // null = not issued yet
  certificateIssuedAt: string | null
  programDirector: string | null
  nameSize: string | null
  // offer letter (generated at registration, auto-emailed)
  offerRef: string | null
  offerSentAt: string | null
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
  // paid training-cum-internship: fee pre-filled per owner spec (editable),
  // start date pre-filled 20 days ahead (editable), end auto = start + weeks
  isPaid: false,
  feeInr: "5999",
  startsAt: defaultStartDateValue(),
  endsAt: "",
  status: "upcoming",
  description: "",
  skills: "",
  featured: false,
  published: true,
  order: "0",
}

// Sentinel internshipId for the "create a new internship inline" mode of
// the Add-student dialog (Radix Select can't use "" as a value).
const NEW_INTERNSHIP_SENTINEL = "__new__"

const EMPTY_RECORD_FORM = {
  internshipId: "",
  studentName: "",
  studentEmail: "",
  role: "",
  mentorName: "",
  grade: "",
  startDate: "",
  endDate: "",
  // One box per project - each entry is a { title, description } pair.
  projects: [] as ProjectEntry[],
  skills: "",
  tools: "",
  testimonial: "",
  status: "ongoing",
  showPublicly: false,
  // certificate presentation (Program Director signature, recipient name
  // size, issue date) - editable per record
  programDirector: "",
  nameSize: "regular",
  issueDate: "",
  // When true, POST also mints the certificate in the same request
  // ("Issue certificate immediately" checkbox). Default OFF: students join
  // ongoing with no certificate - it is issued explicitly from the record
  // row whenever the admin wishes.
  issueNow: false,
  // When true (default), the stunning Phantom-themed PDF offer letter is
  // generated server-side and emailed to the student automatically.
  // Needs a student email - auto-offered (switch disabled) without one.
  sendOfferEmail: true,
  // inline "new internship" fields (used when internshipId === NEW_INTERNSHIP_SENTINEL)
  newCollegeName: "",
  newCollegeCity: "",
  newTitle: "",
  newCompany: "",
  newDomain: "",
  newMode: "remote",
  newDurationWeeks: "8",
  newStatus: "completed",
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

// --- date helpers (paid-internship form) ---
function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** yyyy-MM-dd for <input type="date"> from an ISO string ("" when absent). */
function toInputDate(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  } catch {
    return ""
  }
}

/** Owner spec: the create form pre-fills the start date 20 days ahead. */
function defaultStartDateValue(): string {
  const d = new Date(Date.now() + 20 * 86_400_000)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** End date = start + duration-in-weeks (used to auto-fill, still editable). */
function computeEndDate(startYmd: string, weeks: number): string {
  if (!startYmd) return ""
  const d = new Date(`${startYmd}T00:00:00`)
  if (isNaN(d.getTime())) return ""
  d.setDate(d.getDate() + Math.max(1, weeks || 8) * 7)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
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
    const start = defaultStartDateValue()
    setForm({ ...EMPTY_INTERNSHIP_FORM, startsAt: start, endsAt: computeEndDate(start, 8) })
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
      isPaid: i.isPaid,
      feeInr: String(i.feeInr ?? 0),
      startsAt: toInputDate(i.startsAt),
      endsAt: toInputDate(i.endsAt),
      status: i.status,
      description: i.description || "",
      skills,
      featured: i.featured,
      published: i.published,
      order: String(i.order ?? 0),
    })
    setDialogOpen(true)
  }

  // Paid toggle: per owner spec, switching a posting to "paid training-cum-
  // internship" pre-fills fee ₹5999 and 30 seats (both stay editable).
  function setPaid(v: boolean) {
    setForm((f) => ({
      ...f,
      isPaid: v,
      seats: v && (f.seats === "10" || f.seats === "") ? "30" : f.seats,
      feeInr: v && (!f.feeInr || f.feeInr === "0") ? "5999" : f.feeInr,
      endsAt: !f.endsAt && f.startsAt ? computeEndDate(f.startsAt, Number(f.durationWeeks) || 8) : f.endsAt,
    }))
  }

  function submit() {
    const payload = {
      ...form,
      durationWeeks: Number(form.durationWeeks) || 8,
      seats: Number(form.seats) || 10,
      order: Number(form.order) || 0,
      skills: csvOrJson(form.skills),
      isPaid: form.isPaid,
      feeInr: form.isPaid ? Number(form.feeInr) || 0 : 0,
      startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
      endsAt: form.endsAt ? new Date(`${form.endsAt}T00:00:00`).toISOString() : null,
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
                {i.isPaid && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
                    Paid ₹{Number(i.feeInr).toLocaleString("en-IN")}
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
                {i.isPaid && typeof i.paidCount === "number" ? ` · ${i.paidCount}/${i.seats} seats filled` : ""}
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
              <Input
                type="number"
                min={1}
                max={52}
                value={form.durationWeeks}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    durationWeeks: v,
                    // keep an auto-derived end date in sync; a hand-edited
                    // end date is never overwritten
                    endsAt:
                      f.endsAt && f.endsAt === computeEndDate(f.startsAt, Number(f.durationWeeks) || 8)
                        ? computeEndDate(f.startsAt, Number(v) || 8)
                        : f.endsAt,
                  }))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Seats</label>
              <Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={form.startsAt}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    startsAt: v,
                    endsAt: f.endsAt || computeEndDate(v, Number(f.durationWeeks) || 8),
                  }))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
            <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isPaid} onCheckedChange={setPaid} />
                <span className="font-medium">Paid training-cum-internship</span>
                <span className="text-xs text-muted-foreground">- charges a fee, enrollments go through Razorpay checkout</span>
              </label>
              {form.isPaid && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fee (INR) *</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.feeInr}
                      onChange={(e) => setForm({ ...form, feeInr: e.target.value })}
                      placeholder="e.g. 5999"
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Fee and the seat cap are enforced server-side. Paid seats are counted from real
                    orders - the list shows "N/{form.seats || "30"} seats filled" and the public page
                    shows seats left. Buyers get an auto-created student record + certificate path.
                  </p>
                </div>
              )}
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
              disabled={
                saveMutation.isPending ||
                !form.collegeName.trim() ||
                !form.title.trim() ||
                (form.isPaid && !(Number(form.feeInr) > 0))
              }
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
    onSuccess: (d: any, vars) => {
      if (vars.id) {
        toast.success("Student record updated")
      } else {
        const offer = d?.offer as { emailed?: boolean; emailError?: string } | undefined
        if (offer?.emailed) {
          toast.success("Student added - offer letter emailed, status Ongoing (no certificate yet)")
        } else if (offer && offer.emailError) {
          toast.warning(`Student added - status Ongoing. Offer email failed: ${offer.emailError}`)
        } else if (vars.payload.issueNow) {
          toast.success("Student added - certificate issued")
        } else {
          toast.success("Student added - status Ongoing (no certificate yet)")
        }
      }
      setDialogOpen(false)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  // The explicit "Issue certificate" action on a record row - mints the
  // certificateId + tamper-evident hash whenever the admin wishes.
  const issueCert = useMutation({
    mutationFn: (r: AdminInternshipRecord) =>
      api(`/api/admin/internships/records/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ issueCertificate: true }),
      }),
    onSuccess: (d: any, r) => {
      toast.success(
        d?.alreadyIssued
          ? `Certificate already issued (${r.certificateId})`
          : `Certificate issued for ${r.studentName}${d?.certificateId ? ` - ${d.certificateId}` : ""}`
      )
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Issue failed"),
  })

  // (Re)send the offer letter email - regenerates the PDF server-side and
  // attaches it. Works for legacy records too (mints the ref on demand).
  const sendOffer = useMutation({
    mutationFn: (r: AdminInternshipRecord) =>
      api(`/api/admin/internships/records/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sendOffer: true }),
      }),
    onSuccess: (d: any, r) => {
      if (d?.emailed) {
        toast.success(`Offer letter emailed to ${r.studentName}${d?.offerRef ? ` (${d.offerRef})` : ""}`)
      } else {
        toast.error(d?.emailError || "Offer email failed")
      }
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message || "Send failed"),
  })

  function downloadOfferPdf(r: AdminInternshipRecord) {
    // Server-built from the saved record - identical to the emailed PDF.
    window.open(`/api/admin/internships/records/${r.id}/offer-pdf`, "_blank")
  }

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
    // With no internships yet, pre-select the inline "create new internship"
    // mode so adding the first student never dead-ends.
    setForm({
      ...EMPTY_RECORD_FORM,
      internshipId: data?.internships?.[0]?.id ?? NEW_INTERNSHIP_SENTINEL,
      // Start with one visible box so the per-project editor is obvious.
      projects: [{ title: "", description: "" }],
      // Issue date prefilled for the "issue immediately" checkbox (local tz).
      issueDate: new Date().toLocaleDateString("en-CA"),
    })
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
      ...EMPTY_RECORD_FORM,
      internshipId: r.internshipId,
      studentName: r.studentName,
      studentEmail: r.studentEmail || "",
      role: r.role,
      mentorName: r.mentorName || "",
      grade: r.grade || "",
      startDate: local(r.startDate),
      endDate: local(r.endDate),
      // Structured entries ({title, description}) - drops legacy "[object Object]"
      // garbage from the old pipe-separated bug instead of showing it back.
      projects: normalizeProjectEntries(r.projects),
      skills: parse(r.skills),
      tools: parse(r.tools),
      testimonial: r.testimonial || "",
      status: r.status,
      showPublicly: r.showPublicly,
      programDirector: r.programDirector || "",
      nameSize: r.nameSize || "regular",
      issueDate: r.certificateIssuedAt ? r.certificateIssuedAt.slice(0, 10) : "",
      issueNow: false,
    })
    setDialogOpen(true)
  }

  function submit() {
    const isNewInt = form.internshipId === NEW_INTERNSHIP_SENTINEL
    const payload: Record<string, unknown> = {
      studentName: form.studentName,
      studentEmail: form.studentEmail || undefined,
      role: form.role,
      mentorName: form.mentorName || undefined,
      grade: form.grade || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      // One entry per project box; empty boxes are dropped silently. A
      // description-only box uses the head of its description as the title.
      projects: form.projects
        .map((p) => ({ title: p.title.trim(), description: p.description.trim() }))
        .filter((p) => p.title || p.description)
        .map((p) => ({ title: p.title || p.description.slice(0, 80), description: p.description })),
      skills: csvOrJson(form.skills),
      tools: csvOrJson(form.tools),
      testimonial: form.testimonial || undefined,
      status: form.status,
      showPublicly: form.showPublicly,
      // certificate presentation (issue date re-binds the verification hash
      // server-side, so verification keeps passing)
      programDirector: form.programDirector.trim() || undefined,
      nameSize: form.nameSize,
      certificateIssuedAt: form.issueDate || undefined,
      // POST-only: mint the certificate in the same request when the admin
      // ticks "Issue certificate immediately". Otherwise the student joins
      // ongoing with no certificate.
      issueNow: !editing && form.issueNow,
      // POST-only: auto-email the offer letter (default on). The backend
      // skips silently when the record has no student email.
      sendOffer: form.sendOfferEmail,
    }
    if (isNewInt) {
      // "Add students directly": create the internship inline in the same
      // request - no dead end when the platform starts with zero internships.
      payload.newInternship = {
        collegeName: form.newCollegeName,
        collegeCity: form.newCollegeCity || undefined,
        title: form.newTitle,
        company: form.newCompany || undefined,
        domain: form.newDomain || undefined,
        mode: form.newMode,
        durationWeeks: Number(form.newDurationWeeks) || 8,
        status: form.newStatus,
      }
    } else {
      payload.internshipId = form.internshipId
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
      (r.certificateId ? r.certificateId.toLowerCase().includes(q) : false)
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
        <Button onClick={openCreate} className="gap-1.5 ml-auto">
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
                {r.status === "ongoing" && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                    Ongoing
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-3 w-3" /> {internshipTitle(r.internshipId)}
              </p>
              {/* Offer letter line - every registered student holds one; the
                  certificate below it only appears once the admin issues it. */}
              {r.offerRef ? (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                    <Mail className="h-3 w-3" /> {r.offerRef}
                    <button
                      onClick={() => {
                        navigator.clipboard
                          .writeText(r.offerRef!)
                          .then(() => toast.success("Offer reference copied"))
                          .catch(() => toast.error("Could not copy"))
                      }}
                      className="ml-0.5 inline-flex text-rose-300/70 hover:text-rose-200"
                      aria-label="Copy offer reference"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                  {r.offerSentAt ? (
                    <span className="text-[10px] text-muted-foreground">
                      emailed {new Date(r.offerSentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">not emailed yet</span>
                  )}
                  {r.studentEmail ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2.5 text-[11px] border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                      onClick={() => sendOffer.mutate(r)}
                      disabled={sendOffer.isPending}
                    >
                      {sendOffer.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Resend offer
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MailX className="h-3 w-3" /> no email on record
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2.5 text-[11px]"
                    onClick={() => downloadOfferPdf(r)}
                  >
                    <FileDown className="h-3 w-3" /> Offer PDF
                  </Button>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2.5 text-[11px] border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                    onClick={() => sendOffer.mutate(r)}
                    disabled={sendOffer.isPending}
                  >
                    {sendOffer.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                    Generate & send offer letter
                  </Button>
                </div>
              )}
              {r.certificateId ? (
                <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Award className="h-3 w-3 text-violet-300" /> {r.certificateId}
                  <button
                    onClick={() => copyCertId(r.certificateId!)}
                    className="ml-1 inline-flex text-muted-foreground hover:text-foreground"
                    aria-label="Copy certificate ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </p>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                    <Clock className="h-3 w-3" /> No certificate yet
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2.5 text-[11px] border-violet-500/40 text-violet-200 hover:bg-violet-500/10"
                    onClick={() => issueCert.mutate(r)}
                    disabled={issueCert.isPending}
                  >
                    {issueCert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3" />}
                    Issue certificate
                  </Button>
                </div>
              )}
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
              No student records yet. Add a student to an internship - they join with status
              Ongoing, and you issue the certificate whenever you're ready from the record row.
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
              The student joins with status <span className="text-amber-300">Ongoing</span> and
              <span className="text-amber-300"> no certificate</span> - nothing is publicly
              verifiable yet. A stunning offer letter is generated automatically and emailed to
              the student (see the switch below), and you issue the certificate whenever you wish
              from the "Issue certificate" button on the record row (or tick the box below to
              issue immediately).
              {(data?.internships?.length ?? 0) === 0 &&
                " No internships exist yet - pick \u201cNew internship\u201d below and fill the highlighted fields to create one as you add the student."}
            </p>
          )}
          {editing && !editing.certificateId && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-muted-foreground">
              No certificate issued yet for this student - use the
              <span className="text-amber-300"> Issue certificate</span> button on the record
              row when they finish.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Internship *</label>
              <Select value={form.internshipId} onValueChange={(v) => setForm({ ...form, internshipId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    (data?.internships?.length ?? 0) === 0
                      ? "No internships yet - create one below"
                      : "Pick an internship"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {(data?.internships ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.title} · {i.collegeName}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_INTERNSHIP_SENTINEL} className="text-violet-300">
                    + New internship - create it now
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.internshipId === NEW_INTERNSHIP_SENTINEL && !editing && (
              <>
                <div className="sm:col-span-2 rounded-lg border border-violet-500/30 bg-violet-500/[0.06] p-3">
                  <p className="text-xs font-medium text-violet-300 mb-3">
                    New internship details - created automatically when you save this student
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">College / Institution name *</label>
                      <Input
                        value={form.newCollegeName}
                        onChange={(e) => setForm({ ...form, newCollegeName: e.target.value })}
                        placeholder="e.g. Rungta College of Engineering"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">City</label>
                      <Input
                        value={form.newCollegeCity}
                        onChange={(e) => setForm({ ...form, newCollegeCity: e.target.value })}
                        placeholder="e.g. Bhilai"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Internship title *</label>
                      <Input
                        value={form.newTitle}
                        onChange={(e) => setForm({ ...form, newTitle: e.target.value })}
                        placeholder="e.g. Cyber Security Internship - Summer Batch"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Company</label>
                      <Input
                        value={form.newCompany}
                        onChange={(e) => setForm({ ...form, newCompany: e.target.value })}
                        placeholder="GuardianX Academy"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Domain</label>
                      <Input
                        value={form.newDomain}
                        onChange={(e) => setForm({ ...form, newDomain: e.target.value })}
                        placeholder="Cyber Security"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Mode</label>
                      <Select value={form.newMode} onValueChange={(v) => setForm({ ...form, newMode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Duration (weeks)</label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={form.newDurationWeeks}
                        onChange={(e) => setForm({ ...form, newDurationWeeks: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Internship status</label>
                      <Select value={form.newStatus} onValueChange={(v) => setForm({ ...form, newStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Student name *</label>
              <Input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Student email (offer letters + contact)</label>
              <Input type="email" value={form.studentEmail} onChange={(e) => setForm({ ...form, studentEmail: e.target.value })} />
            </div>
            {!editing && (
              <label
                className={cn(
                  "flex items-center gap-2 text-sm rounded-lg border px-3 py-2.5",
                  form.studentEmail.trim()
                    ? "border-rose-500/25 bg-rose-500/[0.06]"
                    : "border-border/60 bg-card/30 opacity-60"
                )}
              >
                <Switch
                  checked={form.sendOfferEmail && !!form.studentEmail.trim()}
                  disabled={!form.studentEmail.trim()}
                  onCheckedChange={(v) => setForm({ ...form, sendOfferEmail: v })}
                />
                <span className="text-xs">
                  Email the offer letter now
                  <span className="block text-[10px] text-muted-foreground">
                    {form.studentEmail.trim()
                      ? "BLACKOPS-themed PDF attached automatically - same theme as our certificates"
                      : "Add a student email to enable the automatic offer letter"}
                  </span>
                </span>
              </label>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role *</label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. VAPT Intern" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mentor</label>
              <Input value={form.mentorName} onChange={(e) => setForm({ ...form, mentorName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Program Director (certificate signature)</label>
              <Input
                value={form.programDirector}
                onChange={(e) => setForm({ ...form, programDirector: e.target.value })}
                placeholder="GuardianX Academy"
              />
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
            {editing?.certificateId ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Issue date (certificate)</label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                />
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm sm:col-span-1 rounded-lg border border-violet-500/25 bg-violet-500/[0.06] px-3 py-2.5">
                <Switch
                  checked={form.issueNow}
                  onCheckedChange={(v) => setForm({ ...form, issueNow: v })}
                />
                <span className="text-xs">
                  Issue certificate immediately
                  <span className="block text-[10px] text-muted-foreground">Default off - issue later from the record row</span>
                </span>
              </label>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name size on certificate</label>
              <Select value={form.nameSize} onValueChange={(v) => setForm({ ...form, nameSize: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact - long names</SelectItem>
                  <SelectItem value="regular">Regular (recommended)</SelectItem>
                  <SelectItem value="large">Large - original size</SelectItem>
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
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Projects delivered - one box per project
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    setForm({ ...form, projects: [...form.projects, { title: "", description: "" }] })
                  }
                >
                  <Plus className="h-3 w-3" /> Add project
                </Button>
              </div>
              {form.projects.length === 0 && (
                <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                  No projects yet - click "Add project" for each project the student completed.
                </p>
              )}
              <div className="space-y-2.5">
                {form.projects.map((p, i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <FlaskConical className="h-3.5 w-3.5 text-violet-300" /> Project {i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove project ${i + 1}`}
                        onClick={() =>
                          setForm({ ...form, projects: form.projects.filter((_, idx) => idx !== i) })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={p.title}
                      placeholder="Project title - e.g. Web App VAPT Capstone"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          projects: form.projects.map((x, idx) =>
                            idx === i ? { ...x, title: e.target.value } : x
                          ),
                        })
                      }
                    />
                    <Textarea
                      rows={2}
                      value={p.description}
                      placeholder="What the student built / delivered (optional)"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          projects: form.projects.map((x, idx) =>
                            idx === i ? { ...x, description: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
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
              Showcase publicly (consent given - appears on /internships
              {form.issueNow || editing?.certificateId ? " with downloadable certificate" : " once a certificate is issued"})
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={
                saveMutation.isPending ||
                !form.studentName.trim() ||
                !form.role.trim() ||
                (form.internshipId === NEW_INTERNSHIP_SENTINEL
                  ? !form.newCollegeName.trim() || !form.newTitle.trim()
                  : !form.internshipId)
              }
              className="gap-1.5"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing
                ? "Save changes"
                : form.issueNow
                ? "Add student & issue certificate"
                : form.sendOfferEmail && form.studentEmail.trim()
                ? "Add student & email offer letter"
                : "Add student (ongoing)"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
