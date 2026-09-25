import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { randomInt } from "crypto"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get("courseId") || undefined
  const q = searchParams.get("q")?.trim() || undefined

  const where: any = {}
  if (courseId) where.courseId = courseId
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { tags: { contains: q } },
    ]
  }

  const groups = await db.studyGroup.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      course: { select: { id: true, title: true, shortName: true, color: true } },
      members: { select: { id: true, userId: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const result = groups.map((g) => {
    const memberCount = g.members.length
    const isMember = g.members.some((m) => m.userId === user.id)
    const isOwner = g.creatorId === user.id
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      courseId: g.courseId,
      course: g.course,
      creator: g.creator,
      maxMembers: g.maxMembers,
      isPrivate: g.isPrivate,
      meetingLink: isMember ? g.meetingLink : null,
      tags: g.tags ? g.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      createdAt: g.createdAt,
      memberCount,
      isFull: memberCount >= g.maxMembers,
      isMember,
      isOwner,
    }
  })

  return NextResponse.json({ groups: result })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const description = typeof body.description === "string" ? body.description : ""
  const courseId = body.courseId || null
  const maxMembers =
    Number.isFinite(Number(body.maxMembers)) && Number(body.maxMembers) > 0
      ? Math.min(500, Number(body.maxMembers))
      : 10
  const isPrivate = Boolean(body.isPrivate)
  const joinCode =
    isPrivate && typeof body.joinCode === "string"
      ? body.joinCode.trim()
      : isPrivate
      ? Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)]).join("") // crypto-secure (audit fix C-10)
      : null
  const meetingLink = typeof body.meetingLink === "string" && body.meetingLink.trim() ? body.meetingLink.trim() : null
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: any) => String(t).trim()).filter(Boolean).join(",")
    : typeof body.tags === "string"
    ? body.tags
    : ""

  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  const group = await db.studyGroup.create({
    data: {
      title,
      description,
      courseId,
      creatorId: user.id,
      maxMembers,
      isPrivate,
      joinCode,
      meetingLink,
      tags,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
    include: {
      creator: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      course: { select: { id: true, title: true, shortName: true, color: true } },
      members: { select: { id: true, userId: true, role: true, joinedAt: true } },
    },
  })

  return NextResponse.json({ group }, { status: 201 })
}
