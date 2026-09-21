import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/* GET /api/hiring/jobs — PUBLIC. Feeds the /hiring page.
 *
 * Returns ACTIVE job openings (the Hiring tab's "openings around the
 * world"). No auth, no user-specific data. Client-side filtering is done
 * by the page (search / type / remote / country), so we return the full
 * active set (capped at 200) in one payload.
 *
 * Resilience: if the jobs table is momentarily unavailable (e.g. schema
 * drift), we return an empty list with `degraded: true` instead of a 500,
 * so the public page renders its empty state instead of crashing.
 *
 * Edge caching: 60s s-maxage + 5min stale-while-revalidate (matches the
 * platform's public GET caching policy).
 */
export async function GET(_req: NextRequest) {
  try {
    const jobs = await db.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        company: true,
        companyLogo: true,
        location: true,
        remote: true,
        type: true,
        salary: true,
        description: true,
        requirements: true,
        requiredCerts: true,
        requiredSkills: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    })

    const body = {
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        companyLogo: j.companyLogo,
        location: j.location,
        remote: j.remote,
        type: j.type,
        salary: j.salary,
        description: j.description,
        requirements: j.requirements,
        requiredCerts: safeParseArray(j.requiredCerts),
        requiredSkills: safeParseArray(j.requiredSkills),
        createdAt: j.createdAt,
        applicants: j._count.applications,
      })),
      count: jobs.length,
      degraded: false,
    }

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (err: any) {
    console.error("[hiring/jobs] GET error:", err?.message)
    return NextResponse.json(
      { jobs: [], count: 0, degraded: true },
      { headers: { "Cache-Control": "public, max-age=10, s-maxage=20" } }
    )
  }
}

function safeParseArray(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || "[]")
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
