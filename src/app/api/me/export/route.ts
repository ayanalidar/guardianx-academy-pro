import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/me/export - DPDPA data portability (audit fix D-04).
 *
 * Returns the authenticated data principal's personal data as a
 * machine-readable JSON download covering: profile, enrollments, orders,
 * lesson progress, lab progress, certificates, notes, quiz attempts,
 * referrals and consent records. The privacy policy promises exportable
 * data - this endpoint implements that promise.
 *
 * Auth: session required. A user can only ever export their own data.
 * No pagination by design: the payload is scoped to one principal and is
 * capped per collection to keep response size bounded.
 */
const CAP = 500

export async function GET() {
  const viewer = await getCurrentUser()
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const uid = viewer.id

  const [user, enrollments, orders, lessonProgress, labProgress, certificates, notes, quizAttempts, referrals, consentRecords] =
    await Promise.all([
      db.user.findUnique({
        where: { id: uid },
        select: {
          id: true, email: true, name: true, role: true, avatar: true, bio: true,
          title: true, xp: true, level: true, streak: true, createdAt: true,
        },
      }),
      db.enrollment.findMany({
        where: { userId: uid },
        select: { id: true, courseId: true, completed: true, progress: true, enrolledAt: true },
        take: CAP,
        orderBy: { enrolledAt: "desc" },
      }),
      db.order.findMany({
        where: { userId: uid },
        select: {
          id: true, courseId: true, purpose: true, amount: true, finalAmount: true,
          currency: true, status: true, createdAt: true,
        },
        take: CAP,
        orderBy: { createdAt: "desc" },
      }),
      db.lessonProgress.findMany({
        where: { userId: uid },
        select: { id: true, lessonId: true, completed: true, updatedAt: true },
        take: CAP,
        orderBy: { updatedAt: "desc" },
      }),
      db.labProgress.findMany({
        where: { userId: uid },
        select: { id: true, labId: true, status: true, hintsUsed: true, completedAt: true },
        take: CAP,
        orderBy: { completedAt: "desc" },
      }),
      db.certificate.findMany({
        where: { userId: uid },
        select: { id: true, courseId: true, issuedAt: true },
        take: CAP,
        orderBy: { issuedAt: "desc" },
      }),
      db.note.findMany({
        where: { userId: uid },
        select: { id: true, lessonId: true, content: true, createdAt: true },
        take: CAP,
        orderBy: { createdAt: "desc" },
      }),
      db.quizAttempt.findMany({
        where: { userId: uid },
        select: { id: true, quizId: true, score: true, createdAt: true },
        take: CAP,
        orderBy: { createdAt: "desc" },
      }),
      db.referral.findMany({
        where: { referrerId: uid },
        select: { id: true, status: true, createdAt: true },
        take: CAP,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.findMany({
        where: { userId: uid, action: "dpdpa.consent.capture" },
        select: { id: true, action: true, details: true, createdAt: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    ])

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const payload = {
    exportMeta: {
      generatedAt: new Date().toISOString(),
      subject: user.email,
      legalBasis: "DPDPA 2023 - Right to access and portability of personal data",
      format: "application/json",
      caps: "each collection is capped at the most recent " + CAP + " records",
    },
    profile: user,
    enrollments,
    orders,
    lessonProgress,
    labProgress,
    certificates,
    notes,
    quizAttempts,
    referrals,
    consentRecords,
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="guardianx-data-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
