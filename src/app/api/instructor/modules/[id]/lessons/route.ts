import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Create a new lesson in a module (instructor only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // module id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const moduleData = await db.module.findUnique({ where: { id }, include: { course: { select: { instructorId: true } } } })
  if (!moduleData) return NextResponse.json({ error: "Module not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && moduleData.course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json()
  const { title, type, content, durationMin } = body
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  // determine order (append to end)
  const lessonCount = await db.lesson.count({ where: { moduleId: id } })

  const lesson = await db.lesson.create({
    data: {
      moduleId: id,
      title: title.trim(),
      type: type || "reading",
      content: content || "",
      durationMin: durationMin ?? 15,
      order: lessonCount,
    },
  })
  return NextResponse.json({ lesson })
}
