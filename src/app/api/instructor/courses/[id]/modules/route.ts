import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

// Create a new module in a course (instructor only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // course id
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({ where: { id }, select: { instructorId: true } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
    return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const body = await req.json()
  const { title, description } = body
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const moduleCount = await db.module.count({ where: { courseId: id } })
  const module_ = await db.module.create({
    data: {
      courseId: id,
      title: title.trim(),
      description: description || "",
      order: moduleCount,
    },
  })
  return NextResponse.json({ module: module_ })
}
