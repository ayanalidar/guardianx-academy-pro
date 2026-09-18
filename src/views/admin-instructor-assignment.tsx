"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Users, Calendar, AlertTriangle, CheckCircle2,
  UserCog, Clock, Plus, Search, Mail, Phone, Linkedin, Award,
  Briefcase, Sparkles, X, Filter, UserPlus, BadgeCheck,
  Shield, Network, Cloud, Bug, Globe, Eye, Zap, Layers,
  Sword, BookOpen, Trash2,
} from "lucide-react"
import { toast } from "sonner"

const EXPERTISE_OPTIONS = [
  { id: "offensive", label: "Offensive Security", icon: Sword },
  { id: "defensive", label: "Defensive Security", icon: Shield },
  { id: "network", label: "Network Security", icon: Network },
  { id: "web", label: "Web Security", icon: Globe },
  { id: "cloud", label: "Cloud Security", icon: Cloud },
  { id: "grc", label: "GRC", icon: Briefcase },
  { id: "dfir", label: "DFIR", icon: Bug },
  { id: "iam", label: "IAM & PAM", icon: Layers },
] as const

interface Instructor {
  id: string
  name: string
  email: string
  avatar: string | null
  title: string | null
  bio: string | null
  role: string
  profile: {
    phone: string | null
    expertise: string[]
    yearsExperience: number
    certifications: string[]
    linkedinUrl: string | null
    maxBatches: number
  } | null
  currentBatches: number
  taughtCourses: number
  createdAt: string
}

// Real batch rows come from /api/admin/training-batches (TrainingBatch model).
// The previous hardcoded BATCHES array + local-state-only assignment was fake:
// assignments vanished on reload and conflicts were computed against mock data.
interface TrainingBatchRow {
  id: string
  name: string
  certification: string
  schedule: string
  instructor: string
  instructorId: string | null
  status: string
  startDate: string
}

