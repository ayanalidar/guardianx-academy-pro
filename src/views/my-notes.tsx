"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus, Search, Trash2, Pin, PenLine, Save, X,
  BookOpen, Clock, Hash, StickyNote, ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { NOTE_COLORS } from "@/lib/colors"
import {
  ScrollReveal, CursorGlow, Stagger, StaggerItem, FadeIn,
} from "@/components/platform/motion-system"

interface NoteItem {
  id: string; title: string; content: string; color: string; pinned: boolean
  lessonId: string | null; courseId: string | null; createdAt: string; updatedAt: string
  lesson?: { id: string; title: string; module: { course: { id: string; title: string; shortName: string } } } | null
}

export function MyNotesView() {
  const { navigate } = useAppStore()
  const qc = useQueryClient()
  const [q, setQ] = React.useState("")
  const [showEditor, setShowEditor] = React.useState(false)
  const [draftTitle, setDraftTitle] = React.useState("")
  const [draftContent, setDraftContent] = React.useState("")
  const [draftColor, setDraftColor] = React.useState("emerald")
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<{ notes: NoteItem[] }>({
    queryKey: ["notes", "all"],
    queryFn: () => api("/api/notes"),
  })

  const allNotes = data?.notes ?? []
  const notes = allNotes.filter(
    (n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase())
  )

  const pinnedNotes = notes.filter((n) => n.pinned)
  const otherNotes = notes.filter((n) => !n.pinned)

  const createMutation = useMutation({
    mutationFn: (body: any) => api("/api/notes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] })
      qc.invalidateQueries({ queryKey: ["me"] })
      setShowEditor(false); setDraftTitle(""); setDraftContent("")
      toast.success("Note created")
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => api(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setEditingId(null); toast.success("Note updated") },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); qc.invalidateQueries({ queryKey: ["me"] }); toast.success("Note deleted") },
  })

  function startEdit(n: NoteItem) {
    setEditingId(n.id); setDraftTitle(n.title); setDraftContent(n.content); setDraftColor(n.color); setShowEditor(true)
  }
  function save() {
    if (!draftTitle.trim() && !draftContent.trim()) return
    if (editingId) updateMutation.mutate({ id: editingId, title: draftTitle || "Untitled", content: draftContent, color: draftColor })
    else createMutation.mutate({ title: draftTitle || "Untitled note", content: draftContent, color: draftColor })
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 right-0 w-[400px] h-[300px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized editorial
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
              PERSONAL KNOWLEDGE BASE
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            Your <span className="text-gradient-premium">notes.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              A searchable archive of insights, definitions, and observations captured during your studies.
              Pin the essentials, color-code by topic.
            </p>
            <Button
              onClick={() => { setEditingId(null); setDraftTitle(""); setDraftContent(""); setDraftColor("emerald"); setShowEditor(true) }}
              className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
            >
              <Plus className="h-4 w-4" /> New Note
            </Button>
          </div>
        </ScrollReveal>

        {/* ====================================================
            SEARCH + STATS BAR - open, editorial
            ==================================================== */}
        <ScrollReveal delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                className="pl-10 bg-card/30 border-border/60 h-11"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div>
                <div className="text-2xl font-bold font-mono text-amber-300">{pinnedNotes.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Pinned</div>
              </div>
              <div className="h-8 w-px bg-border/40" />
              <div>
                <div className="text-2xl font-bold font-mono text-violet-300">{allNotes.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Total</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ====================================================
            EDITOR - premium floating panel
            ==================================================== */}
        {showEditor && (
          <FadeIn className="mb-12">
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-card/40 backdrop-blur-xl p-6 lg:p-8">
              <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-32 bg-violet-600/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-violet-300" />
                    <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">
                      {editingId ? "EDITING NOTE" : "NEW NOTE"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-violet-500/10" onClick={() => setShowEditor(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <Input
                    placeholder="Note title..."
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="bg-background/50 border-border/60 text-lg font-medium h-12"
                  />
                  <Textarea
                    placeholder="Write your note here. Markdown is supported in lessons..."
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    className="min-h-[140px] bg-background/50 border-border/60 resize-none"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mr-2">COLOR</span>
                      {NOTE_COLORS.slice(1).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setDraftColor(c.id)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                            c.bg, c.border,
                            draftColor === c.id ? "scale-125 ring-2 ring-offset-2 ring-offset-background ring-violet-500/50" : ""
                          )}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={save}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" /> {editingId ? "Update" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        {/* ====================================================
            NOTES GRID
            ==================================================== */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState hasQuery={!!q} onCreate={() => setShowEditor(true)} />
        ) : (
          <div className="space-y-12">
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <section>
                <ScrollReveal>
                  <div className="flex items-center gap-2 mb-6">
                    <Pin className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                    <span className="text-[10px] font-mono text-amber-300 tracking-[0.3em]">PINNED</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-2">{pinnedNotes.length}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent ml-3" />
                  </div>
                </ScrollReveal>
                <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.06}>
                  {pinnedNotes.map((n) => (
                    <StaggerItem key={n.id}>
                      <NoteCard
                        note={n}
                        onEdit={() => startEdit(n)}
                        onTogglePin={() => updateMutation.mutate({ id: n.id, pinned: !n.pinned })}
                        onDelete={() => deleteMutation.mutate(n.id)}
                        onNavigate={(lessonId, courseId) => navigate({ name: "lesson", lessonId, courseId })}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* Other notes */}
            {otherNotes.length > 0 && (
              <section>
                <ScrollReveal>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
                      {pinnedNotes.length > 0 ? "ALL OTHER NOTES" : "NOTES"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-2">{otherNotes.length}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent ml-3" />
                  </div>
                </ScrollReveal>
                <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.06}>
                  {otherNotes.map((n) => (
                    <StaggerItem key={n.id}>
                      <NoteCard
                        note={n}
                        onEdit={() => startEdit(n)}
                        onTogglePin={() => updateMutation.mutate({ id: n.id, pinned: !n.pinned })}
                        onDelete={() => deleteMutation.mutate(n.id)}
                        onNavigate={(lessonId, courseId) => navigate({ name: "lesson", lessonId, courseId })}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Empty State - editorial
   ============================================================ */
function EmptyState({ hasQuery, onCreate }: { hasQuery: boolean; onCreate: () => void }) {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
            <StickyNote className="h-7 w-7 text-violet-300" />
          </div>
          <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">
            {hasQuery ? "Nothing found" : "Begin your archive"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {hasQuery
              ? "Try a different search term, or create a new note."
              : "Capture insights, definitions, and ideas as you study. Your knowledge base starts with the first note."}
          </p>
          <Button onClick={onCreate} className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5">
            <Plus className="h-4 w-4" /> Create Note <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </FadeIn>
  )
}

/* ============================================================
   Note Card - premium with color coding
   ============================================================ */
function NoteCard({
  note,
  onEdit,
  onTogglePin,
  onDelete,
  onNavigate,
}: {
  note: NoteItem
  onEdit: () => void
  onTogglePin: () => void
  onDelete: () => void
  onNavigate: (lessonId: string, courseId: string) => void
}) {
  const col = NOTE_COLORS.find((c) => c.id === note.color) ?? NOTE_COLORS[0]
  const isPinned = note.pinned

  return (
    <CursorGlow className="group h-full" color="oklch(0.6 0.2 295 / 0.07)">
      <div className={cn(
        "relative h-full overflow-hidden rounded-2xl border p-5 flex flex-col transition-all duration-300",
        "hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.55_0.24_295_/_0.25)]",
        col.bg, col.border, "border"
      )}>
        {/* Top accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-px",
          isPinned ? "bg-gradient-to-r from-amber-500/40 via-amber-500/20 to-transparent" : "bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent"
        )} />

        {/* Hover actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-medium text-sm line-clamp-1 flex-1 leading-snug">{note.title}</h3>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onTogglePin}
              className={cn("p-1 rounded hover:bg-background/50", isPinned ? "text-amber-300" : "text-muted-foreground hover:text-amber-300")}
              aria-label="Toggle pin"
            >
              <Pin className="h-3 w-3" fill={isPinned ? "currentColor" : "none"} />
            </button>
            <button onClick={onEdit} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-violet-300" aria-label="Edit note">
              <PenLine className="h-3 w-3" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-rose-400" aria-label="Delete note">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6 flex-1 leading-relaxed">{note.content}</p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
          {note.lesson ? (
            <button
              onClick={() => onNavigate(note.lesson!.id, note.lesson!.module.course.id)}
              className="text-[10px] text-muted-foreground hover:text-violet-300 flex items-center gap-1 min-w-0 transition-colors"
            >
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="truncate font-mono">{note.lesson.module.course.shortName}</span>
            </button>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> General
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Pinned indicator */}
        {isPinned && (
          <div className="absolute top-3 right-3 opacity-100 group-hover:opacity-0 transition-opacity">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
              <Pin className="h-2.5 w-2.5 text-amber-300" fill="currentColor" />
            </div>
          </div>
        )}
      </div>
    </CursorGlow>
  )
}
