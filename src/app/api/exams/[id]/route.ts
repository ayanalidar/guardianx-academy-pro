import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

/**
 * GET /api/exams/[id]
 * AUTHENTICATED — exam details WITHOUT correct answers.
 * If `?include=questions` is supplied, returns the question set
 * with options but never exposes correctAnswer/explanation.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const includeQuestions = searchParams.get("include") === "questions"

  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      certification: {
        select: {
          id: true,
          slug: true,
          name: true,
          level: true,
          domains: true,
          skills: true,
          passingScore: true,
          validityPeriod: true,
          icon: true,
          color: true,
        },
      },
      questions: includeQuestions
        ? {
            select: {
              id: true,
              type: true,
              domain: true,
              skill: true,
              difficulty: true,
              question: true,
              options: true,
              points: true,
              tags: true,
            },
            orderBy: { createdAt: "asc" },
          }
        : false,
      _count: { select: { questions: true } },
    },
  })

  if (!exam || exam.status !== "published") {
    return NextResponse.json({ error: "Exam not found." }, { status: 404 })
  }

  // Also fetch the user's attempt history for this exam (for eligibility
  // display). proctorFlags is included so the UI can badge flagged/voided
  // attempts instead of violations being invisible forever.
  const attempts = await db.examAttempt.findMany({
    where: { userId: user.id, examId: exam.id },
    select: {
      id: true,
      status: true,
      score: true,
      createdAt: true,
      submittedAt: true,
      proctorFlags: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const completed = attempts.filter((a) =>
    ["submitted", "graded", "passed", "failed"].includes(a.status)
  )
  const bestScore = completed.reduce(
    (max, a) => (typeof a.score === "number" && a.score > max ? a.score : max),
    0
  )

  // Readiness score = average of the user's last 3 completed attempts.
  // null when the user has never completed an attempt ("Not attempted yet").
  const lastThree = completed.slice(0, 3)
  const readinessScore =
    lastThree.length > 0
      ? Math.round(
          lastThree.reduce(
            (sum, a) => sum + (typeof a.score === "number" ? a.score : 0),
            0
          ) / lastThree.length
        )
      : null

  return NextResponse.json({
    exam: {
      id: exam.id,
      slug: exam.slug,
      title: exam.title,
      description: exam.description,
      certificationId: exam.certificationId,
      duration: exam.duration,
      passingScore: exam.passingScore,
      maxAttempts: exam.maxAttempts,
      questionCount: exam.questionCount,
      actualQuestionCount: exam._count.questions,
      sections: safeParse(exam.sections, []),
      questionType: exam.questionType,
      proctoringEnabled: exam.proctoringEnabled,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
      status: exam.status,
      certification: exam.certification
        ? {
            ...exam.certification,
            domains: safeParse(exam.certification.domains, []),
            skills: safeParse(exam.certification.skills, []),
          }
        : null,
      questions: exam.questions
        ? exam.questions.map((q) => ({
            ...q,
            options: safeParse(q.options, [] as string[]),
            tags: safeParse(q.tags, [] as string[]),
          }))
        : null,
      userContext: {
        attemptsUsed: completed.length,
        attemptsRemaining: Math.max(0, exam.maxAttempts - completed.length),
        bestScore,
        readinessScore,
        hasPassed: attempts.some((a) => a.status === "passed"),
        hasInProgress: attempts.some((a) => a.status === "in-progress"),
        recentAttempts: attempts.slice(0, 5),
      },
    },
  })
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
