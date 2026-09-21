"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell,
} from "recharts"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, TrendingUp, DollarSign, Users, BookOpen,
  Award, Download, Calendar, IndianRupee, Ticket, Receipt,
  Wallet, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react"

/* ============================================================
   Types - match the /api/admin/revenue response shape exactly.
   ============================================================ */
interface MonthlyRevenuePoint { month: string; revenue: number; orders: number }
interface TopCourse {
  id: string; title: string; shortName: string; color: string
  revenue: number; orders: number
}
interface RecentOrder {
  id: string; createdAt: string
  userName: string; userEmail: string | null
  courseTitle: string | null; courseShortName: string | null
  amount: number; discount: number; finalAmount: number
  couponCode: string | null; status: string
}
interface CouponStat {
  code: string; uses: number; discountGiven: number
  grossAmount: number; netRevenue: number
  type: string | null; value: number | null
  maxUses: number | null; usedCount: number | null
}
interface RevenueData {
  totalRevenue: number
  thisMonthRevenue: number
  thisWeekRevenue: number
  avgOrderValue: number
  paidOrderCount: number
  monthlyRevenue: MonthlyRevenuePoint[]
  topCourses: TopCourse[]
  recentOrders: RecentOrder[]
  couponStats: CouponStat[]
}

/* ============================================================
   Helpers
   ============================================================ */
