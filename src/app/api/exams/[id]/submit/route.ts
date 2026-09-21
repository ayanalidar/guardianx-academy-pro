import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { requireSecret } from "@/lib/secrets"
import { generateCredentialId, generateVerificationHash } from "@/lib/credentials"

export const runtime = "nodejs"

/**
 * POST /api/exams/[id]/submit
 * AUTHENTICATED - submit exam answers, calculate score, return result.
 *
 * Body shape:
 *   {
 *     attemptId: string,
 *     answers: Array<{
 *       questionId: string,
 *       selected: number | number[] | "true" | "false" | null
 *     }>,
 *     proctorFlags?: Array<{ type: string; timestamp: number; detail: string }>,
 *     timeSpent?: number  // seconds
 *   }
 *
 * Behaviour:
 *   - Looks up the attempt, verifies ownership + exam match.
 *   - Loads the attempt's `shuffleMap` (persisted on start) so the client's
 *     displayed option indices can be mapped back to the original option
 *     indices before comparing to `correctAnswer` from the QuestionBank.
 *   - Grades each answer server-side (the client never sees correctAnswer).
 *   - Persists the answers (in ORIGINAL option-index space, so the review
 *     page can render them against the unshuffled options) + score + status.
 *   - If score >= passingScore: marks attempt "passed" and issues a
 *     GuardianCredential (idempotent - only one credential per attempt).
 *   - Returns the score, per-question `correct: true/false`, and the per-domain
 *     breakdown + the issued credential (if any).
 *
 * Privacy: For questions the user got WRONG, the response NEVER includes
 * `correctAnswer` or `explanation` - only `correct: false`. For questions the
 * user got right, `correctAnswer` + `explanation` are included (the user
 * already chose correctly, so revealing the answer leaks nothing new).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: examId } = await params
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const attemptId: string | undefined = body?.attemptId
  const answersRaw: any[] = Array.isArray(body?.answers) ? body.answers : []
  const proctorFlags: any[] = Array.isArray(body?.proctorFlags)
    ? body.proctorFlags
    : []
  const timeSpent: number | undefined =
    typeof body?.timeSpent === "number" ? body.timeSpent : undefined

  if (!attemptId) {
    return NextResponse.json(
      { error: "Missing attemptId in body." },
      { status: 400 }
    )
  }

  // Load the attempt and verify ownership + exam match
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: { certification: true } } },
  })

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 })
  }
  if (attempt.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }
  if (attempt.examId !== examId) {
    return NextResponse.json(
      { error: "Attempt does not belong to this exam." },
      { status: 400 }
    )
  }
  if (attempt.status !== "in-progress") {
    return NextResponse.json(
      { error: `Attempt already ${attempt.status}.` },
      { status: 400 }
    )
  }

  // Load the shuffle map persisted on start (may be null for legacy attempts).
  const shuffleMap = safeParse<ShuffleMap | null>(attempt.shuffleMap, null)

  // Load all questions for this exam
  const questions = await db.questionBank.findMany({
    where: { examId },
    select: {
      id: true,
      type: true,
      domain: true,
      skill: true,
      difficulty: true,
      question: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      points: true,
    },
  })

  const qById = new Map(questions.map((q) => [q.id, q]))

  // Grade each answer
  const gradedAnswers: any[] = []
  let totalCorrect = 0
  let totalEarnedPoints = 0
  let totalPossiblePoints = 0
  const domainStats: Record<
    string,
    { correct: number; total: number; pointsEarned: number; pointsPossible: number }
  > = {}

  for (const ans of answersRaw) {
    const q = qById.get(ans.questionId)
    if (!q) continue

    // Convert the client's displayed selection into the original-option-index
    // space using the shuffleMap (so it can be compared to `correctAnswer`).
    const selectedInOriginalSpace = mapSelectedToOriginal(
      q.id,
      q.type,
      ans.selected,
      shuffleMap
    )

    const correct = isAnswerCorrect(q, selectedInOriginalSpace)
    const earned = correct ? q.points : 0
    totalPossiblePoints += q.points
    totalEarnedPoints += earned
    if (correct) totalCorrect += 1

    // Domain aggregation
    if (!domainStats[q.domain]) {
      domainStats[q.domain] = {
        correct: 0,
        total: 0,
        pointsEarned: 0,
        pointsPossible: 0,
      }
    }
    domainStats[q.domain].total += 1
    domainStats[q.domain].pointsPossible += q.points
    if (correct) {
      domainStats[q.domain].correct += 1
      domainStats[q.domain].pointsEarned += earned
    }

    gradedAnswers.push({
      questionId: q.id,
      selected: selectedInOriginalSpace ?? null,
      correct,
      points: q.points,
      earned,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      type: q.type,
      question: q.question,
      options: safeParse(q.options, [] as string[]),
      // Privacy: only reveal the correct answer + explanation when the user
      // got the question right. For wrong answers, the client only learns
      // `correct: false` (no correctAnswer, no explanation).
      correctAnswer: correct ? safeParse(q.correctAnswer, null) : null,
      explanation: correct ? q.explanation ?? null : null,
    })
  }

  // Account for unanswered questions
  for (const q of questions) {
    const answered = gradedAnswers.find((a) => a.questionId === q.id)
    if (!answered) {
      totalPossiblePoints += q.points
      if (!domainStats[q.domain]) {
        domainStats[q.domain] = {
          correct: 0,
          total: 0,
          pointsEarned: 0,
          pointsPossible: 0,
        }
      }
      domainStats[q.domain].total += 1
      domainStats[q.domain].pointsPossible += q.points
      gradedAnswers.push({
        questionId: q.id,
        selected: null,
        correct: false,
        points: q.points,
        earned: 0,
        domain: q.domain,
        skill: q.skill,
        difficulty: q.difficulty,
        type: q.type,
        question: q.question,
        options: safeParse(q.options, [] as string[]),
        // Unanswered = wrong → do not reveal the correct answer.
        correctAnswer: null,
        explanation: null,
      })
    }
  }

  // The total questions that count = either the shuffleMap subset size
  // (new attempts) or the full question bank (legacy attempts without a
  // shuffleMap). For new attempts, only the questions in the shuffleMap are
  // presented to the user, so unanswered questions outside that subset should
  // NOT count against the score.
  let totalQuestions: number
  if (shuffleMap && Array.isArray(shuffleMap.questionOrder)) {
    totalQuestions = shuffleMap.questionOrder.length
    // Recompute totals restricted to the presented subset.
    const subsetIds = new Set(shuffleMap.questionOrder)
    totalPossiblePoints = 0
    totalEarnedPoints = 0
    for (const ga of gradedAnswers) {
      if (!subsetIds.has(ga.questionId)) continue
      totalPossiblePoints += ga.points
      totalEarnedPoints += ga.earned
    }
    // Re-aggregate domain stats for the subset only
    const subsetDomainStats: typeof domainStats = {}
    for (const ga of gradedAnswers) {
      if (!subsetIds.has(ga.questionId)) continue
      if (!subsetDomainStats[ga.domain]) {
        subsetDomainStats[ga.domain] = {
          correct: 0,
          total: 0,
          pointsEarned: 0,
          pointsPossible: 0,
        }
      }
      subsetDomainStats[ga.domain].total += 1
      subsetDomainStats[ga.domain].pointsPossible += ga.points
      if (ga.correct) {
        subsetDomainStats[ga.domain].correct += 1
        subsetDomainStats[ga.domain].pointsEarned += ga.earned
      }
    }
    // Replace domainStats with the subset-restricted version.
    for (const k of Object.keys(domainStats)) delete domainStats[k]
    for (const k of Object.keys(subsetDomainStats)) domainStats[k] = subsetDomainStats[k]
    // Drop graded answers for questions outside the subset (they shouldn't
    // be returned to the client either).
    const filteredGraded = gradedAnswers.filter((ga) => subsetIds.has(ga.questionId))
    filteredGraded.forEach((ga, i) => { gradedAnswers[i] = ga })
    gradedAnswers.length = filteredGraded.length
  } else {
    totalQuestions = questions.length
  }

  const percentage =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0

  const passingScore = attempt.exam.passingScore
  const passed = percentage >= passingScore
  const newStatus = passed ? "passed" : "failed"

  // Persist attempt update
  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: newStatus,
      submittedAt: new Date(),
      score: percentage,
      totalQuestions,
      correctAnswers: totalCorrect,
      answers: JSON.stringify(
        gradedAnswers.map((a) => ({
          questionId: a.questionId,
          selected: a.selected,
          correct: a.correct,
          points: a.points,
          earned: a.earned,
          domain: a.domain,
        }))
      ),
      proctorFlags: JSON.stringify(proctorFlags),
      timeSpent,
    },
  })

  // Update the proctoring session - close it
  await db.proctoringSession.updateMany({
    where: { examAttemptId: attempt.id },
    data: { endedAt: new Date() },
  })

  // Issue a credential if passed and a certification is linked
  let credential: any = null
  if (passed && attempt.exam.certificationId) {
    // Idempotent - check whether this attempt already issued a credential
    const existing = await db.guardianCredential.findFirst({
      where: { examAttemptId: attempt.id, userId: user.id },
    })
    if (!existing) {
      const year = new Date().getFullYear()
      const credentialId = await generateUniqueCredentialId(year)
      const verificationHash = await generateVerificationHash(
        credentialId,
        user.id,
        attempt.exam.certificationId,
        new Date()
      )
      const validityMonths =
        attempt.exam.certification?.validityPeriod ?? 36
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + validityMonths)
      const skillsAssessed =
        attempt.exam.certification?.skills ?? "[]"

      credential = await db.guardianCredential.create({
        data: {
          credentialId,
          userId: user.id,
          certificationId: attempt.exam.certificationId,
          examAttemptId: attempt.id,
          candidateName: user.name,
          score: percentage,
          skillsAssessed,
          examType: "proctored",
          issueDate: new Date(),
          expiryDate,
          status: "valid",
          verificationHash,
          // Human-facing verify URL (was /api/credentials/verify/<id> - a raw
          // JSON endpoint - so "Copy Verification URL" handed recruiters JSON).
          verificationUrl: `/verify/${credentialId}`,
        },
      })
    } else {
      credential = existing
    }
  }

  // Build the per-domain breakdown for the response
  const domainBreakdown = Object.entries(domainStats).map(
    ([domain, s]) => ({
      domain,
      correct: s.correct,
      total: s.total,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      pointsEarned: s.pointsEarned,
      pointsPossible: s.pointsPossible,
    })
  )

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      status: newStatus,
      score: percentage,
      totalQuestions,
      correctAnswers: totalCorrect,
      timeSpent: timeSpent ?? null,
      submittedAt: new Date().toISOString(),
      passed,
    },
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      passingScore,
      duration: attempt.exam.duration,
      certificationId: attempt.exam.certificationId,
      certificationName: attempt.exam.certification?.name ?? null,
    },
    grading: {
      totalEarnedPoints,
      totalPossiblePoints,
      domainBreakdown,
    },
    answers: gradedAnswers,
    credential: credential
      ? {
          id: credential.id,
          credentialId: credential.credentialId,
          certificationId: credential.certificationId,
          candidateName: credential.candidateName,
          score: credential.score,
          issueDate: credential.issueDate,
          expiryDate: credential.expiryDate,
          status: credential.status,
          verificationUrl: credential.verificationUrl,
        }
      : null,
  })
}

/* ------------------------------------------------------------------ */
/* Types + helpers                                                    */
/* ------------------------------------------------------------------ */

