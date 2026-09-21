import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Mock Interview - single interview resource
// GET:  fetch interview + questions + answers
// POST: submit answer (and optionally auto-grade via LLM)
// ============================================================

interface QandA {
  id: string
  question: string
  expectedAnswer: string
  category: string
  tags: string
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const interview = await db.mockInterview.findFirst({
      where: { id, userId: user.id },
    })
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    return NextResponse.json({
      interview: {
        ...interview,
        questions: parseJson<QandA[]>(interview.questions, []),
        answers: parseJson<any[]>(interview.answers, []),
      },
    })
  } catch (err: any) {
    console.error("[interviews/[id]] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const interview = await db.mockInterview.findFirst({
      where: { id, userId: user.id },
    })
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const body = await req.json()
    const { answers, duration, action } = body as {
      answers?: Array<{ questionId: string; answer: string }>
      duration?: number
      action?: "save" | "complete"
    }

    const allAnswers = answers || []
    const questions = parseJson<QandA[]>(interview.questions, [])

    let score = 0
    let feedback = ""

    // If completing, attempt to score via LLM
    if (action === "complete") {
      // Simple heuristic score if LLM unavailable - keyword overlap
      const keywordScores = allAnswers.map((a) => {
        const q = questions.find((qq) => qq.id === a.questionId)
        if (!q || !q.expectedAnswer) return 0
        const expected = q.expectedAnswer.toLowerCase()
        const given = (a.answer || "").toLowerCase()
        const tokens = expected
          .split(/[^a-z0-9]+/i)
          .filter((t) => t.length > 3)
        if (tokens.length === 0) return 50
        const hit = tokens.filter((t) => given.includes(t)).length
        return Math.min(100, Math.round((hit / tokens.length) * 100) + 10)
      })
      score =
        keywordScores.length > 0
          ? Math.round(keywordScores.reduce((a, b) => a + b, 0) / keywordScores.length)
          : 0

      // Try LLM grading (best-effort)
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default
        const zai = await ZAI.create()
        const prompt = `You are grading a mock cybersecurity interview for the role "${interview.role}" (difficulty: ${interview.difficulty}).

For each question, compare the candidate's answer to the expected answer. Score 0-100 across all questions combined.

Output JSON ONLY:
{
  "score": <0-100>,
  "feedback": "<2-3 sentence summary of strengths and weaknesses>"
}

Questions & Answers:
${allAnswers
  .map((a, i) => {
    const q = questions.find((qq) => qq.id === a.questionId)
    return `Q${i + 1}: ${q?.question || "?"}\nExpected: ${q?.expectedAnswer || "(no model answer)"}\nCandidate: ${a.answer || "(no answer)"}`
  })
  .join("\n\n")}`

        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: "You are a strict but fair interviewer. Output JSON only." },
            { role: "user", content: prompt },
          ],
          thinking: { type: "disabled" },
        })
        const raw = completion?.choices?.[0]?.message?.content ?? ""
        const start = raw.indexOf("{")
        const end = raw.lastIndexOf("}")
        if (start !== -1 && end > start) {
          try {
            const parsed = JSON.parse(raw.slice(start, end + 1))
            if (typeof parsed.score === "number") score = Math.max(0, Math.min(100, Math.round(parsed.score)))
            if (typeof parsed.feedback === "string") feedback = parsed.feedback
          } catch {
            /* keep heuristic score */
          }
        }
      } catch (err: any) {
        console.error("[interviews/[id]] LLM grading failed:", err?.message)
        // Fallback feedback if LLM fails
        feedback =
          score >= 80
            ? "Strong answers - covered the key concepts. Practice articulating edge cases."
            : score >= 60
            ? "Decent baseline, but several answers missed critical details. Review the expected answers below."
            : "Several gaps identified. Revisit fundamentals for this role and retry."
      }
    }

    const updated = await db.mockInterview.update({
      where: { id },
      data: {
        answers: JSON.stringify(allAnswers),
        duration: duration ?? interview.duration ?? 0,
        score,
        feedback: feedback || interview.feedback,
        completedAt: action === "complete" ? new Date() : interview.completedAt,
      },
    })

    return NextResponse.json({
      interview: {
        ...updated,
        questions,
        answers: allAnswers,
      },
    })
  } catch (err: any) {
    console.error("[interviews/[id]] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
