import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

// GET /api/admin/users/[id] — user details with enrollments, certificates, lab progress
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const user = await db.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          take: 50,
          orderBy: { enrolledAt: "desc" },
          include: {
            course: {
              select: { id: true, title: true, shortName: true, slug: true, color: true, level: true },
            },
          },
        },
        certificates: {
          take: 50,
          orderBy: { issuedAt: "desc" },
          include: {
            course: { select: { id: true, title: true, shortName: true } },
          },
        },
        labProgress: {
          take: 50,
          orderBy: { updatedAt: "desc" },
          include: {
            lab: { select: { id: true, title: true, slug: true, difficulty: true, category: true, points: true } },
          },
        },
        _count: {
          select: {
            enrollments: true,
            certificates: true,
            labProgress: true,
            taughtCourses: true,
            notes: true,
            quizAttempts: true,
          },
        },
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({ user })
  },
)

// PATCH /api/admin/users/[id] — update user (name, role, title, bio, avatar, password)
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const { name, role, title, bio, avatar, password } = body as {
      name?: string
      role?: string
      title?: string
      bio?: string
      avatar?: string
      password?: string
    }

    const validRoles = ["STUDENT", "INSTRUCTOR", "ADMIN", "SCHOOL_ADMIN"]
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (role !== undefined) data.role = role
    if (title !== undefined) data.title = title ? String(title) : null
    if (bio !== undefined) data.bio = bio ? String(bio) : null
    if (avatar !== undefined) data.avatar = avatar ? String(avatar) : null
    if (password && password.length >= 6) {
      data.passwordHash = bcrypt.hashSync(password, 10)
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        title: true,
        bio: true,
        xp: true,
        level: true,
        streak: true,
        updatedAt: true,
      },
    })

    await logAction(
      currentUser.id,
      currentUser.name,
      "user.update",
      "User",
      id,
      { before: { name: existing.name, role: existing.role }, after: { name: updated.name, role: updated.role } },
    )

    return NextResponse.json({ user: updated })
  },
)

// DELETE /api/admin/users/[id] — delete user (cascade via Prisma onDelete: Cascade relations)
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    if (currentUser.id === id) {
      return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await db.user.delete({ where: { id } })

    await logAction(
      currentUser.id,
      currentUser.name,
      "user.delete",
      "User",
      id,
      { email: existing.email, name: existing.name, role: existing.role },
    )

    return NextResponse.json({ ok: true })
  },
)
