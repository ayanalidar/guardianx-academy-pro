import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: id } },
  })
  if (existing) return NextResponse.json({ enrollment: existing })

  // Course Prerequisites: verify the student has completed all prerequisite courses
  const prereqIds = course.prerequisiteIds
    ? course.prerequisiteIds.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  if (prereqIds.length > 0) {
    const completedPrereqs = await db.enrollment.findMany({
      where: {
        userId: user.id,
        courseId: { in: prereqIds },
        completed: true,
      },
      select: { courseId: true },
    })
    const completedIds = new Set(completedPrereqs.map((e) => e.courseId))
    const missing = prereqIds.filter((pid) => !completedIds.has(pid))
    if (missing.length > 0) {
      const missingCourses = await db.course.findMany({
        where: { id: { in: missing } },
        select: { title: true, shortName: true },
      })
      return NextResponse.json(
        {
          error: "Prerequisites not met",
          prerequisites: missingCourses,
          message: `Complete these prerequisite courses first: ${missingCourses.map((c) => c.title).join(", ")}`,
        },
        { status: 403 }
      )
    }
  }

  // SECURITY: paid courses require a paid order. Without this check any
  // student could bypass /api/payment/* entirely and enroll for free.
  if (course.price > 0) {
    const paidOrder = await db.order.findFirst({
      where: { userId: user.id, courseId: id, status: "paid" },
      select: { id: true },
    })
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN"
    if (!paidOrder && !isAdmin) {
      return NextResponse.json(
        {
          error: "Payment required",
          message: `This is a paid course (₹${course.price}). Complete checkout before enrolling.`,
          checkoutRequired: true,
        },
        { status: 402 } // Payment Required
      )
    }
  }

  const enrollment = await db.enrollment.create({
    data: { userId: user.id, courseId: id, lastAccessed: new Date() },
  })
  await db.course.update({
    where: { id },
    data: { studentsCount: { increment: 1 } },
  })
  const { awardXp, awardSpecificAchievement } = await import("@/lib/gamification")
  await awardXp(user.id, "course_enrolled", 25, id)
  // Spec-mandated: award FIRST_STEP on the user's first course enrollment.
  // The auto-checkAchievements flow inside awardXp also catches this,
  // but the explicit call makes the award path self-documenting.
  try {
    await awardSpecificAchievement(user.id, "FIRST_STEP")
  } catch (e) {
    console.error("[enroll] FIRST_STEP award failed:", e)
  }

  // Welcome email on enrollment
  const { sendEmail } = await import("@/lib/email")
  const enrollUser = await db.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } })
  if (enrollUser) {
    await sendEmail({
      to: enrollUser.email,
      subject: `📚 Enrolled — ${course.title}`,
      body: `Hi ${enrollUser.name},\n\nYou've successfully enrolled in "${course.title}" on GuardianX Academy.\n\nDive in and start learning. Your journey to becoming a cyber guardian starts now!\n\nThe GuardianX Team`,
      type: "notification",
      userId: user.id,
    })
  }
  return NextResponse.json({ enrollment })
}

// GET endpoint to fetch prerequisites for a course (for UI display)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const course = await db.course.findUnique({ where: { id }, select: { prerequisiteIds: true } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  const prereqIds = course.prerequisiteIds
    ? course.prerequisiteIds.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  if (prereqIds.length === 0) return NextResponse.json({ prerequisites: [] })
  const prerequisites = await db.course.findMany({
    where: { id: { in: prereqIds } },
    select: { id: true, title: true, shortName: true, level: true, thumbnail: true },
  })
  return NextResponse.json({ prerequisites })
}
