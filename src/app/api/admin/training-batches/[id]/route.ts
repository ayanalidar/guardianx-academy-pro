import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, requireRole, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

// GET /api/admin/training-batches/[id] — fetch a single training batch.
// Requires ADMIN or INSTRUCTOR.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const batch = await db.trainingBatch.findUnique({ where: { id } })
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    return NextResponse.json({ batch })
  },
)

// PATCH /api/admin/training-batches/[id] — update any fields on a training batch.
// Requires ADMIN.
const UPDATABLE_STRING_FIELDS = [
  "certification",
  "name",
  "schedule",
  "startDate",
  "startIsoDate",
  "mode",
  "instructor",
  "instructorId",
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
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const existing = await db.trainingBatch.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

    const updates: Record<string, unknown> = {}

    for (const f of UPDATABLE_STRING_FIELDS) {
      const v = (body as Record<string, unknown>)[f]
      if (typeof v === "string") {
        updates[f] = f === "startIsoDate" || f === "instructorId" ? (v.trim() || null) : v.trim()
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

    const updated = await db.trainingBatch.update({ where: { id }, data: updates })
    return NextResponse.json({ batch: updated })
  },
)

// DELETE /api/admin/training-batches/[id] — delete a training batch.
// Requires ADMIN.
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const existing = await db.trainingBatch.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

    await db.trainingBatch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  },
)
