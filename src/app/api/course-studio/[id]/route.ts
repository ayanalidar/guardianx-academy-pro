import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { ensureTable, filterToColumns, getTableColumns, isDriftError, withDriftRetry } from "@/lib/db-safe"
import { getCurrentUser } from "@/lib/session"
import { COURSE_LIST_FIELDS, normalizeCourseListInput } from "@/lib/course-lists"

export const runtime = "nodejs"

/**
 * Course Authoring Studio — single-course operations.
 *
 * GET    — fetch course config (full JSON for the editor).
 * PATCH  — update config + meta (title, status, version bump).
 * DELETE — delete the authored course (does NOT delete any published Course).
 * POST   — publish: convert the draft into a real Course with modules/lessons.
 *          Re-publishing updates the existing Course (idempotent).
 *
 * Auth: requires the logged-in user to be the author.
 */

interface StudioConfig {
  version: number
  title: string
  shortName: string
  description: string
  longDescription: string
  category: string
  level: "Beginner" | "Intermediate" | "Advanced"
  durationHours: number
  price: number
  color: string
  tags: string[]
  certBody: string | null
  thumbnail: string | null
  // Course extras — optional JSON arrays (what you'll learn, prerequisites,
  // who should attend, tools covered, career outcomes)
  whatYouWillLearn?: string[]
  prerequisites?: string[]
  whoShouldAttend?: string[]
  toolsCovered?: string[]
  careerOutcomes?: string[]
  modules: Array<{
    id: string
    title: string
    description?: string
    lessons: Array<{
      id: string
      title: string
      type: "reading" | "pdf" | "video" | "lab"
      content: string
      pdfUrl?: string | null
      pdfPages?: number
      durationMin: number
      preview: boolean
    }>
  }>
}

function parseConfig(raw: string | null | undefined): StudioConfig | null {
  if (!raw) return null
  try {
    const c = JSON.parse(raw)
    if (!c || typeof c !== "object") return null
    return c as StudioConfig
  } catch {
    return null
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `course-${Date.now()}`
  )
}

async function getOwnedDraft(id: string, userId: string) {
  // Drift-resilient: bootstrap the AuthoredCourse table and retry once if
  // the storage predates the Course Studio migration.
  const [draft, err] = await withDriftRetry("AuthoredCourse", () =>
    db.authoredCourse.findUnique({ where: { id } })
  )
  if (err) {
    console.error("[course-studio/draft-lookup]", err)
    return {
      error: NextResponse.json(
        { error: isDriftError(err) ? "Course storage is being provisioned — try again in a moment." : "Failed to load course" },
        { status: 500 }
      ),
    }
  }
  if (!draft) return { error: NextResponse.json({ error: "Course not found" }, { status: 404 }) }
  if (draft.authorId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden — not the author" }, { status: 403 }) }
  }
  return { draft }
}

// ---------------------------------------------------------------------------
// GET — fetch full config
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const owned = await getOwnedDraft(id, user.id)
  if ("error" in owned) return owned.error
  const { draft } = owned

  const config = parseConfig(draft.config)
  return NextResponse.json({
    course: {
      id: draft.id,
      title: draft.title,
      status: draft.status,
      version: draft.version,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      config: config || {},
    },
  })
}

