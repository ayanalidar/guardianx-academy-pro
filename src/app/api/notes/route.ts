import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ notes: [] })
  const { searchParams } = new URL(req.url)
  const lessonId = searchParams.get("lessonId")
  const courseId = searchParams.get("courseId")

  const where: any = { userId: user.id }
  if (lessonId) where.lessonId = lessonId
  if (courseId) where.courseId = courseId

  const notes = await db.note.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: {
      lesson: { select: { id: true, title: true, module: { select: { course: { select: { id: true, title: true, shortName: true } } } } } },
    },
  })
  return NextResponse.json({ notes })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const note = await db.note.create({
    data: {
      userId: user.id,
      lessonId: body.lessonId || null,
      courseId: body.courseId || null,
      title: body.title || "Untitled note",
      content: body.content || "",
      color: body.color || "default",
    },
  })
  const { awardXp } = await import("@/lib/gamification")
  await awardXp(user.id, "note_created", 5, note.id)
  return NextResponse.json({ note })
}
