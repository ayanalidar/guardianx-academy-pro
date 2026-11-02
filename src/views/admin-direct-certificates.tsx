"use client"

/**
 * AdminDirectCertsView - Admin → Direct Certificates.
 *
 * Issue verifiable certificates WITHOUT an internship enrollment:
 * the admin fills one form (student, program, grade, skills,
 * projects, dates) and presses "Issue certificate" - the record is
 * created WITH its GXI- certificateId + tamper-evident hash in that
 * single explicit action. The credential email (certificate ID +
 * verify link) goes out best-effort when an email is on the record.
 *
 * Every row offers BOTH documents the admin promised:
 *   - Certificate PDF  (same PHANTOM sheet as internship certificates)
 *   - Progress Report  (same report builder the verify page uses)
 * plus Resend email, the showPublicly verification gate (off = the id
 * answers "not found" publicly), revoke/restore (a revoked certificate
 * still verifies - honestly showing REVOKED), and delete.
 *
 * Data source: /api/admin/direct-certificates (+ /[id]).
 * Verification surface: /verify/<certificateId> - examType
 * "direct-certification" renders the internship-style card.
 */

import * as React from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { downloadDirectCertificatePDF, downloadVerifyReportPDF } from "@/lib/certificate-pdf"
import type { VerifyReportData } from "@/lib/certificate-pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Award, Plus, Loader2, Trash2, Copy, Search, Mail, Send, FileDown,
  Eye, EyeOff, Ban, RotateCcw, ShieldCheck, ScrollText,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

type DirectCert = {
  id: string
  certificateId: string
  studentName: string
  studentEmail: string | null
  programTitle: string
  collegeName: string | null
  mentorName: string | null
  durationWeeks: number | null
  startDate: string | null
  endDate: string | null
  skills: string[]
  projects: { title: string; description: string }[]
  grade: string | null
  score: number | null
  remarks: string | null
  programDirector: string | null
  status: string // valid | revoked
  showPublicly: boolean
  certificateIssuedAt: string | null
  emailedAt: string | null
}

type IssueForm = {
  studentName: string
  studentEmail: string
  programTitle: string
  collegeName: string
  mentorName: string
  durationWeeks: string
  startDate: string
  endDate: string
  skills: string
  projectsDraft: string
  grade: string
  score: string
  remarks: string
  programDirector: string
  showPublicly: boolean
  sendEmail: boolean
}

const EMPTY_FORM: IssueForm = {
  studentName: "",
  studentEmail: "",
  programTitle: "",
  collegeName: "",
  mentorName: "",
  durationWeeks: "",
  startDate: "",
  endDate: "",
  skills: "",
  projectsDraft: "",
  grade: "",
  score: "",
  remarks: "",
  programDirector: "",
  showPublicly: true,
  sendEmail: true,
}

