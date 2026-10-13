import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { ensureTable } from "@/lib/db-safe"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { logAction } from "@/lib/audit"

export const runtime = "nodejs"

type PastExperienceEntry = { role?: string; org?: string; period?: string; details?: string }

// PATCH /api/admin/instructors/[id] - edit a tutor's profile.
// Accepts any subset of: name, email, title, bio, avatar, phone, expertise,
// yearsExperience, certifications, pastExperience, linkedinUrl, maxBatches,
// password (optional reset). Unknown fields are ignored.
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireAdmin()
    if (currentUser instanceof NextResponse) return currentUser

    const { id } = await params

    const instructor = await db.user.findUnique({
      where: { id },
      include: { instructorProfile: true },
    })
    if (!instructor) {
      return NextResponse.json({ error: "Instructor not found" }, { status: 404 })
    }
    if (instructor.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "User is not an instructor" }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const {
      name,
      email,
      title,
      bio,
      avatar,
      phone,
      expertise,
      yearsExperience,
      certifications,
      pastExperience,
      linkedinUrl,
      maxBatches,
      password,
    } = body as {
      name?: string
      email?: string
      title?: string
      bio?: string
      avatar?: string
      phone?: string
      expertise?: string[]
      yearsExperience?: number
      certifications?: string[]
      pastExperience?: PastExperienceEntry[]
      linkedinUrl?: string
      maxBatches?: number
      password?: string
    }

    // Email change: validate uniqueness (and let empty/undefined mean "keep").
    let nextEmail: string | undefined
    if (typeof email === "string" && email.trim() && email.trim().toLowerCase() !== instructor.email) {
      const clash = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
      if (clash) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
      nextEmail = email.trim().toLowerCase()
    }

    // Optional password reset.
    let passwordHash: string | undefined
    if (typeof password === "string" && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      }
      passwordHash = bcrypt.hashSync(password, 10)
    }

    // Drifted prod DBs may lack the profile table or newer columns - self-heal
    // BEFORE writing so tutor edits never fail.
    try {
      await ensureTable("InstructorProfile")
    } catch (err) {
      console.error("[admin/instructors] InstructorProfile self-heal failed:", err)
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
        ...(title !== undefined ? { title: title.trim() || null } : {}),
        ...(bio !== undefined ? { bio: bio.trim() || null } : {}),
        ...(avatar !== undefined ? { avatar: avatar.trim() || null } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        instructorProfile: {
          upsert: {
            create: {
              phone: phone?.trim() || null,
              expertise: JSON.stringify(expertise ?? []),
              yearsExperience: Number(yearsExperience) || 0,
              certifications: JSON.stringify(certifications ?? []),
              pastExperience: JSON.stringify(pastExperience ?? []),
              linkedinUrl: linkedinUrl?.trim() || null,
              maxBatches: Number(maxBatches) || 3,
            },
            update: {
              ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
              ...(expertise !== undefined ? { expertise: JSON.stringify(expertise) } : {}),
              ...(yearsExperience !== undefined
                ? { yearsExperience: Number(yearsExperience) || 0 }
                : {}),
              ...(certifications !== undefined
                ? { certifications: JSON.stringify(certifications) }
                : {}),
              ...(pastExperience !== undefined
                ? { pastExperience: JSON.stringify(pastExperience) }
                : {}),
              ...(linkedinUrl !== undefined
                ? { linkedinUrl: linkedinUrl.trim() || null }
                : {}),
              ...(maxBatches !== undefined ? { maxBatches: Number(maxBatches) || 3 } : {}),
            },
          },
        },
      },
      include: { instructorProfile: true },
    })

    await logAction(
      currentUser.id,
      currentUser.name,
      "instructor.update",
      "User",
      id,
      { email: user.email, name: user.name },
    )

    const p = user.instructorProfile
    return NextResponse.json({
      instructor: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        title: user.title,
        bio: user.bio,
        profile: p
          ? {
              phone: p.phone,
              expertise: JSON.parse(p.expertise || "[]"),
              yearsExperience: p.yearsExperience,
              certifications: JSON.parse(p.certifications || "[]"),
              pastExperience: JSON.parse(p.pastExperience || "[]"),
              linkedinUrl: p.linkedinUrl,
              maxBatches: p.maxBatches,
            }
          : null,
      },
    })
  },
)

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
