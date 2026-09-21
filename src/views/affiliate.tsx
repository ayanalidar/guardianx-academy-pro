"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"
import {
  ArrowLeft, Gift, Link2, Copy, Check, MousePointerClick,
  UserPlus, TrendingUp, IndianRupee, Activity, Sparkles,
  ExternalLink, Loader2, QrCode, Calendar,
} from "lucide-react"
import { toast } from "sonner"

/* ---------------------------------------------------------------- *
 *  Types                                                            *
 * ---------------------------------------------------------------- */
type RecentClick = {
  id: string
  ip: string
  userAgent: string
  courseId: string | null
  createdAt: string
}

type Affiliate = {
  id: string
  userId: string
  code: string
  commissionRate: number
  clicks: number
  signups: number
  conversions: number
  earnings: number
  active: boolean
  createdAt: string
  conversionRate: number
  recentClicks: RecentClick[]
}

type AffiliateResponse = { affiliate: Affiliate | null }

/* ---------------------------------------------------------------- *
 *  Helpers                                                          *
 * ---------------------------------------------------------------- */
function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return " - "
  const diff = Date.now() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return " - "
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function fmtUA(ua: string): string {
  if (!ua) return "Unknown"
  // Strip version detail so the row stays readable
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] ?? ""
  const os = ua.match(/(Windows|Macintosh|Linux|iPhone|iPad|Android)/)?.[0] ?? ""
  return [browser, os].filter(Boolean).join(" · ") || "Unknown device"
}

/* ---------------------------------------------------------------- *
 *  Component                                                        *
 * ---------------------------------------------------------------- */
