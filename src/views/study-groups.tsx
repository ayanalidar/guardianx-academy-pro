"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Users,
  Plus,
  Lock,
  Search,
  Globe,
  Crown,
  User as UserIcon,
  Link2,
  Tag,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import {
  ScrollReveal, CursorGlow, Stagger, StaggerItem, Counter, FadeIn,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface CourseRef {
  id: string
  title: string
  shortName: string
  color: string
}

interface UserRef {
  id: string
  name: string
  avatar: string | null
  title: string | null
  role: string
}

interface GroupMember {
  id: string
  role: string
  joinedAt: string
  user: UserRef
}

interface StudyGroup {
  id: string
  title: string
  description: string
  courseId: string | null
  course: CourseRef | null
  creator: UserRef
  maxMembers: number
  isPrivate: boolean
  meetingLink: string | null
  tags: string[]
  createdAt: string
  memberCount: number
  isFull: boolean
  isMember: boolean
  isOwner?: boolean
  myRole?: string
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

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/* ------------------------------------------------------------------ */
/* Main View                                                          */
/* ------------------------------------------------------------------ */

export function StudyGroupsView() {
  const [tab, setTab] = React.useState<"discover" | "mine">("discover")

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 right-0 w-[400px] h-[300px] bg-violet-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized editorial with network accent
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
              COLLABORATION NETWORK
            </span>
          </div>
        </ScrollReveal>

        <div className="relative mb-4">
          <ScrollReveal delay={0.05}>
            <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] text-balance">
              Study <span className="text-gradient-premium">groups.</span>
            </h1>
          </ScrollReveal>
          {/* Network accent */}
          <div className="absolute top-0 right-0 w-40 h-24 opacity-20 pointer-events-none hidden md:block">
            <NetworkVisualization variant="minimal" className="w-full h-full" />
          </div>
        </div>

        <ScrollReveal delay={0.15}>
          <p className="text-muted-foreground max-w-xl mb-12 text-sm leading-relaxed">
            Join forces with peers preparing for the same certifications.
            Create focused study circles, share resources, and accelerate mastery together.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "discover" | "mine")}>
            <TabsList className="bg-card/30 backdrop-blur border border-border/60 h-auto p-1 grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="discover" className="py-2 gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                <Globe className="h-3.5 w-3.5" /> Discover
              </TabsTrigger>
              <TabsTrigger value="mine" className="py-2 gap-1.5 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-200">
                <Users className="h-3.5 w-3.5" /> My Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="mt-8">
              <DiscoverTab />
            </TabsContent>
            <TabsContent value="mine" className="mt-8">
              <MyGroupsTab />
            </TabsContent>
          </Tabs>
        </ScrollReveal>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Discover Tab                                                       */
/* ------------------------------------------------------------------ */

