import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const session = await db.liveSession.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, title: true, avatar: true } },
      course: { select: { id: true, title: true, shortName: true } },
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  return NextResponse.json({
    session,
    currentUserId: user?.id ?? null,
    isHost: user?.id === session.hostId,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action } = await req.json()
  const session = await db.liveSession.findUnique({ where: { id }, include: { members: true } })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  if (action === "join") {
    if (!session.members.some((m) => m.userId === user.id)) {
      await db.liveSessionMember.create({
        data: { sessionId: id, userId: user.id, role: "viewer", canShare: false },
      })
    }
    return NextResponse.json({ ok: true })
  }
  if (action === "leave") {
    await db.liveSessionMember.deleteMany({ where: { sessionId: id, userId: user.id } })
    return NextResponse.json({ ok: true })
  }
  if (action === "end") {
    if (session.hostId !== user.id) return NextResponse.json({ error: "Only host can end" }, { status: 403 })
    await db.liveSession.update({ where: { id }, data: { status: "ended", endedAt: new Date() } })
    return NextResponse.json({ ok: true })
  }
  if (action === "start") {
    if (session.hostId !== user.id) return NextResponse.json({ error: "Only host can start" }, { status: 403 })
    await db.liveSession.update({ where: { id }, data: { status: "live", startedAt: new Date() } })
    // ensure host is a member
    if (!session.members.some((m) => m.userId === user.id)) {
      await db.liveSessionMember.create({
        data: { sessionId: id, userId: user.id, role: "host", canShare: true },
      })
    }
    return NextResponse.json({ ok: true })
  }
  if (action === "cancel") {
    if (session.hostId !== user.id) return NextResponse.json({ error: "Only host can cancel" }, { status: 403 })
    await db.liveSession.update({ where: { id }, data: { status: "ended", endedAt: new Date() } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
