"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import {
  ArrowLeft, Award, Users, CheckCircle2, Loader2, Download,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

interface CourseSummary {
  courseId: string
  title: string
  shortName: string
  certBody: string | null
  completed: number
  eligible: number
  alreadyIssued: number
}

interface IssuedRow {
  userId: string
  student: string
  email: string
  certificateId: string
}

export function CertBulkIssuanceView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [selectedCourseId, setSelectedCourseId] = React.useState("")
  const [issued, setIssued] = React.useState<IssuedRow[]>([])

  // Real per-course eligibility summary (completed enrollments vs certificates)
  const { data, isLoading } = useQuery<{ courses: CourseSummary[] }>({
    queryKey: ["admin-cert-bulk-summary"],
    queryFn: () => api("/api/admin/certificates/bulk-issue"),
    refetchOnWindowFocus: false,
  })
  const courses = data?.courses ?? []
  const selected = courses.find((c) => c.courseId === selectedCourseId) ?? null

  const issueMutation = useMutation({
    mutationFn: (courseId: string) =>
      api<{ issued: IssuedRow[]; skipped: number; message?: string }>(
        "/api/admin/certificates/bulk-issue",
        { method: "POST", body: JSON.stringify({ courseId }) },
      ),
    onSuccess: (res) => {
      setIssued(res.issued ?? [])
      queryClient.invalidateQueries({ queryKey: ["admin-cert-bulk-summary"] })
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] })
      if (res.message) {
        toast.info(res.message)
      } else {
        toast.success(
          `${res.issued.length} certificate${res.issued.length === 1 ? "" : "s"} issued — students notified by email`,
        )
      }
    },
    onError: (e: any) => toast.error(e.message || "Bulk issuance failed"),
  })

  function downloadCsv() {
    if (issued.length === 0) return
    const header = "certificate_id,student,email\n"
    const rows = issued
      .map((r) => `${r.certificateId},"${r.student.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}"`)
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `issued-certificates-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative min-h-screen">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-400" /> Certificate Bulk Issuance
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Select course */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold mb-4">Select a Course</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No completed enrollments yet — certificates become issuable once students finish a course.
            </p>
          ) : (
            <div className="space-y-2">
              {courses.map((c) => (
                <button
                  key={c.courseId}
                  onClick={() => { setSelectedCourseId(c.courseId); setIssued([]) }}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    selectedCourseId === c.courseId
                      ? "border-violet-500 bg-violet-500/5"
                      : "border-border/60 hover:border-violet-500/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px]">{c.shortName}</Badge>
                        <span className="font-medium text-sm">{c.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span><Users className="h-3 w-3 inline mr-1" />{c.completed} completed</span>
                        <span><CheckCircle2 className="h-3 w-3 inline mr-1" />{c.eligible} awaiting certificate</span>
                        <span><ShieldCheck className="h-3 w-3 inline mr-1" />{c.alreadyIssued} already issued</span>
                      </div>
                    </div>
                    {selectedCourseId === c.courseId && <CheckCircle2 className="h-5 w-5 text-violet-400" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Issue button */}
        {selected && (
          <Card className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-sm">{selected.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selected.eligible} student{selected.eligible === 1 ? "" : "s"} eligible
                  {selected.certBody ? ` · ${selected.certBody} track` : ""} — verified credentials + email notification
                </p>
              </div>
              <Button
                onClick={() => issueMutation.mutate(selected.courseId)}
                disabled={issueMutation.isPending || selected.eligible === 0}
                className="bg-violet-600 hover:bg-violet-500 btn-premium"
              >
                {issueMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Issuing…</>
                  : <><Award className="h-4 w-4 mr-2" /> Issue {selected.eligible} Certificate{selected.eligible === 1 ? "" : "s"}</>}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {issued.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-semibold">Issued Certificates</h2>
              <Badge className="bg-emerald-500/10 text-emerald-300 border-0">{issued.length} issued</Badge>
            </div>
            <div className="space-y-2">
              {issued.map((c) => (
                <div key={c.certificateId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <div>
                      <div className="text-sm font-medium">{c.student}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.certificateId}</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-0">VERIFIED</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={downloadCsv}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download All (CSV)
              </Button>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card className="p-4 border-violet-500/20 bg-violet-500/5">
          <p className="text-xs text-muted-foreground">
            <span className="text-violet-300 font-semibold">HOW IT WORKS:</span> Select a course with completed students, click "Issue Certificates", and GuardianX generates verifiable credentials (unique GX-… ID + tamper-evident hash) for each eligible student. Students are notified in-app and by email with their credential ID. Issuance is idempotent — students who already hold a certificate are never duplicated.
          </p>
        </Card>
      </div>
    </div>
  )
}
