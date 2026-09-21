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

/** Verify the batch belongs to the admin's school. Returns the batch or an error response. */
async function getBatchInSchool(batchId: string, schoolId: string) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      schoolId: true,
      name: true,
      courseIds: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
    },
  })
  if (!batch || batch.schoolId !== schoolId) {
    return { error: NextResponse.json({ error: "Batch not found in this school" }, { status: 404 }) }
  }
  return { batch }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getBatchInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error
  const { batch } = ctx

  const members = await db.batchMember.findMany({
    where: { batchId: id },
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
          createdAt: true,
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  })

  const courseIds = batch.courseIds.split(",").map((s) => s.trim()).filter(Boolean)
  const courses = courseIds.length
    ? await db.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true, shortName: true, color: true, thumbnail: true, level: true },
      })
    : []

  return NextResponse.json({
    batch: {
      id: batch.id,
      name: batch.name,
      courseIds,
      startDate: batch.startDate,
      endDate: batch.endDate,
      status: batch.status,
      createdAt: batch.createdAt,
      memberCount: members.length,
      courses,
    },
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      title: m.user.title,
      xp: m.user.xp,
      level: m.user.level,
      streak: m.user.streak,
      createdAt: m.user.createdAt,
      enrolledAt: m.enrolledAt,
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getBatchInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error

  const body = await req.json()
  const { name, courseIds, startDate, endDate, status } = body as {
    name?: string
    courseIds?: string[]
    startDate?: string | null
    endDate?: string | null
    status?: string
  }

  const data: Record<string, unknown> = {}
  if (typeof name === "string" && name.trim().length >= 2) data.name = name.trim()
  if (Array.isArray(courseIds)) data.courseIds = courseIds.join(",")
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
  if (typeof status === "string" && ["active", "completed", "archived"].includes(status)) {
    data.status = status
  }

  const updated = await db.batch.update({ where: { id }, data })
  return NextResponse.json({
    batch: {
      ...updated,
      courseIds: updated.courseIds.split(",").filter(Boolean),
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getBatchInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error

  // Cascade is configured in Prisma (BatchMember.onDelete: Cascade), but we explicitly remove first for clarity.
  await db.batchMember.deleteMany({ where: { batchId: id } })
  await db.batch.delete({ where: { id } })

  return NextResponse.json({ ok: true, deleted: id })
}
