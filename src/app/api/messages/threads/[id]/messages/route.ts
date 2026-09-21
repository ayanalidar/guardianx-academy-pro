import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { sendEmail } from "@/lib/email"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const thread = await db.messageThread.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, email: true, avatar: true, title: true, role: true } },
      userB: { select: { id: true, name: true, email: true, avatar: true, title: true, role: true } },
    },
  })
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

  if (thread.userAId !== user.id && thread.userBId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content) return NextResponse.json({ error: "Message content required" }, { status: 400 })
  if (content.length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 })
  }

  const message = await db.message.create({
    data: {
      threadId: id,
      senderId: user.id,
      content,
    },
  })

  await db.messageThread.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  })

  // Notify recipient (email + notification)
  const recipient = thread.userAId === user.id ? thread.userB : thread.userA
  await sendEmail({
    to: recipient.email,
    subject: `New message from ${user.name}`,
    body: `Hi ${recipient.name},

${user.name} sent you a message on GuardianX Academy:

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
      title: `New message from ${user.name}`,
      message: content.slice(0, 120),
      icon: "mail",
      color: "emerald",
      link: JSON.stringify({ name: "messages", threadId: thread.id }),
    },
  })

  return NextResponse.json(
    { message: { ...message, isMine: true } },
    { status: 201 }
  )
}
