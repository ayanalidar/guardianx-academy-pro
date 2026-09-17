import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* PATCH /api/admin/subscription-plans/[id] — ADMIN only. Update a plan.
 * Accepts any of: { name?, price?, features?, popular?, order?, active? }
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const existing = await db.subscriptionPlan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const updates: Record<string, unknown> = {}
    const { name, price, features, popular, order, active } = body as {
      name?: string
      price?: number | string
      features?: unknown
      popular?: boolean
      order?: number
      active?: boolean
    }

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim()
    }

    if (price !== undefined) {
      const numericPrice = typeof price === "number" ? price : Number(price)
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 })
      }
      updates.price = numericPrice
    }

    if (features !== undefined) {
      let featuresStr = "[]"
      if (Array.isArray(features)) {
        featuresStr = JSON.stringify(features.filter((s) => typeof s === "string"))
      } else if (typeof features === "string") {
        try {
          const parsed = JSON.parse(features)
          if (Array.isArray(parsed)) {
            featuresStr = JSON.stringify(parsed.filter((s) => typeof s === "string"))
          }
        } catch {
          // keep default
        }
      }
      updates.features = featuresStr
    }

    if (typeof popular === "boolean") updates.popular = popular
    if (typeof active === "boolean") updates.active = active
    if (typeof order === "number" && Number.isFinite(order)) {
      updates.order = Math.floor(order)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ plan: existing })
    }

    const updated = await db.subscriptionPlan.update({ where: { id }, data: updates })

    await logAction(
      currentUser.id,
      currentUser.name,
      "subscription-plan.update",
      "SubscriptionPlan",
      id,
      {
        before: { name: existing.name, price: existing.price, popular: existing.popular, active: existing.active },
        after: { name: updated.name, price: updated.price, popular: updated.popular, active: updated.active },
      },
    )

    return NextResponse.json({ plan: updated })
  },
)

/* DELETE /api/admin/subscription-plans/[id] — ADMIN only. Delete a plan. */
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const existing = await db.subscriptionPlan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

    await db.subscriptionPlan.delete({ where: { id } })

    await logAction(
      currentUser.id,
      currentUser.name,
      "subscription-plan.delete",
      "SubscriptionPlan",
      id,
      { name: existing.name, price: existing.price },
    )

    return NextResponse.json({ success: true })
  },
)