interface ShuffleMap {
  questionOrder: string[]
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

/**
 * mapSelectedToOriginal - converts the client's `selected` value (which
 * references DISPLAYED option indices, i.e. positions in the shuffled
 * options array) to the ORIGINAL option indices used by the QuestionBank's
 * `correctAnswer` field.
 *
 * - For mcq: `selected` is a single displayed index → map to original via
 *   `shuffleMap.optionOrder[questionId][selected]`.
 * - For multiple: `selected` is an array of displayed indices → map each.
 * - For truefalse: `selected` is "true"/"false" (a string) → returned as-is
 *   (true/false doesn't depend on option order).
 * - For null/undefined: returns null.
 * - If `shuffleMap` is null (legacy attempt) OR there's no optionOrder entry
 *   for this question: returns `selected` unchanged.
 */
function mapSelectedToOriginal(
  questionId: string,
  questionType: string,
  selected: any,
  shuffleMap: ShuffleMap | null
): any {
  if (selected === null || selected === undefined) return null

  // truefalse answers are sent as strings ("true"/"false"), not indices - 
  // no mapping needed.
  if (questionType === "truefalse") {
    return selected
  }

  if (!shuffleMap || !shuffleMap.optionOrder) return selected
  const order = shuffleMap.optionOrder[questionId]
  if (!Array.isArray(order) || order.length === 0) return selected

  if (questionType === "multiple") {
    if (!Array.isArray(selected)) return selected
    const mapped = selected
      .map((i: any) => (typeof i === "number" && i >= 0 && i < order.length ? order[i] : i))
      .filter((i: any) => typeof i === "number")
    return mapped.sort((a: number, b: number) => a - b)
  }

  // mcq (default)
  if (typeof selected === "number") {
    if (selected >= 0 && selected < order.length) return order[selected]
  }
  return selected
}

function isAnswerCorrect(
  q: {
    type: string
    correctAnswer: string
  },
  selected: any
): boolean {
  const correct = safeParse<any>(q.correctAnswer, null)
  if (correct === null) return false

  if (q.type === "multiple") {
    if (!Array.isArray(selected) || !Array.isArray(correct)) return false
    if (selected.length !== correct.length) return false
    const selSorted = [...selected].sort()
    const corrSorted = [...correct].sort()
    return selSorted.every((v, i) => v === corrSorted[i])
  }

  if (q.type === "truefalse") {
    // Stored as index 0/1 OR literal "true"/"false"
    if (typeof correct === "number") {
      return selected === correct
    }
    if (typeof correct === "string") {
      return (
        String(selected).toLowerCase() === correct.toLowerCase()
      )
    }
    return false
  }

  // mcq (default)
  if (typeof correct === "number") {
    return selected === correct
  }
  return false
}

async function generateUniqueCredentialId(year: number): Promise<string> {
  // GX-CERT-YYYY-XXXXXX - 6 crypto-random hex chars (16.7M combos/year).
  // Was: Math.floor(1000 + Math.random()*9000) → only 9,000 enumerable IDs.
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateCredentialId("GX-CERT").replace(
      /^GX-CERT-\d{4}-/, `GX-CERT-${year}-`
    )
    const exists = await db.guardianCredential.findUnique({
      where: { credentialId: id },
      select: { id: true },
    })
    if (!exists) return id
  }
  // Fallback - timestamp suffix (still non-guessable suffix)
  return `GX-CERT-${year}-${Date.now().toString(36).toUpperCase()}`
}

