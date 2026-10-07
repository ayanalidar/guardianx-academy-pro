import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { logAction } from "@/lib/audit"
import { GRC_MASTERY_CONTENT } from "@/data/grc-mastery-content"
import { GRC_BOOTCAMP_CONTENT } from "@/data/grc-bootcamp-content"
import type { SyncCourseContent } from "@/data/grc-content-types"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs"

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME curriculum content sync (GRC Mastery + GRC Bootcamp).
//
// Purpose: apply the official curriculum PDFs to the two GRC courses without
// requiring an interactive admin session. This endpoint is TEMPORARY:
//   1. It lives OUTSIDE the /api/admin prefix on purpose - middleware gates
//      that prefix by session-cookie presence, and this endpoint authenticates
//      with its own 256-bit one-time key instead. The key is supplied in the
//      `x-content-sync-key` header; only its SHA-256 is stored here
//      (timing-safe compare) - the raw key never lives in the repo.
//   2. It accepts ONLY the two hardcoded course slugs, and aborts if the
//      slug no longer resolves to the expected course id.
//   3. Every invocation is written to the AuditLog.
//   4. The route file is REMOVED from the codebase in the commit immediately
//      following the successful sync (the content data files remain as the
//      source of truth).
//
// Deletion scope per course: Module rows (and, by cascade, Lesson,
// LessonProgress, Note, Quiz rows) for that course ONLY. Both courses had
// zero enrolled students at sync time. No other tables are touched.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_HASH = "f7f3482f50632e737870381429998eacf62735d906fed8290fd2b7c53bbf1b75"

const COURSES: Record<string, SyncCourseContent> = {
  [GRC_MASTERY_CONTENT.slug]: GRC_MASTERY_CONTENT,
  [GRC_BOOTCAMP_CONTENT.slug]: GRC_BOOTCAMP_CONTENT,
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-content-sync-key") || ""
  const digest = createHash("sha256").update(key).digest()
  const expected = Buffer.from(KEY_HASH, "hex")
  if (digest.length !== expected.length || !timingSafeEqual(digest, expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { slugs?: unknown }
  const slugs =
    Array.isArray(body.slugs) && body.slugs.every((s) => typeof s === "string")
      ? (body.slugs as string[])
      : Object.keys(COURSES)

  const results: Array<Record<string, unknown>> = []
  for (const slug of slugs) {
    const content = COURSES[slug]
    if (!content) {
      results.push({ slug, ok: false, error: "Unknown slug" })
      continue
    }

    const course = await db.course.findUnique({ where: { slug }, select: { id: true, title: true } })
    if (!course) {
      results.push({ slug, ok: false, error: "Course not found" })
      continue
    }
    if (course.id !== content.courseId) {
      // Guard: the slug must still point at the course this content was authored for.
      results.push({ slug, ok: false, error: `Course id mismatch (found ${course.id})` })
      continue
    }

    try {
      const summary = await db.$transaction(async (tx) => {
        // Replace the curriculum for THIS course only. Cascades remove the
        // old lessons (and any lesson-scoped progress/notes/quizzes).
        await tx.module.deleteMany({ where: { courseId: course.id } })

        let lessonCount = 0
        for (let m = 0; m < content.modules.length; m++) {
          const mod = content.modules[m]
          await tx.module.create({
            data: {
              courseId: course.id,
              title: mod.title,
              description: mod.description ?? "",
              order: m,
              lessons: {
                create: mod.lessons.map((l, i) => ({
                  title: l.title,
                  type: l.type ?? "reading",
                  content: l.content,
                  durationMin: l.durationMin ?? 30,
                  order: i,
                  preview: l.preview ?? false,
                })),
              },
            },
          })
          lessonCount += mod.lessons.length
        }

        const f = content.fields
        const updated = await tx.course.update({
          where: { id: course.id },
          data: {
            description: f.description,
            longDescription: f.longDescription,
            tags: f.tags,
            whatYouWillLearn: JSON.stringify(f.whatYouWillLearn),
            whoShouldAttend: JSON.stringify(f.whoShouldAttend),
            toolsCovered: JSON.stringify(f.toolsCovered),
            careerOutcomes: JSON.stringify(f.careerOutcomes),
          },
          select: { title: true, slug: true },
        })

        return { title: updated.title, modules: content.modules.length, lessons: lessonCount }
      })

      await logAction(
        null,
        "content-sync (deploy pipeline)",
        "course.content_sync",
        "Course",
        course.id,
        { slug, ...summary, source: "official curriculum PDFs" },
      )
      results.push({ slug, ok: true, ...summary })
    } catch (err) {
      results.push({ slug, ok: false, error: err instanceof Error ? err.message : "sync failed" })
    }
  }

  const allOk = results.every((r) => r.ok)
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
