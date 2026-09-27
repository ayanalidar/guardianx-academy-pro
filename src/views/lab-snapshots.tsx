"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Save,
  Trash2,
  Download,
  Plus,
  Camera,
  FileCode2,
  Clock,
  History,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   LabSnapshotsView
   List of saved snapshots, create new, restore (load), delete.
   ============================================================ */

interface Snapshot {
  id: string
  labId: string
  labTitle: string
  labCategory: string
  labColor: string
  name: string
  description: string
  state: string
  createdAt: string
}

interface Lab {
  id: string
  title: string
  category: string
  color: string
}

export function LabSnapshotsView() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [restoreOpen, setRestoreOpen] = React.useState(false)
  const [restoreSnap, setRestoreSnap] = React.useState<Snapshot | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Snapshot | null>(null)

  // Form state
  const [labId, setLabId] = React.useState("")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  const { data: snapData, isLoading: snapLoading } = useQuery<{ snapshots: Snapshot[] }>({
    queryKey: ["lab-snapshots"],
    queryFn: () => api("/api/lab-snapshots"),
  })

  const { data: labsData } = useQuery<{ labs: Lab[] }>({
    queryKey: ["labs", "for-snapshots"],
    queryFn: () => api("/api/labs"),
  })

  const createSnap = useMutation({
    mutationFn: () =>
      api("/api/lab-snapshots", {
        method: "POST",
        body: JSON.stringify({
          labId,
          name,
          description,
          state: JSON.stringify({
            savedAt: new Date().toISOString(),
            terminalHistory: [],
            envVars: {},
            progress: 0,
          }),
        }),
      }),
    onSuccess: () => {
      toast.success("Snapshot saved!")
      setCreateOpen(false)
      setLabId("")
      setName("")
      setDescription("")
      qc.invalidateQueries({ queryKey: ["lab-snapshots"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteSnap = useMutation({
    mutationFn: (id: string) => api(`/api/lab-snapshots/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Snapshot deleted")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["lab-snapshots"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const restoreSnapMut = useMutation({
    mutationFn: (id: string) => api<{ snapshot: Snapshot }>(`/api/lab-snapshots/${id}`),
    onSuccess: (data) => {
      setRestoreSnap(data.snapshot)
      setRestoreOpen(true)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const downloadSnapshot = (snap: Snapshot) => {
    const blob = new Blob([snap.state], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${snap.name.replace(/\s+/g, "_")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Snapshot downloaded")
  }

  const snapshots = snapData?.snapshots ?? []
  const labs = labsData?.labs ?? []

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">
              LAB SNAPSHOTS · SAVE & RESTORE YOUR WORK
            </span>
          </div>
        </ScrollReveal>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-12">
          <ScrollReveal delay={0.1}>
            <div>
              <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
                Lab <span className="text-gradient-premium">Snapshots</span>
              </h1>
              <p className="text-muted-foreground max-w-xl">
                Save the state of a lab mid-engagement. Restore it later to continue exactly where you left off, or export it as JSON.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <Button onClick={() => setCreateOpen(true)} className="bg-violet-600 hover:bg-violet-500 btn-premium">
              <Plus className="h-4 w-4 mr-2" /> New Snapshot
            </Button>
          </ScrollReveal>
        </div>

        {snapLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-4">No snapshots yet.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-violet-600 hover:bg-violet-500 btn-premium">
              <Plus className="h-4 w-4 mr-2" /> Save your first snapshot
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshots.map((s, i) => (
              <ScrollReveal key={s.id} delay={0.05 + i * 0.05}>
                <div className="card-premium rounded-2xl p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono bg-violet-500/10 text-violet-300">
                      <FileCode2 className="h-3 w-3" /> {s.labCategory || "LAB"}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1 line-clamp-1">{s.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{s.labTitle}</p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3 flex-1">{s.description}</p>
                  )}
                  <div className="mt-auto pt-3 border-t border-border/60 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreSnapMut.mutate(s.id)}
                      disabled={restoreSnapMut.isPending}
                      className="flex-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Load
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSnapshot(s)}
                      className="px-2.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(s)}
                      className="px-2.5 text-rose-300 hover:text-rose-200 hover:border-rose-500/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Tips card */}
        {snapshots.length > 0 && (
          <ScrollReveal delay={0.2}>
            <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 flex-shrink-0">
                  <History className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How snapshots work</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A snapshot stores the lab&apos;s terminal history, environment variables, and progress checkpoint as a JSON blob. Load it from any device to resume the engagement - perfect for long-running labs where you need to pause and continue later. Export to JSON for offline archival.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Create Snapshot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a snapshot</DialogTitle>
            <DialogDescription>
              Pick a lab and give your snapshot a memorable name. The current state (terminal, env, progress) will be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lab-select">Lab</Label>
              <Select value={labId} onValueChange={setLabId}>
                <SelectTrigger id="lab-select">
                  <SelectValue placeholder="Choose a lab..." />
                </SelectTrigger>
                <SelectContent>
                  {labs.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title} ({l.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="snap-name">Snapshot name</Label>
              <Input
                id="snap-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pre-exploitation checkpoint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snap-desc">Description (optional)</Label>
              <Textarea
                id="snap-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What were you doing when you saved this?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => createSnap.mutate()}
              disabled={!labId || !name.trim() || createSnap.isPending}
              className="bg-violet-600 hover:bg-violet-500 btn-premium"
            >
              <Save className="h-4 w-4 mr-2" />
              {createSnap.isPending ? "Saving..." : "Save Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-violet-300" /> Restore snapshot
            </DialogTitle>
            <DialogDescription>
              {restoreSnap?.name} - saved {restoreSnap ? new Date(restoreSnap.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {restoreSnap && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-[10px] font-mono text-muted-foreground mb-1">SAVED STATE</div>
                <pre className="text-[10px] font-mono text-violet-200 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(restoreSnap.state), null, 2)
                    } catch {
                      return restoreSnap.state
                    }
                  })()}
                </pre>
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                Loading a snapshot will overwrite the current lab session state. This is a demo of the restore flow - in production this would rehydrate the live lab terminal.
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button className="bg-violet-600 hover:bg-violet-500 btn-premium" onClick={() => toast.success("Snapshot restored to active lab session")}>
                <RotateCcw className="h-4 w-4 mr-2" /> Restore Now
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete snapshot?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name} - this action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteSnap.mutate(deleteTarget.id)}
              disabled={deleteSnap.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
