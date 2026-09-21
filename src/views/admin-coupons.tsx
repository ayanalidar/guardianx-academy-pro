"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Ticket, Plus, Pencil, Trash2, X, Loader2,
  CheckCircle2, XCircle, Calendar, Tag, Percent, IndianRupee,
  AlertTriangle, Globe,
} from "lucide-react"
import { toast } from "sonner"

/* ---------------------------------------------------------------- *
 *  Types                                                            *
 * ---------------------------------------------------------------- */
type CouponType = "percentage" | "fixed"

type Coupon = {
  id: string
  code: string
  type: CouponType
  value: number
  maxUses: number
  usedCount: number
  validFrom: string
  validUntil: string | null
  courseId: string | null
  active: boolean
  createdAt: string
}

type CouponForm = {
  code: string
  type: CouponType
  value: string
  maxUses: string
  validFrom: string
  validUntil: string
  courseId: string   // "" = all courses
  active: boolean
}

type CourseOption = { id: string; title: string; shortName: string }

/* ---------------------------------------------------------------- *
 *  Helpers                                                          *
 * ---------------------------------------------------------------- */
function emptyForm(): CouponForm {
  return {
    code: "",
    type: "percentage",
    value: "",
    maxUses: "100",
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
    courseId: "",
    active: true,
  }
}

function formFromCoupon(c: Coupon): CouponForm {
  return {
    code: c.code,
    type: c.type,
    value: String(c.value),
    maxUses: String(c.maxUses),
    validFrom: new Date(c.validFrom).toISOString().slice(0, 10),
    validUntil: c.validUntil ? new Date(c.validUntil).toISOString().slice(0, 10) : "",
    courseId: c.courseId ?? "",
    active: c.active,
  }
}

function validateForm(form: CouponForm): string | null {
  if (!form.code.trim()) return "Coupon code is required"
  if (!/^[A-Z0-9_-]+$/i.test(form.code.trim())) {
    return "Code can only contain letters, numbers, dashes, and underscores"
  }
  const v = Number(form.value)
  if (!Number.isFinite(v) || v <= 0) return "Value must be a positive number"
  if (form.type === "percentage" && v > 100) return "Percentage cannot exceed 100"
  const m = Number(form.maxUses)
  if (!Number.isFinite(m) || m < 1) return "Max uses must be at least 1"
  if (!form.validFrom) return "Valid from date is required"
  if (form.validUntil && form.validUntil < form.validFrom) {
    return "Valid until cannot be before valid from"
  }
  return null
}

