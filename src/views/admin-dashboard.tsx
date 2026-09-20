"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { useAppStore } from "@/store/app-store"
import { colorFor, DIFFICULTY_COLORS, LEVEL_COLORS } from "@/lib/colors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts"
import {
  Shield, Users, BookOpen, FlaskConical, Award, Radio, Mail, Settings,
  TrendingUp, Activity, DollarSign, Crown, Lock, Search, Plus, Pencil,
  Trash2, Save, X, ChevronLeft, ChevronRight, ShieldAlert, Sparkles,
  UserCog, GraduationCap, Building2, Send, CheckCircle2, XCircle, Clock,
  Server, Eye, Zap, ArrowUpRight, Terminal, BookMarked, FileEdit, ArrowRight, Globe,
} from "lucide-react"
import { toast } from "sonner"
import { cn, firstNameFor } from "@/lib/utils"
import {
  ScrollReveal, Stagger, StaggerItem, Counter, CursorGlow, FadeIn,
} from "@/components/platform/motion-system"

/* ============================================================
   Admin Console - Premium Command Center
   Amber accent (admin) + violet primary + editorial design.
   ============================================================ */

const ADMIN_TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "labs", label: "Labs", icon: FlaskConical },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "content", label: "Content", icon: FileEdit },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type AdminTab = typeof ADMIN_TABS[number]["id"]

const ROLE_BADGES: Record<string, { label: string; classes: string }> = {
  ADMIN: { label: "Admin", classes: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  INSTRUCTOR: { label: "Instructor", classes: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
  SCHOOL_ADMIN: { label: "School Admin", classes: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  STUDENT: { label: "Student", classes: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
}

const COURSE_CATEGORIES = ["Ethical Hacking", "Networking", "Web Security", "System Administration", "Security Management", "Identity & Access", "Cloud Security"]
const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced"]
const COURSE_COLORS_LIST = ["emerald", "cyan", "teal", "violet", "amber", "orange", "red"]
const LAB_CATEGORIES = ["Web Security", "Network", "Privilege Escalation", "Cryptography", "Forensics", "Reverse Engineering"]
const LAB_DIFFICULTIES = ["Easy", "Medium", "Hard", "Insane"]
const LAB_COLORS_LIST = ["emerald", "cyan", "teal", "violet", "amber", "orange", "red"]

interface OverviewData {
  totals: {
    users: number
    roles: Record<string, number>
    courses: number
    labs: number
    certificates: number
    liveSessions: number
    enrollments: number
    completedEnrollments: number
    revenue: number
  }
  recentSignups: { id: string; name: string; email: string; role: string; avatar: string | null; createdAt: string }[]
  growth: { month: string; enrollments: number }[]
  activeLabs: {
    id: string; status: string; startedAt: string | null; updatedAt: string
    lab: { id: string; title: string; slug: string; difficulty: string; category: string; color: string }
    user: { id: string; name: string; avatar: string | null }
  }[]
}

interface AdminUser {
  id: string; email: string; name: string; role: string; avatar: string | null
  title: string | null; bio: string | null; xp: number; level: number; streak: number
  createdAt: string
  enrollmentCount: number; certificateCount: number; labProgressCount: number; taughtCoursesCount: number
}

interface AdminCourse {
  id: string; slug: string; title: string; shortName: string; description: string
  longDescription: string; category: string; level: string; durationHours: number; price: number
  rating: number; studentsCount: number; thumbnail: string | null; color: string
  tags: string; certBody: string | null; published: boolean; createdAt: string; updatedAt: string
  instructor: { id: string; name: string; title: string | null }
  moduleCount: number; lessonCount: number; labCount: number; enrollmentCount: number
}

interface AdminLab {
  id: string; title: string; slug: string; description: string; longDescription: string
  category: string; difficulty: string; durationMin: number; points: number
  tags: string; scenario: string; objectives: string; hints: string; flag: string
  commands: string; virtualEnv: string; color: string; published: boolean
  autoGrade: boolean; xpReward: number; passingScore: number; createdAt: string
  course: { id: string; title: string; shortName: string } | null
  progressCount: number; inProgressCount: number; completedCount: number; notStartedCount: number
}

interface AdminCert {
  id: string; certificateId: string; issuedAt: string; score: number
  user: { id: string; name: string; email: string; avatar: string | null }
  course: { id: string; title: string; shortName: string; certBody: string | null }
}

interface EmailLog {
  id: string; toEmail: string; subject: string; type: string; status: string; sentAt: string
  user: { id: string; name: string; email: string } | null
}

export function AdminDashboardView() {
  const { user, isLoading } = useUser()
  const [tab, setTab] = React.useState<AdminTab>("overview")

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
      </div>
    )
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return <AccessDenied />
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-violet-600/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <AdminHero />

        <ScrollReveal delay={0.2}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)} className="mt-10">
            <ScrollArea className="w-full">
              <TabsList className="grid w-max min-w-full grid-cols-8 h-auto bg-card/30 border border-border/60">
                {ADMIN_TABS.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="flex items-center gap-1.5 py-2.5 px-4 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-300 data-[state=active]:shadow-none"
                  >
                    <t.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden md:inline whitespace-nowrap text-xs">{t.label}</span>
                    <span className="md:hidden text-xs whitespace-nowrap">{t.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            <TabsContent value="overview" className="mt-6"><OverviewTab onGoTab={setTab} /></TabsContent>
            <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
            <TabsContent value="courses" className="mt-6"><CoursesTab /></TabsContent>
            <TabsContent value="labs" className="mt-6"><LabsTab /></TabsContent>
            <TabsContent value="certificates" className="mt-6"><CertificatesTab /></TabsContent>
            <TabsContent value="emails" className="mt-6"><EmailsTab /></TabsContent>
            <TabsContent value="content" className="mt-6"><ContentTab /></TabsContent>
            <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
          </Tabs>
        </ScrollReveal>
      </div>
    </div>
  )
}

/* ============================================================
   Access Denied - non-admin users
   ============================================================ */
function AccessDenied() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
      <FadeIn className="relative z-10 text-center max-w-md">
        <div className="inline-flex p-5 rounded-2xl border border-red-500/30 bg-red-500/10 mb-6">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>
        <div className="text-[10px] font-mono text-red-400 tracking-[0.3em] mb-3">
          ACCESS RESTRICTED · ADMIN CONSOLE
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3 text-balance">
          Admin access required
        </h1>
        <p className="text-muted-foreground mb-6">
          This area is restricted to platform administrators. If you believe this is an error, contact your system administrator.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card/40 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span className="font-mono">Insufficient permissions</span>
        </div>
      </FadeIn>
    </div>
  )
}

