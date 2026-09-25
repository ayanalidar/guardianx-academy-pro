"use client"

/**
 * AI Course Architect - Studio dialogs.
 *
 * Three review-before-apply surfaces onto /api/ai/course-architect:
 *  1. BlueprintDialog      → course-page sections (what you will learn, prerequisites, tools, careers…)
 *  2. CurriculumDialog     → full in-depth module/lesson plan, appended to the course
 *  3. LessonDeepDiveDialog → expand a single lesson into teaching-grade content
 *
 * Nothing is written to the DB unless the human presses an Apply/Create
 * button - the agent fills the editor, the author stays in charge.
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
        The agent is reasoning over its cybersecurity domain knowledge - deep work takes 30-90 seconds.
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
// 1. Blueprint - course page sections
// ---------------------------------------------------------------------------

const BLUEPRINT_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "longDescription", label: "Long description", hint: "Course page overview - 2-3 paragraphs" },
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
// 2. Curriculum - in-depth modules & lessons (append)
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
  initialFocusNotes,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  course: ArchitectCourseContext
  existingModuleCount: number
  onApplied: () => void
  initialFocusNotes?: string
}) {
  const [stage, setStage] = React.useState<"params" | "loading" | "review" | "applying">("params")
  const [error, setError] = React.useState<string | null>(null)
  const [modules, setModules] = React.useState<PlannedModule[]>([])
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set([0]))
  const [moduleCount, setModuleCount] = React.useState("6")
  const [depth, setDepth] = React.useState("standard")
  const [focusNotes, setFocusNotes] = React.useState("")
  const [reviewed, setReviewed] = React.useState(true)
  const [critique, setCritique] = React.useState<{ score?: number; verdict?: string; fixes?: string[] } | null>(null)
  const [confirmAppend, setConfirmAppend] = React.useState(false)
  const [runId, setRunId] = React.useState(0)

  const generate = React.useCallback(async () => {
    setStage("loading")
    setError(null)
    try {
      const res = await api<{ ok: boolean; modules: PlannedModule[]; source?: string; warning?: string; critique?: { score?: number; verdict?: string; fixes?: string[] } | null }>("/api/ai/course-architect", {
        method: "POST",
        body: JSON.stringify({
          action: "curriculum",
          courseId: course.id,
          moduleCount: parseInt(moduleCount, 10) || 6,
          depth,
          focusNotes,
          ...(reviewed ? { quality: "reviewed" } : {}),
        }),
      })
      if (res.warning) toast.info(res.warning, { duration: 8000 })
      setCritique(res.critique ?? null)
      setModules(res.modules || [])
      setSelected(new Set((res.modules || []).map((_, i) => i)))
      setExpanded(new Set([0]))
      setStage("review")
    } catch (e: any) {
      setError(e?.message || "Generation failed")
      setStage("params")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, moduleCount, depth, focusNotes, reviewed])

  React.useEffect(() => {
    if (open && runId > 0 && stage === "params") generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  React.useEffect(() => {
    if (open) {
      setStage("params")
      setError(null)
      setCritique(null)
      if (initialFocusNotes) setFocusNotes(initialFocusNotes)
    }
  }, [open, initialFocusNotes])

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
                      <SelectItem value="standard">Standard - focused teaching content</SelectItem>
                      <SelectItem value="deep">Deep - 200-400 word lessons + full labs</SelectItem>
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
              <label className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 cursor-pointer">
                <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="text-xs font-medium text-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Two-agent quality loop
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed block mt-0.5">
                    A second critic agent scores the draft (coverage, specificity, lab distribution, level calibration)
                    and a reviser applies its fixes before you ever see it. Slightly slower, noticeably better.
                  </span>
                </span>
              </label>
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
            <GeneratingState label="The Architect is architecting your curriculum - 30-90 seconds…" />
          )}

          {stage === "review" && (
            <div className="space-y-2.5 py-2">
              {critique && (
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Two-agent loop complete
                    {typeof critique.score === "number" && (
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-300 border-emerald-500/40 bg-emerald-500/10">
                        critic score {critique.score}/100
                      </Badge>
                    )}
                  </div>
                  {critique.verdict && <p className="text-[11px] text-muted-foreground mt-1">{critique.verdict}</p>}
                </div>
              )}
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
                {selectedModules.length} new modules ({selectedLessons} lessons) after the existing ones - 
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
// 3. Lesson deep-dive - expand a single lesson
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
                Markdown - edits here carry into the lesson editor when applied.
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

// ---------------------------------------------------------------------------
// 4. Syllabus Audit - the agent reviews the WHOLE course
// ---------------------------------------------------------------------------

interface AuditResult {
  scores: { coverage: number; depth: number; practicality: number; overall: number }
  strengths: string[]
  gaps: string[]
  recommendations: { title: string; detail: string; severity: "high" | "medium" | "low" }[]
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 75 ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
    : value >= 50 ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
    : "text-rose-300 border-rose-500/40 bg-rose-500/10"
  return (
    <div className={cn("rounded-lg border px-3 py-2 text-center", tone)}>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[9px] font-mono tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  )
}

export function AuditDialog({
  open,
  onOpenChange,
  course,
  onFeedToCurriculum,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  course: ArchitectCourseContext
  onFeedToCurriculum: (focusNotes: string) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [audit, setAudit] = React.useState<AuditResult | null>(null)
  const [runId, setRunId] = React.useState(0)

  const generate = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setAudit(null)
    try {
      const res = await api<{ ok: boolean; audit: AuditResult; source?: string; warning?: string }>(
        "/api/ai/course-architect",
        { method: "POST", body: JSON.stringify({ action: "audit", courseId: course.id }) },
      )
      if (res.warning) toast.info(res.warning, { duration: 8000 })
      setAudit(res.audit)
    } catch (e: any) {
      setError(e?.message || "Audit failed")
    } finally {
      setLoading(false)
    }
  }, [course.id])

  React.useEffect(() => {
    if (open) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runId])

  const focusFromAudit = React.useCallback(() => {
    if (!audit) return ""
    const recs = audit.recommendations.map((r) => `- ${r.title}: ${r.detail}`).join("\n")
    return `Address these syllabus-audit findings:\n${recs}`
  }, [audit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <ArchitectHeader subtitle={`Auditing "${course.title}" against senior-level ${course.category} expectations - coverage, depth, practicality.`} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
          {loading ? (
            <GeneratingState label="The Auditor is mapping your inventory against the domain knowledge base…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setRunId((n) => n + 1)} />
          ) : audit ? (
            <div className="space-y-4 py-2">
              {/* Scores */}
              <div className="grid grid-cols-4 gap-2">
                <ScoreChip label="COVERAGE" value={audit.scores.coverage} />
                <ScoreChip label="DEPTH" value={audit.scores.depth} />
                <ScoreChip label="PRACTICALITY" value={audit.scores.practicality} />
                <ScoreChip label="OVERALL" value={audit.scores.overall} />
              </div>

              {/* Strengths */}
              {audit.strengths.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-mono tracking-[0.2em] text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" /> STRENGTHS
                  </p>
                  {audit.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-foreground/90 leading-relaxed pl-4 border-l-2 border-emerald-500/30">• {s}</p>
                  ))}
                </div>
              )}

              {/* Gaps */}
              {audit.gaps.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-mono tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> GAPS FOUND
                  </p>
                  {audit.gaps.map((g, i) => (
                    <p key={i} className="text-xs text-foreground/90 leading-relaxed pl-4 border-l-2 border-amber-500/30">• {g}</p>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono tracking-[0.2em] text-violet-300 flex items-center gap-1.5">
                  <Bot className="h-3 w-3" /> PRIORITIZED FIX PLAN
                </p>
                {audit.recommendations.map((r, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-mono shrink-0",
                          r.severity === "high" ? "text-rose-300 border-rose-500/40 bg-rose-500/10"
                          : r.severity === "medium" ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
                          : "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
                        )}
                      >
                        {r.severity.toUpperCase()}
                      </Badge>
                      <p className="text-xs font-semibold text-foreground">{r.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border/60 pt-3">
          <ReviewNote />
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setRunId((n) => n + 1)} className="border-border/60">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-audit
            </Button>
            <Button
              size="sm"
              disabled={!audit}
              onClick={() => {
                onFeedToCurriculum(focusFromAudit())
                onOpenChange(false)
              }}
              className="bg-violet-600 hover:bg-violet-500"
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Fix with Curriculum Generator
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// 5. Assessment Bank - exam-grade question builder per module
// ---------------------------------------------------------------------------

interface BankQuestion {
  text: string
  options: string[]
  answerIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  domain: string
}

export function AssessmentDialog({
  open,
  onOpenChange,
  course,
  module,
  onApplied,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  course: ArchitectCourseContext
  module: { id: string; title: string; lessons: { id: string; title: string }[] }
  onApplied: (created: number) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [applying, setApplying] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [questions, setQuestions] = React.useState<BankQuestion[]>([])
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [targetLesson, setTargetLesson] = React.useState<string>("")
  const [runId, setRunId] = React.useState(0)

  const generate = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setQuestions([])
    try {
      const res = await api<{
        ok: boolean
        questions: BankQuestion[]
        module: { lessons: { id: string; title: string }[] }
        source?: string
        warning?: string
      }>("/api/ai/course-architect", {
        method: "POST",
        body: JSON.stringify({ action: "assessments", courseId: course.id, moduleId: module.id, count: 8 }),
      })
      if (res.warning) toast.info(res.warning, { duration: 8000 })
      setQuestions(res.questions || [])
      setSelected(new Set((res.questions || []).map((_, i) => i)))
      // Default the quiz target to the module's last lesson (same convention
      // the course generator uses) or let the author pick another.
      const lessons = res.module?.lessons || []
      setTargetLesson(lessons.length ? lessons[lessons.length - 1]!.id : "")
    } catch (e: any) {
      setError(e?.message || "Generation failed")
    } finally {
      setLoading(false)
    }
  }, [course.id, module.id])

  React.useEffect(() => {
    if (open) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runId])

  const applyAssessment = async () => {
    if (!targetLesson) {
      toast.error("This module has no lessons yet - add a lesson first, then attach the quiz.")
      return
    }
    setApplying(true)
    try {
      const payload = questions.filter((_, i) => selected.has(i))
      const res = await api<{ ok: boolean; created: number }>("/api/ai/course-architect", {
        method: "POST",
        body: JSON.stringify({
          action: "apply_assessments",
          courseId: course.id,
          lessonId: targetLesson,
          moduleTitle: module.title,
          questions: payload,
        }),
      })
      toast.success(`Created quiz with ${res.created} questions`)
      onApplied(res.created)
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || "Failed to create the quiz")
    } finally {
      setApplying(false)
    }
  }

  const DIFF_COLOR: Record<string, string> = {
    easy: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
    hard: "text-rose-300 border-rose-500/40 bg-rose-500/10",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <ArchitectHeader subtitle={`Exam-grade question bank for "${module.title}" - test application, not trivia.`} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
          {loading ? (
            <GeneratingState label="The Assessment Builder is writing exam-grade questions…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setRunId((n) => n + 1)} />
          ) : questions.length > 0 ? (
            <div className="space-y-2.5 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{questions.length} questions · {selected.size} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setRunId((n) => n + 1)} className="h-7 text-[11px]">
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                </Button>
              </div>
              {questions.map((q, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 space-y-2",
                    selected.has(i) ? "border-violet-500/30 bg-violet-500/5" : "border-border/40 bg-background/30 opacity-60",
                  )}
                >
                  <div className="flex items-start gap-2.5">
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
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-xs font-medium text-foreground leading-relaxed">{q.text}</p>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt, oi) => (
                          <p
                            key={oi}
                            className={cn(
                              "text-[11px] rounded-md px-2 py-1 border",
                              oi === q.answerIndex
                                ? "text-emerald-200 border-emerald-500/40 bg-emerald-500/10"
                                : "text-muted-foreground border-border/40 bg-background/40",
                            )}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </p>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <span className="text-emerald-300">Why:</span> {q.explanation}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[9px] font-mono", DIFF_COLOR[q.difficulty])}>
                          {q.difficulty.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground border-border/40">
                          {q.domain}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border/60 pt-3">
          <ReviewNote />
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            {module.lessons.length > 0 && (
              <Select value={targetLesson} onValueChange={setTargetLesson}>
                <SelectTrigger className="h-8 text-xs bg-background/60 min-w-[160px] flex-1 sm:flex-none">
                  <SelectValue placeholder="Attach quiz to lesson…" />
                </SelectTrigger>
                <SelectContent>
                  {module.lessons.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs max-w-[280px]">
                      {l.title.length > 44 ? `${l.title.slice(0, 44)}…` : l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              disabled={applying || !questions.length || !selected.size}
              onClick={applyAssessment}
              className="bg-violet-600 hover:bg-violet-500 shrink-0"
            >
              {applying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Create quiz ({selected.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
