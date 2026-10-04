import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"
import { ensureInternshipTables } from "@/lib/internships-bootstrap"
import { generateCredentialId, generateVerificationHash } from "@/lib/credentials"
import { projectsJson } from "@/lib/internship-projects"

export const runtime = "nodejs"

/* ============================================================
 * Internship RECORDS admin API - the student showcase rows.
 *
 * GET  /api/admin/internships/records -> ALL records (with
 *      internship + college context) for the admin manager.
 * POST /api/admin/internships/records -> add a student to an
 *      internship. A certificate (certificateId + tamper-evident
 *      hash) is issued IMMEDIATELY on creation - the record can
 *      only become public (showPublicly) once it has one.
 *
 *      "Add students directly": pass EITHER internshipId OR a
 *      newInternship { collegeName, title, ... } object - when the
 *      platform has no internship yet (fresh start) the admin can
 *      create it inline in the same request instead of hitting a
 *      dead-ended form.
 *
 * showPublicly is the DPDPA-style consent gate: only showcased
 * records ever appear on the public page or as downloadable
 * certificates. Every mutation is audit-logged.
 * ============================================================ */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  await ensureInternshipTables()

  const [records, internships] = await Promise.all([
    db.internshipRecord.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 1000,
    }),
    db.internship.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 500,
      select: {
        id: true,
        title: true,
        collegeName: true,
        collegeCity: true,
        domain: true,
        mode: true,
        durationWeeks: true,
        status: true,
        company: true,
      },
    }),
  ])

  return NextResponse.json({
    records,
    internships,
    count: records.length,
    samples: records.filter((r) => r.isSample).length,
  })
})

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s.length > 0 ? s : null
}

// String-array fields only (skills, tools) - projects must use projectsJson()
// from @/lib/internship-projects, which preserves { title, description } objects.
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

  let internshipId = typeof b.internshipId === "string" ? b.internshipId.trim() : ""
  const studentName = typeof b.studentName === "string" ? b.studentName.trim().slice(0, 120) : ""
  const role = typeof b.role === "string" ? b.role.trim().slice(0, 160) : ""

  if (studentName.length < 2 || !role) {
    return NextResponse.json({ error: "studentName and role are required." }, { status: 400 })
  }

  // Inline internship creation - the "add students directly" path. When the
  // admin has no internship yet (fresh platform), they should not need a
  // second round trip: create the internship from newInternship{} right here.
  let createdInternshipTitle: string | null = null
  if (!internshipId && b.newInternship && typeof b.newInternship === "object") {
    const n = b.newInternship as Record<string, unknown>
    const strField = (v: unknown, max: number): string | null => {
      const s = typeof v === "string" ? v.trim().slice(0, max) : ""
      return s.length > 0 ? s : null
    }
    const collegeName = strField(n.collegeName, 160)
    const title = strField(n.title, 200)
    if (!collegeName || !title) {
      return NextResponse.json(
        { error: "New internship needs collegeName and title." },
        { status: 400 }
      )
    }
    const created = await db.internship.create({
      data: {
        collegeName,
        collegeCity: strField(n.collegeCity, 80),
        title,
        company: strField(n.company, 160) ?? "GuardianX Academy",
        domain: strField(n.domain, 80) ?? "Cyber Security",
        mode: ["remote", "onsite", "hybrid"].includes(String(n.mode)) ? String(n.mode) : "remote",
        durationWeeks: Math.max(1, Math.min(52, Number(n.durationWeeks) || 8)),
        seats: Math.max(1, Math.min(500, Number(n.seats) || 10)),
        status: ["upcoming", "ongoing", "completed"].includes(String(n.status)) ? String(n.status) : "completed",
        description: strField(n.description, 2000),
        featured: false,
        published: true,
        isSample: false,
        order: 0,
      },
      select: { id: true, title: true },
    })
    internshipId = created.id
    createdInternshipTitle = created.title
    await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.create", "internship", created.id, {
      collegeName,
      title,
      createdInlineWithStudent: true,
    })
  }

  if (!internshipId) {
    return NextResponse.json(
      { error: "internshipId or newInternship is required." },
      { status: 400 }
    )
  }

  const internship = await db.internship.findUnique({
    where: { id: internshipId },
    select: { id: true, title: true },
  })
  if (!internship) {
    return NextResponse.json({ error: "Internship not found." }, { status: 404 })
  }

  const startDate = typeof b.startDate === "string" && b.startDate ? new Date(b.startDate) : null
  const endDate = typeof b.endDate === "string" && b.endDate ? new Date(b.endDate) : null

  // Certificate is issued at creation time (never null afterwards).
  const certificateId = generateCredentialId("GXI")
  const certificateIssuedAt = new Date()

  const record = await db.internshipRecord.create({
    data: {
      internshipId,
      studentId: strOrNull(b.studentId),
      studentName,
      photoUrl: strOrNull(b.photoUrl),
      studentEmail: strOrNull(b.studentEmail),
      role,
      mentorName: strOrNull(b.mentorName),
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
      // Structured { title, description } entries - NEVER String()-flattened
      // (the old generic jsonArr() turned objects into "[object Object]").
      projects: projectsJson(b.projects),
      skills: jsonArr(b.skills) ?? "[]",
      tools: jsonArr(b.tools) ?? "[]",
      testimonial: strOrNull(b.testimonial),
      grade: strOrNull(b.grade),
      status: ["ongoing", "completed"].includes(String(b.status)) ? String(b.status) : "completed",
      certificateId,
      // placeholder replaced by the real hash right after create
      verificationHash: "pending",
      certificateIssuedAt,
      // consent gate stays false unless explicitly granted in this request
      showPublicly: b.showPublicly === true,
      isSample: false,
      sortOrder: Math.max(0, Math.min(9999, Number(b.sortOrder) || 0)),
    },
  })

  // Hash binds the certificate to the REAL record id - compute after create.
  const verificationHash = await generateVerificationHash(
    certificateId,
    record.id,
    internshipId,
    certificateIssuedAt
  )
  await db.internshipRecord.update({ where: { id: record.id }, data: { verificationHash } })

  await logAction(user.id ?? null, user.email ?? user.name ?? "admin", "internship.record.create", "internshipRecord", record.id, {
    studentName,
    role,
    internshipTitle: createdInternshipTitle ?? internship.title,
    internshipCreatedInline: !!createdInternshipTitle,
    certificateId,
    showPublicly: b.showPublicly === true,
  })

  return NextResponse.json({ record: { ...record, verificationHash } }, { status: 201 })
})
