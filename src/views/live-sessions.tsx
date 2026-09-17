"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { WebRTCSession, type PeerMeta } from "@/lib/webrtc"
import { Whiteboard } from "@/components/platform/whiteboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Radio, Video, Mic, MicOff, ScreenShare, ScreenShareOff, PhoneOff, Users,
  MessageSquare, Send, Hand, Monitor, Plus, ChevronLeft, Clock,
  ShieldAlert, CircleDot, RadioTower, PenLine, Presentation,
  Circle, Square,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, CursorGlow, Stagger, StaggerItem, Counter, FadeIn,
} from "@/components/platform/motion-system"
import { NetworkVisualization } from "@/components/platform/network-visualization"

interface LiveSessionItem {
  id: string; title: string; description: string | null; roomId: string
  status: string; scheduledAt: string; host: { id: string; name: string; title: string | null }
  memberCount: number; isMember: boolean; isHost: boolean
  course: { id: string; title: string; shortName: string } | null
}

export function LiveSessionsView() {
  const { user } = useUser()
  const [activeSession, setActiveSession] = React.useState<LiveSessionItem | null>(null)

  if (activeSession) {
    return <LiveRoom session={activeSession} onLeave={() => setActiveSession(null)} userName={user?.name ?? "Guest"} userId={user?.id ?? ""} isHost={activeSession.isHost} />
  }

  return <SessionList onJoin={setActiveSession} />
}

/* ============================================================
   SESSION LIST - editorial, oversized
   ============================================================ */
