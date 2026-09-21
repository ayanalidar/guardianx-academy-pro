"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Users, Search, BookOpen, FlaskConical, Award,
  TrendingUp, Clock, CheckCircle2, Download, BarChart3,
  FileSpreadsheet, Loader2, X, Building2,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
 *  REPORT TYPES - kept in sync with /api/admin/reports route
 * ============================================================ */
type ReportType = "enrollment" | "attendance" | "completion" | "revenue"

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "enrollment", label: "Enrollment Summary", icon: Users },
  { value: "attendance", label: "Attendance Report", icon: Clock },
  { value: "completion", label: "Completion Rate", icon: Award },
  { value: "revenue", label: "Revenue Report", icon: TrendingUp },
]

/* Generic row type - the actual shape varies per report type, but
 * every report returns a `rows` array of flat objects. We index by
 * key for the CSV export + dynamic table render. */
type ReportRow = Record<string, string | number | boolean | null>

type ReportResponse = {
  type: ReportType
  from: string
  to: string
  institutionId: string | null
  institutionName: string | null
  rows: ReportRow[]
  [key: string]: unknown
}

/* ============================================================
 *  CSV EXPORT - generic for any report shape
 * ============================================================ */
function downloadCsv(filename: string, rows: ReportRow[]) {
  if (rows.length === 0) {
    toast.error("No rows to export")
    return
  }
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ""
    const s = String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [keys.join(",")]
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(","))
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success(`Exported ${rows.length} rows to ${filename}`)
}

/* ============================================================
 *  Helper - pretty-print date inputs default to today/30 days ago
 * ============================================================ */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/* ============================================================
 *  Main view
 * ============================================================ */
