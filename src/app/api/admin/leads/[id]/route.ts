import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Converted", "Lost"]

// PATCH /api/admin/leads/[id] — update lead status, followUpDate, assignedTo
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const { status, followUpDate, assignedTo, ...rest } = body as {
      status?: string
      followUpDate?: string
      assignedTo?: string
      [k: string]: unknown
    }

    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (status && LEAD_STATUSES.includes(status) && status !== existing.status) {
      updates.status = status
    }
    if (followUpDate !== undefined) {
      updates.followUpDate = followUpDate ? new Date(followUpDate) : null
    }
    if (assignedTo !== undefined) {
      updates.assignedTo = assignedTo || null
    }
    // Allow type/source/org updates too
    if (typeof rest.type === "string") updates.type = rest.type
    if (typeof rest.source === "string") updates.source = rest.source
    if (typeof rest.organization === "string") updates.organization = rest.organization
    if (typeof rest.phone === "string") updates.phone = rest.phone
    if (typeof rest.email === "string") updates.email = rest.email

    const updated = await db.lead.update({
      where: { id },
      data: updates,
      include: { notes: { orderBy: { createdAt: "desc" } }, history: { orderBy: { changedAt: "desc" } } },
    })

    // If status changed, log to history
    if (updates.status && updates.status !== existing.status) {
      await db.leadStatusHistory.create({
        data: { leadId: id, fromStatus: existing.status, toStatus: updates.status as string },
      })
    }

    return NextResponse.json({ lead: updated })
  },
)

// DELETE /api/admin/leads/[id]
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    await db.lead.delete({ where: { id } }).catch(() => null)
    return NextResponse.json({ ok: true })
  },
)
