"use client"

/**
 * AI Course Architect — Studio dialogs.
 *
 * Three review-before-apply surfaces onto /api/ai/course-architect:
 *  1. BlueprintDialog      → course-page sections (what you will learn, prerequisites, tools, careers…)
 *  2. CurriculumDialog     → full in-depth module/lesson plan, appended to the course
 *  3. LessonDeepDiveDialog → expand a single lesson into teaching-grade content
 *
 * Nothing is written to the DB unless the human presses an Apply/Create
 * button — the agent fills the editor, the author stays in charge.
 */

import * as React from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sparkles, Loader2, AlertTriangle, RefreshCw, Bot, FileText, FlaskConical,
  FileVideo, FileCheck, ChevronDown, ChevronRight, Wand2, ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

interface ArchitectCourseContext {
  id: string
  title: string
  category: string
  level: string
  description?: string
  tags?: string
  durationHours?: number
  certBody?: string | null
}

const LESSON_TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  reading: { label: "Reading", icon: FileText, color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  lab: { label: "Lab", icon: FlaskConical, color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  video: { label: "Video", icon: FileVideo, color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  pdf: { label: "PDF", icon: FileCheck, color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" },
}

function ArchitectHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-violet-500/15 border border-violet-500/30 shrink-0">
        <Bot className="h-4.5 w-4.5 text-violet-300" />
      </div>
      <div className="min-w-0">
        <DialogTitle className="flex items-center gap-2 text-base">
          AI Course Architect <Badge variant="outline" className="text-[9px] font-mono text-violet-300 border-violet-500/30 bg-violet-500/10">CYBER AGENT</Badge>
        </DialogTitle>
        <DialogDescription className="text-xs mt-0.5">{subtitle}</DialogDescription>
      </div>
    </div>
  )
}

function GeneratingState({ label }: { label: string }) {
  return (
    <div className="py-8 space-y-4">
      <div className="flex items-center gap-2.5 text-sm text-violet-200">
        <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
        {label}
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-3/4 rounded bg-muted/40" />
        <Skeleton className="h-4 w-full rounded bg-muted/40" />
        <Skeleton className="h-4 w-5/6 rounded bg-muted/40" />
        <Skeleton className="h-4 w-2/3 rounded bg-muted/40" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        The agent is reasoning over its cybersecurity domain knowledge — deep work takes 30-90 seconds.
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-6 text-center">
      <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
      <p className="text-sm font-medium text-rose-300 mb-1">The Architect hit a snag</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="border-border/60">
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry generation
      </Button>
    </div>
  )
}

function ReviewNote() {
  return (
    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
      <ShieldCheck className="h-3 w-3 text-emerald-400" />
      Review-before-apply: nothing is saved until you commit it below.
    </p>
  )
}

// ---------------------------------------------------------------------------
// 1. Blueprint — course page sections
// ---------------------------------------------------------------------------

const BLUEPRINT_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "longDescription", label: "Long description", hint: "Course page overview — 2-3 paragraphs" },
  { key: "whatYouWillLearn", label: "What you will learn", hint: "Outcome checklist on the public page" },
  { key: "prerequisites", label: "Prerequisites", hint: "Ordered foundational → specific" },
  { key: "whoShouldAttend", label: "Who should attend", hint: "Right-fit audience" },
  { key: "toolsCovered", label: "Tools covered", hint: "Hands-on tooling used in labs" },
  { key: "careerOutcomes", label: "Career outcomes", hint: "Roles this course feeds" },
]

