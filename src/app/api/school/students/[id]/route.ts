import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

/** Guard helper for school-admin access. */
async function schoolAdminGuard() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (user.role !== "SCHOOL_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden - SCHOOL_ADMIN only" }, { status: 403 }) }
  }
  if (!user.schoolId) {
    return { error: NextResponse.json({ error: "No school linked to this account" }, { status: 403 }) }
  }
  return { user, schoolId: user.schoolId }
}

/** Verify the student is a member of the current admin's school. Returns the member + user or error. */
async function getStudentInSchool(userId: string, schoolId: string) {
  const member = await db.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          title: true,
          xp: true,
          level: true,
          streak: true,
          bio: true,
          createdAt: true,
        },
      },
    },
  })
  if (!member) return { error: NextResponse.json({ error: "Student not found in this school" }, { status: 404 }) }
  return { member }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getStudentInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error
  const { member } = ctx

  // Batches within this school the student is a member of
  const batchMembers = await db.batchMember.findMany({
    where: { userId: id, batch: { schoolId } },
    include: { batch: { select: { id: true, name: true, status: true, startDate: true, endDate: true, courseIds: true } } },
  })

  // Enrollments
  const enrollments = await db.enrollment.findMany({
    where: { userId: id },
    include: { course: { select: { id: true, title: true, shortName: true, color: true, thumbnail: true } } },
  })

  // Attendance summary
  const attendanceRecords = await db.attendanceRecord.findMany({
    where: { userId: id },
    select: { status: true, date: true },
  })
  const present = attendanceRecords.filter((r) => r.status === "present").length
  const absent = attendanceRecords.filter((r) => r.status === "absent").length
  const late = attendanceRecords.filter((r) => r.status === "late").length
  const excused = attendanceRecords.filter((r) => r.status === "excused").length
  const total = attendanceRecords.length
  const rate = total ? Math.round(((present + late) / total) * 100) : 0

  // Certificates
  const certificateCount = await db.certificate.count({ where: { userId: id } })

  return NextResponse.json({
    student: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
      title: member.user.title,
      bio: member.user.bio,
      xp: member.user.xp,
      level: member.user.level,
      streak: member.user.streak,
      createdAt: member.user.createdAt,
      joinedAt: member.joinedAt,
      role: member.role,
    },
    batches: batchMembers.map((bm) => ({
      id: bm.batch.id,
      name: bm.batch.name,
      status: bm.batch.status,
      startDate: bm.batch.startDate,
      endDate: bm.batch.endDate,
      courseIds: bm.batch.courseIds.split(",").map((s) => s.trim()).filter(Boolean),
      enrolledAt: bm.enrolledAt,
    })),
    enrollments: enrollments.map((e) => ({
      id: e.id,
      progress: e.progress,
      completed: e.completed,
      enrolledAt: e.enrolledAt,
      lastAccessed: e.lastAccessed,
      course: e.course,
    })),
    attendance: { total, present, absent, late, excused, rate },
    certificateCount,
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getStudentInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error

  // Get all batches in the school so we can remove the user's batch memberships
  const schoolBatches = await db.batch.findMany({
    where: { schoolId },
    select: { id: true },
  })
  const batchIds = schoolBatches.map((b) => b.id)

  // Remove BatchMemberships for this school's batches
  if (batchIds.length > 0) {
    await db.batchMember.deleteMany({ where: { userId: id, batchId: { in: batchIds } } })
  }

  // Remove SchoolMember link
  await db.schoolMember.delete({
    where: { schoolId_userId: { schoolId, userId: id } },
  })

  // Optionally clear user.schoolId if it matches
  await db.user.update({
    where: { id },
    data: { schoolId: null },
  }).catch(() => {
    // ignore if user was already deleted elsewhere
  })

  return NextResponse.json({ ok: true, removed: { userId: id, schoolId } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getStudentInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error

  const body = await req.json()
  const { batchId, title } = body as { batchId?: string | null; title?: string }

  // Update title if provided
  if (typeof title === "string") {
    await db.user.update({ where: { id }, data: { title: title.trim() || null } })
  }

  // Update batch assignment
  if (batchId !== undefined) {
    // If null/empty string, remove from all school batches
    if (!batchId) {
      const schoolBatches = await db.batch.findMany({ where: { schoolId }, select: { id: true } })
      if (schoolBatches.length > 0) {
        await db.batchMember.deleteMany({
          where: { userId: id, batchId: { in: schoolBatches.map((b) => b.id) } },
        })
      }
    } else {
      // Verify batch belongs to school
      const batch = await db.batch.findUnique({
        where: { id: batchId },
        select: { id: true, schoolId: true, name: true },
      })
      if (!batch || batch.schoolId !== schoolId) {
        return NextResponse.json({ error: "Batch not found in this school" }, { status: 404 })
      }
      // Remove existing batch memberships in this school, then add to new batch
      const schoolBatches = await db.batch.findMany({ where: { schoolId }, select: { id: true } })
      if (schoolBatches.length > 0) {
        await db.batchMember.deleteMany({
          where: { userId: id, batchId: { in: schoolBatches.map((b) => b.id) } },
        })
      }
      await db.batchMember.upsert({
        where: { batchId_userId: { batchId, userId: id } },
        create: { batchId, userId: id },
        update: {},
      })
    }
  }

  // Return updated state
  const batchMembers = await db.batchMember.findMany({
    where: { userId: id, batch: { schoolId } },
    include: { batch: { select: { id: true, name: true, status: true } } },
  })
  const updatedUser = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, title: true, avatar: true },
  })

  return NextResponse.json({
    student: updatedUser,
    batches: batchMembers.map((bm) => ({ id: bm.batch.id, name: bm.batch.name, status: bm.batch.status })),
  })
}
