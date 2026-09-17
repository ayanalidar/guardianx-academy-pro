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
} from "lucide-react"

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
// Certificate Live Preview
// ============================================================================
function CertificatePreview({
  template,
  compact = false,
}: {
  template: Partial<CertificateTemplate>
  compact?: boolean
}) {
  const sealColor = sealColorValue(template.sealStyle ?? "emerald")
  const sealStyle: React.CSSProperties = sealColor.startsWith("linear-gradient")
    ? { backgroundImage: sealColor }
    : { backgroundColor: sealColor }

  return (
    <div
      className={cn(
        "relative overflow-hidden p-4",
        compact ? "h-32" : "h-48",
        template.backgroundPattern === "grid" && "bg-grid",
        template.backgroundPattern === "circuit" && "scanlines"
      )}
      style={{
        backgroundColor: "#0a0e14",
        backgroundImage:
          template.backgroundPattern === "particles"
            ? `radial-gradient(circle at 20% 30%, ${template.primaryColor}33 0, transparent 40%), radial-gradient(circle at 80% 70%, ${template.accentColor}33 0, transparent 40%)`
            : undefined,
      }}
    >
      {/* Border */}
      <div
        className={cn(
          "absolute inset-2 rounded-md border-2",
          template.borderStyle === "classic" && "border-solid",
          template.borderStyle === "modern" && "border-dashed",
          template.borderStyle === "minimal" && "border opacity-50",
          template.borderStyle === "holographic" && "border-solid"
        )}
        style={{
          borderColor: template.accentColor,
          ...(template.borderStyle === "holographic"
            ? {
                boxShadow: `0 0 12px ${template.accentColor}88, inset 0 0 12px ${template.primaryColor}44`,
              }
            : {}),
        }}
      />
      {/* Banner */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${template.primaryColor}, ${template.accentColor})`,
        }}
      />
      {/* Content */}
      <div className={cn("relative z-10 h-full flex flex-col items-center justify-center text-center px-3", fontClass(template.fontFamily ?? "serif"))}>
        <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: template.accentColor }}>
          Certificate of Achievement
        </div>
        <div className={cn("font-bold text-white", compact ? "text-sm" : "text-lg")}>
          GuardianX Academy
        </div>
        {!compact && (
          <div className="text-[10px] text-white/60 mt-1 italic">
            This certifies that
          </div>
        )}
        {!compact && (
          <div className="text-base font-semibold mt-1" style={{ color: template.primaryColor }}>
            Student Name
          </div>
        )}
        {/* Seal */}
        <div
          className={cn(
            "absolute rounded-full flex items-center justify-center",
            compact ? "w-8 h-8 right-3 bottom-2" : "w-12 h-12 right-4 bottom-3"
          )}
          style={sealStyle}
        >
          <Award className={cn("text-white", compact ? "h-4 w-4" : "h-6 w-6")} />
        </div>
        {/* Signature */}
        {!compact && template.signatureText && (
          <div className="absolute bottom-2 left-3 text-[9px] text-white/50 italic">
            {template.signatureText}
          </div>
        )}
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
