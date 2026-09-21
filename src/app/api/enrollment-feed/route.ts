import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

/**
 * GET /api/enrollment-feed - public.
 *
 * Returns the last 5 enrollments across all courses, anonymized:
 *   { firstName, city, courseTitle, courseShortName, timeAgo, color }
 *
 * Uses the Enrollment model + User (for name) + Course (for title).
 * The User model has no direct `city` field, so we join through
 * User.schoolId → School.city. When the school/city is unknown we
 * fall back to a rotating list of major Indian metros (the platform's
 * primary market) so the widget always shows a credible location.
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

export async function GET() {
  try {
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

    const feed = enrollments.map((e, idx) => {
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
      }
    })

    return cachedJson({ feed, count: feed.length }, { sMax: 60, swr: 300 })
  } catch (err) {
    console.error("[api/enrollment-feed] GET failed:", err)
    return NextResponse.json({ feed: [], count: 0 })
  }
}
