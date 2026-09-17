import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* PATCH /api/admin/coupons/[id] — ADMIN only. Update a coupon.
 * Accepts any of: { code?, type?, value?, maxUses?, validFrom?, validUntil?, courseId?, active? }
 * Validates per the same rules as POST /api/admin/coupons.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Coupon not found" }, { status: 404 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const updates: Record<string, unknown> = {}

    const { code, type, value, maxUses, validFrom, validUntil, courseId, active } = body as {
      code?: string
      type?: string
      value?: number | string
      maxUses?: number | string
      validFrom?: string
      validUntil?: string | null
      courseId?: string | null
      active?: boolean
    }

    if (typeof code === "string" && code.trim()) {
      const normalizedCode = code.trim().toUpperCase()
      if (normalizedCode !== existing.code) {
        // Check uniqueness for the new code
        const clash = await db.coupon.findUnique({ where: { code: normalizedCode } })
        if (clash) {
          return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 })
        }
        updates.code = normalizedCode
      }
    }

    if (typeof type === "string") {
      if (type !== "percentage" && type !== "fixed") {
        return NextResponse.json({ error: "type must be 'percentage' or 'fixed'" }, { status: 400 })
      }
      updates.type = type
    }

    if (value !== undefined) {
      const numericValue = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return NextResponse.json({ error: "value must be a positive number" }, { status: 400 })
      }
      const finalType = (updates.type as string) ?? existing.type
      if (finalType === "percentage" && numericValue > 100) {
        return NextResponse.json({ error: "Percentage discount cannot exceed 100" }, { status: 400 })
      }
      updates.value = numericValue
    }

    if (maxUses !== undefined) {
      const numericMaxUses = typeof maxUses === "number" ? maxUses : Number(maxUses)
      if (!Number.isFinite(numericMaxUses) || numericMaxUses < 1) {
        return NextResponse.json({ error: "maxUses must be >= 1" }, { status: 400 })
      }
      updates.maxUses = Math.floor(numericMaxUses)
    }

    if (validFrom !== undefined) {
      const date = new Date(validFrom)
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "validFrom is not a valid date" }, { status: 400 })
      }
      updates.validFrom = date
    }

    if (validUntil !== undefined) {
      if (validUntil === null || validUntil === "") {
        updates.validUntil = null
      } else {
        const date = new Date(validUntil)
        if (Number.isNaN(date.getTime())) {
          return NextResponse.json({ error: "validUntil is not a valid date" }, { status: 400 })
        }
        updates.validUntil = date
      }
    }

    // Cross-field date sanity check
    const finalValidFrom = (updates.validFrom as Date | undefined) ?? existing.validFrom
    const finalValidUntil = (updates.validUntil as Date | null | undefined) ?? existing.validUntil
    if (finalValidUntil && finalValidUntil < finalValidFrom) {
      return NextResponse.json({ error: "validUntil cannot be before validFrom" }, { status: 400 })
    }

    if (courseId !== undefined) {
      if (courseId === null || courseId === "") {
        updates.courseId = null
      } else {
        const course = await db.course.findUnique({ where: { id: String(courseId) } })
        if (!course) {
          return NextResponse.json({ error: "Scoped course not found" }, { status: 400 })
        }
        updates.courseId = String(courseId)
      }
    }

    if (typeof active === "boolean") {
      updates.active = active
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ coupon: existing })
    }

    const updated = await db.coupon.update({ where: { id }, data: updates })

    await logAction(
      currentUser.id,
      currentUser.name,
      "coupon.update",
      "Coupon",
      id,
      { before: { code: existing.code, value: existing.value, active: existing.active }, after: { code: updated.code, value: updated.value, active: updated.active } },
    )

    return NextResponse.json({ coupon: updated })
  },
)

/* DELETE /api/admin/coupons/[id] — ADMIN only. Delete a coupon. */
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params
    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Coupon not found" }, { status: 404 })

    await db.coupon.delete({ where: { id } })

    await logAction(
      currentUser.id,
      currentUser.name,
      "coupon.delete",
      "Coupon",
      id,
      { code: existing.code, value: existing.value },
    )

    return NextResponse.json({ success: true })
  },
)
