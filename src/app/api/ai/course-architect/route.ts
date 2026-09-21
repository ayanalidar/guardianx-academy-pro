import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit } from "@/lib/session"
import { domainKnowledgeBlock, domainCatalog, domainExpertLens } from "@/lib/cyber-knowledge"
import { getChatClient } from "@/lib/zai"
import { localBlueprint, localCurriculum, localLesson, localAudit, localAssessment } from "@/lib/ai-fallback"
import type { AuditModuleInput } from "@/lib/ai-fallback"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * POST /api/ai/course-architect
 *
 * The GuardianX AI Course Architect - a cybersecurity content agent with a
 * built-in multi-domain knowledge base (src/lib/cyber-knowledge.ts). It
 * authors everything a course page needs: long description, what-you-will-
 * learn, prerequisites, who-should-attend, tools-covered, career outcomes,
 * and full in-depth module/lesson curricula with teachable content.
 *
 * Auth:  ADMIN/SUPER_ADMIN → any course.
 *        INSTRUCTOR        → only courses they own (instructorId match).
 *        Everyone else     → 403 (surfaced as 404 "not found or not yours").
 *
 * Actions:
 *  blueprint - generate the course-page sections + long description + tags
 *  curriculum - generate a full in-depth module/lesson plan (JSON, not saved)
 *  lesson - expand one existing lesson into full teaching content
 *  apply_curriculum - create reviewed modules+lessons in the DB (append-only,
 *                      never deletes existing content)
 *
 * All generation is review-before-apply: the Studio dialogs show the result
 * and the human commits it.
 */

type LessonType = "reading" | "pdf" | "video" | "lab"
const LESSON_TYPES: LessonType[] = ["reading", "pdf", "video", "lab"]

// ---------------------------------------------------------------------------
// JSON extraction - handles ```json fences, prose wrappers, trailing commas
// ---------------------------------------------------------------------------
function extractJson(raw: string): any {
  if (!raw) throw new Error("empty AI response")
  let text = raw.trim()
  // Strip markdown code fences.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  // Fast path.
  try { return JSON.parse(text) } catch { /* keep digging */ }
  // First { … last } (the model may add prose before/after).
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start !== -1 && end > start) {
    const slice = text.slice(start, end + 1)
    try { return JSON.parse(slice) } catch { /* fall through */ }
    // Tolerate trailing commas inside the slice.
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1"))
    } catch { /* fall through */ }
  }
  throw new Error("AI did not return parseable JSON")
}

const MASTER_PERSONA = `You are the GuardianX Course Architect - a principal-level cybersecurity educator with 15+ years across offensive security, blue-team operations, cloud, GRC and every adjacent domain. You have taught thousands of engineers, authored certification programs and built hands-on labs in enterprise environments.

Your craft rules:
- REAL-WORLD FIRST: every topic must connect to what practitioners actually do with actual tools, not academic definitions.
- DEPTH OVER BREADTH: teach mechanisms (how the attack works at protocol/OS level, why the control fails), not buzzword lists.
- FRAMEWORK-ANCHORED: map techniques to MITRE ATT&CK, OWASP, NIST CSF/800-53, CIS Controls or ISO 27001 where meaningful.
- LAB-DRIVEN: cybersecurity is learned by doing - labs with clear objectives, environment, steps and verifiable deliverables.
- CAREER-HONEST: outcomes describe real market roles and the exact skills interviews probe.
- ETHICS & SAFETY: content is for authorized defenders and testers; always frame offensive techniques with lawful-use context.

You have expert command of these GuardianX domains:
${domainCatalog()}

When a specific domain is provided below, draw on that domain's knowledge block - its tools, frameworks, lab patterns, certifications and career roles - as your authoritative reference, plus the EXPERT LENS (methodology, misconceptions to correct, interview probes) when one is supplied.`

// ---------------------------------------------------------------------------
// Per-action prompts
// ---------------------------------------------------------------------------

function blueprintPrompt(ctx: CourseContext): string {
  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}
${domainExpertLens(ctx.category)}

TASK: Author the public course-page content for this EXISTING course. The content must read like a senior practitioner wrote it - specific, tool-anchored, zero filler.

