import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* GET /api/admin/coupons - ADMIN only. List all coupons. */
export const GET = withErrorHandler(async () => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ coupons, count: coupons.length })
})

/* POST /api/admin/coupons - ADMIN only. Create a coupon.
 * Body: { code, type, value, maxUses?, validFrom, validUntil?, courseId?, active? }
 *   - code: required, uppercased + trimmed; must be unique
 *   - type: "percentage" | "fixed"  (default "percentage")
 *   - value: positive number
 *   - maxUses: positive int (default 100)
 *   - validFrom: ISO date string (required)
 *   - validUntil: ISO date string or null
 *   - courseId: optional course ID to scope the coupon
 *   - active: boolean (default true)
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const {
    code,
    type,
    value,
    maxUses,
    validFrom,
    validUntil,
    courseId,
    active,
  } = body as {
    code?: string
    type?: string
    value?: number | string
    maxUses?: number | string
    validFrom?: string
    validUntil?: string | null
    courseId?: string | null
    active?: boolean
  }

  if (!code || !code.trim()) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
  }

  const normalizedCode = code.trim().toUpperCase()

  // Check uniqueness
  const existing = await db.coupon.findUnique({ where: { code: normalizedCode } })
  if (existing) {
    return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 })
  }

  const couponType = type === "fixed" ? "fixed" : "percentage"
  const numericValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return NextResponse.json({ error: "value must be a positive number" }, { status: 400 })
  }
  if (couponType === "percentage" && numericValue > 100) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 100" }, { status: 400 })
  }

  const numericMaxUses = (() => {
    if (typeof maxUses === "number" && Number.isFinite(maxUses)) return Math.max(1, Math.floor(maxUses))
    if (typeof maxUses === "string" && maxUses.trim() !== "" && Number.isFinite(Number(maxUses))) {
      return Math.max(1, Math.floor(Number(maxUses)))
    }
    return 100
  })()

  if (!validFrom) {
    return NextResponse.json({ error: "validFrom is required" }, { status: 400 })
  }
  const validFromDate = new Date(validFrom)
  if (Number.isNaN(validFromDate.getTime())) {
    return NextResponse.json({ error: "validFrom is not a valid date" }, { status: 400 })
  }
  let validUntilDate: Date | null = null
  if (validUntil) {
    validUntilDate = new Date(validUntil)
    if (Number.isNaN(validUntilDate.getTime())) {
      return NextResponse.json({ error: "validUntil is not a valid date" }, { status: 400 })
    }
    if (validUntilDate < validFromDate) {
      return NextResponse.json({ error: "validUntil cannot be before validFrom" }, { status: 400 })
    }
  }

  // Optional course scope - verify the course exists if provided
  let courseScope: string | null = null
  if (courseId && String(courseId).trim() !== "") {
    const course = await db.course.findUnique({ where: { id: String(courseId).trim() } })
    if (!course) {
      return NextResponse.json({ error: "Scoped course not found" }, { status: 400 })
    }
    courseScope = String(courseId).trim()
  }

  const created = await db.coupon.create({
    data: {
      code: normalizedCode,
      type: couponType,
      value: numericValue,
      maxUses: numericMaxUses,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      courseId: courseScope,
      active: typeof active === "boolean" ? active : true,
    },
  })

  await logAction(
    currentUser.id,
    currentUser.name,
    "coupon.create",
    "Coupon",
    created.id,
    { code: created.code, type: created.type, value: created.value },
  )

  return NextResponse.json({ coupon: created }, { status: 201 })
})
