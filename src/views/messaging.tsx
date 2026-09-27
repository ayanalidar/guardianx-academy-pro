"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  MessageSquare,
  Send,
  Search,
  Plus,
  ChevronLeft,
  Mail,
  Users,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollReveal, FadeIn } from "@/components/platform/motion-system"

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface UserRef {
  id: string
  name: string
  avatar: string | null
  title: string | null
  role: string
}

interface MessageItem {
  id: string
  content: string
  senderId: string
  createdAt: string
  read: boolean
  isMine: boolean
}

interface ThreadListItem {
  id: string
  other: UserRef
  lastMessage: {
    id: string
    content: string
    senderId: string
    createdAt: string
    isMine: boolean
  } | null
  lastMessageAt: string
  unreadCount: number
}

interface ThreadDetail {
  thread: { id: string; other: UserRef }
  messages: MessageItem[]
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
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

export function MessagingView() {
  const qc = useQueryClient()
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [newMessageOpen, setNewMessageOpen] = React.useState(false)
  const [mobileShowConversation, setMobileShowConversation] = React.useState(false)

  const { data: threadsData, isLoading: threadsLoading } = useQuery<{ threads: ThreadListItem[] }>({
    queryKey: ["message-threads"],
    queryFn: () => api("/api/messages/threads"),
    refetchInterval: 10000,
  })

  const threads = threadsData?.threads ?? []
  const filtered = search.trim()
    ? threads.filter((t) =>
        t.other.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.lastMessage?.content ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : threads

  const totalUnread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0)

  function openThread(id: string) {
    setActiveThreadId(id)
    setMobileShowConversation(true)
    api(`/api/messages/threads/${id}/read`, { method: "POST" })
      .then(() => qc.invalidateQueries({ queryKey: ["message-threads"] }))
      .catch(() => {})
  }

  function handleNewThreadCreated(threadId: string) {
    qc.invalidateQueries({ queryKey: ["message-threads"] })
    setNewMessageOpen(false)
    openThread(threadId)
  }

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HEADER - oversized editorial
            ==================================================== */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em]">
              DIRECT · ENCRYPTED · PRIVATE
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-4 text-balance">
            <span className="text-gradient-premium">Messages.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Direct, private conversations with your instructors and peers.
              {totalUnread > 0 && (
                <span className="text-violet-300"> · {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}.</span>
              )}
            </p>
            <Button
              onClick={() => setNewMessageOpen(true)}
              className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
            >
              <Plus className="h-4 w-4" /> New Message
            </Button>
          </div>
        </ScrollReveal>

        {/* ====================================================
            TWO-PANE - premium glass
            ==================================================== */}
        <ScrollReveal delay={0.2}>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur-xl grid grid-cols-1 md:grid-cols-[340px_1fr] h-[72vh] min-h-[520px]">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent z-20 pointer-events-none" />

            {/* Left pane - thread list */}
            <section
              className={cn(
                "border-r border-border/60 flex flex-col bg-background/20",
                mobileShowConversation && activeThreadId ? "hidden md:flex" : "flex"
              )}
            >
              {/* Search */}
              <div className="p-4 border-b border-border/60">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search threads…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 bg-background/50 border-border/60"
                  />
                </div>
              </div>

              {/* Thread list */}
              <ScrollArea className="flex-1">
                {threadsLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No matching threads." : "No conversations yet."}
                  </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {filtered.map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() => openThread(t.id)}
                          className={cn(
                            "w-full text-left p-3 flex items-start gap-3 transition-all hover:bg-violet-500/5",
                            activeThreadId === t.id && "bg-violet-500/10 border-l-2 border-l-violet-500"
                          )}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10 border border-border/60">
                              {t.other.avatar ? (
                                <AvatarImage src={t.other.avatar} alt={t.other.name} />
                              ) : null}
                              <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs font-medium">
                                {initialsOf(t.other.name)}
                              </AvatarFallback>
                            </Avatar>
                            {t.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-violet-500/30">
                                {t.unreadCount > 9 ? "9+" : t.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "text-sm truncate",
                                  t.unreadCount > 0 ? "font-semibold" : "font-medium"
                                )}
                              >
                                {t.other.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                {t.lastMessage ? timeAgo(t.lastMessage.createdAt) : ""}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-xs text-muted-foreground truncate mt-0.5",
                                t.unreadCount > 0 && "text-foreground/80 font-medium"
                              )}
                            >
                              {t.lastMessage
                                ? (t.lastMessage.isMine ? "You: " : "") + t.lastMessage.content
                                : "No messages yet"}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </section>

