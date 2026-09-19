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

  // Full query needs the CURRENT schema (course-extras columns, instructor
  // relation). On drifted databases (e.g. Vercel remote DB predating a schema
  // change) this 500s and the admin panel shows nothing. Degrade instead:
  // discover existing columns and list with those so the panel stays usable.
  let courses: any[]
  let degraded = false
  try {
    courses = await db.course.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        instructor: { select: { id: true, name: true, title: true, avatar: true } },
        modules: { select: { id: true, lessons: { select: { id: true } } } },
        _count: { select: { enrollments: true, modules: true, labs: true } },
      },
    })
  } catch {
    degraded = true
    let cols = new Set<string>()
    try {
      const rows = await db.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'Course'`
      cols = new Set(rows.map((r) => r.column_name))
    } catch {}
    const WANTED = [
      "id", "slug", "title", "shortName", "description", "longDescription",
      "category", "level", "durationHours", "price", "rating",
      "studentsCount", "color", "thumbnail", "tags", "certBody",
      "published", "createdAt", "updatedAt",
    ]
    const select: Record<string, true> = {
      id: true, slug: true, title: true, description: true,
      category: true, level: true, price: true,
    }
    for (const k of WANTED) if (cols.has(k)) select[k] = true
    try {
      const tier2: any = { where, select, orderBy: { createdAt: "desc" } }
      if (cols.has("instructorId")) {
        tier2.include = { instructor: { select: { id: true, name: true, title: true, avatar: true } } }
      }
      courses = await db.course.findMany(tier2)
    } catch {
      courses = await db.course.findMany({
        select: {
          id: true, slug: true, title: true, description: true,
          category: true, level: true, price: true,
        },
        orderBy: { createdAt: "desc" },
      })
    }
  }

  const result = courses.map((c: any) => {
    const lessonCount = Array.isArray(c.modules)
      ? c.modules.reduce((acc: number, m: any) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0), 0)
      : 0
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortName: c.shortName,
      description: c.description,
      longDescription: c.longDescription ?? null,
      category: c.category,
      level: c.level,
      durationHours: c.durationHours ?? 0,
      price: c.price,
      rating: c.rating ?? null,
      studentsCount: c.studentsCount ?? 0,
      thumbnail: c.thumbnail ?? null,
      color: c.color ?? "violet",
      tags: c.tags ?? "",
      certBody: c.certBody ?? null,
      ...(degraded ? {} : Object.fromEntries(COURSE_LIST_FIELDS.map(({ key }) => [key, (c as any)[key] ?? "[]"]))),
      published: c.published ?? true,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      instructor: c.instructor ?? null,
      moduleCount: Array.isArray(c.modules) ? c.modules.length : 0,
      lessonCount,
      labCount: Array.isArray(c.labs) ? c.labs.length : 0,
      enrollmentCount: c._count?.enrollments ?? 0,
      completedEnrollments: 0,
    }
  })

  return NextResponse.json({ courses: result, total: result.length, degraded })
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

  // Full create writes every current-schema column (course-extras lists,
  // instructorId, …). On drifted databases this throws P2022 and the admin
  // cannot upload at all. Fallback: discover which Course columns exist and
  // write only those — the course still gets created; missing extras stay
  // empty until the schema is synced (prisma db push).
  let course: any
  try {
    course = await db.course.create({
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
  } catch {
    let cols = new Set<string>()
    try {
      const rows = await db.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'Course'`
      cols = new Set(rows.map((r) => r.column_name))
    } catch {}
    const wanted: Record<string, unknown> = {
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
    }
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(wanted)) {
      if (cols.has(k)) data[k] = v
    }
    // id/slug/title are non-negotiable; if even those are missing the schema
    // is unusable and the create SHOULD fail loudly.
    course = await db.course.create({ data: data as any })
    course.instructor = { id: instructor.id, name: instructor.name, title: instructor.title }
  }

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