COURSE CONTEXT:
- Title: ${ctx.title}
- Category: ${ctx.category}
- Level: ${ctx.level}
- Duration: ${ctx.durationHours} hours
- Current short description: ${ctx.description || "(none)"}
- Certification body: ${ctx.certBody || "none specified"}
- Current tags: ${ctx.tags || "(none)"}

Return JSON ONLY (no markdown fences, no commentary) with EXACTLY these keys:
{
  "longDescription": "2-3 rich paragraphs (plain text with \\n\\n between paragraphs). What the course teaches, how it teaches (labs/tools/methodology), and what learners can do afterward. Mention specific tools/techniques.",
  "whatYouWillLearn": ["8-12 outcome bullets. Start each with a strong action verb (Perform, Exploit, Configure, Hunt, Implement, Analyze). Each bullet = a concrete capability, ideally naming the tool/technique/standard. NOT topic restatements."],
  "prerequisites": ["4-6 prerequisite bullets ordered foundational to specific. Honest about what learners genuinely need (concepts, tools, OS familiarity, scripting level)."],
  "whoShouldAttend": ["4-6 audience bullets - roles and career stages this fits, including who should skip it (e.g. not for absolute beginners)."],
  "toolsCovered": ["6-12 specific hands-on tools/technologies learners will actually use, one per item."],
  "careerOutcomes": ["4-6 real job roles / concrete outcomes this prepares for, matching market titles."],
  "tags": "comma-separated, 6-10 lowercase keywords for search/discovery"
}`
}

function curriculumPrompt(ctx: CourseContext, moduleCount: number, depth: string, focusNotes: string): string {
  const depthGuide = depth === "deep"
    ? "DEEP mode: 5-7 lessons per module; reading lessons carry 200-400 words of genuine teaching content (mechanisms, command examples, decision points); labs include Objective / Environment / Steps / Deliverable."
    : "STANDARD mode: 3-5 lessons per module; reading lessons carry 120-250 words of focused teaching content; labs include Objective / Steps / Deliverable."

  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}
${domainExpertLens(ctx.category)}

TASK: Design an in-depth, lab-heavy curriculum for this course. It will be APPENDED to the course's existing content, so cover the full arc of the domain - do not assume other modules exist.

COURSE CONTEXT:
- Title: ${ctx.title}
- Category: ${ctx.category}
- Level: ${ctx.level}
- Duration: ${ctx.durationHours} hours total
- Description: ${ctx.description || "(none)"}
${focusNotes ? `- Instructor focus notes (MUST honor these): ${focusNotes}` : ""}

REQUIREMENTS:
- Exactly ${moduleCount} modules, pedagogically ordered (foundations → core → advanced → capstone).
- ${depthGuide}
- Lesson types: "reading" (theory/teaching), "lab" (hands-on), "video" (demo outline in content), "pdf" (reference material summary). Prefer reading + lab; sprinkle video for demos.
- Realistic durationMin per lesson (reading 15-30, lab 45-90, video 10-20).
- Lessons must teach SPECIFIC techniques with REAL tools - e.g. "Nmap SYN scan & service fingerprinting", not "Introduction to scanning".
- Module 1 lesson 1 is the course orientation → set "preview": true there (free preview lesson).
- Map module themes to frameworks (MITRE ATT&CK tactics, OWASP categories, CIS controls) where natural.
- Capstone/final module should be an integrative scenario or exam-prep module.

Return JSON ONLY (no markdown fences, no commentary):
{
  "modules": [
    {
      "title": "specific, practitioner-style module title",
      "description": "1-2 sentences on scope and why it matters",
      "lessons": [
        {
          "title": "specific lesson title",
          "type": "reading|lab|video|pdf",
          "durationMin": 30,
          "preview": false,
          "content": "markdown teaching content per the depth mode. For labs include **Objective**, **Environment**, **Steps** (numbered), **Deliverable**. Use \\n for newlines, code fences for commands."
        }
      ]
    }
  ]
}`
}

function lessonPrompt(ctx: CourseContext, moduleTitle: string, lesson: { title: string; type: string; content: string }): string {
  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}
${domainExpertLens(ctx.category)}

TASK: Expand ONE lesson into full teaching-grade content that a student can learn from standalone.

