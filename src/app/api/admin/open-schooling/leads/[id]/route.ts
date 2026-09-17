import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* PATCH /api/admin/open-schooling/leads/[id]
 * ADMIN-only. Updates a lead's status and/or admin notes.
 *
 * Body: {
 *   status?: "NEW" | "CONTACTED" | "ENROLLED" | "LOST",
 *   adminNotes?: string
 * }
 */
export const PATCH = withErrorHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const data: any = {}
  if (body.status && ["NEW", "CONTACTED", "ENROLLED", "LOST"].includes(body.status)) {
    data.status = body.status
  }
  if (typeof body.adminNotes === "string" && body.adminNotes.length <= 5000) {
    data.adminNotes = body.adminNotes.trim() || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await db.openSchoolingLead.update({
    where: { id },
    data,
  })

  return NextResponse.json({ ok: true, lead: updated })
})

/* DELETE /api/admin/open-schooling/leads/[id]
 * ADMIN-only. Hard-deletes a lead (use sparingly — prefer marking as LOST).
 */
export const DELETE = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  await db.openSchoolingLead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
