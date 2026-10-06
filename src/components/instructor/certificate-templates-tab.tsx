"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Award,
  Plus,
  Pencil,
  Trash2,
  Save,
  Palette,
  Star,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Fingerprint,
  Terminal,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

// ============================================================================
// Types
// ============================================================================
interface CertificateTemplate {
  id: string
  name: string
  description: string
  primaryColor: string
  accentColor: string
  fontFamily: "serif" | "sans" | "mono"
  borderStyle: "classic" | "modern" | "minimal" | "holographic"
  sealStyle: "emerald" | "gold" | "cyan" | "holographic"
  backgroundPattern: "grid" | "particles" | "none" | "circuit"
  logoUrl: string | null
  signatureText: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  _count?: { certificates: number }
}

// ============================================================================
// Constants
// ============================================================================
const FONT_OPTIONS = [
  { value: "serif", label: "Serif (Classic)", cls: "font-serif" },
  { value: "sans", label: "Sans-Serif (Modern)", cls: "font-sans" },
  { value: "mono", label: "Monospace (Technical)", cls: "font-mono" },
]

const BORDER_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "holographic", label: "Holographic" },
]

const SEAL_OPTIONS = [
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "gold", label: "Gold", color: "#f59e0b" },
  { value: "cyan", label: "Cyan", color: "#06b6d4" },
  { value: "holographic", label: "Holographic", color: "linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)" },
]

const PATTERN_OPTIONS = [
  { value: "grid", label: "Grid" },
  { value: "particles", label: "Particles" },
  { value: "circuit", label: "Circuit" },
  { value: "none", label: "None" },
]

const EMPTY_FORM = {
  name: "",
  description: "",
  primaryColor: "#10b981",
  accentColor: "#06b6d4",
  fontFamily: "serif",
  borderStyle: "classic",
  sealStyle: "emerald",
  backgroundPattern: "grid",
  logoUrl: "",
  signatureText: "Director, GuardianX Academy",
  isDefault: false,
}

// ============================================================================
// Helpers
// ============================================================================
function fontClass(font: string) {
  return FONT_OPTIONS.find((f) => f.value === font)?.cls ?? "font-serif"
}

function sealColorValue(seal: string): string {
  return SEAL_OPTIONS.find((s) => s.value === seal)?.color ?? "#10b981"
}

