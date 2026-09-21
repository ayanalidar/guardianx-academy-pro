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

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      schoolCode: true,
      name: true,
      type: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      country: true,
      logoUrl: true,
      website: true,
      adminName: true,
      adminEmail: true,
      status: true,
      maxStudents: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

  // count current students for capacity feedback
  const studentCount = await db.schoolMember.count({
    where: { schoolId, role: "STUDENT" },
  })

  return NextResponse.json({
    settings: {
      ...school,
      studentCount,
      capacityUsed: school.maxStudents ? Math.round((studentCount / school.maxStudents) * 100) : 0,
    },
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const guard = await schoolAdminGuard()
    if ("error" in guard) return guard.error
    const { schoolId } = guard

    const body = await req.json()
    // Editable fields - schoolCode, passwordHash, adminEmail are NOT editable here
    const {
      name,
      type,
      email,
      phone,
      address,
      city,
      state,
      country,
      logoUrl,
      website,
      maxStudents,
      status,
      adminName,
    } = body as Record<string, unknown>

    const data: Record<string, unknown> = {}
    if (typeof name === "string" && name.trim()) data.name = name.trim()
    if (typeof type === "string" && ["SCHOOL", "COLLEGE", "UNIVERSITY"].includes(type)) data.type = type
    if (typeof email === "string") data.email = email.trim() || null
    if (typeof phone === "string") data.phone = phone.trim() || null
    if (typeof address === "string") data.address = address.trim() || null
    if (typeof city === "string") data.city = city.trim() || null
    if (typeof state === "string") data.state = state.trim() || null
    if (typeof country === "string" && country.trim()) data.country = country.trim()
    if (typeof logoUrl === "string") data.logoUrl = logoUrl.trim() || null
    if (typeof website === "string") data.website = website.trim() || null
    if (typeof maxStudents === "number" && maxStudents > 0) data.maxStudents = maxStudents
    if (typeof status === "string" && ["active", "suspended", "pending"].includes(status)) data.status = status
    if (typeof adminName === "string" && adminName.trim()) data.adminName = adminName.trim()

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 })
    }

    const updated = await db.school.update({
      where: { id: schoolId },
      data,
      select: {
        id: true,
        schoolCode: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        country: true,
        logoUrl: true,
        website: true,
        adminName: true,
        adminEmail: true,
        status: true,
        maxStudents: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ settings: updated })
  } catch (e) {
    console.error("[school/settings PATCH]", e)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
