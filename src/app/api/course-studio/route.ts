import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { ensureTable, isDriftError, withDriftRetry } from "@/lib/db-safe"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

/**
 * Course Authoring Studio — list & create.
 *
 * GET  — list the current user's authored courses (any role).
 * POST — create a new draft AuthoredCourse. Returns the new draft with its
 *        initial empty config skeleton.
 *
 * Auth: requires a logged-in user via getCurrentUser().
 */

const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().max(2000).optional().default(""),
  category: z.string().max(80).optional().default("Certification"),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional().default("Beginner"),
})

/** Default config skeleton returned on create. Mirrors the shape used by the
 *  studio editor (and by the publish endpoint that converts the config into
 *  a real Course with modules/lessons). */
export function defaultCourseConfig(
  title: string,
  description = "",
  category = "Certification",
  level: "Beginner" | "Intermediate" | "Advanced" = "Beginner"
) {
  return {
    version: 1,
    title,
    shortName: title
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 5) || "CRS",
    description,
    longDescription: description,
    category,
    level,
    durationHours: 40,
    price: 0,
    color: "violet",
    tags: [] as string[],
    certBody: null as string | null,
    thumbnail: null as string | null,
    modules: [
      {
        id: `m_${Date.now()}`,
        title: "Module 1 — Foundations",
        description: "Introduction to the course's core concepts.",
        lessons: [
          {
            id: `l_${Date.now()}`,
            title: "Welcome & Overview",
            type: "reading" as const,
            content: "Welcome to the course. This lesson introduces the roadmap and learning objectives.",
            durationMin: 10,
            preview: true,
          },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// GET — list
// ---------------------------------------------------------------------------
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Drift-resilient: on a production DB where the AuthoredCourse table
  // predates a migration (or is missing entirely), bootstrap the table and
  // retry once. Final failure degrades to an empty studio instead of a 500.
  const [authored, listErr] = await withDriftRetry("AuthoredCourse", () =>
    db.authoredCourse.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        version: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  )

  if (listErr || !authored) {
    console.error("[course-studio/list]", listErr)
    return NextResponse.json({
      courses: [],
      degraded: true,
      error: isDriftError(listErr)
        ? "Course storage is being provisioned — try again in a moment."
        : "Failed to load your courses",
      totals: { total: 0, drafts: 0, review: 0, published: 0 },
    })
  }

  const list = authored.map((a) => {
    let config: any = {}
    try {
      config = JSON.parse(a.config || "{}")
    } catch {
      config = {}
    }
    const modules = Array.isArray(config.modules) ? config.modules : []
    const lessonCount = modules.reduce(
      (acc: number, m: any) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
      0
    )
    return {
      id: a.id,
      title: a.title,
      status: a.status,
      version: a.version,
      moduleCount: modules.length,
      lessonCount,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      category: config.category || "Certification",
      level: config.level || "Beginner",
      thumbnail: config.thumbnail || null,
      shortName: config.shortName || "",
    }
  })

  return NextResponse.json({
    courses: list,
    totals: {
      total: list.length,
      drafts: list.filter((c) => c.status === "draft").length,
      review: list.filter((c) => c.status === "review").length,
      published: list.filter((c) => c.status === "published").length,
    },
  })
}

// ---------------------------------------------------------------------------
// POST — create draft
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    const { title, description, category, level } = parsed.data

    const config = defaultCourseConfig(title, description, category, level)

    // Self-heal: first-ever write bootstraps the AuthoredCourse table on
    // databases that predate the Course Studio migration.
    await ensureTable("AuthoredCourse")

    const data = {
      title: title.trim(),
      authorId: user.id,
      status: "draft",
      config: JSON.stringify(config),
      version: 1,
    }
    const [created, createErr] = await withDriftRetry("AuthoredCourse", () =>
      db.authoredCourse.create({
        data,
        select: {
          id: true,
          title: true,
          status: true,
          config: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    )

    if (createErr || !created) {
      console.error("[course-studio/create]", createErr)
      return NextResponse.json(
        {
          error: isDriftError(createErr)
            ? "Course storage is being provisioned — try again in a moment."
            : "Failed to create course",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        course: {
          ...created,
          config: JSON.parse(created.config || "{}"),
        },
      },
      { status: 201 }
    )
  } catch (e) {
    console.error("[course-studio/create]", e)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
