"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Settings, Save, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Eye, EyeOff, Zap, CreditCard, Mail, Link as LinkIcon, ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

interface Setting {
  key: string
  label: string
  category: string
  isSecret: boolean
  placeholder: string
  description: string
  value: string
  source: string // "db" | "env" | "unset"
  configured: boolean
}

const CATEGORIES = [
  { id: "payment", label: "Payment (Razorpay)", icon: CreditCard, color: "text-emerald-300", tint: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { id: "email", label: "Email (SMTP)", icon: Mail, color: "text-cyan-300", tint: "bg-cyan-500/10", border: "border-cyan-500/30" },
  { id: "crm", label: "CRM Webhook", icon: LinkIcon, color: "text-violet-300", tint: "bg-violet-500/10", border: "border-violet-500/30" },
  { id: "tracking", label: "Error Tracking (Sentry)", icon: ShieldAlert, color: "text-rose-300", tint: "bg-rose-500/10", border: "border-rose-500/30", note: "Takes effect immediately — unhandled errors are forwarded to Sentry" },
  { id: "auth", label: "Google OAuth", icon: Settings, color: "text-blue-300", tint: "bg-blue-500/10", border: "border-blue-500/30", note: "Takes effect on the next login — no redeploy needed. Also set the redirect URI in Google Cloud Console." },
]

export function AdminSettingsView() {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState<Record<string, string>>({})
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery<{ settings: Setting[] }>({
    queryKey: ["admin-settings"],
    queryFn: () => api("/api/admin/settings"),
  })

  // Initialize form when data loads
  React.useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {}
      for (const s of data.settings) {
        initial[s.key] = s.value
      }
      setForm(initial)
    }
  }, [data])

  const settings = data?.settings ?? []

  const saveMutation = useMutation({
    mutationFn: (settings: Record<string, string>) =>
      api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) }),
    onSuccess: (data: any) => {
      toast.success(`Settings saved — ${data.updated} field(s) updated`)
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] })
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const testMutation = useMutation({
    mutationFn: (type: string) =>
      api("/api/admin/settings/test", { method: "POST", body: JSON.stringify({ type }) }),
    onSuccess: (data: any) => {
      if (data.ok) toast.success(data.message || "Test passed")
      else toast.error(data.error || "Test failed")
    },
    onError: (e: any) => toast.error(e?.message || "Test failed"),
  })

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasChanges = settings.some((s) => {
    const formVal = form[s.key] ?? ""
    const origVal = s.value ?? ""
    return formVal !== origVal && formVal !== "••••••••"
  })

  const handleSave = () => {
    // Only send changed fields (skip masked secrets that weren't edited)
    const changed: Record<string, string> = {}
    for (const s of settings) {
      const formVal = form[s.key] ?? ""
      if (formVal !== s.value && formVal !== "••••••••") {
        changed[s.key] = formVal
      }
    }
    if (Object.keys(changed).length === 0) {
      toast.info("No changes to save")
      return
    }
    saveMutation.mutate(changed)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure integrations directly from the admin panel — every change takes effect immediately, no redeploy required. Use the Test button in each section to verify the saved credentials.
        </p>
      </div>

      {/* Category sections */}
      {CATEGORIES.map((cat) => {
        const catSettings = settings.filter((s) => s.category === cat.id)
        if (catSettings.length === 0) return null
        const allConfigured = catSettings.every((s) => s.configured)
        const someConfigured = catSettings.some((s) => s.configured)
        const Icon = cat.icon

        return (
          <Card key={cat.id} className={cn("p-5 border", cat.border)}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn("inline-flex p-2 rounded-lg", cat.tint)}>
                  <Icon className={cn("h-4 w-4", cat.color)} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{cat.label}</h3>
                  {cat.note && (
                    <p className="text-[10px] text-amber-300 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> {cat.note}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "text-[9px]",
                  allConfigured ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/5" :
                  someConfigured ? "text-amber-300 border-amber-500/30 bg-amber-500/5" :
                  "text-muted-foreground"
                )}>
                  {allConfigured ? "✅ Configured" : someConfigured ? "⚠️ Partial" : "❌ Not set"}
                </Badge>
                {/* Test buttons */}
                {cat.id === "payment" && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={testMutation.isPending} onClick={() => testMutation.mutate("payment")}>
                    <Zap className="h-3 w-3 mr-1" /> Test
                  </Button>
                )}
                {cat.id === "email" && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={testMutation.isPending} onClick={() => testMutation.mutate("email")}>
                    <Zap className="h-3 w-3 mr-1" /> Test
                  </Button>
                )}
                {cat.id === "crm" && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={testMutation.isPending} onClick={() => testMutation.mutate("crm")}>
                    <Zap className="h-3 w-3 mr-1" /> Test
                  </Button>
                )}
                {cat.id === "tracking" && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={testMutation.isPending} onClick={() => testMutation.mutate("tracking")}>
                    <Zap className="h-3 w-3 mr-1" /> Test
                  </Button>
                )}
                {cat.id === "auth" && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={testMutation.isPending} onClick={() => testMutation.mutate("auth")}>
                    <Zap className="h-3 w-3 mr-1" /> Test
                  </Button>
                )}
              </div>
            </div>

            {/* Setting fields */}
            <div className="space-y-3">
              {catSettings.map((s) => {
                const isRevealed = revealed.has(s.key)
                const fieldValue = form[s.key] ?? ""
                const showMasked = s.isSecret && !isRevealed && fieldValue === "••••••••"

                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-medium">{s.label}</Label>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                        {s.source === "db" ? "from DB" : s.source === "env" ? "from env" : "unset"}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type={showMasked ? "password" : "text"}
                        value={fieldValue}
                        onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                        placeholder={s.placeholder}
                        className="text-sm pr-10"
                      />
                      {s.isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(s.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.description}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 backdrop-blur-lg p-3">
        <p className="text-xs text-muted-foreground">
          {hasChanges ? "You have unsaved changes" : "All changes saved"}
        </p>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className="bg-gradient-to-r from-violet-600 to-violet-500 text-white"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
