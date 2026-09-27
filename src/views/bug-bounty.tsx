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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Bug,
  DollarSign,
  ExternalLink,
  Plus,
  Send,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListFilter,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   BugBountyView
   ============================================================ */

interface ProgramItem {
  id: string
  name: string
  platform: string
  url: string
  description: string
  scope: string
  rewardRange: string
  difficulty: string
  tags: string
  submissionsCount: number
  mySubmission: { id: string; status: string; severity: string } | null
}

interface SubmissionItem {
  id: string
  title: string
  description: string
  severity: string
  status: string
  bounty: string
  createdAt: string
  program: { id: string; name: string; platform: string; rewardRange: string } | null
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
  insane: "text-red-300",
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  medium: { color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  high: { color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  critical: { color: "text-red-300", bg: "bg-red-500/15", border: "border-red-500/40" },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  submitted: { color: "text-muted-foreground", bg: "bg-muted/40", label: "Submitted" },
  validated: { color: "text-cyan-300", bg: "bg-cyan-500/10", label: "Validated" },
  rewarded: { color: "text-emerald-300", bg: "bg-emerald-500/10", label: "Rewarded" },
  rejected: { color: "text-rose-300", bg: "bg-rose-500/10", label: "Rejected" },
}

const PLATFORM_COLORS: Record<string, string> = {
  GuardianX: "text-violet-300 border-violet-500/30",
  HackerOne: "text-cyan-300 border-cyan-500/30",
  Bugcrowd: "text-amber-300 border-amber-500/30",
}

export function BugBountyView() {
  const qc = useQueryClient()
  const [submitOpen, setSubmitOpen] = React.useState(false)
  const [selectedProgram, setSelectedProgram] = React.useState<ProgramItem | null>(null)

  // Form
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [severity, setSeverity] = React.useState("medium")

  const { data: programsData, isLoading: programsLoading } = useQuery<{ programs: ProgramItem[] }>({
    queryKey: ["bug-bounty", "programs"],
    queryFn: () => api("/api/bug-bounty"),
  })

  const { data: mineData, isLoading: mineLoading } = useQuery<{ submissions: SubmissionItem[] }>({
    queryKey: ["bug-bounty", "mine"],
    queryFn: () => api("/api/bug-bounty?mine=true"),
  })

  const submitFinding = useMutation({
    mutationFn: () =>
      api("/api/bug-bounty", {
        method: "POST",
        body: JSON.stringify({
          programId: selectedProgram?.id,
          title,
          description,
          severity,
        }),
      }),
    onSuccess: () => {
      toast.success("Finding submitted! Track its status in your submissions tab.")
      setSubmitOpen(false)
      setTitle("")
      setDescription("")
      setSeverity("medium")
      qc.invalidateQueries({ queryKey: ["bug-bounty", "programs"] })
      qc.invalidateQueries({ queryKey: ["bug-bounty", "mine"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const programs = programsData?.programs ?? []
  const mySubs = mineData?.submissions ?? []

  const openSubmit = (p: ProgramItem) => {
    setSelectedProgram(p)
    setSubmitOpen(true)
  }

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
              BUG BOUNTY · RESPONSIBLE DISCLOSURE PROGRAMS
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Bug <span className="text-gradient-premium">Bounty</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-12">
            Discover vulnerability disclosure programs, submit findings, and earn bounties - all tracked in one place.
          </p>
        </ScrollReveal>

        <Tabs defaultValue="programs">
          <TabsList className="mb-8">
            <TabsTrigger value="programs" className="flex items-center gap-1.5">
              <Bug className="h-3.5 w-3.5" /> Programs
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5" /> My Submissions
              {mySubs.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{mySubs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- Programs ---- */}
          <TabsContent value="programs">
            {programsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((p, i) => {
                  const platformColor = PLATFORM_COLORS[p.platform] ?? "text-muted-foreground"
                  return (
                    <ScrollReveal key={p.id} delay={0.04 + i * 0.04}>
                      <div className="card-premium rounded-2xl p-5 h-full flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="outline" className={cn("text-[10px]", platformColor)}>{p.platform}</Badge>
                          <Badge variant="outline" className={cn("capitalize text-[10px]", DIFFICULTY_COLORS[p.difficulty])}>
                            {p.difficulty}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2 line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{p.description}</p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0" />
                            <span className="font-mono text-emerald-300">{p.rewardRange}</span>
                          </div>
                          {p.scope && (
                            <div className="text-[10px] font-mono text-muted-foreground line-clamp-2">
                              <span className="text-violet-300">SCOPE: </span>{p.scope}
                            </div>
                          )}
                          {p.tags && (
                            <div className="flex flex-wrap gap-1">
                              {p.tags.split(",").slice(0, 3).map((t) => (
                                <span key={t} className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-muted/40 text-muted-foreground">
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {p.submissionsCount} submissions
                          </span>
                          {p.mySubmission ? (
                            <Badge variant="outline" className={cn("text-[10px]", (STATUS_CONFIG[p.mySubmission.status] ?? STATUS_CONFIG.submitted).bg, (STATUS_CONFIG[p.mySubmission.status] ?? STATUS_CONFIG.submitted).color)}>
                              {p.mySubmission.status}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="text-[10px] px-2 h-7" onClick={() => window.open(p.url, "_blank")}>
                                <ExternalLink className="h-3 w-3 mr-1" /> Open
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openSubmit(p)}
                                className="bg-violet-600 hover:bg-violet-500 btn-premium h-7 text-[10px]"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Submit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ---- My Submissions ---- */}
          <TabsContent value="mine">
            {mineLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : mySubs.length === 0 ? (
              <div className="text-center py-20">
                <Bug className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-4">You haven&apos;t submitted any findings yet.</p>
                <Button onClick={() => programs[0] && openSubmit(programs[0])} disabled={programs.length === 0} className="bg-violet-600 hover:bg-violet-500 btn-premium">
                  <Plus className="h-4 w-4 mr-2" /> Submit a Finding
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {mySubs.map((s, i) => {
                  const sev = SEVERITY_CONFIG[s.severity] ?? SEVERITY_CONFIG.medium
                  const st = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.submitted
                  return (
                    <ScrollReveal key={s.id} delay={0.04 + i * 0.04}>
                      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono", sev.bg, sev.color, "border", sev.border)}>
                                {s.severity.toUpperCase()}
                              </span>
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono", st.bg, st.color)}>
                                {st.label}
                              </span>
                              {s.bounty && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300">
                                  <Trophy className="h-3 w-3" /> {s.bounty}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold mb-1">{s.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{s.description}</p>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {new Date(s.createdAt).toLocaleDateString()}
                              </span>
                              {s.program && (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" /> {s.program.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Submit Finding Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-violet-300" /> Submit a Finding
            </DialogTitle>
            <DialogDescription>
              Reporting to: <span className="font-semibold text-foreground">{selectedProgram?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Only submit findings for vulnerabilities you have personally discovered within the program&apos;s declared scope. Do not test out-of-scope assets.
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finding-title">Title</Label>
              <Input
                id="finding-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. IDOR in /api/users/{id} allows account takeover"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finding-desc">Description & repro</Label>
              <Textarea
                id="finding-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the vulnerability, impact, and step-by-step reproduction..."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => submitFinding.mutate()}
              disabled={!title.trim() || !description.trim() || submitFinding.isPending}
              className="bg-violet-600 hover:bg-violet-500 btn-premium"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitFinding.isPending ? "Submitting..." : "Submit Finding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
