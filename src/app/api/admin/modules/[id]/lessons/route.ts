import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// Create a new lesson in a module (admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // module id
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const moduleData = await db.module.findUnique({ where: { id } })
  if (!moduleData) return NextResponse.json({ error: "Module not found" }, { status: 404 })

  const body = await req.json()
  const { title, type, content, durationMin, order, preview, pdfUrl, pdfPages } = body
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const lessonCount = await db.lesson.count({ where: { moduleId: id } })

  const lesson = await db.lesson.create({
    data: {
      moduleId: id,
      title: title.trim(),
      type: type || "reading",
      content: content || "",
      durationMin: durationMin !== undefined ? Number(durationMin) : 15,
      order: order !== undefined ? Number(order) : lessonCount,
      preview: preview !== undefined ? !!preview : false,
      pdfUrl: pdfUrl || null,
      pdfPages: pdfPages !== undefined ? Number(pdfPages) : 0,
    },
  })
  return NextResponse.json({ lesson })
}
