import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ sessions: [] })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const where: any = {}
  if (status && status !== "all") where.status = status

  const sessions = await db.liveSession.findMany({
    where,
    include: {
      host: { select: { id: true, name: true, title: true, avatar: true } },
      course: { select: { id: true, title: true, shortName: true } },
      members: { select: { userId: true, role: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 30,
  })

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      ...s,
      memberCount: s.members.length,
      isMember: s.members.some((m) => m.userId === user.id),
      isHost: s.hostId === user.id,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const title = body.title?.trim()
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const roomId = `room-${Date.now().toString(36)}`

  // Determine scheduled time + status
  // If scheduledAt is in the future, status = "scheduled"; otherwise start "live".
  const now = new Date()
  let scheduledAt = now
  let status: "scheduled" | "live" = "live"
  let startedAt: Date | null = null

  if (body.scheduledAt) {
    const parsed = new Date(body.scheduledAt)
    if (!isNaN(parsed.getTime())) {
      scheduledAt = parsed
      if (parsed.getTime() > now.getTime() + 60_000) {
        status = "scheduled"
      } else {
        startedAt = now
      }
    }
  } else {
    startedAt = now
  }

  // If instructor explicitly requests to start now (startNow=true), force live
  if (body.startNow) {
    status = "live"
    scheduledAt = now
    startedAt = now
  }

  const session = await db.liveSession.create({
    data: {
      title,
      description: body.description || "",
      courseId: body.courseId || null,
      hostId: user.id,
      roomId,
      status,
      scheduledAt,
      startedAt,
      maxStudents: Math.min(Math.max(Number(body.maxStudents) || 50, 1), 500),
    },
    include: {
      host: { select: { id: true, name: true, title: true, avatar: true } },
      course: { select: { id: true, title: true, shortName: true } },
    },
  })

  // Auto-add host as a member only if live (so they can manage it)
  if (status === "live") {
    await db.liveSessionMember.create({
      data: { sessionId: session.id, userId: user.id, role: "host", canShare: true },
    })
  }
  return NextResponse.json({ session })
}
