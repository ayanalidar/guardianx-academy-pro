import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { randomBytes } from "crypto"

// Generate a unique school code (e.g. "GXA-7K3M9P")
function generateSchoolCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no confusing chars (0/O, 1/I)
  const random = Array.from(randomBytes(6)).map((b) => chars[b % chars.length]).join("")
  return `GXA-${random}`
}

// POST /api/school/onboard
// Creates a School record (with unique schoolCode) and links it to the current user.
export async function POST(req: NextRequest) {
  const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (user instanceof NextResponse) return user

  // If the user already has a school, they cannot onboard again
  const existing = await db.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true },
  })
  const existingSchool = existing?.schoolId
    ? await db.school.findUnique({ where: { id: existing.schoolId } })
    : null
  if (existingSchool) {
    return NextResponse.json({
      school: existingSchool,
      message: "You already have a school associated with your account.",
    })
  }

  const body = await req.json()
  const { name, address, city, contactPerson, contactEmail, contactPhone } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "School name is required" }, { status: 400 })
  }
  if (!contactEmail?.trim()) {
    return NextResponse.json({ error: "Contact email is required" }, { status: 400 })
  }

  // Generate a unique school code (retry if collision)
  let schoolCode = generateSchoolCode()
  let attempts = 0
  while (attempts < 5) {
    const collision = await db.school.findUnique({ where: { schoolCode } })
    if (!collision) break
    schoolCode = generateSchoolCode()
    attempts++
  }

  // Create the school and link it to the user in a single transaction
  const school = await db.$transaction(async (tx) => {
    const created = await tx.school.create({
      data: {
        name: name.trim(),
        schoolCode,
        address: address?.trim() || null,
        city: city?.trim() || null,
        adminName: user.name || contactPerson?.trim() || "School Admin",
        adminEmail: contactEmail.trim() || user.email,
        passwordHash: "$2a$12$placeholder.hash.updated.on.first.login.xxxxxxxx",
        email: contactEmail.trim() || user.email,
        phone: contactPhone?.trim() || null,
      },
    })
    await tx.user.update({
      where: { id: user.id },
      data: { schoolId: created.id },
    })
    return created
  })

  return NextResponse.json({
    school,
    schoolCode: school.schoolCode,
    message: "School onboarded successfully! Share this School Code with your staff so they can log in via the School Portal tab.",
  })
}
