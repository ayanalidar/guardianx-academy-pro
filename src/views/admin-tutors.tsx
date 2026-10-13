"use client"

/**
 * AdminTutorsView - dedicated admin tab for managing TUTORS (instructors).
 *
 * • List every tutor (role=INSTRUCTOR user) with profile summary
 * • Create tutor (name, email, password, title, bio, avatar, phone,
 *   expertise, years of experience, certifications, LinkedIn, max batches)
 * • EDIT anything later - including PAST EXPERIENCE entries
 *   (role / organisation / period / details) rendered as a repeatable list
 * • Delete tutor (removes the user + profile)
 *
 * APIs:
 *   GET/POST          /api/admin/instructors
 *   PATCH/DELETE      /api/admin/instructors/[id]
 *
 * Public surface: the /instructors page + instructor detail page show the
 * same profile incl. past experience.
 */

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  GraduationCap, Plus, Pencil, Trash2, Search, Loader2,
  Briefcase, Award, Mail, Phone, Link2, Users, Building2, CalendarRange,
} from "lucide-react"

/* ------------------------------------------------------------ types ---- */

interface ExperienceEntry {
  role: string
  org: string
  period: string
  details: string
}

interface TutorProfile {
  phone: string | null
  expertise: string[]
  yearsExperience: number
  certifications: string[]
  pastExperience: ExperienceEntry[]
  linkedinUrl: string | null
  maxBatches: number
}

interface Tutor {
  id: string
  name: string
  email: string
  avatar: string | null
  title: string | null
  bio: string | null
  profile: TutorProfile | null
  currentBatches?: number
  taughtCourses?: number
  createdAt?: string
}

interface TutorForm {
  name: string
  email: string
  password: string
  title: string
  bio: string
  avatar: string
  phone: string
  expertise: string // comma-separated
  yearsExperience: string
  certifications: string // comma-separated
  linkedinUrl: string
  maxBatches: string
  pastExperience: ExperienceEntry[]
}

const EMPTY_FORM: TutorForm = {
  name: "", email: "", password: "", title: "", bio: "", avatar: "",
  phone: "", expertise: "", yearsExperience: "0", certifications: "",
  linkedinUrl: "", maxBatches: "3", pastExperience: [],
}

const EMPTY_EXP: ExperienceEntry = { role: "", org: "", period: "", details: "" }

/* ---------------------------------------------------------- helpers ---- */

const splitList = (s: string): string[] =>
  s.split(",").map((x) => x.trim()).filter(Boolean)

function toForm(t: Tutor): TutorForm {
  return {
    name: t.name ?? "",
    email: t.email ?? "",
    password: "", // never prefill - blank = keep existing
    title: t.title ?? "",
    bio: t.bio ?? "",
    avatar: t.avatar ?? "",
    phone: t.profile?.phone ?? "",
    expertise: (t.profile?.expertise ?? []).join(", "),
    yearsExperience: String(t.profile?.yearsExperience ?? 0),
    certifications: (t.profile?.certifications ?? []).join(", "),
    linkedinUrl: t.profile?.linkedinUrl ?? "",
    maxBatches: String(t.profile?.maxBatches ?? 3),
    pastExperience: (t.profile?.pastExperience ?? []).map((e) => ({
      role: e.role ?? "", org: e.org ?? "", period: e.period ?? "", details: e.details ?? "",
    })),
  }
}

/* ============================================================ view ==== */

