"use client"

/**
 * Leads Hub - shared pieces.
 *
 * Types, copy helpers and the standalone Lead Capture Script dialog shared
 * by the unified Leads Hub (src/views/admin-lead-crm.tsx) and the Batch
 * Calendar (which opens the dialog right after a batch is created, so the
 * per-batch Apps Script is in front of the admin at the exact moment it
 * is needed).
 */

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Copy, Check, Download, ExternalLink, FileCode, Loader2, XCircle,
  ClipboardList, Send,
} from "lucide-react"

// ============================================================
// Types
// ============================================================
export interface TrainingBatchRow {
  id: string
  certification: string
  name: string
  schedule: string
  startDate: string
  startIsoDate: string | null
  mode: string
  instructor: string
  seats: number
  enrolled: number
  level: string
  status: string
  description: string
  featured: boolean
  published: boolean
  googleFormUrl: string | null
  leadCount?: number
  newLeadCount?: number
  certColor?: string
  certTint?: string
  certBorder?: string
}

export interface BatchLeadRow {
  id: string
  name: string
  whatsappNumber: string
  email?: string | null
  linkedinProfile: string | null
  professionalStatus: string | null
  jobRole: string | null
  status: string
  adminNotes: string | null
  source: string
  createdAt: string
  batch?: { name?: string; certification?: string }
}

export interface AppsScriptPayload {
  ok: boolean
  script: string
  fileName: string
  webhookUrl: string
  batchId: string
  batchName: string
  certification: string
  formQuestions: string[]
}

export interface WebhookConfig {
  configured: boolean
  token: string | null
  webhookUrl: string
  batchWebhookUrl: string
}

