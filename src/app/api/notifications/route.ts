import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 })

  // Seed a welcome notification for first-time users
  const count = await db.notification.count({ where: { userId: user.id } })
  if (count === 0) {
    await db.notification.create({
      data: {
        userId: user.id,
        type: "welcome",
        title: `Welcome to GuardianX, ${user.name.split(" ")[0]}!`,
        message: "Your cyber security journey starts here. Explore certification courses and hands-on labs to begin earning XP.",
        icon: "sparkles",
        color: "emerald",
        link: JSON.stringify({ name: "catalog" }),
      },
    })
  }

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  const unreadCount = await db.notification.count({ where: { userId: user.id, read: false } })

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      ...n,
      link: n.link ? JSON.parse(n.link) : null,
    })),
    unreadCount,
  })
}

// Mark all as read
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body.all) {
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: "Missing 'all' flag" }, { status: 400 })
}
