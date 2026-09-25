import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

/* ============================================================
 * Hiring admin API - manage the job openings shown on /hiring.
 *
 * GET  /api/admin/hiring/jobs  → ALL openings (draft/closed/active) + stats
 * POST /api/admin/hiring/jobs  → create a new opening (ADMIN only)
 *
 * Uses the existing `Job` model (shared with the student job board):
 *   status: "active" (live on /hiring) | "draft" (hidden) | "closed"
 * ============================================================ */

export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const [jobs, byStatus] = await Promise.all([
    db.job.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { _count: { select: { applications: true } } },
      take: 300,
    }),
    db.job.groupBy({ by: ["status"], _count: true }),
  ])

  const statusCounts: Record<string, number> = { active: 0, draft: 0, closed: 0 }
  for (const s of byStatus) statusCounts[s.status] = s._count

  // Distinct country-ish count for the "worldwide" stat (derived from location).
  const countries = new Set(
    jobs
      .map((j) => (j.location || "").split(",").pop()?.trim().toLowerCase() || "")
      .filter(Boolean)
  )

  return NextResponse.json({
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
      status: j.status,
      applicants: j._count.applications,
      createdAt: j.createdAt,
    })),
    count: jobs.length,
    byStatus: statusCounts,
    countries: countries.size,
  })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const title = String(body.title || "").trim()
  const company = String(body.company || "").trim()
  const location = String(body.location || "").trim()
  const description = String(body.description || "").trim()
  if (!title) return NextResponse.json({ error: "Job title is required" }, { status: 400 })
  if (!company) return NextResponse.json({ error: "Company is required" }, { status: 400 })
  if (!location) return NextResponse.json({ error: "Location is required (e.g. \"Dubai, UAE\" or \"Remote - Worldwide\")" }, { status: 400 })
  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 })

  const job = await db.job.create({
    data: {
      title,
      company,
      companyLogo: clean(body.companyLogo),
      location,
      remote: !!body.remote,
      type: normalizeType(body.type),
      salary: clean(body.salary) || "",
      description,
      requirements: clean(body.requirements) || "",
      requiredCerts: JSON.stringify(toStrArray(body.requiredCerts)),
      requiredSkills: JSON.stringify(toStrArray(body.requiredSkills)),
      status: body.status === "draft" || body.status === "closed" ? body.status : "active",
      postedById: user.id || (await anyStaffId()),
    },
  })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "hiring.job.create", "job", job.id, { title, company, status: job.status })

  return NextResponse.json({ ok: true, job: { id: job.id, title: job.title } }, { status: 201 })
})

// ── helpers ──
function clean(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s || null
}

function normalizeType(v: unknown): string {
  const s = String(v || "").toLowerCase().trim()
  return ["full-time", "part-time", "contract", "internship"].includes(s) ? s : "full-time"
}

function toStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean)
  return []
}

async function anyStaffId(): Promise<string> {
  const staff = await db.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true },
  })
  return staff?.id ?? (await db.user.findFirst({ select: { id: true } }))?.id ?? ""
}

function safeParseArray(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || "[]")
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