const fmtDate = (iso: string | null) => {
  if (!iso) return "-"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/** Map a row onto the progress-report payload (same builder the verify page uses). */
function toReportData(r: DirectCert): VerifyReportData {
  return {
    // "direct" flavor: neutral wording ("the program") - never "internship",
    // never a forced "Direct Certification" label. The program title the
    // admin entered is the only printed name.
    kind: "direct",
    credentialId: r.certificateId,
    candidateName: r.studentName,
    grade: r.grade ?? null,
    score: r.score ?? null,
    issueDate: r.certificateIssuedAt,
    verifyUrl: `/verify/${r.certificateId}`,
    skills: r.skills ?? [],
    projects: (r.projects ?? []).map((p) => ({ title: p.title, description: p.description ?? "" })),
    program: {
      title: r.programTitle,
      role: r.programTitle,
      // No forced "Direct Certification" domain cell - only admin-entered facts.
      domain: null,
      company: "GuardianX Academy",
      collegeName: r.collegeName,
      durationWeeks: r.durationWeeks,
      startDate: r.startDate,
      endDate: r.endDate,
      mentorName: r.mentorName,
      programDirector: r.programDirector,
      completed: true,
    },
  }
}

// ============================================================
// View
// ============================================================

export function AdminDirectCertsView() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [issueOpen, setIssueOpen] = React.useState(false)
  const [form, setForm] = React.useState<IssueForm>(EMPTY_FORM)

  const list = useQuery({
    queryKey: ["admin-direct-certs"],
    queryFn: async () => (await api<{ certificates: DirectCert[] }>("/api/admin/direct-certificates")).certificates,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-direct-certs"] })

  const issue = useMutation({
    mutationFn: async (f: IssueForm) =>
      api<{ ok: boolean; certificate: DirectCert; email: { ok: boolean; error?: string; skipped?: string } }>(
        "/api/admin/direct-certificates",
        { method: "POST", body: JSON.stringify(f) }
      ),
    onSuccess: (res) => {
      invalidate()
      setIssueOpen(false)
      setForm(EMPTY_FORM)
      const c = res.certificate
      if (res.email?.ok) {
        toast.success(`Certificate issued: ${c.certificateId} - emailed to ${c.studentEmail}`)
      } else if (res.email?.skipped === "no-email") {
        toast.success(`Certificate issued: ${c.certificateId} (no email on record - add one to send)`)
      } else if (res.email?.skipped === "not-requested") {
        toast.success(`Certificate issued: ${c.certificateId} (email sending was off)`)
      } else {
        toast.success(`Certificate issued: ${c.certificateId}`, {
          description: res.email?.error ? `Email failed: ${res.email.error}` : undefined,
        })
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to issue the certificate"),
  })

  const patch = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api<{ ok: boolean }>(`/api/admin/direct-certificates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  })

  const remove = useMutation({
    mutationFn: async (id: string) =>
      api<{ ok: boolean }>(`/api/admin/direct-certificates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate()
      toast.success("Certificate record deleted")
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  })

  const rows = React.useMemo(() => {
    const all = list.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (r) =>
        r.studentName?.toLowerCase().includes(q) ||
        r.certificateId?.toLowerCase().includes(q) ||
        r.programTitle?.toLowerCase().includes(q) ||
        r.collegeName?.toLowerCase().includes(q)
    )
  }, [list.data, search])

  const busy = issue.isPending

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-300" /> Direct Certificates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Issue verifiable certificates + progress reports without an internship enrollment.
              Every certificate verifies at <span className="font-mono">/verify/&lt;id&gt;</span>.
            </p>
          </div>
          <Button onClick={() => setIssueOpen(true)} className="gap-2" disabled={busy}>
            <Plus className="h-4 w-4" /> Issue certificate
          </Button>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, certificate ID, program, college..."
            className="pl-9"
          />
        </div>

        {/* ── List ── */}
        {list.isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading certificates...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border/60 rounded-xl">
            <Award className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {search ? "No certificates match your search." : "No direct certificates issued yet."}
            </p>
            {!search && (
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setIssueOpen(true)}>
                <Plus className="h-4 w-4" /> Issue the first certificate
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-xl border border-border/60 bg-card/40 p-4",
                  r.status === "revoked" && "opacity-70 border-rose-500/30"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.studentName}</span>
                      {r.status === "revoked" ? (
                        <Badge variant="outline" className="border-rose-500/40 text-rose-300 bg-rose-500/10">REVOKED</Badge>
                      ) : r.showPublicly ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Verifiable
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">Hidden</Badge>
                      )}
                      {r.studentEmail && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {r.studentEmail}
                          {r.emailedAt && <span className="text-emerald-400/80"> · emailed {fmtDate(r.emailedAt)}</span>}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">
                      {r.programTitle}
                      {r.collegeName ? ` · ${r.collegeName}` : ""}
                      {r.durationWeeks ? ` · ${r.durationWeeks} weeks` : ""}
                      {r.grade ? ` · Grade: ${r.grade}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-violet-300">{r.certificateId}</span>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy certificate ID"
                        onClick={() => {
                          navigator.clipboard?.writeText(r.certificateId)
                          toast.success("Certificate ID copied")
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <span>· issued {fmtDate(r.certificateIssuedAt)}</span>
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <Button
                      size="sm" variant="outline" className="gap-1.5"
                      onClick={() => downloadDirectCertificatePDF(r.certificateId)}
                      title="Download the certificate PDF (PHANTOM theme)"
                    >
                      <Award className="h-3 w-3" /> Certificate PDF
                    </Button>
                    <Button
                      size="sm" variant="outline" className="gap-1.5"
                      onClick={async () => {
                        toast.info("Preparing report PDF...")
                        await downloadVerifyReportPDF(toReportData(r))
                        toast.success("Report opened - use Save as PDF in the print dialog.")
                      }}
                      title="Download the progress report PDF"
                    >
                      <FileDown className="h-3 w-3" /> Report PDF
                    </Button>
                    {r.studentEmail && (
                      <Button
                        size="sm" variant="outline" className="gap-1.5"
                        onClick={() =>
                          patch.mutate(
                            { id: r.id, data: { resendEmail: true } },
                            { onSuccess: () => toast.success("Credential email sent") }
                          )
                        }
                        title="Resend the credential email (certificate ID + verify link)"
                      >
                        <Send className="h-3 w-3" /> Resend email
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost"
                      onClick={() =>
                        patch.mutate(
                          { id: r.id, data: { showPublicly: !r.showPublicly } },
                          { onSuccess: () => toast.success(r.showPublicly ? "Certificate hidden - it no longer verifies publicly" : "Certificate is publicly verifiable again") }
                        )
                      }
                      title={r.showPublicly ? "Hide from public verification" : "Make publicly verifiable"}
                    >
                      {r.showPublicly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() =>
                        patch.mutate(
                          { id: r.id, data: { status: r.status === "revoked" ? "valid" : "revoked" } },
                          { onSuccess: () => toast.success(r.status === "revoked" ? "Certificate restored" : "Certificate revoked - it now verifies as REVOKED") }
                        )
                      }
                      title={r.status === "revoked" ? "Restore the certificate" : "Revoke the certificate"}
                    >
                      {r.status === "revoked" ? <RotateCcw className="h-4 w-4 text-emerald-300" /> : <Ban className="h-4 w-4 text-rose-300" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete the certificate for ${r.studentName} (${r.certificateId})? This cannot be undone.`)) {
                          remove.mutate(r.id)
                        }
                      }}
                      title="Delete the record"
                    >
                      <Trash2 className="h-4 w-4 text-rose-300" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Issue dialog ── */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-300" /> Issue a direct certificate
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Pressing <span className="text-foreground font-medium">Issue certificate</span> mints the certificate ID +
            tamper-evident hash immediately - the credential becomes verifiable at{" "}
            <span className="font-mono">/verify/&lt;id&gt;</span> the moment this is saved.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Student name *</span>
              <Input
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                placeholder="e.g. ANANYA SHARMA"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Student email</span>
              <Input
                type="email"
                value={form.studentEmail}
                onChange={(e) => setForm({ ...form, studentEmail: e.target.value })}
                placeholder="student@example.com"
              />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Program title *</span>
              <Input
                value={form.programTitle}
                onChange={(e) => setForm({ ...form, programTitle: e.target.value })}
                placeholder="e.g. VAPT Bootcamp / Cyber Security Workshop"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">College / institution</span>
              <Input
                value={form.collegeName}
                onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                placeholder="optional"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Mentor</span>
              <Input
                value={form.mentorName}
                onChange={(e) => setForm({ ...form, mentorName: e.target.value })}
                placeholder="optional"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Duration (weeks)</span>
              <Input
                type="number" min={1} max={104}
                value={form.durationWeeks}
                onChange={(e) => setForm({ ...form, durationWeeks: e.target.value })}
                placeholder="e.g. 4"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">Start date</span>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">End date</span>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
            </div>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Grade</span>
              <Input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                placeholder="e.g. Outstanding / A+ (optional)"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Score (0-100)</span>
              <Input
                type="number" min={0} max={100}
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                placeholder="optional"
              />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Skills (comma-separated)</span>
              <Input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="Network Scanning, Web VAPT, Report Writing"
              />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Projects delivered (one per line: Title | short description)</span>
              <Textarea
                rows={3}
                value={form.projectsDraft}
                onChange={(e) => setForm({ ...form, projectsDraft: e.target.value })}
                placeholder={"Recon Lab Report | full recon of the practice range\nWeb App Pentest | OWASP top-10 assessment"}
                className="font-mono text-xs"
              />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Remarks (shown on the verify card)</span>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="optional one-liner"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Program Director (signature)</span>
              <Input
                value={form.programDirector}
                onChange={(e) => setForm({ ...form, programDirector: e.target.value })}
                placeholder="default: GuardianX Academy"
              />
            </label>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.showPublicly}
                  onCheckedChange={(v) => setForm({ ...form, showPublicly: v })}
                />
                <span className="text-muted-foreground">Publicly verifiable</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.sendEmail}
                  onCheckedChange={(v) => setForm({ ...form, sendEmail: v })}
                />
                <span className="text-muted-foreground">Email the student</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIssueOpen(false)} disabled={busy}>Cancel</Button>
            <Button
              className="gap-2"
              disabled={busy || !form.studentName.trim() || !form.programTitle.trim()}
              onClick={() => {
                const lines = form.projectsDraft
                  .split("\n").map((l) => l.trim()).filter(Boolean)
                  .map((l) => {
                    const [title, ...rest] = l.split("|")
                    return { title: (title ?? "").trim(), description: rest.join("|").trim() }
                  })
                  .filter((p) => p.title)
                issue.mutate({ ...form, projects: lines.length ? lines : [] } as any)
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4" />}
              Issue certificate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