// ---------------------------------------------------------------------------
// PATCH — update config / meta
// ---------------------------------------------------------------------------
const patchSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  status: z.enum(["draft", "review", "published"]).optional(),
  config: z.any().optional(),
  bumpVersion: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const owned = await getOwnedDraft(id, user.id)
  if ("error" in owned) return owned.error
  const { draft } = owned

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    const { title, status, config, bumpVersion } = parsed.data

    const data: any = {}
    if (typeof title === "string") data.title = title.trim()
    if (status) data.status = status
    if (config !== undefined) {
      // Must be serialisable JSON
      try {
        const json = typeof config === "string" ? config : JSON.stringify(config)
        // Re-validate by parsing
        JSON.parse(json)
        data.config = json
      } catch {
        return NextResponse.json({ error: "Config must be valid JSON" }, { status: 400 })
      }
    }
    if (bumpVersion) {
      data.version = (draft.version || 1) + 1
    }

    const [updated, updErr] = await withDriftRetry("AuthoredCourse", () =>
      db.authoredCourse.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          status: true,
          version: true,
          config: true,
          updatedAt: true,
        },
      })
    )

    if (updErr || !updated) {
      console.error("[course-studio/patch]", updErr)
      return NextResponse.json(
        {
          error: isDriftError(updErr)
            ? "Course storage is being provisioned — try again in a moment."
            : "Failed to update course",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      course: {
        ...updated,
        config: parseConfig(updated.config) || {},
      },
    })
  } catch (e) {
    console.error("[course-studio/patch]", e)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — delete draft
// ---------------------------------------------------------------------------
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const owned = await getOwnedDraft(id, user.id)
  if ("error" in owned) return owned.error

  // Drift-resilient delete (table may be missing on first-run databases).
  const [, delErr] = await withDriftRetry("AuthoredCourse", () =>
    db.authoredCourse.delete({ where: { id } })
  )
  if (delErr && !isDriftError(delErr)) {
    console.error("[course-studio/delete]", delErr)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: id })
}

