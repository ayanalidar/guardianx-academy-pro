import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureInternshipTables } from "@/lib/internships-bootstrap"

export const runtime = "nodejs"

/* ============================================================
 * Internships admin API - manages the public /internships page.
 *
 * GET  /api/admin/internships -> ALL internships (draft+published)
 *                                + colleges + record counts
 * POST /api/admin/internships -> create an internship (ADMIN only)
 *
 * published: false = hidden from the public page (draft).
 * Every mutation is audit-logged.
 * ============================================================ */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()

  const [internships, records] = await Promise.all([
    db.internship.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
    db.internshipRecord.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 1000,
      select: { id: true, internshipId: true, studentName: true, showPublicly: true, isSample: true },
    }),
  ])

  const countsByInternship = new Map<string, number>()
  for (const r of records) {
    countsByInternship.set(r.internshipId, (countsByInternship.get(r.internshipId) ?? 0) + 1)
  }

  return NextResponse.json({
    internships: internships.map((i) => ({
      ...i,
      recordCount: countsByInternship.get(i.id) ?? 0,
    })),
    count: internships.length,
    samples: internships.filter((i) => i.isSample).length,
  })
})

function str(v: unknown, max = 300): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  return t ? t.slice(0, max) : undefined
}

function jsonArr(v: unknown): string | undefined {
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => String(x).slice(0, 300)).slice(0, 25))
  if (typeof v === "string") return JSON.stringify(v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25))
  return undefined
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const collegeName = str(b.collegeName, 160)
  const title = str(b.title, 200)
  if (!collegeName || !title) {
    return NextResponse.json({ error: "collegeName and title are required." }, { status: 400 })
  }

  const domain = str(b.domain, 80) ?? "Cyber Security"
  const mode = ["remote", "onsite", "hybrid"].includes(String(b.mode)) ? String(b.mode) : "remote"
  const status = ["upcoming", "ongoing", "completed"].includes(String(b.status)) ? String(b.status) : "upcoming"
  const durationWeeks = Math.max(1, Math.min(52, Number(b.durationWeeks) || 8))
  const seats = Math.max(1, Math.min(500, Number(b.seats) || 10))
  const startsAt = typeof b.startsAt === "string" && b.startsAt ? new Date(b.startsAt) : null
  const endsAt = typeof b.endsAt === "string" && b.endsAt ? new Date(b.endsAt) : null

  const internship = await db.internship.create({
    data: {
      collegeId: str(b.collegeId, 64) ?? null,
      collegeName,
      collegeCity: str(b.collegeCity, 80) ?? null,
      collegeLogo: str(b.collegeLogo, 500) ?? null,
      title,
      company: str(b.company, 160) ?? "GuardianX Academy",
      domain,
      mode,
      durationWeeks,
      stipend: str(b.stipend, 120) ?? null,
      seats,
      status,
      startsAt: startsAt && !isNaN(startsAt.getTime()) ? startsAt : null,
      endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : null,
      description: str(b.description, 4000) ?? null,
      skills: jsonArr(b.skills) ?? "[]",
      featured: b.featured === true,
      published: b.published !== false,
      isSample: false,
      order: Math.max(0, Math.min(9999, Number(b.order) || 0)),
    },
  })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.create", "internship", internship.id, {
    title: internship.title,
    collegeName: internship.collegeName,
  })

  return NextResponse.json({ internship }, { status: 201 })
})
