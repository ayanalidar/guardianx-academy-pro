import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  signParentToken,
  verifyParentToken,
  readParentToken,
} from "@/lib/parent-auth"

export const runtime = "nodejs"

/**
 * Parent/Guardian Portal — main endpoint.
 *
 * GET  — returns the parent's student overview (progress, attendance,
 *        courses, certificates, labs, XP/level, recent activity).
 *        Requires a valid `x-parent-token` header.
 *
 * POST — parent login: verify email + password against ParentAccount and
 *        return a signed token + parent profile. (No NextAuth dependency —
 *        parent accounts live in their own table.)
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// ---------------------------------------------------------------------------
// GET — student overview for the authenticated parent
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const token = readParentToken(req)
  const payload = verifyParentToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized — invalid or expired parent token" },
      { status: 401 }
    )
  }

  // Re-confirm the parent account still exists
  const parent = await db.parentAccount.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      relationship: true,
      studentId: true,
      createdAt: true,
    },
  })
  if (!parent) {
    return NextResponse.json(
      { error: "Parent account no longer exists" },
      { status: 404 }
    )
  }

  const student = await db.user.findUnique({
    where: { id: parent.studentId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      title: true,
      bio: true,
      xp: true,
      level: true,
      streak: true,
      lastActiveDate: true,
      createdAt: true,
    },
  })
  if (!student) {
    return NextResponse.json(
      { error: "Linked student account not found" },
      { status: 404 }
    )
  }

  // --- Enrollments (course progress) ---
  const enrollments = await db.enrollment.findMany({
    where: { userId: student.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          shortName: true,
          category: true,
          level: true,
          color: true,
          thumbnail: true,
          instructor: { select: { id: true, name: true, title: true, avatar: true } },
          modules: { select: { id: true, lessons: { select: { id: true } } } },
          _count: { select: { modules: true } },
        },
      },
    },
    orderBy: { lastAccessed: "desc" },
  })

  const courses = enrollments.map((e) => {
    const lessonProgress = e.course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0
    )
    return {
      enrollmentId: e.id,
      progress: e.progress,
      completed: e.completed,
      enrolledAt: e.enrolledAt,
      lastAccessed: e.lastAccessed,
      course: {
        id: e.course.id,
        title: e.course.title,
        shortName: e.course.shortName,
        category: e.course.category,
        level: e.course.level,
        color: e.course.color,
        thumbnail: e.course.thumbnail,
        instructor: e.course.instructor,
        moduleCount: e.course._count.modules,
      },
    }
  })

  // --- Certificates ---
  const certificates = await db.certificate.findMany({
    where: { userId: student.id },
    include: {
      course: { select: { id: true, title: true, shortName: true, color: true } },
      template: { select: { id: true, name: true, sealStyle: true } },
    },
    orderBy: { issuedAt: "desc" },
  })

  // --- Labs (progress + completion) ---
  const labProgress = await db.labProgress.findMany({
    where: { userId: student.id },
    include: {
      lab: {
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          difficulty: true,
          xpReward: true,
          color: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const labs = labProgress.map((lp) => ({
    id: lp.id,
    status: lp.status,
    flagFound: lp.flagFound,
    hintsUsed: lp.hintsUsed,
    timeSpentMs: lp.timeSpentMs,
    startedAt: lp.startedAt,
    completedAt: lp.completedAt,
    lab: lp.lab,
  }))

  // --- Attendance ---
  const attendanceRecords = await db.attendanceRecord.findMany({
    where: { userId: student.id },
    select: { status: true, date: true, sessionType: true, course: { select: { id: true, shortName: true } } },
    orderBy: { date: "desc" },
  })
  const present = attendanceRecords.filter((r) => r.status === "present").length
  const absent = attendanceRecords.filter((r) => r.status === "absent").length
  const late = attendanceRecords.filter((r) => r.status === "late").length
  const excused = attendanceRecords.filter((r) => r.status === "excused").length
  const total = attendanceRecords.length
  const rate = total ? Math.round(((present + late) / total) * 100) : 0
  const attendance = {
    total,
    present,
    absent,
    late,
    excused,
    rate,
    recent: attendanceRecords.slice(0, 10),
  }

  // --- Recent activity ---
  const activities = await db.userActivity.findMany({
    where: { userId: student.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      type: true,
      xp: true,
      meta: true,
      date: true,
      createdAt: true,
    },
  })

  // --- Aggregated stats ---
  const stats = {
    enrolledCourses: courses.length,
    completedCourses: courses.filter((c) => c.completed).length,
    avgProgress: courses.length
      ? Math.round(courses.reduce((a, c) => a + c.progress, 0) / courses.length)
      : 0,
    certificatesEarned: certificates.length,
    labsCompleted: labs.filter((l) => l.status === "completed").length,
    labsInProgress: labs.filter((l) => l.status === "in_progress").length,
    totalXp: student.xp,
    level: student.level,
    streak: student.streak,
    attendanceRate: rate,
  }

  return NextResponse.json({
    parent: {
      id: parent.id,
      email: parent.email,
      name: parent.name,
      phone: parent.phone,
      relationship: parent.relationship,
      createdAt: parent.createdAt,
    },
    student,
    stats,
    courses,
    certificates: certificates.map((c) => ({
      id: c.id,
      certificateId: c.certificateId,
      issuedAt: c.issuedAt,
      score: c.score,
      verificationHash: c.verificationHash,
      course: c.course,
      template: c.template,
    })),
    labs,
    attendance,
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      xp: a.xp,
      meta: a.meta,
      date: a.date,
      createdAt: a.createdAt,
    })),
  })
}

// ---------------------------------------------------------------------------
// POST — parent login
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    const { email, password } = parsed.data

    const parent = await db.parentAccount.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (!parent) {
      return NextResponse.json(
        { error: "No parent account found with that email" },
        { status: 404 }
      )
    }
    const ok = bcrypt.compareSync(password, parent.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    const token = signParentToken({
      id: parent.id,
      email: parent.email,
      studentId: parent.studentId,
    })

    return NextResponse.json({
      token,
      parent: {
        id: parent.id,
        email: parent.email,
        name: parent.name,
        phone: parent.phone,
        relationship: parent.relationship,
        studentId: parent.studentId,
      },
    })
  } catch (e) {
    console.error("[parent/login]", e)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
