import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// GET — list all modules + their lessons for a course (admin only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({ where: { id }, select: { id: true } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const modules = await db.module.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true, title: true, type: true, content: true,
          pdfUrl: true, pdfPages: true, durationMin: true,
          order: true, preview: true,
        },
      },
    },
  })

  return NextResponse.json({ modules, count: modules.length })
}

// Create a new module in a course (admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // course id
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const body = await req.json()
  const { title, description, order } = body
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const moduleCount = await db.module.count({ where: { courseId: id } })
  const module_ = await db.module.create({
    data: {
      courseId: id,
      title: title.trim(),
      description: description || "",
      order: order !== undefined ? Number(order) : moduleCount,
    },
  })
  return NextResponse.json({ module: module_ })
}
