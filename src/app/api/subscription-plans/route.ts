import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/subscription-plans - public.
 * Returns all active subscription plans ordered by `order` asc.
 * If no plans exist in the DB, returns a sensible default set so the
 * public pricing page always has something to show. */
export const GET = withErrorHandler(async () => {
  const plans = await db.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  })

  if (plans.length === 0) {
    // Sensible defaults so the pricing page is never empty on a fresh DB.
    const DEFAULT_PLANS = [
      {
        name: "Free",
        price: 0,
        features: ["Access to 5 starter courses", "Community discussion access", "Basic lab access (10 labs)", "Limited notes storage", "Public leaderboard entry"],
        popular: false,
        order: 1,
      },
      {
        name: "Pro",
        price: 999,
        features: ["All Free features", "Unlimited course access", "Full cyber labs (31+ labs)", "Proctored exam eligibility", "Verifiable certificates", "Priority support", "AI Assistant (200 queries/mo)"],
        popular: true,
        order: 2,
      },
      {
        name: "Enterprise",
        price: 4999,
        features: ["All Pro features", "Dedicated instructor + mentor", "Custom cohort batches", "Institution admin dashboard", "Bulk cert issuance", "API + SSO integration", "Quarterly security audits", "24×7 priority support"],
        popular: false,
        order: 3,
      },
    ]
    return NextResponse.json({
      plans: DEFAULT_PLANS.map((p, i) => ({
        id: `default-${i}`,
        name: p.name,
        price: p.price,
        features: p.features,
        popular: p.popular,
        order: p.order,
        active: true,
        createdAt: new Date().toISOString(),
      })),
      isDefault: true,
    })
  }

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      features: safeParseFeatures(p.features),
      popular: p.popular,
      order: p.order,
      active: p.active,
      createdAt: p.createdAt,
    })),
    isDefault: false,
  })
})

function safeParseFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string")
    }
  } catch {
    // fall through
  }
  return []
}
