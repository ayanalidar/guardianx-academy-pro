import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const group = await db.studyGroup.findUnique({
    where: { id },
    include: {
      members: { select: { id: true, userId: true, role: true } },
    },
  })
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

  const myMembership = group.members.find((m) => m.userId === user.id)
  if (!myMembership) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 400 })
  }

  // Owner cannot leave - they must transfer ownership or delete the group.
  if (myMembership.role === "owner") {
    return NextResponse.json(
      {
        error:
          "Group owners cannot leave. Transfer ownership or delete the group instead.",
      },
      { status: 400 }
    )
  }

  await db.studyGroupMember.delete({ where: { id: myMembership.id } })

  // Notify owner that a member left
  await db.notification.create({
    data: {
      userId: group.creatorId,
      type: "study_group",
      title: "Member left your study group",
      message: `${user.name} left "${group.title}".`,
      icon: "user-minus",
      color: "amber",
      link: JSON.stringify({ name: "study-group", groupId: group.id }),
    },
  })

  return NextResponse.json({ ok: true })
}
