import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/revenue - ADMIN only.
 * Returns the revenue analytics payload:
 *   - totalRevenue        sum of all paid orders' finalAmount
 *   - thisMonthRevenue    sum of paid orders created in the current calendar month
 *   - thisWeekRevenue     sum of paid orders created in the last 7 days
 *   - avgOrderValue        totalRevenue / paidOrderCount (or 0 if no paid orders)
 *   - paidOrderCount      total # of paid orders
 *   - monthlyRevenue      array of { month, revenue, orders } for the last 12 months
 *   - topCourses          top 5 courses by total paid-order revenue
 *   - recentOrders        last 20 paid orders with user + course names
 *   - couponStats         per-coupon usage summary (uses, discount given, revenue impact)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  // Export mode: return up to 5000 orders for the CSV export (the normal
  // dashboard view only needs the 20 most recent).
  const isExport = new URL(req.url).searchParams.get("export") === "1"
  const orderTake = isExport ? 5000 : undefined

  // Pull all paid orders in one query and aggregate in JS - orders table
  // is small enough (per the PAYMENT-COUPON-SEARCH worklog) that this is
  // faster than 5 separate SQL aggregations.
  const paidOrders = await db.order.findMany({
    where: { status: "paid" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, shortName: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
    ...(orderTake ? { take: orderTake } : {}),
  })

  // ----- overview totals -----
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.finalAmount || 0), 0)
  const paidOrderCount = paidOrders.length
  const avgOrderValue = paidOrderCount > 0 ? Math.round(totalRevenue / paidOrderCount) : 0

  // This month (calendar month)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthRevenue = paidOrders
    .filter((o) => o.createdAt >= monthStart)
    .reduce((s, o) => s + (o.finalAmount || 0), 0)

  // This week (last 7 days, rolling)
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeekRevenue = paidOrders
    .filter((o) => o.createdAt >= weekAgo)
    .reduce((s, o) => s + (o.finalAmount || 0), 0)

  // ----- monthly revenue (last 12 months) -----
  const monthlyRevenue: { month: string; revenue: number; orders: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = d.toLocaleString("en-US", { month: "short" })
    const monthOrders = paidOrders.filter((o) => o.createdAt >= d && o.createdAt < next)
    monthlyRevenue.push({
      month: label,
      revenue: Math.round(monthOrders.reduce((s, o) => s + (o.finalAmount || 0), 0)),
      orders: monthOrders.length,
    })
  }

  // ----- top courses by revenue (top 5) -----
  const courseAgg = new Map<string, { course: any; revenue: number; orders: number }>()
  for (const o of paidOrders) {
    if (!o.course) continue
    const key = o.course.id
    const entry = courseAgg.get(key) ?? { course: o.course, revenue: 0, orders: 0 }
    entry.revenue += o.finalAmount || 0
    entry.orders += 1
    courseAgg.set(key, entry)
  }
  const topCourses = Array.from(courseAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((e) => ({
      id: e.course.id,
      title: e.course.title,
      shortName: e.course.shortName,
      color: e.course.color ?? "emerald",
      revenue: Math.round(e.revenue),
      orders: e.orders,
    }))

  // ----- recent orders (last 20, or 5000 in export mode) -----
  const recentOrders = paidOrders.slice(0, orderTake ?? 20).map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    userName: o.user?.name ?? " - ",
    userEmail: o.user?.email ?? null,
    courseTitle: o.course?.title ?? null,
    courseShortName: o.course?.shortName ?? null,
    amount: o.amount,
    discount: o.discount,
    finalAmount: o.finalAmount,
    couponCode: o.couponCode,
    status: o.status,
  }))

  // ----- coupon usage stats -----
  // Aggregate per-couponCode (from the orders table) - gives us real
  // redemption counts + total discount given + net revenue impact.
  const couponAgg = new Map<string, {
    code: string
    uses: number
    discountGiven: number
    grossAmount: number
    netRevenue: number
  }>()
  for (const o of paidOrders) {
    if (!o.couponCode) continue
    const key = o.couponCode
    const entry = couponAgg.get(key) ?? {
      code: o.couponCode,
      uses: 0,
      discountGiven: 0,
      grossAmount: 0,
      netRevenue: 0,
    }
    entry.uses += 1
    entry.discountGiven += o.discount || 0
    entry.grossAmount += o.amount || 0
    entry.netRevenue += o.finalAmount || 0
    couponAgg.set(key, entry)
  }
  // Hydrate with the Coupon row's `value` + `type` for display (best effort)
  const couponCodes = Array.from(couponAgg.keys())
  const couponRows = couponCodes.length > 0
    ? await db.coupon.findMany({ where: { code: { in: couponCodes } }, select: { code: true, type: true, value: true, maxUses: true, usedCount: true } })
    : []
  const couponRowByCode = new Map(couponRows.map((c) => [c.code, c]))

  const couponStats = Array.from(couponAgg.values())
    .map((e) => {
      const row = couponRowByCode.get(e.code)
      return {
        code: e.code,
        uses: e.uses,
        discountGiven: Math.round(e.discountGiven),
        grossAmount: Math.round(e.grossAmount),
        netRevenue: Math.round(e.netRevenue),
        type: row?.type ?? null,
        value: row?.value ?? null,
        maxUses: row?.maxUses ?? null,
        usedCount: row?.usedCount ?? null,
      }
    })
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 10) // cap at 10 most-used coupons for the dashboard

  return NextResponse.json({
    totalRevenue: Math.round(totalRevenue),
    thisMonthRevenue: Math.round(thisMonthRevenue),
    thisWeekRevenue: Math.round(thisWeekRevenue),
    avgOrderValue,
    paidOrderCount,
    monthlyRevenue,
    topCourses,
    recentOrders,
    couponStats,
  })
})