COURSE CONTEXT: "${ctx.title}" (${ctx.category}, ${ctx.level}, ${ctx.durationHours}h)
MODULE: "${moduleTitle}"
LESSON: "${lesson.title}" (type: ${lesson.type})
CURRENT CONTENT (may be sparse - deepen, keep any correct specifics it already teaches):
"""
${(lesson.content || "(empty)").slice(0, 4000)}
"""

REQUIREMENTS:
- Markdown, 450-800 words for reading/lab lessons.
- Structure with ## sections. For teaching lessons: Overview → Key Concepts → Deep Dive (mechanisms, how it actually works) → Hands-On (commands/tool walkthrough with code fences) → Common Pitfalls → Key Takeaways.
- For lab lessons: Objective → Environment → Step-by-Step (numbered, exact commands) → Expected Results → Deliverable → Cleanup.
- Name real tools with real flags/syntax. Correctness over volume.
- Keep it lawful/defensive in framing.

Return JSON ONLY:
{
  "title": "improved lesson title if warranted, else the original",
  "durationMin": 30,
  "content": "the full markdown lesson"
}`
}

// ---------------------------------------------------------------------------
// Audit + assessment prompts (agent upgrade: syllabus auditor & exam builder)
// ---------------------------------------------------------------------------

function auditPrompt(
  ctx: CourseContext,
  inventory: { moduleTitle: string; lessons: { title: string; type: string }[] }[],
): string {
  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}
${domainExpertLens(ctx.category)}

TASK: You are the SYLLABUS AUDITOR. Below is the course's FULL current inventory (modules + lesson titles). Audit it the way a principal educator reviews a colleague's course before launch:

1. Score 0-100 each: COVERAGE (breadth of the domain knowledge block actually taught), DEPTH (mechanism-level teaching vs topic listing), PRACTICALITY (hands-on lab ratio and real tool usage).
2. List genuine STRENGTHS (be specific, cite module titles).
3. List GAPS: domain core topics and standard tools that appear nowhere.
4. Give PRIORITIZED RECOMMENDATIONS - concrete, buildable next steps. Each must name the exact artifact to create (module/lesson/lab) and why it matters for employability.

COURSE: "${ctx.title}" (${ctx.category}, ${ctx.level}, ${ctx.durationHours}h)

FULL INVENTORY:
${inventory.map((m, i) => `Module ${i + 1}: ${m.moduleTitle}\n${m.lessons.map((l) => `  - [${l.type}] ${l.title}`).join("\n")}`).join("\n")}

Return JSON ONLY (no markdown fences, no commentary):
{
  "scores": { "coverage": 0-100, "depth": 0-100, "practicality": 0-100, "overall": 0-100 },
  "strengths": ["..."],
  "gaps": ["..."],
  "recommendations": [ { "title": "...", "detail": "...", "severity": "high|medium|low" } ]
}`
}

function assessmentPrompt(
  ctx: CourseContext,
  moduleTitle: string,
  lessonTitles: string[],
  count: number,
): string {
  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}
${domainExpertLens(ctx.category)}

TASK: You are the ASSESSMENT BUILDER. Write ${count} exam-grade multiple-choice questions for the module "${moduleTitle}" of "${ctx.title}".

MODULE LESSONS (questions must test what these teach):
${lessonTitles.map((t) => `  - ${t}`).join("\n") || "  (module has no lessons yet - test the module theme itself)"}

QUESTION CRAFT RULES:
- One BEST answer; distractors must be plausible, same register/length, no joke options.
- Test application and analysis, NOT trivia ("Which tool flag does X?" is banned).
- Mix difficulty: ~30% easy (concept recall), ~50% medium (scenario application), ~20% hard (analysis/misconception correction).
- Every question carries an explanation that TEACHES - why the key is right and what the distractors get wrong.
- Actively correct the domain misconceptions from the expert lens in at least 2 questions.