export function AdminTutorsView() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Tutor | null>(null)
  const [form, setForm] = React.useState<TutorForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = React.useState<Tutor | null>(null)

  const list = useQuery<{ instructors: Tutor[]; count: number }>({
    queryKey: ["admin-tutors"],
    queryFn: () => api("/api/admin/instructors"),
    refetchOnMount: "always",
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-tutors"] })
    // The public instructors page reads a different endpoint - refresh it too.
    void qc.invalidateQueries({ queryKey: ["instructors"] })
    void qc.invalidateQueries({ queryKey: ["instructor"] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        title: form.title.trim(),
        bio: form.bio.trim(),
        avatar: form.avatar.trim(),
        phone: form.phone.trim(),
        expertise: splitList(form.expertise),
        yearsExperience: Number(form.yearsExperience) || 0,
        certifications: splitList(form.certifications),
        pastExperience: form.pastExperience
          .filter((e) => e.role.trim() || e.org.trim())
          .map((e) => ({
            role: e.role.trim(), org: e.org.trim(),
            period: e.period.trim(), details: e.details.trim(),
          })),
        linkedinUrl: form.linkedinUrl.trim(),
        maxBatches: Number(form.maxBatches) || 3,
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      }
      if (editing) {
        return api(`/api/admin/instructors/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      }
      return api("/api/admin/instructors", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (_d) => {
      toast.success(editing ? "Tutor updated" : "Tutor added")
      setDialogOpen(false)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/instructors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Tutor deleted")
      setDeleteTarget(null)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (t: Tutor) => {
    setEditing(t)
    setForm(toForm(t))
    setDialogOpen(true)
  }

  const tutors: Tutor[] = list.data?.instructors ?? []
  const filtered = tutors.filter((t) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      (t.profile?.expertise ?? []).some((x) => x.toLowerCase().includes(q))
    )
  })

  const set = (patch: Partial<TutorForm>) => setForm((f) => ({ ...f, ...patch }))

  const setExp = (i: number, patch: Partial<ExperienceEntry>) =>
    setForm((f) => ({
      ...f,
      pastExperience: f.pastExperience.map((e, j) => (j === i ? { ...e, ...patch } : e)),
    }))

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-violet-400" />
            Tutors
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tutor profiles - bio, expertise, certifications and past
            experience. Everything here shows on the public Instructors page.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-500">
          <Plus className="h-4 w-4 mr-2" /> Add Tutor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tutors", value: tutors.length, icon: Users },
          { label: "With Experience", value: tutors.filter((t) => (t.profile?.pastExperience ?? []).length > 0).length, icon: Briefcase },
          { label: "Avg. Years", value: tutors.length ? Math.round(tutors.reduce((a, t) => a + (t.profile?.yearsExperience ?? 0), 0) / tutors.length) : 0, icon: CalendarRange },
          { label: "Certified", value: tutors.filter((t) => (t.profile?.certifications ?? []).length > 0).length, icon: Award },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <s.icon className="h-4 w-4 text-violet-300 mb-2" />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, expertise..."
          className="pl-9"
        />
      </div>

      {/* List */}
      {list.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading tutors...
        </div>
      ) : list.isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
          <p className="text-rose-300 mb-3">Failed to load tutors: {(list.error as any)?.message ?? "unknown error"}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">{tutors.length === 0 ? "No tutors yet" : "No tutors match your search"}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {tutors.length === 0
              ? "Add your first tutor - they appear instantly on the public Instructors page."
              : "Try a different search term."}
          </p>
          {tutors.length === 0 && (
            <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-500">
              <Plus className="h-4 w-4 mr-2" /> Add Tutor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-white/10">
                  {t.avatar ? <AvatarImage src={t.avatar} alt={t.name} /> : null}
                  <AvatarFallback className="bg-violet-500/20 text-violet-200">
                    {(t.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.title || "Security Instructor"}</div>
                  <div className="text-xs text-muted-foreground/70 truncate mt-0.5">{t.email}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)} aria-label={`Edit ${t.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-300" onClick={() => setDeleteTarget(t)} aria-label={`Delete ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {t.bio ? (
                <p className="text-xs text-muted-foreground line-clamp-2">{t.bio}</p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {(t.profile?.expertise ?? []).slice(0, 4).map((x) => (
                  <Badge key={x} variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
                    {x}
                  </Badge>
                ))}
                {(t.profile?.expertise ?? []).length > 4 && (
                  <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                    +{(t.profile?.expertise ?? []).length - 4}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/[0.04] py-1.5">
                  <div className="font-bold text-sm">{t.profile?.yearsExperience ?? 0}y</div>
                  <div className="text-[10px] text-muted-foreground">experience</div>
                </div>
                <div className="rounded-lg bg-white/[0.04] py-1.5">
                  <div className="font-bold text-sm">{(t.profile?.certifications ?? []).length}</div>
                  <div className="text-[10px] text-muted-foreground">certs</div>
                </div>
                <div className="rounded-lg bg-white/[0.04] py-1.5">
                  <div className="font-bold text-sm">{(t.profile?.pastExperience ?? []).length}</div>
                  <div className="text-[10px] text-muted-foreground">roles</div>
                </div>
              </div>

              {(t.profile?.pastExperience ?? []).length > 0 ? (
                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  {(t.profile?.pastExperience ?? []).slice(0, 2).map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Building2 className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        <span className="font-medium">{e.role || "Role"}</span>
                        {e.org ? <span className="text-muted-foreground"> · {e.org}</span> : null}
                        {e.period ? <span className="text-muted-foreground/70"> ({e.period})</span> : null}
                      </span>
                    </div>
                  ))}
                  {(t.profile?.pastExperience ?? []).length > 2 && (
                    <div className="text-[10px] text-muted-foreground/70 pl-5">
                      +{(t.profile?.pastExperience ?? []).length - 2} more entries
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add Tutor"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Arjun Mehta" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="tutor@guardianx.in" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{editing ? "New Password (leave blank to keep current)" : "Password * (min 6 characters - lets the tutor log in)"}</Label>
              <Input type="password" value={form.password} onChange={(e) => set({ password: e.target.value })} placeholder={editing ? "••••••" : "Set a login password"} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Lead Offensive Security Instructor" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 ..." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea rows={3} value={form.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="Short professional bio shown on the public tutors page..." />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Expertise (comma-separated)</Label>
                <Input value={form.expertise} onChange={(e) => set({ expertise: e.target.value })} placeholder="Offensive Security, Cloud Security" />
              </div>
              <div className="space-y-1.5">
                <Label>Certifications (comma-separated)</Label>
                <Input value={form.certifications} onChange={(e) => set({ certifications: e.target.value })} placeholder="OSCP, CEH, CISSP" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Years of Experience</Label>
                <Input type="number" min={0} value={form.yearsExperience} onChange={(e) => set({ yearsExperience: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Batches</Label>
                <Input type="number" min={1} value={form.maxBatches} onChange={(e) => set({ maxBatches: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Avatar URL</Label>
                <Input value={form.avatar} onChange={(e) => set({ avatar: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input value={form.linkedinUrl} onChange={(e) => set({ linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </div>

            {/* Past experience repeater */}
            <div className="space-y-2 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-violet-300" /> Past Experience
                </Label>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => set({ pastExperience: [...form.pastExperience, { ...EMPTY_EXP }] })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Entry
                </Button>
              </div>
              {form.pastExperience.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add previous roles - e.g. "SOC Analyst · Deloitte · 2021-2024".
                  Shown publicly on the tutor's profile.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.pastExperience.map((e, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Entry {i + 1}</span>
                        <Button
                          type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-400"
                          onClick={() => set({ pastExperience: form.pastExperience.filter((_, j) => j !== i) })}
                          aria-label="Remove entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <Input value={e.role} onChange={(ev) => setExp(i, { role: ev.target.value })} placeholder="Role (e.g. SOC Analyst)" />
                        <Input value={e.org} onChange={(ev) => setExp(i, { org: ev.target.value })} placeholder="Organisation" />
                        <Input value={e.period} onChange={(ev) => setExp(i, { period: ev.target.value })} placeholder="Period (e.g. 2021-2024)" />
                      </div>
                      <Textarea rows={2} value={e.details} onChange={(ev) => setExp(i, { details: ev.target.value })} placeholder="What they did there (optional)..." />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={save.isPending}>Cancel</Button>
            <Button
              onClick={() => void save.mutate()}
              disabled={save.isPending || !form.name.trim() || !form.email.trim() || (!editing && form.password.length < 6)}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Add Tutor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the tutor's login account and profile permanently.
            Their courses stay, but they will disappear from the public
            Instructors page.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={remove.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && void remove.mutate(deleteTarget.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