function statusOf(c: Coupon): "active" | "scheduled" | "expired" | "exhausted" | "inactive" {
  if (!c.active) return "inactive"
  const now = new Date()
  if (now < new Date(c.validFrom)) return "scheduled"
  if (c.validUntil && now > new Date(c.validUntil)) return "expired"
  if (c.usedCount >= c.maxUses) return "exhausted"
  return "active"
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  scheduled: { label: "Scheduled", classes: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  expired: { label: "Expired", classes: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
  exhausted: { label: "Exhausted", classes: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  inactive: { label: "Inactive", classes: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
}

function fmtDate(iso: string | null): string {
  if (!iso) return " - "
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return " - "
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

/* ---------------------------------------------------------------- *
 *  Component                                                        *
 * ---------------------------------------------------------------- */
export function AdminCouponsView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editingCoupon, setEditingCoupon] = React.useState<Coupon | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingCoupon, setDeletingCoupon] = React.useState<Coupon | null>(null)
  const [form, setForm] = React.useState<CouponForm>(emptyForm())
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  /* --------------------- DB query: coupons ---------------------- */
  const { data, isLoading, isFetching, error } = useQuery<{ coupons: Coupon[]; count: number }>({
    queryKey: ["admin-coupons"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons")
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized - please sign in as an admin")
        if (res.status === 403) throw new Error("Forbidden - admin role required")
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Failed to load coupons")
      }
      return res.json()
    },
  })

  /* ----------------- DB query: courses for select --------------- */
  // The course catalog endpoint returns published courses - used to populate
  // the optional "scope to course" select in the create/edit dialog.
  const { data: courseData } = useQuery<{ courses: CourseOption[] }>({
    queryKey: ["courses-mini"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/courses")
      if (!res.ok) return { courses: [] }
      const j = await res.json()
      // The /api/courses response shape is { courses: [...] }
      const list: CourseOption[] = (j.courses ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        shortName: c.shortName,
      }))
      return { courses: list }
    },
  })

  const coupons = data?.coupons ?? []
  const courses = courseData?.courses ?? []

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
  }

  function openCreate() {
    setForm(emptyForm())
    setFormError(null)
    setCreateOpen(true)
  }

  function openEdit(c: Coupon) {
    setEditingCoupon(c)
    setForm(formFromCoupon(c))
    setFormError(null)
    setEditOpen(true)
  }

  function openDelete(c: Coupon) {
    setDeletingCoupon(c)
    setDeleteOpen(true)
  }

  async function handleSubmitCreate() {
    const err = validateForm(form)
    if (err) {
      setFormError(err)
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          maxUses: Number(form.maxUses),
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
          courseId: form.courseId || null,
          active: form.active,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to create coupon")
      toast.success(`Coupon "${form.code.toUpperCase()}" created`)
      setCreateOpen(false)
      refetch()
    } catch (e: any) {
      setFormError(e.message || "Failed to create coupon")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitEdit() {
    if (!editingCoupon) return
    const err = validateForm(form)
    if (err) {
      setFormError(err)
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          maxUses: Number(form.maxUses),
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
          courseId: form.courseId || null,
          active: form.active,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to update coupon")
      toast.success(`Coupon "${form.code.toUpperCase()}" updated`)
      setEditOpen(false)
      refetch()
    } catch (e: any) {
      setFormError(e.message || "Failed to update coupon")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCoupon) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/coupons/${deletingCoupon.id}`, { method: "DELETE" })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Failed to delete coupon")
      toast.success(`Coupon "${deletingCoupon.code}" deleted`)
      setDeleteOpen(false)
      refetch()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete coupon")
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------------- render ---------------------- */
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <FadeInRow>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate({ name: "admin" })}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-amber-300 transition-colors mb-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> BACK TO ADMIN
              </button>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Ticket className="h-4.5 w-4.5 text-amber-300" />
                </span>
                Coupons & Discounts
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                Create and manage promo codes for paid course enrollments. Coupons apply at checkout on the course detail page.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="bg-amber-600 hover:bg-amber-500 text-amber-50 btn-premium h-10 px-5"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Coupon
            </Button>
          </div>
        </FadeInRow>

        {/* Stats strip */}
        <FadeInRow>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Total Coupons"
              value={coupons.length}
              icon={Ticket}
              tint="bg-amber-500/10 text-amber-300"
            />
            <StatTile
              label="Active"
              value={coupons.filter((c) => statusOf(c) === "active").length}
              icon={CheckCircle2}
              tint="bg-emerald-500/10 text-emerald-300"
            />
            <StatTile
              label="Redeemed"
              value={coupons.reduce((acc, c) => acc + c.usedCount, 0)}
              icon={Tag}
              tint="bg-cyan-500/10 text-cyan-300"
            />
            <StatTile
              label="Expired / Exhausted"
              value={
                coupons.filter((c) => statusOf(c) === "expired" || statusOf(c) === "exhausted").length
              }
              icon={XCircle}
              tint="bg-rose-500/10 text-rose-300"
            />
          </div>
        </FadeInRow>

        {/* Table card */}
        <FadeInRow>
          <Card className="bg-card/40 backdrop-blur-xl border-border/60 overflow-hidden p-0">
            {/* Header row */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/20">
              <h2 className="text-sm font-semibold">All Coupons</h2>
              {isFetching && !isLoading && (
                <span className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> SYNCING
                </span>
              )}
            </div>

            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-border/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <div className="col-span-2">Code</div>
              <div className="col-span-2">Discount</div>
              <div className="col-span-2">Uses</div>
              <div className="col-span-2">Validity</div>
              <div className="col-span-2">Scope</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
                <p className="font-medium mb-1">Failed to load coupons</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-12 text-center">
                <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No coupons yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first coupon to start offering discounts on paid courses.
                </p>
                <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-500 btn-premium h-9">
                  <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {coupons.map((c) => {
                  const status = statusOf(c)
                  const sc = STATUS_STYLES[status]
                  const scope = c.courseId
                    ? courses.find((co) => co.id === c.courseId)
                    : null
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-3 px-5 py-3.5 hover:bg-muted/15 transition-colors items-center"
                    >
                      {/* Code */}
                      <div className="lg:col-span-2 flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Tag className="h-3.5 w-3.5 text-amber-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-sm tracking-wider truncate">{c.code}</div>
                          <div className="text-[10px] text-muted-foreground lg:hidden">
                            {c.type === "percentage" ? `${c.value}% off` : `₹${c.value} off`}
                          </div>
                        </div>
                      </div>

                      {/* Discount */}
                      <div className="lg:col-span-2 hidden lg:flex items-center gap-1.5 text-sm">
                        {c.type === "percentage" ? (
                          <>
                            <Percent className="h-3.5 w-3.5 text-violet-300" />
                            <span className="font-semibold tabular-nums">{c.value}%</span>
                            <span className="text-muted-foreground text-xs">off</span>
                          </>
                        ) : (
                          <>
                            <IndianRupee className="h-3.5 w-3.5 text-emerald-300" />
                            <span className="font-semibold tabular-nums">{c.value}</span>
                            <span className="text-muted-foreground text-xs">off</span>
                          </>
                        )}
                      </div>

                      {/* Uses */}
                      <div className="lg:col-span-2 flex flex-col">
                        <div className="text-sm font-medium tabular-nums">
                          {c.usedCount} <span className="text-muted-foreground text-xs">/ {c.maxUses}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              c.usedCount >= c.maxUses
                                ? "bg-rose-500"
                                : c.usedCount / c.maxUses > 0.7
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.min(100, (c.usedCount / c.maxUses) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Validity */}
                      <div className="lg:col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate">{fmtDate(c.validFrom)}</div>
                          <div className="truncate">→ {fmtDate(c.validUntil)}</div>
                        </div>
                      </div>

                      {/* Scope */}
                      <div className="lg:col-span-2 flex items-center gap-1.5 text-xs min-w-0">
                        {c.courseId ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                            <span className="truncate text-foreground/80">
                              {scope ? scope.shortName : "Scoped course"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                            <span className="text-cyan-300">All courses</span>
                          </>
                        )}
                      </div>

                      {/* Status */}
                      <div className="lg:col-span-1">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border", sc.classes)}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1 flex items-center gap-1 lg:justify-end">
                        <button
                          onClick={() => openEdit(c)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
                          aria-label={`Edit ${c.code}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDelete(c)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          aria-label={`Delete ${c.code}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </FadeInRow>
      </div>

      {/* ===================== Create / Edit Dialog ===================== */}
      <CouponFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Coupon"
        description="Add a new promo code. Codes are case-insensitive and auto-uppercased."
        form={form}
        setForm={setForm}
        courses={courses}
        submitting={submitting}
        error={formError}
        onSubmit={handleSubmitCreate}
        submitLabel="Create Coupon"
      />
      <CouponFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Edit Coupon ${editingCoupon ? `"${editingCoupon.code}"` : ""}`}
        description="Update the coupon's value, validity, scope, or active state."
        form={form}
        setForm={setForm}
        courses={courses}
        submitting={submitting}
        error={formError}
        onSubmit={handleSubmitEdit}
        submitLabel="Save Changes"
      />

      {/* ===================== Delete Alert ===================== */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" /> Delete coupon?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete coupon <span className="font-mono font-bold text-foreground">{deletingCoupon?.code}</span>.
              Existing orders that already used this coupon will be unaffected, but no new redemptions will be possible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60" disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-500 text-rose-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------------------------------------------------------------- *
 *  Sub-components                                                   *
 * ---------------------------------------------------------------- */

function StatTile({
  label, value, icon: Icon, tint,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tint: string }) {
  return (
    <Card className="bg-card/40 border-border/60 p-4 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 truncate">{label}</div>
      </div>
    </Card>
  )
}

function FadeInRow({ children }: { children: React.ReactNode }) {
  // Lightweight fade-in on mount - gives a subtle reveal without depending on
  // the platform motion-system (avoids a heavy bundle import here).
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setShown(true), 50)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 300ms ease-out, transform 300ms ease-out",
      }}
    >
      {children}
    </div>
  )
}