export function StudentProgressView() {
  const { navigate } = useAppStore()
  const [search, setSearch] = React.useState("")
  const [courseFilter, setCourseFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)

  /* ----------- Report dialog state ----------- */
  const [reportOpen, setReportOpen] = React.useState(false)
  const [reportType, setReportType] = React.useState<ReportType>("enrollment")
  const [reportFrom, setReportFrom] = React.useState(daysAgoISO(30))
  const [reportTo, setReportTo] = React.useState(todayISO())
  const [institutionFilter, setInstitutionFilter] = React.useState<string>("")
  const [reportLoading, setReportLoading] = React.useState(false)
  const [reportData, setReportData] = React.useState<ReportResponse | null>(null)
  const [reportError, setReportError] = React.useState<string | null>(null)

  /* ----------- DB query: students ----------- */
  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-progress", search, courseFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (courseFilter !== "all") params.set("course", courseFilter)
      params.set("page", String(page))
      const res = await fetch(`/api/admin/students?${params}`)
      if (!res.ok) return { students: [], total: 0, page: 1, totalPages: 1 }
      return res.json()
    },
    staleTime: 60_000,
  })

  /* ----------- DB query: real courses for the filter dropdown ----------- */
  const { data: coursesData } = useQuery({
    queryKey: ["admin-student-progress-courses"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/courses", { credentials: "include" })
      if (!res.ok) return { courses: [] }
      return res.json()
    },
  })
  const courses: { id: string; shortName: string; title: string }[] =
    (coursesData as any)?.courses ?? []

  /* ----------- DB query: institutions (schools) for the report dialog filter ----------- */
  const { data: schoolsData } = useQuery({
    queryKey: ["admin-reports-schools"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/schools", { credentials: "include" })
      if (!res.ok) return { schools: [] as { id: string; name: string }[] }
      return res.json()
    },
  })

  const schools: { id: string; name: string }[] = (schoolsData as any)?.schools ?? []

  const students = data?.students ?? []
  const totalStudents = (data as any)?.total ?? students.length
  const totalPages: number = Math.max(1, (data as any)?.totalPages ?? 1)
  const currentPage: number = (data as any)?.page ?? page
  const avgProgress = students.length > 0
    ? Math.round(students.reduce((sum: number, s: any) => sum + (s.progress ?? 0), 0) / students.length)
    : 0
  const totalLabs = students.reduce((sum: number, s: any) => sum + (s.labsCompleted ?? 0), 0)
  const totalCerts = students.reduce((sum: number, s: any) => sum + (s.certCount ?? 0), 0)

  /* ----------- Export CSV across ALL pages (not just the visible 50) ----------- */
  const [exporting, setExporting] = React.useState(false)
  async function exportAllStudents() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (courseFilter !== "all") params.set("course", courseFilter)
      const all: any[] = []
      const maxPages = 40 // 40 × 50 = 2000 students hard cap
      for (let p = 1; p <= maxPages; p++) {
        params.set("page", String(p))
        const res = await fetch(`/api/admin/students?${params}`, { credentials: "include" })
        if (!res.ok) break
        const j = await res.json()
        all.push(...(j.students ?? []))
        if (p >= (j.totalPages ?? 1)) break
      }
      if (all.length === 0) {
        toast.info("Nothing to export")
        return
      }
      downloadCsv(`students-${todayISO()}.csv`, all as unknown as ReportRow[])
    } finally {
      setExporting(false)
    }
  }

  /* ----------- Report handlers ----------- */
  function openReportDialog() {
    setReportError(null)
    setReportData(null)
    setReportOpen(true)
  }

  async function handleGenerateReport() {
    setReportLoading(true)
    setReportError(null)
    try {
      const params = new URLSearchParams({
        type: reportType,
        from: new Date(reportFrom).toISOString(),
        to: new Date(reportTo).toISOString(),
      })
      if (institutionFilter) params.set("institutionId", institutionFilter)
      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        credentials: "include",
      })
      const j = await res.json()
      if (!res.ok) {
        setReportError(j.error || "Failed to generate report")
        return
      }
      setReportData(j as ReportResponse)
      toast.success(`Generated ${reportType} report - ${j.rows?.length ?? 0} rows`)
    } catch (err) {
      setReportError((err as Error)?.message || "Network error")
    } finally {
      setReportLoading(false)
    }
  }

  function handleDownloadCsv() {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("No data to export")
      return
    }
    const ts = new Date().toISOString().slice(0, 10)
    downloadCsv(`${reportType}-report-${ts}.csv`, reportData.rows)
  }

  /* ----------- Report table columns (derived from rows[0] keys) ----------- */
  const reportColumns = reportData && reportData.rows.length > 0
    ? Object.keys(reportData.rows[0])
    : []

  /* ----------- Report summary chips ----------- */
  function renderSummary() {
    if (!reportData) return null
    const d = reportData
    const chips: { label: string; value: string | number }[] = []
    if (d.type === "enrollment") {
      chips.push({ label: "Total Enrollments", value: d.totalEnrollments as number })
    } else if (d.type === "attendance") {
      chips.push({ label: "Total Records", value: d.totalRecords as number })
      chips.push({ label: "Attendance Rate", value: `${d.attendanceRate}%` })
    } else if (d.type === "completion") {
      chips.push({ label: "Total Certificates", value: d.totalCertificates as number })
      chips.push({ label: "Completion Rate", value: `${d.completionRate}%` })
    } else if (d.type === "revenue") {
      chips.push({ label: "Total Revenue", value: `₹${Number(d.totalRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` })
      chips.push({ label: "Total Orders", value: d.totalOrders as number })
      chips.push({ label: "Avg Order Value", value: `₹${d.avgOrderValue}` })
    }
    if (d.institutionName) {
      chips.unshift({ label: "Institution", value: d.institutionName })
    }
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {chips.map((c, i) => (
          <div key={i} className="px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 text-xs">
            <span className="text-muted-foreground uppercase tracking-wider mr-1.5">{c.label}:</span>
            <span className="font-semibold">{c.value}</span>
          </div>
        ))}
      </div>
    )
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
              <TrendingUp className="h-5 w-5 text-emerald-400" /> Student Progress Overview
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openReportDialog}>
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Generate Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportAllStudents}
              disabled={exporting}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: totalStudents, icon: Users, color: "text-violet-300", tint: "bg-violet-500/10" },
            { label: "Avg Course Progress", value: `${avgProgress}%`, icon: BookOpen, color: "text-cyan-300", tint: "bg-cyan-500/10" },
            { label: "Labs Completed", value: totalLabs, icon: FlaskConical, color: "text-amber-300", tint: "bg-amber-500/10" },
            { label: "Certificates Issued", value: totalCerts, icon: Award, color: "text-emerald-300", tint: "bg-emerald-500/10" },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("inline-flex p-2 rounded-lg", s.tint)}><s.icon className={cn("h-4 w-4", s.color)} /></div>
                <div><div className="text-2xl font-bold">{s.value}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search students..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Select
            value={courseFilter}
            onValueChange={(v) => {
              setCourseFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.shortName} - {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Student table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Courses</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Labs</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">XP</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progress</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No students found.</td></tr>
                ) : (
                  students.map((s: any) => (
                    <tr key={s.id} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{s.enrollments ?? 0}</td>
                      <td className="py-3 px-4 text-sm">{s.labsCompleted ?? 0}</td>
                      <td className="py-3 px-4 text-sm font-mono">{s.xp ?? 0}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className="text-[9px]">Lvl {s.level ?? 1}</Badge></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${s.progress ?? 0}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{s.progress ?? 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages} · {totalStudents} students
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ============== Generate Report Dialog ============== */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-400" /> Generate Institution Report
            </DialogTitle>
            <DialogDescription>
              Pull aggregated data for enrollment, attendance, completion, or revenue across a date range.
              Results show in a table you can export as CSV.
            </DialogDescription>
          </DialogHeader>

          {/* Form controls */}
          <div className="grid sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-type" className="text-xs uppercase tracking-wider text-muted-foreground">Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger id="report-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      <span className="flex items-center gap-2">
                        <rt.icon className="h-3.5 w-3.5" /> {rt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-institution" className="text-xs uppercase tracking-wider text-muted-foreground">
                Institution (optional)
              </Label>
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger id="report-institution">
                  <SelectValue placeholder="All institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All institutions</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schools.length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  <Building2 className="inline h-3 w-3 mr-1" />
                  No institution filter available - reports will cover all students.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-from" className="text-xs uppercase tracking-wider text-muted-foreground">From Date</Label>
              <Input id="report-from" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-to" className="text-xs uppercase tracking-wider text-muted-foreground">To Date</Label>
              <Input id="report-to" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap py-2">
            <Button onClick={handleGenerateReport} disabled={reportLoading}>
              {reportLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><BarChart3 className="h-4 w-4 mr-2" /> Generate</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadCsv}
              disabled={!reportData || reportData.rows.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Download CSV
            </Button>
            {reportData && (
              <Badge variant="outline" className="ml-auto">
                {reportData.rows.length} rows · {new Date(reportData.from).toLocaleDateString()} → {new Date(reportData.to).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Error */}
          {reportError && (
            <div className="px-4 py-3 rounded-lg border border-rose-500/30 bg-rose-500/5 text-sm text-rose-300 flex items-start gap-2">
              <X className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{reportError}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {reportLoading && !reportData && (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          {/* Summary chips */}
          {reportData && renderSummary()}

          {/* Results table */}
          {reportData && reportData.rows.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[40vh] overflow-y-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left">
                      {reportColumns.map((col) => (
                        <th key={col} className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {col.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.slice(0, 200).map((row, ri) => (
                      <tr key={ri} className="border-t border-border/40 hover:bg-muted/20">
                        {reportColumns.map((col) => {
                          const v = row[col]
                          const display = typeof v === "boolean"
                            ? (v ? "✓" : " - ")
                            : v === null || v === undefined
                              ? " - "
                              : col.toLowerCase().includes("date") || col.toLowerCase().endsWith("at")
                                ? new Date(String(v)).toLocaleDateString()
                                : col.toLowerCase().includes("amount") || col.toLowerCase().includes("revenue") || col.toLowerCase() === "finalamount" || col.toLowerCase() === "discount"
                                  ? `₹${Number(v).toFixed(2)}`
                                  : String(v)
                          return (
                            <td key={col} className="py-2.5 px-4 text-xs whitespace-nowrap">
                              {display}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportData.rows.length > 200 && (
                <div className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border/40">
                  Showing first 200 rows · Download CSV for the full {reportData.rows.length} rows.
                </div>
              )}
            </Card>
          )}

          {/* Empty state */}
          {reportData && reportData.rows.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No data found for the selected filters. Try a different date range or report type.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
