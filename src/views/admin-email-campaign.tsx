"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Mail, Send, Users, Eye, Clock, CheckCircle2,
  AlertCircle, Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export function EmailCampaignView() {
  const { navigate } = useAppStore()
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [audience, setAudience] = React.useState("all")
  const [sending, setSending] = React.useState(false)

  // Real audience counts from /api/admin/email-campaign (GET)
  const [counts, setCounts] = React.useState<Record<string, number>>({})
  React.useEffect(() => {
    api("/api/admin/email-campaign")
      .then((d: any) => setCounts(d.audiences || {}))
      .catch(() => {})
  }, [])

  const audiences = [
    { value: "all", label: "All Users", count: counts.all ?? 0 },
    { value: "students", label: "Students Only", count: counts.students ?? 0 },
    { value: "instructors", label: "Instructors Only", count: counts.instructors ?? 0 },
    { value: "admins", label: "Admins Only", count: counts.admins ?? 0 },
    { value: "school_admins", label: "School Admins", count: counts.school_admins ?? 0 },
  ]

  const selectedAudience = audiences.find(a => a.value === audience)

  async function handleSend() {
    if (!subject || !body) { toast.error("Subject and body are required"); return }
    setSending(true)
    try {
      // Real campaign send via /api/admin/email-campaign (SMTP + EmailLog)
      const res = await api<{ sent: number; failed: number; total: number }>("/api/admin/email-campaign", {
        method: "POST",
        body: JSON.stringify({ subject, body, audience }),
      })
      toast.success(`Campaign sent — ${res.sent} delivered, ${res.failed} failed (${res.total} recipients)`)
      setSubject(""); setBody("")
    } catch (e: any) {
      toast.error(e?.message || "Failed to send campaign")
    }
    finally { setSending(false) }
  }

  const templates = [
    { name: "Batch Announcement", subject: "New Certification Batch Starting Soon!", body: "Dear {{name}},\n\nA new batch for {{cert}} is starting on {{date}}. Seats are limited - enroll today!\n\nBest regards,\nGuardianX Academy" },
    { name: "Exam Reminder", subject: "Your GuardianX Exam is Approaching", body: "Dear {{name}},\n\nYour proctored exam for {{cert}} is scheduled. Please complete your preparation.\n\nGuardianX Academy" },
    { name: "Certificate Issued", subject: "Your GuardianX Credential is Ready!", body: "Dear {{name}},\n\nCongratulations! You've earned the {{cert}} certification. Your credential ID is {{credId}}.\n\nVerify at: academy.guardianx.cloud/verify" },
    { name: "Course Completion", subject: "Well Done! Course Completed", body: "Dear {{name}},\n\nYou've successfully completed {{course}}. Keep up the great work!\n\nGuardianX Academy" },
  ]

  return (
    <div className="relative min-h-screen">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" /> Email Campaign Builder
            </h1>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono">SMTP: Hostinger</Badge>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Templates */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Quick Templates</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {templates.map(t => (
              <button key={t.name} onClick={() => { setSubject(t.subject); setBody(t.body) }} className="text-left p-3 rounded-lg border border-border/60 hover:border-violet-500/30 transition-colors">
                <div className="text-xs font-medium mb-1">{t.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{t.subject}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Campaign builder */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold">Compose Campaign</h2>
          <div>
            <Label className="text-xs">Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {audiences.map(a => <SelectItem key={a.value} value={a.value}>{a.label} ({a.count})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Subject Line</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>
          <div>
            <Label className="text-xs">Email Body <span className="text-muted-foreground/60">(supports {"{{name}}"}, {"{{cert}}"}, {"{{course}}"} placeholders)</span></Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Write your email..." className="text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 inline mr-1" /> {selectedAudience?.count || 0} recipients
            </div>
            <Button onClick={handleSend} disabled={sending} className="bg-cyan-600 hover:bg-cyan-500 btn-premium">
              {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send Campaign</>}
            </Button>
          </div>
        </Card>

        {/* Hostinger SMTP info */}
        <Card className="p-4 border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-start gap-3">
            <div className="inline-flex p-2 rounded-lg bg-cyan-500/10"><Mail className="h-4 w-4 text-cyan-300" /></div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Hostinger SMTP Configuration</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Emails are sent via Hostinger SMTP. Configure in .env:
              </p>
              <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded text-muted-foreground">
SMTP_HOST=smtp.hostinger.com{"\n"}
SMTP_PORT=465{"\n"}
SMTP_USER=academy@guardianx.cloud{"\n"}
SMTP_PASS=your_password{"\n"}
SMTP_FROM=academy@guardianx.in
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
