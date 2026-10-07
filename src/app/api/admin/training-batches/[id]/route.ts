import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, requireRole, withErrorHandler } from "@/lib/session"
import { ensureTable, isDriftError } from "@/lib/db-safe"

export const runtime = "nodejs"

// Lazy schema self-heal for the courseId column (Batch Calendar course-link
// feature). findUnique/delete read the FULL row, so they fail with P2022 on
// a database that predates the column until it is added. Memoized per
// instance; the forced retry below covers cold-start DDL failures.
async function ensureSchema() {
  await ensureTable("TrainingBatch")
}

// GET /api/admin/training-batches/[id] - fetch a single training batch.
// Requires ADMIN or INSTRUCTOR.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
    if (currentUser instanceof NextResponse) return currentUser

    await ensureSchema()
    const { id } = await params
    const fetchBatch = () => db.trainingBatch.findUnique({ where: { id } })
    let batch
    try {
      batch = await fetchBatch()
    } catch (e) {
      if (!isDriftError(e)) throw e
      await ensureTable("TrainingBatch", true)
      batch = await fetchBatch()
    }
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    return NextResponse.json({ batch })
  },
)

// PATCH /api/admin/training-batches/[id] - update any fields on a training batch.
// Instructors may edit batches (Batch Calendar is shared tooling - see
// view-router.tsx); deletion remains admin-only.
const UPDATABLE_STRING_FIELDS = [
  "certification",
  "name",
  "schedule",
  "startDate",
  "startIsoDate",
  "mode",
  "instructor",
  // instructorId handled separately below (validated like courseId)
  "level",
  "status",
  "certColor",
  "certTint",
  "certBorder",
  "levelColor",
  "levelTint",
  "levelBorder",
  "borderColor",
  "btnClass",
  "description",
  "googleFormUrl",
] as const

const UPDATABLE_INT_FIELDS = ["seats", "enrolled", "order"] as const
const UPDATABLE_BOOL_FIELDS = ["featured", "published"] as const

export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    await ensureSchema()
    const fetchExisting = () => db.trainingBatch.findUnique({ where: { id } })
    let existing
    try {
      existing = await fetchExisting()
    } catch (e) {
      if (!isDriftError(e)) throw e
      await ensureTable("TrainingBatch", true)
      existing = await fetchExisting()
    }
    if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

    const updates: Record<string, unknown> = {}

    // Course link is validated (not a blind string copy): explicit null or
    // "" unlinks, a non-empty value must reference an existing course.
    if ("courseId" in body) {
      const v = (body as Record<string, unknown>).courseId
      if (v === null || (typeof v === "string" && !v.trim())) {
        updates.courseId = null
      } else if (typeof v === "string") {
        const course = await db.course.findUnique({ where: { id: v.trim() }, select: { id: true } })
        if (!course) return NextResponse.json({ error: "Linked course not found" }, { status: 400 })
        updates.courseId = v.trim()
      }
    }

    // Instructor account link - same contract as courseId (no DB FK exists
    // on instructorId, so handler-side validation is the only integrity gate).
    if ("instructorId" in body) {
      const v = (body as Record<string, unknown>).instructorId
      if (v === null || (typeof v === "string" && !v.trim())) {
        updates.instructorId = null
      } else if (typeof v === "string") {
        const instructor = await db.user.findUnique({ where: { id: v.trim() }, select: { id: true } })
        if (!instructor) return NextResponse.json({ error: "Linked instructor not found" }, { status: 400 })
        updates.instructorId = v.trim()
      }
    }

    for (const f of UPDATABLE_STRING_FIELDS) {
      const v = (body as Record<string, unknown>)[f]
      if (typeof v === "string") {
        updates[f] = f === "startIsoDate" ? (v.trim() || null) : v.trim()
      }
    }
    for (const f of UPDATABLE_INT_FIELDS) {
      const v = (body as Record<string, unknown>)[f]
      if (typeof v === "number" && Number.isFinite(v)) updates[f] = v
      else if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) updates[f] = Number(v)
    }
    for (const f of UPDATABLE_BOOL_FIELDS) {
      const v = (body as Record<string, unknown>)[f]
      if (typeof v === "boolean") updates[f] = v
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ batch: existing })
    }

    await ensureSchema()
    const updateBatch = () => db.trainingBatch.update({ where: { id }, data: updates })
    let updated
    try {
      updated = await updateBatch()
    } catch (e) {
      if (!isDriftError(e)) throw e
      await ensureTable("TrainingBatch", true)
      updated = await updateBatch()
    }
    return NextResponse.json({ batch: updated })
  },
)

// DELETE /api/admin/training-batches/[id] - delete a training batch.
// Requires ADMIN or SUPER_ADMIN (destructive - instructors cannot delete).
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    await ensureSchema()
    const { id } = await params
    const fetchBatch = () => db.trainingBatch.findUnique({ where: { id } })
    let existing
    try {
      existing = await fetchBatch()
    } catch (e) {
      if (!isDriftError(e)) throw e
      await ensureTable("TrainingBatch", true)
      existing = await fetchBatch()
    }
    if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

    await db.trainingBatch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  },
)
