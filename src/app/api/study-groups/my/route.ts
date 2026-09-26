import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const memberships = await db.studyGroupMember.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      joinedAt: true,
      group: {
        include: {
          creator: { select: { id: true, name: true, avatar: true, title: true, role: true } },
          course: { select: { id: true, title: true, shortName: true, color: true } },
          members: { select: { id: true, userId: true, role: true } },
        },
      },
    },
    orderBy: { group: { createdAt: "desc" } },
  })

  const groups = memberships.map((m) => {
    const g = m.group
    const memberCount = g.members.length
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      courseId: g.courseId,
      course: g.course,
      creator: g.creator,
      creatorId: g.creatorId,
      maxMembers: g.maxMembers,
      isPrivate: g.isPrivate,
      meetingLink: g.meetingLink,
      tags: g.tags ? g.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      createdAt: g.createdAt,
      memberCount,
      isFull: memberCount >= g.maxMembers,
      isMember: true,
      isOwner: m.role === "owner",
      myRole: m.role,
      joinedAt: m.joinedAt,
    }
  })

  return NextResponse.json({ groups })
}
