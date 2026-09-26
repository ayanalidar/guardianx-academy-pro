"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Shield,
  LogIn,
  UserPlus,
  LogOut,
  GraduationCap,
  Award,
  FlaskConical,
  Calendar,
  TrendingUp,
  Flame,
  Zap,
  BookOpen,
  Activity,
  CheckCircle2,
  Clock,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Token persistence (localStorage)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "guardianx-parent-token"

function readToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}
function writeToken(t: string | null) {
  if (typeof window === "undefined") return
  if (t) window.localStorage.setItem(TOKEN_KEY, t)
  else window.localStorage.removeItem(TOKEN_KEY)
}

/** Authenticated parent-API helper - attaches the parent token header. */
async function parentApi<T = any>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const token = options?.token ?? readToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-parent-token": token } : {}),
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  })
  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // A proxy/CDN error page (HTML) or corrupted body must surface as a
      // clean Request failed error, never a raw SyntaxError.
      throw new Error(res.ok ? "Invalid response from server" : `Request failed: ${res.status}`)
    }
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`)
  }
  return data as T
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function ParentPortalView() {
  const [token, setToken] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setToken(readToken())
    setHydrated(true)
  }, [])

  const logout = React.useCallback(() => {
    writeToken(null)
    setToken(null)
    toast.success("Signed out of parent portal")
  }, [])

  const onLogin = React.useCallback((t: string) => {
    writeToken(t)
    setToken(t)
  }, [])

  if (!hydrated) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!token) {
    return <AuthScreen onLogin={onLogin} />
  }

  return <PortalShell token={token} onLogout={logout} />
}

// ---------------------------------------------------------------------------
// Auth screen (login + register)
// ---------------------------------------------------------------------------
function AuthScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [mode, setMode] = React.useState<"login" | "register">("login")

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div
        className="glow-orb h-72 w-72 bg-violet-600/30"
        style={{ top: "-10%", right: "-5%" }}
      />
      <div
        className="glow-orb h-64 w-64 bg-fuchsia-600/20"
        style={{ bottom: "-5%", left: "-5%" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-mono mb-4">
            <Shield className="h-3 w-3" /> GUARDIANX · PARENT PORTAL
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-premium">
            Stay close to their journey
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
            Track your student&apos;s course progress, certificates, lab
            completions, and attendance - all in real time.
          </p>
        </div>

        <Card className="bg-card shadow-lg border-violet-500/20 overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setMode("login")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                mode === "login"
                  ? "text-violet-400 bg-violet-500/5 border-b-2 border-violet-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                mode === "register"
                  ? "text-violet-400 bg-violet-500/5 border-b-2 border-violet-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              <UserPlus className="h-4 w-4" /> Register
            </button>
          </div>

          <div className="p-6">
            {mode === "login" ? (
              <LoginForm onLogin={onLogin} />
            ) : (
              <RegisterForm onLogin={onLogin} />
            )}
          </div>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground mt-4 leading-relaxed">
          Parents link to an existing GuardianX student account by the
          student&apos;s registered email. Students must sign up on GuardianX
          first.
        </p>
      </div>
    </div>
  )
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const mutation = useMutation({
    mutationFn: () =>
      api<{ token: string }>("/api/parent", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (data) => {
      toast.success("Welcome back to the Parent Portal")
      onLogin(data.token)
    },
    onError: (e: any) => toast.error(e.message || "Login failed"),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="pp-email" className="text-xs uppercase tracking-wider text-muted-foreground">
          Parent Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="pp-email"
            type="email"
            placeholder="you@example.com"
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="pp-pass"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="pp-pass"
            type="password"
            placeholder="••••••••"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
      >
        {mutation.isPending ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Signing in…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4 mr-2" /> Sign In to Portal
          </>
        )}
      </Button>
    </form>
  )
}

function RegisterForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    studentEmail: "",
    relationship: "parent" as "parent" | "guardian",
  })

  const mutation = useMutation({
    mutationFn: () =>
      api<{ token: string }>("/api/parent/register", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: (data) => {
      toast.success("Parent account created - welcome!")
      onLogin(data.token)
    },
    onError: (e: any) => toast.error(e.message || "Registration failed"),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
      className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Your Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Jane Doe"
              className="pl-9"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Email
          </Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Phone (optional)
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="+1 555 0100"
              className="pl-9"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2 col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Password
          </Label>
          <Input
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Student&apos;s GuardianX Email
          </Label>
          <Input
            type="email"
            placeholder="student@example.com"
            value={form.studentEmail}
            onChange={(e) => setForm({ ...form, studentEmail: e.target.value })}
            required
          />
          <p className="text-[10px] text-muted-foreground">
            Must match the email your student used to register on GuardianX.
          </p>
        </div>
        <div className="space-y-2 col-span-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Relationship
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["parent", "guardian"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, relationship: r })}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm capitalize transition-colors",
                  form.relationship === r
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-border text-muted-foreground hover:bg-accent/30"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
      >
        {mutation.isPending ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating account…
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" /> Create Parent Account
          </>
        )}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Portal shell - once authenticated
// ---------------------------------------------------------------------------
function PortalShell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["parent-portal", token],
    queryFn: () => parentApi("/api/parent", { token }),
    refetchInterval: 30_000,
  })

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center border-rose-500/30 bg-card shadow-lg">
          <Shield className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <p className="font-semibold mb-1">Session expired or invalid</p>
          <p className="text-sm text-muted-foreground mb-4">
            {(error as Error)?.message ?? "Please sign in again."}
          </p>
          <Button onClick={onLogout} variant="outline">
            Back to sign in
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return <Dashboard data={data} onLogout={onLogout} onRefresh={() => refetch()} />
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({
  data,
  onLogout,
  onRefresh,
}: {
  data: any
  onLogout: () => void
  onRefresh: () => void
}) {
  const { parent, student, stats, courses, certificates, labs, attendance, activities } = data

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-card to-card p-6 lg:p-8 scanlines">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div
          className="glow-orb h-48 w-48 bg-violet-600/30"
          style={{ top: "-20%", right: "-5%" }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-mono">
              <Shield className="h-3 w-3" /> PARENT PORTAL ·{" "}
              {parent.relationship?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Welcome, <span className="text-gradient-premium">{parent.name?.split(" ")[0]}</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitoring progress for{" "}
                <span className="text-violet-300 font-medium">{student.name}</span>{" "}
                · Joined{" "}
                {new Date(student.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onRefresh}
              size="sm"
              variant="outline"
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <Button
              onClick={onLogout}
              size="sm"
              variant="outline"
              className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Student banner */}
      <Card className="bg-card shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-violet-500/30">
          <AvatarImage src={student.avatar || undefined} />
          <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xl font-bold">
            {student.name
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{student.name}</h2>
            <Badge variant="outline" className="text-violet-400 border-violet-500/30">
              {student.title || "Student"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
          {student.bio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{student.bio}</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
          <MiniStat icon={Zap} label="Level" value={stats.level} color="text-violet-400" bg="bg-violet-500/10" />
          <MiniStat icon={Flame} label="Streak" value={`${stats.streak}d`} color="text-amber-400" bg="bg-amber-500/10" />
          <MiniStat icon={TrendingUp} label="XP" value={stats.totalXp} color="text-emerald-400" bg="bg-emerald-500/10" />
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={BookOpen}
          label="Enrolled Courses"
          value={stats.enrolledCourses}
          sub={`${stats.completedCourses} completed`}
          color="text-violet-400"
          bg="bg-violet-500/10"
        />
        <KpiCard
          icon={Award}
          label="Certificates"
          value={stats.certificatesEarned}
          sub="earned"
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <KpiCard
          icon={FlaskConical}
          label="Labs Completed"
          value={stats.labsCompleted}
          sub={`${stats.labsInProgress} in progress`}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <KpiCard
          icon={Calendar}
          label="Attendance"
          value={`${stats.attendanceRate}%`}
          sub={`${attendance.total} sessions`}
          color="text-cyan-400"
          bg="bg-cyan-500/10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="courses" className="flex items-center gap-1.5 py-2 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Courses
          </TabsTrigger>
          <TabsTrigger value="certs" className="flex items-center gap-1.5 py-2 text-xs">
            <Award className="h-3.5 w-3.5" /> Certificates
          </TabsTrigger>
          <TabsTrigger value="labs" className="flex items-center gap-1.5 py-2 text-xs">
            <FlaskConical className="h-3.5 w-3.5" /> Labs
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-1.5 py-2 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5 py-2 text-xs">
            <Activity className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          <CoursesTab courses={courses} avgProgress={stats.avgProgress} />
        </TabsContent>
        <TabsContent value="certs" className="mt-4">
          <CertificatesTab certificates={certificates} />
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
          <LabsTab labs={labs} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab attendance={attendance} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: any
  label: string
  value: any
  color: string
  bg: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-card/60 border border-border/60">
      <div className={cn("inline-flex p-1.5 rounded-md mb-1", bg)}>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>
      <div className="text-base font-bold leading-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: any
  label: string
  value: any
  sub: string
  color: string
  bg: string
}) {
  return (
    <Card className="bg-card shadow-lg p-5 relative overflow-hidden group card-hover">
      <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-50", bg)} />
      <div className="relative z-10">
        <div className={cn("inline-flex p-2 rounded-lg mb-3", bg)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>
      </div>
    </Card>
  )
}

function CoursesTab({ courses, avgProgress }: { courses: any[]; avgProgress: number }) {
  if (!courses?.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No course enrollments yet"
        sub="Your student hasn't enrolled in any courses."
      />
    )
  }
  return (
    <div className="space-y-4">
      <Card className="bg-card shadow-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-400" /> Overall Progress
          </h3>
          <span className="text-2xl font-bold text-violet-300">{avgProgress}%</span>
        </div>
        <Progress value={avgProgress} className="h-2.5 bg-muted" />
      </Card>

      <div className="grid gap-3">
        {courses.map((c: any) => (
          <Card
            key={c.enrollmentId}
            className="bg-card shadow-lg p-4 hover:border-violet-500/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center text-xs font-bold uppercase shrink-0",
                  `bg-${c.course.color || "violet"}-500/15`,
                  "text-violet-300"
                )}
              >
                {c.course.shortName?.slice(0, 3) || "CRS"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{c.course.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {c.course.category} · {c.course.level} ·{" "}
                      {c.course.moduleCount} modules
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Instructor: {c.course.instructor?.name}
                    </p>
                  </div>
                  {c.completed ? (
                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-violet-300">
                      {Math.round(c.progress)}%
                    </Badge>
                  )}
                </div>
                <Progress
                  value={c.progress}
                  className="h-1.5 bg-muted mt-3"
                />
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                  <span>
                    Enrolled {new Date(c.enrolledAt).toLocaleDateString()}
                  </span>
                  {c.lastAccessed && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last accessed{" "}
                      {new Date(c.lastAccessed).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CertificatesTab({ certificates }: { certificates: any[] }) {
  if (!certificates?.length) {
    return (
      <EmptyState
        icon={Award}
        title="No certificates earned yet"
        sub="Certificates appear here once your student completes a course."
      />
    )
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {certificates.map((cert: any) => (
        <Card
          key={cert.id}
          className="bg-card shadow-lg p-5 relative overflow-hidden card-hover"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl bg-amber-500/20" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="inline-flex p-2.5 rounded-lg bg-amber-500/15">
              <Award className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{cert.course.title}</h4>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                ID: {cert.certificateId}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-amber-300 border-amber-500/30">
                  Score: {cert.score}%
                </Badge>
                <Badge variant="outline" className="text-violet-300">
                  {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function LabsTab({ labs }: { labs: any[] }) {
  if (!labs?.length) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No lab activity yet"
        sub="Practice labs your student works on will appear here."
      />
    )
  }
  const difficultyColor: Record<string, string> = {
    Easy: "text-emerald-400 border-emerald-500/30",
    Medium: "text-amber-400 border-amber-500/30",
    Hard: "text-rose-400 border-rose-500/30",
    Insane: "text-fuchsia-400 border-fuchsia-500/30",
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {labs.map((lp: any) => (
        <Card key={lp.id} className="bg-card shadow-lg p-4 card-hover">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h4 className="font-semibold truncate">{lp.lab.title}</h4>
              <p className="text-[11px] text-muted-foreground">
                {lp.lab.category} · {lp.lab.xpReward} XP
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("text-[10px]", difficultyColor[lp.lab.difficulty] || "")}
            >
              {lp.lab.difficulty}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {lp.status === "completed" ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
              </Badge>
            ) : lp.status === "in_progress" ? (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                <Clock className="h-3 w-3 mr-1" /> In Progress
              </Badge>
            ) : (
              <Badge variant="outline">Not Started</Badge>
            )}
            {lp.flagFound && (
              <Badge variant="outline" className="text-violet-300">
                Flag captured
              </Badge>
            )}
          </div>
          {lp.completedAt && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Completed {new Date(lp.completedAt).toLocaleDateString()}
            </p>
          )}
        </Card>
      ))}
    </div>
  )
}

function AttendanceTab({ attendance }: { attendance: any }) {
  if (!attendance?.total) {
    return (
      <EmptyState
        icon={Calendar}
        title="No attendance records yet"
        sub="Attendance will appear here once sessions are recorded."
      />
    )
  }
  const segments = [
    { label: "Present", value: attendance.present, color: "bg-emerald-500" },
    { label: "Late", value: attendance.late, color: "bg-amber-500" },
    { label: "Excused", value: attendance.excused, color: "bg-cyan-500" },
    { label: "Absent", value: attendance.absent, color: "bg-rose-500" },
  ]
  return (
    <div className="space-y-4">
      <Card className="bg-card shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" /> Attendance Rate
          </h3>
          <span className="text-2xl font-bold text-cyan-300">
            {attendance.rate}%
          </span>
        </div>
        {/* Stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {segments.map((s) => (
            <div
              key={s.label}
              className={cn("h-full", s.color)}
              style={{
                width: `${attendance.total ? (s.value / attendance.total) * 100 : 0}%`,
              }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {segments.map((s) => (
            <div key={s.label} className="text-center">
              <div className={cn("h-2 w-2 rounded-full mx-auto mb-1", s.color)} />
              <div className="text-sm font-bold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-card shadow-lg p-5">
        <h4 className="font-medium mb-3 text-sm">Recent Sessions</h4>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {attendance.recent?.map((r: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/30 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground font-mono w-24">
                  {new Date(r.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {r.course?.shortName || "-"} · {r.sessionType}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] capitalize",
                  r.status === "present" && "text-emerald-400 border-emerald-500/30",
                  r.status === "late" && "text-amber-400 border-amber-500/30",
                  r.status === "absent" && "text-rose-400 border-rose-500/30",
                  r.status === "excused" && "text-cyan-400 border-cyan-500/30"
                )}
              >
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ActivityTab({ activities }: { activities: any[] }) {
  if (!activities?.length) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity"
        sub="Your student's learning activity will appear here."
      />
    )
  }
  const typeMeta: Record<string, { label: string; icon: any; color: string }> = {
    lesson_completed: { label: "Completed a lesson", icon: CheckCircle2, color: "text-emerald-400" },
    lab_solved: { label: "Solved a lab", icon: FlaskConical, color: "text-violet-400" },
    quiz_passed: { label: "Passed a quiz", icon: CheckCircle2, color: "text-cyan-400" },
    note_created: { label: "Created a note", icon: BookOpen, color: "text-amber-400" },
    course_enrolled: { label: "Enrolled in a course", icon: GraduationCap, color: "text-violet-400" },
    cert_earned: { label: "Earned a certificate", icon: Award, color: "text-amber-400" },
  }
  return (
    <Card className="bg-card shadow-lg p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-violet-400" /> Recent Activity
      </h3>
      <div className="relative pl-4 max-h-[28rem] overflow-y-auto pr-1">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-4">
          {activities.map((a: any, i: number) => {
            const meta = typeMeta[a.type] || {
              label: a.type.replace(/_/g, " "),
              icon: Activity,
              color: "text-muted-foreground",
            }
            const Icon = meta.icon
            return (
              <div key={a.id || i} className="relative flex items-start gap-3 stagger-item">
                <div
                  className={cn(
                    "absolute -left-4 mt-1 h-3 w-3 rounded-full border-2 border-card",
                    meta.color.replace("text-", "bg-")
                  )}
                />
                <div className="flex-1 ml-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                    <span className="text-sm font-medium capitalize">
                      {meta.label}
                    </span>
                    {a.xp > 0 && (
                      <Badge variant="outline" className="text-[9px] text-amber-300">
                        +{a.xp} XP
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(a.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {a.meta && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {a.meta}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function EmptyState({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <Card className="bg-card shadow-lg p-12 text-center border-dashed">
      <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="font-medium mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </Card>
  )
}
