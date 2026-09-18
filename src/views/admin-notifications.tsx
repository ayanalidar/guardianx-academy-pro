"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import {
  ArrowLeft, Bell, Users, Award, BookOpen, FlaskConical,
  Mail, Shield, AlertCircle, CheckCircle2, Trash2,
} from "lucide-react"

const NOTIF_ICONS: Record<string, any> = {
  enrollment: Users, certificate: Award, course: BookOpen, lab: FlaskConical,
  contact: Mail, exam: Shield, system: AlertCircle,
}

const NOTIF_COLORS: Record<string, string> = {
  enrollment: "text-violet-300", certificate: "text-emerald-300",
  course: "text-cyan-300", lab: "text-amber-300", contact: "text-blue-300",
  exam: "text-rose-300", system: "text-amber-300",
}

// Real platform event feed from /api/admin/notifications
interface AdminNotification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? "s" : ""} ago`
}

export function NotificationCenterView() {
  const { navigate } = useAppStore()
  // Real feed — aggregated from enrollments/certs/labs/exams/leads (30 days)
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-notifications"],
    refetchInterval: 60_000,
    queryFn: () => api<{ notifications: AdminNotification[]; unreadCount: number }>("/api/admin/notifications"),
  })
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set())
  const [filter, setFilter] = React.useState<"all" | "unread">("all")

  const notifications = React.useMemo(
    () => (data?.notifications || []).map(n => ({ ...n, read: n.read || readIds.has(n.id) })),
    [data, readIds]
  )
  const filtered = filter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => !dismissed.has(n.id))
  const unreadCount = notifications.filter(n => !n.read).length
  const loading = isLoading

  function markAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  function markRead(id: string) {
    setReadIds(prev => new Set(prev).add(id))
  }

  function removeNotif(id: string) {
    setDismissed(prev => new Set(prev).add(id))
  }

  return (
    <div className="relative min-h-screen">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-400" /> Notification Center
              {unreadCount > 0 && <Badge className="bg-rose-500 text-white border-0 text-[9px]">{unreadCount}</Badge>}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
            <Button size="sm" variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")}>Unread ({unreadCount})</Button>
            <Button size="sm" variant="ghost" onClick={markAllRead}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark all read</Button>
          </div>
        {loading && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Card key={i} className="h-16 animate-pulse bg-card/40" />)}</div>
          </div>
        )}
        {!loading && error && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <Card className="p-6 border-rose-500/30 bg-rose-500/5 text-center text-sm text-rose-300">
              Couldn't load the notification feed. Please retry.
            </Card>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No {filter === "unread" ? "unread " : ""}notifications in the last 30 days.
            </Card>
          </div>
        )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        <Card className="overflow-hidden">
          <div className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              filtered.map(n => {
                const Icon = NOTIF_ICONS[n.type] || Bell
                const color = NOTIF_COLORS[n.type] || "text-muted-foreground"
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn("flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors", !n.read && "bg-violet-500/5")}
                  >
                    <div className={cn("inline-flex p-2 rounded-lg bg-muted/50 shrink-0", color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => markRead(n.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeNotif(n.id)} className="text-muted-foreground hover:text-rose-400 px-2">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
