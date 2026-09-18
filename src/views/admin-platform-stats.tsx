"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  BarChart3, Loader2, Save, Plus, Trash2, Check, X, Eye, EyeOff,
  RefreshCw, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface PlatformStat {
  id: string
  key: string
  label: string
  value: string
  source: string // "manual" | "calculated"
  displayStatus: string // "visible" | "hidden"
  suffix: string | null
  icon: string
  color: string
  updatedAt: string
}

const ICON_OPTIONS = [
  "Users", "FlaskConical", "BookOpen", "Award", "Trophy", "Shield",
  "Server", "Cloud", "Lock", "Target", "Zap", "Activity", "Briefcase",
  "GraduationCap", "Code2", "Network",
]

const COLOR_OPTIONS = [
  { value: "text-violet-300", label: "Violet" },
  { value: "text-emerald-300", label: "Emerald" },
  { value: "text-cyan-300", label: "Cyan" },
  { value: "text-amber-300", label: "Amber" },
  { value: "text-rose-300", label: "Rose" },
]

export function AdminPlatformStatsView() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<Partial<PlatformStat>>({})
  const [creating, setCreating] = React.useState(false)

  const { data, isLoading, refetch } = useQuery<{ stats: PlatformStat[]; count: number }>({
    queryKey: ["admin-platform-stats"],
    queryFn: () => api("/api/admin/platform-stats"),
  })

  const stats = data?.stats ?? []

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PlatformStat> }) =>
      api(`/api/admin/platform-stats/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      toast.success("Stat updated")
      queryClient.invalidateQueries({ queryKey: ["admin-platform-stats"] })
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] }) // refresh homepage
      setEditingId(null)
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/platform-stats/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Stat deleted")
      queryClient.invalidateQueries({ queryKey: ["admin-platform-stats"] })
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] })
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  const startEdit = (s: PlatformStat) => {
    setEditingId(s.id)
    setEditForm({ label: s.label, value: s.value, suffix: s.suffix, displayStatus: s.displayStatus, source: s.source, icon: s.icon, color: s.color })
  }

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, patch: editForm })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold tracking-tight">Platform Stats</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Edit the numbers shown on the homepage (students enrolled, labs solved, etc). Changes reflect instantly.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> New stat
        </Button>
      </div>

      {/* Stats list */}
      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No stats yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {stats.map((s) => {
              const isEditing = editingId === s.id
              return (
                <div key={s.id} className="p-4">
                  {isEditing ? (
                    /* ----- Edit mode ----- */
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Label</Label>
                          <Input value={editForm.label || ""} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Value</Label>
                          <Input value={editForm.value || ""} onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))} placeholder="e.g. 5, 1,240, 48" />
                        </div>
                        <div>
                          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Suffix (optional)</Label>
                          <Input value={editForm.suffix || ""} onChange={(e) => setEditForm((f) => ({ ...f, suffix: e.target.value }))} placeholder="e.g. +, K, %" />
                        </div>
                        <div>
                          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Visibility</Label>
                          <Select value={editForm.displayStatus || "visible"} onValueChange={(v) => setEditForm((f) => ({ ...f, displayStatus: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="visible">Visible</SelectItem>
                              <SelectItem value="hidden">Hidden</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          <span>key: {s.key}</span>
                          <span>·</span>
                          <span>source: {s.source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => saveEdit(s.id)} disabled={updateMutation.isPending} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ----- View mode ----- */
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted/30 shrink-0">
                          <span className="text-lg font-bold tabular-nums">{s.value}{s.suffix || ""}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-medium text-sm">{s.label}</span>
                            {s.displayStatus === "hidden" && (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/60">
                                <EyeOff className="h-2.5 w-2.5 mr-1" /> Hidden
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/60 font-mono">
                              {s.source}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            key: {s.key} · updated {new Date(s.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {s.source !== "calculated" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete the "${s.label}" stat? This cannot be undone.`)) {
                                deleteMutation.mutate(s.id)
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {creating && (
        <CreateStatDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-platform-stats"] })
            queryClient.invalidateQueries({ queryKey: ["platform-stats"] })
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function CreateStatDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = React.useState({
    key: "",
    label: "",
    value: "",
    suffix: "",
    icon: "Users",
    color: "text-violet-300",
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      await api("/api/admin/platform-stats", {
        method: "POST",
        body: JSON.stringify({ ...form, displayStatus: "visible", source: "manual" }),
      })
      toast.success("Stat created")
      onCreated()
    } catch (e: any) {
      setError(e?.message || "Create failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="rounded-xl border border-border/60 bg-card p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Create new stat</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Key (unique identifier)</Label>
            <Input value={form.key} onChange={(e) => update("key", e.target.value)} placeholder="e.g. weekly_enrollments" className="font-mono text-sm" />
          </div>
          <div>
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Label</Label>
            <Input value={form.label} onChange={(e) => update("label", e.target.value)} placeholder="e.g. Students enrolled this week" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Value</Label>
              <Input value={form.value} onChange={(e) => update("value", e.target.value)} placeholder="e.g. 5" />
            </div>
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Suffix</Label>
              <Input value={form.suffix} onChange={(e) => update("suffix", e.target.value)} placeholder="e.g. +, K" />
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 p-2.5 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving || !form.key || !form.label} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
