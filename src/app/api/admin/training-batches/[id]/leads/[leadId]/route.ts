import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* PATCH /api/admin/training-batches/[id]/leads/[leadId]
 * ADMIN-only. Update a lead's status and/or admin notes.
 */
export const PATCH = withErrorHandler(async (req, { params }: { params: Promise<{ id: string; leadId: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id, leadId } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const data: any = {}
  if (body.status && ["New", "Contacted", "Qualified", "Enrolled", "Lost"].includes(body.status)) {
    data.status = body.status
  }
  if (typeof body.adminNotes === "string" && body.adminNotes.length <= 5000) {
    data.adminNotes = body.adminNotes.trim() || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await db.batchLead.update({
    where: { id: leadId, batchId: id },
    data,
  })
  return NextResponse.json({ ok: true, lead: updated })
})

/* DELETE /api/admin/training-batches/[id]/leads/[leadId]
 * ADMIN-only. Hard-delete a lead.
 */
export const DELETE = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string; leadId: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id, leadId } = await params
  await db.batchLead.delete({ where: { id: leadId, batchId: id } })
  return NextResponse.json({ ok: true })
})
