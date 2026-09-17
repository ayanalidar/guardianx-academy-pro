import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/cyber-quiz/questions
 * ADMIN-only. Returns all quiz questions (with correctAnswer + explanation).
 *
 * Query params: category?, difficulty?, q (search)?, active?
 */
export const GET = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const category = url.searchParams.get("category") || undefined
  const difficulty = url.searchParams.get("difficulty") || undefined
  const q = url.searchParams.get("q") || undefined
  const active = url.searchParams.get("active")

  const where: any = {}
  if (category) where.category = category
  if (difficulty) where.difficulty = difficulty
  if (active === "true") where.active = true
  if (active === "false") where.active = false
  if (q && q.trim()) {
    where.question = { contains: q, mode: "insensitive" }
  }

  const questions = await db.quizQuestion.findMany({
    where,
    orderBy: [{ category: "asc" }, { difficulty: "asc" }],
  })

  return NextResponse.json({ questions, count: questions.length })
})

/* POST /api/admin/cyber-quiz/questions
 * ADMIN-only. Create a new question.
 */
export const POST = withErrorHandler(async (req) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { category, difficulty, question, optionA, optionB, optionC, optionD, correctAnswer, explanation } = body

  const validCats = ["Phishing", "Passwords", "Social Engineering", "Web Safety", "Mobile Security", "Data Privacy", "Malware", "Wi-Fi Safety"]
  const validDiffs = ["Easy", "Hard", "Advanced"]
  const validAns = ["A", "B", "C", "D"]

  if (!validCats.includes(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  if (!validDiffs.includes(difficulty)) return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 })
  if (!question || typeof question !== "string" || question.trim().length < 10) {
    return NextResponse.json({ error: "Question text must be at least 10 characters" }, { status: 400 })
  }
  if (!optionA || !optionB || !optionC || !optionD) {
    return NextResponse.json({ error: "All 4 options are required" }, { status: 400 })
  }
  if (!validAns.includes(correctAnswer)) return NextResponse.json({ error: "correctAnswer must be A, B, C, or D" }, { status: 400 })

  const created = await db.quizQuestion.create({
    data: {
      category,
      difficulty,
      question: question.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      correctAnswer,
      explanation: explanation?.trim() || null,
      active: true,
    },
  })

  return NextResponse.json({ ok: true, question: created }, { status: 201 })
})
