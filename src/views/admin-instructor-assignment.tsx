"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  ArrowLeft, Calendar, AlertTriangle, CheckCircle2,
  UserCog, Clock, UserPlus, Sparkles, GraduationCap,
} from "lucide-react"
import { toast } from "sonner"

const EXPERTISE_OPTIONS = [
  { id: "offensive", label: "Offensive Security" },
  { id: "defensive", label: "Defensive Security" },
  { id: "network", label: "Network Security" },
  { id: "web", label: "Web Security" },
  { id: "cloud", label: "Cloud Security" },
  { id: "grc", label: "GRC" },
  { id: "dfir", label: "DFIR" },
  { id: "iam", label: "IAM & PAM" },
] as const

interface Instructor {
  id: string
  name: string
  email: string
  title: string | null
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

/** Batch statuses that are over - hidden by default so the page shows only CURRENT batches. */
const PAST_STATUSES = new Set(["Completed", "Cancelled"])

export function InstructorAssignmentView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [showPast, setShowPast] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)

  // Tutors - fetched ONLY as dropdown options for the assignment select.
  // Full profile management (expertise, certifications, past experience)
  // lives in the dedicated Tutors tab (Admin -> Tutors).
  const { data, isLoading } = useQuery<{ instructors: Instructor[]; count: number }>({
    queryKey: ["admin-instructors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/instructors")
      if (!res.ok) return { instructors: [], count: 0 }
      return res.json()
    },
  })
  const tutors = data?.instructors ?? []

  // Real training batches - the assignment target (TrainingBatch model)
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

  // "Current batches" filter - hide Completed/Cancelled unless the user opts in.
  const visibleBatches = React.useMemo(
    () => (showPast ? batches : batches.filter((b) => !PAST_STATUSES.has(b.status))),
    [batches, showPast]
  )
  const unassignedCount = visibleBatches.filter((b) => !b.instructorId).length

  // Assign tutor to a batch - PERSISTS via PATCH /api/admin/training-batches/[id]
  const assignMutation = useMutation({
    mutationFn: async ({ batchId, instructorId, instructorName }: { batchId: string; instructorId: string | null; instructorName: string | null }) => {
      const res = await fetch(`/api/admin/training-batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorId, instructor: instructorName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to assign tutor")
      }
      return res.json()
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-assign-batches"] })
      toast.success(vars.instructorName ? `Assigned ${vars.instructorName} to batch` : "Tutor unassigned")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Create tutor (compact create - full profile editing lives in the Tutors tab)
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create tutor")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] })
      toast.success("Tutor created - add their expertise & past experience in the Tutors tab")
      setAddOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function assignTutor(batchId: string, tutorId: string) {
    const t = tutors.find((i) => i.id === tutorId)
    assignMutation.mutate({ batchId, instructorId: tutorId, instructorName: t?.name ?? null })
  }

  function hasConflict(batch: TrainingBatchRow): boolean {
    if (!batch.instructorId || !batch.schedule) return false
    return batches.some(
      (b) => b.id !== batch.id && b.instructorId === batch.instructorId && b.schedule === batch.schedule
    )
  }

  const conflictCount = visibleBatches.filter((b) => hasConflict(b)).length

  return (
    <div className="relative min-h-screen bg-mesh">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-amber-400" /> Instructor Assignment
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate({ name: "admin-tutors" })}>
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" /> Tutor profiles
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="bg-violet-600 hover:bg-violet-500 btn-premium">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Tutor
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-lg font-bold text-cyan-300">{visibleBatches.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current batches</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-lg font-bold text-amber-300">{unassignedCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Unassigned</div>
          </Card>
          <Card className="p-3 text-center">
            <div className={cn("text-lg font-bold", conflictCount > 0 ? "text-rose-300" : "text-emerald-300")}>{conflictCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Schedule conflicts</div>
          </Card>
        </div>

        {/* No-tutors hint - the assignment dropdown would otherwise be empty */}
        {!isLoading && tutors.length === 0 && (
          <Card className="p-4 border-violet-500/20 bg-violet-500/5">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <UserPlus className="h-4 w-4 text-violet-300 shrink-0 mt-0.5" />
              <span>
                <span className="text-foreground font-medium">No tutors yet.</span>{" "}
                Add one with the <span className="text-violet-300 font-medium">Add Tutor</span> button above, or open the{" "}
                <button onClick={() => navigate({ name: "admin-tutors" })} className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                  Tutors tab
                </button>{" "}
                to build full profiles (expertise, certifications, past experience) first.
              </span>
            </p>
          </Card>
        )}

        {/* Batch assignments */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-300" /> Current Batches
              <Badge variant="outline" className="text-[9px] ml-1">{visibleBatches.length}</Badge>
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(e) => setShowPast(e.target.checked)}
                className="accent-violet-500"
              />
              Show past batches ({batches.filter((b) => PAST_STATUSES.has(b.status)).length})
            </label>
          </div>

          <Card className="overflow-hidden card-premium">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Schedule</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tutor</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        {batchesLoading ? "Loading batches…" : "No training batches yet - create one via Admin → Batch Calendar."}
                      </td>
                    </tr>
                  ) : visibleBatches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        No current batches - all batches are Completed/Cancelled. Tick &quot;Show past batches&quot; to review them.
                      </td>
                    </tr>
                  ) : (
                    visibleBatches.map((b) => {
                      const conflict = hasConflict(b)
                      return (
                        <tr key={b.id} className="border-t border-border/40 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="font-medium text-sm">{b.name || b.certification}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[9px]">{b.certification}</Badge>
                              {b.status && (
                                <Badge variant="outline" className={cn("text-[9px]", PAST_STATUSES.has(b.status) ? "text-muted-foreground" : "text-cyan-300 border-cyan-500/30")}>
                                  {b.status}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{b.schedule || " - "}</td>
                          <td className="py-3 px-4">
                            <Select
                              value={b.instructorId ?? "__NONE__"}
                              onValueChange={(v) =>
                                v === "__NONE__"
                                  ? assignMutation.mutate({ batchId: b.id, instructorId: null, instructorName: null })
                                  : assignTutor(b.id, v)
                              }
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__NONE__">
                                  <span className="text-muted-foreground italic">Unassigned</span>
                                </SelectItem>
                                {tutors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
            <span className="text-amber-300 font-semibold">CONFLICT DETECTION:</span> The system automatically detects when a tutor is assigned to two batches with the same schedule. Conflicts are highlighted in red.
          </p>
        </Card>
      </div>

      {/* Add Tutor Dialog (compact create; full profiles in the Tutors tab) */}
      <AddTutorDialog open={addOpen} onOpenChange={setAddOpen} onCreate={(payload) => createMutation.mutate(payload)} isCreating={createMutation.isPending} />
    </div>
  )
}

// ============================================================
// Compact Add-Tutor dialog
// ============================================================

function AddTutorDialog({
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
  const [title, setTitle] = React.useState("")
  const [password, setPassword] = React.useState("")

  function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    if (password.length < 6) {
      toast.error("Initial password is required (min 6 characters)")
      return
    }
    onCreate({ name, email, title, password })
    setName("")
    setEmail("")
    setTitle("")
    setPassword("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-400" /> Add New Tutor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" />
          </div>
          <div>
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@guardianx.io" />
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Security Engineer" />
          </div>
          <div>
            <Label className="text-xs">Initial Password (min 6 characters) *</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. Teach@2026" className="text-xs" />
          </div>

          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-300 shrink-0 mt-0.5" />
              <span>
                This creates the login + dropdown entry. For expertise, certifications and{" "}
                <span className="text-violet-200 font-medium">past experience</span>, open the tutor in the{" "}
                <span className="text-cyan-300">Tutors</span> tab afterwards.
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
              <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create Tutor</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
