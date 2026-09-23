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
  Copy, Info, ExternalLink,
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
  { id: "payment", label: "Payments (Razorpay + PayPal)", icon: CreditCard, color: "text-emerald-300", tint: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { id: "email", label: "Email (Hostinger Mail API / SMTP)", icon: Mail, color: "text-cyan-300", tint: "bg-cyan-500/10", border: "border-cyan-500/30", note: "Preferred: paste the Mail API token from hPanel → API access - it works alone (mailbox auto-discovered). SMTP fields are optional fallback. Test sends a real email to the admin address" },
  { id: "crm", label: "CRM Webhook", icon: LinkIcon, color: "text-violet-300", tint: "bg-violet-500/10", border: "border-violet-500/30" },
  { id: "tracking", label: "Error Tracking (Sentry)", icon: ShieldAlert, color: "text-rose-300", tint: "bg-rose-500/10", border: "border-rose-500/30", note: "Takes effect immediately - unhandled errors are forwarded to Sentry" },
  { id: "auth", label: "Google OAuth", icon: Settings, color: "text-blue-300", tint: "bg-blue-500/10", border: "border-blue-500/30", note: "Takes effect on the next login - no redeploy needed. The callback URL below MUST be registered in Google Cloud Console." },
]

// ---------------------------------------------------------------------------
// Google OAuth redirect-URI setup panel - the #1 reason "Sign in with Google"
// fails with "Access blocked: This app's request is invalid" (Error 400:
// redirect_uri_mismatch) is that the OAuth client in Google Cloud Console
// doesn't have THIS deployment's callback URL registered. The exact values
// depend on the host the browser is on, so they're computed client-side.
// ---------------------------------------------------------------------------
function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Couldn't copy - select the text manually"))
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-xs text-blue-200" title={value}>{value}</p>
      </div>
      <Button size="sm" variant="outline" className="h-7 shrink-0 text-[10px]" onClick={copy}>
        <Copy className="h-3 w-3 mr-1" /> Copy
      </Button>
    </div>
  )
}

function GoogleRedirectSetup() {
  const [origin, setOrigin] = React.useState("")
  React.useEffect(() => setOrigin(window.location.origin), [])
  const callback = origin ? `${origin}/api/auth/callback/google` : ""
  return (
    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-3.5 w-3.5 text-blue-300 shrink-0" />
        <h4 className="text-xs font-semibold">Required: register these URLs in Google Cloud Console</h4>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        If sign-in fails with <span className="font-mono">"Access blocked: This app's request is invalid"</span> (Error 400:
        redirect_uri_mismatch), the OAuth client doesn't know this site's callback URL. Open your OAuth 2.0
        client in Google Cloud Console → APIs &amp; Services → Credentials and add BOTH values below. New
        URIs can take 5-10 minutes to propagate. Every host you deploy on (this preview, your production
        domain, www / non-www) needs its own entry.
      </p>
      {callback ? (
        <div className="space-y-2">
          <CopyRow label="Authorized redirect URI (required)" value={callback} />
          <CopyRow label="Authorized JavaScript origin (recommended)" value={origin} />
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Open this page on the domain you want to configure - the exact values are host-specific.
        </p>
      )}
      <a
        href="https://console.cloud.google.com/apis/credentials"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-300 hover:text-blue-200"
      >
        Open Google Cloud Console → Credentials <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

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
      toast.success(`Settings saved - ${data.updated} field(s) updated`)
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] })
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const testMutation = useMutation({
    mutationFn: (type: string) =>
      api("/api/admin/settings/test", { method: "POST", body: JSON.stringify({ type }) }),
    onSuccess: (data: any, type: string) => {
      if (data.ok) {
        let msg: string = data.message || "Test passed"
        if (type === "auth" && typeof window !== "undefined") {
          msg += ` Sign-in callback for this domain: ${window.location.origin}/api/auth/callback/google - it must be registered as an Authorized redirect URI in Google Cloud Console.`
        }
        toast.success(msg, { duration: 8000 })
      } else {
        toast.error(data.error || "Test failed", { duration: 8000 })
      }
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
    // Guard against accidental wipes: clearing a configured field DELETES the
    // stored value on save (falls back to env vars). That was surprising once
    // already - make it explicit.
    const cleared = settings.filter((s) => s.configured && (changed[s.key] ?? null) === "")
    if (cleared.length > 0) {
      const names = cleared.map((s) => s.label).join(", ")
      const ok = window.confirm(
        `You cleared: ${names}.\n\nSaving will DELETE the stored value(s) and fall back to environment variables. Continue?`
      )
      if (!ok) return
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
          Configure integrations directly from the admin panel - every change takes effect immediately, no redeploy required. Use the Test button in each section to verify the saved credentials.
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

            {/* Google OAuth: show the exact redirect-URI setup panel */}
            {cat.id === "auth" && <GoogleRedirectSetup />}

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
