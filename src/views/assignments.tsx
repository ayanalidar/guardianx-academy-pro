"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  ClipboardList,
  Clock,
  FileText,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Star,
  Users,
  BookOpen,
  Send,
  Lock,
  Award,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import {
  ScrollReveal, CursorGlow, Stagger, StaggerItem, Counter, FadeIn,
} from "@/components/platform/motion-system"

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type SubmissionStatus =
  | "missing"
  | "submitted"
  | "resubmitted"
  | "graded"
  | "returned"

interface CourseRef {
  id: string
  title: string
  shortName: string
  color: string
  thumbnail: string | null
}

interface SubmissionRef {
  id: string
  assignmentId: string
  status: string
  late: boolean
  grade: number | null
  submittedAt: string
  gradedAt: string | null
}

interface AssignmentItem {
  id: string
  title: string
  description: string
  pointsPossible: number
  dueDate: string
  submissionType: string
  allowLate: boolean
  latePenalty: number
  enablePeerReview: boolean
  peerReviewCount: number
  peerReviewDueDate: string | null
  course: CourseRef
  submission: SubmissionRef | null
  status: SubmissionStatus
  dueSoon: boolean
  overdue: boolean
  submissionsCount: number
}

interface AssignmentStats {
  total: number
  dueSoon: number
  overdue: number
  missing: number
  submitted: number
  graded: number
}

interface AssignmentDetail {
  id: string
  title: string
  description: string
  instructions: string | null
  pointsPossible: number
  dueDate: string
  submissionType: string
  allowLate: boolean
  latePenalty: number
  enablePeerReview: boolean
  peerReviewCount: number
  peerReviewDueDate: string | null
}

interface PeerSubmissionToReview {
  id: string
  content: string
  fileUrl: string | null
  submittedAt: string
  late: boolean
  user: { id: string; name: string; avatar: string | null; title: string | null }
}

interface PeerReviewCompleted {
  id: string
  rating: number
  feedback: string
  submittedAt: string
  submission: { id: string; user: { id: string; name: string; avatar: string | null; title: string | null } }
}

