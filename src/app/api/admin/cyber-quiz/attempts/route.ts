import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/cyber-quiz/attempts
 * ADMIN-only. Returns all quiz attempts with filters.
 *
 * Query: passed?, difficulty?, q?
 */
export const GET = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const passed = url.searchParams.get("passed")
  const difficulty = url.searchParams.get("difficulty")
  const q = url.searchParams.get("q")

  const where: any = {}
  if (passed === "true") where.passed = true
  if (passed === "false") where.passed = false
  if (difficulty && ["Easy", "Hard", "Advanced"].includes(difficulty)) where.difficulty = difficulty
  if (q && q.trim()) {
    where.OR = [
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestName: { contains: q, mode: "insensitive" } },
    ]
  }

  const [attempts, total, passedCount, certCount] = await Promise.all([
    db.cyberQuizAttempt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        difficulty: true,
        score: true,
        totalQuestions: true,
        percentage: true,
        passed: true,
        certificateId: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    db.cyberQuizAttempt.count({ where }),
    // Stats computed over ALL matching rows — previously the view derived
    // them from the capped 200-row page, which silently undercounted.
    db.cyberQuizAttempt.count({ where: { ...where, passed: true } }),
    db.cyberQuizAttempt.count({ where: { ...where, certificateId: { not: null } } }),
  ])

  return NextResponse.json({
    attempts,
    count: attempts.length,
    total,
    stats: {
      total,
      passed: passedCount,
      withCert: certCount,
      passRate: total > 0 ? Math.round((passedCount / total) * 100) : 0,
    },
  })
})
