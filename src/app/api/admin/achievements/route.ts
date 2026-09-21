import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

const VALID_TIERS = new Set(["bronze", "silver", "gold", "platinum"])
const VALID_COLORS = new Set([
  "emerald", "cyan", "violet", "amber", "orange", "red", "teal",
])

/* GET /api/admin/achievements - ADMIN only.
 * Returns the full catalog of achievements (static defs + admin-created rows).
 */
export const GET = withErrorHandler(async () => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  // Include the static ACHIEVEMENT_DEFS plus any admin-created DB rows.
  const { ACHIEVEMENT_DEFS } = await import("@/lib/gamification")
  const dynamicRows = await db.achievement.findMany({
    where: { code: { notIn: ACHIEVEMENT_DEFS.map((d) => d.code) } },
    orderBy: { tier: "asc" },
  })

  // For each achievement, also include the # of users who've earned it
  // so the admin table can show popularity at a glance.
  const earnedCounts = await db.userAchievement.groupBy({
    by: ["achievementId"],
    _count: { userId: true },
  })
  const earnedMap = new Map(earnedCounts.map((e) => [e.achievementId, e._count.userId]))

  // Hydrate static defs from DB where present (static defs may not be
  // persisted in the DB until a user earns them - they're created
  // lazily on first award).
  const staticRows = await db.achievement.findMany({
    where: { code: { in: ACHIEVEMENT_DEFS.map((d) => d.code) } },
  })
  const staticRowByCode = new Map(staticRows.map((r) => [r.code, r]))

  const staticItems = ACHIEVEMENT_DEFS.map((d) => {
    const row = staticRowByCode.get(d.code)
    return {
      id: (row as any)?.id ?? null,
      code: d.code,
      title: d.title,
      description: d.description,
      icon: d.icon,
      color: d.color,
      xp: d.xp,
      tier: d.tier,
      earnedCount: row ? (earnedMap.get(row.id) ?? 0) : 0,
      isStatic: true,
    }
  })

  const dynamicItems = dynamicRows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    icon: r.icon,
    color: r.color,
    xp: r.xp,
    tier: r.tier,
    earnedCount: earnedMap.get(r.id) ?? 0,
    isStatic: false,
  }))

  // sort by tier (platinum → bronze) then by xp desc
  const tierOrder: Record<string, number> = { platinum: 1, gold: 2, silver: 3, bronze: 4 }
  const sorted = [...staticItems, ...dynamicItems].sort((a, b) => {
    const t = (tierOrder[a.tier] ?? 5) - (tierOrder[b.tier] ?? 5)
    if (t !== 0) return t
    return b.xp - a.xp
  })

  return NextResponse.json({
    achievements: sorted,
    count: sorted.length,
  })
})

/* POST /api/admin/achievements - ADMIN only.
 * Body: { code, title, description, icon, color, xp, tier }
 *
 * Creates a new admin-defined achievement row. The achievement will appear
 * in every user's "locked" list in /api/achievements (since it's not in
 * the static ACHIEVEMENT_DEFS, it has no auto-award check - admin must
 * award it manually via the admin UI / direct DB write).
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const {
    code,
    title,
    description,
    icon,
    color,
    xp,
    tier,
  } = body as {
    code?: string
    title?: string
    description?: string
    icon?: string
    color?: string
    xp?: number | string
    tier?: string
  }

  // ----- validation -----
  if (!code || !code.trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "_")
  if (!/^[A-Z0-9_]+$/.test(normalizedCode)) {
    return NextResponse.json({ error: "code must contain only uppercase letters, digits, and underscores" }, { status: 400 })
  }

  // Reject codes that collide with static defs (those are managed in code)
  const { ACHIEVEMENT_DEFS } = await import("@/lib/gamification")
  if (ACHIEVEMENT_DEFS.some((d) => d.code === normalizedCode)) {
    return NextResponse.json({ error: `Code ${normalizedCode} is reserved by a static achievement definition` }, { status: 400 })
  }

  // Reject DB duplicates
  const existing = await db.achievement.findUnique({ where: { code: normalizedCode } })
  if (existing) {
    return NextResponse.json({ error: "Achievement code already exists" }, { status: 400 })
  }

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  const trimmedTitle = title.trim().slice(0, 120)
  const trimmedDesc = (description ?? "").trim().slice(0, 500)

  // default icon "Award" (lucide) - accept any non-empty string, sanitize
  const trimmedIcon = (icon ?? "Award").trim().slice(0, 64) || "Award"

  // default color "emerald" - must be in the known palette
  const normalizedColor = color && VALID_COLORS.has(color) ? color : "emerald"

  const numericXp = typeof xp === "number" ? xp : Number(xp ?? 50)
  if (!Number.isFinite(numericXp) || numericXp < 0) {
    return NextResponse.json({ error: "xp must be a non-negative number" }, { status: 400 })
  }

  const normalizedTier = tier && VALID_TIERS.has(tier) ? tier : "bronze"

  const created = await db.achievement.create({
    data: {
      code: normalizedCode,
      title: trimmedTitle,
      description: trimmedDesc,
      icon: trimmedIcon,
      color: normalizedColor,
      xp: Math.floor(numericXp),
      tier: normalizedTier,
    },
  })

  return NextResponse.json({ achievement: created }, { status: 201 })
})
