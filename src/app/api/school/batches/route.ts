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

export async function GET() {
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const batches = await db.batch.findMany({
    where: { schoolId },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Resolve course titles for the batches (for richer UI)
  const allCourseIds = new Set<string>()
  for (const b of batches) {
    for (const cid of b.courseIds.split(",").map((s) => s.trim()).filter(Boolean)) {
      allCourseIds.add(cid)
    }
  }
  const courses = allCourseIds.size
    ? await db.course.findMany({
        where: { id: { in: Array.from(allCourseIds) } },
        select: { id: true, title: true, shortName: true },
      })
    : []
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  const result = batches.map((b) => {
    const ids = b.courseIds.split(",").map((s) => s.trim()).filter(Boolean)
    return {
      id: b.id,
      name: b.name,
      courseIds: ids,
      courseCount: ids.length,
      courses: ids.map((cid) => courseMap.get(cid)).filter(Boolean),
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      memberCount: b._count.members,
      createdAt: b.createdAt,
    }
  })

  return NextResponse.json({ batches: result, count: result.length })
}

export async function POST(req: NextRequest) {
  try {
    const guard = await schoolAdminGuard()
    if ("error" in guard) return guard.error
    const { schoolId } = guard

    const body = await req.json()
    const name: string = (body.name || "").toString().trim()
    const courseIds: string[] = Array.isArray(body.courseIds) ? body.courseIds : []
    const startDate: string | undefined = body.startDate
    const endDate: string | undefined = body.endDate

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Valid batch name is required" }, { status: 400 })
    }

    // Verify all courseIds exist (soft check - accept unknown ones but log)
    if (courseIds.length > 0) {
      const existing = await db.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true },
      })
      const existingIds = new Set(existing.map((c) => c.id))
      const validIds = courseIds.filter((cid) => existingIds.has(cid))
      const finalCourseIds = validIds.join(",")
      const batch = await db.batch.create({
        data: {
          schoolId,
          name,
          courseIds: finalCourseIds,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: "active",
        },
      })
      return NextResponse.json({
        batch: {
          ...batch,
          courseIds: batch.courseIds.split(",").filter(Boolean),
        },
      })
    }

    const batch = await db.batch.create({
      data: {
        schoolId,
        name,
        courseIds: "",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "active",
      },
    })
    return NextResponse.json({
      batch: {
        ...batch,
        courseIds: [],
      },
    })
  } catch (e) {
    console.error("[school/batches POST]", e)
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 })
  }
}
