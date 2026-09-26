import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"
import { ensureLiveFeedTable, seedLiveFeedEntriesIfEmpty } from "@/lib/live-feed-bootstrap"

export const runtime = "nodejs"

/**
 * GET /api/enrollment-feed - public.
 *
 * Returns platform-wide enrollment social proof for the homepage Live Feed:
 *   feed:    admin-curated entries (LiveFeedEntry, active only, ordered)
 *            FIRST - managed from Admin → Platform Stats → Live Feed -
 *            then real recent enrollments across all courses to fill the
 *            widget. Items: { firstName, city, courseTitle,
 *            courseShortName, timeAgo, color, isSample }
 *   total:   lifetime enrollment count - overridable via the PlatformStat
 *            key "enrolled_total" (manual value), else computed
 *   thisWeek:enrollments in the last 7 days - overridable via the
 *            PlatformStat key "enrolled_this_week", else computed
 *   daily30: 30-day daily enrollment series (oldest -> newest) for the
 *            velocity sparkline
 *
 * Enrollment items join User + Course; city resolves via
 * User.schoolId → School.city, falling back to major Indian metros so the
 * widget always shows a credible location.
 */

const FALLBACK_CITIES = [
  "Srinagar", "Baramulla", "Noida", "Delhi", "Mumbai",
  "Hyderabad", "Pune", "Jaipur", "Kochi", "Chandigarh",
]

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "just now"
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return "just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return `${Math.floor(diffSec / 604800)}w ago`
}

function firstName(full: string): string {
  const trimmed = (full || "").trim()
  if (!trimmed) return "A learner"
  return trimmed.split(/\s+/)[0]
}

/** Optional manual overrides for the two count tiles. Reads the
 *  PlatformStat keys "enrolled_total" / "enrolled_this_week"; a missing
 *  or non-numeric value falls back to the computed count. */
async function tileOverrides(): Promise<{ total?: number; thisWeek?: number }> {
  try {
    const rows = await db.platformStat.findMany({
      where: { key: { in: ["enrolled_total", "enrolled_this_week"] } },
      select: { key: true, value: true },
    })
    const out: { total?: number; thisWeek?: number } = {}
    for (const r of rows) {
      const n = parseFloat(String(r.value).replace(/[^0-9.]/g, ""))
      if (!Number.isFinite(n) || n < 0) continue
      if (r.key === "enrolled_total") out.total = Math.round(n)
      if (r.key === "enrolled_this_week") out.thisWeek = Math.round(n)
    }
    return out
  } catch {
    return {}
  }
}

export async function GET() {
  try {
    // Curated entries: self-heal the table on first hit, seed clearly-marked
    // samples when empty. Never let bootstrap failures break the endpoint.
    let curated: Array<{
      id: string
      firstName: string
      city: string
      courseTitle: string
      courseShortName: string
      color: string
      timeAgo: string
      enrolledAt: string
      isSample: boolean
    }> = []
    try {
      if (await ensureLiveFeedTable()) {
        await seedLiveFeedEntriesIfEmpty()
        const rows = await db.liveFeedEntry.findMany({
          where: { active: true },
          orderBy: [{ order: "asc" }, { occurredAt: "desc" }],
          take: 8,
        })
        curated = rows.map((e) => ({
          id: e.id,
          firstName: e.displayName,
          city: e.city ?? "",
          courseTitle: e.courseTitle,
          courseShortName: e.courseShortName ?? "",
          color: e.color,
          timeAgo: timeAgo(e.occurredAt.toISOString()),
          enrolledAt: e.occurredAt.toISOString(),
          isSample: e.isSample,
        }))
      }
    } catch (err) {
      console.error("[api/enrollment-feed] curated entries unavailable:", err)
    }

    const enrollments = await db.enrollment.findMany({
      orderBy: { enrolledAt: "desc" },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            schoolId: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            shortName: true,
            color: true,
          },
        },
      },
    })

    // Look up city for each enrollment's user via the schoolId → School join.
    // The User model has no direct `school` relation (it goes through the
    // SchoolMember join table), so we resolve it manually here.
    const schoolIds = Array.from(
      new Set(enrollments.map((e) => e.user?.schoolId).filter(Boolean) as string[]),
    )
    const schools = schoolIds.length > 0
      ? await db.school.findMany({
          where: { id: { in: schoolIds } },
          select: { id: true, city: true },
        })
      : []
    const schoolCityMap = new Map(schools.map((s) => [s.id, s.city]))

    const realFeed = enrollments.map((e, idx) => {
      const city = (e.user?.schoolId && schoolCityMap.get(e.user.schoolId)?.trim()) || undefined
      const fallbackCity = FALLBACK_CITIES[idx % FALLBACK_CITIES.length]!
      return {
        id: e.id,
        firstName: firstName(e.user?.name ?? ""),
        city: city || fallbackCity,
        courseTitle: e.course?.title ?? "a course",
        courseShortName: e.course?.shortName ?? "",
        color: e.course?.color ?? "emerald",
        timeAgo: timeAgo(e.enrolledAt.toISOString()),
        enrolledAt: e.enrolledAt.toISOString(),
        isSample: false,
      }
    })

    // Curated entries lead the widget; real enrollments fill the rest.
    const feed = [...curated, ...realFeed].slice(0, 8)

    // Platform-wide counters + 30-day velocity series. createdAt-only selects
    // keep these queries cheap; bucketing is done in JS to avoid DB-specific
    // date_trunc differences between Neon/pooled setups.
    const overrides = await tileOverrides()
    const total = overrides.total ?? (await db.enrollment.count({}))
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek =
      overrides.thisWeek ??
      (await db.enrollment.count({
        where: { enrolledAt: { gte: weekAgo } },
      }))

    let daily30: number[] = []
    try {
      const since30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      since30.setHours(0, 0, 0, 0)
      const rows30 = await db.enrollment.findMany({
        where: { enrolledAt: { gte: since30 } },
        select: { enrolledAt: true },
      })
      const buckets = new Map<string, number>()
      for (const r of rows30) {
        const d = new Date(r.enrolledAt)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        buckets.set(key, (buckets.get(key) ?? 0) + 1)
      }
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        daily30.push(buckets.get(key) ?? 0)
      }
    } catch {
      daily30 = []
    }

    return cachedJson({ feed, count: feed.length, total, thisWeek, daily30 }, { sMax: 60, swr: 300 })
  } catch (err) {
    console.error("[api/enrollment-feed] GET failed:", err)
    return NextResponse.json({ feed: [], count: 0, total: 0, thisWeek: 0, daily30: [] })
  }
}