function SessionList({ onJoin }: { onJoin: (s: LiveSessionItem) => void }) {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [desc, setDesc] = React.useState("")

  const { data, isLoading } = useQuery<{ sessions: LiveSessionItem[] }>({
    queryKey: ["live-sessions", "all"],
    queryFn: () => api("/api/live-sessions?status=all"),
    refetchInterval: 20000,
  })
  const sessions = data?.sessions ?? []
  const live = sessions.filter((s) => s.status === "live")
  const scheduled = sessions.filter((s) => s.status === "scheduled")
  const ended = sessions.filter((s) => s.status === "ended")

  const createMutation = useMutation({
    mutationFn: () => api("/api/live-sessions", { method: "POST", body: JSON.stringify({ title, description: desc }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] })
      setCreateOpen(false); setTitle(""); setDesc("")
      toast.success("Live session created!")
      onJoin(data.session)
    },
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => api(`/api/live-sessions/${id}`, { method: "POST", body: JSON.stringify({ action: "join" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-sessions"] }),
  })

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-rose-500/4 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 left-0 w-[400px] h-[300px] bg-violet-600/4 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized editorial
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
              REAL-TIME · WEBRTC · PEER-TO-PEER
            </span>
          </div>
        </ScrollReveal>

        <div className="relative mb-4">
          <ScrollReveal delay={0.05}>
            <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] text-balance">
              Live <span className="text-gradient-premium">sessions.</span>
            </h1>
          </ScrollReveal>
          {/* Live network accent */}
          <div className="absolute top-0 right-0 w-40 h-24 opacity-20 pointer-events-none hidden md:block">
            <NetworkVisualization variant="minimal" className="w-full h-full" />
          </div>
        </div>

        <ScrollReveal delay={0.15}>
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Join live workshops with screen sharing and two-way voice.
              Host your own sessions, present, and engage with peers in real time.
              {live.length > 0 && (
                <span className="text-rose-300"> · {live.length} live now.</span>
              )}
            </p>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-rose-600 hover:bg-rose-500 btn-premium gap-1.5">
                  <Plus className="h-4 w-4" /> Host a Session
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover/95 backdrop-blur-xl border-border/60">
                <DialogHeader>
                  <DialogTitle className="text-xl">Host a Live Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Input placeholder="Session title (e.g. Live: OWASP Top 10 Workshop)" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background/50" />
                  <Textarea placeholder="What will you cover? (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[80px] bg-background/50 resize-none" />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                  <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} className="bg-rose-600 hover:bg-rose-500 btn-premium gap-1.5">
                    {createMutation.isPending ? "Creating..." : "Start Session"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </ScrollReveal>

        {/* ====================================================
            SESSIONS - editorial list, not card grid
            ==================================================== */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <EmptySessions />
        ) : (
          <div className="space-y-16">
            {/* Live now */}
            {live.length > 0 && (
              <section>
                <ScrollReveal>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                    <span className="text-[10px] font-mono text-rose-300 tracking-[0.3em]">LIVE NOW</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-2">{live.length}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-rose-500/40 to-transparent ml-3" />
                  </div>
                </ScrollReveal>
                <Stagger className="space-y-3" staggerChildren={0.06}>
                  {live.map((s) => (
                    <StaggerItem key={s.id}>
                      <SessionRow
                        session={s}
                        onJoin={async (ses) => { await joinMutation.mutateAsync(ses.id); onJoin(ses) }}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* Scheduled */}
            {scheduled.length > 0 && (
              <section>
                <ScrollReveal>
                  <div className="flex items-center gap-2 mb-6">
                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                    <span className="text-[10px] font-mono text-amber-300 tracking-[0.3em]">UPCOMING</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-2">{scheduled.length}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent ml-3" />
                  </div>
                </ScrollReveal>
                <Stagger className="space-y-3" staggerChildren={0.06}>
                  {scheduled.map((s) => (
                    <StaggerItem key={s.id}>
                      <SessionRow
                        session={s}
                        onJoin={async (ses) => { await joinMutation.mutateAsync(ses.id); onJoin(ses) }}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* Ended */}
            {ended.length > 0 && (
              <section>
                <ScrollReveal>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">PAST SESSIONS</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent ml-3" />
                  </div>
                </ScrollReveal>
                <Stagger className="space-y-3" staggerChildren={0.06}>
                  {ended.slice(0, 4).map((s) => (
                    <StaggerItem key={s.id}>
                      <SessionRow session={s} onJoin={() => toast.info("This session has ended.")} ended />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}
          </div>
        )}

        {/* Info banner */}
        <ScrollReveal delay={0.2}>
          <div className="mt-16 relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-transparent p-6 lg:p-8">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="absolute top-0 right-0 w-64 h-32 bg-cyan-500/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                <RadioTower className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyan-300 tracking-[0.3em]">HOW IT WORKS</span>
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  The host shares their screen with two-way voice. Participants can enable their mic to ask questions,
                  and the host can grant screen-share control so students can present back. All traffic is peer-to-peer (WebRTC)
                  with end-to-end encrypted media.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}

/* ============================================================
   Empty Sessions - editorial empty state
   ============================================================ */
function EmptySessions() {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/20 p-16 text-center">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 mb-6">
            <Radio className="h-7 w-7 text-rose-300" />
          </div>
          <h3 className="text-2xl font-bold mb-2 tracking-[-0.02em]">No live sessions yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Be the first to host a workshop. Start a session and invite your peers to join live.
          </p>
        </div>
      </div>
    </FadeIn>
  )
}

/* ============================================================
   Session Row - editorial (not card grid)
   ============================================================ */
function SessionRow({ session, onJoin, ended }: { session: LiveSessionItem; onJoin: (s: LiveSessionItem) => void; ended?: boolean }) {
  const isLive = session.status === "live"
  return (
    <CursorGlow className="group" color={isLive ? "oklch(0.65 0.22 25 / 0.06)" : "oklch(0.6 0.2 295 / 0.05)"}>
      <div className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/20 backdrop-blur p-5 lg:p-6 transition-all duration-300 hover:-translate-y-0.5",
        isLive
          ? "border-rose-500/30 hover:border-rose-500/50 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.22_25_/_0.25)]"
          : "border-border/60 hover:border-violet-500/30"
      )}>
        {/* Top accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-px",
          isLive
            ? "bg-gradient-to-r from-rose-500/50 via-rose-500/20 to-transparent"
            : "bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent"
        )} />

        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Host */}
          <div className="flex items-center gap-4 shrink-0 lg:w-72">
            <Avatar className="h-12 w-12 border border-border/60">
              <AvatarFallback className={cn(
                "text-xs font-medium",
                isLive ? "bg-rose-500/10 text-rose-300" : "bg-violet-500/10 text-violet-300"
              )}>
                {session.host.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate group-hover:text-violet-200 transition-colors">{session.host.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{session.host.title || "Host"}</div>
            </div>
          </div>

          {/* Title + description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h3 className="font-semibold text-base lg:text-lg truncate">{session.title}</h3>
              {isLive && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-mono border border-rose-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" /> LIVE
                </div>
              )}
              {session.course && (
                <Badge variant="outline" className="text-[10px] font-mono border-violet-500/30 text-violet-300">
                  {session.course.shortName}
                </Badge>
              )}
            </div>
            {session.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{session.description}</p>
            )}
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="font-mono"><Counter value={session.memberCount} /></span> member{session.memberCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {new Date(session.scheduledAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="shrink-0">
            {isLive ? (
              <Button
                size="sm"
                onClick={() => onJoin(session)}
                className="bg-rose-600 hover:bg-rose-500 btn-premium gap-1.5"
              >
                <Video className="h-4 w-4" /> Join Live
              </Button>
            ) : ended ? (
              <Button size="sm" variant="ghost" disabled>Ended</Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onJoin(session)}
                className="border-border/60 hover:bg-violet-500/5 hover:border-violet-500/30 gap-1.5"
              >
                <CircleDot className="h-4 w-4" /> Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </CursorGlow>
  )
}

/* ============================================================
   LIVE ROOM (WebRTC) - premium dark glass with violet accents
   All WebRTC functionality preserved
   ============================================================ */
function LiveRoom({ session, onLeave, userName, userId, isHost }: {
  session: LiveSessionItem; onLeave: () => void; userName: string; userId: string; isHost: boolean
}) {
  const qc = useQueryClient()
  const webrtcRef = React.useRef<WebRTCSession | null>(null)
  const [connected, setConnected] = React.useState(false)
  const [peers, setPeers] = React.useState<PeerMeta[]>([])
  const [micOn, setMicOn] = React.useState(false)
  const [sharing, setSharing] = React.useState(false)
  const [presentRequests, setPresentRequests] = React.useState<any[]>([])
  const [chat, setChat] = React.useState<{ userId: string; userName: string; message: string; timestamp: number }[]>([])
  const [chatInput, setChatInput] = React.useState("")
  const [showChat, setShowChat] = React.useState(true)
  const [activePresenterName, setActivePresenterName] = React.useState<string | null>(null)
  const [stageMode, setStageMode] = React.useState<"screen" | "whiteboard">("screen")

  // Video Recording state
  const [recording, setRecording] = React.useState(false)
  const [recordSeconds, setRecordSeconds] = React.useState(0)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const recordedChunksRef = React.useRef<Blob[]>([])
  const recordTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // remote video elements
  const screenVideoRef = React.useRef<HTMLVideoElement>(null)
  const remoteVoicePeers = React.useRef<Map<string, HTMLAudioElement>>(new Map())
  const voiceContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const session_ = new WebRTCSession(session.roomId, userId, userName, isHost ? "host" : "viewer")
    webrtcRef.current = session_

    session_.onPeersChange = (members) => setPeers(members)
    session_.onRemoteStream = (socketId, stream, kind) => {
      if (kind === "screen") {
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream
          screenVideoRef.current.play().catch(() => {})
        }
      } else {
        let el = remoteVoicePeers.current.get(socketId)
        if (!el) {
          el = document.createElement("audio")
          el.autoplay = true
          el.setAttribute("playsinline", "")
          voiceContainerRef.current?.appendChild(el)
          remoteVoicePeers.current.set(socketId, el)
        }
        el.srcObject = stream
        el.play().catch(() => {})
      }
    }
    session_.onStreamRemoved = (socketId) => {
      const el = remoteVoicePeers.current.get(socketId)
      if (el) { el.srcObject = null; el.remove(); remoteVoicePeers.current.delete(socketId) }
    }
    session_.onChat = (msg) => setChat((c) => [...c, msg])
    session_.onPresenterChange = (_socketId, name) => {
      setActivePresenterName(name ?? null)
      toast.info(`${name ?? "Someone"} is now presenting`)
    }
    session_.onPresentRequest = (req) => {
      setPresentRequests((r) => [...r, req])
      toast.info(`${req.userName} requested to present`)
    }

    session_.connect().then(() => setConnected(true))

    return () => {
      session_.disconnect()
      remoteVoicePeers.current.forEach((el) => { el.srcObject = null; el.remove() })
      remoteVoicePeers.current.clear()
    }
  }, [session.id])

  async function toggleMic() {
    const next = !micOn
    await webrtcRef.current?.toggleMic(next)
    setMicOn(next)
    toast.success(next ? "Microphone on" : "Microphone muted")
  }

  async function toggleShare() {
    if (sharing) {
      webrtcRef.current?.stopScreenShare()
      setSharing(false)
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null
    } else {
      const ok = await webrtcRef.current?.startScreenShare()
      if (ok) {
        setSharing(true)
        if (screenVideoRef.current && webrtcRef.current?.screenStream) {
          screenVideoRef.current.srcObject = webrtcRef.current.screenStream
          screenVideoRef.current.play().catch(() => {})
        }
        toast.success("Screen sharing started")
      } else {
        toast.error("Screen share failed or was denied")
      }
    }
  }

  function requestPresent() {
    webrtcRef.current?.requestPresent()
    toast.success("Requested to present - waiting for host approval")
  }

  function approveRequest(req: any) {
    webrtcRef.current?.grantPresent(req.socketId)
    setPresentRequests((r) => r.filter((x) => x.socketId !== req.socketId))
  }

  function sendChat() {
    if (!chatInput.trim()) return
    webrtcRef.current?.sendChat(chatInput)
    setChat((c) => [...c, { userId, userName: "You", message: chatInput, timestamp: Date.now() }])
    setChatInput("")
  }

  async function leaveCall() {
    if (recording) {
      stopRecording()
    }
    await api(`/api/live-sessions/${session.id}`, { method: "POST", body: JSON.stringify({ action: "leave" }) })
    if (isHost) {
      await api(`/api/live-sessions/${session.id}`, { method: "POST", body: JSON.stringify({ action: "end" }) })
    }
    qc.invalidateQueries({ queryKey: ["live-sessions"] })
    onLeave()
  }

  // ===== Video Recording (MediaRecorder API) =====
  function startRecording() {
    const videoEl = screenVideoRef.current
    const stream = videoEl?.srcObject as MediaStream | null
    if (!stream || stream.getTracks().length === 0) {
      toast.error("Start screen sharing first to record the session.")
      return
    }
    try {
      recordedChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : ""
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const stamp = new Date().toISOString().replace(/[:.]/g, "-")
        a.download = `guardianx-${session.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${stamp}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Recording saved to your downloads.")
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1)
      }, 1000)
      toast.success("Recording started")
    } catch (err) {
      console.error(err)
      toast.error("Recording failed to start.")
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    }
    mediaRecorderRef.current = null
    setRecording(false)
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
  }

  function formatRecordTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background - premium dark */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-rose-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 right-0 w-[400px] h-[300px] bg-violet-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-4">
        {/* ====================================================
            HEADER
            ==================================================== */}
        <FadeIn>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={leaveCall} className="text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300">
                <ChevronLeft className="h-4 w-4 mr-1" /> Leave
              </Button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 tracking-[-0.02em]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                  {session.title}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {peers.length + 1} participant{(peers.length + 1) !== 1 ? "s" : ""} · {connected ? "Connected" : "Connecting..."}
                </p>
              </div>
            </div>
            {activePresenterName && (
              <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Monitor className="h-3 w-3 mr-1" /> Presenting: {activePresenterName}
              </Badge>
            )}
          </div>
        </FadeIn>

        <div className="grid lg:grid-cols-4 gap-4">
          {/* Main stage */}
          <div className="lg:col-span-3 space-y-4">
            {/* Stage mode switcher */}
            <FadeIn>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={stageMode === "screen" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStageMode("screen")}
                  className={stageMode === "screen" ? "bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5" : "border-border/60 gap-1.5"}
                >
                  <Monitor className="h-3.5 w-3.5" /> Screen Share
                </Button>
                <Button
                  variant={stageMode === "whiteboard" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStageMode("whiteboard")}
                  className={stageMode === "whiteboard" ? "bg-cyan-600 hover:bg-cyan-500 btn-premium gap-1.5" : "border-border/60 gap-1.5"}
                >
                  <PenLine className="h-3.5 w-3.5" /> Whiteboard
                </Button>
                {stageMode === "whiteboard" && (
                  <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/10 ml-auto">
                    <Presentation className="h-2.5 w-2.5 mr-1" /> Live collaborative whiteboard
                  </Badge>
                )}
              </div>
            </FadeIn>

            {stageMode === "whiteboard" ? (
              <Whiteboard
                roomId={session.roomId}
                userId={userId}
                userName={userName}
                role={isHost ? "host" : "viewer"}
                height={500}
              />
            ) : (
              <FadeIn>
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black/60 backdrop-blur min-h-[400px] flex items-center justify-center">
                  <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-border/40 text-xs">
                    {recording ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-mono text-rose-300">REC {formatRecordTime(recordSeconds)}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400/60" />
                        <span className="font-mono text-rose-300/70">REC</span>
                      </>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <Video className="h-3 w-3 text-violet-300" />
                    <span className="text-violet-300">{sharing ? "Presenting" : activePresenterName ? "Viewing" : "No presentation"}</span>
                  </div>
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted={sharing}
                    className={cn("w-full h-full max-h-[500px] object-contain relative z-[1]", !sharing && !activePresenterName && "hidden")}
                  />
                  {!sharing && !activePresenterName && (
                    <div className="text-center p-8 relative z-10">
                      <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-4">
                        <Monitor className="h-8 w-8 text-violet-300" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">No one is presenting yet.</p>
                      {isHost ? (
                        <Button onClick={toggleShare} variant="outline" className="border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50 gap-1.5">
                          <ScreenShare className="h-4 w-4" /> Share Your Screen
                        </Button>
                      ) : (
                        <Button onClick={requestPresent} variant="outline" className="border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50 gap-1.5">
                          <Hand className="h-4 w-4" /> Request to Present
                        </Button>
                      )}
                    </div>
                  )}
                  {/* hidden voice container */}
                  <div ref={voiceContainerRef} className="hidden" />
                </div>
              </FadeIn>
            )}

            {/* Controls */}
            <FadeIn>
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-border/60 bg-card/30 backdrop-blur flex-wrap">
                <Button
                  variant={micOn ? "default" : "outline"}
                  size="sm"
                  onClick={toggleMic}
                  className={micOn ? "bg-emerald-600 hover:bg-emerald-500 btn-premium gap-1.5" : "border-border/60 gap-1.5"}
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  <span>{micOn ? "Mute" : "Unmute"}</span>
                </Button>
                <Button
                  variant={sharing ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleShare}
                  className="gap-1.5"
                >
                  {sharing ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
                  <span>{sharing ? "Stop Share" : "Share Screen"}</span>
                </Button>
                {!isHost && !sharing && (
                  <Button variant="outline" size="sm" onClick={requestPresent} className="border-border/60 gap-1.5">
                    <Hand className="h-4 w-4" /><span>Raise Hand</span>
                  </Button>
                )}
                <div className="h-6 w-px bg-border/60 mx-1" />
                {recording ? (
                  <Button variant="destructive" size="sm" onClick={stopRecording} className="gap-1.5">
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span className="font-mono text-xs">{formatRecordTime(recordSeconds)}</span>
                    <span className="ml-1">Stop Rec</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startRecording}
                    disabled={stageMode !== "screen" || (!sharing && !activePresenterName)}
                    title={stageMode !== "screen" ? "Switch to Screen Share to record" : (!sharing && !activePresenterName) ? "Waiting for a screen share to record" : "Record the screen share"}
                    className="border-border/60 gap-1.5"
                  >
                    <Circle className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                    <span>Record</span>
                  </Button>
                )}
                <div className="h-6 w-px bg-border/60 mx-1" />
                <Button variant="ghost" size="sm" onClick={() => setShowChat((s) => !s)} className="hover:bg-violet-500/10 gap-1.5">
                  <MessageSquare className="h-4 w-4" /><span>Chat</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={leaveCall}>
                  <PhoneOff className="h-4 w-4" /><span>Leave</span>
                </Button>
              </div>
            </FadeIn>

            {/* Present requests (host only) */}
            {isHost && presentRequests.length > 0 && (
              <FadeIn>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Hand className="h-4 w-4 text-amber-300" />
                    <span className="text-[10px] font-mono text-amber-300 tracking-[0.3em]">PRESENTATION REQUESTS</span>
                  </h3>
                  <div className="space-y-2">
                    {presentRequests.map((req) => (
                      <div key={req.socketId} className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/40">
                        <span className="text-sm">{req.userName} wants to present</span>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveRequest(req)} className="bg-emerald-600 hover:bg-emerald-500 btn-premium">Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => setPresentRequests((r) => r.filter((x) => x.socketId !== req.socketId))}>Dismiss</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>

          {/* Sidebar: participants + chat */}
          <div className="space-y-4">
            {/* Participants */}
            <FadeIn>
              <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-violet-300" />
                  <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">PARTICIPANTS</span>
                  <Badge variant="outline" className="text-[10px] ml-auto border-border/60 font-mono">{peers.length + 1}</Badge>
                </h3>
                <ScrollArea className="h-48 pr-2">
                  <div className="space-y-1.5">
                    <ParticipantRow name={userName + " (You)"} role={isHost ? "Host" : "You"} micOn={micOn} presenting={sharing} isYou />
                    {peers.map((p) => (
                      <ParticipantRow key={p.socketId} name={p.userName} role={p.role} micOn={p.micOn} presenting={p.isPresenting} />
                    ))}
                    {peers.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Waiting for others to join...</p>}
                  </div>
                </ScrollArea>
              </div>
            </FadeIn>

            {/* Chat */}
            {showChat && (
              <FadeIn>
                <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur p-4 flex flex-col h-[320px]">
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-cyan-300" />
                    <span className="text-[10px] font-mono text-cyan-300 tracking-[0.3em]">LIVE CHAT</span>
                  </h3>
                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-2">
                      {chat.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No messages yet. Say hi!</p>}
                      {chat.map((m, i) => (
                        <div key={i} className="text-xs leading-relaxed">
                          <span className="font-medium text-violet-300">{m.userName}: </span>
                          <span className="text-muted-foreground">{m.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-1.5 mt-2">
                    <Input
                      placeholder="Message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      className="h-9 text-xs bg-background/50 border-border/60"
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0 bg-violet-600 hover:bg-violet-500 btn-premium" onClick={sendChat}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </FadeIn>
            )}

            <FadeIn>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur p-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Media is peer-to-peer via WebRTC. Grant mic/screen permissions when your browser prompts.
                    Echo cancellation is on by default.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  )
}

function ParticipantRow({ name, role, micOn, presenting, isYou }: { name: string; role: string; micOn: boolean; presenting: boolean; isYou?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg transition-colors",
      isYou ? "bg-violet-500/5 border border-violet-500/20" : "hover:bg-accent/30"
    )}>
      <Avatar className="h-7 w-7 border border-border/40">
        <AvatarFallback className={cn("text-[10px]", isYou ? "bg-violet-500/10 text-violet-300" : "bg-cyan-500/10 text-cyan-300")}>
          {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{role}</div>
      </div>
      {presenting && <Monitor className="h-3.5 w-3.5 text-cyan-300" />}
      {micOn ? <Mic className="h-3 w-3 text-emerald-300" /> : <MicOff className="h-3 w-3 text-muted-foreground" />}
    </div>
  )
}