function DiscoverTab() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [joinCodeFor, setJoinCodeFor] = React.useState<StudyGroup | null>(null)
  const [openGroupId, setOpenGroupId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<{ groups: StudyGroup[] }>({
    queryKey: ["study-groups"],
    queryFn: () => api("/api/study-groups"),
  })

  const groups = data?.groups ?? []
  const filtered = search.trim()
    ? groups.filter(
        (g) =>
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.description.toLowerCase().includes(search.toLowerCase()) ||
          g.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : groups

  const joinMutation = useMutation({
    mutationFn: ({ id, joinCode }: { id: string; joinCode?: string }) =>
      api(`/api/study-groups/${id}/join`, {
        method: "POST",
        body: JSON.stringify(joinCode ? { joinCode } : {}),
      }),
    onSuccess: () => {
      toast.success("Joined study group!")
      qc.invalidateQueries({ queryKey: ["study-groups"] })
      qc.invalidateQueries({ queryKey: ["my-study-groups"] })
      setJoinCodeFor(null)
    },
    onError: (e: Error) => toast.error("Could not join", { description: e.message }),
  })

  return (
    <div className="space-y-6">
      {/* Search + create */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, or tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/30 border-border/60 h-11"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 btn-premium gap-1.5 h-11">
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyGroupsState hasSearch={!!search} onCreate={() => setCreateOpen(true)} />
      ) : (
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.06}>
          {filtered.map((g) => (
            <StaggerItem key={g.id}>
              <GroupCard
                group={g}
                onJoin={(grp) => {
                  if (grp.isPrivate) {
                    setJoinCodeFor(grp)
                  } else {
                    joinMutation.mutate({ id: grp.id })
                  }
                }}
                onOpen={(id) => setOpenGroupId(id)}
                joining={joinMutation.isPending}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Create dialog */}
      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Join-code dialog */}
      <JoinCodeDialog
        group={joinCodeFor}
        onClose={() => setJoinCodeFor(null)}
        onJoin={(code) => {
          if (!joinCodeFor) return
          joinMutation.mutate({ id: joinCodeFor.id, joinCode: code })
        }}
        pending={joinMutation.isPending}
      />

      {/* Open group dialog */}
      <GroupDetailDialog
        groupId={openGroupId}
        onClose={() => setOpenGroupId(null)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyGroupsState({ hasSearch, onCreate }: { hasSearch: boolean; onCreate: () => void }) {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 mb-6">
            <Users className="h-7 w-7 text-cyan-300" />
          </div>
          <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">
            {hasSearch ? "No matching groups" : "No public groups yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {hasSearch
              ? "Try a different keyword."
              : "Be the first to create a study group for your peers."}
          </p>
          {!hasSearch && (
            <Button onClick={onCreate} className="bg-cyan-600 hover:bg-cyan-500 btn-premium gap-1.5">
              <Plus className="h-4 w-4" /> Create the First Group <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </FadeIn>
  )
}

/* ------------------------------------------------------------------ */
/* Group Card - premium                                               */
/* ------------------------------------------------------------------ */

function GroupCard({
  group,
  onJoin,
  onOpen,
  joining,
}: {
  group: StudyGroup
  onJoin: (g: StudyGroup) => void
  onOpen: (id: string) => void
  joining: boolean
}) {
  const capacityPct = group.maxMembers
    ? Math.min(100, Math.round((group.memberCount / group.maxMembers) * 100))
    : 0

  return (
    <CursorGlow className="group h-full" color="oklch(0.65 0.12 200 / 0.06)">
      <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 flex flex-col hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/30 via-violet-500/15 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {group.isPrivate ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                <Lock className="h-4 w-4 text-amber-300" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                <Globe className="h-4 w-4 text-cyan-300" />
              </div>
            )}
            <h3 className="font-semibold truncate group-hover:text-cyan-200 transition-colors">{group.title}</h3>
          </div>
          {group.course && (
            <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-violet-500/30 text-violet-300">
              {group.course.shortName}
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1 leading-relaxed">
          {group.description || "No description provided."}
        </p>

        {/* Tags */}
        {group.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {group.tags.slice(0, 4).map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-[10px] font-normal bg-muted/40 border border-border/40"
              >
                <Tag className="h-2.5 w-2.5 mr-1" /> {t}
              </Badge>
            ))}
            {group.tags.length > 4 && (
              <Badge variant="secondary" className="text-[10px] font-normal bg-muted/40">
                +{group.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Capacity */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Members</span>
            <span className="font-mono">
              <Counter value={group.memberCount} />/{group.maxMembers}
            </span>
          </div>
          <Progress value={capacityPct} className="h-1.5" />
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          <Avatar className="h-6 w-6 border border-border/40">
            {group.creator.avatar ? (
              <AvatarImage src={group.creator.avatar} alt={group.creator.name} />
            ) : null}
            <AvatarFallback className="bg-cyan-500/10 text-cyan-300 text-[10px]">
              {initialsOf(group.creator.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground">by {group.creator.name}</span>
          <span className="text-muted-foreground ml-auto font-mono text-[10px]">{timeAgo(group.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 border-border/60 hover:bg-violet-500/5 hover:border-violet-500/30"
            onClick={() => onOpen(group.id)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Open
          </Button>
          {group.isMember ? (
            <Button size="sm" variant="secondary" disabled className="flex-1 gap-1.5">
              <UserIcon className="h-3.5 w-3.5" /> Joined
            </Button>
          ) : group.isFull ? (
            <Button size="sm" disabled className="flex-1">Full</Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-cyan-600 hover:bg-cyan-500 btn-premium"
              disabled={joining}
              onClick={() => onJoin(group)}
            >
              {group.isPrivate ? (
                <>
                  <Lock className="h-3.5 w-3.5" /> Join with Code
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Join
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </CursorGlow>
  )
}

/* ------------------------------------------------------------------ */
/* Create Group Dialog                                                */
/* ------------------------------------------------------------------ */

interface CreateForm {
  title: string
  description: string
  courseId: string
  maxMembers: string
  isPrivate: boolean
  joinCode: string
  meetingLink: string
  tags: string
}

function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = React.useState<CreateForm>({
    title: "",
    description: "",
    courseId: "",
    maxMembers: "10",
    isPrivate: false,
    joinCode: "",
    meetingLink: "",
    tags: "",
  })

  const { data: coursesData } = useQuery<{ courses: { id: string; title: string; shortName: string }[] }>({
    queryKey: ["courses", "enrolled-for-groups"],
    queryFn: () => api("/api/courses?enrolled=true"),
    enabled: open,
  })
  const courses = coursesData?.courses ?? []

  React.useEffect(() => {
    if (open) {
      setForm({
        title: "",
        description: "",
        courseId: "",
        maxMembers: "10",
        isPrivate: false,
        joinCode: "",
        meetingLink: "",
        tags: "",
      })
    }
  }, [open])

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      api("/api/study-groups", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Study group created!")
      qc.invalidateQueries({ queryKey: ["study-groups"] })
      qc.invalidateQueries({ queryKey: ["my-study-groups"] })
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error("Could not create group", { description: e.message }),
  })

  function submit() {
    const body: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      maxMembers: Number(form.maxMembers) || 10,
      isPrivate: form.isPrivate,
      meetingLink: form.meetingLink.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }
    if (form.courseId) body.courseId = form.courseId
    if (form.isPrivate && form.joinCode.trim()) body.joinCode = form.joinCode.trim()
    createMutation.mutate(body)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-cyan-300" /> Create Study Group
          </DialogTitle>
          <DialogDescription>
            Spin up a collaborative space for your peers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="g-title">Title</Label>
            <Input
              id="g-title"
              placeholder="e.g. CEH Final Exam Prep"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="g-desc">Description</Label>
            <Textarea
              id="g-desc"
              placeholder="What is this group for? What will you study?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-[80px] bg-background/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="g-course">Linked course (optional)</Label>
              <select
                id="g-course"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                <option value="">- None -</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName} - {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-max">Max members</Label>
              <Input
                id="g-max"
                type="number"
                min={2}
                max={500}
                value={form.maxMembers}
                onChange={(e) => setForm({ ...form, maxMembers: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="g-meeting">Meeting link (optional)</Label>
            <Input
              id="g-meeting"
              placeholder="https://meet.google.com/…"
              value={form.meetingLink}
              onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="g-tags">Tags (comma-separated)</Label>
            <Input
              id="g-tags"
              placeholder="exam-prep, networking, hands-on"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="bg-background/50"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3">
            <div>
              <Label htmlFor="g-private" className="cursor-pointer">
                Private group
              </Label>
              <p className="text-xs text-muted-foreground">
                Require a join code for members to enter.
              </p>
            </div>
            <Switch
              id="g-private"
              checked={form.isPrivate}
              onCheckedChange={(c) => setForm({ ...form, isPrivate: c })}
            />
          </div>

          {form.isPrivate && (
            <div className="space-y-2">
              <Label htmlFor="g-code">Join code (leave blank to auto-generate)</Label>
              <Input
                id="g-code"
                placeholder="e.g. CYBER42"
                value={form.joinCode}
                onChange={(e) => setForm({ ...form, joinCode: e.target.value })}
                className="bg-background/50 font-mono"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!form.title.trim() || createMutation.isPending}
            onClick={submit}
            className="bg-cyan-600 hover:bg-cyan-500 btn-premium gap-1.5"
          >
            {createMutation.isPending ? "Creating…" : "Create Group"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Join Code Dialog                                                   */
/* ------------------------------------------------------------------ */

function JoinCodeDialog({
  group,
  onClose,
  onJoin,
  pending,
}: {
  group: StudyGroup | null
  onClose: () => void
  onJoin: (code: string) => void
  pending: boolean
}) {
  const [code, setCode] = React.useState("")

  React.useEffect(() => {
    if (group) setCode("")
  }, [group])

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-300" /> Join Private Group
          </DialogTitle>
          <DialogDescription>
            Enter the join code provided by the group owner to join{" "}
            <span className="font-medium text-foreground">
              {group?.title ?? ""}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="join-code">Join code</Label>
          <Input
            id="join-code"
            placeholder="e.g. CYBER42"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-widest text-center text-lg bg-background/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.trim()) onJoin(code.trim())
            }}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!code.trim() || pending}
            onClick={() => onJoin(code.trim())}
            className="bg-amber-600 hover:bg-amber-500 btn-premium gap-1.5"
          >
            {pending ? "Joining…" : "Join"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Group Detail Dialog (Open button)                                  */
/* ------------------------------------------------------------------ */

function GroupDetailDialog({
  groupId,
  onClose,
}: {
  groupId: string | null
  onClose: () => void
}) {
  const { data, isLoading } = useQuery<{ group: StudyGroup & { members?: GroupMember[] } }>({
    queryKey: ["study-group", groupId],
    queryFn: () => api(`/api/study-groups/${groupId}`),
    enabled: !!groupId,
  })

  const group = data?.group
  const members = group?.members ?? []

  return (
    <Dialog open={!!groupId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-cyan-300" />
            {group?.title ?? "Loading…"}
          </DialogTitle>
          <DialogDescription>
            {group?.course
              ? `Linked to ${group.course.shortName} - ${group.course.title}`
              : "Standalone study group"}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !group ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {group.description && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{group.description}</p>
            )}

            {group.meetingLink && (
              <a
                href={group.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:underline"
              >
                <Link2 className="h-4 w-4" /> Open meeting link
              </a>
            )}

            {group.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {group.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] bg-muted/40">
                    <Tag className="h-2.5 w-2.5 mr-1" /> {t}
                  </Badge>
                ))}
              </div>
            )}

            <div>
              <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                Members ({group.memberCount}/{group.maxMembers})
              </Label>
              <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-card/40"
                  >
                    <Avatar className="h-7 w-7">
                      {m.user.avatar ? (
                        <AvatarImage src={m.user.avatar} alt={m.user.name} />
                      ) : null}
                      <AvatarFallback className="bg-cyan-500/10 text-cyan-300 text-[10px]">
                        {initialsOf(m.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {timeAgo(m.joinedAt)}
                      </div>
                    </div>
                    {m.role === "owner" && (
                      <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Crown className="h-3 w-3 mr-1" /> Owner
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
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

/* ------------------------------------------------------------------ */
/* My Groups Tab                                                      */
/* ------------------------------------------------------------------ */

function MyGroupsTab() {
  const [openGroupId, setOpenGroupId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<{ groups: StudyGroup[] }>({
    queryKey: ["my-study-groups"],
    queryFn: () => api("/api/study-groups/my"),
  })

  const groups = data?.groups ?? []

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
                <Users className="h-7 w-7 text-violet-300" />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">No groups joined yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Browse the Discover tab to find a group, or create your own collaborative study space.
              </p>
            </div>
          </div>
        </FadeIn>
      ) : (
        <Stagger className="space-y-3" staggerChildren={0.06}>
          {groups.map((g) => (
            <StaggerItem key={g.id}>
              <CursorGlow className="group" color="oklch(0.6 0.2 295 / 0.05)">
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur p-5 hover:border-violet-500/30 transition-all duration-300">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20">
                      {g.isPrivate ? (
                        <Lock className="h-5 w-5 text-amber-300" />
                      ) : (
                        <Users className="h-5 w-5 text-cyan-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold truncate group-hover:text-violet-200 transition-colors">{g.title}</h3>
                        {g.course && (
                          <Badge variant="outline" className="font-mono text-[10px] border-violet-500/30 text-violet-300">
                            {g.course.shortName}
                          </Badge>
                        )}
                        {g.myRole === "owner" ? (
                          <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Crown className="h-3 w-3 mr-1" /> Owner
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                            <UserIcon className="h-3 w-3 mr-1" /> Member
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {g.description || "No description provided."}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {g.memberCount}/{g.maxMembers} members
                        </span>
                        {g.meetingLink && (
                          <span className="flex items-center gap-1 text-cyan-300">
                            <Link2 className="h-3 w-3" /> Meeting link
                          </span>
                        )}
                        <span className="font-mono text-[10px]">Created {timeAgo(g.createdAt)}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0 border-border/60 hover:bg-violet-500/5 hover:border-violet-500/30"
                      onClick={() => setOpenGroupId(g.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Open
                    </Button>
                  </div>
                </div>
              </CursorGlow>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <GroupDetailDialog groupId={openGroupId} onClose={() => setOpenGroupId(null)} />
    </div>
  )
}