function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString("en-IN")}`
}

function formatINRFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// Course color palette - bar chart Cell fills. Indexed by the `color`
// field on the Course row (e.g. "violet", "cyan", "amber", "emerald",
// "rose"). Falls back to violet for unknown colors.
const COURSE_BAR_COLORS: Record<string, string> = {
  violet: "oklch(0.65 0.18 295)",
  cyan: "oklch(0.7 0.14 200)",
  amber: "oklch(0.78 0.16 75)",
  emerald: "oklch(0.7 0.15 160)",
  rose: "oklch(0.65 0.18 12)",
  orange: "oklch(0.7 0.17 55)",
  teal: "oklch(0.7 0.12 180)",
  red: "oklch(0.62 0.21 25)",
}

const TOOLTIP_STYLE = {
  background: "oklch(0.18 0.02 270)",
  border: "1px solid oklch(0.3 0.02 270 / 0.5)",
  borderRadius: 8,
  fontSize: 11,
  fontFamily: "monospace",
  color: "oklch(0.95 0.02 270)",
} as React.CSSProperties

/* ============================================================
   RevenueAnalyticsView
   ============================================================ */
export function RevenueAnalyticsView() {
  const { navigate } = useAppStore()
  const { data, isLoading, isError } = useQuery<RevenueData>({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const res = await fetch("/api/admin/revenue", { credentials: "include" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Request failed: ${res.status}`)
      }
      return res.json() as Promise<RevenueData>
    },
    retry: false,
  })

  return (
    <div className="relative min-h-screen">
      {/* Sticky header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Admin
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" /> Revenue Analytics
            </h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              // Export ALL paid orders (server export mode), not just the 20
              // most recent shown in the table.
              try {
                const d = await api<{ recentOrders: RecentOrder[] }>("/api/admin/revenue?export=1")
                const rows = [
                  ["Date", "User", "Email", "Course", "Amount", "Discount", "Final", "Coupon", "Status"],
                  ...(d.recentOrders ?? []).map((o) => [
                    new Date(o.createdAt).toISOString(),
                    o.userName,
                    o.userEmail ?? "",
                    o.courseTitle ?? "",
                    String(o.amount),
                    String(o.discount),
                    String(o.finalAmount),
                    o.couponCode ?? "",
                    o.status,
                  ]),
                ]
                const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
                const blob = new Blob([csv], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `revenue-orders-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
                toast.success(`Exported ${d.recentOrders?.length ?? 0} orders`)
              } catch (e: any) {
                toast.error(e?.message || "Export failed")
              }
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export Orders
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isError ? (
          <Card className="p-8 border-rose-500/30 bg-rose-500/5">
            <div className="flex items-start gap-3">
              <div className="inline-flex p-2 rounded-lg bg-rose-500/10 text-rose-300">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-300">Failed to load revenue data</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  The /api/admin/revenue endpoint is reachable only to admin-role users. Re-login as admin to view this page.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {/* ====================================================
            1. REVENUE OVERVIEW CARDS
            ==================================================== */}
        <RevenueOverviewCards data={data} loading={isLoading} />

        {/* ====================================================
            2. REVENUE TREND CHART (12 months)
            ==================================================== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-400" /> Monthly Revenue Trend
            </h2>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-violet-500/30 bg-violet-500/10 text-violet-300">
              Last 12 months
            </Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (data?.monthlyRevenue?.length ?? 0) === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No paid orders yet - revenue will appear here once learners enroll in paid courses.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={data?.monthlyRevenue ?? []}
                margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.7 0.18 295)" />
                    <stop offset="100%" stopColor="oklch(0.7 0.14 200)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 270 / 0.25)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "oklch(0.7 0.02 270 / 0.7)", fontSize: 11, fontFamily: "monospace" }}
                  axisLine={{ stroke: "oklch(0.3 0.02 270 / 0.4)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.7 0.02 270 / 0.6)", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "oklch(0.3 0.02 270 / 0.4)" }}
                  tickLine={false}
                  tickFormatter={(v) => formatINR(Number(v))}
                  width={56}
                />
                <RTooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: "oklch(0.7 0.02 270 / 0.9)" }}
                  formatter={(value: any, _name, item: any) => [
                    `${formatINRFull(Number(value))} · ${item?.payload?.orders ?? 0} orders`,
                    "Revenue",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#revLine)"
                  strokeWidth={2.5}
                  dot={{ fill: "oklch(0.7 0.18 295)", r: 3 }}
                  activeDot={{ r: 5, fill: "oklch(0.8 0.2 295)" }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* ====================================================
            3. TOP COURSES BY REVENUE  +  COUPON USAGE STATS
            ==================================================== */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-cyan-400" /> Top Courses by Revenue
            </h2>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.topCourses?.length ?? 0) === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No course revenue yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data?.topCourses ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 270 / 0.25)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "oklch(0.7 0.02 270 / 0.6)", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "oklch(0.3 0.02 270 / 0.4)" }}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    tick={{ fill: "oklch(0.7 0.02 270 / 0.7)", fontSize: 11, fontFamily: "monospace" }}
                    axisLine={{ stroke: "oklch(0.3 0.02 270 / 0.4)" }}
                    tickLine={false}
                    width={72}
                  />
                  <RTooltip
                    cursor={{ fill: "oklch(0.6 0.18 295 / 0.08)" }}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: "oklch(0.7 0.02 270 / 0.9)" }}
                    formatter={(value: any, _name, item: any) => [
                      `${formatINRFull(Number(value))} · ${item?.payload?.orders ?? 0} orders`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {(data?.topCourses ?? []).map((c, i) => (
                      <Cell key={i} fill={COURSE_BAR_COLORS[c.color] ?? COURSE_BAR_COLORS.violet} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Compact list under the chart - course title + order count */}
            {!isLoading && (data?.topCourses?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-2 border-t border-border/40 pt-3">
                {data!.topCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-foreground flex-1">{c.title}</span>
                    <span className="font-mono text-muted-foreground shrink-0 ml-2">
                      {c.orders} orders · {formatINR(c.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Coupon usage stats */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-400" /> Coupon Usage
            </h2>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.couponStats?.length ?? 0) === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No coupons redeemed yet. Coupons applied at checkout will appear here once paid orders land.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 pr-1">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    <tr className="border-b border-border/40">
                      <th className="text-left pb-2 font-medium">Code</th>
                      <th className="text-right pb-2 font-medium">Uses</th>
                      <th className="text-right pb-2 font-medium">Discount</th>
                      <th className="text-right pb-2 font-medium">Net Rev.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.couponStats.map((c) => (
                      <tr key={c.code} className="border-b border-border/20 last:border-0">
                        <td className="py-2.5">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-amber-500/30 bg-amber-500/10 text-amber-300">
                            {c.code}
                          </Badge>
                          <div className="text-[9px] text-muted-foreground mt-1 font-mono">
                            {c.type === "percentage" ? `${c.value}% off` : c.type === "fixed" ? `${formatINR(c.value ?? 0)} off` : " - "}
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{c.uses}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-rose-300">-{formatINR(c.discountGiven)}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-emerald-300">{formatINR(c.netRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ====================================================
            4. RECENT TRANSACTIONS TABLE (last 20)
            ==================================================== */}
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" /> Recent Transactions
            </h2>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
              Last {data?.recentOrders?.length ?? 20} orders
            </Badge>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (data?.recentOrders?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Receipt className="mx-auto h-6 w-6 mb-2 text-muted-foreground/40" />
              No paid transactions yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/40">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Course</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-right px-4 py-3 font-medium">Discount</th>
                    <th className="text-right px-4 py-3 font-medium">Final</th>
                    <th className="text-left px-4 py-3 font-medium">Coupon</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        <div className="text-foreground">{new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div className="text-[10px] text-muted-foreground">{relativeTime(o.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground truncate max-w-[160px]">{o.userName}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{o.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        {o.courseTitle ? (
                          <>
                            <div className="font-medium text-foreground truncate max-w-[200px]">{o.courseTitle}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{o.courseShortName}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground"> - </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatINRFull(o.amount)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-300">
                        {o.discount > 0 ? `-${formatINRFull(o.discount)}` : " - "}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300 font-semibold">{formatINRFull(o.finalAmount)}</td>
                      <td className="px-4 py-3">
                        {o.couponCode ? (
                          <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider border-amber-500/30 bg-amber-500/10 text-amber-300">
                            {o.couponCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50"> - </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn(
                          "font-mono text-[9px] uppercase tracking-wider",
                          o.status === "paid" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                          o.status === "created" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                          o.status === "failed" && "border-rose-500/30 bg-rose-500/10 text-rose-300",
                          o.status === "refunded" && "border-slate-500/30 bg-slate-500/10 text-slate-300",
                        )}>
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Help footer - describes what the dashboard surfaces */}
        <Card className="p-4 border-violet-500/20 bg-violet-500/5">
          <p className="text-xs text-muted-foreground">
            <span className="text-violet-300 font-semibold">LIVE DATA:</span> All figures are computed in real time from the
            <span className="font-mono"> Order</span> and <span className="font-mono">Coupon</span> tables. The revenue trend
            covers the last 12 calendar months; weekly figures use a rolling 7-day window. Coupon usage tracks
            redemptions on successful (paid) orders - abandoned checkouts are not counted.
          </p>
        </Card>
      </div>
    </div>
  )
}

/* ============================================================
   RevenueOverviewCards - 4 KPI cards
   ============================================================ */
function RevenueOverviewCards({
  data, loading,
}: {
  data?: RevenueData
  loading: boolean
}) {
  const cards: {
    label: string
    value: string
    icon: typeof DollarSign
    color: string
    tint: string
    sub?: string
    trend?: "up" | "down" | "neutral"
  }[] = [
    {
      label: "Total Revenue",
      value: data ? formatINRFull(data.totalRevenue) : " - ",
      icon: Wallet,
      color: "text-emerald-300",
      tint: "bg-emerald-500/10",
      sub: data ? `${data.paidOrderCount} paid orders` : "",
      trend: "neutral",
    },
    {
      label: "This Month",
      value: data ? formatINRFull(data.thisMonthRevenue) : " - ",
      icon: IndianRupee,
      color: "text-violet-300",
      tint: "bg-violet-500/10",
      sub: data ? `${data.monthlyRevenue.at(-1)?.orders ?? 0} orders this month` : "",
      trend: "up",
    },
    {
      label: "This Week",
      value: data ? formatINRFull(data.thisWeekRevenue) : " - ",
      icon: TrendingUp,
      color: "text-cyan-300",
      tint: "bg-cyan-500/10",
      sub: "Rolling 7 days",
      trend: "up",
    },
    {
      label: "Avg Order Value",
      value: data ? formatINRFull(data.avgOrderValue) : " - ",
      icon: Activity,
      color: "text-amber-300",
      tint: "bg-amber-500/10",
      sub: data ? `Across ${data.paidOrderCount} orders` : "",
      trend: "neutral",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("inline-flex p-2 rounded-lg", c.tint)}>
              <c.icon className={cn("h-4 w-4", c.color)} />
            </div>
            <div className="min-w-0">
              {loading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="text-lg font-bold tabular-nums flex items-center gap-1.5">
                  {c.value}
                  {c.trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
                  {c.trend === "down" && <ArrowDownRight className="h-3 w-3 text-rose-400" />}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</div>
              {c.sub && !loading && (
                <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{c.sub}</div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
