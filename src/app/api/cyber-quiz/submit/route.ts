import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { signAttemptToken } from "@/lib/link-signing"

export const runtime = "nodejs"

/* POST /api/cyber-quiz/submit
 * Public endpoint (guest-friendly). Submits answers, computes score, creates
 * a CyberQuizAttempt. Does NOT reveal correctAnswer in the response — only
 * the score + pass/fail + per-domain breakdown.
 *
 * Body: {
 *   difficulty: "Easy" | "Hard" | "Advanced",
 *   answers: [{ questionId, selected: "A"|"B"|"C"|"D" }]  // 30 items
 * }
 *
 * Returns: { attemptId, resultToken, score, totalQuestions, percentage, passed, domainScores, difficulty }
 */
const DIFFICULTIES = ["Easy", "Hard", "Advanced"]
const CATEGORIES = ["Phishing", "Passwords", "Social Engineering", "Web Safety", "Mobile Security", "Data Privacy", "Malware", "Wi-Fi Safety"]

export const POST = withErrorHandler(async (req) => {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { difficulty, answers } = body ?? {}

  if (!difficulty || !DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: "Difficulty must be Easy, Hard, or Advanced" }, { status: 400 })
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "Answers array is required" }, { status: 400 })
  }
  if (answers.length !== 30) {
    return NextResponse.json({ error: `Expected 30 answers, received ${answers.length}` }, { status: 400 })
  }

  // Fetch the correct answers for the submitted question IDs
  const questionIds = answers.map((a: any) => a.questionId)
  const questions = await db.quizQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, category: true, correctAnswer: true },
  })

  if (questions.length !== 30) {
    return NextResponse.json({ error: "Some submitted question IDs are invalid" }, { status: 400 })
  }

  // Compute score + per-domain breakdown
  const domainScores: Record<string, { correct: number; total: number }> = {}
  for (const cat of CATEGORIES) domainScores[cat] = { correct: 0, total: 0 }

  let correctCount = 0
  for (const ans of answers) {
    const q = questions.find((x) => x.id === ans.questionId)
    if (!q) continue
    domainScores[q.category].total++
    if (q.correctAnswer === ans.selected) {
      correctCount++
      domainScores[q.category].correct++
    }
  }

  const percentage = Math.round((correctCount / 30) * 100)
  const passed = percentage >= 50

  // Resolve the current user (optional — guests can submit)
  const currentUser = await getCurrentUser().catch(() => null)

  // Build the persisted answers array (store questionId + selected only)
  const persistedAnswers = answers.map((a: any) => ({ questionId: a.questionId, selected: a.selected }))
  const persistedQuestionIds = questionIds

  const attempt = await db.cyberQuizAttempt.create({
    data: {
      userId: currentUser?.id || null,
      guestEmail: null, // captured at payment step
      guestName: null,
      difficulty,
      questionIds: JSON.stringify(persistedQuestionIds),
      answers: JSON.stringify(persistedAnswers),
      score: correctCount,
      totalQuestions: 30,
      percentage,
      passed,
      domainScores: JSON.stringify(domainScores),
      completedAt: new Date(),
    },
  })

  return NextResponse.json({
    attemptId: attempt.id,
    // HMAC-signed proof that this result belongs to whoever holds this
    // response — lets guests (no session) fetch their own results without
    // exposing PII to anyone who guesses the CUID.
    resultToken: signAttemptToken(attempt.id),
    score: correctCount,
    totalQuestions: 30,
    percentage,
    passed,
    domainScores,
    difficulty,
  })
})
