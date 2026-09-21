import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { cachedJson, noStore } from "@/lib/http-cache"

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const level = searchParams.get("level")
  const q = searchParams.get("q")
  const vertical = searchParams.get("vertical")
  const enrolledOnly = searchParams.get("enrolled") === "true"
  const status = searchParams.get("status") || "all" // all | not-started | in-progress | completed
  const userIdParam = searchParams.get("userId")

  const currentUser = await getCurrentUser()
  // Session user is the source of truth: a stale client-supplied userId
  // (or a forged one - IDOR) must not be able to read someone else's
  // enrollments. The param remains a fallback for anonymous callers.
  const userId = currentUser?.id || userIdParam

  // Enrolled students must ALWAYS see their own courses, even if an admin
  // later unpublishes the course (published:true alone hid it from the
  // dashboard and broke "my courses").
  const where: any = enrolledOnly
    ? { OR: [{ published: true }, { enrollments: { some: { userId: userId || "__none__" } } }] }
    : { published: true }
  if (category && category !== "All") where.category = category
  if (level && level !== "All") where.level = level
  if (vertical && vertical !== "all") where.vertical = vertical
  if (q) {
    // AND-merged so we never clobber the enrolled/published OR above.
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { shortName: { contains: q } },
          { description: { contains: q } },
          { tags: { contains: q } },
        ],
      },
    ]
  }

  // Status-based filtering (requires auth)
  // Always include enrollments for the current user so we can show progress badges
  const includeEnrollments = !!userId
  if (enrolledOnly) {
    if (!userId) return NextResponse.json({ courses: [] })
    where.enrollments = { some: { userId } }
  } else if (status !== "all" && userId) {
    if (status === "not-started") {
      where.enrollments = { none: { userId } }
    } else if (status === "in-progress") {
      where.enrollments = { some: { userId, completed: false } }
    } else if (status === "completed") {
      where.enrollments = { some: { userId, completed: true } }
    }
  }

  // Full query - joins instructor, modules→lessons, enrollment counts. This
  // is the shape the catalog UI expects, but it requires the CURRENT schema
  // (studentsCount, course.instructorId, module.lessons relations, …). On
  // deployments whose database was seeded from an older schema (e.g. Vercel
  // auto-deploying fresh code against a stale remote DB) Prisma throws
  // P2022/P2021 and the whole catalog 500s. Instead of a blank page, degrade:
  // retry with only the core columns every historical schema version has.
  let courses: any[]
  let degraded = false
  try {
    courses = await db.course.findMany({
      where,
      include: {
        instructor: { select: { id: true, name: true, title: true, avatar: true } },
        modules: { select: { id: true, lessons: { select: { id: true } } } },
        _count: { select: { enrollments: true } },
        ...(includeEnrollments
          ? { enrollments: { where: { userId }, select: { progress: true, completed: true, lastAccessed: true, enrolledAt: true } } }
          : {}),
      },
      orderBy: enrolledOnly ? { enrollments: { _count: "desc" } } : { studentsCount: "desc" },
    })
  } catch {
    degraded = true
    // Tier 2 - SCHEMA-DISCOVERY fallback. Ask the database which Course
    // columns actually exist, select only those (plus conditional relations
    // and ordering), so any historical schema version renders with maximum
    // data instead of crashing or rendering a stub list.
    let cols = new Set<string>()
    try {
      const rows = await db.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'Course'`
      cols = new Set(rows.map((r) => r.column_name))
    } catch {
      // information_schema unavailable → tier 3 covers it.
    }

    const safeWhere: any = {}
    if (cols.has("published")) safeWhere.published = true
    if (category && category !== "All" && cols.has("category")) safeWhere.category = category
    if (level && level !== "All" && cols.has("level")) safeWhere.level = level
    // NOTE: q-search intentionally skipped in degraded mode - the columns it
    // needs may not exist, and a working unfiltered list beats a 500.

    const WANTED = [
      "id", "slug", "title", "shortName", "description", "longDescription",
      "category", "level", "durationHours", "price", "rating",
      "studentsCount", "color", "thumbnail", "tags", "certBody", "createdAt",
    ]
    const select: Record<string, true> = {
      // v1-era columns - present in every schema version this project had.
      id: true, slug: true, title: true, description: true,
      category: true, level: true, price: true,
    }
    for (const k of WANTED) if (cols.has(k)) select[k] = true

    const include: Record<string, any> = {}
    if (cols.has("instructorId")) {
      include.instructor = { select: { id: true, name: true, title: true, avatar: true } }
    }

    try {
      const tier2: any = {
        where: safeWhere,
        select,
        orderBy: cols.has("studentsCount")
          ? { studentsCount: "desc" }
          : { createdAt: "desc" },
      }
      if (Object.keys(include).length) tier2.include = include
      courses = await db.course.findMany(tier2)
    } catch {
      // Tier 3 - bare minimum, guaranteed columns only. No filters.
      courses = await db.course.findMany({
        select: {
          id: true, slug: true, title: true, description: true,
          category: true, level: true, price: true,
        },
        orderBy: { createdAt: "desc" },
      })
    }
  }

  const result = courses.map((c) => {
    // Degraded rows lack modules/lessons/enrollment - never crash the mapper.
    const lessonCount = Array.isArray(c.modules)
      ? c.modules.reduce((acc: number, m: any) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0), 0)
      : 0
    const enrollment = includeEnrollments ? (c as any).enrollments?.[0] : null
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortName: c.shortName,
      description: c.description,
      category: c.category,
      level: c.level,
      durationHours: c.durationHours ?? 0,
      price: c.price ?? 0,
      rating: c.rating ?? null,
      studentsCount: c.studentsCount ?? 0,
      color: c.color ?? "violet",
      thumbnail: c.thumbnail ?? null,
      tags: c.tags ?? "",
      certBody: c.certBody ?? null,
      instructor: c.instructor ?? null,
      lessonCount,
      moduleCount: Array.isArray(c.modules) ? c.modules.length : 0,
      enrollment: enrollment
        ? {
            progress: enrollment.progress,
            completed: enrollment.completed,
            lastAccessed: enrollment.lastAccessed,
            enrolledAt: enrollment.enrolledAt,
          }
        : null,
    }
  })

  // Cache policy: the anonymous catalog payload (no session, no enrollment
  // personalization params) is identical for every visitor and changes only
  // when admins edit courses - safe to edge-cache. Anything authenticated or
  // enrollment-related must never be cached (per-user progress badges).
  const personalized = !!currentUser || enrolledOnly || status !== "all" || !!userIdParam
  if (personalized) {
    return noStore(NextResponse.json({ courses: result, degraded }))
  }
  return cachedJson({ courses: result, degraded }, { sMax: 60, swr: 300 })
})