Return JSON ONLY (no markdown fences, no commentary):
{
  "questions": [
    {
      "text": "...",
      "options": ["...", "...", "...", "..."],
      "answerIndex": 0,
      "explanation": "...",
      "difficulty": "easy|medium|hard",
      "domain": "${ctx.category}"
    }
  ]
}`
}

/** Review-revise critic pass for curated curricula (quality: "reviewed"). */
function curriculumCritiquePrompt(
  ctx: CourseContext,
  modules: { title: string; description?: string; lessons?: { title: string; type: string; content?: string }[] }[],
): string {
  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}

TASK: You are the QUALITY REVIEWER in a two-agent pipeline. Critique this generated curriculum for "${ctx.title}" (${ctx.category}, ${ctx.level}). Score it honestly and find concrete fixes - do not rubber-stamp.

MODULES SUBMITTED:
${modules.map((m, i) => `Module ${i + 1}: ${m.title}\n  Lessons: ${(m.lessons || []).map((l) => `${l.title} [${l.type}]`).join("; ") || "(none)"}`).join("\n")}

CRITIQUE DIMENSIONS: domain coverage gaps, lesson title specificity (tool-level vs vague), lab distribution, pedagogical ordering, level calibration for ${ctx.level}.

Return JSON ONLY:
{
  "score": 0-100,
  "verdict": "one sentence",
  "fixes": ["concrete, actionable fixes - e.g. rename Module 3 lesson 2 to a tool-specific title; add a lab to Module 1; drop X, overlap with Y"]
}`
}

interface CourseContext {
  id: string
  title: string
  description: string
  category: string
  level: string
  durationHours: number
  certBody: string | null
  tags: string
  instructorId: string
}

async function loadCourseForUser(courseId: string, user: { id: string; role: string }): Promise<CourseContext | null> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true, title: true, description: true, category: true, level: true,
      durationHours: true, certBody: true, tags: true, instructorId: true,
    },
  })
  if (!course) return null
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN"
  const isOwner = user.role === "INSTRUCTOR" && course.instructorId === user.id
  if (!isAdmin && !isOwner) return null
  return course
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Run an LLM action with built-in fallback.
 *
 * Guarantees the Studio NEVER gets a mystery 500: if the AI service is not
 * configured (Vercel without ZAI_BASE_URL/ZAI_API_KEY) or the call fails,
 * the built-in GuardianX knowledge generator produces the same response
 * shape deterministically, flagged `source: "built-in"`.
 */
async function withFallback<T>(
  run: (client: ChatClientLike) => Promise<T>,
  fallback: () => T,
): Promise<{ result: T; source: "llm" | "built-in"; warning?: string }> {
  const client = await getChatClient()
  if (client) {
    try {
      return { result: await run(client), source: "llm" }
    } catch (e: any) {
      console.error("[course-architect] LLM call failed, using built-in generator:", e?.message)
      return {
        result: fallback(),
        source: "built-in",
        warning: `AI service unavailable (${String(e?.message || e).slice(0, 140)}) - generated from the built-in GuardianX knowledge base instead.`,
      }
    }
  }
  return {
    result: fallback(),
    source: "built-in",
    warning:
      "Generated from the built-in GuardianX knowledge base. For full LLM-grade generation, set ZAI_BASE_URL and ZAI_API_KEY in the deployment environment.",
  }
}

