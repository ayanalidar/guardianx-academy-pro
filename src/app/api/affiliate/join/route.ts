import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* Generate a unique referral code from the user's name + random suffix.
 * Format: <NAME-SLUG>-<6-char-hex> e.g. "ARJUN-1a2b3c"
 * Loops until it finds a unique code (theoretically never collides given
 * the 16^6 = 1.67B suffix space, but we cap at 10 attempts to fail fast). */
async function generateUniqueCode(baseName: string): Promise<string | null> {
  const slug = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12) || "user"
  const upper = slug.toUpperCase()
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(16).slice(2, 8).toUpperCase()
    const candidate = `${upper}-${suffix}`
    const existing = await db.affiliate.findUnique({ where: { code: candidate } })
    if (!existing) return candidate
  }
  return null
}

/* POST /api/affiliate/join - auth required.
 * Creates an affiliate record for the current user with a unique code
 * generated from the user's name + random suffix.
 *
 * Body (all optional):
 *   commissionRate?: number (0-100, default 10)
 *
 * Idempotent: if the user is already an affiliate, returns the existing
 * record instead of creating a duplicate.
 */
export const POST = withErrorHandler(async (req: Request) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Idempotent: return existing record if already an affiliate
  const existing = await db.affiliate.findUnique({ where: { userId: currentUser.id } })
  if (existing) {
    return NextResponse.json({ affiliate: existing })
  }

  // Parse optional commissionRate
  let commissionRate = 10
  try {
    const body = await req.json()
    if (body && typeof body.commissionRate === "number") {
      if (body.commissionRate < 0 || body.commissionRate > 100) {
        return NextResponse.json(
          { error: "commissionRate must be between 0 and 100" },
          { status: 400 },
        )
      }
      commissionRate = body.commissionRate
    }
  } catch {
    // Empty body is fine - fall through to defaults
  }

  const code = await generateUniqueCode(currentUser.name || "user")
  if (!code) {
    return NextResponse.json(
      { error: "Could not generate a unique referral code. Please try again." },
      { status: 500 },
    )
  }

  const created = await db.affiliate.create({
    data: {
      userId: currentUser.id,
      code,
      commissionRate,
    },
  })

  await logAction(
    currentUser.id,
    currentUser.name,
    "affiliate.join",
    "Affiliate",
    created.id,
    { code: created.code, commissionRate: created.commissionRate },
  )

  return NextResponse.json({ affiliate: created }, { status: 201 })
})
