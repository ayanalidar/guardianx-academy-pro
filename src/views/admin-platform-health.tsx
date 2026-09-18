"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Activity, Server, Database, Zap, Clock,
  CheckCircle2, AlertTriangle, Cpu, HardDrive, Wifi, Award, Mail, RefreshCw,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function PlatformHealthView() {
  const { navigate } = useAppStore()

  // LIVE health data from /api/sentinel/health (real DB queries + service
  // checks) — replaces the previous hardcoded services + Math.random() charts.
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["platform-health"],
    refetchInterval: 30_000,
    queryFn: () => api<{ overall: string; services: Array<{ name: string; status: string; latency: number; detail?: string }>; timestamp: string }>(
      "/api/sentinel/health"
    ),
  })

  const SERVICE_ICONS: Record<string, any> = {
    Database: Database, Authentication: Cpu, LMS: HardDrive, "Cyber Labs": Zap,
    Exams: Server, CMS: HardDrive, Certifications: Award, CRM: Mail,
    "Lab Orchestrator": Server, "Email (SMTP)": Wifi,
  }
  const serviceList = (data?.services || []).map((svc) => ({
    ...svc,
    icon: SERVICE_ICONS[svc.name] || Server,
    color: svc.status === "operational" ? "text-emerald-300" : svc.status === "degraded" ? "text-amber-300" : "text-rose-300",
  }))

  const operational = serviceList.filter(s => s.status === "operational").length
  const avgLatency = serviceList.length
    ? Math.round(serviceList.filter(s => s.latency >= 0).reduce((a, s) => a + s.latency, 0) / Math.max(serviceList.filter(s => s.latency >= 0).length, 1))
    : 0

  const stats = [
    { label: "Services OK", value: `${operational}/${serviceList.length}`, icon: CheckCircle2, color: "text-emerald-300", tint: "bg-emerald-500/10" },
    { label: "Overall", value: data?.overall || "—", icon: Activity, color: data?.overall === "operational" ? "text-emerald-300" : data?.overall === "down" ? "text-rose-300" : "text-amber-300", tint: "bg-violet-500/10" },
    { label: "Avg Response", value: avgLatency >= 0 ? `${avgLatency}ms` : "—", icon: Clock, color: "text-cyan-300", tint: "bg-cyan-500/10" },
    { label: "Last Check", value: dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—", icon: AlertTriangle, color: "text-amber-300", tint: "bg-amber-500/10" },
  ]

  const STATUS_BADGE: Record<string, string> = {
    operational: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    degraded: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    down: "bg-rose-500/10 text-rose-300 border-rose-500/30",
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
              <Activity className="h-5 w-5 text-emerald-400" /> Platform Health Monitor
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs text-muted-foreground font-mono">LIVE</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("inline-flex p-2 rounded-lg", s.tint)}><s.icon className={cn("h-4 w-4", s.color)} /></div>
                <div><div className="text-xl font-bold">{s.value}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Services */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Service Status</h2>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
          <div className="space-y-2">
            {isLoading && [...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
            ))}
            {!isLoading && isError && (
              <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/5 text-sm text-rose-300 text-center">
                Health check failed — retry in a moment.
              </div>
            )}
            {!isLoading && !isError && serviceList.map(s => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("inline-flex p-2 rounded-lg bg-muted/50", s.color)}><s.icon className="h-3.5 w-3.5" /></div>
                  <div>
                    <span className="text-sm font-medium">{s.name}</span>
                    {s.detail && <div className="text-[10px] text-muted-foreground">{s.detail}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.latency >= 0 && <span className="text-xs text-muted-foreground font-mono">{s.latency}ms</span>}
                  <Badge className={cn("text-[9px] border", STATUS_BADGE[s.status])}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Response time by service (measured, not simulated) */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Response Time by Service</h2>
          <div className="flex items-end gap-1 h-32">
            {serviceList.filter(s => s.latency >= 0).map((s, i) => {
              const height = Math.min(90, Math.max(6, (s.latency / Math.max(avgLatency * 2, 50)) * 100))
              return (
                <div key={s.name} className="flex-1 flex flex-col items-center gap-1" title={`${s.name}: ${s.latency}ms`}>
                  <div className={cn("w-full rounded-t transition-all", s.status === "down" ? "bg-gradient-to-t from-rose-600 to-rose-400" : "bg-gradient-to-t from-violet-600 to-violet-400")} style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-muted-foreground truncate w-full text-center">{s.name.split(" ")[0]}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* System info */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">System Information</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Framework</span><span className="font-medium">Next.js 16</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Database</span><span className="font-medium">PostgreSQL (Neon)</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Auth</span><span className="font-medium">NextAuth v4 (JWT)</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Deployment</span><span className="font-medium">Vercel</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Domain</span><span className="font-medium">academy.guardianx.cloud</span></div>
            <div className="flex justify-between p-2 rounded bg-muted/30"><span className="text-muted-foreground">Region</span><span className="font-medium">ap-south-1 (Mumbai)</span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
