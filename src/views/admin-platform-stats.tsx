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
  RefreshCw, AlertCircle, Radio, Pencil,
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

interface LiveFeedEntry {
  id: string
  displayName: string
  city: string | null
  courseTitle: string
  courseShortName: string | null
  color: string
  occurredAt: string
  active: boolean
  isSample: boolean
  order: number
  updatedAt: string
}

const FEED_COLORS = [
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "cyan", label: "Cyan" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
]

const FEED_DOT: Record<string, string> = {
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
}

/** ISO → "YYYY-MM-DDTHH:mm" in the viewer's local time (datetime-local). */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function timeAgoLabel(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (diffSec < 60) return "just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return `${Math.floor(diffSec / 604800)}w ago`
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
          Edit the numbers shown on the homepage (students enrolled, labs solved, etc) and curate the homepage Live Feed. Changes reflect instantly.
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

      {/* Count tile overrides (Live Feed tiles) */}
      <TileOverridesCard stats={stats} />

      {/* Live Feed - curated homepage entries */}
      <LiveFeedManager stats={stats} />

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

/* ============================================================
   TileOverridesCard - manual values for the two Live Feed count
   tiles ("Total learners enrolled" / "Enrolled this week").
   Stored as PlatformStat rows (keys: enrolled_total /
   enrolled_this_week). Empty computed values are used when the
   key does not exist, so deleting the row reverts to real data.
   ============================================================ */
function TileOverridesCard({ stats }: { stats: PlatformStat[] }) {
  const queryClient = useQueryClient()
  const totalRow = stats.find((s) => s.key === "enrolled_total")
  const weekRow = stats.find((s) => s.key === "enrolled_this_week")
  const [totalVal, setTotalVal] = React.useState(totalRow?.value ?? "")
  const [weekVal, setWeekVal] = React.useState(weekRow?.value ?? "")
  const [savingKey, setSavingKey] = React.useState<string | null>(null)

  React.useEffect(() => { setTotalVal(totalRow?.value ?? "") }, [totalRow?.value])
  React.useEffect(() => { setWeekVal(weekRow?.value ?? "") }, [weekRow?.value])

  const save = async (key: string, label: string, value: string) => {
    setSavingKey(key)
    try {
      await api("/api/admin/platform-stats", {
        method: "POST",
        body: JSON.stringify({
          key,
          label,
          value,
          source: "manual",
          displayStatus: "visible",
          icon: "Users",
          color: "text-emerald-300",
        }),
      })
      toast.success("Tile value saved")
      queryClient.invalidateQueries({ queryKey: ["admin-platform-stats"] })
      queryClient.invalidateQueries({ queryKey: ["enrollment-feed"] }) // refresh homepage widget
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Eye className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold">Live Feed count tiles</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Manual values for the &quot;Total learners enrolled&quot; and &quot;Enrolled this week&quot; tiles on the homepage Live Feed. Without a value here, the tile shows the real computed count. To remove an override, delete its row in the stats list above (keys: enrolled_total, enrolled_this_week).
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Total learners enrolled {totalRow && <span className="text-emerald-400">· override active</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              value={totalVal}
              onChange={(e) => setTotalVal(e.target.value)}
              placeholder="e.g. 1240"
              inputMode="numeric"
            />
            <Button
              size="sm"
              disabled={savingKey !== null || !/^\d+$/.test(totalVal.trim()) || totalVal.trim() === totalRow?.value}
              onClick={() => save("enrolled_total", "Total learners enrolled", totalVal.trim())}
              className="shrink-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            >
              {savingKey === "enrolled_total" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Enrolled this week {weekRow && <span className="text-emerald-400">· override active</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              value={weekVal}
              onChange={(e) => setWeekVal(e.target.value)}
              placeholder="e.g. 18"
              inputMode="numeric"
            />
            <Button
              size="sm"
              disabled={savingKey !== null || !/^\d+$/.test(weekVal.trim()) || weekVal.trim() === weekRow?.value}
              onClick={() => save("enrolled_this_week", "Enrolled this week", weekVal.trim())}
              className="shrink-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            >
              {savingKey === "enrolled_this_week" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   LiveFeedManager - curate the homepage "RECENT ENROLLMENTS"
   widget. Curated entries lead the feed; real enrollments fill
   the remaining rows. Full CRUD + active toggle + ordering.
   ============================================================ */
interface EntryForm {
  id?: string
  displayName: string
  city: string
  courseTitle: string
  courseShortName: string
  color: string
  occurredAt: string // datetime-local value
  order: string
  active: boolean
  isSample: boolean
}

function entryToForm(e: LiveFeedEntry): EntryForm {
  return {
    id: e.id,
    displayName: e.displayName,
    city: e.city ?? "",
    courseTitle: e.courseTitle,
    courseShortName: e.courseShortName ?? "",
    color: e.color,
    occurredAt: toLocalInput(e.occurredAt),
    order: String(e.order ?? 0),
    active: e.active,
    isSample: e.isSample,
  }
}

const EMPTY_ENTRY: EntryForm = {
  displayName: "",
  city: "",
  courseTitle: "",
  courseShortName: "",
  color: "emerald",
  occurredAt: toLocalInput(new Date().toISOString()),
  order: "0",
  active: true,
  isSample: false,
}

function LiveFeedManager({ stats }: { stats: PlatformStat[] }) {
  const queryClient = useQueryClient()
  const [dialog, setDialog] = React.useState<EntryForm | null>(null)

  const { data, isLoading, refetch } = useQuery<{ entries: LiveFeedEntry[]; count: number }>({
    queryKey: ["admin-live-feed"],
    queryFn: () => api("/api/admin/live-feed"),
  })
  const entries = data?.entries ?? []
  const sampleCount = entries.filter((e) => e.isSample).length
  void stats // reserved: future per-tile wiring lives in TileOverridesCard

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-live-feed"] })
    queryClient.invalidateQueries({ queryKey: ["enrollment-feed"] }) // refresh homepage widget
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/admin/live-feed/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => { toast.success("Entry updated"); invalidate() },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/live-feed/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Entry deleted"); invalidate() },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Live Feed entries</h2>
            {sampleCount > 0 && (
              <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300">
                {sampleCount} sample{sampleCount === 1 ? "" : "s"} to replace
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            These entries lead the homepage Live Feed widget; real enrollments fill the remaining rows. Replace the clearly-marked Sample rows with real learner updates (first name or short name is enough - full names are never required).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setDialog({ ...EMPTY_ENTRY, occurredAt: toLocalInput(new Date().toISOString()) })} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> New entry
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Radio className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No entries yet - the widget shows real enrollments only</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {entries.map((e) => (
              <div key={e.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/30 shrink-0">
                    <span className={cn("h-2.5 w-2.5 rounded-full", FEED_DOT[e.color] ?? FEED_DOT.emerald)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-medium text-sm">{e.displayName}</span>
                      {e.city && <span className="text-[10px] font-mono text-muted-foreground">{e.city}</span>}
                      {e.isSample && (
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300">Sample</Badge>
                      )}
                      {!e.active && (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/60">
                          <EyeOff className="h-2.5 w-2.5 mr-1" /> Hidden
                        </Badge>
                      )}
                      {e.order !== 0 && (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/60 font-mono">
                          order {e.order}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      enrolled in {e.courseTitle}
                      {e.courseShortName ? ` (${e.courseShortName})` : ""}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {timeAgoLabel(e.occurredAt)} · {new Date(e.occurredAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    title={e.active ? "Hide from feed" : "Show in feed"}
                    onClick={() => toggleMutation.mutate({ id: e.id, active: !e.active })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {e.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog(entryToForm(e))}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete the entry "${e.displayName}"? This cannot be undone.`)) {
                        deleteMutation.mutate(e.id)
                      }
                    }}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <LiveFeedDialog
          initial={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); invalidate() }}
        />
      )}
    </div>
  )
}

function LiveFeedDialog({ initial, onClose, onSaved }: { initial: EntryForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<EntryForm>(initial)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const isEdit = !!initial.id

  const set = (k: keyof EntryForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const occurredIso = form.occurredAt ? new Date(form.occurredAt).toISOString() : new Date().toISOString()
      const body = {
        displayName: form.displayName,
        city: form.city,
        courseTitle: form.courseTitle,
        courseShortName: form.courseShortName,
        color: form.color,
        occurredAt: occurredIso,
        order: parseInt(form.order || "0", 10) || 0,
        active: form.active,
        isSample: form.isSample,
      }
      if (isEdit) {
        await api(`/api/admin/live-feed/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) })
        toast.success("Entry updated")
      } else {
        await api("/api/admin/live-feed", { method: "POST", body: JSON.stringify(body) })
        toast.success("Entry created")
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="rounded-xl border border-border/60 bg-card p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{isEdit ? "Edit feed entry" : "New feed entry"}</h3>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Name shown *</Label>
              <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} placeholder="e.g. Rahul K." />
            </div>
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">City (optional)</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Srinagar" />
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Course / program *</Label>
            <Input value={form.courseTitle} onChange={(e) => set("courseTitle", e.target.value)} placeholder="e.g. CEH v13 Practical Ethical Hacking" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Short chip (optional)</Label>
              <Input value={form.courseShortName} onChange={(e) => set("courseShortName", e.target.value)} placeholder="e.g. CEHv13" />
            </div>
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Accent</Label>
              <Select value={form.color} onValueChange={(v) => set("color", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEED_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Order (lower first)</Label>
              <Input value={form.order} onChange={(e) => set("order", e.target.value)} inputMode="numeric" placeholder="0" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">When (drives the time label)</Label>
              <Input
                type="datetime-local"
                value={form.occurredAt}
                onChange={(e) => set("occurredAt", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none pb-1">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              Active (visible in the feed)
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isSample}
              onChange={(e) => set("isSample", e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            <span>
              Sample row <span className="text-xs text-muted-foreground">- shows an amber &quot;Sample&quot; chip on the public feed; untick once the row holds real data</span>
            </span>
          </label>
          <p className="text-[10px] text-muted-foreground">
            Tip: use a first name or short name - the public widget never displays full identities.
          </p>
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 p-2.5 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !form.displayName.trim() || !form.courseTitle.trim()}
            className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {isEdit ? "Save changes" : "Create entry"}
          </Button>
        </div>
      </div>
    </div>
  )
}
