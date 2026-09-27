"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ScrollReveal,
} from "@/components/platform/motion-system"
import {
  Sparkles,
  Send,
  MessageSquarePlus,
  History,
  Bot,
  User as UserIcon,
  BookOpen,
  FlaskConical,
  Trash2,
  Loader2,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   AIAssistantView - chat with GuardianX AI tutor
   Premium: violet primary, bg-card, message bubbles, session history
   ============================================================ */

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  createdAt?: string
}

interface ChatSession {
  id: string
  courseId: string | null
  labId: string | null
  context: string
  createdAt: string
  updatedAt: string
  lastMessage: string
  messageCount: number
}

interface CourseListItem {
  id: string
  shortName: string
  title: string
}
interface LabListItem {
  id: string
  title: string
}

const SUGGESTED = [
  "Explain the OWASP Top 10 in 5 lines",
  "How does a SQL injection work - and how do I prevent it?",
  "Difference between symmetric and asymmetric encryption",
  "What should I learn first for the CEH exam?",
]

export function AIAssistantView() {
  const qc = useQueryClient()
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [contextType, setContextType] = React.useState<"general" | "course" | "lab">("general")
  const [courseId, setCourseId] = React.useState<string>("")
  const [labId, setLabId] = React.useState<string>("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // ---- Load session list ----
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{ sessions: ChatSession[] }>({
    queryKey: ["ai-sessions"],
    queryFn: () => api("/api/ai-assistant/sessions"),
  })

  // ---- Load courses & labs for the context picker ----
  const { data: coursesData } = useQuery<{ courses: CourseListItem[] }>({
    queryKey: ["ai-courses"],
    queryFn: () => api("/api/courses"),
  })
  const { data: labsData } = useQuery<{ labs: LabListItem[] }>({
    queryKey: ["ai-labs"],
    queryFn: () => api("/api/labs"),
  })

  // ---- Load active session's messages ----
  const { data: activeSessionData } = useQuery<{ session: { messages: ChatMessage[] } }>({
    queryKey: ["ai-session", activeSessionId],
    queryFn: () => api(`/api/ai-assistant/sessions?sessionId=${activeSessionId}`),
    enabled: !!activeSessionId,
  })

  React.useEffect(() => {
    if (activeSessionData?.session?.messages) {
      setMessages(activeSessionData.session.messages)
    }
  }, [activeSessionData])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ---- Send message mutation ----
  const sendMutation = useMutation({
    mutationFn: async (question: string) => {
      const context: any = {}
      if (contextType === "course" && courseId) {
        context.courseId = courseId
        context.label = coursesData?.courses.find((c) => c.id === courseId)?.title
      } else if (contextType === "lab" && labId) {
        context.labId = labId
        context.label = labsData?.labs.find((l) => l.id === labId)?.title
      }
      return api<{ sessionId: string; message: ChatMessage }>(
        "/api/ai-assistant",
        {
          method: "POST",
          body: JSON.stringify({ question, context, sessionId: activeSessionId }),
        }
      )
    },
    onMutate: async (question) => {
      // Optimistic update - push user message immediately
      setMessages((prev) => [...prev, { role: "user", content: question }])
      setInput("")
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.message])
      if (data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId)
      }
      qc.invalidateQueries({ queryKey: ["ai-sessions"] })
      qc.invalidateQueries({ queryKey: ["ai-session", data.sessionId] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to get AI response")
      // Rollback the optimistic user message
      setMessages((prev) => prev.filter((m) => m.content !== input || m.role !== "user"))
    },
  })

  const handleSend = () => {
    const q = input.trim()
    if (!q || sendMutation.isPending) return
    sendMutation.mutate(q)
  }

  const handleNewSession = () => {
    setActiveSessionId(null)
    setMessages([])
    setInput("")
  }

  const handlePickSession = (s: ChatSession) => {
    setActiveSessionId(s.id)
  }

  const sessions = sessionsData?.sessions ?? []

  return (
    <div className="relative min-h-screen">
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">
              GUARDIANX AI · TUTOR
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Ask <span className="text-gradient-premium">GuardianX AI</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-10">
            An elite cybersecurity tutor - explain concepts, review code, prep for certifications,
            and get unstuck on labs in seconds.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Session history - left */}
          <ScrollReveal className="lg:col-span-3" delay={0.25}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden h-[640px] flex flex-col">
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-violet-300" />
                  <span className="text-sm font-semibold">Sessions</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleNewSession}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {sessionsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))
                  ) : sessions.length === 0 ? (
                    <div className="p-6 text-center">
                      <Sparkles className="h-6 w-6 text-violet-400/60 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        No sessions yet. Ask your first question to begin.
                      </p>
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handlePickSession(s)}
                        className={cn(
                          "w-full text-left rounded-lg p-3 border border-transparent transition-colors hover:bg-violet-500/5 hover:border-violet-500/20",
                          activeSessionId === s.id && "bg-violet-500/10 border-violet-500/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {s.courseId ? (
                            <BookOpen className="h-3 w-3 text-violet-300 flex-shrink-0" />
                          ) : s.labId ? (
                            <FlaskConical className="h-3 w-3 text-cyan-300 flex-shrink-0" />
                          ) : (
                            <Bot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {s.messageCount} msg{s.messageCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2 text-foreground/80">
                          {s.lastMessage || "New session"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </ScrollReveal>

          {/* Chat panel - right */}
          <ScrollReveal className="lg:col-span-9" delay={0.3}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden h-[640px] flex flex-col">
              {/* Context selector */}
              <div className="p-4 border-b border-border/60 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                  Context
                </span>
                <Select value={contextType} onValueChange={(v: any) => setContextType(v)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
                {contextType === "course" && (
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="h-8 w-[220px] text-xs">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {(coursesData?.courses ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.shortName} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {contextType === "lab" && (
                  <Select value={labId} onValueChange={setLabId}>
                    <SelectTrigger className="h-8 w-[220px] text-xs">
                      <SelectValue placeholder="Select lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {(labsData?.labs ?? []).map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="border-violet-500/30 text-violet-300 text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Powered
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="inline-flex p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
                      <Bot className="h-8 w-8 text-violet-300" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">How can I help you learn?</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">
                      Ask about any cybersecurity topic - from networking fundamentals to advanced
                      penetration testing techniques.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                      {SUGGESTED.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setInput(s)
                          }}
                          className="text-left text-xs rounded-lg border border-border/60 bg-card/50 p-3 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors"
                        >
                          <Zap className="h-3 w-3 text-violet-300 inline mr-1" />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3 animate-scale-in",
                        m.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {m.role === "assistant" && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-violet-300" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-violet-600 text-violet-50 rounded-tr-sm"
                            : "bg-card border border-border/60 rounded-tl-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      {m.role === "user" && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {sendMutation.isPending && (
                  <div className="flex gap-3 animate-scale-in">
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-violet-300" />
                    </div>
                    <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="p-4 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Ask anything about cybersecurity..."
                    className="bg-card border-border/60 focus-visible:ring-violet-500/40"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-500 btn-premium"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                  ENTER to send · SHIFT+ENTER for newline
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  )
}
