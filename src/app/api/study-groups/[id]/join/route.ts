import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const group = await db.studyGroup.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      members: { select: { id: true, userId: true, role: true } },
    },
  })
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

  // Already a member?
  const existing = group.members.find((m) => m.userId === user.id)
  if (existing) {
    return NextResponse.json({ error: "You are already a member of this group", member: existing }, { status: 400 })
  }

  // Capacity check
  if (group.members.length >= group.maxMembers) {
    return NextResponse.json({ error: "This group is full" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))

  // Private groups require a joinCode
  if (group.isPrivate) {
    const provided = typeof body.joinCode === "string" ? body.joinCode.trim() : ""
    if (!group.joinCode || provided !== group.joinCode) {
      return NextResponse.json({ error: "Invalid or missing join code" }, { status: 403 })
    }
  }

  const member = await db.studyGroupMember.create({
    data: {
      groupId: id,
      userId: user.id,
      role: "member",
    },
  })

  // Notify the owner
  await db.notification.create({
    data: {
      userId: group.creatorId,
      type: "study_group",
      title: "New member joined your study group",
      message: `${user.name} joined "${group.title}".`,
      icon: "user-plus",
      color: "emerald",
      link: JSON.stringify({ name: "study-group", groupId: group.id }),
    },
  })

  return NextResponse.json({ member }, { status: 201 })
}
