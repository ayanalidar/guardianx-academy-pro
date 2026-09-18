import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/cyber-quiz/certificates
 * ADMIN-only. Returns all issued quiz certificates.
 *
 * Query: q? (search by credentialId / email / candidateName)
 */
export const GET = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const q = url.searchParams.get("q")

  const where: any = {}
  if (q && q.trim()) {
    where.OR = [
      { credentialId: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { candidateName: { contains: q, mode: "insensitive" } },
    ]
  }

  const [certs, total] = await Promise.all([
    db.cyberQuizCertificate.findMany({
      where,
      orderBy: { issueDate: "desc" },
      take: 200,
      select: {
        id: true,
        credentialId: true,
        candidateName: true,
        email: true,
        difficulty: true,
        score: true,
        totalQuestions: true,
        percentage: true,
        issueDate: true,
        status: true,
        verificationUrl: true,
      },
    }),
    // Unfiltered total — "Total issued" must not shrink when searching
    db.cyberQuizCertificate.count({}),
  ])

  return NextResponse.json({ certificates: certs, count: certs.length, total })
})
