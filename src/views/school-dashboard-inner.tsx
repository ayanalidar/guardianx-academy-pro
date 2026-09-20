"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts"
import {
  Building2, Users, GraduationCap, BookOpen, TrendingUp, Award, Calendar,
  UserPlus, Settings as SettingsIcon, FileText, BarChart3, ChevronRight, Search, MapPin,
  Phone, Globe, Mail, Crown, AlertTriangle, CheckCircle2, Clock, Flame,
  Trash2, Plus, X, Layers, Target, Save,
} from "lucide-react"
import { cn, firstNameFor } from "@/lib/utils"
import { toast } from "sonner"

export function SchoolDashboardInner() {
  const { user } = useUser()
  const [tab, setTab] = React.useState<"overview" | "students" | "batches" | "attendance" | "reports" | "settings">("overview")

  if (user && user.role !== "SCHOOL_ADMIN") {
    return (
      <Card className="p-12 text-center border-dashed">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">School administrator access required</p>
        <p className="text-sm text-muted-foreground">Log in via the School Portal tab.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SchoolHero />
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-1 py-2"><BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Overview</span></TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-1 py-2"><Users className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Students</span></TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-1 py-2"><Layers className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Batches</span></TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-1 py-2"><Calendar className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Attendance</span></TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1 py-2"><FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Reports</span></TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 py-2"><SettingsIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Settings</span></TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="students" className="mt-4"><StudentsTab /></TabsContent>
        <TabsContent value="batches" className="mt-4"><BatchesTab /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function SchoolHero() {
  const { user } = useUser()
  const { data, isLoading } = useQuery<any>({
    queryKey: ["school-overview"],
    queryFn: () => api("/api/school/overview"),
  })
  const school = data?.school
  const counts = data?.counts
  const statCards = [
    { label: "Students", value: counts?.totalStudents ?? 0, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Batches", value: counts?.totalBatches ?? 0, icon: Layers, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Courses", value: counts?.totalCoursesAssigned ?? 0, icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Instructors", value: counts?.totalInstructors ?? 0, icon: GraduationCap, color: "text-violet-400", bg: "bg-violet-500/10" },
  ]
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-background to-background p-6 lg:p-8 scanlines">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-mono">
              <Building2 className="h-3 w-3" /> {school?.type ?? "SCHOOL"} PORTAL · {school?.schoolCode ?? ""}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{school?.name ?? "Loading..."}</h1>
            <p className="text-muted-foreground max-w-xl">
              Welcome back, <span className="text-violet-400 font-medium">{firstNameFor(user?.name, "Administrator")}</span>. Manage your students, batches, attendance, and reports.
            </p>
          </div>
        </div>
      </div>
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-5 relative overflow-hidden group card-hover">
              <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-50", s.bg)} />
              <div className="relative z-10">
                <div className={cn("inline-flex p-2 rounded-lg mb-3", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
                <div className="text-3xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function OverviewTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["school-overview"], queryFn: () => api("/api/school/overview") })
  if (isLoading) return <div className="grid lg:grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
  if (!data) return null
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-emerald-400" /> Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-2 rounded-lg bg-emerald-500/5"><span className="text-sm">Total Students</span><b className="text-emerald-400">{data.counts.totalStudents}</b></div>
          <div className="flex justify-between p-2 rounded-lg bg-cyan-500/5"><span className="text-sm">Active (30d)</span><b className="text-cyan-400">{data.counts.activeStudents}</b></div>
          <div className="flex justify-between p-2 rounded-lg bg-violet-500/5"><span className="text-sm">Total Batches</span><b className="text-violet-400">{data.counts.totalBatches}</b></div>
          <div className="flex justify-between p-2 rounded-lg bg-amber-500/5"><span className="text-sm">Courses Assigned</span><b className="text-amber-400">{data.counts.totalCoursesAssigned}</b></div>
          <div className="flex justify-between p-2 rounded-lg bg-red-500/5"><span className="text-sm">Attendance Rate</span><b className="text-red-400">{Math.round(data.attendanceSummary.rate)}%</b></div>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-cyan-400" /> Recent Students</h3>
        {data.recentStudents?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No students yet.</div>
        ) : (
          <div className="space-y-2">
            {data.recentStudents?.slice(0, 5).map((s: any) => (
              <div key={s.userId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30">
                <Avatar className="h-7 w-7"><AvatarFallback className="bg-cyan-500/10 text-cyan-400 text-[10px]">{s.user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback></Avatar>
                <span className="text-sm flex-1 truncate">{s.user?.name}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(s.joinedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StudentsTab() {
  const [search, setSearch] = React.useState("")
  const [addOpen, setAddOpen] = React.useState(false)
  const { data, isLoading } = useQuery<any>({
    queryKey: ["school-students", search],
    queryFn: () => api(`/api/school/students${search ? "?q=" + encodeURIComponent(search) : ""}`),
  })
  const students = data?.students ?? []
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-violet-500 text-violet-950 hover:bg-violet-400"><UserPlus className="h-4 w-4 mr-1.5" /> Add</Button>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : students.length === 0 ? (
        <Card className="p-12 text-center border-dashed"><Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No students found.</p></Card>
      ) : (
        <div className="space-y-2">
          {students.map((s: any) => (
            <Card key={s.userId} className="p-3 flex items-center gap-3">
              <Avatar className="h-9 w-9"><AvatarFallback className="bg-violet-500/10 text-violet-400 text-xs">{s.user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{s.user?.name}</div><div className="text-xs text-muted-foreground truncate">{s.user?.email}</div></div>
              <Badge variant="outline" className="text-[10px] text-emerald-400">{s.user?.xp ?? 0} XP</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function BatchesTab() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const { data, isLoading } = useQuery<any>({ queryKey: ["school-batches"], queryFn: () => api("/api/school/batches") })
  const batches = data?.batches ?? []
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Batches ({batches.length})</h2>
        <Button onClick={() => setCreateOpen(true)} className="bg-violet-500 text-violet-950 hover:bg-violet-400"><Plus className="h-4 w-4 mr-1.5" /> Create</Button>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : batches.length === 0 ? (
        <Card className="p-12 text-center border-dashed"><Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No batches yet.</p></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {batches.map((b: any) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center gap-2 mb-2"><Layers className="h-4 w-4 text-violet-400" /><span className="font-medium">{b.name}</span></div>
              <div className="text-xs text-muted-foreground">{b.memberCount} students · {b.courseCount} courses</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["school-attendance"], queryFn: () => api("/api/school/attendance") })
  if (isLoading) return <Skeleton className="h-64" />
  const s = data?.summary
  return (
    <Card className="p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-4"><Calendar className="h-4 w-4 text-amber-400" /> Attendance Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-lg bg-emerald-500/5"><div className="text-2xl font-bold text-emerald-400">{s?.present ?? 0}</div><div className="text-xs text-muted-foreground">Present</div></div>
        <div className="text-center p-4 rounded-lg bg-amber-500/5"><div className="text-2xl font-bold text-amber-400">{s?.late ?? 0}</div><div className="text-xs text-muted-foreground">Late</div></div>
        <div className="text-center p-4 rounded-lg bg-red-500/5"><div className="text-2xl font-bold text-red-400">{s?.absent ?? 0}</div><div className="text-xs text-muted-foreground">Absent</div></div>
        <div className="text-center p-4 rounded-lg bg-cyan-500/5"><div className="text-2xl font-bold text-cyan-400">{Math.round(s?.rate ?? 0)}%</div><div className="text-xs text-muted-foreground">Rate</div></div>
      </div>
    </Card>
  )
}

function ReportsTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["school-reports"], queryFn: () => api("/api/school/reports") })
  if (isLoading) return <Skeleton className="h-64" />
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Crown className="h-4 w-4 text-amber-400" /> Top Performers</h3>
        {data?.topPerformers?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No data.</p> : (
          <div className="space-y-2">{data?.topPerformers?.slice(0, 5).map((p: any, i: number) => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30">
              <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">{i + 1}</div>
              <span className="text-sm flex-1 truncate">{p.name}</span>
              <Badge variant="outline" className="text-[10px] text-emerald-400">{p.xp} XP</Badge>
            </div>
          ))}</div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-red-400" /> At-Risk Students</h3>
        {data?.atRiskStudents?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">None. Everyone is on track!</p> : (
          <div className="space-y-2">{data?.atRiskStudents?.map((s: any) => (
            <div key={s.id} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex justify-between"><span className="text-sm truncate">{s.name}</span><Badge variant="outline" className="text-[9px] text-red-400">{s.reason}</Badge></div>
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  )
}

function SettingsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<any>({ queryKey: ["school-settings"], queryFn: () => api("/api/school/settings") })
  const [form, setForm] = React.useState<any>({})
  React.useEffect(() => { if (data) setForm(data) }, [data])
  const mutation = useMutation({
    mutationFn: () => api("/api/school/settings", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Settings updated"); qc.invalidateQueries({ queryKey: ["school-settings"] }) },
    onError: (e: any) => toast.error(e.message),
  })
  if (isLoading) return <Skeleton className="h-96" />
  if (!data) return null
  return (
    <Card className="p-6 max-w-2xl">
      <h3 className="font-semibold flex items-center gap-2 mb-4"><Building2 className="h-4 w-4 text-violet-400" /> Institution Settings</h3>
      <div className="space-y-3">
        <div><Label className="text-xs">Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label className="text-xs">Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div><Label className="text-xs">Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label className="text-xs">State</Label><Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div><Label className="text-xs">Country</Label><Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        </div>
        <div><Label className="text-xs">Website</Label><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
        <div><Label className="text-xs">Max Students</Label><Input type="number" value={form.maxStudents ?? 0} onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })} /></div>
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
        <span className="text-xs text-muted-foreground font-mono">Code: <b className="text-violet-400">{data.schoolCode}</b></span>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-violet-500 text-violet-950 hover:bg-violet-400"><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </Card>
  )
}