export function AffiliateView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [joining, setJoining] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const { data, isLoading, error } = useQuery<AffiliateResponse>({
    queryKey: ["affiliate-me"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/affiliate/me", { credentials: "include" })
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized - please sign in")
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Failed to load affiliate info")
      }
      return res.json()
    },
  })

  const affiliate = data?.affiliate ?? null

  /* Referral link - points to the public track endpoint so clicks get
   * recorded before landing on the homepage. Built from window.origin
   * so it's shareable on social media, email signatures, etc. */
  const referralLink = React.useMemo(() => {
    if (typeof window === "undefined" || !affiliate) return ""
    return `${window.location.origin}/api/affiliate/track?code=${encodeURIComponent(affiliate.code)}`
  }, [affiliate])

  async function handleJoin() {
    setJoining(true)
    try {
      const res = await fetch("/api/affiliate/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      const j = await res.json()
      if (!res.ok) {
        toast.error(j.error || "Failed to join the affiliate program")
        return
      }
      toast.success("Welcome to the GuardianX Affiliate Program!")
      queryClient.invalidateQueries({ queryKey: ["affiliate-me"] })
    } catch {
      toast.error("Network error - please try again")
    } finally {
      setJoining(false)
    }
  }

  async function handleCopyLink() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success("Referral link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy - please copy manually")
    }
  }

  /* ----------------------- Loading state ----------------------- */
  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  /* ----------------------- Error state ----------------------- */
  if (error) {
    return (
      <div className="relative min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Card className="p-8 border-rose-500/30 bg-rose-500/5">
            <h2 className="text-lg font-bold text-rose-300 mb-2">Unable to load</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as Error)?.message || "Something went wrong"}
            </p>
            <Button onClick={() => navigate({ name: "dashboard" })} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "dashboard" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Gift className="h-5 w-5 text-violet-400" /> Affiliate Program
            </h1>
          </div>
          {affiliate && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Active
            </Badge>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ----------------- Not-an-affiliate CTA ----------------- */}
        {!affiliate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="relative overflow-hidden p-8 sm:p-10 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
              <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-violet-300/80 mb-3">
                    <Sparkles className="h-3 w-3" /> Earn 10% commission
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                    Become a GuardianX Affiliate
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl leading-relaxed mb-6">
                    Share your unique referral link with friends, colleagues, and your network. You earn
                    a commission on every paid enrollment that comes through your link - track clicks,
                    signups, and conversions in real time.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                    {[
                      "10% default commission rate",
                      "Real-time click & signup tracking",
                      "Shareable link + QR code",
                      "Monthly payout eligibility",
                    ].map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    onClick={handleJoin}
                    disabled={joining}
                    className="bg-violet-600 hover:bg-violet-500"
                  >
                    {joining ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining…</>
                    ) : (
                      <><Gift className="h-4 w-4 mr-2" /> Join the Affiliate Program</>
                    )}
                  </Button>
                </div>
                <div className="hidden lg:block">
                  <div className="size-32 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                    <Gift className="h-14 w-14 text-violet-300" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ----------------- Affiliate dashboard ----------------- */}
        {affiliate && (
          <>
            {/* Referral link + QR */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="h-4 w-4 text-violet-300" />
                  <h3 className="text-sm font-semibold">Your Referral Link</h3>
                </div>
                <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
                  <div className="space-y-3">
                    <div className="flex items-stretch gap-2">
                      <Input
                        readOnly
                        value={referralLink}
                        className="font-mono text-xs sm:text-sm bg-muted/40"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button onClick={handleCopyLink} className="shrink-0">
                        {copied ? (
                          <><Check className="h-4 w-4 mr-1.5" /> Copied</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1.5" /> Copy</>
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-violet-300/80 font-mono">Code</span>
                        <Badge variant="outline" className="font-mono text-[11px]">{affiliate.code}</Badge>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Joined {fmtDate(affiliate.createdAt)}
                      </span>
                      <a
                        href={referralLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Test link
                      </a>
                    </div>
                  </div>
                  {/* QR code */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-28 rounded-lg bg-white p-2 flex items-center justify-center">
                      <QRCodeSVG value={referralLink} size={112} level="M" className="size-full" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                      <QrCode className="h-3 w-3" /> SCAN TO OPEN
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Clicks", value: affiliate.clicks, icon: MousePointerClick, color: "text-cyan-300", tint: "bg-cyan-500/10" },
                { label: "Signups", value: affiliate.signups, icon: UserPlus, color: "text-violet-300", tint: "bg-violet-500/10" },
                { label: "Conversions", value: affiliate.conversions, icon: TrendingUp, color: "text-emerald-300", tint: "bg-emerald-500/10" },
                { label: "Earnings", value: `₹${affiliate.earnings.toFixed(2)}`, icon: IndianRupee, color: "text-amber-300", tint: "bg-amber-500/10" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("inline-flex p-2 rounded-lg", s.tint)}>
                        <s.icon className={cn("h-4 w-4", s.color)} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Commission + conversion rate strip */}
            <Card className="p-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Commission Rate</div>
                  <div className="text-xl font-bold text-violet-300">{affiliate.commissionRate}%</div>
                  <div className="text-[11px] text-muted-foreground">per paid enrollment</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Conversion Rate</div>
                  <div className="text-xl font-bold text-emerald-300">{affiliate.conversionRate}%</div>
                  <div className="text-[11px] text-muted-foreground">clicks → conversions</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg. Earning / Conversion</div>
                  <div className="text-xl font-bold text-amber-300">
                    ₹{affiliate.conversions > 0 ? (affiliate.earnings / affiliate.conversions).toFixed(2) : "0.00"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">lifetime</div>
                </div>
              </div>
            </Card>

            {/* Recent activity */}
            <Card className="overflow-hidden">
              <div className="border-b border-border/40 px-5 py-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-300" />
                <h3 className="text-sm font-semibold">Recent Click Activity</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Last {affiliate.recentClicks.length} clicks
                </Badge>
              </div>
              {affiliate.recentClicks.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No clicks yet. Share your referral link to start earning!
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr className="text-left">
                        <th className="py-2.5 px-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">When</th>
                        <th className="py-2.5 px-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</th>
                        <th className="py-2.5 px-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IP</th>
                        <th className="py-2.5 px-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Course</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliate.recentClicks.map((c) => (
                        <tr key={c.id} className="border-t border-border/30 hover:bg-muted/20">
                          <td className="py-2.5 px-5 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(c.createdAt)}</td>
                          <td className="py-2.5 px-5 text-xs">{fmtUA(c.userAgent)}</td>
                          <td className="py-2.5 px-5 text-xs font-mono text-muted-foreground">{c.ip || " - "}</td>
                          <td className="py-2.5 px-5 text-xs font-mono text-muted-foreground">{c.courseId ? c.courseId.slice(-6) : " - "}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* How it works */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" /> How It Works
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Share your link", desc: "Post it on social media, email signatures, your blog, or messaging apps." },
                  { step: "2", title: "Track clicks", desc: "We log every click on your referral link - see activity in real time." },
                  { step: "3", title: "Earn commission", desc: `Get ${affiliate.commissionRate}% of every paid enrollment from your link.` },
                ].map((s) => (
                  <div key={s.step} className="rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="size-7 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-xs font-bold mb-2">
                      {s.step}
                    </div>
                    <div className="text-sm font-semibold mb-1">{s.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
