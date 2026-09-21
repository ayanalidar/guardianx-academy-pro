import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/cyber-quiz/questions?difficulty=Easy|Hard|Advanced
 * Public endpoint - returns 30 random questions for the candidate's chosen
 * difficulty. Does NOT reveal correctAnswer or explanation in the response
 * (those come back only after submission, in review mode).
 *
 * Returns: { questions: [{ id, category, difficulty, question, optionA, optionB, optionC, optionD }], attemptId }
 */
const DIFFICULTIES = ["Easy", "Hard", "Advanced"]

export const GET = withErrorHandler(async (req) => {
  const url = new URL(req.url)
  const difficulty = url.searchParams.get("difficulty") || "Easy"
  if (!DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: "Difficulty must be Easy, Hard, or Advanced" }, { status: 400 })
  }

  // For Easy mode: all Easy questions. For Hard: mix of Easy + Hard + some Advanced.
  // For Advanced: all Advanced + some Hard. This gives a smooth difficulty curve.
  let where: any = { active: true }
  if (difficulty === "Easy") {
    where.difficulty = "Easy"
  } else if (difficulty === "Hard") {
    where.difficulty = { in: ["Easy", "Hard"] }
  } else {
    // Advanced
    where.difficulty = { in: ["Hard", "Advanced"] }
  }

  // Fetch all active questions for this difficulty pool, then randomize + take 30
  const pool = await db.quizQuestion.findMany({
    where,
    select: {
      id: true,
      category: true,
      difficulty: true,
      question: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      // NOTE: do NOT select correctAnswer or explanation - client mustn't see them
    },
  })

  if (pool.length < 30) {
    return NextResponse.json(
      { error: "Not enough questions in the pool. Please try a different difficulty." },
      { status: 500 }
    )
  }

  // Fisher-Yates shuffle
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const questions = shuffled.slice(0, 30)

  return NextResponse.json({
    questions,
    count: questions.length,
    difficulty,
    timeLimitMin: 30,
    passPercentage: 50,
  })
})
