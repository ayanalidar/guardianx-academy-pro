import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// GET /api/user/profile - current user's full profile (any role)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const full = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, email: true, name: true, role: true, avatar: true, title: true, bio: true,
      phone: true, xp: true, level: true, streak: true, createdAt: true,
      instructorProfile: {
        select: {
          expertise: true, yearsExperience: true, certifications: true,
          linkedinUrl: true, maxBatches: true, currentBatches: true,
        },
      },
    },
  })
  return NextResponse.json({ user: full })
}

// PATCH /api/user/profile - update own profile (any role). NEVER allow role changes.
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  const { name, email, title, bio, avatar, phone } = body
  // Validate
  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100)) {
    return NextResponse.json({ error: "Name must be 2-100 characters" }, { status: 400 })
  }
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    // Check uniqueness (exclude self)
    const existing = await db.user.findUnique({ where: { email } })
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
  }
  const data: {
    name?: string
    email?: string
    title?: string | null
    bio?: string | null
    avatar?: string | null
    phone?: string | null
  } = {}
  if (name !== undefined) data.name = name.trim()
  if (email !== undefined) data.email = email.trim()
  if (title !== undefined) data.title = title?.trim() || null
  if (bio !== undefined) data.bio = bio?.trim() || null
  if (avatar !== undefined) data.avatar = avatar?.trim() || null
  if (phone !== undefined) data.phone = phone?.trim() || null
  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true, email: true, name: true, role: true, avatar: true, title: true, bio: true, phone: true,
    },
  })
  return NextResponse.json({ user: updated })
}
