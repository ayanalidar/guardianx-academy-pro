import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export const runtime = "nodejs"
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const session = await db.labSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (session.userId !== user.id && user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await db.labSession.update({ where: { id }, data: { status: "stopped", endedAt: new Date() } })
  return NextResponse.json({ success: true })
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { flag } = await req.json()
  const session = await db.labSession.findUnique({ where: { id }, include: { lab: true } })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (session.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const correct = flag === session.dynamicFlag || flag === session.lab.flag
  if (correct) {
    await db.labSession.update({ where: { id }, data: { status: "stopped", endedAt: new Date() } })
    await db.user.update({ where: { id: user.id }, data: { xp: { increment: session.lab.xpReward } } })
    await db.labProgress.upsert({ where: { userId_labId: { userId: user.id, labId: session.labId } }, update: { status: "completed", flagFound: true, completedAt: new Date() }, create: { userId: user.id, labId: session.labId, status: "completed", flagFound: true, completedAt: new Date() } })
    return NextResponse.json({ correct: true, xp: session.lab.xpReward, message: "Flag correct! Lab completed." })
  }
  return NextResponse.json({ correct: false, message: "Incorrect flag. Try again." })
}