/* ============================================================
   AdminHero - Oversized headline
   ============================================================ */
function AdminHero() {
  const { user } = useUser()
  const { data } = useQuery<OverviewData>({
    queryKey: ["admin", "overview"],
    queryFn: () => api("/api/admin/overview"),
  })

  return (
    <div>
      <ScrollReveal>
        <div className="flex items-center gap-3 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-dot" />
          <span className="text-[10px] font-mono text-amber-300/80 tracking-[0.3em]">
            ADMIN CONSOLE · SYSTEM-WIDE CONTROL
          </span>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
          Admin{" "}
          <span className="text-gradient-premium">Console</span>
          <span className="block text-[0.4em] font-medium text-muted-foreground mt-3 tracking-normal">
            Welcome back, {firstNameFor(user?.name, "Administrator")}.
          </span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <p className="text-muted-foreground max-w-2xl mb-2">
          Full-spectrum control over users, courses, labs, certificates, and platform communications - all in one place.
        </p>
      </ScrollReveal>

      {data?.totals && (
        <ScrollReveal delay={0.3}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" /> {data.totals.users} users
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-violet-400" /> {data.totals.courses} courses
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-cyan-400" /> {data.totals.labs} labs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-emerald-400" /> {data.totals.certificates} certs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" /> ${data.totals.revenue.toLocaleString()} revenue
            </span>
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}

/* ============================================================
   1. OVERVIEW TAB - platform stats, growth, signups, active labs
   ============================================================ */
function OverviewTab({ onGoTab }: { onGoTab?: (tab: AdminTab) => void }) {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["admin", "overview"],
    queryFn: () => api("/api/admin/overview"),
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-card/30 border border-border/60 animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-card/30 border border-border/60 animate-pulse" />
          <div className="h-72 rounded-2xl bg-card/30 border border-border/60 animate-pulse" />
        </div>
      </div>
    )
  }

  const t = data.totals
  const stats = [
    { label: "Total Users", value: t.users, icon: Users, color: "text-amber-300", bg: "bg-amber-500/10" },
    { label: "Active Courses", value: t.courses, icon: BookOpen, color: "text-violet-300", bg: "bg-violet-500/10" },
    { label: "Practice Labs", value: t.labs, icon: FlaskConical, color: "text-cyan-300", bg: "bg-cyan-500/10" },
    { label: "Certificates Issued", value: t.certificates, icon: Award, color: "text-emerald-300", bg: "bg-emerald-500/10" },
    { label: "Total Enrollments", value: t.enrollments, icon: GraduationCap, color: "text-violet-300", bg: "bg-violet-500/10" },
    { label: "Completed Courses", value: t.completedEnrollments, icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-500/10" },
    { label: "Live Sessions", value: t.liveSessions, icon: Radio, color: "text-rose-300", bg: "bg-rose-500/10" },
    { label: "Platform Revenue", value: t.revenue, prefix: "$", icon: DollarSign, color: "text-amber-300", bg: "bg-amber-500/10" },
  ]

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4" staggerChildren={0.06}>
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 p-5 group hover:border-amber-500/30 transition-colors">
              <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity", s.bg)} />
              <div className="relative z-10">
                <div className={cn("inline-flex p-2 rounded-lg mb-3", s.bg)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div className="text-3xl font-bold tabular-nums">
                  <Counter value={s.value} prefix={s.prefix ?? ""} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Growth + Role breakdown */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ScrollReveal className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-card/30 p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono text-amber-300/80 tracking-[0.25em] mb-1">ENROLLMENT GROWTH</p>
                <h3 className="text-xl font-bold">Last 6 months</h3>
              </div>
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.growth} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="gradEnroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.15 85)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.7 0.15 85)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="month" stroke="oklch(0.68 0.012 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.68 0.012 260)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.1 0.008 270 / 0.95)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "oklch(0.95 0.004 270)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    stroke="oklch(0.7 0.15 85)"
                    strokeWidth={2}
                    fill="url(#gradEnroll)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollReveal>

        {/* Role breakdown */}
        <ScrollReveal delay={0.1}>
          <div className="rounded-2xl border border-border/60 bg-card/30 p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em] mb-1">USER ROLES</p>
                <h3 className="text-xl font-bold">Distribution</h3>
              </div>
              <UserCog className="h-5 w-5 text-violet-400" />
            </div>
            <div className="space-y-4">
              {[
                { role: "STUDENT", count: t.roles.STUDENT ?? 0, icon: GraduationCap, color: "text-emerald-300", bg: "bg-emerald-500/10" },
                { role: "INSTRUCTOR", count: t.roles.INSTRUCTOR ?? 0, icon: BookOpen, color: "text-violet-300", bg: "bg-violet-500/10" },
                { role: "ADMIN", count: t.roles.ADMIN ?? 0, icon: Shield, color: "text-amber-300", bg: "bg-amber-500/10" },
                { role: "SCHOOL_ADMIN", count: t.roles.SCHOOL_ADMIN ?? 0, icon: Building2, color: "text-cyan-300", bg: "bg-cyan-500/10" },
              ].map((r) => {
                const pct = t.users > 0 ? Math.round((r.count / t.users) * 100) : 0
                return (
                  <div key={r.role}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("inline-flex p-1.5 rounded", r.bg)}>
                          <r.icon className={cn("h-3.5 w-3.5", r.color)} />
                        </div>
                        <span className="text-sm font-medium capitalize">{r.role.replace("_", " ").toLowerCase()}</span>
                      </div>
                      <span className="text-sm font-mono tabular-nums">
                        {r.count} <span className="text-muted-foreground">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", r.bg.replace("/10", "/60"))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Recent signups + Active labs */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ScrollReveal>
          <div className="rounded-2xl border border-border/60 bg-card/30 p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono text-emerald-300/80 tracking-[0.25em] mb-1">RECENT SIGNUPS</p>
                <h3 className="text-xl font-bold">Last 10 users</h3>
              </div>
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {data.recentSignups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent signups.</p>
              ) : data.recentSignups.map((u) => {
                const role = ROLE_BADGES[u.role] ?? ROLE_BADGES.STUDENT
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-card text-xs font-mono">
                        {u.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", role.classes)}>
                        {role.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {onGoTab && (
              <button
                onClick={() => onGoTab("users")}
                className="mt-4 pt-3 border-t border-border/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-amber-300 transition-colors"
              >
                Manage all users <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-2xl border border-border/60 bg-card/30 p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono text-cyan-300/80 tracking-[0.25em] mb-1">ACTIVE LABS</p>
                <h3 className="text-xl font-bold">In progress now</h3>
              </div>
              <Terminal className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {data.activeLabs.length === 0 ? (
                <div className="py-8 text-center">
                  <FlaskConical className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active labs right now.</p>
                </div>
              ) : data.activeLabs.map((p) => {
                const col = colorFor(p.lab.color)
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", col.bg)}>
                      <FlaskConical className={cn("h-4 w-4", col.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.lab.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.user.name} · {p.lab.difficulty}
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-300 font-mono whitespace-nowrap inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot" />
                      Active
                    </span>
                  </div>
                )
              })}
            </div>
            {onGoTab && (
              <button
                onClick={() => onGoTab("labs")}
                className="mt-4 pt-3 border-t border-border/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-cyan-300 transition-colors"
              >
                Open lab console <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* Quick actions — one-tap access to the most-used admin areas. Fills
          the empty band at the bottom of the Overview tab with useful nav
          instead of dead space. */}
      <QuickActions />
    </div>
  )
}

/* ============================================================
   1b. QUICK ACTIONS - shortcut grid to standalone admin views
   ============================================================ */
const QUICK_ACTIONS: { label: string; description: string; icon: any; view: string; tone: string }[] = [
  { label: "Revenue Analytics", description: "Payments, orders & revenue trends", icon: DollarSign, view: "admin-revenue", tone: "text-amber-300 bg-amber-500/10" },
  { label: "Lead CRM", description: "Pipeline of inbound learner leads", icon: UserCog, view: "admin-lead-crm", tone: "text-violet-300 bg-violet-500/10" },
  { label: "Bulk Certificates", description: "Issue certificates in bulk", icon: Award, view: "admin-cert-bulk", tone: "text-emerald-300 bg-emerald-500/10" },
  { label: "Student Progress", description: "Cohort-level progress reports", icon: GraduationCap, view: "admin-student-progress", tone: "text-cyan-300 bg-cyan-500/10" },
  { label: "Audit Logs", description: "Every admin action, tracked", icon: ShieldAlert, view: "admin-audit-log", tone: "text-rose-300 bg-rose-500/10" },
  { label: "Platform Health", description: "Uptime, errors & API latency", icon: Server, view: "admin-platform-health", tone: "text-sky-300 bg-sky-500/10" },
]

function QuickActions() {
  const { navigate } = useAppStore()
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Zap className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
      </div>
      <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.05}>
        {QUICK_ACTIONS.map((a) => (
          <StaggerItem key={a.label}>
            <button
              type="button"
              onClick={() => navigate({ name: a.view as any })}
              className="w-full text-left rounded-2xl border border-border/60 bg-card/30 p-5 group hover:border-amber-500/40 hover:bg-card/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("inline-flex p-2 rounded-lg", a.tone)}>
                  <a.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <div className="font-semibold text-sm">{a.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
            </button>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

/* ============================================================
   2. USERS TAB - searchable/filterable user table
   ============================================================ */
function UsersTab() {
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("ALL")
  const [page, setPage] = React.useState(1)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null)

  const debouncedSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter])

  const { data, isLoading } = useQuery<{ users: AdminUser[]; page: number; total: number; totalPages: number }>({
    queryKey: ["admin", "users", { q: debouncedSearch, role: roleFilter, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" })
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (roleFilter !== "ALL") params.set("role", roleFilter)
      return api(`/api/admin/users?${params.toString()}`)
    },
  })

  const users = data?.users ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" /> Platform Users
          </h2>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} total · page {data?.page ?? 1} of {data?.totalPages ?? 1}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 text-amber-950 hover:bg-amber-400 btn-premium">
          <Plus className="h-4 w-4 mr-1.5" /> Add User
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 bg-card/40 border-border/60"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card/40 border-border/60">
            <SelectValue placeholder="Filter role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="STUDENT">Students</SelectItem>
            <SelectItem value="INSTRUCTOR">Instructors</SelectItem>
            <SelectItem value="SCHOOL_ADMIN">School Admins</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User rows - editorial div-based */}
      <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/60 bg-muted/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-1 text-center">Courses</div>
          <div className="col-span-1 text-center">Certs</div>
          <div className="col-span-1 text-center">Labs</div>
          <div className="col-span-2">Joined</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No users found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <Stagger staggerChildren={0.04}>
            {users.map((u) => {
              const role = ROLE_BADGES[u.role] ?? ROLE_BADGES.STUDENT
              return (
                <StaggerItem key={u.id}>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors group items-center">
                    <div className="col-span-2 md:col-span-4 flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-border shrink-0">
                        {u.avatar && <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" />}
                        <AvatarFallback className="bg-card text-xs font-mono">
                          {u.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium inline-block", role.classes)}>
                        {role.label}
                      </span>
                    </div>
                    <div className="hidden md:block md:col-span-1 text-center">
                      <span className="text-sm font-mono tabular-nums text-violet-300">{u.enrollmentCount}</span>
                    </div>
                    <div className="hidden md:block md:col-span-1 text-center">
                      <span className="text-sm font-mono tabular-nums text-emerald-300">{u.certificateCount}</span>
                    </div>
                    <div className="hidden md:block md:col-span-1 text-center">
                      <span className="text-sm font-mono tabular-nums text-cyan-300">{u.labProgressCount}</span>
                    </div>
                    <div className="hidden md:block md:col-span-2 text-xs text-muted-foreground font-mono">
                      {new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                    <div className="hidden md:flex md:col-span-1 justify-end gap-1">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(data.page - 1) * 50 + 1}–{Math.min(data.page * 50, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 font-mono">
              {data.page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editingUser && (
        <EditUserDialog user={editingUser} open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)} />
      )}
    </div>
  )
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "STUDENT" })

  const create = useMutation({
    mutationFn: () => api("/api/admin/users", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      toast.success("User created")
      setForm({ name: "", email: "", password: "", role: "STUDENT" })
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full Name</Label>
            <Input id="cu-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-pass">Password</Label>
            <Input id="cu-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="SCHOOL_ADMIN">School Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            onClick={() => create.mutate()}
            disabled={!form.name.trim() || !form.email.trim() || form.password.length < 6 || create.isPending}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            {create.isPending ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ user, open, onOpenChange }: { user: AdminUser; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    name: user.name,
    role: user.role,
    title: user.title ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ?? "",
    password: "",
  })

  const update = useMutation({
    mutationFn: () => api(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.name,
        role: form.role,
        title: form.title || null,
        bio: form.bio || null,
        avatar: form.avatar || null,
        ...(form.password ? { password: form.password } : {}),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      toast.success("User updated")
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/users/${user.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      toast.success("User deleted")
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <Avatar className="h-12 w-12 border border-border">
              {form.avatar && <img src={form.avatar} alt={form.name} className="h-full w-full object-cover" />}
              <AvatarFallback className="bg-card text-xs font-mono">
                {form.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.email}</div>
              <div className="text-xs text-muted-foreground">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  <SelectItem value="SCHOOL_ADMIN">School Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Engineer" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Avatar URL</Label>
            <Input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Reset Password (optional)</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
          </div>

          <div className="pt-2 border-t border-border mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${user.name}? This cannot be undone.`)) remove.mutate()
              }}
              disabled={remove.isPending}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete User
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================
   3. COURSES TAB - manage all courses
   ============================================================ */
function CoursesTab() {
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingCourse, setEditingCourse] = React.useState<AdminCourse | null>(null)

  const { data, isLoading } = useQuery<{ courses: AdminCourse[]; total: number }>({
    queryKey: ["admin", "courses"],
    queryFn: () => api("/api/admin/courses"),
  })

  const courses = (data?.courses ?? []).filter(
    (c) => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.shortName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-400" /> Course Catalog
          </h2>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total courses</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 text-amber-950 hover:bg-amber-400 btn-premium">
          <Plus className="h-4 w-4 mr-1.5" /> New Course
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses..."
          className="pl-9 bg-card/40 border-border/60"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-card/30 border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No courses found</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first course to get started.</p>
          <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 text-amber-950 hover:bg-amber-400">
            <Plus className="h-4 w-4 mr-1.5" /> Create Course
          </Button>
        </div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.05}>
          {courses.map((c) => (
            <StaggerItem key={c.id}>
              <AdminCourseCard course={c} onEdit={() => setEditingCourse(c)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <CreateCourseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => setCreateOpen(false)} />
      {editingCourse && (
        <EditCourseDialog course={editingCourse} open={!!editingCourse} onOpenChange={(o) => !o && setEditingCourse(null)} />
      )}
    </div>
  )
}

function AdminCourseCard({ course, onEdit }: { course: AdminCourse; onEdit: () => void }) {
  const qc = useQueryClient()
  const col = colorFor(course.color)

  const togglePublished = useMutation({
    mutationFn: () => api(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      body: JSON.stringify({ published: !course.published }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success(course.published ? "Course unpublished" : "Course published")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/courses/${course.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 overflow-hidden card-hover h-full flex flex-col">
      <div className={cn("relative h-24 bg-gradient-to-br flex items-center justify-center overflow-hidden", col.gradient)}>
        <div className="absolute inset-0 bg-grid opacity-30" />
        <span className={cn("relative font-mono font-bold text-2xl", col.text)}>{course.shortName}</span>
        <div className="absolute top-2 right-2 flex gap-1">
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", LEVEL_COLORS[course.level])}>{course.level}</span>
        </div>
        <div className="absolute bottom-2 left-2">
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full border backdrop-blur",
            course.published ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border"
          )}>
            {course.published ? "Published" : "Draft"}
          </span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{course.description}</p>
        <div className="grid grid-cols-3 gap-2 text-center mb-3 pt-3 border-t border-border">
          <div>
            <div className="text-sm font-bold text-violet-300 tabular-nums">{course.enrollmentCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Students</div>
          </div>
          <div>
            <div className="text-sm font-bold text-cyan-300 tabular-nums">{course.moduleCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Modules</div>
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-300 tabular-nums">{course.lessonCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Lessons</div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mb-3 truncate">
          By {course.instructor.name} · ${course.price}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => togglePublished.mutate()}
            title={course.published ? "Unpublish" : "Publish"}
            className={course.published ? "text-emerald-400" : "text-muted-foreground"}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={() => { if (confirm(`Delete "${course.title}"? This will remove all modules, lessons, and quizzes.`)) remove.mutate() }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete course"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CourseFormFields({ form, setForm, instructors }: { form: any; setForm: (f: any) => void; instructors: AdminUser[] }) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Course Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Certified Ethical Hacker" />
        </div>
        <div className="space-y-1.5">
          <Label>Short Name</Label>
          <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })} maxLength={6} placeholder="CEH" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COURSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Level</Label>
          <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COURSE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Duration (h)</Label>
          <Input type="number" min={1} value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Price ($)</Label>
          <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COURSE_COLORS_LIST.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Short Description</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="One-line summary" />
      </div>
      <div className="space-y-1.5">
        <Label>Full Description</Label>
        <Textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} className="min-h-[70px]" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tags (comma-sep)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="hacking, network" />
        </div>
        <div className="space-y-1.5">
          <Label>Certification Body</Label>
          <Input value={form.certBody} onChange={(e) => setForm({ ...form, certBody: e.target.value })} placeholder="EC-Council" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Instructor</Label>
        <Select value={form.instructorId} onValueChange={(v) => setForm({ ...form, instructorId: v })}>
          <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
          <SelectContent>
            {instructors.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.name} - {i.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function CreateCourseDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    title: "", shortName: "", description: "", longDescription: "",
    category: COURSE_CATEGORIES[0], level: "Beginner", durationHours: 40, price: 0,
    color: "violet", tags: "", certBody: "", instructorId: "",
  })

  // Load instructors list for the select
  const { data: instructorsData } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin", "users", { role: "INSTRUCTOR" }],
    queryFn: () => api("/api/admin/users?role=INSTRUCTOR&pageSize=50"),
    enabled: open,
  })
  // Also include admins who can teach
  const { data: adminsData } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin", "users", { role: "ADMIN" }],
    queryFn: () => api("/api/admin/users?role=ADMIN&pageSize=50"),
    enabled: open,
  })
  const instructors = [...(instructorsData?.users ?? []), ...(adminsData?.users ?? [])]

  const create = useMutation({
    mutationFn: () => api("/api/admin/courses", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      qc.invalidateQueries({ queryKey: ["courses"] })
      toast.success("Course created")
      setForm({
        title: "", shortName: "", description: "", longDescription: "",
        category: COURSE_CATEGORIES[0], level: "Beginner", durationHours: 40, price: 0,
        color: "violet", tags: "", certBody: "", instructorId: "",
      })
      onCreated()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <CourseFormFields form={form} setForm={setForm} instructors={instructors} />
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            onClick={() => create.mutate()}
            disabled={!form.title.trim() || !form.shortName.trim() || !form.instructorId || create.isPending}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            {create.isPending ? "Creating..." : "Create Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditCourseDialog({ course, open, onOpenChange }: { course: AdminCourse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    title: course.title,
    shortName: course.shortName,
    description: course.description,
    longDescription: course.longDescription,
    category: course.category,
    level: course.level,
    durationHours: course.durationHours,
    price: course.price,
    color: course.color,
    tags: course.tags,
    certBody: course.certBody ?? "",
    instructorId: course.instructor.id,
    published: course.published,
  })

  const { data: instructorsData } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin", "users", { role: "INSTRUCTOR" }],
    queryFn: () => api("/api/admin/users?role=INSTRUCTOR&pageSize=50"),
    enabled: open,
  })
  const { data: adminsData } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin", "users", { role: "ADMIN" }],
    queryFn: () => api("/api/admin/users?role=ADMIN&pageSize=50"),
    enabled: open,
  })
  const instructors = [...(instructorsData?.users ?? []), ...(adminsData?.users ?? [])]

  const update = useMutation({
    mutationFn: () => api(`/api/admin/courses/${course.id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] })
      qc.invalidateQueries({ queryKey: ["courses"] })
      toast.success("Course updated")
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/courses/${course.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      toast.success("Course deleted")
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Edit Course</span>
            <span className="text-xs font-mono text-muted-foreground">{course.shortName}</span>
          </DialogTitle>
        </DialogHeader>
        <CourseFormFields form={form} setForm={setForm} instructors={instructors} />
        <div className="flex items-center justify-between gap-3 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            <Label className="text-sm cursor-pointer">
              {form.published ? "Published (visible in catalog)" : "Draft (hidden from students)"}
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (confirm(`Delete "${course.title}"?`)) remove.mutate() }}
            disabled={remove.isPending}
            className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================
   4. LABS TAB - manage all labs
   ============================================================ */
function LabsTab() {
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingLab, setEditingLab] = React.useState<AdminLab | null>(null)

  const { data, isLoading } = useQuery<{ labs: AdminLab[]; total: number }>({
    queryKey: ["admin", "labs"],
    queryFn: () => api("/api/admin/labs"),
  })

  const labs = (data?.labs ?? []).filter(
    (l) => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-400" /> Practice Labs
          </h2>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total labs</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 text-amber-950 hover:bg-amber-400 btn-premium">
          <Plus className="h-4 w-4 mr-1.5" /> New Lab
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search labs..."
          className="pl-9 bg-card/40 border-border/60"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-card/30 border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : labs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <FlaskConical className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No labs found</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first lab to get started.</p>
          <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 text-amber-950 hover:bg-amber-400">
            <Plus className="h-4 w-4 mr-1.5" /> Create Lab
          </Button>
        </div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.05}>
          {labs.map((l) => (
            <StaggerItem key={l.id}>
              <AdminLabCard lab={l} onEdit={() => setEditingLab(l)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <CreateLabDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => setCreateOpen(false)} />
      {editingLab && (
        <EditLabDialog lab={editingLab} open={!!editingLab} onOpenChange={(o) => !o && setEditingLab(null)} />
      )}
    </div>
  )
}

function AdminLabCard({ lab, onEdit }: { lab: AdminLab; onEdit: () => void }) {
  const qc = useQueryClient()
  const col = colorFor(lab.color)

  const togglePublished = useMutation({
    mutationFn: () => api(`/api/admin/labs/${lab.id}`, {
      method: "PATCH",
      body: JSON.stringify({ published: !lab.published }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "labs"] })
      toast.success(lab.published ? "Lab unpublished" : "Lab published")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/labs/${lab.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "labs"] })
      toast.success("Lab deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 overflow-hidden card-hover h-full flex flex-col">
      <div className={cn("relative h-20 bg-gradient-to-br flex items-center justify-between px-4 overflow-hidden", col.gradient)}>
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative z-10 flex items-center gap-2">
          <FlaskConical className={cn("h-5 w-5", col.text)} />
          <span className={cn("font-mono font-bold text-lg", col.text)}>{lab.points} pts</span>
        </div>
        <span className={cn("relative z-10 text-[9px] px-1.5 py-0.5 rounded border font-mono", DIFFICULTY_COLORS[lab.difficulty])}>
          {lab.difficulty}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm line-clamp-1 flex-1">{lab.title}</h3>
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full border shrink-0",
            lab.published ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border"
          )}>
            {lab.published ? "Live" : "Draft"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{lab.description}</p>
        <div className="grid grid-cols-3 gap-2 text-center mb-3 pt-3 border-t border-border">
          <div>
            <div className="text-sm font-bold text-cyan-300 tabular-nums">{lab.inProgressCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Active</div>
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-300 tabular-nums">{lab.completedCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Done</div>
          </div>
          <div>
            <div className="text-sm font-bold text-amber-300 tabular-nums">{lab.xpReward}</div>
            <div className="text-[9px] text-muted-foreground uppercase">XP</div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mb-3 truncate">
          {lab.category} · {lab.durationMin}min
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => togglePublished.mutate()}
            className={lab.published ? "text-emerald-400" : "text-muted-foreground"}
            title={lab.published ? "Unpublish" : "Publish"}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={() => { if (confirm(`Delete "${lab.title}"?`)) remove.mutate() }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete lab"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function LabFormFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Lab Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="SQL Injection Basics" />
        </div>
        <div className="space-y-1.5">
          <Label>Slug (optional)</Label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Short Description</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="One-line summary" />
      </div>
      <div className="space-y-1.5">
        <Label>Long Description</Label>
        <Textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} className="min-h-[60px]" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAB_COLORS_LIST.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input type="number" min={1} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Points</Label>
          <Input type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>XP Reward</Label>
          <Input type="number" min={0} value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Pass Score</Label>
          <Input type="number" min={0} max={100} value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tags (comma-sep)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="sqli, web, owasp" />
        </div>
        <div className="space-y-1.5">
          <Label>Virtual Env</Label>
          <Select value={form.virtualEnv} onValueChange={(v) => setForm({ ...form, virtualEnv: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="linux">Linux</SelectItem>
              <SelectItem value="windows">Windows</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="web">Web</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Scenario (markdown)</Label>
        <Textarea value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} className="min-h-[60px]" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Objectives (pipe-sep)</Label>
          <Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} className="min-h-[50px]" placeholder="obj1|obj2|obj3" />
        </div>
        <div className="space-y-1.5">
          <Label>Hints (pipe-sep)</Label>
          <Textarea value={form.hints} onChange={(e) => setForm({ ...form, hints: e.target.value })} className="min-h-[50px]" placeholder="hint1|hint2" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Flag</Label>
          <Input value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} placeholder="FLAG{...}" className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label>Available Commands (pipe-sep)</Label>
          <Input value={form.commands} onChange={(e) => setForm({ ...form, commands: e.target.value })} placeholder="ls|cat|grep" className="font-mono" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Switch checked={form.autoGrade} onCheckedChange={(v) => setForm({ ...form, autoGrade: v })} />
          <Label className="text-sm cursor-pointer">Auto-grade on flag match</Label>
        </div>
      </div>
    </div>
  )
}

function CreateLabDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    title: "", slug: "", description: "", longDescription: "",
    category: LAB_CATEGORIES[0], difficulty: "Easy", durationMin: 30, points: 100,
    tags: "", scenario: "", objectives: "", hints: "", flag: "FLAG{}",
    commands: "ls|cat|grep|find|echo", virtualEnv: "linux", color: "emerald",
    autoGrade: true, xpReward: 100, passingScore: 100,
  })

  const create = useMutation({
    mutationFn: () => api("/api/admin/labs", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "labs"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      qc.invalidateQueries({ queryKey: ["labs"] })
      toast.success("Lab created")
      setForm({
        title: "", slug: "", description: "", longDescription: "",
        category: LAB_CATEGORIES[0], difficulty: "Easy", durationMin: 30, points: 100,
        tags: "", scenario: "", objectives: "", hints: "", flag: "FLAG{}",
        commands: "ls|cat|grep|find|echo", virtualEnv: "linux", color: "emerald",
        autoGrade: true, xpReward: 100, passingScore: 100,
      })
      onCreated()
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lab</DialogTitle>
        </DialogHeader>
        <LabFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            onClick={() => create.mutate()}
            disabled={!form.title.trim() || create.isPending}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            {create.isPending ? "Creating..." : "Create Lab"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditLabDialog({ lab, open, onOpenChange }: { lab: AdminLab; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({
    title: lab.title,
    slug: lab.slug,
    description: lab.description,
    longDescription: lab.longDescription,
    category: lab.category,
    difficulty: lab.difficulty,
    durationMin: lab.durationMin,
    points: lab.points,
    tags: lab.tags,
    scenario: lab.scenario,
    objectives: lab.objectives,
    hints: lab.hints,
    flag: lab.flag,
    commands: lab.commands,
    virtualEnv: lab.virtualEnv,
    color: lab.color,
    autoGrade: lab.autoGrade,
    xpReward: lab.xpReward,
    passingScore: lab.passingScore,
    published: lab.published,
  })

  const update = useMutation({
    mutationFn: () => api(`/api/admin/labs/${lab.id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "labs"] })
      qc.invalidateQueries({ queryKey: ["labs"] })
      toast.success("Lab updated")
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/labs/${lab.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "labs"] })
      qc.invalidateQueries({ queryKey: ["admin", "overview"] })
      toast.success("Lab deleted")
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Edit Lab</span>
            <span className="text-xs font-mono text-muted-foreground">{lab.slug}</span>
          </DialogTitle>
        </DialogHeader>
        <LabFormFields form={form} setForm={setForm} />
        <div className="flex items-center justify-between gap-3 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            <Label className="text-sm cursor-pointer">
              {form.published ? "Published (visible to students)" : "Draft (hidden)"}
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (confirm(`Delete "${lab.title}"?`)) remove.mutate() }}
            disabled={remove.isPending}
            className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================
   5. CERTIFICATES TAB - list all certificates
   ============================================================ */
function CertificatesTab() {
  const [page, setPage] = React.useState(1)
  const { data, isLoading } = useQuery<{ certificates: AdminCert[]; page: number; total: number; totalPages: number }>({
    queryKey: ["admin", "certificates", page],
    queryFn: () => api(`/api/admin/certificates?page=${page}&pageSize=50`),
  })

  const certs = data?.certificates ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-400" /> Issued Certificates
        </h2>
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} total certificates issued across the platform
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/60 bg-muted/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Recipient</div>
          <div className="col-span-4">Course</div>
          <div className="col-span-2">Certificate ID</div>
          <div className="col-span-1 text-center">Score</div>
          <div className="col-span-2">Issued</div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : certs.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No certificates issued yet</p>
            <p className="text-sm text-muted-foreground">Certificates will appear here once students complete courses.</p>
          </div>
        ) : (
          <Stagger staggerChildren={0.04}>
            {certs.map((c) => (
              <StaggerItem key={c.id}>
                <div className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors items-center">
                  <div className="col-span-2 md:col-span-3 flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 border border-border shrink-0">
                      {c.user.avatar && <img src={c.user.avatar} alt={c.user.name} className="h-full w-full object-cover" />}
                      <AvatarFallback className="bg-card text-xs font-mono">
                        {c.user.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.user.email}</div>
                    </div>
                  </div>
                  <div className="md:col-span-4 min-w-0">
                    <div className="text-sm font-medium truncate">{c.course.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.course.shortName}{c.course.certBody ? ` · ${c.course.certBody}` : ""}</div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-mono text-amber-300/80 truncate block">{c.certificateId}</span>
                  </div>
                  <div className="md:col-span-1 text-center">
                    <span className="text-sm font-mono tabular-nums text-emerald-300">{c.score}%</span>
                  </div>
                  <div className="hidden md:block md:col-span-2 text-xs text-muted-foreground font-mono">
                    {new Date(c.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={data.page >= data.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   6.5. CONTENT TAB - links to the Content Studio (CMS)
   ============================================================ */
function ContentTab() {
  const { navigate } = useAppStore()
  const pages = [
    { id: "home",         label: "Home Page",             desc: "Hero, audiences, courses, labs, partners, final CTA",         icon: BookMarked,    accent: "text-violet-300" },
    { id: "impact",       label: "Impact Page",           desc: "Stats, career outcomes, success stories, partner counts",    icon: TrendingUp,    accent: "text-amber-300" },
    { id: "contact",      label: "Contact Page",          desc: "Contact info, form labels, response times, FAQ",             icon: Mail,          accent: "text-cyan-300" },
    { id: "institutions", label: "Institutions Page",     desc: "Partner types, benefits, flow steps, partnership models",    icon: Building2,     accent: "text-emerald-300" },
    { id: "catalog",      label: "Catalog Page",          desc: "Hero copy, filter labels, stat cards",                       icon: BookOpen,      accent: "text-violet-300" },
    { id: "auth",         label: "Auth Screen",           desc: "Login/register tabs, feature highlights, demo accounts",     icon: Shield,        accent: "text-amber-300" },
    { id: "global",       label: "Global Header/Footer",  desc: "Brand name, nav links, footer links, copyright",             icon: Globe,         accent: "text-cyan-300" },
  ]
  return (
    <div className="space-y-6">
      <FadeIn>
        <Card className="bg-card shadow-lg border border-border p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-violet-500/8 blur-[100px] rounded-full" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
                <span className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em]">CONTENT STUDIO</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Edit every word your users see.</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                The Content Studio lets you edit hero copy, stats, card arrays, FAQs, and more -
                all stored in Postgres and live on every page instantly.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate({ name: "cms" })}
              className="bg-violet-600 hover:bg-violet-500 btn-premium h-12 px-6"
            >
              <FileEdit className="h-4 w-4 mr-2" /> Open Content Studio
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </FadeIn>

      <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.06}>
        {pages.map((p) => (
          <StaggerItem key={p.id}>
            <button
              onClick={() => navigate({ name: "cms" })}
              className="group w-full text-left h-full rounded-xl border border-border/60 bg-card shadow-md p-5 transition-all hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("inline-flex p-2 rounded-lg bg-muted/40", p.accent)}>
                  <p.icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-300 transition-colors" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5 group-hover:text-violet-300 transition-colors">
                {p.label}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </button>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

/* ============================================================
   6. EMAILS TAB - email log viewer
   ============================================================ */
function EmailsTab() {
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [page, setPage] = React.useState(1)

  const params = new URLSearchParams({ page: String(page), pageSize: "50" })
  if (statusFilter !== "ALL") params.set("status", statusFilter)
  if (typeFilter !== "ALL") params.set("type", typeFilter)

  const { data, isLoading } = useQuery<{ logs: EmailLog[]; page: number; total: number; totalPages: number }>({
    queryKey: ["admin", "emails", { statusFilter, typeFilter, page }],
    queryFn: () => api(`/api/admin/emails?${params.toString()}`),
  })

  const logs = data?.logs ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mail className="h-5 w-5 text-amber-400" /> Email Logs
        </h2>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} total emails sent</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40 bg-card/40 border-border/60">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48 bg-card/40 border-border/60">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
            <SelectItem value="certificate">Certificate</SelectItem>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="welcome">Welcome</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/20 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/60 bg-muted/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Recipient</div>
          <div className="col-span-5">Subject</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Sent</div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No emails found</p>
            <p className="text-sm text-muted-foreground">Email logs will appear here when notifications are sent.</p>
          </div>
        ) : (
          <Stagger staggerChildren={0.04}>
            {logs.map((l) => {
              const sent = l.status === "sent"
              const failed = l.status === "failed"
              return (
                <StaggerItem key={l.id}>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors items-center">
                    <div className="col-span-2 md:col-span-3 min-w-0">
                      <div className="text-sm font-medium truncate">{l.user?.name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.toEmail}</div>
                    </div>
                    <div className="md:col-span-5 min-w-0">
                      <div className="text-sm truncate">{l.subject}</div>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{l.type}</span>
                    </div>
                    <div className="md:col-span-1">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        sent ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                        failed ? "bg-red-500/10 text-red-300 border-red-500/30" :
                        "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      )}>
                        {sent ? <CheckCircle2 className="h-3 w-3" /> : failed ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {l.status}
                      </span>
                    </div>
                    <div className="hidden md:block md:col-span-1 text-xs text-muted-foreground font-mono">
                      {new Date(l.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} total
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={data.page >= data.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   7. SETTINGS TAB - platform settings placeholder
   ============================================================ */
function SettingsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-400" /> Platform Settings
        </h2>
        <p className="text-sm text-muted-foreground">Configure global platform behavior.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <CursorGlow className="rounded-2xl border border-border/60 bg-card/30 p-6 group" color="oklch(0.7 0.15 85 / 0.06)">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex p-2 rounded-lg bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold">Security Policy</h3>
                <p className="text-xs text-muted-foreground">Authentication & session rules</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Require email verification</Label>
                <Switch defaultChecked={false} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Enforce 2FA for admins</Label>
                <Switch defaultChecked={false} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Auto-suspend on 5 failed logins</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CursorGlow>

        <CursorGlow className="rounded-2xl border border-border/60 bg-card/30 p-6 group" color="oklch(0.6 0.2 295 / 0.06)">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex p-2 rounded-lg bg-violet-500/10">
                <Send className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold">Email Notifications</h3>
                <p className="text-xs text-muted-foreground">Outbound email policy</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Welcome email on signup</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Certificate issuance email</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Weekly progress digest</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CursorGlow>

        <CursorGlow className="rounded-2xl border border-border/60 bg-card/30 p-6 group" color="oklch(0.7 0.15 155 / 0.06)">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex p-2 rounded-lg bg-emerald-500/10">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Gamification</h3>
                <p className="text-xs text-muted-foreground">XP, levels, achievements</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Award XP on lesson complete</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Daily streak tracking</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">Leaderboard public</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CursorGlow>

        <CursorGlow className="rounded-2xl border border-border/60 bg-card/30 p-6 group" color="oklch(0.65 0.12 200 / 0.06)">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex p-2 rounded-lg bg-cyan-500/10">
                <Server className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold">System Status</h3>
                <p className="text-xs text-muted-foreground">Live services overview</p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Web server</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-mono text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> OPERATIONAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-mono text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> OPERATIONAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">WebRTC signaling</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-mono text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> OPERATIONAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email service</span>
                <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> STUB MODE
                </span>
              </div>
            </div>
          </div>
        </CursorGlow>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <BookMarked className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Additional platform settings (theme defaults, course pricing tiers, integration keys, backup schedule) will be added in a future release.
        </p>
      </div>
    </div>
  )
}