export const BATCH_LEAD_STATUSES = [
  { value: "New", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400" },
  { value: "Contacted", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  { value: "Qualified", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", dot: "bg-violet-400" },
  { value: "Enrolled", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { value: "Lost", color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-400" },
]

export const BATCH_STATUS_TINT: Record<string, string> = {
  Open: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  "Almost Full": "text-amber-300 border-amber-500/30 bg-amber-500/10",
  Full: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  Completed: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10",
  Cancelled: "text-rose-300 border-rose-500/30 bg-rose-500/10",
}

/** Hook: the lead-capture webhook config (admin-only endpoint). */
export function useWebhookConfig() {
  return useQuery<WebhookConfig>({
    queryKey: ["leads-hub", "webhook-config"],
    queryFn: () => api("/api/admin/leads/webhook-config"),
    staleTime: 60_000,
    retry: false,
  })
}

/** POST a clearly-marked test lead to a webhook endpoint. Returns the parsed reply. */
export async function sendTestLead(
  webhookUrl: string,
  token: string,
  lead: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, formId: "leads-hub-test", lead }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

// ============================================================
// Helpers
// ============================================================
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function csvEscape(v: string | null | undefined): string {
  const s = v ?? ""
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadBatchLeadsCsv(batchName: string, leads: BatchLeadRow[]) {
  const header = ["Name", "WhatsApp", "Email", "LinkedIn", "Professional Status", "Job Role", "Pipeline Status", "Source", "Captured At"]
  const lines = leads.map((l) =>
    [l.name, l.whatsappNumber, l.email || "", l.linkedinProfile, l.professionalStatus, l.jobRole, l.status, l.source, l.createdAt]
      .map(csvEscape)
      .join(",")
  )
  // BOM so Excel opens UTF-8 correctly
  const csv = "\uFEFF" + header.join(",") + "\n" + lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `guardianx-leads-${batchName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "batch"}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Copy button used across the hub (script, webhook URL, token, etc.). */
export function CopyBtn({ text, label, copiedLabel, size = "sm" }: { text: string; label?: string; copiedLabel?: string; size?: "sm" | "default" }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      size={size}
      variant="outline"
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) {
          setCopied(true)
          toast.success(copiedLabel || "Copied to clipboard")
          setTimeout(() => setCopied(false), 2000)
        } else {
          toast.error("Copy failed - select the text manually")
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? (copiedLabel ? "Copied!" : "Copied") : (label || "Copy")}
    </Button>
  )
}

export function InfoRow({ icon: Icon, label, value, link }: { icon: any; label: string; value: string; link?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-2.5">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-300 hover:underline flex items-center gap-1 truncate">
          {value} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
        </a>
      ) : (
        <div className="text-xs font-medium truncate">{value}</div>
      )}
    </div>
  )
}

// ============================================================
// LeadCaptureScriptDialog - standalone, reusable.
// The Batch Calendar opens this right after a batch is created so the
// admin walks out of the create-flow with a copy-paste-ready script.
// ============================================================
export function LeadCaptureScriptDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: Pick<TrainingBatchRow, "id" | "name" | "certification" | "googleFormUrl"> | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [formUrl, setFormUrl] = React.useState(batch?.googleFormUrl || "")
  const [savingUrl, setSavingUrl] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  React.useEffect(() => {
    setFormUrl(batch?.googleFormUrl || "")
  }, [batch?.googleFormUrl, batch?.id, open])

  const { data: config } = useWebhookConfig()

  // The script itself - fetched as JSON so it can be SHOWN inline.
  const { data: scriptData, isLoading: scriptLoading, error: scriptError } = useQuery<AppsScriptPayload>({
    queryKey: ["leads-hub", "apps-script", batch?.id],
    queryFn: () => api(`/api/admin/training-batches/${batch?.id}/apps-script?format=json`),
    retry: false,
    staleTime: 5 * 60_000,
    enabled: !!batch && open,
  })
  const secretMissing = (scriptError as any)?.status === 503
  const downloadUrl = batch ? `/api/admin/training-batches/${batch.id}/apps-script` : "#"

  const handleSaveUrl = async () => {
    if (!batch) return
    setSavingUrl(true)
    try {
      await api(`/api/admin/training-batches/${batch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ googleFormUrl: formUrl.trim() || null }),
      })
      toast.success("Google Form URL saved")
      queryClient.invalidateQueries({ queryKey: ["leads-hub"] })
      queryClient.invalidateQueries({ queryKey: ["admin-training-batches"] })
      queryClient.invalidateQueries({ queryKey: ["admin-batch-hub"] })
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSavingUrl(false)
    }
  }

  const handleTest = async () => {
    if (!batch || !config?.token) {
      toast.error(config && !config.configured ? "Webhook token not configured - generate one first" : "Webhook config not loaded yet")
      return
    }
    setTesting(true)
    try {
      const r = await sendTestLead(config.batchWebhookUrl, config.token, {
        batchId: batch.id,
        batchName: batch.name,
        certification: batch.certification,
        name: `[TEST] Capture check ${new Date().toLocaleTimeString("en-IN")}`,
        whatsappNumber: "+91 99999 99999",
        email: "capture-test@guardianx.test",
      })
      if (r.ok) {
        toast.success("Test lead delivered! It is now in this batch's lead list (marked [TEST] - delete it after checking).")
        queryClient.invalidateQueries({ queryKey: ["leads-hub"] })
      } else {
        toast.error(`Webhook replied ${r.status}: ${(r.body as any).error || "failed"}`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Test request failed")
    } finally {
      setTesting(false)
    }
  }

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileCode className="h-4 w-4 text-violet-300" /> Lead Capture Script
            <Badge variant="outline" className="text-[9px] text-violet-300 border-violet-500/40">{batch.name || batch.certification}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            This script is pre-configured for this batch - batch ID and the current webhook token are baked in, nothing to edit.
            Paste it into your Google Form&apos;s Script Editor and every submission lands in the Leads Hub instantly.
          </p>

          {/* Google Form URL */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Google Form URL (optional, for quick access later)</Label>
            <div className="flex gap-2">
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://docs.google.com/forms/d/..." className="text-xs font-mono" />
              <Button onClick={handleSaveUrl} disabled={savingUrl || formUrl === (batch.googleFormUrl || "")} size="sm" className="bg-violet-600 hover:bg-violet-500 shrink-0">
                {savingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {scriptLoading ? (
            <div className="flex items-center justify-center py-10 rounded-xl border border-border/40 bg-zinc-950/40">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : secretMissing ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
              <p className="font-semibold flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> Webhook token not configured</p>
              <p className="mt-1 text-amber-200/70">Open the Leads Hub → Pipeline tab → &quot;Lead capture webhook&quot; card and generate a token first.</p>
            </div>
          ) : scriptError || !scriptData ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200/90">
              Couldn&apos;t load the script. <button className="underline" onClick={() => queryClient.invalidateQueries({ queryKey: ["leads-hub", "apps-script", batch.id] })}>Retry</button>
            </div>
          ) : (
            <>
              {/* Code block */}
              <div className="rounded-xl border border-border/60 bg-zinc-950/60 overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-zinc-900/60 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex gap-1 shrink-0">
                      <span className="h-2 w-2 rounded-full bg-rose-500/60" />
                      <span className="h-2 w-2 rounded-full bg-amber-500/60" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
                    </span>
                    <span className="font-mono text-[11px] text-zinc-300 truncate">{scriptData.fileName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" title="Download .gs file">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <CopyBtn
                      text={scriptData.script}
                      label="Copy script"
                      copiedLabel="Script copied - paste it into the Google Form Script Editor"
                      size="sm"
                    />
                  </div>
                </div>
                <pre className="max-h-[300px] overflow-auto custom-scrollbar p-4 text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre">
                  {scriptData.script}
                </pre>
              </div>

              {/* Form questions */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Add these questions to the form (titles containing these words are auto-mapped):</p>
                <div className="flex flex-wrap gap-1.5">
                  {scriptData.formQuestions.map((q, i) => (
                    <span key={i} className="rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[10px] font-medium">
                      <span className="text-violet-300 font-mono mr-1">{i + 1}.</span>{q}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
                <p><span className="font-bold text-violet-300">1.</span> Create a Google Form at <a href="https://forms.new" target="_blank" rel="noreferrer" className="text-violet-300 underline">forms.new</a> and add the questions above</p>
                <p><span className="font-bold text-violet-300">2.</span> 3-dot menu → <span className="text-foreground">Script editor</span> → delete default code → paste the copied script → Save</p>
                <p><span className="font-bold text-violet-300">3.</span> Click <span className="text-foreground">Run → setupTriggers</span> and grant permissions - <span className="text-amber-300 font-medium">mandatory, without the trigger nothing is ever sent</span></p>
                <p><span className="font-bold text-violet-300">4.</span> Press the <span className="text-foreground">Test delivery</span> button below - a [TEST] lead should appear in the hub</p>
                <p><span className="font-bold text-violet-300">5.</span> Paste the form URL above → Save. Done - every submission syncs automatically.</p>
              </div>

              {/* Test delivery */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-emerald-200">One-click verification</p>
                  <p className="mt-0.5">Sends a marked [TEST] lead through the real webhook - proves the whole chain works before you touch Google Forms.</p>
                </div>
                <Button size="sm" onClick={handleTest} disabled={testing || !config?.configured} className="bg-emerald-600 hover:bg-emerald-500 shrink-0">
                  {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  Test delivery
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Webhook endpoint (already baked into the script): <span className="font-mono text-zinc-300">{scriptData.webhookUrl}</span>
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
