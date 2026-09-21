import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

// DELETE /api/admin/instructors/[id] - delete an instructor
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const instructor = await db.user.findUnique({ where: { id } })
    if (!instructor) {
      return NextResponse.json({ error: "Instructor not found" }, { status: 404 })
    }
    if (instructor.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "User is not an instructor" }, { status: 400 })
    }

    // Delete instructor profile first (if exists), then the user
    await db.instructorProfile.deleteMany({ where: { userId: id } }).catch(() => {})
    await db.user.delete({ where: { id } })

    await logAction(
      currentUser.id,
      currentUser.name,
      "instructor.delete",
      "User",
      id,
      { email: instructor.email, name: instructor.name, role: instructor.role },
    )

    return NextResponse.json({ success: true, message: "Instructor deleted" })
  },
)
