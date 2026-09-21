"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import type { InvoicePdfData, InvoiceTheme } from "@/lib/invoice-pdf"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  FileText, Plus, Trash2, ArrowLeft, Building2, User, Mail, Phone,
  MapPin, Calendar, Hash, Calculator, Shield, Award, Sparkles, Printer,
  Copy, Save, QrCode, Landmark, Signature, GraduationCap, FlaskConical,
  Award as CertIcon, Wrench, CheckCircle2, Clock, AlertTriangle, Send,
  Wallet, TrendingUp, FileCheck, PenLine, Zap, Loader2,
} from "lucide-react"
import { toast } from "sonner"

type ItemIcon = "training" | "lab" | "cert" | "workshop"
type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue"

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  icon: ItemIcon
}

interface SavedInvoice {
  id: string
  number: string
  clientName: string
  clientOrg?: string | null
  total: number
  status: InvoiceStatus
  issueDate: string
  currency: string
  items?: string
  discountRate?: number
  taxRate?: number
  roundingAdjustment?: number
  gstSplit?: boolean
  dueDate?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  clientAddress?: string | null
  notes?: string | null
  terms?: string | null
  bankName?: string | null
  accountName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  upiId?: string | null
}

const ITEM_ICON_CONFIG: Record<ItemIcon, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  training: { icon: GraduationCap, label: "Training", color: "text-violet-300", bg: "bg-violet-500/10" },
  lab: { icon: FlaskConical, label: "Lab", color: "text-cyan-300", bg: "bg-cyan-500/10" },
  cert: { icon: CertIcon, label: "Cert", color: "text-amber-300", bg: "bg-amber-500/10" },
  workshop: { icon: Wrench, label: "Workshop", color: "text-emerald-300", bg: "bg-emerald-500/10" },
}

const STATUS_CONFIG: Record<InvoiceStatus, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  Draft: { color: "text-zinc-300", bg: "bg-zinc-500/10", border: "border-zinc-500/30", icon: FileText, label: "Draft" },
  Sent: { color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: Send, label: "Sent" },
  Paid: { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2, label: "Paid" },
  Overdue: { color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: AlertTriangle, label: "Overdue" },
}

const CURRENCY_LOCALE: Record<string, { locale: string; symbol: string; label: string }> = {
  INR: { locale: "en-IN", symbol: "₹", label: "Indian Rupee" },
  USD: { locale: "en-US", symbol: "$", label: "US Dollar" },
  EUR: { locale: "de-DE", symbol: "€", label: "Euro" },
  GBP: { locale: "en-GB", symbol: "£", label: "Pound Sterling" },
}