// ============================================================================
// Main Tab
// ============================================================================
export function InstructorCertificateTemplatesTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ templates: CertificateTemplate[] }>({
    queryKey: ["certificate-templates"],
    queryFn: () => api("/api/certificate-templates"),
  })
  const templates = data?.templates ?? []

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CertificateTemplate | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/certificate-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Template deleted")
      qc.invalidateQueries({ queryKey: ["certificate-templates"] })
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" />
            Certificate Templates
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design reusable certificate templates with custom colors, fonts, and seals.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Template
        </Button>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificate templates"
          description="Create your first template to start issuing beautiful certificates."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => { setEditing(t); setCreateOpen(true) }}
              onDelete={() => setDeleteId(t.id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      {createOpen && (
        <TemplateFormDialog
          open={createOpen}
          onOpenChange={(o) => { setCreateOpen(o); if (!o) setEditing(null) }}
          template={editing}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["certificate-templates"] })
            setCreateOpen(false)
            setEditing(null)
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const t = templates.find((x) => x.id === deleteId)
                const cnt = t?._count?.certificates ?? 0
                if (cnt > 0) {
                  return `Cannot delete: ${cnt} certificate${cnt !== 1 ? "s" : ""} reference this template. Detach or reassign them first.`
                }
                return "This template has no certificates referencing it and can be safely deleted."
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-rose-500 hover:bg-rose-600 text-white"
              disabled={deleteMutation.isPending || (() => {
                const t = templates.find((x) => x.id === deleteId)
                return (t?._count?.certificates ?? 0) > 0
              })()}
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
// Template Card
// ============================================================================
function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: CertificateTemplate
  onEdit: () => void
  onDelete: () => void
}) {
  const certCount = template._count?.certificates ?? 0
  const canDelete = certCount === 0

  return (
    <Card className="overflow-hidden card-hover group">
      {/* Live preview banner */}
      <CertificatePreview template={template} compact />

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{template.name}</h3>
              {template.isDefault && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <Star className="h-3 w-3 mr-1" /> Default
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{template.description}</p>
            )}
          </div>
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-5 h-5 rounded-full border border-border"
              style={{ backgroundColor: template.primaryColor }}
              aria-label="Primary color"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{template.primaryColor}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-5 h-5 rounded-full border border-border"
              style={{ backgroundColor: template.accentColor }}
              aria-label="Accent color"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{template.accentColor}</span>
          </div>
        </div>

        {/* Style badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-muted/30 capitalize">
            <Palette className="h-3 w-3 mr-1" /> {template.borderStyle}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/30 capitalize">
            <ShieldCheck className="h-3 w-3 mr-1" /> {template.sealStyle} seal
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/30 capitalize">
            {fontClass(template.fontFamily).replace("font-", "")}
          </Badge>
          {template.backgroundPattern !== "none" && (
            <Badge variant="outline" className="text-[10px] bg-muted/30 capitalize">
              <Sparkles className="h-3 w-3 mr-1" /> {template.backgroundPattern}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {certCount} certificate{certCount !== 1 ? "s" : ""} issued
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit template">
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              disabled={!canDelete}
              aria-label="Delete template"
              title={canDelete ? "Delete template" : "Referenced by certificates - cannot delete"}
            >
              <Trash2 className={cn("h-4 w-4", canDelete ? "text-rose-400" : "text-muted-foreground/40")} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// Certificate Live Preview - a faithful miniature of the REAL "BLACKOPS
// PHANTOM" certificate document (the same .gx-doc / .gx-theme-phantom
// framework the issued certificates render with - see views/certificates.tsx
// and the printable PDF in lib/certificate-pdf.ts). The template's own
// palette, font, frame, seal, logo and signature choices are layered on top
// via the --doc-* variables so this preview can never drift from the shipped
// design again. The logo is locked to the top-left header slot at a fixed
// height (object-contain, no distortion) exactly like the real document.
// ============================================================================
function CertificatePreview({
  template,
  compact = false,
}: {
  template: Partial<CertificateTemplate>
  compact?: boolean
}) {
  const primary = template.primaryColor || "#e11d2e"
  const accent = template.accentColor || "#ff5a4e"
  const logoSrc = template.logoUrl || "/guardianx-logo-v2.png"
  const signature = template.signatureText || "Program Director, GuardianX Academy"
  const sealColor = sealColorValue(template.sealStyle ?? "emerald")
  const fontCls = fontClass(template.fontFamily ?? "serif")
  const holographic = template.borderStyle === "holographic"
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/GXI-SAMPLE`
      : "/verify/GXI-SAMPLE"

  return (
    <div
      className={cn(
        "gx-doc gx-theme-phantom gx-paper relative aspect-[1.414/1] w-full overflow-hidden select-none",
        template.borderStyle === "minimal" && "[&_.gx-guilloche]:opacity-40"
      )}
      style={
        {
          "--doc-accent-1": primary,
          "--doc-accent-2": accent,
          "--doc-gold": primary,
          ...(holographic
            ? { boxShadow: `0 0 22px ${primary}66, 0 0 0 1px ${primary}55` }
            : {}),
        } as React.CSSProperties
      }
      aria-hidden={compact || undefined}
    >
      <div className="gx-guilloche h-full w-full">
        <div className="gx-guilloche-inner h-full w-full">
          <div className="gx-aurora-mesh gx-grain relative h-full w-full overflow-hidden">
            <div className="gx-corner-glows" />

            {/* Static brand watermark (canvas-free twin of the particle mark) */}
            <div className="gx-watermark" />

            {/* Template background pattern accents */}
            {template.backgroundPattern === "grid" && (
              <div className="absolute inset-0 z-[1] bg-grid opacity-[0.07] pointer-events-none" />
            )}
            {template.backgroundPattern === "particles" && (
              <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 22% 28%, ${primary}30 0, transparent 34%), radial-gradient(circle at 78% 72%, ${accent}26 0, transparent 38%)`,
                }}
              />
            )}

            <div className="gx-scanlines" />
            <div className="gx-hud-corners"><span /></div>

            {/* ===== Content - mirrors the issued certificate layout ===== */}
            <div className="relative z-10 h-full flex flex-col items-center text-center px-3 sm:px-6 py-2 sm:py-2.5 min-h-0">
              {/* Header: logo (top-left, fixed height, no distortion) + wordmark; chips top-right */}
              <div className="w-full flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc}
                    alt=""
                    className="gx-logo-ink h-6 sm:h-8 w-auto shrink-0"
                    onError={(e) => {
                      const img = e.currentTarget
                      if (!img.src.endsWith("/guardianx-logo-v2.png")) {
                        img.src = "/guardianx-logo-v2.png"
                      }
                    }}
                  />
                  <div className="text-left leading-tight min-w-0">
                    <p className="text-[9px] sm:text-[11px] font-bold tracking-[0.18em] whitespace-nowrap" style={{ color: "var(--doc-ink)" }}>
                      GUARDIAN<span style={{ color: "var(--doc-accent-1)" }}>X</span> ACADEMY
                    </p>
                    <p className="text-[5px] sm:text-[6px] font-mono tracking-[0.3em] whitespace-nowrap" style={{ color: "var(--doc-muted)" }}>
                      CYBER DEFENSE INSTITUTE
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-[5px] sm:text-[6px] font-mono tracking-[0.18em] uppercase text-emerald-300 whitespace-nowrap">
                    <ShieldCheck className="h-1.5 w-1.5 sm:h-2 sm:w-2" /> Verified
                  </span>
                  {!compact && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-red-500/50 bg-red-500/10 text-[6px] font-mono tracking-[0.18em] uppercase text-red-300 whitespace-nowrap">
                      <Fingerprint className="h-2 w-2" /> Clearance
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal readout */}
              {!compact && (
                <div className="mt-1 flex items-center gap-1 max-w-full overflow-hidden">
                  <Terminal className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--doc-accent-1)" }} />
                  <span className="gx-hexline truncate text-[8px]!" style={{ color: "var(--doc-muted)" }}>
                    <span style={{ color: "var(--doc-accent-1)" }}>root@gx:~$</span>{" "}
                    guardianx issue --recipient &quot;Student Name&quot; --score 92% --verified
                  </span>
                </div>
              )}

              {/* Recipient hero */}
              <p className="mt-1 sm:mt-1.5 text-[5px] sm:text-[6px] font-mono tracking-[0.4em]" style={{ color: "var(--doc-muted)" }}>
                THIS CERTIFICATE IS PROUDLY PRESENTED TO
              </p>
              <p
                className="gx-script text-sm sm:text-xl mt-0.5 leading-tight"
                style={{
                  color: "var(--doc-ink)",
                  textShadow: "0 0 18px color-mix(in oklab, var(--doc-accent-1) 35%, transparent)",
                }}
              >
                Student Name
              </p>
              <hr className="gx-gradient-rule w-32 sm:w-48 mt-0.5 sm:mt-1" />

              {/* Course block */}
              {!compact ? (
                <>
                  <p className="mt-1 text-[6px] font-mono tracking-[0.3em] uppercase" style={{ color: "var(--doc-muted)" }}>
                    for successfully completing the training operation
                  </p>
                  <h3 className={cn("text-[11px] sm:text-sm font-bold tracking-tight leading-tight", fontCls)} style={{ color: "var(--doc-ink)" }}>
                    Professional Cybersecurity Certification
                  </h3>
                  <p className="text-[6px] sm:text-[7px] mt-0.5" style={{ color: "var(--doc-muted)" }}>
                    issued by <span className="font-semibold" style={{ color: "var(--doc-accent-1)" }}>GuardianX Academy</span>
                  </p>
                </>
              ) : (
                <p className={cn("text-[8px] font-semibold mt-0.5 truncate max-w-full", fontCls)} style={{ color: "var(--doc-ink)" }}>
                  Professional Cybersecurity Certification
                </p>
              )}

              {/* Bottom row: seal + signature + QR (same trio as the real document) */}
              <div className="mt-auto w-full flex items-end gap-2 sm:gap-3 min-h-0">
                {/* Seal - tinted by the template's seal choice */}
                <div className="relative shrink-0 flex flex-col items-center gap-0.5">
                  <div
                    className={cn("relative rounded-full flex items-center justify-center", compact ? "size-7" : "size-10")}
                    style={{
                      background: sealColor,
                      boxShadow: `0 0 0 1px ${primary}55, 0 4px 12px -4px ${primary}88`,
                    }}
                  >
                    <div className="absolute inset-[3px] rounded-full border border-dashed border-white/50" />
                    <ShieldCheck className={cn("text-white/95", compact ? "h-3 w-3" : "h-4 w-4")} />
                  </div>
                  {!compact && (
                    <p className="text-[5px] font-mono tracking-[0.24em] uppercase" style={{ color: "var(--doc-muted)" }}>
                      GX certified
                    </p>
                  )}
                </div>

                {/* Signature block */}
                <div className="flex-1 min-w-0">
                  <div className={cn("gx-script italic leading-none mb-1 truncate", compact ? "text-[9px]" : "text-xs")} style={{ color: "var(--doc-ink)" }}>
                    {signature}
                  </div>
                  <div className="border-t pt-0.5" style={{ borderColor: "color-mix(in oklab, var(--doc-accent-1) 45%, transparent)" }}>
                    <p className="text-[5px] sm:text-[6px] font-mono uppercase tracking-[0.22em] truncate" style={{ color: "var(--doc-muted)" }}>
                      Program Director
                    </p>
                  </div>
                </div>

                {/* QR (sample payload - real certificates encode their own verify URL) */}
                <div className="flex flex-col items-center shrink-0 gap-0.5">
                  <div
                    className={cn("rounded-[4px] bg-white p-0.5", compact ? "size-7" : "size-9 sm:size-11")}
                    style={{ boxShadow: "0 0 0 1px var(--doc-line)" }}
                  >
                    <QRCodeSVG value={verifyUrl} size={128} bgColor="#FFFFFF" fgColor="#0A0507" level="M" className="size-full" />
                  </div>
                  {!compact && (
                    <p className="text-[5px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--doc-muted)" }}>
                      Scan to verify
                    </p>
                  )}
                </div>
              </div>

              {/* Hex fingerprint + verification strip */}
              {!compact && (
                <>
                  <div className="w-full mt-1 pt-0.5 border-t flex items-center justify-center" style={{ borderColor: "var(--doc-line)" }}>
                    <span className="gx-hexline text-[6px]!">SHA-256 9F2A 4C1E 77B3 0D5E 8812 3FA6 45C9 BB20 11E8 D34F</span>
                  </div>
                  <div className="w-full mt-0.5 flex items-center justify-center gap-2 min-w-0" style={{ color: "var(--doc-muted)" }}>
                    <span className="text-[5px] sm:text-[6px] font-mono whitespace-nowrap">ID <span style={{ color: "var(--doc-ink)" }}>GXI-SAMPLE</span></span>
                    <span className="text-[5px] sm:text-[6px] font-mono truncate min-w-0">verify at {verifyUrl.replace(/^https?:\/\//, "")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Template Form Dialog
// ============================================================================
function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  template: CertificateTemplate | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState(EMPTY_FORM)

  React.useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        description: template.description,
        primaryColor: template.primaryColor,
        accentColor: template.accentColor,
        fontFamily: template.fontFamily,
        borderStyle: template.borderStyle,
        sealStyle: template.sealStyle,
        backgroundPattern: template.backgroundPattern,
        logoUrl: template.logoUrl ?? "",
        signatureText: template.signatureText,
        isDefault: template.isDefault,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [template, open])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        borderStyle: form.borderStyle,
        sealStyle: form.sealStyle,
        backgroundPattern: form.backgroundPattern,
        logoUrl: form.logoUrl || null,
        signatureText: form.signatureText,
        isDefault: form.isDefault,
      }
      if (template) {
        return api(`/api/certificate-templates/${template.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      }
      return api("/api/certificate-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success(template ? "Template updated" : "Template created")
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Template name is required")
      return
    }
    saveMutation.mutate()
  }

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" />
            {template ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Form fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="t-name">Name *</Label>
                <Input
                  id="t-name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. CEH Completion Certificate"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-desc">Description</Label>
                <Textarea
                  id="t-desc"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="When is this template used?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-primary" className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> Primary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="t-primary"
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-accent" className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> Accent Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="t-accent"
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => update("accentColor", e.target.value)}
                      className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
                    />
                    <Input
                      value={form.accentColor}
                      onChange={(e) => update("accentColor", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-font">Font Family</Label>
                  <Select value={form.fontFamily} onValueChange={(v) => update("fontFamily", v)}>
                    <SelectTrigger id="t-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span className={f.cls}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-border">Border Style</Label>
                  <Select value={form.borderStyle} onValueChange={(v) => update("borderStyle", v)}>
                    <SelectTrigger id="t-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BORDER_OPTIONS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-seal">Seal Style</Label>
                  <Select value={form.sealStyle} onValueChange={(v) => update("sealStyle", v)}>
                    <SelectTrigger id="t-seal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEAL_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={
                                s.color.startsWith("linear-gradient")
                                  ? { backgroundImage: s.color }
                                  : { backgroundColor: s.color }
                              }
                            />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-pattern">Background Pattern</Label>
                  <Select value={form.backgroundPattern} onValueChange={(v) => update("backgroundPattern", v)}>
                    <SelectTrigger id="t-pattern">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PATTERN_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-logo" className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Logo URL (optional)
                </Label>
                <Input
                  id="t-logo"
                  value={form.logoUrl}
                  onChange={(e) => update("logoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-sig">Signature Text</Label>
                <Input
                  id="t-sig"
                  value={form.signatureText}
                  onChange={(e) => update("signatureText", e.target.value)}
                  placeholder="Director, GuardianX Academy"
                />
              </div>

              <Card className="p-3 bg-card/50 flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="t-default" className="cursor-pointer">Set as default template</Label>
                  <p className="text-xs text-muted-foreground">New certificates will use this template by default.</p>
                </div>
                <Switch
                  id="t-default"
                  checked={form.isDefault}
                  onCheckedChange={(v) => update("isDefault", v)}
                />
              </Card>
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live Preview</Label>
              <div className="rounded-lg overflow-hidden border border-border">
                <CertificatePreview template={{ ...form, fontFamily: form.fontFamily as any, borderStyle: form.borderStyle as any, sealStyle: form.sealStyle as any, backgroundPattern: form.backgroundPattern as any }} />
              </div>
              <p className="text-xs text-muted-foreground">
                This is a sample rendering. Final certificates will use the student&apos;s name and course details.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              {template ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Empty State
// ============================================================================
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card className="p-8 text-center border-dashed">
      <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-emerald-400" />
      </div>
      <p className="font-medium mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
    </Card>
  )
}
