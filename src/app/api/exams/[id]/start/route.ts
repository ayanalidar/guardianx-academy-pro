import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

/**
 * POST /api/exams/[id]/start
 * AUTHENTICATED - start a new exam attempt.
 *
 * - Validates the exam exists and is published.
 * - Enforces maxAttempts (count completed attempts).
 * - If a previous attempt is "in-progress", resumes it (returns the existing
 *   attempt + the question set so the UI can continue).
 * - Otherwise creates a new ExamAttempt + ProctoringSession and returns
 *   the attempt + the question set (WITHOUT correct answers).
 *
 * Mock-exam engine (master-prompt §41):
 * - If `shuffleQuestions` is true, questions are Fisher-Yates shuffled.
 * - If `questionCount` is set and less than the total question count, only
 *   that many questions are drawn (after shuffling, so the subset is random).
 * - If `shuffleOptions` is true, each question's options are shuffled. The
 *   mapping (displayed index → original index) is persisted in
 *   `ExamAttempt.shuffleMap` so the submit route can map the client's
 *   selected index back to the original index before comparing to the
 *   stored `correctAnswer`.
 * - NEVER returns correct answers - only `question` + `options`.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      questions: {
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
      },
    },
  })

  if (!exam || exam.status !== "published") {
    return NextResponse.json({ error: "Exam not found." }, { status: 404 })
  }

  // Look for an existing in-progress attempt - resume instead of creating new
  const inProgress = await db.examAttempt.findFirst({
    where: { userId: user.id, examId: exam.id, status: "in-progress" },
    orderBy: { createdAt: "desc" },
  })

  if (inProgress) {
    // Make sure a proctoring session exists for this attempt
    let proctoring = await db.proctoringSession.findUnique({
      where: { examAttemptId: inProgress.id },
    })
    if (!proctoring) {
      proctoring = await db.proctoringSession.create({
        data: {
          examAttemptId: inProgress.id,
          userId: user.id,
        },
      })
    }

    const shuffleMap = safeParse<ShuffleMap | null>(
      inProgress.shuffleMap,
      null
    )

    const questionsForClient = buildClientQuestions(
      exam.questions,
      shuffleMap
    )

    return NextResponse.json({
      attempt: {
        id: inProgress.id,
        status: inProgress.status,
        startedAt: inProgress.startedAt,
        submittedAt: inProgress.submittedAt,
      },
      exam: {
        id: exam.id,
        slug: exam.slug,
        title: exam.title,
        duration: exam.duration,
        passingScore: exam.passingScore,
        proctoringEnabled: exam.proctoringEnabled,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.shuffleOptions,
      },
      questions: questionsForClient,
      proctoring,
      resumed: true,
    })
  }

  // Enforce maxAttempts
  const completedCount = await db.examAttempt.count({
    where: {
      userId: user.id,
      examId: exam.id,
      status: { in: ["submitted", "graded", "passed", "failed"] },
    },
  })
  if (completedCount >= exam.maxAttempts) {
    return NextResponse.json(
      {
        error: `Maximum attempts (${exam.maxAttempts}) reached for this exam.`,
      },
      { status: 403 }
    )
  }

  // ---- Build the question set for this attempt -------------------------
  // 1. Optionally Fisher-Yates shuffle the question order.
  // 2. Optionally subset to `questionCount` (after shuffle, so the subset is random).
  // 3. For each kept question, optionally shuffle the options and record the
  //    option order in the shuffleMap.
  const shuffleMap = buildShuffleMap(exam.questions, {
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    questionCount: exam.questionCount,
  })

  const questionsForClient = buildClientQuestions(exam.questions, shuffleMap)

  // Create new attempt + proctoring session
  const attempt = await db.examAttempt.create({
    data: {
      examId: exam.id,
      userId: user.id,
      status: "in-progress",
      startedAt: new Date(),
      totalQuestions: questionsForClient.length,
      shuffleMap: JSON.stringify(shuffleMap),
    },
  })

  const proctoring = await db.proctoringSession.create({
    data: {
      examAttemptId: attempt.id,
      userId: user.id,
      startedAt: new Date(),
    },
  })

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    },
    exam: {
      id: exam.id,
      slug: exam.slug,
      title: exam.title,
      duration: exam.duration,
      passingScore: exam.passingScore,
      proctoringEnabled: exam.proctoringEnabled,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
    },
    questions: questionsForClient,
    proctoring,
    resumed: false,
  })
}

/* ------------------------------------------------------------------ */
/* Types + helpers                                                    */
/* ------------------------------------------------------------------ */