export function InvoiceGeneratorView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [editingInvoiceId, setEditingInvoiceId] = React.useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = React.useState(
    `GX-INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
  )
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split("T")[0]
  })
  const [status, setStatus] = React.useState<InvoiceStatus>("Draft")
  // PDF style: "dark" = cyber screen look (holographic, for sharing),
  // "light" = ink-friendly print version. Applies to both export buttons.
  const [pdfTheme, setPdfTheme] = React.useState<InvoiceTheme>("dark")

  // Client info
  const [clientName, setClientName] = React.useState("")
  const [clientOrg, setClientOrg] = React.useState("")
  const [clientEmail, setClientEmail] = React.useState("")
  const [clientPhone, setClientPhone] = React.useState("")
  const [clientAddress, setClientAddress] = React.useState("")

  // Pre-fill from lead CRM (sessionStorage)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const prefill = window.sessionStorage.getItem("guardianx-invoice-prefill")
      if (prefill) {
        const data = JSON.parse(prefill) as {
          clientName?: string
          clientOrg?: string
          clientEmail?: string
          clientPhone?: string
        }
        if (data.clientName) setClientName(data.clientName)
        if (data.clientOrg) setClientOrg(data.clientOrg)
        if (data.clientEmail) setClientEmail(data.clientEmail)
        if (data.clientPhone) setClientPhone(data.clientPhone)
        window.sessionStorage.removeItem("guardianx-invoice-prefill")
        toast.success("Lead info pre-filled from CRM")
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Line items
  const [items, setItems] = React.useState<LineItem[]>([
    { id: "1", description: "CEH Certification Training Batch (Weekend)", quantity: 1, unitPrice: 25000, icon: "training" },
    { id: "2", description: "Hands-on Cyber Lab Access (31 labs, 3 months)", quantity: 1, unitPrice: 5000, icon: "lab" },
  ])

  // Tax & adjustments
  const [taxRate, setTaxRate] = React.useState(18) // GST 18%
  const [discountRate, setDiscountRate] = React.useState(0)
  const [roundingAdjustment, setRoundingAdjustment] = React.useState(0)
  const [currency, setCurrency] = React.useState("INR")
  const [gstSplit, setGstSplit] = React.useState(true) // CGST + SGST split for India

  // Bank details - GuardianX official banking
  const [bankName, setBankName] = React.useState("Jammu & Kashmir Bank")
  const [accountName, setAccountName] = React.useState("GuardianX")
  const [accountNumber, setAccountNumber] = React.useState("0778040100005715")
  const [ifscCode, setIfscCode] = React.useState("JAKA0KANIHA") // J&K Bank IFSC
  const [upiId, setUpiId] = React.useState("ayanalidar@okaxis")

  // Notes & Terms
  const [notes, setNotes] = React.useState(
    "Payment due within 15 days of invoice date. Late payments subject to 2% monthly interest. All prices are inclusive of applicable taxes unless otherwise stated.",
  )
  const [terms, setTerms] = React.useState(
    "1. Training includes instructor-led sessions, study materials, and lab access.\n2. Certification exam fee is separate unless stated.\n3. Cancellation: 50% refund if cancelled 7+ days before start. No refund within 7 days.\n4. GuardianX Academy is not liable for third-party certification exam outcomes.",
  )

  // Saved invoices - persisted in the DB via /api/invoices (was: React state,
  // lost on every refresh).
  const invoicesQuery = useQuery<{ invoices: SavedInvoice[] }>({
    queryKey: ["invoices"],
    queryFn: () => api("/api/invoices"),
  })
  const savedInvoices = invoicesQuery.data?.invoices ?? []

  const saveMutation = useMutation({
    mutationFn: (payload: { id: string | null; body: Record<string, unknown> }) =>
      payload.id
        ? api(`/api/invoices/${payload.id}`, { method: "PATCH", body: JSON.stringify(payload.body) })
        : api("/api/invoices", { method: "POST", body: JSON.stringify(payload.body) }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast.success(payload.id ? "Invoice updated" : `Invoice saved as ${status}`)
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  })

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: InvoiceStatus }) =>
      api(`/api/invoices/${payload.id}`, { method: "PATCH", body: JSON.stringify({ status: payload.status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
    onError: (e: any) => toast.error(e?.message || "Status update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/invoices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast.success("Invoice deleted")
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  })

  function addItem() {
    setItems([...items, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, icon: "training" }])
  }
  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id))
  }
  function updateItem(id: string, field: keyof LineItem, value: string | number | ItemIcon) {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const discountAmount = (subtotal * discountRate) / 100
  const taxableAmount = subtotal - discountAmount
  const taxAmount = (taxableAmount * taxRate) / 100
  const totalBeforeRound = taxableAmount + taxAmount
  const total = totalBeforeRound + (roundingAdjustment || 0)
  const cgstAmount = gstSplit && currency === "INR" ? taxAmount / 2 : 0
  const sgstAmount = gstSplit && currency === "INR" ? taxAmount / 2 : 0

  const cur = CURRENCY_LOCALE[currency] ?? CURRENCY_LOCALE.INR

  function formatMoney(amount: number) {
    return `${cur.symbol}${amount.toLocaleString(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // ---------------------------------------------------------------------------
  // PDF export - native vector A4 (src/lib/invoice-pdf.ts). Replaces the old
  // html2canvas screenshot pipeline that produced a blurry dark-theme card
  // floating in the middle of a landscape page. The new document is full-A4
  // portrait, print-grade (vector text), light theme, with the same brand.
  // ---------------------------------------------------------------------------
  function collectPdfData(): InvoicePdfData {
    return {
      number: invoiceNumber,
      status,
      issueDate,
      dueDate,
      currency,
      clientName,
      clientOrg,
      clientEmail,
      clientPhone,
      clientAddress,
      items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, icon: i.icon })),
      discountRate,
      taxRate,
      roundingAdjustment,
      gstSplit,
      notes,
      terms,
      bankName,
      accountName,
      accountNumber,
      ifscCode,
      upiId,
    }
  }

  /** Rasterize the on-screen UPI QR (same payload as the preview) to a crisp 512px PNG. */
  async function buildQrPng(): Promise<string | null> {
    try {
      if (!(total > 0) || !upiId) return null
      let svg = document.querySelector("#upi-qr-holder svg")?.outerHTML
      if (!svg) return null
      // React omits xmlns when hydrating JSX-created SVGs; standalone image
      // decoding REQUIRES it - inject before wrapping into a data URL.
      if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
      const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
      const img = new Image()
      img.src = svgUrl
      await img.decode()
      const canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      return canvas.toDataURL("image/png")
    } catch (e) {
      console.warn("[invoice-pdf] QR rasterization failed - continuing without QR", e)
      return null
    }
  }

  /** Load the GuardianX shield logo as a 256px PNG data-URL (keeps the PDF
   *  small while staying ~460 DPI at the 16mm print size).
   *
   *  CRITICAL: the canvas is pre-filled with the exact violet (#2E1065) the
   *  shield sits on in the PDF header chip. This flattens alpha to fully
   *  opaque - jsPDF then embeds the PNG WITHOUT an /SMask object. Chrome's
   *  print / Save-as-PDF renderer drops SMask'd images, which made the logo
   *  vanish in "Print → Save as PDF" output (screen rendering was fine).
   *  Transparent pixels become chip-violet and blend invisibly into the chip
   *  drawn behind them, so the visual result is pixel-identical. */
  async function buildLogoPng(): Promise<string | null> {
    try {
      const img = new Image()
      img.src = "/guardianx-logo-v2.png"
      await img.decode()
      const canvas = document.createElement("canvas")
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.fillStyle = "#2E1065"
      ctx.fillRect(0, 0, 256, 256)
      ctx.drawImage(img, 0, 0, 256, 256)
      return canvas.toDataURL("image/png")
    } catch (e) {
      console.warn("[invoice-pdf] logo load failed - falling back to drawn mark", e)
      return null
    }
  }

  async function generateInvoicePdf() {
    const { buildInvoicePdf } = await import("@/lib/invoice-pdf")
    const [qrPngDataUrl, logoPngDataUrl] = await Promise.all([buildQrPng(), buildLogoPng()])
    return buildInvoicePdf(collectPdfData(), { qrPngDataUrl, logoPngDataUrl, theme: pdfTheme })
  }

  async function handleGeneratePdf() {
    try {
      toast.info(`Generating ${pdfTheme === "dark" ? "cyber screen-style" : "print-style"} A4 PDF…`)
      const pdf = await generateInvoicePdf()
      pdf.save(`${invoiceNumber || "invoice"}.pdf`)
      toast.success(`A4 PDF downloaded - ${pdfTheme === "dark" ? "cyber dark" : "print light"} theme, vector quality`)
    } catch (err: any) {
      console.error("[invoice-pdf]", err)
      toast.error(err?.message || "Failed to generate PDF")
    }
  }

  async function handlePrintPdf() {
    // Open the tab SYNCHRONOUSLY inside the user gesture. window.open() after
    // the async PDF build (font fetch + QR/logo raster can exceed 5s) loses
    // transient activation and gets popup-blocked, silently pushing people
    // into Ctrl+P of the app page instead of the vector A4 document.
    // NOTE: do NOT document.write a placeholder into the tab - a written
    // about:blank document silently REFUSES the later blob: navigation
    // (verified empirically: the tab stays stuck on about:blank forever).
    const win = window.open("", "_blank")
    try {
      toast.info("Preparing print-ready A4 document…")
      const pdf = await generateInvoicePdf()
      pdf.autoPrint()
      const url = pdf.output("bloburl") as unknown as string
      if (win) {
        win.location.href = url
      } else if (typeof document !== "undefined") {
        // Popups blocked → fall back to a hidden in-page frame. Chrome's
        // embedded PDF viewer honours the document's autoPrint action, so the
        // print dialog still opens over the current page.
        const frame = document.createElement("iframe")
        frame.style.position = "fixed"
        frame.style.right = "0"
        frame.style.bottom = "0"
        frame.style.width = "1px"
        frame.style.height = "1px"
        frame.style.opacity = "0"
        frame.style.border = "0"
        frame.src = url
        document.body.appendChild(frame)
        setTimeout(() => frame.remove(), 120000)
      } else {
        toast.error("Popup blocked - allow popups to use Print, or use Generate PDF")
      }
    } catch (err: any) {
      win?.close()
      console.error("[invoice-pdf-print]", err)
      toast.error(err?.message || "Failed to open print view")
    }
  }

  function handleCopyInvoiceNumber() {
    navigator.clipboard?.writeText(invoiceNumber)
    toast.success("Invoice number copied!")
  }

  function handleSaveInvoice() {
    const body = {
      number: invoiceNumber,
      clientName: clientName || "Untitled",
      clientOrg,
      clientEmail,
      clientPhone,
      clientAddress,
      items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, icon: i.icon })),
      currency,
      discountRate,
      taxRate,
      roundingAdjustment,
      gstSplit,
      status,
      issueDate,
      dueDate,
      notes,
      terms,
      bankName,
      accountName,
      accountNumber,
      ifscCode,
      upiId,
    }
    saveMutation.mutate({ id: editingInvoiceId, body })
  }

  /** Load a saved invoice back into the editor for re-editing. */
  function handleEditInvoice(inv: SavedInvoice) {
    setEditingInvoiceId(inv.id)
    setInvoiceNumber(inv.number)
    setClientName(inv.clientName || "")
    setClientOrg(inv.clientOrg || "")
    setClientEmail(inv.clientEmail || "")
    setClientPhone(inv.clientPhone || "")
    setClientAddress(inv.clientAddress || "")
    setCurrency(inv.currency || "INR")
    setDiscountRate(inv.discountRate ?? 0)
    setTaxRate(inv.taxRate ?? 0)
    setRoundingAdjustment(inv.roundingAdjustment ?? 0)
    setGstSplit(inv.gstSplit ?? false)
    setStatus(inv.status)
    setIssueDate(inv.issueDate || new Date().toISOString().split("T")[0])
    setDueDate(inv.dueDate || "")
    setNotes(inv.notes || "")
    setTerms(inv.terms || "")
    setBankName(inv.bankName || "")
    setAccountName(inv.accountName || "")
    setAccountNumber(inv.accountNumber || "")
    setIfscCode(inv.ifscCode || "")
    setUpiId(inv.upiId || "")
    try {
      const parsed = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed.map((it: any, idx: number) => ({
          id: `${inv.id}-${idx}`,
          description: String(it.description || ""),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          icon: (ITEM_ICON_CONFIG[it.icon as ItemIcon] ? it.icon : "training") as ItemIcon,
        })))
      }
    } catch {
      // keep current items if the stored JSON is unreadable
    }
    toast.success(`Editing ${inv.number}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  /** Start a fresh invoice (clears edit mode, new number). */
  function handleNewInvoice() {
    setEditingInvoiceId(null)
    setInvoiceNumber(`GX-INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`)
    toast.info("New invoice draft started")
  }

  function formatMoneyFor(amount: number, invoiceCurrency: string) {
    const c = CURRENCY_LOCALE[invoiceCurrency] ?? CURRENCY_LOCALE.INR
    return `${c.symbol}${amount.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Mini dashboard stats - computed from the DB-backed invoice list
  const totalInvoices = savedInvoices.length
  const pendingAmount = savedInvoices
    .filter((i) => i.status === "Sent" || i.status === "Overdue")
    .reduce((sum, i) => sum + i.total, 0)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const paidThisMonth = savedInvoices
    .filter((i) => i.status === "Paid" && new Date(i.issueDate) >= monthStart)
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="relative min-h-screen bg-mesh">
      {/* Header bar - hidden on print */}
      <div className="print:hidden border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Admin
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-400" />
                Invoice Generator
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">{invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleCopyInvoiceNumber}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy ID
            </Button>
            {editingInvoiceId && (
              <Button variant="outline" size="sm" onClick={handleNewInvoice}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSaveInvoice} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {editingInvoiceId ? "Update" : "Save"}
            </Button>
            <div
              className="flex items-center rounded-lg border border-zinc-700/60 overflow-hidden h-8"
              role="group"
              aria-label="PDF style"
              title={pdfTheme === "dark" ? "Cyber screen style - great for sharing (heavy on ink)" : "Print style - ink-friendly white paper"}
            >
              <button
                type="button"
                onClick={() => setPdfTheme("dark")}
                aria-pressed={pdfTheme === "dark"}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-full text-xs font-medium transition-colors",
                  pdfTheme === "dark" ? "bg-violet-600/30 text-violet-200" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" /> Screen
              </button>
              <button
                type="button"
                onClick={() => setPdfTheme("light")}
                aria-pressed={pdfTheme === "light"}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-full text-xs font-medium transition-colors border-l border-zinc-700/60",
                  pdfTheme === "light" ? "bg-violet-600/30 text-violet-200" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
            <Button size="sm" onClick={handleGeneratePdf} className="bg-violet-600 hover:bg-violet-500 btn-premium">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Generate PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrintPdf} className="border-violet-500/40 hover:bg-violet-500/10">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* === MINI DASHBOARD (hidden on print) === */}
        <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card-premium rounded-xl p-4 flex items-center gap-3"
          >
            <div className="inline-flex p-2.5 rounded-lg bg-violet-500/10">
              <FileCheck className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{totalInvoices}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Invoices (Session)</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="card-premium rounded-xl p-4 flex items-center gap-3"
          >
            <div className="inline-flex p-2.5 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{formatMoney(pendingAmount)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Amount</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="card-premium rounded-xl p-4 flex items-center gap-3"
          >
            <div className="inline-flex p-2.5 rounded-lg bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{formatMoney(paidThisMonth)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid This Month</div>
            </div>
          </motion.div>
        </div>

        {/* === SAVED INVOICES (DB-backed) === */}
        <div className="print:hidden mb-6">
          <Card className="p-4 card-premium">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-cyan-400" /> Saved Invoices
                <Badge variant="outline" className="text-[9px] text-muted-foreground">{savedInvoices.length}</Badge>
              </h2>
              {invoicesQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {invoicesQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : savedInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No invoices saved yet - fill in the details and click <span className="font-medium text-foreground">Save</span>.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {savedInvoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.Draft
                  const StatusIcon = cfg.icon
                  return (
                    <div
                      key={inv.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors",
                        editingInvoiceId === inv.id
                          ? "border-violet-500/50 bg-violet-500/5"
                          : "border-border/60 hover:border-border",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleEditInvoice(inv)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        title="Load into editor"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium truncate">{inv.number}</span>
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border", cfg.bg, cfg.color, cfg.border)}>
                              <StatusIcon className="h-2.5 w-2.5" /> {cfg.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {inv.clientName}{inv.clientOrg ? ` · ${inv.clientOrg}` : ""} · {inv.issueDate}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold tabular-nums">{formatMoneyFor(inv.total, inv.currency)}</span>
                        {inv.status !== "Paid" && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-[10px] text-emerald-300 hover:text-emerald-200"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: inv.id, status: "Paid" })}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-rose-400 hover:text-rose-300"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (editingInvoiceId === inv.id) setEditingInvoiceId(null)
                            deleteMutation.mutate(inv.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* === EDITOR PANEL (hidden on print) === */}
          <div className="print:hidden lg:col-span-5 space-y-4">
            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Hash className="h-4 w-4 text-violet-400" /> Invoice Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Invoice Number</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Issue Date</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ INR - Indian Rupee</SelectItem>
                      <SelectItem value="USD">$ USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                      <SelectItem value="GBP">£ GBP - Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tax Rate (%)</Label>
                  <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Discount (%)</Label>
                  <Input type="number" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Rounding Adjustment</Label>
                  <Input type="number" value={roundingAdjustment} onChange={(e) => setRoundingAdjustment(Number(e.target.value))} />
                </div>
                {currency === "INR" && (
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="gst-split"
                      checked={gstSplit}
                      onChange={(e) => setGstSplit(e.target.checked)}
                      className="size-4 rounded border-border accent-violet-500"
                    />
                    <Label htmlFor="gst-split" className="text-xs cursor-pointer">
                      Split GST into CGST + SGST (9% + 9% for 18% GST - India format)
                    </Label>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" /> Client Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact Name</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label className="text-xs">Organization</Label>
                  <Input value={clientOrg} onChange={(e) => setClientOrg(e.target.value)} placeholder="Organization Name" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Full billing address" rows={2} />
                </div>
              </div>
            </Card>

            <Card className="p-5 card-premium">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-amber-400" /> Line Items
                </h2>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const iconCfg = ITEM_ICON_CONFIG[item.icon]
                  return (
                    <div key={item.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-12">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            placeholder="Description"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-5">
                          <Label className="text-[10px] text-muted-foreground">Type</Label>
                          <Select value={item.icon} onValueChange={(v) => updateItem(item.id, "icon", v as ItemIcon)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ITEM_ICON_CONFIG) as ItemIcon[]).map((k) => {
                                const cfg = ITEM_ICON_CONFIG[k]
                                return (
                                  <SelectItem key={k} value={k}>
                                    <span className="flex items-center gap-2">
                                      <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                                      {cfg.label}
                                    </span>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Label className="text-[10px] text-muted-foreground">Qty</Label>
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} className="text-sm" />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-[10px] text-muted-foreground">Unit Price</Label>
                          <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))} className="text-sm" />
                        </div>
                        <div className="col-span-1 flex items-end justify-center pb-1">
                          <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-300 px-2 h-8">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-emerald-400" /> Bank Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Account Name</Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Account Number</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs">IFSC Code</Label>
                  <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">UPI ID</Label>
                  <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
            </Card>

            <Card className="p-5 card-premium">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-400" /> Notes & Terms
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Payment Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Terms & Conditions</Label>
                  <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="text-xs" />
                </div>
              </div>
            </Card>
          </div>

          {/* === INVOICE PREVIEW (dark futuristic) === */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              id="invoice-preview"
              className="relative rounded-2xl overflow-hidden gx-aurora"
            >
              {/* Aurora Luxe: watermark shield + corner glows on the paper */}
              <div className="gx-watermark" aria-hidden />
              <div className="gx-corner-glows" aria-hidden />
              {/* Aurora glass header */}
              <div className="relative">
                {/* Slim accent edge (static - no pulse, keeps it premium) */}
                <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" />
                {/* Header */}
                <div className="relative p-6 sm:p-8 overflow-hidden">
                  {/* Aurora glow orbs */}
                  <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-violet-600/25 blur-[90px] pointer-events-none" />
                  <div className="absolute -bottom-24 -left-14 w-72 h-72 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />
                  <div className="absolute top-1/3 left-1/2 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-[70px] pointer-events-none" />
                  <div className="relative flex items-start justify-between flex-wrap gap-4">
                    {/* Company branding - hero logo badge + tagline */}
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-violet-500/40 blur-xl" />
                        <div className="relative rounded-2xl bg-white/5 ring-1 ring-white/20 p-2">
                          <img
                            src="/guardianx-logo-v2.png"
                            alt="GuardianX Academy"
                            className="relative w-24 h-24 sm:w-28 sm:h-28 object-contain"
                            style={{ filter: "drop-shadow(0 0 18px rgba(167,139,250,0.6))" }}
                          />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-premium">GuardianX Academy</h1>
                        <p className="text-[11px] text-violet-200/90 mt-0.5">Cybersecurity Training & Certification</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px] text-slate-200">
                          <span className="gx-glass-soft inline-flex items-center gap-1 px-2 py-0.5"><Mail className="h-3 w-3 text-cyan-300" /> academy@guardianx.in</span>
                          <span className="gx-glass-soft inline-flex items-center gap-1 px-2 py-0.5"><Mail className="h-3 w-3 text-cyan-300" /> academy@guardianx.cloud</span>
                          <span className="gx-glass-soft inline-flex items-center gap-1 px-2 py-0.5"><MapPin className="h-3 w-3 text-cyan-300" /> Nooripora, Baramulla, Kashmir 193401 &amp; Gautam Buddha Nagar, Noida 201301</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl sm:text-5xl font-bold tracking-[0.14em] text-gradient-premium">INVOICE</div>
                      <div className="text-sm text-violet-200/90 font-mono mt-1.5">{invoiceNumber}</div>
                      {/* Status stamp - rubber-stamp treatment */}
                      <div className="mt-4">
                        {(() => {
                          const StatusIcon = STATUS_CONFIG[status].icon
                          return (
                            <span className={cn("gx-stamp", STATUS_CONFIG[status].color)}>
                              <StatusIcon className="h-4 w-4" />
                              {STATUS_CONFIG[status].label}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To + Dates - frosted panels */}
              <div className="grid sm:grid-cols-2 gap-4 p-6 sm:p-8 pt-2">
                <div className="gx-glass p-5">
                  <p className="gx-label">Bill To</p>
                  <div className="gx-gradient-rule w-16 mb-3" aria-hidden />
                  <div className="flex items-start gap-3">
                    {/* Client avatar circle */}
                    <div className="size-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-border/60 flex items-center justify-center text-sm font-bold text-cyan-100 shrink-0">
                      {(clientName || clientOrg || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">{clientName || "Client Name"}</p>
                      {clientOrg && <p className="text-sm text-slate-400">{clientOrg}</p>}
                      {clientEmail && (
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-violet-300" /> {clientEmail}
                        </p>
                      )}
                      {clientPhone && (
                        <p className="text-xs text-slate-300 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-violet-300" /> {clientPhone}
                        </p>
                      )}
                      {clientAddress && <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{clientAddress}</p>}
                    </div>
                  </div>
                </div>
                <div className="gx-glass p-5 sm:text-right">
                  <p className="gx-label">Invoice Details</p>
                  <div className="gx-gradient-rule w-16 mb-3 sm:ml-auto" aria-hidden />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex sm:justify-end items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-cyan-300" />
                      <span className="text-slate-400">Issue:</span>
                      <span className="font-medium text-slate-100">{new Date(issueDate).toLocaleDateString(cur.locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex sm:justify-end items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-cyan-300" />
                      <span className="text-slate-400">Due:</span>
                      <span className="font-medium text-slate-100">{new Date(dueDate).toLocaleDateString(cur.locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex sm:justify-end items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-cyan-300" />
                      <span className="text-slate-400">Currency:</span>
                      <span className="font-medium text-slate-100">{cur.symbol} {currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items table - frosted panel */}
              <div className="px-6 sm:px-8 pb-2">
                <div className="gx-glass p-4 sm:p-5">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-600/30 via-fuchsia-500/20 to-cyan-400/20">
                      <th className="text-left py-3 px-3 rounded-l-lg text-[10px] font-bold uppercase tracking-wider text-cyan-200">Item</th>
                      <th className="text-center py-3 text-[10px] font-bold uppercase tracking-wider text-cyan-200 w-16">Qty</th>
                      <th className="text-right py-3 text-[10px] font-bold uppercase tracking-wider text-cyan-200 w-28">Unit Price</th>
                      <th className="text-right py-3 px-3 rounded-r-lg text-[10px] font-bold uppercase tracking-wider text-cyan-200 w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const cfg = ITEM_ICON_CONFIG[item.icon]
                      return (
                        <tr key={item.id} className="border-b border-white/5 last:border-0">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("inline-flex p-1.5 rounded-md border border-white/15", cfg.bg)}>
                                <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                              </div>
                              <span className="text-sm text-slate-100">{item.description || "-"}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-sm text-slate-300 tabular-nums">{item.quantity}</td>
                          <td className="py-3 text-right text-sm text-slate-300 tabular-nums">{formatMoney(item.unitPrice)}</td>
                          <td className="py-3 text-right text-sm font-medium text-slate-100 tabular-nums">{formatMoney(item.quantity * item.unitPrice)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>

                {/* Totals + QR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 px-6 sm:px-8">
                  {/* Payment QR - real UPI QR code with invoice amount */}
                  <div className="order-2 sm:order-1">
                    <div className="gx-glass p-4">
                      <div className="flex items-start gap-3">
                        <div id="upi-qr-holder" className="size-20 sm:size-24 rounded-lg bg-white p-2 flex items-center justify-center shrink-0">
                          {total > 0 && upiId ? (
                            <QRCodeSVG
                              value={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(accountName || "GuardianX")}&am=${total.toFixed(2)}&cu=${currency === "INR" ? "INR" : "USD"}&tn=${encodeURIComponent(invoiceNumber)}`}
                              size={88}
                              level="M"
                              className="size-full"
                            />
                          ) : (
                            <QrCode className="size-full text-zinc-900" />
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <QrCode className="h-3.5 w-3.5 text-violet-300" /> Scan to Pay (UPI)
                          </p>
                          <p className="text-slate-400">UPI ID: <span className="font-mono text-slate-100">{upiId}</span></p>
                          <p className="text-slate-400">Amount: <span className="font-mono text-slate-100">{formatMoney(total)}</span></p>
                          <p className="text-slate-400">Account: <span className="font-mono text-slate-100">{accountNumber}</span></p>
                          <p className="text-slate-400">IFSC: <span className="font-mono text-slate-100">{ifscCode}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="order-1 sm:order-2 sm:ml-auto w-full sm:w-72">
                    <div className="gx-glass p-5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-medium text-slate-100 tabular-nums">{formatMoney(subtotal)}</span>
                    </div>
                    {discountRate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Discount ({discountRate}%)</span>
                        <span className="text-rose-300 tabular-nums">−{formatMoney(discountAmount)}</span>
                      </div>
                    )}
                    {gstSplit && currency === "INR" ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">CGST ({taxRate / 2}%)</span>
                          <span className="font-medium text-slate-100 tabular-nums">{formatMoney(cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">SGST ({taxRate / 2}%)</span>
                          <span className="font-medium text-slate-100 tabular-nums">{formatMoney(sgstAmount)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{taxRate > 0 ? `Tax (${taxRate}%)` : "Tax"}</span>
                        <span className="font-medium text-slate-100 tabular-nums">{formatMoney(taxAmount)}</span>
                      </div>
                    )}
                    {roundingAdjustment !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Rounding</span>
                        <span className="font-medium text-slate-100 tabular-nums">{formatMoney(roundingAdjustment)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/15 pt-3 flex justify-between items-center">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Total</span>
                      <span className="font-bold text-2xl text-gradient-premium tabular-nums">{formatMoney(total)}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      {currency === "INR" ? "GST included as applicable" : "Taxes as applicable"}
                    </div>
                    </div>
                  </div>
                </div>

              {/* Bank details + Signature - frosted panels */}
              <div className="grid sm:grid-cols-2 gap-4 px-6 sm:px-8 pb-4">
                <div className="gx-glass p-5">
                  <p className="gx-label mb-2 flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-emerald-300" /> Bank Details
                  </p>
                  <div className="text-xs space-y-1">
                    <div className="flex gap-2"><span className="text-slate-400 w-24">Bank:</span><span className="font-medium text-slate-100">{bankName}</span></div>
                    <div className="flex gap-2"><span className="text-slate-400 w-24">Account Name:</span><span className="font-medium text-slate-100">{accountName}</span></div>
                    <div className="flex gap-2"><span className="text-slate-400 w-24">Account No:</span><span className="font-mono text-slate-100">{accountNumber}</span></div>
                    <div className="flex gap-2"><span className="text-slate-400 w-24">IFSC:</span><span className="font-mono text-slate-100">{ifscCode}</span></div>
                    <div className="flex gap-2"><span className="text-slate-400 w-24">UPI:</span><span className="font-mono text-slate-100">{upiId}</span></div>
                  </div>
                </div>
                <div className="gx-glass p-5 sm:text-right">
                  <p className="gx-label mb-2 flex items-center gap-1.5 sm:justify-end">
                    <Signature className="h-3.5 w-3.5 text-violet-300" /> Authorized Signatory
                  </p>
                  <div className="sm:ml-auto mt-3 mb-2 w-48 flex flex-col items-center">
                    <span className="gx-script text-2xl text-violet-200/85 leading-none" aria-hidden>GuardianX</span>
                    <div className="mt-2 h-px w-full border-b-2 border-dashed border-white/25" />
                    <span className="text-[10px] text-slate-400 italic mt-1">For GuardianX Academy</span>
                  </div>
                  <p className="text-xs font-medium text-slate-100">Authorized Signatory</p>
                  <p className="text-[10px] text-slate-400">GuardianX Academy · academy@guardianx.in</p>
                </div>
              </div>

              {/* Notes & Terms */}
              {(notes || terms) && (
              <div className="px-6 sm:px-8 pb-6 grid sm:grid-cols-2 gap-4">
                {notes && (
                  <div className="gx-glass-soft p-4">
                    <p className="gx-label mb-1">Notes</p>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{notes}</p>
                  </div>
                )}
                {terms && (
                  <div className="gx-glass-soft p-4">
                    <p className="gx-label mb-1">Terms &amp; Conditions</p>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{terms}</p>
                  </div>
                )}
              </div>
              )}

              {/* Footer with trust indicators */}
              <div className="border-t border-white/10 px-6 sm:px-8 py-4 bg-white/[0.03]">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Shield className="h-3.5 w-3.5 text-violet-400" /> Verified Training Provider
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Award className="h-3.5 w-3.5 text-violet-400" /> ISO-Aligned Curriculum
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    academy.guardianx.cloud
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Ctrl+P fallback styles - the dedicated Print button produces the real
          vector A4 PDF; these only style a raw browser print of the app page. */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-preview, #invoice-preview * {
            visibility: visible;
          }
          #invoice-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          /* Force background colors into print output even when the browser's
             'Background graphics' checkbox is OFF. */
          #invoice-preview, #invoice-preview * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* CSS filters (the logo's drop-shadow glow) can blank <img> elements
             in Chrome's print renderer - strip them for print output. */
          #invoice-preview img {
            filter: none !important;
          }
        }
      `}</style>
    </div>
  )
}
