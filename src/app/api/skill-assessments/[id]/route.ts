import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Skill Assessment detail
// GET:  assessment with questions (correct answers hidden until submitted)
// POST: { answers: [{ questionId, selected }] } compute score & persist result
// ============================================================

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const a = await db.skillAssessment.findUnique({
    where: { id },
    include: { questions: { orderBy: { id: "asc" } } },
  })
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })

  return NextResponse.json({
    assessment: {
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      difficulty: a.difficulty,
      duration: a.duration,
      questions: a.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options || "[]"),
        skillTag: q.skillTag,
        points: q.points,
        // correctAnswer intentionally omitted
      })),
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const a = await db.skillAssessment.findUnique({
    where: { id },
    include: { questions: true },
  })
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })

  const body = await req.json()
  const answers: { questionId: string; selected: number }[] = body?.answers ?? []
  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: "answers must be an array" }, { status: 400 })
  }

  let correctCount = 0
  let totalPoints = 0
  let earnedPoints = 0
  const skillScores: Record<string, { correct: number; total: number }> = {}

  for (const q of a.questions) {
    totalPoints += q.points
    const ans = answers.find((x) => x.questionId === q.id)
    const tag = q.skillTag || "general"
    if (!skillScores[tag]) skillScores[tag] = { correct: 0, total: 0 }
    skillScores[tag].total += 1
    if (ans && ans.selected === q.correctAnswer) {
      correctCount += 1
      earnedPoints += q.points
      skillScores[tag].correct += 1
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const passed = score >= 70

  const result = await db.skillAssessmentResult.create({
    data: {
      assessmentId: id,
      userId: user.id,
      answers: JSON.stringify(answers),
      score,
      passed,
      skillScores: JSON.stringify(skillScores),
    },
  })

  return NextResponse.json({
    result: {
      id: result.id,
      score,
      passed,
      correctCount,
      totalQuestions: a.questions.length,
      earnedPoints,
      totalPoints,
      skillScores: Object.entries(skillScores).map(([skill, v]) => ({
        skill,
        correct: v.correct,
        total: v.total,
        percentage: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      })),
      explanations: a.questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        options: JSON.parse(q.options || "[]"),
        selected: answers.find((x) => x.questionId === q.id)?.selected ?? null,
      })),
    },
  })
}
