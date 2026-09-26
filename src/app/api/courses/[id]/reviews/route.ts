import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reviews = await db.courseReview.findMany({
    where: { courseId: id },
    include: { user: { select: { id: true, name: true, title: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  })

  const avgRating = reviews.length
    ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
    : 0

  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return NextResponse.json({
    reviews,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
    distribution,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // must be enrolled
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: id } } })
  if (!enrollment) return NextResponse.json({ error: "You must be enrolled to review" }, { status: 403 })

  const body = await req.json()
  const rating = Math.max(1, Math.min(5, Number(body.rating)))
  if (!rating) return NextResponse.json({ error: "Rating required" }, { status: 400 })

  const existing = await db.courseReview.findUnique({ where: { userId_courseId: { userId: user.id, courseId: id } } })
  if (existing) {
    const updated = await db.courseReview.update({
      where: { id: existing.id },
      data: { rating, title: body.title ?? existing.title, content: body.content ?? existing.content },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } },
    })
    return NextResponse.json({ review: updated, updated: true })
  }

  const review = await db.courseReview.create({
    data: { courseId: id, userId: user.id, rating, title: body.title ?? "", content: body.content ?? "" },
    include: { user: { select: { id: true, name: true, title: true, avatar: true } } },
  })

  // recompute course average rating
  const all = await db.courseReview.findMany({ where: { courseId: id }, select: { rating: true } })
  const newAvg = all.length ? all.reduce((a, r) => a + r.rating, 0) / all.length : 0
  await db.course.update({ where: { id }, data: { rating: Math.round(newAvg * 10) / 10 } })

  return NextResponse.json({ review })
}
