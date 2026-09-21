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

/** Verify the batch belongs to the admin's school. */
async function getBatchInSchool(batchId: string, schoolId: string) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    select: { id: true, schoolId: true, name: true },
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

  return NextResponse.json({
    batchId: id,
    count: members.length,
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const ctx = await getBatchInSchool(id, schoolId)
  if ("error" in ctx) return ctx.error

  const body = await req.json()
  const userId: string | undefined = body.userId
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  // Ensure the user is a student member of the school (auto-link if not already)
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, schoolId: true } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (user.schoolId && user.schoolId !== schoolId) {
    return NextResponse.json({ error: "User belongs to a different school" }, { status: 400 })
  }

  // Ensure SchoolMember exists
  const existingMember = await db.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
  })
  if (!existingMember) {
    await db.schoolMember.create({
      data: { schoolId, userId, role: "STUDENT" },
    })
    if (!user.schoolId) {
      await db.user.update({ where: { id: userId }, data: { schoolId } })
    }
  }

  // Add to batch (idempotent)
  const existingBatchMember = await db.batchMember.findUnique({
    where: { batchId_userId: { batchId: id, userId } },
  })
  if (existingBatchMember) {
    return NextResponse.json({ ok: true, alreadyMember: true, userId, batchId: id })
  }

  const member = await db.batchMember.create({ data: { batchId: id, userId } })
  return NextResponse.json({ ok: true, member })
}
