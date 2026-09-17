import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

// PATCH /api/admin/partners/[id] — update a partner institution
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const existing = await db.partnerInstitution.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  const body = await req.json()
  const {
    name, shortName, type, location, city, country, established, studentsCount,
    mouSigned, mouDuration, partnershipLevel, coursesOffered, studentsTrained,
    certificationsEarned, labsSetup, facultyTrained, description, achievements,
    contactPerson, contactRole, email, phone, website, color, order,
  } = body

  const patch: any = {}
  if (typeof name === "string" && name.trim()) patch.name = name.trim()
  if (typeof shortName === "string" && shortName.trim()) patch.shortName = shortName.trim()
  if (typeof type === "string") patch.type = type
  if (typeof location === "string") patch.location = location.trim() || null
  if (typeof city === "string") patch.city = city.trim() || null
  if (typeof country === "string") patch.country = country.trim() || null
  if (typeof established === "number") patch.established = established
  if (typeof studentsCount === "string") patch.studentsCount = studentsCount.trim() || null
  if (typeof mouSigned === "string") patch.mouSigned = mouSigned.trim() || null
  if (typeof mouDuration === "string") patch.mouDuration = mouDuration.trim() || null
  if (typeof partnershipLevel === "string") patch.partnershipLevel = partnershipLevel.trim() || null
  if (Array.isArray(coursesOffered)) patch.coursesOffered = coursesOffered.join("|")
  else if (typeof coursesOffered === "string") patch.coursesOffered = coursesOffered
  if (typeof studentsTrained === "number") patch.studentsTrained = studentsTrained
  if (typeof certificationsEarned === "number") patch.certificationsEarned = certificationsEarned
  if (typeof labsSetup === "number") patch.labsSetup = labsSetup
  if (typeof facultyTrained === "number") patch.facultyTrained = facultyTrained
  if (typeof description === "string") patch.description = description.trim()
  if (Array.isArray(achievements)) patch.achievements = achievements.join("|")
  else if (typeof achievements === "string") patch.achievements = achievements
  if (typeof contactPerson === "string") patch.contactPerson = contactPerson.trim() || null
  if (typeof contactRole === "string") patch.contactRole = contactRole.trim() || null
  if (typeof email === "string") patch.email = email.trim() || null
  if (typeof phone === "string") patch.phone = phone.trim() || null
  if (typeof website === "string") patch.website = website.trim() || null
  if (typeof color === "string") patch.color = color
  if (typeof order === "number") patch.order = order

  const updated = await db.partnerInstitution.update({
    where: { id },
    data: patch,
  })

  return NextResponse.json({ partner: updated })
}

// DELETE /api/admin/partners/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const existing = await db.partnerInstitution.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  await db.partnerInstitution.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
