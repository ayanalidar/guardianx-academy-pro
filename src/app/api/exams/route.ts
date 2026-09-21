import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export const runtime = "nodejs"

/**
 * GET /api/exams
 * PUBLIC (auth optional) - list published exams.
 *
 * Authenticated users also get back their per-exam `userAttempts` AND a
 * computed `readinessScore` (the average score of their last 3 completed
 * attempts for that exam, or null if they've never attempted it).
 *
 * The `readinessScore` is intended to drive a "Readiness" indicator in the
 * exam list view ("Not attempted yet" when null, otherwise a percentage).
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const exams = await db.exam.findMany({
      where: { status: "published" },
      include: { certification: true },
      orderBy: { createdAt: "asc" },
    })
    let attempts: any[] = []
    if (user) {
      attempts = await db.examAttempt.findMany({
        where: { userId: user.id },
        select: { examId: true, status: true, score: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    }

    return NextResponse.json({
      exams: exams.map((e) => {
        const examAttempts = attempts
          .filter((a) => a.examId === e.id)
          .filter(
            (a) =>
              a.status === "submitted" ||
              a.status === "graded" ||
              a.status === "passed" ||
              a.status === "failed"
          )
        const lastThree = examAttempts.slice(0, 3)
        const readinessScore =
          lastThree.length > 0
            ? Math.round(
                lastThree.reduce(
                  (sum, a) => sum + (typeof a.score === "number" ? a.score : 0),
                  0
                ) / lastThree.length
              )
            : null

        return {
          id: e.id,
          slug: e.slug,
          title: e.title,
          description: e.description,
          duration: e.duration,
          passingScore: e.passingScore,
          maxAttempts: e.maxAttempts,
          questionCount: e.questionCount,
          proctoringEnabled: e.proctoringEnabled,
          shuffleQuestions: e.shuffleQuestions,
          shuffleOptions: e.shuffleOptions,
          certification: e.certification
            ? {
                id: e.certification.id,
                name: e.certification.name,
                slug: e.certification.slug,
                level: e.certification.level,
                icon: e.certification.icon,
                color: e.certification.color,
              }
            : null,
          userAttempts: attempts.filter((a) => a.examId === e.id),
          readinessScore,
          attemptsCount: examAttempts.length,
        }
      }),
    })
  } catch (err) {
    console.error("[api/exams] error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
