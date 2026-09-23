"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CalendarClock, CreditCard, Globe, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { loadRazorpayScript, loadPayPalScript } from "@/lib/checkout-sdk"
import { cn } from "@/lib/utils"

/* ============================================================
   PendingInstallments - dashboard banner
   ------------------------------------------------------------
   Shows the student's unpaid EMI installments (course, amount,
   due date, overdue state) and lets them pay each one with
   Razorpay or PayPal in place. Paying an installment routes
   through the same verify/capture endpoints as checkout, so
   receipts fire automatically. Hidden entirely when nothing
   is pending.
   ============================================================ */

interface InstallmentItem {
  orderId: string
  courseId: string | null
  courseTitle: string
  index: number
  total: number
  amount: number
  currency: string
  status: string
  createdAt: string
  dueAt: string | null
  paidAt: string | null
}

interface CreateOrderRes {
  provider: string
  orderId: string
  razorpayOrderId?: string
  paypalOrderId?: string
  amount: number
  currency: string
  courseTitle: string
  clientId?: string
  keyId?: string | null
  mock?: boolean
}

function money(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "₹"
  return `${symbol}${amount.toLocaleString(currency === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false
  return new Date(dueAt).getTime() < Date.now()
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "due now"
  return new Date(dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function PendingInstallments() {
  const qc = useQueryClient()
  const [payingId, setPayingId] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<"choose" | "paypal-buttons">("choose")
  const [providerOrder, setProviderOrder] = React.useState<CreateOrderRes | null>(null)
  const paypalContainerRef = React.useRef<HTMLDivElement>(null)
  const paypalRenderedRef = React.useRef<string | null>(null)

  const { data } = useQuery<{ installments: InstallmentItem[] }>({
    queryKey: ["installments"],
    queryFn: () => api("/api/payment/installments"),
    staleTime: 30 * 1000,
  })

  const pending = (data?.installments || []).filter((i) => i.status === "created")

  const createOrderMutation = useMutation({
    mutationFn: (vars: { orderId: string; provider: "razorpay" | "paypal" }) =>
      api<CreateOrderRes>(`/api/payment/installments/${vars.orderId}/pay`, {
        method: "POST",
        body: JSON.stringify({ provider: vars.provider }),
      }),
    onSuccess: (res) => {
      setProviderOrder(res)
      if (res.provider === "paypal") {
        setStep("paypal-buttons")
      }
    },
    onError: (e: any) => toast.error(e.message || "Could not start payment"),
  })

  function onPaid(orderId: string) {
    const item = pending.find((p) => p.orderId === orderId)
    const hasNext = item && item.index < item.total
    toast.success(
      hasNext
        ? `Installment ${item!.index} of ${item!.total} paid! Receipt emailed - we'll remind you before the next one is due.`
        : "Payment received! Receipt emailed.",
    )
    qc.invalidateQueries({ queryKey: ["installments"] })
    closeDialog()
  }

  function closeDialog() {
    setPayingId(null)
    setProviderOrder(null)
    setStep("choose")
    paypalRenderedRef.current = null
  }

  // Razorpay: open checkout right after the order is created
  React.useEffect(() => {
    if (!providerOrder || providerOrder.provider !== "razorpay") return
    let cancelled = false
    ;(async () => {
      try {
        await loadRazorpayScript()
        if (cancelled) return
        // @ts-ignore
        const rzp = new window.Razorpay({
          key: providerOrder.keyId,
          amount: Math.round(providerOrder.amount * 100),
          currency: providerOrder.currency,
          name: "GuardianX Academy",
          description: `${providerOrder.courseTitle} (installment)`,
          order_id: providerOrder.razorpayOrderId,
          handler: async (response: any) => {
            try {
              await api("/api/payment/verify", {
                method: "POST",
                body: JSON.stringify({
                  orderId: providerOrder.orderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              })
              onPaid(providerOrder.orderId)
            } catch (e: any) {
              toast.error(e?.message || "Payment verification failed")
            }
          },
          prefill: {},
          theme: { color: "#7c3aed" },
          modal: { ondismiss: () => closeDialog() },
        })
        rzp.open()
      } catch (e: any) {
        toast.error(e?.message || "Failed to load Razorpay")
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerOrder])

  // PayPal: render Smart Buttons once the step is active
  React.useEffect(() => {
    if (step !== "paypal-buttons" || !providerOrder?.paypalOrderId) return
    const container = paypalContainerRef.current
    if (!container) return
    if (paypalRenderedRef.current === providerOrder.paypalOrderId) return

    paypalRenderedRef.current = providerOrder.paypalOrderId
    let cancelled = false

    loadPayPalScript(providerOrder.clientId || "")
      .then(() => {
        if (cancelled || !paypalContainerRef.current) return
        const pp = (window as any).paypal
        if (!pp?.Buttons) throw new Error("PayPal SDK unavailable")
        return pp.Buttons({
          style: { layout: "vertical", shape: "pill", color: "gold", height: 45 },
          createOrder: () => providerOrder.paypalOrderId,
          onApprove: async () => {
            try {
              await api("/api/payment/paypal/capture", {
                method: "POST",
                body: JSON.stringify({ orderId: providerOrder.orderId }),
              })
              onPaid(providerOrder.orderId)
            } catch (e: any) {
              toast.error(e?.message || "PayPal payment could not be confirmed")
            }
          },
          onCancel: () => toast.info("PayPal payment cancelled"),
          onError: () => toast.error("PayPal reported an error - please try again"),
        }).render(paypalContainerRef.current)
      })
      .catch((e: any) => {
        if (!cancelled) {
          paypalRenderedRef.current = null
          toast.error(e?.message || "Failed to load PayPal")
        }
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, providerOrder])

  if (pending.length === 0) return null

  const paying = pending.find((p) => p.orderId === payingId) || null

  return (
    <>
      <section aria-label="Pending installments" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-amber-300" />
          <h3 className="text-sm font-semibold text-amber-100">Pending installments</h3>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/70">
            {pending.length} due
          </span>
        </div>
        <div className="space-y-2">
          {pending.map((item) => {
            const overdue = isOverdue(item.dueAt)
            return (
              <div
                key={item.orderId}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5",
                  overdue ? "border-rose-500/40 bg-rose-500/10" : "border-border/60 bg-background/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {item.courseTitle} - installment {item.index} of {item.total}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    {overdue ? (
                      <><AlertTriangle className="h-3 w-3 text-rose-400" /> <span className="text-rose-300 font-medium">Overdue - was due {formatDue(item.dueAt)}</span></>
                    ) : (
                      <><CalendarClock className="h-3 w-3 text-muted-foreground" /> due {formatDue(item.dueAt)}</>
                    )}
                  </div>
                </div>
                <div className="font-mono tabular-nums text-sm font-semibold">{money(item.amount, item.currency)}</div>
                <button
                  onClick={() => { setPayingId(item.orderId); setStep("choose") }}
                  className="rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-300 transition-colors shrink-0"
                >
                  Pay now
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-3">
          Receipts are emailed automatically after every installment. Your course access is active.
        </p>
      </section>

      {/* Pay dialog (in-place, independent of the course checkout dialog) */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeDialog}>
          <div
            className="w-full max-w-md rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Pay installment {paying.index} of {paying.total}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{paying.courseTitle}</div>
              </div>
              <button onClick={closeDialog} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "paypal-buttons" && providerOrder ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount due</span>
                    <span className="text-xl font-bold tabular-nums text-amber-200">{money(providerOrder.amount, providerOrder.currency)}</span>
                  </div>
                </div>
                <div ref={paypalContainerRef} className="min-h-[120px]" />
                <button
                  onClick={closeDialog}
                  className="w-full rounded-lg border border-border/60 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Amount due</span>
                  <span className="text-lg font-bold tabular-nums text-gradient-premium">{money(paying.amount, paying.currency)}</span>
                </div>
                {createOrderMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => createOrderMutation.mutate({ orderId: paying.orderId, provider: "razorpay" })}
                      className="flex items-center gap-3 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-3 text-left hover:border-violet-500/70 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 text-violet-300 shrink-0" />
                      <span>
                        <span className="block text-sm font-medium">Razorpay</span>
                        <span className="block text-[11px] text-muted-foreground">Cards, UPI, Net Banking (₹)</span>
                      </span>
                    </button>
                    <button
                      onClick={() => createOrderMutation.mutate({ orderId: paying.orderId, provider: "paypal" })}
                      className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-left hover:border-amber-400/70 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-amber-300 shrink-0" />
                      <span>
                        <span className="block text-sm font-medium">PayPal</span>
                        <span className="block text-[11px] text-muted-foreground">International (USD, converted at checkout)</span>
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
