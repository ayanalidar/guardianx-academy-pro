import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { COURSE_LIST_FIELDS, normalizeCourseListInput } from "@/lib/course-lists"

// GET /api/admin/courses — list all courses with enrollment counts, module counts, lesson counts
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() || undefined

  const where: { OR?: { title?: { contains: string }; shortName?: { contains: string } }[] } = {}
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { shortName: { contains: q } },
    ]
  }

  const courses = await db.course.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      instructor: { select: { id: true, name: true, title: true, avatar: true } },
      modules: { select: { id: true, lessons: { select: { id: true } } } },
      _count: { select: { enrollments: true, modules: true, labs: true } },
    },
  })

  const result = courses.map((c) => {
    const lessonCount = c.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const completedEnrollments = 0 // not joined here to keep query light
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortName: c.shortName,
      description: c.description,
      longDescription: c.longDescription,
      category: c.category,
      level: c.level,
      durationHours: c.durationHours,
      price: c.price,
      rating: c.rating,
      studentsCount: c.studentsCount,
      thumbnail: c.thumbnail,
      color: c.color,
      tags: c.tags,
      certBody: c.certBody,
      ...Object.fromEntries(COURSE_LIST_FIELDS.map(({ key }) => [key, (c as any)[key] ?? "[]"])),
      published: c.published,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      instructor: c.instructor,
      moduleCount: c._count.modules,
      lessonCount,
      labCount: c._count.labs,
      enrollmentCount: c._count.enrollments,
      completedEnrollments,
    }
  })

  return NextResponse.json({ courses: result, total: result.length })
})

// POST /api/admin/courses — create a new course (ADMIN only)
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const {
    title, shortName, description, longDescription,
    category, level, durationHours, price, color, tags, certBody,
    instructorId,
  } = body as {
    title?: string
    shortName?: string
    description?: string
    longDescription?: string
    category?: string
    level?: string
    durationHours?: number
    price?: number
    color?: string
    tags?: string
    certBody?: string
    instructorId?: string
  }

  // Course extras lists (whatYouWillLearn, prerequisites, whoShouldAttend,
  // toolsCovered, careerOutcomes) — accepted as arrays, newline text, or
  // stored JSON; normalized to encoded JSON arrays.
  const extrasData = Object.fromEntries(
    COURSE_LIST_FIELDS.map(({ key }) => [key, normalizeCourseListInput((body as any)[key])])
  ) as Record<string, string>

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })
  if (!shortName?.trim()) return NextResponse.json({ error: "Short name required" }, { status: 400 })

  // Generate slug from title
  let slug = title!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  const existing = await db.course.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  }

  // Validate instructor
  const finalInstructorId = instructorId?.trim()
  if (!finalInstructorId) {
    return NextResponse.json({ error: "instructorId required" }, { status: 400 })
  }
  const instructor = await db.user.findUnique({ where: { id: finalInstructorId } })
  if (!instructor) return NextResponse.json({ error: "Instructor not found" }, { status: 400 })
  if (instructor.role !== "INSTRUCTOR" && instructor.role !== "ADMIN") {
    return NextResponse.json({ error: "User is not an instructor" }, { status: 400 })
  }

  const course = await db.course.create({
    data: {
      title: title!.trim(),
      shortName: shortName!.trim().toUpperCase(),
      slug,
      description: description || "",
      longDescription: longDescription || description || "",
      category: category || "Ethical Hacking",
      level: level || "Beginner",
      durationHours: Number(durationHours) || 40,
      price: Number(price) || 0,
      color: color || "violet",
      tags: tags || "",
      certBody: certBody || null,
      ...extrasData,
      published: true,
      instructorId: finalInstructorId,
    },
    include: {
      instructor: { select: { id: true, name: true, title: true } },
    },
  })

  await logAction(
    user.id,
    user.name,
    "course.create",
    "Course",
    course.id,
    { slug: course.slug, title: course.title, instructorId: finalInstructorId },
  )

  return NextResponse.json({ course }, { status: 201 })
})