interface RawQuestion {
  id: string
  type: string
  domain: string
  skill: string | null
  difficulty: string
  question: string
  options: string
  points: number
  tags: string
}

interface ShuffleMap {
  /** Ordered list of question IDs as displayed to the user. */
  questionOrder: string[]
  /** For each question ID, the ordered list of original option indices as
   *  displayed to the user. `displayedIndex → originalIndex`. */
  optionOrder: Record<string, number[]>
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Fisher-Yates shuffle - returns a new shuffled array (does not mutate input). */
function fisherYates<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * buildShuffleMap - derives a `ShuffleMap` for this attempt.
 *
 * - If `shuffleQuestions` is true, the question IDs are shuffled via
 *   Fisher-Yates. Otherwise they're kept in their natural order.
 * - If `questionCount` is set and less than the total, the (possibly
 *   shuffled) order is truncated to that many questions. This means the
 *   subset is random when shuffling is on, and the first N otherwise.
 * - If `shuffleOptions` is true, each kept question gets a Fisher-Yates
 *   shuffled option order. Otherwise the identity permutation [0,1,2,...]
 *   is used.
 */
function buildShuffleMap(
  questions: RawQuestion[],
  opts: { shuffleQuestions: boolean; shuffleOptions: boolean; questionCount: number }
): ShuffleMap {
  const orderedQuestions = opts.shuffleQuestions
    ? fisherYates(questions)
    : [...questions]

  const subset =
    opts.questionCount && opts.questionCount > 0 && opts.questionCount < orderedQuestions.length
      ? orderedQuestions.slice(0, opts.questionCount)
      : orderedQuestions

  const questionOrder = subset.map((q) => q.id)
  const optionOrder: Record<string, number[]> = {}
  for (const q of subset) {
    const parsed = safeParse<string[]>(q.options, [])
    const identity = parsed.map((_, idx) => idx)
    optionOrder[q.id] = opts.shuffleOptions ? fisherYates(identity) : identity
  }

  return { questionOrder, optionOrder }
}

/**
 * buildClientQuestions - applies a ShuffleMap to the raw question set and
 * returns the question payload for the client (no correctAnswer).
 *
 * The options are reordered so the displayed option at position N is the
 * original option at `optionOrder[questionId][N]`.
 */
function buildClientQuestions(
  allQuestions: RawQuestion[],
  shuffleMap: ShuffleMap | null
): Array<{
  id: string
  type: string
  domain: string
  skill: string | null
  difficulty: string
  question: string
  options: string[]
  points: number
  tags: string[]
}> {
  // If no shuffleMap (legacy attempt or shuffled flags off), fall back to
  // original order with no option reordering.
  if (!shuffleMap) {
    return allQuestions.map((q) => ({
      id: q.id,
      type: q.type,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      options: safeParse<string[]>(q.options, []),
      points: q.points,
      tags: safeParse<string[]>(q.tags, []),
    }))
  }

  const byId = new Map(allQuestions.map((q) => [q.id, q]))
  const out: Array<{
    id: string
    type: string
    domain: string
    skill: string | null
    difficulty: string
    question: string
    options: string[]
    points: number
    tags: string[]
  }> = []
  for (const qid of shuffleMap.questionOrder) {
    const q = byId.get(qid)
    if (!q) continue
    const originalOptions = safeParse<string[]>(q.options, [])
    const order = shuffleMap.optionOrder[qid] ?? originalOptions.map((_, i) => i)
    const reorderedOptions = order
      .map((origIdx) => originalOptions[origIdx])
      .filter((s): s is string => typeof s === "string")
    out.push({
      id: q.id,
      type: q.type,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      options: reorderedOptions,
      points: q.points,
      tags: safeParse<string[]>(q.tags, []),
    })
  }
  return out
}