interface ChatClientLike {
  chat: { completions: { create: (body: any) => Promise<any> } }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`ai-architect:${user.id}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Architect cooling down - try again in a few minutes." }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.action || !body?.courseId) {
    return NextResponse.json({ error: "action and courseId are required" }, { status: 400 })
  }
  const action = String(body.action)
  const courseId = String(body.courseId)

  const course = await loadCourseForUser(courseId, user)
  if (!course) return NextResponse.json({ error: "Course not found or not yours" }, { status: 404 })

  // --------------------------- blueprint ---------------------------
  if (action === "blueprint") {
    const ctx: CourseContext = course
    const { result, source, warning } = await withFallback(
      async (client) => {
        const res = await client.chat.completions.create({
          messages: [{ role: "user", content: blueprintPrompt(ctx) }],
          thinking: { type: "disabled" },
        })
        const data = extractJson(res.choices[0]?.message?.content || "")
        if (!data || typeof data !== "object") throw new Error("empty blueprint response")
        return data
      },
      () => localBlueprint(ctx),
    )
    return NextResponse.json({ ok: true, blueprint: result, source, ...(warning ? { warning } : {}) })
  }

  // --------------------------- curriculum ---------------------------
  if (action === "curriculum") {
    const moduleCount = Math.min(Math.max(parseInt(body.moduleCount, 10) || 6, 3), 10)
    const depth = body.depth === "deep" ? "deep" : "standard"
    const focusNotes = String(body.focusNotes || "").slice(0, 2000)
    const reviewed = body.quality === "reviewed"
    const ctx: CourseContext = course
    let critique: { score: number; verdict: string; fixes: string[] } | null = null
    const { result, source, warning } = await withFallback(
      async (client) => {
        const res = await client.chat.completions.create({
          messages: [{ role: "user", content: curriculumPrompt(ctx, moduleCount, depth, focusNotes) }],
          thinking: { type: "disabled" },
        })
        const data = extractJson(res.choices[0]?.message?.content || "")
        const modules = Array.isArray(data?.modules) ? data.modules : []
        if (!modules.length) throw new Error("no modules in response")

        // ── Two-agent pipeline (generator → critic → reviser) ──
        // Only when the caller asks for "reviewed" quality. Bounded to two
        // extra LLM calls; any failure keeps the unrevised result (never 500).
        if (reviewed) {
          try {
            console.log("[course-architect] critic pass running…")
            const critiqueRes = await client.chat.completions.create({
              messages: [{ role: "user", content: curriculumCritiquePrompt(ctx, modules) }],
              thinking: { type: "disabled" },
            })
            critique = extractJson(critiqueRes.choices[0]?.message?.content || "")
            const critiqueData = critique as { score?: number; verdict?: string; fixes?: unknown } | null
            const fixes: string[] = Array.isArray(critiqueData?.fixes) ? (critiqueData!.fixes as string[]).slice(0, 8).map(String) : []
            if (fixes.length) {
              console.log(`[course-architect] critic score ${critiqueData?.score ?? "?"} - applying ${fixes.length} fixes`)
              const revisePrompt = `${curriculumPrompt(ctx, modules.length, depth, focusNotes)}

IMPORTANT - REVISION PASS. A quality reviewer scored your draft ${critiqueData?.score ?? "?"}/100 and required these fixes (apply ALL of them, keep everything that was already good):
${fixes.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Return the FULL revised curriculum in the same JSON shape.`
              const reviseRes = await client.chat.completions.create({
                messages: [{ role: "user", content: revisePrompt }],
                thinking: { type: "disabled" },
              })
              const revised = extractJson(reviseRes.choices[0]?.message?.content || "")
              const rModules = Array.isArray(revised?.modules) ? revised.modules : []
              if (rModules.length) return { modules: rModules }
            }
          } catch (e: any) {
            console.error("[course-architect] critic/revise pass failed, keeping draft:", e?.message)
          }
        }

        return { modules }
      },
      () => localCurriculum({ ...ctx, moduleCount, depth, focusNotes }),
    )
    return NextResponse.json({
      ok: true,
      modules: result.modules,
      source,
      ...(critique ? { critique } : {}),
      ...(warning ? { warning } : {}),
    })
  }

  // --------------------------- lesson deep-dive ---------------------------
  if (action === "lesson") {
    const lessonId = String(body.lessonId || "")
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 })
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { title: true, type: true, content: true, durationMin: true, module: { select: { title: true, courseId: true } } },
    })
    if (!lesson || lesson.module.courseId !== courseId) {
      return NextResponse.json({ error: "Lesson not found in this course" }, { status: 404 })
    }
    const ctx: CourseContext = course
    const { result, source, warning } = await withFallback(
      async (client) => {
        const res = await client.chat.completions.create({
          messages: [{
            role: "user",
            content: lessonPrompt(ctx, lesson.module.title, {
              title: lesson.title, type: lesson.type, content: lesson.content,
            }),
          }],
          thinking: { type: "disabled" },
        })
        const data = extractJson(res.choices[0]?.message?.content || "")
        if (!data?.content) throw new Error("empty lesson response")
        return {
          title: String(data.title || lesson.title),
          durationMin: Math.max(1, parseInt(data.durationMin, 10) || lesson.durationMin),
          content: String(data.content || ""),
        }
      },
      () => localLesson({ title: ctx.title, category: ctx.category, lesson: { title: lesson.title, type: lesson.type, content: lesson.content } }),
    )
    return NextResponse.json({ ok: true, lesson: result, source, ...(warning ? { warning } : {}) })
  }

  // --------------------------- apply curriculum ---------------------------
  if (action === "apply_curriculum") {
    const incoming = Array.isArray(body.modules) ? body.modules : []
    if (!incoming.length) return NextResponse.json({ error: "modules array required" }, { status: 400 })

    // Hard caps so one request can never flood the course.
    const MAX_MODULES = 12
    const MAX_LESSONS_PER_MODULE = 10
    const MAX_CONTENT_CHARS = 30000

    // Start after the highest existing order.
    const agg = await db.module.aggregate({ where: { courseId }, _max: { order: true } })
    let order = (agg._max.order ?? -1) + 1

    const createdModules: string[] = []
    let createdLessons = 0

    for (const m of incoming.slice(0, MAX_MODULES)) {
      const mTitle = String(m?.title || "").trim().slice(0, 200)
      if (!mTitle) continue
      const created = await db.module.create({
        data: {
          courseId,
          title: mTitle,
          description: String(m?.description || "").slice(0, 1000) || null,
          order: order++,
        },
      })
      createdModules.push(created.id)

      const lessons = Array.isArray(m?.lessons) ? m.lessons : []
      let lOrder = 0
      for (const l of lessons.slice(0, MAX_LESSONS_PER_MODULE)) {
        const lTitle = String(l?.title || "").trim().slice(0, 200)
        if (!lTitle) continue
        const lType = LESSON_TYPES.includes(l?.type) ? l.type : "reading"
        await db.lesson.create({
          data: {
            moduleId: created.id,
            title: lTitle,
            type: lType,
            content: String(l?.content || "").slice(0, MAX_CONTENT_CHARS),
            durationMin: Math.max(1, Math.min(parseInt(l?.durationMin, 10) || 15, 600)),
            order: lOrder++,
            preview: !!l?.preview,
          },
        })
        createdLessons++
      }
    }

    if (!createdModules.length) {
      return NextResponse.json({ error: "No valid modules to create" }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      createdModules: createdModules.length,
      createdLessons,
      moduleIds: createdModules,
    })
  }

  // --------------------------- syllabus audit ---------------------------
  if (action === "audit") {
    const mods = await db.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: {
        title: true,
        lessons: { orderBy: { order: "asc" }, select: { title: true, type: true, content: true } },
      },
    })
    const ctx: CourseContext = course
    const inventory: AuditModuleInput[] = mods.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({ title: l.title, type: l.type, content: l.content })),
    }))
    const { result, source, warning } = await withFallback(
      async (client) => {
        const res = await client.chat.completions.create({
          messages: [{
            role: "user",
            content: auditPrompt(
              ctx,
              inventory.map((m) => ({
                moduleTitle: m.title,
                lessons: m.lessons.map((l) => ({ title: l.title, type: l.type })),
              })),
            ),
          }],
          thinking: { type: "disabled" },
        })
        const data = extractJson(res.choices[0]?.message?.content || "")
        if (!data?.scores) throw new Error("no audit scores in response")
        // Normalize the LLM shape into the guaranteed response contract.
        const norm = (v: any) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
        return {
          scores: {
            coverage: norm(data.scores.coverage),
            depth: norm(data.scores.depth),
            practicality: norm(data.scores.practicality),
            overall: norm(data.scores.overall),
          },
          strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
          gaps: Array.isArray(data.gaps) ? data.gaps.map(String) : [],
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations.slice(0, 8).map((r: any) => ({
                title: String(r?.title || "Recommendation").slice(0, 200),
                detail: String(r?.detail || "").slice(0, 1000),
                severity: r?.severity === "high" || r?.severity === "low" ? r.severity : "medium",
              }))
            : [],
          coverageMap: [],
        }
      },
      () => localAudit({ title: ctx.title, category: ctx.category, level: ctx.level }, inventory),
    )
    return NextResponse.json({ ok: true, audit: result, source, ...(warning ? { warning } : {}) })
  }

  // --------------------------- assessment bank ---------------------------
  if (action === "assessments") {
    const moduleId = String(body.moduleId || "")
    const count = Math.min(Math.max(parseInt(body.count, 10) || 8, 4), 15)
    if (!moduleId) return NextResponse.json({ error: "moduleId required" }, { status: 400 })
    const mod = await db.module.findFirst({
      where: { id: moduleId, courseId },
      select: { title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } },
    })
    if (!mod) return NextResponse.json({ error: "Module not found in this course" }, { status: 404 })
    const ctx: CourseContext = course
    const { result, source, warning } = await withFallback(
      async (client) => {
        const res = await client.chat.completions.create({
          messages: [{
            role: "user",
            content: assessmentPrompt(ctx, mod.title, mod.lessons.map((l) => l.title), count),
          }],
          thinking: { type: "disabled" },
        })
        const data = extractJson(res.choices[0]?.message?.content || "")
        const questions = Array.isArray(data?.questions) ? data.questions : []
        if (!questions.length) throw new Error("no questions in response")
        return {
          questions: questions.slice(0, count).map((q: any, i: number) => {
            const options = Array.isArray(q?.options) ? q.options.map(String) : []
            const answerIndex = Math.max(0, Math.min(parseInt(q?.answerIndex, 10) || 0, Math.max(options.length - 1, 0)))
            return {
              text: String(q?.text || `Question ${i + 1}`).slice(0, 600),
              options,
              answerIndex,
              explanation: String(q?.explanation || "").slice(0, 1200),
              difficulty: q?.difficulty === "easy" || q?.difficulty === "hard" ? q.difficulty : "medium",
              domain: String(q?.domain || ctx.category).slice(0, 60),
            }
          }),
        }
      },
      () => localAssessment({ category: ctx.category, moduleTitle: mod.title, count }),
    )
    return NextResponse.json({
      ok: true,
      module: { id: moduleId, title: mod.title, lessons: mod.lessons },
      questions: result.questions,
      source,
      ...(warning ? { warning } : {}),
    })
  }

  // --------------------------- apply assessments ---------------------------
  if (action === "apply_assessments") {
    // Creates a quiz (title "AI Assessment - <module>") on the chosen lesson
    // and writes the reviewed questions. Mirrors ai-course-generator's write
    // shape (options joined with "|").
    const lessonId = String(body.lessonId || "")
    const moduleTitle = String(body.moduleTitle || "Module").slice(0, 200)
    const questions = Array.isArray(body.questions) ? body.questions : []
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 })
    if (!questions.length) return NextResponse.json({ error: "questions array required" }, { status: 400 })

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    })
    if (!lesson || lesson.module.courseId !== courseId) {
      return NextResponse.json({ error: "Lesson not found in this course" }, { status: 404 })
    }

    const MAX_QUESTIONS = 15
    // Quiz.lessonId is @unique - one quiz per lesson. Surface a clean 409
    // instead of a mystery 500 when the lesson already carries one.
    const existingQuiz = await db.quiz.findUnique({
      where: { lessonId },
      select: { id: true, title: true },
    })
    if (existingQuiz) {
      return NextResponse.json(
        { error: `This lesson already has a quiz ("${existingQuiz.title}"). Pick another lesson or delete the existing quiz first.` },
        { status: 409 },
      )
    }
    const quiz = await db.quiz.create({
      data: { lessonId, title: `AI Assessment - ${moduleTitle}` },
    })
    let written = 0
    for (const q of questions.slice(0, MAX_QUESTIONS)) {
      const text = String(q?.text || "").trim().slice(0, 600)
      const options = Array.isArray(q?.options) ? q.options.map((o: any) => String(o).slice(0, 200)) : []
      if (!text || options.length < 2) continue
      await db.question.create({
        data: {
          quizId: quiz.id,
          text,
          options: options.join("|"),
          answerIndex: Math.max(0, Math.min(parseInt(q?.answerIndex, 10) || 0, options.length - 1)),
          explanation: String(q?.explanation || "").slice(0, 1200),
        },
      })
      written++
    }

    if (!written) {
      return NextResponse.json({ error: "No valid questions to create" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, quizId: quiz.id, created: written })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
