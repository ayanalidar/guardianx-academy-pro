import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { createNotification } from "@/lib/notifications"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get("courseId")
  if (!courseId) return NextResponse.json({ discussions: [] })

  const discussions = await db.discussion.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      replies: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  })
  return NextResponse.json({ discussions })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { courseId, title, content, replyTo } = body

  if (replyTo) {
    const reply = await db.discussionReply.create({
      data: { discussionId: replyTo, userId: user.id, content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })
    // notify the discussion owner (if not self)
    const discussion = await db.discussion.findUnique({
      where: { id: replyTo },
      select: { userId: true, title: true, courseId: true },
    })
    if (discussion && discussion.userId !== user.id) {
      const course = await db.course.findUnique({ where: { id: discussion.courseId }, select: { shortName: true } })
      await createNotification({
        userId: discussion.userId,
        type: "reply",
        title: `${user.name} replied to your discussion`,
        message: `"${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
        icon: "book",
        color: "cyan",
        link: JSON.stringify({ name: "community" }),
      })
      void course
    }
    return NextResponse.json({ reply })
  }

  const discussion = await db.discussion.create({
    data: { courseId, userId: user.id, title, content },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json({ discussion })
}