export function BlueprintDialog({
  open,
  onOpenChange,
  course,
  onApply,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  course: ArchitectCourseContext
  onApply: (fields: Record<string, string>) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<Record<string, string> | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [runId, setRunId] = React.useState(0)

  const generate = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api<{ ok: boolean; blueprint: Record<string, any>; source?: string; warning?: string }>("/api/ai/course-architect", {
        method: "POST",
        body: JSON.stringify({ action: "blueprint", courseId: course.id }),
      })
      if (res.warning) toast.info(res.warning, { duration: 8000 })
      const bp = res.blueprint || {}
      const normalized: Record<string, string> = {}
      for (const f of BLUEPRINT_FIELDS) {
        const v = bp[f.key]
        normalized[f.key] = Array.isArray(v) ? v.join("\n") : String(v || "")
      }
      normalized.tags = String(bp.tags || "").replace(/,\s*/g, ", ")
      setResult(normalized)
      setSelected(new Set(BLUEPRINT_FIELDS.map((f) => f.key).concat(["tags"])))
    } catch (e: any) {
      setError(e?.message || "Generation failed")
    } finally {
      setLoading(false)
    }
  }, [course.id])

  React.useEffect(() => {
    if (open) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runId])

  const applySelected = () => {
    if (!result) return
    const fields: Record<string, string> = {}
    for (const key of selected) fields[key] = result[key] ?? ""
    if (!Object.keys(fields).length) {
      toast.error("Select at least one section to apply")
      return
    }
    onApply(fields)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <ArchitectHeader subtitle={`Authoring the public course page for "${course.title}" from its ${course.category} domain knowledge.`} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
          {loading ? (
            <GeneratingState label="Architect is drafting your course page sections…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setRunId((n) => n + 1)} />
          ) : result ? (
            <div className="space-y-4 py-2">
              {BLUEPRINT_FIELDS.map(({ key, label, hint }) => (
                <div key={key} className="rounded-lg border border-border/50 bg-background/40 p-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (v) next.add(key)
                          else next.delete(key)
                          return next
                        })
                      }
                    />
                    <Label className="text-xs font-semibold cursor-pointer">{label}</Label>
                    <span className="text-[10px] text-muted-foreground ml-auto">{hint}</span>
                  </div>
                  <Textarea
                    rows={key === "longDescription" ? 6 : 4}
                    value={result[key] ?? ""}
                    onChange={(e) => setResult((p) => ({ ...(p || {}), [key]: e.target.value }))}
                    className="bg-background/60 text-xs font-mono leading-relaxed"
                  />
                </div>
              ))}
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <Checkbox
                    checked={selected.has("tags")}
                    onCheckedChange={(v) =>
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (v) next.add("tags")
                        else next.delete("tags")
                        return next
                      })
                    }
                  />
                  <Label className="text-xs font-semibold cursor-pointer">Tags</Label>
                  <span className="text-[10px] text-muted-foreground ml-auto">search & discovery keywords</span>
                </div>
                <Input
                  value={result.tags ?? ""}
                  onChange={(e) => setResult((p) => ({ ...(p || {}), tags: e.target.value }))}
                  className="bg-background/60 text-xs font-mono"
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border/60 pt-3">
          <ReviewNote />
          <div className="flex items-center gap-2 ml-auto">
            {result && (
              <Button variant="outline" size="sm" onClick={() => setRunId((n) => n + 1)} className="border-border/60">
                <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </Button>
            )}
            <Button
              size="sm"
              onClick={applySelected}
              disabled={!result}
              className="bg-violet-600 hover:bg-violet-500"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Apply selected to form
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// 2. Curriculum — in-depth modules & lessons (append)
// ---------------------------------------------------------------------------

interface PlannedLesson {
  title: string
  type: string
  durationMin?: number
  preview?: boolean
  content?: string
}
interface PlannedModule {
  title: string
  description?: string
  lessons: PlannedLesson[]
}