interface PeerReviewResponse {
  assignment: {
    id: string
    title: string
    description: string
    instructions: string | null
    pointsPossible: number
    dueDate: string
    peerReviewCount: number
    peerReviewDueDate: string | null
    course: CourseRef
  }
  toReview: PeerSubmissionToReview[]
  completed: PeerReviewCompleted[]
  progress?: { completed: number; target: number; remaining: number }
  needsOwnSubmission?: boolean
  message?: string
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function dueLabel(iso: string): { text: string; date: Date } {
  const date = new Date(iso)
  return {
    text: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    date,
  }
}

function statusBadge(status: SubmissionStatus, overdue: boolean) {
  if (overdue && status === "missing") {
    return (
      <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
      </Badge>
    )
  }
  switch (status) {
    case "missing":
      return (
        <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      )
    case "submitted":
      return (
        <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <Send className="h-3 w-3 mr-1" /> Submitted
        </Badge>
      )
    case "resubmitted":
      return (
        <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <Send className="h-3 w-3 mr-1" /> Resubmitted
        </Badge>
      )
    case "returned":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" /> Returned
        </Badge>
      )
    case "graded":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Graded
        </Badge>
      )
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Main View                                                          */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | "pending" | "submitted" | "graded" | "overdue"

export function AssignmentsView() {
  const { navigate } = useAppStore()
  const qc = useQueryClient()
  const [tab, setTab] = React.useState<FilterTab>("all")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [peerReviewOpen, setPeerReviewOpen] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<{ assignments: AssignmentItem[]; stats: AssignmentStats }>({
    queryKey: ["me", "assignments"],
    queryFn: () => api("/api/me/assignments"),
  })

  const assignments = data?.assignments ?? []

  function bucketFor(a: AssignmentItem): Exclude<FilterTab, "all"> | null {
    if (a.overdue) return "overdue"
    if (a.status === "graded") return "graded"
    if (a.status === "submitted" || a.status === "resubmitted" || a.status === "returned")
      return "submitted"
    if (a.status === "missing") return "pending"
    return null
  }

  const filtered =
    tab === "all" ? assignments : assignments.filter((a) => bucketFor(a) === tab)

  const pendingCount = assignments.filter((a) => a.status === "missing" && !a.overdue).length
  const submittedCount = assignments.filter(
    (a) => a.status === "submitted" || a.status === "resubmitted" || a.status === "returned"
  ).length
  const gradedCount = assignments.filter((a) => a.status === "graded").length
  const overdueCount = assignments.filter((a) => a.overdue).length

  const statCards = [
    { key: "pending", label: "Pending", value: pendingCount, icon: Clock, accent: "text-amber-300", glow: "bg-amber-500/8", dot: "bg-amber-400" },
    { key: "submitted", label: "Submitted", value: submittedCount, icon: Send, accent: "text-cyan-300", glow: "bg-cyan-500/8", dot: "bg-cyan-400" },
    { key: "graded", label: "Graded", value: gradedCount, icon: CheckCircle2, accent: "text-emerald-300", glow: "bg-emerald-500/8", dot: "bg-emerald-400" },
    { key: "overdue", label: "Overdue", value: overdueCount, icon: AlertTriangle, accent: "text-rose-300", glow: "bg-rose-500/8", dot: "bg-rose-400" },
  ]

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 left-0 w-[400px] h-[300px] bg-amber-500/4 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized editorial
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
              SUBMISSIONS · GRADING · PEER REVIEW
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            <span className="text-gradient-premium">Assignments.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <p className="text-muted-foreground max-w-xl mb-12 text-sm leading-relaxed">
            Your pending and graded work across all enrolled courses. Track due dates,
            submit work, and review your peers - all in one command center.
          </p>
        </ScrollReveal>

        {/* ====================================================
            STATS - open editorial, not card grid
            ==================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
            : statCards.map((s, i) => (
                <ScrollReveal key={s.key} delay={0.2 + i * 0.08}>
                  <CursorGlow className="group h-full" color="oklch(0.6 0.2 295 / 0.05)">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-6 hover:border-violet-500/30 transition-colors">
                      <div className={cn("absolute inset-0 opacity-50", s.glow)} />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn("h-2 w-2 rounded-full", s.dot)} />
                          <s.icon className={cn("h-5 w-5", s.accent)} />
                        </div>
                        <div className="text-5xl font-bold font-mono mb-2 tracking-tight">
                          <Counter value={s.value} />
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                          {s.label}
                        </div>
                      </div>
                    </div>
                  </CursorGlow>
                </ScrollReveal>
              ))}
        </div>

        {/* ====================================================
            FILTER TABS
            ==================================================== */}
        <ScrollReveal delay={0.3}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList className="bg-card/30 backdrop-blur border border-border/60 h-auto p-1 grid w-full grid-cols-2 sm:grid-cols-5 max-w-2xl">
              <TabsTrigger value="all" className="py-2 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200">All</TabsTrigger>
              <TabsTrigger value="pending" className="py-2 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-200">Pending</TabsTrigger>
              <TabsTrigger value="submitted" className="py-2 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">Submitted</TabsTrigger>
              <TabsTrigger value="graded" className="py-2 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-200">Graded</TabsTrigger>
              <TabsTrigger value="overdue" className="py-2 text-rose-400 data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-200">
                Overdue
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-8">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyAssignments tab={tab} onBrowse={() => navigate({ name: "catalog" })} />
              ) : (
                <Stagger className="space-y-4" staggerChildren={0.06}>
                  {filtered.map((a) => (
                    <StaggerItem key={a.id}>
                      <AssignmentCard
                        assignment={a}
                        onOpen={() => setSelectedId(a.id)}
                        onOpenPeerReview={() => setPeerReviewOpen(a.id)}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </TabsContent>
          </Tabs>
        </ScrollReveal>

        {/* Submission / detail dialog */}
        <AssignmentDialog
          assignmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ["me", "assignments"] })
          }}
        />

