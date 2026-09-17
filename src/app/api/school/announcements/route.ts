import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// POST /api/school/announcements
// Body: { batchId?: string, title, message, color?, icon? }
// If batchId provided, notify all students in that batch. Otherwise notify all school's students.
export async function POST(req: NextRequest) {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const body = await req.json()
  const { batchId, title, message, color, icon } = body
  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "title and message are required" }, { status: 400 })
  }

  // Determine recipients
  let recipientUserIds: string[] = []
  if (batchId) {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        members: { select: { userId: true } },
        school: { select: { id: true } },
      },
    })
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    const schoolAdmin = await db.user.findUnique({ where: { id: user.id }, select: { schoolId: true, role: true } })
    if (user.role !== "ADMIN" && schoolAdmin?.schoolId !== batch.school.id) {
      return NextResponse.json({ error: "Not your batch" }, { status: 403 })
    }
    recipientUserIds = batch.members.map((s) => s.userId)
  } else {
    // All school's students
    const me = await db.user.findUnique({ where: { id: user.id }, select: { schoolId: true, role: true } })
    if (!me?.schoolId) {
      return NextResponse.json({ error: "You have no school assigned" }, { status: 400 })
    }
    const links = await db.batchMember.findMany({
      where: { batch: { schoolId: me.schoolId } },
      select: { userId: true },
      distinct: ["userId"],
    })
    recipientUserIds = links.map((l) => l.userId)
  }

  if (recipientUserIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // Create notifications for each recipient
  await db.notification.createMany({
    data: recipientUserIds.map((uid) => ({
      userId: uid,
      type: "announcement",
      title: title.trim(),
      message: message.trim(),
      icon: icon || "megaphone",
      color: color || "emerald",
    })),
  })

  return NextResponse.json({ ok: true, sent: recipientUserIds.length })
}
