"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  User, Mail, Shield, Award, GraduationCap, FlaskConical, StickyNote,
  Target, TrendingUp, Calendar, LogOut, Trophy, Lock, Zap, Flame,
  BookOpen, Terminal, Bug, Brain, Library, ShieldCheck, BookMarked,
  Activity, ChevronRight, ArrowUpRight, Pencil, KeyRound, Phone,
  Linkedin, Briefcase, FileEdit, DollarSign, Users, Bell, UserCheck,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useAppStore } from "@/store/app-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  ScrollReveal, TextReveal, Stagger, StaggerItem, Counter, CursorGlow,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

const ACHIEVEMENT_ICONS: Record<string, any> = {
  Award, BookOpen, GraduationCap, Terminal, FlaskConical, Bug, Brain, Target,
  StickyNote, Library, ShieldCheck, Shield, TrendingUp, Flame, Zap, Trophy, BookMarked,
}

const TIER_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  bronze: { text: "text-orange-300", bg: "bg-orange-700/10", border: "border-orange-700/40" },
  silver: { text: "text-slate-200", bg: "bg-slate-400/10", border: "border-slate-400/40" },
  gold: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/40" },
  platinum: { text: "text-cyan-200", bg: "bg-cyan-500/10", border: "border-cyan-500/40" },
}

const ACTIVITY_META: Record<string, { icon: any; color: string; label: string }> = {
  lesson_completed: { icon: BookOpen, color: "text-emerald-300", label: "Completed a lesson" },
  lab_solved: { icon: Terminal, color: "text-violet-300", label: "Solved a lab" },
  quiz_passed: { icon: Brain, color: "text-cyan-300", label: "Passed a quiz" },
  note_created: { icon: StickyNote, color: "text-amber-300", label: "Created a note" },
  course_enrolled: { icon: BookMarked, color: "text-teal-300", label: "Enrolled in a course" },
  cert_earned: { icon: Award, color: "text-orange-300", label: "Earned a certificate" },
}

// ---- Admin tool quick-links (replaces student quick-actions for ADMIN role) ----
const ADMIN_TOOLS: { label: string; icon: any; view: string; tint: string }[] = [
  { label: "Admin Console", icon: Shield, view: "admin", tint: "text-amber-300" },
  { label: "Content Studio", icon: FileEdit, view: "cms", tint: "text-violet-300" },
  { label: "Batch Calendar", icon: Calendar, view: "admin-batch-calendar", tint: "text-cyan-300" },
  { label: "Student Progress", icon: TrendingUp, view: "admin-student-progress", tint: "text-emerald-300" },
  { label: "Revenue Analytics", icon: DollarSign, view: "admin-revenue", tint: "text-emerald-300" },
  { label: "Instructor Assign", icon: Users, view: "admin-instructor-assignment", tint: "text-cyan-300" },
  { label: "Lead / CRM", icon: Users, view: "admin-lead-crm", tint: "text-violet-300" },
  { label: "Notifications", icon: Bell, view: "admin-notifications", tint: "text-amber-300" },
]

