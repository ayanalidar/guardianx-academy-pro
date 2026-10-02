import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  ensureInternshipTables,
  seedSampleInternshipsIfEmpty,
} from "@/lib/internships-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * GET /api/internships - PUBLIC. Feeds the /internships page.
 * No auth, no private data (studentEmail is NEVER exposed).
 *
 * Returns:
 *   colleges[]  - grouped by collegeName: each with its published
 *                 internships + public intern counts
 *   interns[]   - showcased internship records (showPublicly only)
 *                 WITH their internship + college context
 *   stats       - honest server-derived counts
 *
 * Resilience (house pattern, matches /api/placements):
 *   - schema drift / cold table -> ensureInternshipTables()
 *     self-heals; if it still fails -> { degraded: true } + empty
 *     lists, never a 500.
 *   - first launch -> seeds clearly-marked sample rows so the
 *     page is never blank.
 *
 * Edge caching: 60s s-maxage + 5min stale-while-revalidate.
 * ============================================================ */
export async function GET(_req: NextRequest) {
  try {
    await ensureInternshipTables()
    const seeded = await seedSampleInternshipsIfEmpty()
    if (seeded > 0) {
      console.log(`[internships] first launch - seeded ${seeded} sample internships`)
    }

    const internships = await db.internship.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
      take: 300,
    })

    const records = await db.internshipRecord.findMany({
      where: { showPublicly: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 500,
    })

    // ---- group internships under their college ----
    const collegeMap = new Map<
      string,
      {
        name: string
        city: string | null
        logo: string | null
        internships: unknown[]
        internCount: number
        isSample: boolean
      }
    >()

    const internshipById = new Map(internships.map((i) => [i.id, i]))

    for (const i of internships) {
      const key = i.collegeName.trim().toLowerCase()
      if (!collegeMap.has(key)) {
        collegeMap.set(key, {
          name: i.collegeName,
          city: i.collegeCity,
          logo: i.collegeLogo,
          internships: [],
          internCount: 0,
          isSample: i.isSample,
        })
      }
      const college = collegeMap.get(key)!
      if (i.collegeCity && !college.city) college.city = i.collegeCity
      if (i.collegeLogo && !college.logo) college.logo = i.collegeLogo
      college.internships.push({
        id: i.id,
        title: i.title,
        company: i.company,
        domain: i.domain,
        mode: i.mode,
        durationWeeks: i.durationWeeks,
        stipend: i.stipend,
        seats: i.seats,
        status: i.status,
        startsAt: i.startsAt?.toISOString() ?? null,
        endsAt: i.endsAt?.toISOString() ?? null,
        description: i.description,
        skills: safeParseArray(i.skills),
        featured: i.featured,
        isSample: i.isSample,
        internCount: 0,
      })
    }

    // ---- showcased interns (with internship/college context) ----
    const interns = records
      .map((r) => {
        const i = internshipById.get(r.internshipId)
        if (!i) return null // internship unpublished/deleted -> hide record
        return {
          id: r.id,
          studentName: r.studentName,
          photoUrl: r.photoUrl,
          role: r.role,
          mentorName: r.mentorName,
          startDate: r.startDate?.toISOString() ?? null,
          endDate: r.endDate?.toISOString() ?? null,
          projects: safeParseArray(r.projects),
          skills: safeParseArray(r.skills),
          tools: safeParseArray(r.tools),
          testimonial: r.testimonial,
          grade: r.grade,
          status: r.status,
          certificateId: r.certificateId,
          certificateIssuedAt: r.certificateIssuedAt.toISOString(),
          isSample: r.isSample,
          internship: {
            id: i.id,
            title: i.title,
            company: i.company,
            domain: i.domain,
            mode: i.mode,
            durationWeeks: i.durationWeeks,
            collegeName: i.collegeName,
            collegeCity: i.collegeCity,
          },
        }
      })
      .filter(Boolean)

    // count interns per internship + per college (from PUBLIC records)
    const internsPerInternship = new Map<string, number>()
    for (const r of records) {
      internsPerInternship.set(r.internshipId, (internsPerInternship.get(r.internshipId) ?? 0) + 1)
    }
    for (const college of collegeMap.values()) {
      for (const i of college.internships as { id: string; internCount: number }[]) {
        i.internCount = internsPerInternship.get(i.id) ?? 0
        college.internCount += i.internCount
      }
    }

    // ---- honest, server-derived stats ----
    const domains = new Set(internships.map((i) => i.domain).filter(Boolean))
    const completedCerts = records.filter((r) => r.status === "completed").length

    return NextResponse.json(
      {
        colleges: Array.from(collegeMap.values()),
        interns,
        stats: {
          colleges: collegeMap.size,
          internships: internships.length,
          interns: interns.length,
          certificates: completedCerts,
          domains: domains.size,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("[internships] GET failed (degraded):", error)
    // House pattern: never 500 the public page - degrade gracefully.
    return NextResponse.json(
      { degraded: true, colleges: [], interns: [], stats: { colleges: 0, internships: 0, interns: 0, certificates: 0, domains: 0 } },
      { status: 200 }
    )
  }
}

function safeParseArray(json: string): unknown[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
