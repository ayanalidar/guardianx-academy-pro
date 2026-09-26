import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ bookmarks: [] })

  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        include: {
          instructor: { select: { id: true, name: true, title: true, avatar: true } },
          modules: { select: { id: true, lessons: { select: { id: true } } } },
        },
      },
    },
  })

  const result = bookmarks.map((b) => ({
    id: b.id,
    courseId: b.courseId,
    createdAt: b.createdAt,
    course: {
      id: b.course.id,
      slug: b.course.slug,
      title: b.course.title,
      shortName: b.course.shortName,
      description: b.course.description,
      category: b.course.category,
      level: b.course.level,
      durationHours: b.course.durationHours,
      rating: b.course.rating,
      studentsCount: b.course.studentsCount,
      color: b.course.color,
      certBody: b.course.certBody,
      instructor: b.course.instructor,
      lessonCount: b.course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    },
  }))

  return NextResponse.json({ bookmarks: result })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await req.json()
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 })

  const existing = await db.bookmark.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  })
  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } })
    return NextResponse.json({ bookmarked: false })
  }

  await db.bookmark.create({ data: { userId: user.id, courseId } })
  return NextResponse.json({ bookmarked: true })
}