// =========================================================================
// Edit Profile Dialog
// =========================================================================
function EditProfileDialog({
  open, onOpenChange, defaults,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  defaults: {
    name: string; email: string; title: string; bio: string; phone: string; avatar: string
  }
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState(defaults)

  // Re-sync the form whenever the dialog opens (in case the underlying data changed)
  React.useEffect(() => {
    if (open) setForm(defaults)
  }, [open, defaults])

  const update = useMutation({
    mutationFn: () => api("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify(form),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
      qc.invalidateQueries({ queryKey: ["user-profile"] })
      toast.success("Profile updated")
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update profile"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Full Name</Label>
            <Input
              id="ep-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-email">Email</Label>
            <Input
              id="ep-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@guardianx.io"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-title">Title</Label>
            <Input
              id="ep-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Security Engineer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-bio">Bio</Label>
            <Textarea
              id="ep-bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A short professional bio"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-phone">Phone</Label>
            <Input
              id="ep-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 555 123 4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-avatar">Avatar URL</Label>
            <Input
              id="ep-avatar"
              value={form.avatar}
              onChange={(e) => setForm({ ...form, avatar: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =========================================================================
// Change Password Dialog
// =========================================================================
function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [localErr, setLocalErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setLocalErr(null)
    }
  }, [open])

  const validate = (): string | null => {
    if (!form.currentPassword) return "Current password is required"
    if (!form.newPassword) return "New password is required"
    if (form.newPassword !== form.confirmPassword) return "New passwords do not match"
    if (
      form.newPassword.length < 8 ||
      !/[A-Z]/.test(form.newPassword) ||
      !/[a-z]/.test(form.newPassword) ||
      !/[0-9]/.test(form.newPassword)
    ) {
      return "Password must be 8+ chars with uppercase, lowercase, and a number"
    }
    return null
  }

  const update = useMutation({
    mutationFn: () => api("/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
      toast.success("Password changed")
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || "Failed to change password"),
  })

  const onSubmit = () => {
    const err = validate()
    if (err) {
      setLocalErr(err)
      return
    }
    setLocalErr(null)
    update.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Current Password</Label>
            <Input
              id="cp-current"
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New Password</Label>
            <Input
              id="cp-new"
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="8+ chars, upper, lower, number"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm New Password</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
            />
          </div>
          {localErr && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-2 py-1.5">
              {localErr}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground font-mono">
            PASSWORD POLICY · 8+ chars · uppercase · lowercase · number
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={update.isPending}>
            {update.isPending ? "Updating..." : "Change Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =========================================================================
// Main ProfileView
// =========================================================================
export function ProfileView() {
  const { user, stats, gamification, isLoading } = useUser()
  const { navigate } = useAppStore()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pwdOpen, setPwdOpen] = React.useState(false)

  // Extended profile (with instructorProfile relation + phone) — used to pre-fill the edit dialog
  const { data: profData } = useQuery<{
    user: {
      id: string; email: string; name: string; role: string; avatar: string | null;
      title: string | null; bio: string | null; phone: string | null;
      instructorProfile?: {
        expertise: string; yearsExperience: number; certifications: string;
        linkedinUrl: string | null; maxBatches: number; currentBatches: number
      } | null
    } | null
  }>({
    queryKey: ["user-profile"],
    queryFn: () => api("/api/user/profile"),
    enabled: !!user,
  })

  const { data: achData } = useQuery<{ achievements: any[]; earnedCount: number; totalCount: number; activities: { type: string; xp: number; date: string; createdAt: string }[] }>({
    queryKey: ["achievements"],
    queryFn: () => api("/api/achievements"),
    enabled: !!user && (user.role === "STUDENT" || user.role === "SCHOOL_ADMIN"),
  })

  // Parent-link consent requests (only meaningful for students/school roles)
  const qc = useQueryClient()
  const { data: consentData } = useQuery<{ requests: Array<{ id: string; name: string; email: string; relationship: string }> }>({
    queryKey: ["parent-consent-requests"],
    queryFn: () => api("/api/parent/consent"),
    enabled: !!user && (user.role === "STUDENT" || user.role === "SCHOOL_ADMIN"),
  })
  const consentMutation = useMutation({
    mutationFn: ({ parentId, action }: { parentId: string; action: "approve" | "reject" }) =>
      api("/api/parent/consent", { method: "POST", body: JSON.stringify({ parentId, action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parent-consent-requests"] }),
  })

  if (isLoading || !user) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-96 mb-8" />
          <Skeleton className="h-32 mb-8" />
        </div>
      </div>
    )
  }

  const role = user.role ?? "STUDENT"
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isInstructor = role === "INSTRUCTOR"
  const isStudentLike = role === "STUDENT" || role === "SCHOOL_ADMIN"

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const achievements = achData?.achievements ?? []
  const earned = achievements.filter((a) => a.earned).slice(0, 6)
  const activities = achData?.activities ?? []

  // Instructor profile data (parsed JSON fields)
  const instructorProfile = profData?.user?.instructorProfile ?? null
  let expertiseArr: string[] = []
  let certArr: string[] = []
  try {
    expertiseArr = instructorProfile ? JSON.parse(instructorProfile.expertise || "[]") : []
  } catch { /* keep empty */ }
  try {
    certArr = instructorProfile ? JSON.parse(instructorProfile.certifications || "[]") : []
  } catch { /* keep empty */ }

  // Pre-fill for the Edit dialog
  const editDefaults = {
    name: user.name ?? "",
    email: user.email ?? "",
    title: user.title ?? profData?.user?.title ?? "",
    bio: user.bio ?? profData?.user?.bio ?? "",
    phone: profData?.user?.phone ?? "",
    avatar: user.avatar ?? profData?.user?.avatar ?? "",
  }

  // Stats strip — 6 metrics (students only)
  const statStrip = [
    { label: "Courses", value: stats?.enrollments ?? 0, accent: "border-violet-500/50", color: "text-violet-300", icon: GraduationCap },
    { label: "Labs", value: stats?.labsDone ?? 0, accent: "border-cyan-500/50", color: "text-cyan-300", icon: FlaskConical },
    { label: "Certs", value: stats?.certificates ?? 0, accent: "border-amber-500/50", color: "text-amber-300", icon: Shield },
    { label: "XP", value: gamification?.xp ?? 0, accent: "border-emerald-500/50", color: "text-emerald-300", icon: Zap },
    { label: "Level", value: gamification?.level ?? 1, accent: "border-rose-500/50", color: "text-rose-300", icon: Trophy },
    { label: "Streak", value: gamification?.streak ?? 0, accent: "border-orange-500/50", color: "text-orange-300", icon: Flame },
  ]

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div
        className={cn(
          "absolute top-0 right-0 w-[600px] h-[500px] blur-[140px] rounded-full pointer-events-none",
          isAdmin ? "bg-amber-600/6" : isInstructor ? "bg-cyan-500/6" : "bg-violet-600/6",
        )}
      />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-cyan-500/4 blur-[120px] rounded-full pointer-events-none" />

      {/* Network viz background accent in header */}
      <div className="absolute top-0 inset-x-0 h-[500px] opacity-25 pointer-events-none overflow-hidden">
        <NetworkVisualization variant="section" className="w-full h-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - avatar + oversized name + role + edit/password buttons
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-6">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full pulse-dot",
              isAdmin ? "bg-amber-400" : isInstructor ? "bg-cyan-400" : "bg-violet-400",
            )} />
            <span className={cn(
              "text-[10px] font-mono tracking-[0.3em]",
              isAdmin ? "text-amber-300/80" : isInstructor ? "text-cyan-300/80" : "text-violet-300/80",
            )}>
              {user.role?.toUpperCase()}
              {!isAdmin && gamification ? ` · ${gamification.rank?.toUpperCase()}` : " · PLATFORM ADMIN"}
            </span>
          </div>
        </ScrollReveal>

        {/* Parent-link consent requests */}
        {isStudentLike && (consentData?.requests?.length ?? 0) > 0 && (
          <ScrollReveal>
            <Card className="p-4 mb-8 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3 mb-3">
                <UserCheck className="h-4 w-4 text-amber-300 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-200">Parent/guardian link requests</h3>
                  <p className="text-[11px] text-muted-foreground">
                    These people want to link their parent portal to your profile. Only approve if you know them.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {consentData!.requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40 bg-card/60">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{r.email} · {r.relationship}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm" variant="outline" className="h-7 text-[11px] border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                        disabled={consentMutation.isPending}
                        onClick={() => consentMutation.mutate({ parentId: r.id, action: "reject" })}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                        disabled={consentMutation.isPending}
                        onClick={() => consentMutation.mutate({ parentId: r.id, action: "approve" })}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </ScrollReveal>
        )}

        <div className="grid lg:grid-cols-12 gap-8 items-start mb-20">
          {/* Avatar + identity */}
          <div className="lg:col-span-8">
            <ScrollReveal delay={0.1}>
              <div className="flex items-start gap-6 mb-6">
                <Avatar className={cn(
                  "h-24 w-24 lg:h-32 lg:w-32 border-2 rounded-2xl shadow-[0_20px_60px_-20px]",
                  isAdmin
                    ? "border-amber-500/40 shadow-amber-500/30"
                    : isInstructor
                      ? "border-cyan-500/40 shadow-cyan-500/30"
                      : "border-violet-500/40 shadow-violet-500/30",
                )}>
                  <AvatarFallback className={cn(
                    "text-4xl lg:text-5xl font-mono font-bold rounded-2xl h-full",
                    isAdmin
                      ? "bg-amber-500/10 text-amber-200"
                      : isInstructor
                        ? "bg-cyan-500/10 text-cyan-200"
                        : "bg-violet-500/10 text-violet-200",
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 pt-2">
                  <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-2 text-balance">
                    <TextReveal text={user.name} />
                  </h1>
                  {user.title && (
                    <p className="text-base lg:text-lg text-muted-foreground mb-3">{user.title}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    {isAdmin ? (
                      <Badge className="bg-amber-500/15 text-amber-200 border border-amber-500/30 font-mono text-[10px] tracking-[0.2em]">
                        <Shield className="h-3 w-3 mr-1" /> PLATFORM ADMINISTRATOR
                      </Badge>
                    ) : isInstructor ? (
                      <Badge className="bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 font-mono text-[10px] tracking-[0.2em]">
                        <GraduationCap className="h-3 w-3 mr-1" /> INSTRUCTOR
                      </Badge>
                    ) : (
                      <Badge className="bg-violet-500/15 text-violet-200 border border-violet-500/30 font-mono text-[10px] tracking-[0.2em]">
                        {user.role?.toUpperCase()}
                      </Badge>
                    )}
                    {!isAdmin && gamification && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300 bg-emerald-500/5 font-mono">
                        <Zap className="h-3 w-3 mr-1" /> LV {gamification.level} · {gamification.rank}
                      </Badge>
                    )}
                    {!isAdmin && gamification && gamification.streak > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-300 font-mono">
                        <Flame className="h-3 w-3" fill="currentColor" /> {gamification.streak}D STREAK
                      </span>
                    )}
                  </div>

                  {/* Edit Profile + Change Password buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                      className="btn-premium"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPwdOpen(true)}
                      className="btn-premium"
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Change Password
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Email + phone */}
            <ScrollReveal delay={0.2}>
              <div className="flex items-center gap-4 flex-wrap mb-6 text-xs text-muted-foreground">
                <a href={`mailto:${user.email}`} className="inline-flex items-center gap-2 hover:text-foreground transition-colors group">
                  <Mail className="h-3.5 w-3.5 group-hover:text-violet-300 transition-colors" />
                  <span className="font-mono">{user.email}</span>
                </a>
                {profData?.user?.phone && (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="font-mono">{profData.user.phone}</span>
                  </span>
                )}
              </div>
            </ScrollReveal>

            {/* Bio */}
            {user.bio && (
              <ScrollReveal delay={0.3}>
                <div className="max-w-2xl">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-3">BIO</p>
                  <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">{user.bio}</p>
                </div>
              </ScrollReveal>
            )}
          </div>

          {/* ====================================================
              Action card — role-specific
              ==================================================== */}
          <div className="lg:col-span-4">
            <ScrollReveal delay={0.4}>
              {isAdmin ? (
                /* ADMIN: admin tool links */
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
                  <p className="text-[10px] font-mono text-amber-300 tracking-[0.3em] mb-2">
                    ADMIN CONSOLE
                  </p>
                  {ADMIN_TOOLS.map((t) => (
                    <Button
                      key={t.view}
                      variant="outline"
                      className="w-full justify-start btn-premium"
                      onClick={() => navigate({ name: t.view } as any)}
                    >
                      <t.icon className={cn("h-4 w-4 mr-2", t.tint)} /> {t.label}
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                  ))}
                  <div className="pt-2 mt-2 border-t border-amber-500/20">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-rose-300" onClick={() => signOut()}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                  </div>
                </div>
              ) : isInstructor ? (
                /* INSTRUCTOR: instructor info card */
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-3">
                  <p className="text-[10px] font-mono text-cyan-300 tracking-[0.3em] mb-2">
                    INSTRUCTOR DASHBOARD
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl border border-cyan-500/20 bg-card/30 p-3">
                      <div className="text-2xl font-bold text-cyan-200">
                        {instructorProfile?.maxBatches ?? 0}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Max Batches</div>
                    </div>
                    <div className="rounded-xl border border-cyan-500/20 bg-card/30 p-3">
                      <div className="text-2xl font-bold text-cyan-200">
                        {instructorProfile?.currentBatches ?? 0}
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Active Batches</div>
                    </div>
                  </div>
                  {instructorProfile && (
                    <>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Years of experience: </span>
                        <span className="font-mono text-cyan-200">{instructorProfile.yearsExperience}</span>
                      </div>
                      {expertiseArr.length > 0 && (
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Expertise</div>
                          <div className="flex flex-wrap gap-1">
                            {expertiseArr.slice(0, 6).map((e: string) => (
                              <Badge key={e} className="text-[9px] bg-cyan-500/10 text-cyan-200 border border-cyan-500/20">
                                {e}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {certArr.length > 0 && (
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Certifications</div>
                          <div className="flex flex-wrap gap-1">
                            {certArr.slice(0, 6).map((c: string) => (
                              <Badge key={c} className="text-[9px] bg-amber-500/10 text-amber-200 border border-amber-500/20">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {instructorProfile.linkedinUrl && (
                        <a
                          href={instructorProfile.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          <Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile
                        </a>
                      )}
                    </>
                  )}
                  <div className="pt-2 border-t border-cyan-500/20 space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start btn-premium" onClick={() => navigate({ name: "instructor" })}>
                      <Briefcase className="h-4 w-4 mr-2 text-cyan-300" /> Instructor Dashboard
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-rose-300" onClick={() => signOut()}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                /* STUDENT / SCHOOL_ADMIN: original quick actions */
                <div className="rounded-2xl border border-border/60 bg-card/30 p-5 space-y-2">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] mb-2">QUICK ACTIONS</p>
                  <Button variant="outline" className="w-full justify-start btn-premium" onClick={() => navigate({ name: "learning" })}>
                    <GraduationCap className="h-4 w-4 mr-2 text-violet-300" /> My Learning
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start btn-premium" onClick={() => navigate({ name: "achievements" })}>
                    <Trophy className="h-4 w-4 mr-2 text-amber-300" /> Achievements
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start btn-premium" onClick={() => navigate({ name: "certificates" })}>
                    <Shield className="h-4 w-4 mr-2 text-cyan-300" /> Certificates
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                  <div className="pt-2 mt-2 border-t border-border/40">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-rose-300" onClick={() => signOut()}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                  </div>
                </div>
              )}
            </ScrollReveal>
          </div>
        </div>

        {/* ====================================================
            Role-specific main sections
            ==================================================== */}
        {isStudentLike && (
          <>
            {/* STATS STRIP - border-left editorial, 6 metrics */}
            <section className="mb-20">
              <ScrollReveal>
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
                  <div>
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-1">01 - STATISTICS</p>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">The numbers</h2>
                  </div>
                </div>
              </ScrollReveal>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-8">
                {statStrip.map((s, i) => (
                  <ScrollReveal key={s.label} delay={i * 0.06}>
                    <div className={cn("border-l pl-4", s.accent)}>
                      <s.icon className={cn("h-4 w-4 mb-3", s.color)} />
                      <div className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] mb-1">
                        <Counter value={s.value} />
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </section>

            {/* ACHIEVEMENTS PREVIEW - top 6 */}
            <section className="mb-20">
              <ScrollReveal>
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
                  <div>
                    <p className="text-[10px] font-mono text-amber-400 tracking-[0.3em] mb-1">02 - ACHIEVEMENTS</p>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Recent badges</h2>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate({ name: "achievements" })}>
                    View all <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </ScrollReveal>

              {earned.length === 0 ? (
                <ScrollReveal>
                  <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                    <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No achievements unlocked yet. Complete lessons and labs to earn badges.</p>
                  </div>
                </ScrollReveal>
              ) : (
                <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" staggerChildren={0.07}>
                  {earned.map((a) => {
                    const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Award
                    const tier = TIER_STYLES[a.tier] ?? TIER_STYLES.bronze
                    return (
                      <StaggerItem key={a.code}>
                        <CursorGlow color="oklch(0.6 0.2 295 / 0.05)" className="group h-full">
                          <div className={cn(
                            "relative h-full flex flex-col items-center gap-2 p-4 rounded-2xl border bg-card/20 text-center transition-all duration-300 hover:-translate-y-1",
                            tier.border, "hover:shadow-[0_15px_40px_-15px] hover:shadow-violet-500/15",
                          )}>
                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border", tier.bg, tier.border)}>
                              <Icon className={cn("h-6 w-6", tier.text)} strokeWidth={1.5} />
                            </div>
                            <div className="text-[11px] font-medium leading-tight line-clamp-2">{a.title}</div>
                            <div className={cn("text-[9px] uppercase tracking-[0.2em] font-mono", tier.text)}>{a.tier}</div>
                            <div className="text-[9px] text-muted-foreground font-mono flex items-center gap-0.5 mt-auto">
                              <Zap className="h-2.5 w-2.5" />+{a.xp}
                            </div>
                          </div>
                        </CursorGlow>
                      </StaggerItem>
                    )
                  })}
                </Stagger>
              )}
            </section>

            {/* RECENT ACTIVITY TIMELINE */}
            <section>
              <ScrollReveal>
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
                  <div>
                    <p className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] mb-1">03 - ACTIVITY</p>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Recent timeline</h2>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">{activities.length} EVENTS</span>
                </div>
              </ScrollReveal>

              {activities.length === 0 ? (
                <ScrollReveal>
                  <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No recent activity. Start learning to populate your timeline.</p>
                  </div>
                </ScrollReveal>
              ) : (
                <ScrollReveal>
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-border to-transparent" />
                    <Stagger className="space-y-3" staggerChildren={0.05}>
                      {activities.slice(0, 12).map((a, i) => {
                        const meta = ACTIVITY_META[a.type] ?? { icon: Zap, color: "text-muted-foreground", label: a.type.replace(/_/g, " ") }
                        const Icon = meta.icon
                        return (
                          <StaggerItem key={i}>
                            <div className="relative flex items-start gap-4 group">
                              <div className="absolute -left-6 top-3 flex items-center justify-center">
                                <div className={cn("h-3 w-3 rounded-full border-2 border-background", meta.color.replace("text-", "bg-"))} />
                              </div>
                              <div className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/20 hover:bg-card/30 transition-colors">
                                <div className={cn("p-2 rounded-lg bg-muted/30", meta.color)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium capitalize">{meta.label}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    {new Date(a.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">+{a.xp} XP</Badge>
                              </div>
                            </div>
                          </StaggerItem>
                        )
                      })}
                    </Stagger>
                  </div>
                </ScrollReveal>
              )}
            </section>
          </>
        )}

        {isAdmin && (
          <section>
            <ScrollReveal>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
                <Shield className="h-10 w-10 text-amber-300 mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">Platform Administrator</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  You have full control of the GuardianX platform. Use the admin console to manage users,
                  content, batches, revenue, instructors, leads, and notifications.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Badge className="bg-amber-500/10 text-amber-200 border border-amber-500/30 font-mono text-[10px]">
                    <Shield className="h-3 w-3 mr-1" /> FULL ACCESS
                  </Badge>
                  <Badge className="bg-rose-500/10 text-rose-200 border border-rose-500/30 font-mono text-[10px]">
                    <Lock className="h-3 w-3 mr-1" /> AUDITED
                  </Badge>
                </div>
              </div>
            </ScrollReveal>
          </section>
        )}

        {isInstructor && (
          <section>
            <ScrollReveal>
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="h-8 w-8 text-cyan-300" />
                  <div>
                    <h2 className="text-2xl font-bold">Instructor Profile</h2>
                    <p className="text-xs text-muted-foreground">
                      Manage your batches, courses, and student interactions from the Instructor Dashboard.
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <div className="text-2xl font-bold text-cyan-200">{instructorProfile?.maxBatches ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Max Batches</div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <div className="text-2xl font-bold text-cyan-200">{instructorProfile?.currentBatches ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Current Batches</div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <div className="text-2xl font-bold text-cyan-200">{instructorProfile?.yearsExperience ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Years Experience</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-5 btn-premium"
                  onClick={() => navigate({ name: "instructor" })}
                >
                  <Briefcase className="h-4 w-4 mr-2 text-cyan-300" />
                  Open Instructor Dashboard
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </ScrollReveal>
          </section>
        )}
      </div>

      {/* ====================================================
          Dialogs (rendered at the end so they overlay everything)
          ==================================================== */}
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} defaults={editDefaults} />
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </div>
  )
}