// ---------------------------------------------------------------------------
// POST — publish (convert to real Course + modules + lessons)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const owned = await getOwnedDraft(id, user.id)
  if ("error" in owned) return owned.error
  const { draft } = owned

  const config = parseConfig(draft.config)
  if (!config) {
    return NextResponse.json({ error: "Course config is missing or invalid" }, { status: 400 })
  }
  if (!config.title || config.title.trim().length < 3) {
    return NextResponse.json({ error: "Course title is required (min 3 chars)" }, { status: 400 })
  }
  if (!Array.isArray(config.modules) || config.modules.length === 0) {
    return NextResponse.json({ error: "Add at least one module before publishing" }, { status: 400 })
  }

  // Validate that each module has at least one lesson (warn-only — we still publish)
  const totalLessons = config.modules.reduce(
    (acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
    0
  )
  if (totalLessons === 0) {
    return NextResponse.json({ error: "Add at least one lesson before publishing" }, { status: 400 })
  }

  // Optional body: { force?: boolean } to overwrite an existing published Course
  let force = false
  try {
    const body = await req.json()
    force = !!body?.force
  } catch {
    // No body is fine
  }

  const slugBase = slugify(config.title)
  // Find any existing published course authored by this user with the same draft
  // We embed the draft id in the slug to make re-publishing idempotent.
  const desiredSlug = `${slugBase}-${draft.id.slice(-6)}`.slice(0, 80)

  // Drift-resilient lookup: a full-model findUnique selects every Course
  // column and 500s with P2022 on drifted databases. Select only columns
  // that actually exist; if even the lookup fails treat it as "no existing
  // course" (re-publish then creates rather than updates — the slug embeds
  // the draft id, so collisions are practically impossible).
  let existing: { id: string; instructorId?: string | null } | null = null
  try {
    existing = await db.course.findUnique({
      where: { slug: desiredSlug },
      select: { id: true, instructorId: true },
    })
  } catch {
    try {
      const cols = await getTableColumns("Course")
      const select: Record<string, true> = { id: true }
      if (cols.has("slug")) select.slug = true
      if (cols.has("instructorId")) select.instructorId = true
      existing = (await db.course.findUnique({ where: { slug: desiredSlug }, select })) as any
    } catch {
      existing = null
    }
  }

  // Course extras — config arrays normalized to the canonical JSON encoding
  const extrasData = Object.fromEntries(
    COURSE_LIST_FIELDS.map(({ key }) => [key, normalizeCourseListInput((config as any)[key])])
  ) as Record<string, string>

  // --- Drift prep (before the transaction) -------------------------------
  // Sync Course/Module/Lesson storage to the current Prisma schema (adds
  // any missing columns — e.g. the five required-with-default course-extras
  // columns Prisma always sends on INSERT). On a fully-synced schema this
  // is a no-op passthrough.
  await Promise.all([ensureTable("Course"), ensureTable("Module"), ensureTable("Lesson")])
  const courseCols = await getTableColumns("Course")

  const courseBase = {
    title: config.title,
    shortName: config.shortName || slugBase.toUpperCase().slice(0, 6),
    description: config.description || "",
    longDescription: config.longDescription || config.description || "",
    category: config.category || "Certification",
    level: config.level || "Beginner",
    durationHours: Number(config.durationHours) || 40,
    price: Number(config.price) || 0,
    color: config.color || "violet",
    tags: Array.isArray(config.tags) ? config.tags.join(",") : "",
    certBody: config.certBody || null,
    thumbnail: config.thumbnail || null,
    ...extrasData,
    published: true,
    instructorId: user.id,
  }
  // Keep only fields whose columns exist. id/slug (create) stay explicit —
  // if those core columns are missing the schema is unusable and the
  // publish SHOULD fail loudly.
  const courseCreateData: Record<string, unknown> = { slug: desiredSlug }
  const courseUpdateData: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(courseBase)) {
    if (!courseCols.has(k)) continue
    courseCreateData[k] = v
    courseUpdateData[k] = v
  }

  try {
    if (process.env.DB_SAFE_DEBUG === "1") {
      console.error(
        `[db-safe] publish createKeys=[${Object.keys(courseCreateData).join(",")}] updateKeys=[${Object.keys(courseUpdateData).join(",")}] existing=${existing ? existing.id : "null"}`
      )
    }
    const published = await db.$transaction(async (tx) => {
      let course: any
      if (existing) {
        if (!force && existing.instructorId != null && existing.instructorId !== user.id) {
          throw new Error("Slug already taken by another instructor")
        }
        // Replace modules + lessons
        await tx.module.deleteMany({ where: { courseId: existing.id } })
        course = await tx.course.update({
          where: { id: existing.id },
          data: courseUpdateData,
        })
      } else {
        course = await tx.course.create({ data: courseCreateData as any })
      }

      // Create modules + lessons — each write filtered to the columns the
      // drifted database actually has (degrades gracefully; a fully-synced
      // schema writes every field).
      for (let mIdx = 0; mIdx < config.modules.length; mIdx++) {
        const m = config.modules[mIdx]
        const moduleData = await filterToColumns("Module", {
          courseId: course.id,
          title: m.title || `Module ${mIdx + 1}`,
          description: m.description || "",
          order: mIdx,
        })
        const moduleRec = await tx.module.create({ data: moduleData as any })
        const lessons = Array.isArray(m.lessons) ? m.lessons : []
        for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
          const l = lessons[lIdx]
          const lessonData = await filterToColumns("Lesson", {
            moduleId: moduleRec.id,
            title: l.title || `Lesson ${lIdx + 1}`,
            type: l.type || "reading",
            content: l.content || "",
            pdfUrl: l.pdfUrl || null,
            pdfPages: Number(l.pdfPages) || 0,
            durationMin: Number(l.durationMin) || 15,
            order: lIdx,
            preview: !!l.preview,
          })
          await tx.lesson.create({ data: lessonData as any })
        }
      }

      // Mark the authored course as published + bump version
      const updated = await tx.authoredCourse.update({
        where: { id: draft.id },
        data: {
          status: "published",
          version: (draft.version || 1) + 1,
          title: config.title,
        },
      })

      return { course, draft: updated }
    })

    return NextResponse.json({
      ok: true,
      published: true,
      courseId: published.course.id,
      slug: published.course.slug,
      title: published.course.title,
      version: published.draft.version,
      moduleCount: config.modules.length,
      lessonCount: totalLessons,
    })
  } catch (e: any) {
    console.error("[course-studio/publish]", e)
    return NextResponse.json(
      { error: e?.message || "Failed to publish course" },
      { status: 500 }
    )
  }
}