        {/* Peer review dialog */}
        <PeerReviewDialog
          assignmentId={peerReviewOpen}
          onClose={() => setPeerReviewOpen(null)}
          onReviewed={() => {
            qc.invalidateQueries({ queryKey: ["me", "assignments"] })
          }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyAssignments({ tab, onBrowse }: { tab: FilterTab; onBrowse: () => void }) {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
            <ClipboardList className="h-7 w-7 text-violet-300" />
          </div>
          <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">No assignments here</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {tab === "all"
              ? "You don't have any assignments across enrolled courses yet."
              : `Nothing in the "${tab}" bucket right now.`}
          </p>
          <Button onClick={onBrowse} className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5">
            <BookOpen className="h-4 w-4" /> Browse Courses <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </FadeIn>
  )
}

/* ------------------------------------------------------------------ */
/* Assignment Card - editorial, horizontal                            */
/* ------------------------------------------------------------------ */

function AssignmentCard({
  assignment,
  onOpen,
  onOpenPeerReview,
}: {
  assignment: AssignmentItem
  onOpen: () => void
  onOpenPeerReview: () => void
}) {
  const due = dueLabel(assignment.dueDate)
  return (
    <CursorGlow className="group" color="oklch(0.6 0.2 295 / 0.05)">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 lg:p-6 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-0.5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Course monogram */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/5 border border-violet-500/20 font-mono font-bold text-sm text-violet-200">
              {assignment.course.shortName.slice(0, 3)}
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-background border border-border" />
            </div>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h3 className="font-semibold text-base truncate group-hover:text-violet-200 transition-colors">
                {assignment.title}
              </h3>
              {statusBadge(assignment.status, assignment.overdue)}
              {assignment.dueSoon && !assignment.overdue && (
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
                  <Clock className="h-3 w-3 mr-1" /> Due soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2.5">
              {assignment.description || "No description provided."}
            </p>
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              <span className="font-mono text-[10px] tracking-[0.15em] text-violet-300/80">
                {assignment.course.shortName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Due {due.text}
              </span>
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" /> {assignment.pointsPossible} pts
              </span>
              {assignment.submission?.late && (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Late
                </span>
              )}
              {assignment.submission?.grade != null && (
                <span className="text-emerald-300 font-mono font-bold">
                  Grade: {assignment.submission.grade}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {assignment.enablePeerReview && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
                onClick={onOpenPeerReview}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Peer Review</span>
              </Button>
            )}
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
              onClick={onOpen}
            >
              {assignment.submission ? "View" : "Open"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </CursorGlow>
  )
}

/* ------------------------------------------------------------------ */
/* Assignment Detail + Submission Dialog                              */
/* ------------------------------------------------------------------ */

function AssignmentDialog({
  assignmentId,
  onClose,
  onSubmitted,
}: {
  assignmentId: string | null
  onClose: () => void
  onSubmitted: () => void
}) {
  const qc = useQueryClient()
  const [content, setContent] = React.useState("")
  const [fileUrl, setFileUrl] = React.useState("")

  const { data, isLoading } = useQuery<{ assignment: AssignmentDetail }>({
    queryKey: ["assignment", assignmentId],
    queryFn: () => api(`/api/assignments/${assignmentId}`),
    enabled: !!assignmentId,
  })

  React.useEffect(() => {
    if (assignmentId) {
      setContent("")
      setFileUrl("")
    }
  }, [assignmentId])

  const assignment = data?.assignment

  const submitMutation = useMutation({
    mutationFn: (body: { content?: string; fileUrl?: string }) =>
      api(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Submission received!", {
        description: "Your instructor will grade it shortly.",
      })
      qc.invalidateQueries({ queryKey: ["assignment", assignmentId] })
      onSubmitted()
      onClose()
    },
    onError: (e: Error) => toast.error("Submission failed", { description: e.message }),
  })

  const canSubmit =
    content.trim().length > 0 || fileUrl.trim().length > 0

  return (
    <Dialog open={!!assignmentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-violet-300" />
            {isLoading ? "Loading…" : assignment?.title}
          </DialogTitle>
          <DialogDescription>
            {assignment
              ? `${assignment.pointsPossible} points · Due ${dueLabel(assignment.dueDate).text}`
              : "Assignment details"}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !assignment ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <section>
              <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                Description
              </Label>
              <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed">
                {assignment.description || "No description provided."}
              </p>
            </section>

            {assignment.instructions && (
              <section>
                <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  Instructions
                </Label>
                <div className="text-sm mt-2 whitespace-pre-wrap bg-card/50 border border-border/60 rounded-lg p-3 max-h-64 overflow-y-auto leading-relaxed">
                  {assignment.instructions}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-card/50 border border-border/60 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Submission Type</div>
                <div className="font-medium capitalize">{assignment.submissionType}</div>
              </div>
              <div className="bg-card/50 border border-border/60 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Late submissions</div>
                <div className="font-medium">
                  {assignment.allowLate ? `Allowed (-${assignment.latePenalty}%)` : "Not allowed"}
                </div>
              </div>
              <div className="bg-card/50 border border-border/60 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Peer review</div>
                <div className="font-medium">
                  {assignment.enablePeerReview
                    ? `${assignment.peerReviewCount} reviews`
                    : "Disabled"}
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-violet-300">
                Submit your work
              </Label>
              <div className="space-y-2">
                <Label htmlFor="submit-content">Content / Answer</Label>
                <Textarea
                  id="submit-content"
                  placeholder="Type or paste your submission here…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] bg-background/50 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submit-file">File URL (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="submit-file"
                    placeholder="https://drive.google.com/…"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="bg-background/50"
                  />
                  <Link2 className="h-4 w-4 text-muted-foreground self-center" />
                </div>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!canSubmit || submitMutation.isPending || !assignment}
            onClick={() =>
              submitMutation.mutate({
                content: content.trim() || undefined,
                fileUrl: fileUrl.trim() || undefined,
              })
            }
            className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit"}
            <Send className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Peer Review Dialog                                                 */
/* ------------------------------------------------------------------ */

function PeerReviewDialog({
  assignmentId,
  onClose,
  onReviewed,
}: {
  assignmentId: string | null
  onClose: () => void
  onReviewed: () => void
}) {
  const qc = useQueryClient()
  const [activeSubmissionId, setActiveSubmissionId] = React.useState<string | null>(null)
  const [rating, setRating] = React.useState(0)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [feedback, setFeedback] = React.useState("")

  const { data, isLoading } = useQuery<PeerReviewResponse>({
    queryKey: ["assignment", assignmentId, "peer-reviews"],
    queryFn: () => api(`/api/assignments/${assignmentId}/peer-reviews`),
    enabled: !!assignmentId,
  })

  React.useEffect(() => {
    if (assignmentId) {
      setActiveSubmissionId(null)
      setRating(0)
      setHoverRating(0)
      setFeedback("")
    }
  }, [assignmentId])

  const reviewMutation = useMutation({
    mutationFn: (body: { rating: number; feedback: string }) =>
      api(`/api/submissions/${activeSubmissionId}/peer-review`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Peer review submitted!", {
        description: "Thanks for helping a peer improve.",
      })
      qc.invalidateQueries({ queryKey: ["assignment", assignmentId, "peer-reviews"] })
      setActiveSubmissionId(null)
      setRating(0)
      setHoverRating(0)
      setFeedback("")
      onReviewed()
    },
    onError: (e: Error) => toast.error("Review failed", { description: e.message }),
  })

  const toReview = data?.toReview ?? []
  const completed = data?.completed ?? []
  const progress = data?.progress

  return (
    <Dialog open={!!assignmentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-cyan-300" /> Peer Review
          </DialogTitle>
          <DialogDescription>
            {data?.assignment?.title ?? "Review your peers' submissions"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : data?.needsOwnSubmission ? (
          <div className="py-8 text-center">
            <div className="inline-flex p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 mb-4">
              <Lock className="h-8 w-8 text-amber-300" />
            </div>
            <p className="font-semibold mb-2 text-lg">Submit your own work first</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{data.message}</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {progress && (
              <div className="bg-card/50 border border-border/60 rounded-lg p-3 flex items-center justify-between text-sm">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Progress</span>
                <span className="font-mono font-bold text-cyan-300">
                  {progress.completed} / {progress.target}
                </span>
              </div>
            )}

            {toReview.length === 0 && completed.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No peer submissions are available to review right now.
              </div>
            ) : null}

            {toReview.length > 0 && (
              <section>
                <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2 block">
                  To review ({toReview.length})
                </Label>
                <div className="space-y-2">
                  {toReview.map((s) => {
                    const active = activeSubmissionId === s.id
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-xl border p-3 cursor-pointer transition-all",
                          active
                            ? "border-cyan-500/40 bg-cyan-500/5"
                            : "border-border/60 bg-card/30 hover:border-cyan-500/30"
                        )}
                        onClick={() => {
                          setActiveSubmissionId(s.id)
                          setRating(0)
                          setHoverRating(0)
                          setFeedback("")
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            {s.user.avatar ? (
                              <AvatarImage src={s.user.avatar} alt={s.user.name} />
                            ) : null}
                            <AvatarFallback className="bg-cyan-500/10 text-cyan-300 text-xs">
                              {s.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{s.user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {timeAgo(s.submittedAt)}
                              {s.late && (
                                <span className="ml-2 text-rose-400">· Late</span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant={active ? "default" : "outline"}>
                            {active ? "Reviewing" : "Review"}
                          </Button>
                        </div>
                        {active && (
                          <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                            {s.content && (
                              <div className="text-sm whitespace-pre-wrap bg-background/50 rounded p-2 max-h-40 overflow-y-auto">
                                {s.content}
                              </div>
                            )}
                            {s.fileUrl && (
                              <a
                                href={s.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:underline"
                              >
                                <Link2 className="h-3 w-3" /> View attached file
                              </a>
                            )}

                            <div>
                              <Label className="text-xs text-muted-foreground">Rating</Label>
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    aria-label={`${n} stars`}
                                    onMouseEnter={() => setHoverRating(n)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(n)}
                                    className="p-0.5"
                                  >
                                    <Star
                                      className={cn(
                                        "h-6 w-6 transition-colors",
                                        (hoverRating || rating) >= n
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-muted-foreground"
                                      )}
                                    />
                                  </button>
                                ))}
                                <span className="ml-2 text-xs text-muted-foreground font-mono">
                                  {rating > 0 ? `${rating}/5` : "Select"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="peer-feedback" className="text-xs text-muted-foreground">
                                Feedback
                              </Label>
                              <Textarea
                                id="peer-feedback"
                                placeholder="Provide constructive feedback…"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="mt-1 min-h-[80px] bg-background/50 resize-none"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={
                                  rating < 1 ||
                                  reviewMutation.isPending
                                }
                                onClick={() =>
                                  reviewMutation.mutate({ rating, feedback: feedback.trim() })
                                }
                                className="bg-cyan-600 hover:bg-cyan-500 btn-premium gap-1.5"
                              >
                                {reviewMutation.isPending ? "Submitting…" : "Submit Review"}
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2 block">
                  Completed ({completed.length})
                </Label>
                <div className="space-y-2">
                  {completed.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border/60 bg-card/30 p-3 opacity-80">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-300 text-[10px]">
                            {r.submission.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{r.submission.user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          · {timeAgo(r.submittedAt)}
                        </span>
                        <Badge className="ml-auto bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Star className="h-3 w-3 mr-1 fill-amber-400" /> {r.rating}/5
                        </Badge>
                      </div>
                      {r.feedback && (
                        <p className="text-xs text-muted-foreground">{r.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