export function CurriculumDialog({
  open,
  onOpenChange,
  course,
  existingModuleCount,
  onApplied,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  course: ArchitectCourseContext
  existingModuleCount: number
  onApplied: () => void
}) {
  const [stage, setStage] = React.useState<"params" | "loading" | "review" | "applying">("params")
  const [error, setError] = React.useState<string | null>(null)
  const [modules, setModules] = React.useState<PlannedModule[]>([])
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set([0]))
  const [moduleCount, setModuleCount] = React.useState("6")
  const [depth, setDepth] = React.useState("standard")
  const [focusNotes, setFocusNotes] = React.useState("")
  const [confirmAppend, setConfirmAppend] = React.useState(false)
  const [runId, setRunId] = React.useState(0)

  const generate = React.useCallback(async () => {
    setStage("loading")
    setError(null)
    try {
      const res = await api<{ ok: boolean; modules: PlannedModule[]; source?: string; warning?: string }>("/api/ai/course-architect", {
        method: "POST",
        body: JSON.stringify({
          action: "curriculum",
          courseId: course.id,
          moduleCount: parseInt(moduleCount, 10) || 6,
          depth,
          focusNotes,
        }),
      })
      if (res.warning) toast.info(res.warning, { duration: 8000 })
      setModules(res.modules || [])
      setSelected(new Set((res.modules || []).map((_, i) => i)))
      setExpanded(new Set([0]))
      setStage("review")
    } catch (e: any) {
      setError(e?.message || "Generation failed")
      setStage("params")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, moduleCount, depth, focusNotes])

  React.useEffect(() => {
    if (open && runId > 0 && stage === "params") generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  React.useEffect(() => {
    if (open) {
      setStage("params")
      setError(null)
    }
  }, [open])

  const selectedModules = modules.filter((_, i) => selected.has(i))
  const selectedLessons = selectedModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)
  const totalMin = selectedModules.reduce(
    (acc, m) => acc + (m.lessons || []).reduce((a, l) => a + (l.durationMin || 0), 0),
    0,
  )

  const applyCurriculum = async () => {
    setConfirmAppend(false)
    setStage("applying")
    try {
      const res = await api<{ ok: boolean; createdModules: number; createdLessons: number }>(
        "/api/ai/course-architect",
        {
          method: "POST",
          body: JSON.stringify({ action: "apply_curriculum", courseId: course.id, modules: selectedModules }),
        },
      )
      toast.success(`Created ${res.createdModules} modules · ${res.createdLessons} lessons`)
      onApplied()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || "Failed to create modules")
      setStage("review")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <ArchitectHeader subtitle={`Designing an in-depth ${course.category} curriculum for "${course.title}".`} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
          {stage === "params" && (
            <div className="space-y-4 py-2">
              {error && <ErrorState message={error} onRetry={() => setRunId((n) => n + 1)} />}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Modules to generate</Label>
                  <Select value={moduleCount} onValueChange={setModuleCount}>
                    <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} modules</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Content depth</Label>
                  <Select value={depth} onValueChange={setDepth}>
                    <SelectTrigger className="bg-background/60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard — focused teaching content</SelectItem>
                      <SelectItem value="deep">Deep — 200-400 word lessons + full labs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Focus notes for the agent (optional)</Label>
                <Textarea
                  rows={3}
                  value={focusNotes}
                  onChange={(e) => setFocusNotes(e.target.value)}
                  placeholder="e.g. align to OSCP-style labs, emphasize Active Directory attack paths, include a blue-team detection module at the end…"
                  className="bg-background/60 text-sm"
                />
              </div>
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-1.5">
                <p className="text-xs font-medium text-violet-200 flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" /> What the agent will do
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Draws on its {course.category} domain knowledge to build {moduleCount} pedagogically-ordered
                  modules with specific tool-level lessons, hands-on labs (Objective / Steps / Deliverable),
                  framework mappings and a free-preview orientation lesson. You review every module before anything is created.
                </p>
              </div>
            </div>
          )}

          {stage === "loading" && (
            <GeneratingState label="The Architect is architecting your curriculum — 30-90 seconds…" />
          )}

          {stage === "review" && (
            <div className="space-y-2.5 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{modules.length} modules · {selectedLessons} lessons · ~{Math.round(totalMin / 60)}h of material</span>
                <Button variant="ghost" size="sm" onClick={() => setRunId((n) => n + 1)} className="h-7 text-[11px]">
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                </Button>
              </div>
              {modules.map((m, i) => {
                const isExpanded = expanded.has(i)
                const moduleLessons = m.lessons || []
                return (
                  <div key={i} className={cn(
                    "rounded-lg border overflow-hidden",
                    selected.has(i) ? "border-violet-500/30 bg-violet-500/5" : "border-border/40 bg-background/30 opacity-60",
                  )}>
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <Checkbox
                        checked={selected.has(i)}
                        onCheckedChange={(v) =>
                          setSelected((prev) => {
                            const next = new Set(prev)
                            if (v) next.add(i)
                            else next.delete(i)
                            return next
                          })
                        }
                      />
                      <button
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })
                        }
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{String(i + 1).padStart(2, "0")} · {m.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{moduleLessons.length} lessons · {m.description?.slice(0, 90)}</div>
                        </div>
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border/40 px-3 py-2 space-y-1.5">
                        {moduleLessons.map((l, j) => {
                          const meta = LESSON_TYPE_META[l.type] ?? LESSON_TYPE_META.reading
                          const Icon = meta.icon
                          return (
                            <div key={j} className="flex items-start gap-2 text-xs">
                              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono shrink-0 mt-0.5", meta.color)}>
                                <Icon className="h-2.5 w-2.5" /> {meta.label}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{l.title}</div>
                                {l.content && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                                    {String(l.content).replace(/[#*`>\-]/g, "").slice(0, 180)}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">{l.durationMin ?? 15}m</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {stage === "applying" && (
            <GeneratingState label="Creating your modules and lessons…" />
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border/60 pt-3">
          <ReviewNote />
          <div className="flex items-center gap-2 ml-auto">
            {stage === "review" && (
              <>
                <span className="text-[11px] font-mono text-muted-foreground mr-1">
                  +{selectedModules.length} modules · +{selectedLessons} lessons
                </span>
                <Button
                  size="sm"
                  disabled={!selectedModules.length}
                  onClick={() => {
                    if (existingModuleCount > 0) setConfirmAppend(true)
                    else applyCurriculum()
                  }}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Create modules
                </Button>
              </>
            )}
            {stage === "params" && (
              <Button size="sm" onClick={generate} className="bg-violet-600 hover:bg-violet-500">
                <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate curriculum
              </Button>
            )}
          </div>
        </DialogFooter>

        {/* Append confirmation */}
        <AlertDialog open={confirmAppend} onOpenChange={setConfirmAppend}>
          <AlertDialogContent className="bg-card border-border/60">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Append to existing course?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-relaxed">
                This course already has <b>{existingModuleCount} module(s)</b>. The Architect will ADD{" "}
                {selectedModules.length} new modules ({selectedLessons} lessons) after the existing ones —
                nothing is deleted or reordered. You can restructure afterwards in the content tree.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border/60 text-xs">Review again</AlertDialogCancel>
              <AlertDialogAction onClick={applyCurriculum} className="bg-violet-600 hover:bg-violet-500 text-xs">
                Append {selectedModules.length} modules
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// 3. Lesson deep-dive — expand a single lesson
// ---------------------------------------------------------------------------

export function LessonDeepDiveDialog({
  open,
  onOpenChange,
  course,
  lesson,
  onApply,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  course: ArchitectCourseContext
  lesson: { id: string; title: string; type: string; content: string }
  onApply: (content: string, title: string, durationMin: number) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{ title: string; content: string; durationMin: number } | null>(null)
  const [runId, setRunId] = React.useState(0)

  const generate = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api<{ ok: boolean; lesson: { title: string; content: string; durationMin: number } }>(
        "/api/ai/course-architect",
        {
          method: "POST",
          body: JSON.stringify({ action: "lesson", courseId: course.id, lessonId: lesson.id }),
        },
      )
      setResult(res.lesson)
    } catch (e: any) {
      setError(e?.message || "Generation failed")
    } finally {
      setLoading(false)
    }
  }, [course.id, lesson.id])

  React.useEffect(() => {
    if (open) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <ArchitectHeader subtitle={`Expanding "${lesson.title}" into full teaching content from ${course.category} expertise.`} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
          {loading ? (
            <GeneratingState label="The Architect is writing the full lesson…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setRunId((n) => n + 1)} />
          ) : result ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono text-violet-300 border-violet-500/30 bg-violet-500/10">
                  {result.durationMin} min
                </Badge>
                <span className="text-sm font-semibold truncate">{result.title}</span>
              </div>
              <Textarea
                rows={16}
                value={result.content}
                onChange={(e) => setResult((p) => (p ? { ...p, content: e.target.value } : p))}
                className="bg-background/60 text-xs font-mono leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground">
                Markdown — edits here carry into the lesson editor when applied.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border/60 pt-3">
          <ReviewNote />
          <div className="flex items-center gap-2 ml-auto">
            {result && (
              <Button variant="outline" size="sm" onClick={() => setRunId((n) => n + 1)} className="border-border/60">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </Button>
            )}
            <Button
              size="sm"
              disabled={!result}
              onClick={() => {
                if (!result) return
                onApply(result.content, result.title, result.durationMin)
                onOpenChange(false)
              }}
              className="bg-violet-600 hover:bg-violet-500"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Use in lesson editor
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
