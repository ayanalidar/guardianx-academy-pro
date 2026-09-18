import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Mock Interview
// POST: start a new interview session
//   body: { role, difficulty, questionIds: string[] }
// GET:  list the current user's interview history
// ============================================================

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const interviews = await db.mockInterview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    })

    return NextResponse.json({
      interviews: interviews.map((iv) => ({
        ...iv,
        questions: (() => {
          try {
            return JSON.parse(iv.questions || "[]")
          } catch {
            return []
          }
        })(),
        answers: (() => {
          try {
            return JSON.parse(iv.answers || "[]")
          } catch {
            return []
          }
        })(),
      })),
    })
  } catch (err: any) {
    console.error("[interviews] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!rateLimit(`interviews:${user.id}`, { max: 20, windowMs: 5 * 60 * 1000 })) {
      return NextResponse.json({ error: "Rate limit reached — try again shortly." }, { status: 429 })
    }

    const body = await req.json()
    const { role, difficulty, questionIds } = body as {
      role?: string
      difficulty?: string
      questionIds?: string[]
    }

    if (!role) {
      return NextResponse.json({ error: "role is required" }, { status: 400 })
    }
    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      )
    }

    const questions = await db.interviewQuestion.findMany({
      where: { id: { in: questionIds } },
    })

    if (questions.length === 0) {
      return NextResponse.json({ error: "No valid questions found" }, { status: 400 })
    }

    const interview = await db.mockInterview.create({
      data: {
        userId: user.id,
        role,
        difficulty: difficulty || "intermediate",
        questions: JSON.stringify(
          questions.map((q) => ({
            id: q.id,
            question: q.question,
            expectedAnswer: q.expectedAnswer,
            category: q.category,
            tags: q.tags,
          }))
        ),
        answers: JSON.stringify([]),
      },
    })

    return NextResponse.json({
      interview: {
        ...interview,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          expectedAnswer: q.expectedAnswer,
          category: q.category,
          tags: q.tags,
        })),
        answers: [],
      },
    }, { status: 201 })
  } catch (err: any) {
    console.error("[interviews] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
