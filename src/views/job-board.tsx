"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ScrollReveal } from "@/components/platform/motion-system"
import {
  Briefcase,
  MapPin,
  Search,
  Building2,
  DollarSign,
  Clock,
  Users,
  CheckCircle2,
  Send,
  PlusCircle,
  Award,
  ShieldCheck,
  Sparkles,
  Globe,
  X,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   JobBoardView - job listings with filters + apply dialog
   ============================================================ */

interface JobItem {
  id: string
  title: string
  company: string
  companyLogo: string | null
  location: string
  remote: boolean
  type: string
  salary: string
  description: string
  requirements: string
  requiredCerts: string[]
  requiredSkills: string[]
  createdAt: string
  applicationsCount: number
  myApplication: { id: string; status: string } | null
}

interface JobDetail extends JobItem {
  postedBy: { id: string; name: string; title: string | null; avatar: string | null } | null
}

const TYPES = ["all", "full-time", "part-time", "contract", "internship"]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const TYPE_BADGE: Record<string, string> = {
  "full-time": "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  "part-time": "border-cyan-500/30 text-cyan-300 bg-cyan-500/10",
  contract: "border-amber-500/30 text-amber-300 bg-amber-500/10",
  internship: "border-violet-500/30 text-violet-300 bg-violet-500/10",
}

export function JobBoardView() {
  const qc = useQueryClient()
  const [q, setQ] = React.useState("")
  const [type, setType] = React.useState("all")
  const [remoteOnly, setRemoteOnly] = React.useState(false)
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [coverLetter, setCoverLetter] = React.useState("")

  const { data, isLoading } = useQuery<{ jobs: JobItem[] }>({
    queryKey: ["jobs", q, type, remoteOnly],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (type !== "all") params.set("type", type)
      if (remoteOnly) params.set("remote", "true")
      return api(`/api/jobs?${params.toString()}`)
    },
  })

  const { data: detailData } = useQuery<{ job: JobDetail }>({
    queryKey: ["job", selectedJobId],
    queryFn: () => api(`/api/jobs/${selectedJobId}`),
    enabled: !!selectedJobId,
  })

  const applyMutation = useMutation({
    mutationFn: (vars: { jobId: string; coverLetter: string }) =>
      api(`/api/jobs/${vars.jobId}/apply`, {
        method: "POST",
        body: JSON.stringify({ coverLetter: vars.coverLetter }),
      }),
    onSuccess: () => {
      toast.success("Application submitted!")
      setApplyOpen(false)
      setCoverLetter("")
      qc.invalidateQueries({ queryKey: ["jobs"] })
      qc.invalidateQueries({ queryKey: ["job", selectedJobId] })
    },
    onError: (err: any) => toast.error(err?.message || "Failed to apply"),
  })

  const jobs = data?.jobs ?? []
  const selectedJob = detailData?.job ?? null

  const handleApplyClick = (jobId: string) => {
    setSelectedJobId(jobId)
    setCoverLetter("")
    setApplyOpen(true)
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
              CYBERSECURITY JOB BOARD
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Find your next <span className="text-gradient-premium">security role</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-8">
            Curated cybersecurity jobs from top employers - SOC analysts, pentesters, cloud
            security engineers, and more. Apply directly with your GuardianX profile.
          </p>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.25}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search jobs, companies, locations..."
                className="pl-9 bg-card border-border/60 focus-visible:ring-violet-500/40"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-10 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t === "all" ? "All types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3 h-10">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">Remote only</span>
              <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
            </div>
            <Badge variant="outline" className="text-[10px] ml-auto">
              {jobs.length} opening{jobs.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </ScrollReveal>

        {/* Job grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/30 p-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">No jobs match your filters</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((j, i) => (
              <ScrollReveal key={j.id} delay={0.25 + i * 0.03}>
                <div
                  onClick={() => setSelectedJobId(j.id)}
                  className="card-premium cursor-pointer rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm p-5 h-full flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 h-11 w-11 rounded-lg border border-border/60 bg-violet-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold leading-tight line-clamp-2 mb-0.5">{j.title}</h3>
                      <p className="text-xs text-muted-foreground">{j.company}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <Badge variant="outline" className={cn("text-[10px] capitalize", TYPE_BADGE[j.type] || "")}>
                      {j.type}
                    </Badge>
                    {j.remote && (
                      <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300">
                        <Globe className="h-2.5 w-2.5 mr-0.5" /> Remote
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" /> {j.location}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
                    {j.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t border-border/40">
                    <span className="flex items-center gap-2">
                      {j.salary && (
                        <span className="text-violet-300 font-mono">{j.salary}</span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {j.applicationsCount}
                      </span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {timeAgo(j.createdAt)}
                    </span>
                  </div>

                  {j.myApplication && (
                    <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Applied · {j.myApplication.status}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>

      {/* Job detail dialog */}
      <Dialog open={!!selectedJobId && !applyOpen} onOpenChange={(o) => !o && setSelectedJobId(null)}>
        <DialogContent className="max-w-2xl bg-card/95 border-border/60 backdrop-blur-md">
          {selectedJob ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg border border-border/60 bg-violet-500/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-violet-300" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedJob.title}</DialogTitle>
                    <DialogDescription className="text-sm">
                      {selectedJob.company} · {selectedJob.location}
                    </DialogDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setSelectedJobId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] capitalize", TYPE_BADGE[selectedJob.type] || "")}>
                      {selectedJob.type}
                    </Badge>
                    {selectedJob.remote && (
                      <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300">
                        Remote
                      </Badge>
                    )}
                    {selectedJob.salary && (
                      <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
                        <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                        {selectedJob.salary}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="h-2.5 w-2.5 mr-0.5" />
                      {selectedJob.applicationsCount} applicants
                    </Badge>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                      Description
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {selectedJob.description}
                    </p>
                  </div>

                  {selectedJob.requirements && (
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                        Requirements
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {selectedJob.requirements}
                      </p>
                    </div>
                  )}

                  {selectedJob.requiredSkills.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                        Required Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.requiredSkills.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedJob.requiredCerts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                        Preferred Certifications
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.requiredCerts.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                            <Award className="h-2.5 w-2.5 mr-0.5" />
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter>
                {selectedJob.myApplication ? (
                  <div className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    You&apos;ve applied for this role · status: {selectedJob.myApplication.status}
                  </div>
                ) : (
                  <Button
                    onClick={() => handleApplyClick(selectedJob.id)}
                    className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 text-center">
              <Skeleton className="h-8 w-2/3 mx-auto mb-3" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={(o) => !o && setApplyOpen(false)}>
        <DialogContent className="max-w-lg bg-card/95 border-border/60 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Add an optional cover letter to accompany your application. Your GuardianX profile
              (courses, certs, labs) will be shared with the recruiter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="coverLetter" className="text-xs">
              Cover letter (optional)
            </Label>
            <Textarea
              id="coverLetter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell the recruiter why you're a great fit..."
              className="bg-background/40 min-h-[160px] text-sm"
            />
            <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-[11px] text-violet-300/80 flex items-start gap-2">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                We&apos;ll attach your GuardianX transcript automatically - completed courses,
                earned certifications, and solved labs.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedJobId &&
                applyMutation.mutate({ jobId: selectedJobId, coverLetter })
              }
              disabled={applyMutation.isPending}
              className="bg-violet-600 hover:bg-violet-500 btn-premium"
            >
              {applyMutation.isPending ? (
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
