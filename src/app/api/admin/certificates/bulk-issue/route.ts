import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody } from "@/lib/session"
import { generateVerificationHash } from "@/lib/credentials"
import { notifyCertificate } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"

export const runtime = "nodejs"

/**
 * Bulk certificate issuance - the real backend for Admin → Bulk Certificates.
 *
 * GET  /api/admin/certificates/bulk-issue
 *        → per-course summary of completed enrollments vs issued certificates,
 *          so the view can show eligible students per course. (No mock data.)
 *
 * POST /api/admin/certificates/bulk-issue  { courseId }
 *        → issues a verified Certificate for EVERY completed enrollment in the
 *          course that doesn't already have one. Generates the same GX-… ids
 *          and HMAC verification hash as auto-issuance, applies the default
 *          template, notifies in-app and emails each student.
 *
 * Auth: ADMIN (+ SUPER_ADMIN) via requireAdmin().
 */

function newCertificateId(): string {
  return `GX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const [enrollments, certs, courses] = await Promise.all([
    db.enrollment.findMany({
      where: { completed: true },
      select: { courseId: true, userId: true },
    }),
    db.certificate.findMany({ select: { userId: true, courseId: true } }),
    db.course.findMany({
      select: { id: true, title: true, shortName: true, certBody: true },
    }),
  ])

  const certKeys = new Set(certs.map((c) => `${c.userId}|${c.courseId}`))

  // courseId → { users:Set, eligible:Set }
  const byCourse = new Map<string, { users: Set<string>; eligible: Set<string> }>()
  for (const e of enrollments) {
    let entry = byCourse.get(e.courseId)
    if (!entry) {
      entry = { users: new Set(), eligible: new Set() }
      byCourse.set(e.courseId, entry)
    }
    entry.users.add(e.userId)
    if (!certKeys.has(`${e.userId}|${e.courseId}`)) entry.eligible.add(e.userId)
  }

  const summary = courses
    .filter((c) => byCourse.has(c.id))
    .map((c) => {
      const entry = byCourse.get(c.id)!
      return {
        courseId: c.id,
        title: c.title,
        shortName: c.shortName,
        certBody: c.certBody,
        completed: entry.users.size,
        eligible: entry.eligible.size,
        alreadyIssued: entry.users.size - entry.eligible.size,
      }
    })
    .sort((a, b) => b.eligible - a.eligible)

  return NextResponse.json({ courses: summary })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { data: body, error: bodyError } = await readJsonBody<{ courseId?: string }>(req, { maxBytes: 8 * 1024 })
  if (bodyError) return bodyError
  const courseId = body?.courseId?.trim()
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, shortName: true },
  })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  // Completed enrollments without an existing certificate for this course
  const [enrollments, existingCerts] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId, completed: true },
      select: { userId: true },
    }),
    db.certificate.findMany({
      where: { courseId },
      select: { userId: true },
    }),
  ])
  const already = new Set(existingCerts.map((c) => c.userId))
  const eligibleUserIds = [...new Set(enrollments.map((e) => e.userId))].filter((id) => !already.has(id))

  if (eligibleUserIds.length === 0) {
    return NextResponse.json({
      issued: [],
      skipped: already.size,
      message: "Every completed student in this course already has a certificate.",
    })
  }

  const users = await db.user.findMany({
    where: { id: { in: eligibleUserIds } },
    select: { id: true, name: true, email: true },
  })
  const defaultTemplate = await db.certificateTemplate.findFirst({ where: { isDefault: true } })

  const issued: { userId: string; student: string; email: string; certificateId: string }[] = []

  for (const u of users) {
    const certificateId = newCertificateId()
    const issuedAt = new Date()
    const verificationHash = await generateVerificationHash(certificateId, u.id, courseId, issuedAt)
    await db.certificate.create({
      data: {
        userId: u.id,
        courseId,
        certificateId,
        score: 100,
        issuedAt,
        verificationHash,
        templateId: defaultTemplate?.id ?? null,
      },
    })
    // In-app notification + branded email with the credential ID
    try {
      await notifyCertificate(u.id, course.title, courseId)
    } catch {
      // never fail issuance because a notification channel hiccuped
    }
    try {
      if (u.email) {
        await sendEmail({
          to: u.email,
          subject: `Certificate Earned - ${course.title}`,
          body: `Hi ${u.name ?? "there"},\n\nCongratulations! You've completed "${course.title}" on GuardianX Academy.\n\nYour certificate ID is: ${certificateId}\n\nVerify it anytime at academy.guardianx.cloud using this ID.\n\nKeep learning,\nThe GuardianX Team`,
        })
      }
    } catch {
      // SMTP misconfiguration must not block issuance - logged by sendEmail
    }
    issued.push({ userId: u.id, student: u.name ?? u.email ?? u.id, email: u.email ?? "", certificateId })
  }

  return NextResponse.json({
    issued,
    skipped: already.size,
    course: { id: course.id, title: course.title, shortName: course.shortName },
  })
})
