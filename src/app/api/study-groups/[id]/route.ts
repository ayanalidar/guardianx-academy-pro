import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const group = await db.studyGroup.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      course: { select: { id: true, title: true, shortName: true, color: true } },
      members: {
        select: {
          id: true,
          userId: true,
          role: true,
          joinedAt: true,
          user: { select: { id: true, name: true, avatar: true, title: true, role: true } },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  })
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

  const isMember = group.members.some((m) => m.userId === user.id)
  const memberCount = group.members.length

  return NextResponse.json({
    group: {
      id: group.id,
      title: group.title,
      description: group.description,
      courseId: group.courseId,
      course: group.course,
      creator: group.creator,
      creatorId: group.creatorId,
      maxMembers: group.maxMembers,
      isPrivate: group.isPrivate,
      meetingLink: isMember ? group.meetingLink : null,
      tags: group.tags ? group.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      createdAt: group.createdAt,
      memberCount,
      isFull: memberCount >= group.maxMembers,
      isMember,
      isOwner: group.creatorId === user.id,
      members: group.members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const group = await db.studyGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
  if (group.creatorId !== user.id && !(user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Only the owner can update this group" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: any = {}

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === "string") data.description = body.description
  if (body.courseId !== undefined) data.courseId = body.courseId || null
  if (body.maxMembers !== undefined && Number.isFinite(Number(body.maxMembers))) {
    data.maxMembers = Math.max(1, Number(body.maxMembers))
  }
  if (typeof body.isPrivate === "boolean") {
    data.isPrivate = body.isPrivate
    // If making private without a joinCode, generate one
    if (body.isPrivate && !group.joinCode && !body.joinCode) {
      data.joinCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    }
    if (!body.isPrivate) data.joinCode = null
  }
  if (typeof body.joinCode === "string") data.joinCode = body.joinCode.trim() || null
  if (typeof body.meetingLink === "string") data.meetingLink = body.meetingLink.trim() || null
  if (Array.isArray(body.tags)) {
    data.tags = body.tags.map((t: any) => String(t).trim()).filter(Boolean).join(",")
  } else if (typeof body.tags === "string") {
    data.tags = body.tags
  }

  const updated = await db.studyGroup.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true, avatar: true, title: true, role: true } },
      course: { select: { id: true, title: true, shortName: true, color: true } },
      members: { select: { id: true, userId: true, role: true } },
    },
  })

  return NextResponse.json({ group: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const group = await db.studyGroup.findUnique({
    where: { id },
    select: { id: true, creatorId: true, title: true },
  })
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
  if (group.creatorId !== user.id && !(user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Only the owner can delete this group" }, { status: 403 })
  }

  // Notify members that the group has been deleted
  const members = await db.studyGroupMember.findMany({
    where: { groupId: id, userId: { not: user.id } },
    select: { userId: true },
  })

  await db.studyGroup.delete({ where: { id } })

  for (const m of members) {
    await db.notification.create({
      data: {
        userId: m.userId,
        type: "study_group",
        title: "Study group deleted",
        message: `"${group.title}" has been deleted by the owner.`,
        icon: "users",
        color: "rose",
        link: JSON.stringify({ name: "study-groups" }),
      },
    })
  }

  return NextResponse.json({ ok: true })
}
