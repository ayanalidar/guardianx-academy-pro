import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* PATCH /api/admin/cyber-quiz/questions/[id]
 * ADMIN-only. Update a question (text, options, correctAnswer, explanation,
 * category, difficulty, active).
 */
export const PATCH = withErrorHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const validCats = ["Phishing", "Passwords", "Social Engineering", "Web Safety", "Mobile Security", "Data Privacy", "Malware", "Wi-Fi Safety"]
  const validDiffs = ["Easy", "Hard", "Advanced"]
  const validAns = ["A", "B", "C", "D"]

  const data: any = {}
  if (body.category !== undefined) {
    if (!validCats.includes(body.category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    data.category = body.category
  }
  if (body.difficulty !== undefined) {
    if (!validDiffs.includes(body.difficulty)) return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 })
    data.difficulty = body.difficulty
  }
  if (body.question !== undefined) {
    if (typeof body.question !== "string" || body.question.trim().length < 10) {
      return NextResponse.json({ error: "Question text must be at least 10 characters" }, { status: 400 })
    }
    data.question = body.question.trim()
  }
  for (const opt of ["optionA", "optionB", "optionC", "optionD"]) {
    if (body[opt] !== undefined) {
      if (typeof body[opt] !== "string" || body[opt].trim().length === 0) {
        return NextResponse.json({ error: `${opt} cannot be empty` }, { status: 400 })
      }
      data[opt] = body[opt].trim()
    }
  }
  if (body.correctAnswer !== undefined) {
    if (!validAns.includes(body.correctAnswer)) return NextResponse.json({ error: "correctAnswer must be A, B, C, or D" }, { status: 400 })
    data.correctAnswer = body.correctAnswer
  }
  if (body.explanation !== undefined) {
    data.explanation = typeof body.explanation === "string" ? body.explanation.trim() || null : null
  }
  if (body.active !== undefined) {
    data.active = Boolean(body.active)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await db.quizQuestion.update({ where: { id }, data })
  return NextResponse.json({ ok: true, question: updated })
})

/* DELETE /api/admin/cyber-quiz/questions/[id]
 * ADMIN-only. Hard-delete a question (prefer setting active=false instead).
 */
export const DELETE = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  await db.quizQuestion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
