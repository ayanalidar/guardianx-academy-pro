import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/**
 * GET /api/admin/notifications — real platform event feed for admins.
 *
 * Replaces the hardcoded mock array in admin-notifications.tsx. Aggregates
 * the latest real events from across the platform into one feed:
 *   - enrollments (Enrollment.createdAt)
 *   - certificates issued (Certificate.issuedAt)
 *   - lab completions (LabProgress.completedAt)
 *   - new registrations (User.createdAt)
 *   - exam submissions (ExamAttempt.submittedAt)
 *   - new leads (Lead.createdAt)
 *
 * Query: ?limit=50
 */

export const GET = withErrorHandler(async (req: Request) => {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // last 30 days

  const [
    enrollments,
    certificates,
    labCompletions,
    registrations,
    examSubmissions,
    leads,
  ] = await Promise.all([
    db.enrollment.findMany({
      where: { enrolledAt: { gte: since } },
      orderBy: { enrolledAt: "desc" }, take: limit,
      select: { id: true, enrolledAt: true, user: { select: { name: true } }, course: { select: { title: true, shortName: true } } },
    }),
    db.certificate.findMany({
      where: { issuedAt: { gte: since } },
      orderBy: { issuedAt: "desc" }, take: limit,
      select: { id: true, certificateId: true, issuedAt: true, user: { select: { name: true, email: true } }, course: { select: { shortName: true } } },
    }),
    db.labProgress.findMany({
      where: { status: "completed", completedAt: { gte: since } },
      orderBy: { completedAt: "desc" }, take: limit,
      select: { id: true, completedAt: true, user: { select: { name: true } }, lab: { select: { title: true } } },
    }),
    db.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" }, take: limit,
      select: { id: true, createdAt: true, name: true, email: true, role: true },
    }),
    db.examAttempt.findMany({
      where: { submittedAt: { gte: since }, status: { not: "in_progress" } },
      orderBy: { submittedAt: "desc" }, take: limit,
      select: { id: true, submittedAt: true, score: true, status: true, userId: true, examId: true },
    }),
    db.lead.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" }, take: limit,
      select: { id: true, createdAt: true, name: true, email: true, type: true },
    }),
  ])

  // Resolve exam titles + user names (ExamAttempt stores only ids)
  const examIds = Array.from(new Set(examSubmissions.map((x) => x.examId)))
  const userIds = Array.from(new Set(examSubmissions.map((x) => x.userId)))
  const [examRows, examUsers] = await Promise.all([
    db.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, title: true } }),
    userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : Promise.resolve([] as Array<{ id: string; name: string }>),
  ])
  const examTitle = new Map(examRows.map((e) => [e.id, e.title]))
  const userName = new Map(examUsers.map((u) => [u.id, u.name]))

  type FeedItem = {
    id: string
    type: "enrollment" | "certificate" | "lab" | "registration" | "exam" | "contact"
    title: string
    message: string
    createdAt: string
    read: boolean
  }

  const feed: FeedItem[] = [
    ...enrollments.map((e) => ({
      id: `enr-${e.id}`, type: "enrollment" as const, title: "New Enrollment",
      message: `${e.user?.name || "A student"} enrolled in ${e.course?.shortName || e.course?.title || "a course"}`,
      createdAt: e.enrolledAt.toISOString(), read: false,
    })),
    ...certificates.map((c) => ({
      id: `cert-${c.id}`, type: "certificate" as const, title: "Certificate Issued",
      message: `${c.certificateId} issued to ${c.user?.email || c.user?.name || "a student"}`,
      createdAt: c.issuedAt.toISOString(), read: false,
    })),
    ...labCompletions.map((l) => ({
      id: `lab-${l.id}`, type: "lab" as const, title: "Lab Completed",
      message: `${l.lab?.title || "A lab"} completed by ${l.user?.name || "a student"}`,
      createdAt: (l.completedAt || new Date()).toISOString(), read: false,
    })),
    ...registrations.map((u) => ({
      id: `reg-${u.id}`, type: "registration" as const, title: "New Registration",
      message: `New ${u.role.toLowerCase()} registered: ${u.email}`,
      createdAt: u.createdAt.toISOString(), read: false,
    })),
    ...examSubmissions.map((x) => ({
      id: `exam-${x.id}`, type: "exam" as const, title: "Exam Submitted",
      message: `${examTitle.get(x.examId) || "An exam"} submitted by ${userName.get(x.userId) || "a student"} — Score: ${Math.round(x.score || 0)}% (${x.status === "passed" ? "PASSED" : x.status === "failed" ? "FAILED" : x.status.toUpperCase()})`,
      createdAt: (x.submittedAt || new Date()).toISOString(), read: false,
    })),
    ...leads.map((l) => ({
      id: `lead-${l.id}`, type: "contact" as const, title: "New Lead",
      message: `${l.type || "Inquiry"}: ${l.name}${l.email ? ` (${l.email})` : ""}`,
      createdAt: l.createdAt.toISOString(), read: false,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  return NextResponse.json({ notifications: feed, unreadCount: feed.filter((f) => !f.read).length })
})
