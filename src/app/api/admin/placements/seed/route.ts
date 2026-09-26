import { NextResponse } from "next/server"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import {
  ensurePlacementTable,
  seedSamplePlacementsIfNoSamples,
} from "@/lib/placements-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * POST /api/admin/placements/seed - re-load the clearly-marked
 * sample placement rows (Admin → Hiring & Jobs → Placements).
 *
 * Only inserts when NO sample rows exist anymore - never
 * duplicates, never overwrites real records. Returns how many
 * rows were inserted so the UI can explain "nothing to load".
 * ============================================================ */
export const POST = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensurePlacementTable()
  const inserted = await seedSamplePlacementsIfNoSamples()

  await logAction(
    user.id ?? null,
    user.email ?? user.name ?? "admin",
    "placements.seed",
    "placement",
    null,
    { inserted },
  )

  return NextResponse.json({ ok: true, inserted })
})
