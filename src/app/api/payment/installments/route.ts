import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { parseEmiPurpose, EMI_PURPOSE_PREFIX } from "@/lib/installments"

export const runtime = "nodejs"

/* GET /api/payment/installments
 * -----------------------------
 * Requires auth. Returns the current user's EMI installment orders
 * (both pending and paid) with course titles, so the dashboard
 * banner can offer one-click payment of the next due installment.
 *
 * Due dates derive from the plan purchase date (order.createdAt of
 * the group) + installment index * EMI_DUE_GAP_DAYS.
 */
export const GET = withErrorHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orders = await db.order.findMany({
    where: { userId: user.id, purpose: { startsWith: EMI_PURPOSE_PREFIX } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, courseId: true, amount: true, currency: true, status: true,
      finalAmount: true, purpose: true, createdAt: true, updatedAt: true,
    },
  })

  // Course titles for the returned orders
  const courseIds = Array.from(new Set(orders.map((o) => o.courseId).filter((x): x is string => !!x)))
  const courses = courseIds.length
    ? await db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
    : []
  const titleMap = new Map(courses.map((c) => [c.id, c.title]))

  // Gap days: derive from the plan group (max sibling due offset diff is
  // constant across plans) - simplest: read setting via installments lib
  const { getEmiConfig } = await import("@/lib/installments")
  const emi = await getEmiConfig()
  const gapDays = emi.plans[0]?.dueDays?.[0] || 30

  const installments = orders.map((o) => {
    const parsed = parseEmiPurpose(o.purpose)
    // purchase anchor = the group's shared createdAt; each order row carries it
    const dueAt = parsed && parsed.index > 1
      ? new Date(o.createdAt.getTime() + (parsed.index - 1) * gapDays * 24 * 60 * 60 * 1000).toISOString()
      : null
    return {
      orderId: o.id,
      courseId: o.courseId,
      courseTitle: o.courseId ? titleMap.get(o.courseId) || "Course" : "Course",
      index: parsed?.index ?? 1,
      total: parsed?.total ?? 1,
      amount: o.finalAmount,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      dueAt, // null = due immediately (first installment)
      paidAt: o.status === "paid" ? o.updatedAt.toISOString() : null,
    }
  })

  return NextResponse.json({ installments })
})