function CouponFormDialog({
  open, onOpenChange, title, description, form, setForm, courses, submitting, error, onSubmit, submitLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  form: CouponForm
  setForm: React.Dispatch<React.SetStateAction<CouponForm>>
  courses: CourseOption[]
  submitting: boolean
  error: string | null
  onSubmit: () => void
  submitLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-amber-300" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="coupon-code" className="text-xs font-medium">Coupon Code</Label>
            <Input
              id="coupon-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME50"
              className="font-mono uppercase tracking-wider bg-background/60 border-border/60"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <p className="text-[10px] text-muted-foreground">Letters, numbers, dashes, underscores.</p>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-type" className="text-xs font-medium">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as CouponType }))}
              >
                <SelectTrigger id="coupon-type" className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <span className="flex items-center gap-2">
                      <Percent className="h-3.5 w-3.5 text-violet-300" /> Percentage
                    </span>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <span className="flex items-center gap-2">
                      <IndianRupee className="h-3.5 w-3.5 text-emerald-300" /> Fixed Amount
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-value" className="text-xs font-medium">
                {form.type === "percentage" ? "Discount (%)" : "Discount (₹)"}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                min="0"
                step={form.type === "percentage" ? "1" : "0.01"}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={form.type === "percentage" ? "10" : "500"}
                className="bg-background/60 border-border/60 tabular-nums"
              />
            </div>
          </div>

          {/* Max uses */}
          <div className="space-y-1.5">
            <Label htmlFor="coupon-max-uses" className="text-xs font-medium">Max Uses</Label>
            <Input
              id="coupon-max-uses"
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              className="bg-background/60 border-border/60 tabular-nums"
            />
          </div>

          {/* Validity dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-valid-from" className="text-xs font-medium">Valid From</Label>
              <Input
                id="coupon-valid-from"
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-valid-until" className="text-xs font-medium">
                Valid Until <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="coupon-valid-until"
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                className="bg-background/60 border-border/60"
              />
            </div>
          </div>

          {/* Course scope */}
          <div className="space-y-1.5">
            <Label htmlFor="coupon-course" className="text-xs font-medium">
              Scope <span className="text-muted-foreground font-normal">(optional - leave empty for all courses)</span>
            </Label>
            <Select
              value={form.courseId || "__ALL__"}
              onValueChange={(v) => setForm((f) => ({ ...f, courseId: v === "__ALL__" ? "" : v }))}
            >
              <SelectTrigger id="coupon-course" className="bg-background/60 border-border/60">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">
                  <span className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-cyan-300" /> All courses
                  </span>
                </SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.shortName} - {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Active</div>
              <p className="text-[10px] text-muted-foreground">Inactive coupons cannot be redeemed.</p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border/60" disabled={submitting}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-500 text-amber-50 btn-premium"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            {submitting ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
