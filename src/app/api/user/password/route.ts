import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// PATCH /api/user/password - change own password (any role)
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { currentPassword, newPassword } = await req.json().catch(() => ({}))
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password required" }, { status: 400 })
  }
  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    return NextResponse.json(
      { error: "Password must be 8+ chars with uppercase, lowercase, and a number" },
      { status: 400 },
    )
  }
  const full = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!full || !bcrypt.compareSync(currentPassword, full.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }
  const hash = bcrypt.hashSync(newPassword, 12)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
  return NextResponse.json({ success: true })
}