            {/* Right pane - active conversation */}
            <section
              className={cn(
                "flex flex-col",
                mobileShowConversation && activeThreadId ? "flex" : "hidden md:flex"
              )}
            >
              {activeThreadId ? (
                <ConversationPane
                  threadId={activeThreadId}
                  onBack={() => {
                    setMobileShowConversation(false)
                    setActiveThreadId(null)
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
                  <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="inline-flex p-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6">
                      <MessageSquare className="h-9 w-9 text-violet-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 tracking-[-0.02em]">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Choose a thread from the left, or start a new message to begin a private dialogue.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </ScrollReveal>

        {/* New message dialog */}
        <NewMessageDialog
          open={newMessageOpen}
          onOpenChange={setNewMessageOpen}
          onCreated={handleNewThreadCreated}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Conversation Pane                                                  */
/* ------------------------------------------------------------------ */

function ConversationPane({
  threadId,
  onBack,
}: {
  threadId: string
  onBack: () => void
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery<ThreadDetail>({
    queryKey: ["thread", threadId],
    queryFn: () => api(`/api/messages/threads/${threadId}`),
    refetchInterval: 10000,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api(`/api/messages/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setDraft("")
      qc.invalidateQueries({ queryKey: ["thread", threadId] })
      qc.invalidateQueries({ queryKey: ["message-threads"] })
    },
    onError: (e: Error) => toast.error("Failed to send", { description: e.message }),
  })

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [data?.messages, isLoading])

  const other = data?.thread.other
  const messages = data?.messages ?? []

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || sendMutation.isPending) return
    sendMutation.mutate(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const grouped: { label: string; items: MessageItem[] }[] = []
  let currentLabel = ""
  for (const m of messages) {
    const label = dayLabel(m.createdAt)
    if (label !== currentLabel) {
      currentLabel = label
      grouped.push({ label, items: [m] })
    } else {
      grouped[grouped.length - 1].items.push(m)
    }
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border/60 bg-background/30 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 hover:bg-violet-500/10"
          onClick={onBack}
          aria-label="Back to threads"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-10 w-10 border border-border/60">
          {other?.avatar ? <AvatarImage src={other.avatar} alt={other.name} /> : null}
          <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs font-medium">
            {other ? initialsOf(other.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {other?.name ?? "Loading…"}
          </div>
          {other?.title && (
            <div className="text-xs text-muted-foreground truncate">{other.title}</div>
          )}
        </div>
        <Badge variant="outline" className="capitalize text-[10px] hidden sm:inline-flex border-violet-500/30 text-violet-300 bg-violet-500/10">
          {other?.role ?? ""}
        </Badge>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
        {isLoading ? (
          <div className="space-y-3 relative">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-2/3" : "w-1/2 ml-auto")} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground relative">
            <Mail className="h-10 w-10 mb-3 opacity-50" />
            No messages yet - say hello!
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="space-y-2 relative">
              <div className="text-center text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground py-1">
                {group.label}
              </div>
              {group.items.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] px-4 py-2.5 rounded-2xl text-sm break-words",
                      m.isMine
                        ? "bg-violet-500/15 text-violet-50 border border-violet-500/30 rounded-br-sm backdrop-blur"
                        : "bg-card/60 border border-border/60 rounded-bl-sm backdrop-blur"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <div
                      className={cn(
                        "text-[10px] mt-1 font-mono",
                        m.isMine ? "text-violet-200/60" : "text-muted-foreground"
                      )}
                    >
                      {timeShort(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <footer className="p-3 border-t border-border/60 bg-background/30 backdrop-blur">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none bg-background/50 border-border/60"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!draft.trim() || sendMutation.isPending}
            className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </footer>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* New Message Dialog                                                 */
/* ------------------------------------------------------------------ */

function NewMessageDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (threadId: string) => void
}) {
  const [recipientId, setRecipientId] = React.useState("")
  const [content, setContent] = React.useState("")

  const { data: contactsData, isLoading } = useQuery<{ contacts: UserRef[] }>({
    queryKey: ["message-contacts"],
    queryFn: () => api("/api/messages/contacts"),
    enabled: open,
  })

  const contacts = contactsData?.contacts ?? []

  React.useEffect(() => {
    if (open) {
      setRecipientId("")
      setContent("")
    }
  }, [open])

  const createMutation = useMutation({
    mutationFn: (body: { recipientId: string; content: string }) =>
      api<{ thread: { id: string } }>("/api/messages/threads", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      toast.success("Conversation started")
      onCreated(data.thread.id)
    },
    onError: (e: Error) => toast.error("Could not send", { description: e.message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover/95 backdrop-blur-xl border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-violet-300" /> New Message
          </DialogTitle>
          <DialogDescription>
            Choose a recipient from your network and write the first message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2 block">
              Recipient
            </label>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed border-border/60 rounded-lg text-center">
                <Users className="h-5 w-5 mx-auto mb-2 opacity-60" />
                No contacts available. Enroll in a course to message instructors.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setRecipientId(c.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left",
                      recipientId === c.id
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-border/60 hover:bg-violet-500/5 hover:border-violet-500/30"
                    )}
                  >
                    <Avatar className="h-8 w-8 border border-border/60">
                      {c.avatar ? <AvatarImage src={c.avatar} alt={c.name} /> : null}
                      <AvatarFallback className="bg-violet-500/10 text-violet-300 text-xs">
                        {initialsOf(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      {c.title && (
                        <div className="text-xs text-muted-foreground truncate">{c.title}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px] border-violet-500/30 text-violet-300">
                      {c.role}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2 block">
              Message
            </label>
            <Textarea
              placeholder="Write your message…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] bg-background/50 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            disabled={
              !recipientId ||
              !content.trim() ||
              createMutation.isPending ||
              contacts.length === 0
            }
            onClick={() =>
              createMutation.mutate({ recipientId, content: content.trim() })
            }
            className="bg-violet-600 hover:bg-violet-500 btn-premium gap-1.5"
          >
            {createMutation.isPending ? "Sending…" : "Send"}
            <Send className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
