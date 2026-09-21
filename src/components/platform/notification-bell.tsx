"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell, Check, CheckCheck, Sparkles, Trophy, Zap, Flame,
  Award, MessageSquare, Radio, Shield, BookOpen, Loader2,
} from "lucide-react"
import { useAppStore, type View } from "@/store/app-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ============================================================
   NotificationBell - bell icon with dropdown notification center
   ------------------------------------------------------------
   - Fetches /api/notifications (auth-aware; empty for logged-out)
   - Shows unread count badge with a subtle pulse
   - Dropdown: list of recent notifications with type icon, message,
     relative time-ago, and a "Mark all read" action
   - Clicking a notification with a `link` view navigates the SPA
   - Animates in/out with framer-motion AnimatePresence
   - Closes on outside-click + Escape
   ============================================================ */

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  icon: string
  color: string
  link: View | null
  read: boolean
  createdAt: string
}

type NotificationResponse = {
  notifications: NotificationItem[]
  unreadCount: number
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  trophy: Trophy,
  zap: Zap,
  flame: Flame,
  award: Award,
  award_badge: Award,
  message: MessageSquare,
  reply: MessageSquare,
  radio: Radio,
  shield: Shield,
  book: BookOpen,
  course: BookOpen,
  bell: Bell,
  certificate: Award,
  level_up: Trophy,
}

const COLOR_MAP: Record<string, string> = {
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  blue: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function NotificationBell() {
  const qc = useQueryClient()
  const { navigate } = useAppStore()
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  const { data, isLoading, isFetching } = useQuery<NotificationResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load notifications")
      return (await res.json()) as NotificationResponse
    },
    // Poll for fresh notifications every 60s while mounted
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error("Failed")
      qc.invalidateQueries({ queryKey: ["notifications"] })
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Could not mark notifications as read")
    }
  }

  async function handleClickNotification(n: NotificationItem) {
    // Optimistically mark-as-read on click
    if (!n.read) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, {
          method: "PATCH",
          credentials: "include",
        })
        qc.invalidateQueries({ queryKey: ["notifications"] })
      } catch {
        /* best-effort */
      }
    }
    if (n.link) {
      navigate(n.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "relative h-9 w-9 rounded-lg flex items-center justify-center transition-all",
          "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          open && "bg-accent/60 text-foreground",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full",
              "bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center",
              "ring-2 ring-background",
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500/40 animate-ping pointer-events-none" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute right-0 top-full mt-2 w-[min(92vw,24rem)] z-50",
              "glass-strong rounded-xl border border-border/60 shadow-xl",
              "flex flex-col max-h-[28rem]",
            )}
            role="menu"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-violet-400" />
                <h3 className="text-xs font-semibold tracking-wide uppercase">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-bold rounded-full bg-rose-500/15 text-rose-400 px-1.5 py-0.5">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || isFetching}
                className={cn(
                  "text-[10px] font-medium flex items-center gap-1 transition-colors",
                  unreadCount === 0
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-emerald-400 hover:text-emerald-300",
                )}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-6 flex items-center justify-center text-muted-foreground text-xs gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-muted-foreground/70" />
                  </div>
                  You&apos;re all caught up.
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {notifications.slice(0, 12).map((n) => {
                    const Icon = ICON_MAP[n.icon] ?? Bell
                    const color = COLOR_MAP[n.color] ?? COLOR_MAP.emerald
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClickNotification(n)}
                          className={cn(
                            "w-full text-left px-3 py-3 flex items-start gap-3 transition-colors",
                            "hover:bg-accent/40",
                            !n.read && "bg-violet-500/[0.04]",
                          )}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center border",
                              color,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-foreground leading-snug line-clamp-1">
                                {n.title}
                              </p>
                              <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5 font-mono">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                          {!n.read && (
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-2"
                            />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  // For admins, there's an admin-notifications view;
                  // otherwise navigate to dashboard where the bell is also present.
                  navigate({ name: "admin-notifications" })
                  setOpen(false)
                }}
                className="w-full text-[10px] text-muted-foreground hover:text-foreground text-center py-1.5 rounded-md hover:bg-accent/40 transition-colors"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
