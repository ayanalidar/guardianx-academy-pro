import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler, rateLimit, getClientIp } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/search?q=<query>  (PUBLIC — no auth required)
 * -----------------------------------------------------
 * Searches across 5 content types:
 *   - courses (title, shortName, description, tags)
 *   - instructors (name, title, bio)
 *   - events (title, description)
 *   - learning paths (title, description)
 *   - labs (title, description, tags)
 *
 * Returns unified results grouped by type:
 *   { courses, instructors, events, paths, labs, total }
 *
 * Each result row contains a minimal payload:
 *   - id, title (or name for instructors), and a short description/hint
 *   - a `slug`/`id` for navigation
 *   - extra contextual fields (level for courses, difficulty for labs, etc.)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  if (!rateLimit(`search:${getClientIp(req)}`, { max: 60, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  const limit = Math.min(
    20,
    Math.max(1, Number(searchParams.get("limit") ?? "8") || 8),
  )

  // Empty query → return empty result set (the UI will show "type to search")
  if (!q) {
    return NextResponse.json({
      courses: [],
      instructors: [],
      events: [],
      paths: [],
      labs: [],
      total: 0,
      query: "",
    })
  }

  // Postgres ILIKE for case-insensitive substring matching across text columns.
  // Each column gets its own OR predicate; we wrap them all in one Prisma
  // `where: { OR: [...] }` so a single SQL query covers the type.
  const ilike = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`

  const [courses, instructors, events, paths, labs] = await Promise.all([
    db.course.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { shortName: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        shortName: true,
        description: true,
        category: true,
        level: true,
        tags: true,
        thumbnail: true,
      },
      take: limit,
      orderBy: { studentsCount: "desc" },
    }),
    db.user.findMany({
      where: {
        role: "INSTRUCTOR",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        title: true,
        bio: true,
        avatar: true,
      },
      take: limit,
    }),
    db.event.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        startDate: true,
        venue: true,
      },
      take: limit,
      orderBy: { order: "asc" },
    }),
    db.learningPath.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        difficulty: true,
        duration: true,
      },
      take: limit,
      orderBy: { order: "asc" },
    }),
    db.lab.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        difficulty: true,
        tags: true,
      },
      take: limit,
    }),
  ])

  // `ilike` is computed for symmetry/future use; some Postgres setups
  // benefit from explicit ILIKE tokens, but Prisma's `mode: "insensitive"`
  // already translates to ILIKE under the hood.
  void ilike

  const total =
    courses.length + instructors.length + events.length + paths.length + labs.length

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      shortName: c.shortName,
      description: c.description,
      category: c.category,
      level: c.level,
      tags: c.tags,
      thumbnail: c.thumbnail,
    })),
    instructors: instructors.map((i) => ({
      id: i.id,
      name: i.name,
      title: i.title,
      bio: i.bio,
      avatar: i.avatar,
    })),
    events: events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      type: e.type,
      startDate: e.startDate,
      venue: e.venue,
    })),
    paths: paths.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      duration: p.duration,
    })),
    labs: labs.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      description: l.description,
      category: l.category,
      difficulty: l.difficulty,
      tags: l.tags,
    })),
    total,
    query: q,
  })
})
