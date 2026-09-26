import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const thread = await db.messageThread.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      userB: { select: { id: true, name: true, avatar: true, title: true, role: true } },
    },
  })
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

  if (thread.userAId !== user.id && thread.userBId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const messages = await db.message.findMany({
    where: { threadId: id },
    orderBy: { createdAt: "asc" },
    take: 500,
  })

  // Mark messages from the other user as read
  const otherId = thread.userAId === user.id ? thread.userBId : thread.userAId
  await db.message.updateMany({
    where: { threadId: id, senderId: otherId, read: false },
    data: { read: true },
  })

  const other = thread.userAId === user.id ? thread.userB : thread.userA

  return NextResponse.json({
    thread: { id: thread.id, other },
    messages: messages.map((m) => ({
      ...m,
      isMine: m.senderId === user.id,
    })),
  })
}
