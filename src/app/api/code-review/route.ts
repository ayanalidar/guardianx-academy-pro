import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// AI Code Review
// POST: takes code + language, uses LLM to analyze for security
//       issues, returns feedback + score + issues list.
// Stores the result in the CodeReview table.
// ============================================================

const SYSTEM_PROMPT = `You are an elite application security reviewer embedded in the GuardianX Academy LMS platform.
Your job is to analyze source code provided by a student and identify security weaknesses.

Output rules (STRICT):
- Respond with a single valid JSON object and NOTHING ELSE. No markdown fences, no prose before/after.
- JSON schema:
  {
    "score": <0-100 integer, 100 = no issues, 0 = critical/RCE>,
    "summary": "<1-2 sentence summary of overall security posture>",
    "issues": [
      {
        "severity": "critical" | "high" | "medium" | "low" | "info",
        "category": "<OWASP category or short tag like 'sql-injection', 'xss', 'hardcoded-secret', 'insecure-deserialization', 'path-traversal', 'weak-crypto', 'command-injection', 'auth-bypass', 'info-disclosure', 'misc'>",
        "title": "<short title>",
        "description": "<1-3 sentence explanation>",
        "location": "<approximate line/function/module>",
        "remediation": "<how to fix it>"
      }
    ],
    "goodPractices": ["<optional list of things the code does right>"]
  }
- If the code is too short or trivial (e.g. hello world), still return a valid JSON with score=100, summary, empty issues array, and one goodPractice.
- Always respond in valid JSON. If you cannot analyze, return {"score":0,"summary":"Could not analyze","issues":[],"goodPractices":[]}.
- Severity weighting for score: critical=-40, high=-25, medium=-12, low=-5, info=-1. Clamp to [0,100].
- Never invent line numbers if the code is line-free; use function or symbol names instead.
- Be concise. Each description ≤ 60 words.`

interface ParsedReview {
  score: number
  summary: string
  issues: Array<{
    severity: string
    category: string
    title: string
    description: string
    location: string
    remediation: string
  }>
  goodPractices?: string[]
}

function tryParseJson(raw: string): ParsedReview | null {
  if (!raw) return null
  // Strip ```json fences if present
  let s = raw.trim()
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
  }
  // Find first { and last } to tolerate stray text
  const start = s.indexOf("{")
  const end = s.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = s.slice(start, end + 1)
  try {
    return JSON.parse(candidate) as ParsedReview
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!rateLimit(`code-review:${user.id}`, { max: 10, windowMs: 5 * 60 * 1000 })) {
      return NextResponse.json({ error: "Rate limit reached — try again in a few minutes." }, { status: 429 })
    }

    const body = await req.json()
    const { code, language, courseId, labId } = body as {
      code?: string
      language?: string
      courseId?: string
      labId?: string
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }
    if (code.length > 20000) {
      return NextResponse.json(
        { error: "Code is too long (max 20,000 chars)" },
        { status: 400 }
      )
    }

    const lang = language || "python"

    // ---- Call the LLM ----
    let parsed: ParsedReview | null = null
    let rawFeedback = ""
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Language: ${lang}\n\nCode:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nAnalyze the above code for security issues and respond with the JSON object per the schema.`,
          },
        ],
        thinking: { type: "disabled" },
      })
      rawFeedback = completion?.choices?.[0]?.message?.content ?? ""
      parsed = tryParseJson(rawFeedback)
    } catch (err: any) {
      console.error("[code-review] LLM call failed:", err?.message)
    }

    // Fallback if LLM failed or returned unparseable output
    if (!parsed) {
      parsed = {
        score: 0,
        summary:
          "We couldn't run an AI analysis on this submission right now. Please try again in a moment.",
        issues: [],
        goodPractices: [],
      }
      rawFeedback = rawFeedback || JSON.stringify(parsed)
    }

    // Clamp score
    parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)))

    // ---- Persist the review ----
    const review = await db.codeReview.create({
      data: {
        userId: user.id,
        courseId: courseId || null,
        labId: labId || null,
        language: lang,
        code,
        feedback: rawFeedback.slice(0, 8000), // truncate if absurd
        score: parsed.score,
        issues: JSON.stringify(parsed.issues ?? []),
      },
    })

    return NextResponse.json({
      reviewId: review.id,
      score: parsed.score,
      summary: parsed.summary,
      issues: parsed.issues ?? [],
      goodPractices: parsed.goodPractices ?? [],
      language: lang,
    })
  } catch (err: any) {
    console.error("[code-review] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
