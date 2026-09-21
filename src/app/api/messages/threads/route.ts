import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { sendEmail } from "@/lib/email"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Pull all threads where the current user is either userA or userB
  const threads = await db.messageThread.findMany({
    where: {
      OR: [{ userAId: user.id }, { userBId: user.id }],
    },
    include: {
      userA: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      userB: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          read: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  })

  const result = await Promise.all(
    threads.map(async (t) => {
      const isUserA = t.userAId === user.id
      const other = isUserA ? t.userB : t.userA
      const lastMessage = t.messages[0] ?? null
      const unreadCount = await db.message.count({
        where: {
          threadId: t.id,
          senderId: { not: user.id },
          read: false,
        },
      })
      return {
        id: t.id,
        other,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              isMine: lastMessage.senderId === user.id,
            }
          : null,
        lastMessageAt: t.lastMessageAt,
        unreadCount,
      }
    })
  )

  return NextResponse.json({ threads: result })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const recipientId = typeof body.recipientId === "string" ? body.recipientId : null
  const content = typeof body.content === "string" ? body.content.trim() : ""

  if (!recipientId) return NextResponse.json({ error: "recipientId required" }, { status: 400 })
  if (recipientId === user.id) {
    return NextResponse.json({ error: "Cannot start a thread with yourself" }, { status: 400 })
  }
  if (!content) return NextResponse.json({ error: "Message content required" }, { status: 400 })

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, name: true, email: true, avatar: true, title: true, role: true },
  })
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 })

  // Normalize ordering: userAId < userBId lexicographically
  const [userAId, userBId] =
    user.id < recipientId ? [user.id, recipientId] : [recipientId, user.id]

  // Find or create the thread
  let thread = await db.messageThread.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  })

  if (!thread) {
    thread = await db.messageThread.create({
      data: { userAId, userBId, lastMessageAt: new Date() },
    })
  }

  // Create the first message
  const message = await db.message.create({
    data: {
      threadId: thread.id,
      senderId: user.id,
      content,
    },
  })

  await db.messageThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  })

  // Notify recipient via email + notification
  const senderName = user.name
  await sendEmail({
    to: recipient.email,
    subject: `New message from ${senderName}`,
    body: `Hi ${recipient.name},

${senderName} sent you a message on GuardianX Academy:

"${content}"

Reply at: https://guardianx.academy (Messages)
 - GuardianX Academy`,
    type: "message",
    userId: recipient.id,
  })

  await db.notification.create({
    data: {
      userId: recipient.id,
      type: "message",
      title: `New message from ${senderName}`,
      message: content.slice(0, 120),
      icon: "mail",
      color: "emerald",
      link: JSON.stringify({ name: "messages", threadId: thread.id }),
    },
  })

  return NextResponse.json(
    {
      thread: { id: thread.id },
      message,
    },
    { status: 201 }
  )
}
