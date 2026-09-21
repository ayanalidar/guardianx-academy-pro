import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* POST /api/admin/subscription-plans - ADMIN only. Create a plan.
 * Body:
 *   name        (required) - e.g. "Free", "Pro", "Enterprise"
 *   price       (required) - monthly price in INR (>= 0)
 *   features?   (optional) - string[] of feature bullets (default [])
 *   popular?    (optional) - boolean (default false)
 *   order?      (optional) - display order (default 0)
 *   active?     (optional) - boolean (default true)
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { name, price, features, popular, order, active } = body as {
    name?: string
    price?: number | string
    features?: unknown
    popular?: boolean
    order?: number
    active?: boolean
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Plan name is required" }, { status: 400 })
  }

  const numericPrice = typeof price === "number" ? price : Number(price)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 })
  }

  // Coerce features into a JSON-encoded string array
  let featuresStr = "[]"
  if (Array.isArray(features)) {
    const clean = features.filter((s) => typeof s === "string" && s.trim() !== "")
    featuresStr = JSON.stringify(clean)
  } else if (typeof features === "string" && features.trim() !== "") {
    // Accept a JSON-encoded string array as well
    try {
      const parsed = JSON.parse(features)
      if (Array.isArray(parsed)) {
        featuresStr = JSON.stringify(parsed.filter((s) => typeof s === "string"))
      }
    } catch {
      // fall through - keep default "[]"
    }
  }

  const created = await db.subscriptionPlan.create({
    data: {
      name: name.trim(),
      price: numericPrice,
      features: featuresStr,
      popular: typeof popular === "boolean" ? popular : false,
      order: typeof order === "number" && Number.isFinite(order) ? Math.floor(order) : 0,
      active: typeof active === "boolean" ? active : true,
    },
  })

  await logAction(
    currentUser.id,
    currentUser.name,
    "subscription-plan.create",
    "SubscriptionPlan",
    created.id,
    { name: created.name, price: created.price, popular: created.popular },
  )

  return NextResponse.json({ plan: created }, { status: 201 })
})
