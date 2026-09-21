import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// AI Learning Assistant - POST a question, get an AI response.
// Stores chat session + messages. Uses z-ai-web-dev-sdk LLM.
// ============================================================

const SYSTEM_PROMPT = `You are GuardianX AI, an elite cybersecurity tutor embedded in the GuardianX Academy LMS platform.
Your role:
- Help students understand cybersecurity concepts (networking, web security, cryptography, forensics, pentesting, governance, IAM/PAM, etc.)
- Explain clearly with concrete examples; prefer bullet points and small code snippets when useful.
- Encourage hands-on practice and reference relevant labs/certifications when relevant.
- Never provide instructions for attacking real-world systems you do not own. Focus on legal, educational, defensive + authorized offensive security practice.
- Keep responses focused (under ~350 words) unless the user asks for depth.
- If context is provided (course/lab), tailor the answer to that context.`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!rateLimit(`ai-assistant:${user.id}`, { max: 20, windowMs: 5 * 60 * 1000 })) {
      return NextResponse.json({ error: "Rate limit reached - please wait a moment before asking again." }, { status: 429 })
    }

    const body = await req.json()
    const { question, context, sessionId } = body as {
      question?: string
      context?: { courseId?: string; labId?: string; label?: string }
      sessionId?: string
    }

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // ---- Resolve context info (course title / lab title) for the system prompt ----
    let contextBlock = ""
    if (context?.courseId) {
      const course = await db.course.findUnique({
        where: { id: context.courseId },
        select: { title: true, shortName: true, category: true, level: true },
      })
      if (course) {
        contextBlock = `\n[Context] The student is currently studying course: ${course.shortName} - ${course.title} (${course.category}, ${course.level}).`
      }
    } else if (context?.labId) {
      const lab = await db.lab.findUnique({
        where: { id: context.labId },
        select: { title: true, category: true, difficulty: true },
      })
      if (lab) {
        contextBlock = `\n[Context] The student is working on lab: ${lab.title} (${lab.category}, ${lab.difficulty}).`
      }
    } else if (context?.label) {
      contextBlock = `\n[Context] Page: ${context.label}.`
    }

    // ---- Find or create session ----
    let session: any = null // typed as any - findFirst+create return shapes differ (pre-existing)
    if (sessionId) {
      session = await db.aIChatSession.findFirst({
        where: { id: sessionId, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    }
    if (!session) {
      session = await db.aIChatSession.create({
        data: {
          userId: user.id,
          courseId: context?.courseId ?? null,
          labId: context?.labId ?? null,
          context: context?.label ?? "",
        },
        include: { messages: true },
      })
    }

    // ---- Build the conversation history for the LLM ----
    const history: ChatMessage[] = [
      { role: "assistant", content: SYSTEM_PROMPT + contextBlock },
    ]
    for (const m of session.messages) {
      history.push({ role: m.role as "user" | "assistant", content: m.content })
    }
    history.push({ role: "user", content: question })

    // ---- Persist the user's message immediately ----
    await db.aIChatMessage.create({
      data: { sessionId: session.id, role: "user", content: question },
    })

    // ---- Call the LLM ----
    let aiResponse: string
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: history,
        thinking: { type: "disabled" },
      })
      aiResponse =
        completion?.choices?.[0]?.message?.content?.trim() ||
        "I couldn't generate a response just now. Please try rephrasing your question."
    } catch (err: any) {
      console.error("[ai-assistant] LLM call failed:", err?.message)
      aiResponse =
        "I'm having trouble reaching the AI service right now. Please try again in a moment. " +
        "In the meantime, try searching the lesson material or asking in the community discussion."
    }

    // ---- Persist the assistant message ----
    await db.aIChatMessage.create({
      data: { sessionId: session.id, role: "assistant", content: aiResponse },
    })

    // Touch session updatedAt
    await db.aIChatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      sessionId: session.id,
      message: {
        role: "assistant",
        content: aiResponse,
      },
    })
  } catch (err: any) {
    console.error("[ai-assistant] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
