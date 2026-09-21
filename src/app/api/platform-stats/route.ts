import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

/**
 * GET /api/platform-stats
 * Public - returns all visible platform stats.
 *
 * For entries with source = "calculated", the value is recomputed live from
 * the database so the homepage numbers always reflect reality:
 *   - learner_count  → db.user.count()
 *   - course_count   → db.course.count()
 *   - lab_count      → db.lab.count()
 *   - cert_count     → db.certificate.count()
 * Manual stats (source = "manual") are returned as stored.
 */
export async function GET() {
  try {
    const stats = await db.platformStat.findMany({
      where: { displayStatus: "visible" },
      orderBy: { updatedAt: "desc" },
    })

    // Compute live values for calculated stats
    const [learnerCount, courseCount, labCount, certCount] = await Promise.all([
      db.user.count(),
      db.course.count(),
      db.lab.count(),
      db.certificate.count(),
    ])

    const calcMap: Record<string, number> = {
      learner_count: learnerCount,
      course_count: courseCount,
      lab_count: labCount,
      cert_count: certCount,
    }

    const data = stats.map((s) => {
      const computed =
        s.source === "calculated" && s.key in calcMap
          ? String(calcMap[s.key])
          : s.value
      return {
        ...s,
        value: computed,
      }
    })

    return cachedJson({ stats: data, count: data.length }, { sMax: 120, swr: 600 })
  } catch (err) {
    console.error("[api/platform-stats] GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch platform stats" },
      { status: 500 }
    )
  }
}
