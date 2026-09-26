import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  ensurePlacementTable,
  seedSamplePlacementsIfEmpty,
  parseLpa,
} from "@/lib/placements-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * GET /api/placements - PUBLIC. Feeds the /placements page
 * (Hiring → Placements outcomes wall). No auth, no user data.
 *
 * Returns PUBLISHED placements ordered: featured first, then
 * manual order, newest year, newest created. Stats are derived
 * server-side (placed count, distinct partners/tracks, top &
 * average CTC in LPA - non-INR packages are excluded from the
 * average but shown verbatim on cards).
 *
 * Resilience (house pattern, matches /api/hiring/jobs):
 *   - schema drift / cold table → `{ degraded: true }` + empty
 *     list, never a 500.
 *   - first launch → ensurePlacementTable() self-heals the table
 *     and seeds clearly-marked sample rows so the wall is never
 *     blank.
 *
 * Edge caching: 60s s-maxage + 5min stale-while-revalidate.
 * ============================================================ */
export async function GET() {
  try {
    await ensurePlacementTable()
    const inserted = await seedSamplePlacementsIfEmpty()
    if (inserted > 0) {
      console.log(`[placements] first launch - seeded ${inserted} sample rows`)
    }

    const placements = await db.placement.findMany({
      where: { status: "published" },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { year: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        studentName: true,
        photoUrl: true,
        role: true,
        company: true,
        companyLogo: true,
        ctc: true,
        track: true,
        year: true,
        quote: true,
        story: true,
        linkedIn: true,
        featured: true,
        verified: true,
        isSample: true,
      },
    })

    // ---- derived stats ----
    const partners = new Set(placements.map((p) => p.company.toLowerCase()))
    const tracks = new Set(placements.map((p) => p.track).filter(Boolean))

    let top: { lpa: number; ctc: string } | null = null
    const lpaValues: number[] = []
    for (const p of placements) {
      const lpa = parseLpa(p.ctc)
      if (lpa == null) continue
      lpaValues.push(lpa)
      if (!top || lpa > top.lpa) top = { lpa, ctc: p.ctc! }
    }
    const avgCtc =
      lpaValues.length > 0
        ? `${(lpaValues.reduce((a, b) => a + b, 0) / lpaValues.length).toFixed(1)} LPA`
        : null

    return NextResponse.json(
      {
        placements,
        stats: {
          placed: placements.length,
          partners: partners.size,
          tracks: tracks.size,
          topCtc: top?.ctc ?? null,
          avgCtc,
        },
        count: placements.length,
        degraded: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("[placements] public GET failed:", error)
    return NextResponse.json({
      placements: [],
      stats: { placed: 0, partners: 0, tracks: 0, topCtc: null, avgCtc: null },
      count: 0,
      degraded: true,
    })
  }
}
