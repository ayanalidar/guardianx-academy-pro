import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  // Get recent enrollments for this course (last 7 days)
  const recent = await db.enrollment.findMany({
    where: { courseId: id },
    orderBy: { enrolledAt: "desc" },
    take: 5,
    select: {
      id: true,
      enrolledAt: true,
      user: { select: { name: true, avatar: true, title: true } },
    },
  })

  // Count total + this week
  const total = await db.enrollment.count({ where: { courseId: id } })
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek = await db.enrollment.count({ where: { courseId: id, enrolledAt: { gte: weekAgo } } })

  // Format activity feed
  const activities = recent.map(e => ({
    id: e.id,
    name: e.user?.name || "Anonymous",
    avatar: e.user?.avatar,
    title: e.user?.title,
    timeAgo: getTimeAgo(e.enrolledAt),
  }))

  // 30-day daily enrollment series (oldest -> newest) for the sparkline.
  // Only createdAt is fetched, so this stays cheap; bucketing is done in JS
  // to avoid DB-specific date_trunc differences between Neon/pooled setups.
  let daily30: number[] = []
  try {
    const since30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    since30.setHours(0, 0, 0, 0)
    const rows30 = await db.enrollment.findMany({
      where: { courseId: id, enrolledAt: { gte: since30 } },
      select: { enrolledAt: true },
    })
    const buckets = new Map<string, number>()
    for (const r of rows30) {
      const d = new Date(r.enrolledAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      daily30.push(buckets.get(key) ?? 0)
    }
  } catch {
    daily30 = []
  }

  return NextResponse.json({ activities, total, thisWeek, daily30 })
})

function getTimeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const mins = Math.floor(diff / (1000 * 60))
  return `${mins} min${mins > 1 ? "s" : ""} ago`
}
