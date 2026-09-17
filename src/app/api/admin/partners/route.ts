import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// GET /api/admin/partners — list all partner institutions (admin only)
export async function GET() {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const partners = await db.partnerInstitution.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ partners })
}

// POST /api/admin/partners — create a new partner institution
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json()
  const {
    name, shortName, type, location, city, country, established, studentsCount,
    mouSigned, mouDuration, partnershipLevel, coursesOffered, studentsTrained,
    certificationsEarned, labsSetup, facultyTrained, description, achievements,
    contactPerson, contactRole, email, phone, website, color, order,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: "Partner name required" }, { status: 400 })
  if (!shortName?.trim()) return NextResponse.json({ error: "Short name required" }, { status: 400 })

  // Convert arrays to pipe-separated strings
  const coursesStr = Array.isArray(coursesOffered)
    ? coursesOffered.join("|")
    : (typeof coursesOffered === "string" ? coursesOffered : "")
  const achievementsStr = Array.isArray(achievements)
    ? achievements.join("|")
    : (typeof achievements === "string" ? achievements : "")

  // Determine next order if not provided
  let orderVal = typeof order === "number" ? order : 0
  if (typeof order !== "number") {
    const max = await db.partnerInstitution.aggregate({ _max: { order: true } })
    orderVal = (max._max.order ?? -1) + 1
  }

  const partner = await db.partnerInstitution.create({
    data: {
      name: name.trim(),
      shortName: shortName.trim(),
      type: type || "school",
      location: location?.trim() || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      established: typeof established === "number" ? established : null,
      studentsCount: studentsCount?.trim() || null,
      mouSigned: mouSigned?.trim() || null,
      mouDuration: mouDuration?.trim() || null,
      partnershipLevel: partnershipLevel?.trim() || null,
      coursesOffered: coursesStr,
      studentsTrained: Number(studentsTrained) || 0,
      certificationsEarned: Number(certificationsEarned) || 0,
      labsSetup: Number(labsSetup) || 0,
      facultyTrained: Number(facultyTrained) || 0,
      description: description?.trim() || "",
      achievements: achievementsStr,
      contactPerson: contactPerson?.trim() || null,
      contactRole: contactRole?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      color: color || "emerald",
      order: orderVal,
    },
  })

  return NextResponse.json({ partner })
}