export function InstructorAssignmentView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [expertiseFilter, setExpertiseFilter] = React.useState<string>("all")
  const [addOpen, setAddOpen] = React.useState(false)
  const [viewProfile, setViewProfile] = React.useState<Instructor | null>(null)

  // Fetch instructors from API
  const { data, isLoading } = useQuery<{ instructors: Instructor[]; count: number }>({
    queryKey: ["admin-instructors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/instructors")
      if (!res.ok) return { instructors: [], count: 0 }
      return res.json()
    },
  })

  // Use real instructors from the API. Never mask empty data with fake fallbacks —
  // that would put non-existent IDs in the UI, causing 404s on delete. Instead we
  // render a friendly empty state when there are no real instructors yet.
  const apiInstructors = data?.instructors ?? []
  const instructors = apiInstructors

  // Filter instructors
  const filteredInstructors = React.useMemo(() => {
    return instructors.filter((inst) => {
      const matchesSearch =
        !search ||
        inst.name.toLowerCase().includes(search.toLowerCase()) ||
        inst.email.toLowerCase().includes(search.toLowerCase()) ||
        (inst.title || "").toLowerCase().includes(search.toLowerCase())
      const matchesExpertise =
        expertiseFilter === "all" ||
        (inst.profile?.expertise ?? []).includes(expertiseFilter)
      return matchesSearch && matchesExpertise
    })
  }, [instructors, search, expertiseFilter])

  // Create instructor mutation
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create instructor")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] })
      toast.success("Instructor created successfully")
      setAddOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Real training batches — the assignment target (TrainingBatch model)
  const { data: batchesData, isLoading: batchesLoading } = useQuery<{
    batches: TrainingBatchRow[]
    count: number
  }>({
    queryKey: ["admin-assign-batches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/training-batches")
      if (!res.ok) return { batches: [], count: 0 }
      return res.json()
    },
  })
  const batches = batchesData?.batches ?? []

  // Assign instructor to a batch — PERSISTS via PATCH /api/admin/training-batches/[id]
  const assignMutation = useMutation({
    mutationFn: async ({ batchId, instructorId, instructorName }: { batchId: string; instructorId: string | null; instructorName: string | null }) => {
      const res = await fetch(`/api/admin/training-batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorId, instructor: instructorName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to assign instructor")
      }
      return res.json()
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-assign-batches"] })
      toast.success(vars.instructorName ? `Assigned ${vars.instructorName} to batch` : "Instructor unassigned")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function assignInstructor(batchId: string, instructorId: string) {
    const inst = instructors.find((i) => i.id === instructorId)
    assignMutation.mutate({ batchId, instructorId, instructorName: inst?.name ?? null })
  }

  // Delete instructor
  async function handleDeleteInstructor(id: string) {
    if (!confirm("Are you sure you want to delete this instructor? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/instructors/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete")
      }
      toast.success("Instructor deleted")
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] })
    } catch (e: any) {
      toast.error(e.message || "Failed to delete instructor")
    }
  }

  function hasConflict(batch: TrainingBatchRow): boolean {
    if (!batch.instructorId || !batch.schedule) return false
    return batches.some(
      (b) => b.id !== batch.id && b.instructorId === batch.instructorId && b.schedule === batch.schedule
    )
  }

  return (
    <div className="relative min-h-screen bg-mesh">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-amber-400" /> Instructor Assignment Manager
            </h1>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-violet-600 hover:bg-violet-500 btn-premium">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Instructor
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Instructors section */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-300" /> Instructors
                <Badge variant="outline" className="text-[9px] ml-1">{filteredInstructors.length}</Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage instructor profiles, expertise, and workload</p>
            </div>
            {/* Search + filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search instructors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px] h-9 text-xs"
                />
              </div>
              <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expertise</SelectItem>
                  {EXPERTISE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-500/40 border-t-violet-400" />
              Loading instructors...
            </Card>
          ) : apiInstructors.length === 0 ? (
            <Card className="p-10 text-center border-violet-500/20 bg-violet-500/5">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
                <UserPlus className="size-5 text-violet-300" aria-hidden />
              </div>
              <h3 className="text-base font-semibold mb-2">No instructors yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                Add your first instructor to start assigning them to certification batches.
              </p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="bg-violet-600 hover:bg-violet-500 btn-premium">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add your first instructor
              </Button>
            </Card>
          ) : filteredInstructors.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No instructors match your filters.</p>
              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setExpertiseFilter("all") }}>
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredInstructors.map((inst, idx) => (
                  <InstructorCard
                    key={inst.id}
                    instructor={inst}
                    onViewProfile={() => setViewProfile(inst)}
                    onDelete={() => handleDeleteInstructor(inst.id)}
                    index={idx}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Batch assignments */}
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-cyan-300" /> Batch Assignments
          </h2>
          <Card className="overflow-hidden card-premium">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Schedule</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instructor</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        {batchesLoading ? "Loading batches…" : "No training batches yet — create one via Admin → Batch Calendar."}
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => {
                      const conflict = hasConflict(b)
                      return (
                        <tr key={b.id} className="border-t border-border/40 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="font-medium text-sm">{b.name || b.certification}</div>
                            <Badge variant="outline" className="text-[9px] mt-0.5">{b.certification}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{b.schedule || "—"}</td>
                          <td className="py-3 px-4">
                            <Select
                              value={b.instructorId ?? "__NONE__"}
                              onValueChange={(v) =>
                                v === "__NONE__"
                                  ? assignMutation.mutate({ batchId: b.id, instructorId: null, instructorName: null })
                                  : assignInstructor(b.id, v)
                              }
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__NONE__">
                                  <span className="text-muted-foreground italic">Unassigned</span>
                                </SelectItem>
                                {instructors.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4">
                            {conflict ? (
                              <Badge className="text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Conflict</Badge>
                            ) : b.instructorId ? (
                              <Badge className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Assigned</Badge>
                            ) : (
                              <Badge className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30">Unassigned</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Conflict info */}
        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-muted-foreground">
            <span className="text-amber-300 font-semibold">CONFLICT DETECTION:</span> The system automatically detects when an instructor is assigned to two batches with the same schedule. Conflicts are highlighted in red.
          </p>
        </Card>
      </div>

      {/* Add Instructor Dialog */}
      <AddInstructorDialog open={addOpen} onOpenChange={setAddOpen} onCreate={(payload) => createMutation.mutate(payload)} isCreating={createMutation.isPending} />

      {/* View Profile Dialog */}
      <ViewProfileDialog instructor={viewProfile} open={!!viewProfile} onOpenChange={(open) => !open && setViewProfile(null)} />
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function ExpertiseIcon({ id, className }: { id: string; className?: string }) {
  const opt = EXPERTISE_OPTIONS.find((o) => o.id === id)
  if (!opt) return <Sparkles className={className} />
  const Icon = opt.icon
  return <Icon className={className} />
}

function ExpertiseLabel({ id }: { id: string }) {
  const opt = EXPERTISE_OPTIONS.find((o) => o.id === id)
  return <>{opt?.label ?? id}</>
}

function InstructorCard({ instructor: inst, onViewProfile, onDelete, index }: { instructor: Instructor; onViewProfile: () => void; onDelete: () => void; index: number }) {
  const initials = inst.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const workloadPct = inst.profile ? Math.min(100, Math.round((inst.currentBatches / inst.profile.maxBatches) * 100)) : 0
  const workloadColor = workloadPct >= 100 ? "bg-rose-500" : workloadPct >= 66 ? "bg-amber-500" : "bg-emerald-500"
  const workloadText = workloadPct >= 100 ? "text-rose-300 border-rose-500/30" : "text-emerald-300 border-emerald-500/30"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="card-premium rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        {inst.avatar ? (
          <img src={inst.avatar} alt={inst.name} className="size-12 rounded-full object-cover border border-border/60" />
        ) : (
          <div className="size-12 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-border/60 flex items-center justify-center text-sm font-bold text-violet-100 shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm truncate">{inst.name}</h3>
            <BadgeCheck className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{inst.title || "Security Instructor"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{inst.email}</p>
        </div>
      </div>

      {/* Bio */}
      {inst.bio && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{inst.bio}</p>}

      {/* Expertise tags */}
      {inst.profile?.expertise && inst.profile.expertise.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {inst.profile.expertise.map((e) => (
            <Badge key={e} variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/30">
              <ExpertiseIcon id={e} className="h-2.5 w-2.5 mr-1" />
              <ExpertiseLabel id={e} />
            </Badge>
          ))}
        </div>
      )}

      {/* Years of experience */}
      {inst.profile?.yearsExperience != null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Briefcase className="h-3 w-3" /> {inst.profile.yearsExperience}+ years experience
        </div>
      )}

      {/* Certifications */}
      {inst.profile?.certifications && inst.profile.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {inst.profile.certifications.map((c) => (
            <Badge key={c} className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Award className="h-2.5 w-2.5 mr-1" /> {c}
            </Badge>
          ))}
        </div>
      )}

      {/* Workload */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Workload</span>
          <Badge variant="outline" className={cn("text-[9px]", workloadText)}>
            {inst.currentBatches}/{inst.profile?.maxBatches ?? 3} batches
          </Badge>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", workloadColor)} style={{ width: `${workloadPct}%` }} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onViewProfile}>
          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Profile
        </Button>
        <Button size="sm" variant="outline" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}

function AddInstructorDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: Record<string, unknown>) => void
  isCreating: boolean
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [expertise, setExpertise] = React.useState<string[]>([])
  const [yearsExperience, setYearsExperience] = React.useState(5)
  const [certifications, setCertifications] = React.useState("")
  const [avatar, setAvatar] = React.useState("")
  const [linkedinUrl, setLinkedinUrl] = React.useState("")
  const [maxBatches, setMaxBatches] = React.useState(3)
  const [password, setPassword] = React.useState("")

  function toggleExpertise(id: string) {
    setExpertise((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]))
  }

  function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    const certs = certifications
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
    onCreate({
      name,
      email,
      phone,
      title,
      bio,
      expertise,
      yearsExperience,
      certifications: certs,
      avatar,
      linkedinUrl,
      maxBatches,
      password: password || undefined,
    })
    // Reset on success (dialog will close via parent on success)
    setName("")
    setEmail("")
    setPhone("")
    setTitle("")
    setBio("")
    setExpertise([])
    setYearsExperience(5)
    setCertifications("")
    setAvatar("")
    setLinkedinUrl("")
    setMaxBatches(3)
    setPassword("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-400" /> Add New Instructor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@guardianx.io" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Security Engineer" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label className="text-xs">Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Brief professional biography..." className="text-xs" />
          </div>

          {/* Expertise */}
          <div>
            <Label className="text-xs mb-1.5 block">Expertise / Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {EXPERTISE_OPTIONS.map((opt) => {
                const selected = expertise.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleExpertise(opt.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium border transition-colors",
                      selected
                        ? "bg-violet-500/20 text-violet-200 border-violet-500/40"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70",
                    )}
                  >
                    {selected ? <CheckCircle2 className="h-3 w-3" /> : <opt.icon className="h-3 w-3" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Years + max batches */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Years of Experience</Label>
              <Input type="number" min={0} max={50} value={yearsExperience} onChange={(e) => setYearsExperience(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Max Batches</Label>
              <Input type="number" min={1} max={10} value={maxBatches} onChange={(e) => setMaxBatches(Number(e.target.value))} />
            </div>
          </div>

          {/* Certifications */}
          <div>
            <Label className="text-xs">Certifications (comma-separated)</Label>
            <Input
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="CEH, OSCP, CISSP, CCSP"
              className="text-xs"
            />
          </div>

          {/* Avatar + LinkedIn */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Avatar URL (optional)</Label>
              <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">LinkedIn URL</Label>
              <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className="text-xs" />
            </div>
          </div>

          {/* Password */}
          <div>
            <Label className="text-xs">Initial Password (required — min 6 characters)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. Teach@2026" className="text-xs" />
          </div>

          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-300 shrink-0 mt-0.5" />
              <span>
                The instructor will be created with role <code className="text-violet-200">INSTRUCTOR</code> and can immediately
                log in with their email + password. They will appear in the assignment dropdown, in the homepage
                &quot;Expert Instructors&quot; section (after refresh), and in the instructor dashboard.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={isCreating} className="bg-violet-600 hover:bg-violet-500">
            {isCreating ? (
              <><Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Creating...</>
            ) : (
              <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create Instructor</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewProfileDialog({
  instructor: inst,
  open,
  onOpenChange,
}: {
  instructor: Instructor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!inst) return null

  const initials = inst.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {inst.avatar ? (
              <img src={inst.avatar} alt={inst.name} className="size-12 rounded-full object-cover border border-border/60" />
            ) : (
              <div className="size-12 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-border/60 flex items-center justify-center text-sm font-bold text-violet-100 shrink-0">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                {inst.name}
                <BadgeCheck className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-xs text-muted-foreground font-normal">{inst.title || "Security Instructor"}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {inst.bio && <p className="text-xs text-muted-foreground">{inst.bio}</p>}

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/40 bg-card/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                <Mail className="h-3 w-3" /> Email
              </p>
              <p className="text-xs font-medium truncate">{inst.email}</p>
            </div>
            {inst.profile?.phone && (
              <div className="rounded-lg border border-border/40 bg-card/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="text-xs font-medium">{inst.profile.phone}</p>
              </div>
            )}
          </div>

          {/* Expertise */}
          {inst.profile?.expertise && inst.profile.expertise.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Expertise</p>
              <div className="flex flex-wrap gap-1">
                {inst.profile.expertise.map((e) => (
                  <Badge key={e} variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/30">
                    <ExpertiseIcon id={e} className="h-2.5 w-2.5 mr-1" />
                    <ExpertiseLabel id={e} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border/40 bg-card/40 p-2.5 text-center">
              <Briefcase className="h-3.5 w-3.5 mx-auto text-amber-300 mb-1" />
              <div className="text-sm font-bold">{inst.profile?.yearsExperience ?? 0}+</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Years</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-2.5 text-center">
              <Calendar className="h-3.5 w-3.5 mx-auto text-cyan-300 mb-1" />
              <div className="text-sm font-bold">{inst.currentBatches}/{inst.profile?.maxBatches ?? 3}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Batches</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-2.5 text-center">
              <BookOpen className="h-3.5 w-3.5 mx-auto text-violet-300 mb-1" />
              <div className="text-sm font-bold">{inst.taughtCourses}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Courses</div>
            </div>
          </div>

          {/* Certifications */}
          {inst.profile?.certifications && inst.profile.certifications.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Certifications</p>
              <div className="flex flex-wrap gap-1">
                {inst.profile.certifications.map((c) => (
                  <Badge key={c} className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <Award className="h-2.5 w-2.5 mr-1" /> {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn */}
          {inst.profile?.linkedinUrl && (
            <a href={inst.profile.linkedinUrl} target="_blank" rel="noreferrer" className="block">
              <Button size="sm" variant="outline" className="w-full">
                <Linkedin className="h-3.5 w-3.5 mr-1.5" /> View LinkedIn Profile
              </Button>
            </a>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

