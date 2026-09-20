import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Returns full certificate data for PDF/print rendering
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cert = await db.certificate.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          id: true, title: true, shortName: true, certBody: true, color: true, category: true, level: true,
          instructor: { select: { id: true, name: true, title: true, bio: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  if (cert.userId !== user.id && !(user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    certificate: {
      id: cert.id,
      certificateId: cert.certificateId,
      issuedAt: cert.issuedAt.toISOString(),
      score: cert.score,
      course: cert.course,
      user: cert.user,
    },
  })
}
