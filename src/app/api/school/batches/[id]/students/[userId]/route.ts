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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  // Verify the batch belongs to this school
  const batch = await db.batch.findUnique({
    where: { id },
    select: { id: true, schoolId: true },
  })
  if (!batch || batch.schoolId !== schoolId) {
    return NextResponse.json({ error: "Batch not found in this school" }, { status: 404 })
  }

  // Remove the membership
  await db.batchMember.deleteMany({
    where: { batchId: id, userId },
  })

  return NextResponse.json({ ok: true, removed: { batchId: id, userId } })
}
