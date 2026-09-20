import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit } from "@/lib/session"
import { domainKnowledgeBlock, domainCatalog } from "@/lib/cyber-knowledge"
import ZAI from "z-ai-web-dev-sdk"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * POST /api/ai/course-architect
 *
 * The GuardianX AI Course Architect — a cybersecurity content agent with a
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
 *  blueprint         — generate the course-page sections + long description + tags
 *  curriculum        — generate a full in-depth module/lesson plan (JSON, not saved)
 *  lesson            — expand one existing lesson into full teaching content
 *  apply_curriculum  — create reviewed modules+lessons in the DB (append-only,
 *                      never deletes existing content)
 *
 * All generation is review-before-apply: the Studio dialogs show the result
 * and the human commits it.
 */

type LessonType = "reading" | "pdf" | "video" | "lab"
const LESSON_TYPES: LessonType[] = ["reading", "pdf", "video", "lab"]

// ---------------------------------------------------------------------------
// JSON extraction — handles ```json fences, prose wrappers, trailing commas
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

const MASTER_PERSONA = `You are the GuardianX Course Architect — a principal-level cybersecurity educator with 15+ years across offensive security, blue-team operations, cloud, GRC and every adjacent domain. You have taught thousands of engineers, authored certification programs and built hands-on labs in enterprise environments.

Your craft rules:
- REAL-WORLD FIRST: every topic must connect to what practitioners actually do with actual tools, not academic definitions.
- DEPTH OVER BREADTH: teach mechanisms (how the attack works at protocol/OS level, why the control fails), not buzzword lists.
- FRAMEWORK-ANCHORED: map techniques to MITRE ATT&CK, OWASP, NIST CSF/800-53, CIS Controls or ISO 27001 where meaningful.
- LAB-DRIVEN: cybersecurity is learned by doing — labs with clear objectives, environment, steps and verifiable deliverables.
- CAREER-HONEST: outcomes describe real market roles and the exact skills interviews probe.
- ETHICS & SAFETY: content is for authorized defenders and testers; always frame offensive techniques with lawful-use context.

You have expert command of these GuardianX domains:
${domainCatalog()}

When a specific domain is provided below, draw on that domain's knowledge block — its tools, frameworks, lab patterns, certifications and career roles — as your authoritative reference.`

// ---------------------------------------------------------------------------
// Per-action prompts
// ---------------------------------------------------------------------------

function blueprintPrompt(ctx: CourseContext): string {
  return `${MASTER_PERSONA}

${domainKnowledgeBlock(ctx.category)}

TASK: Author the public course-page content for this EXISTING course. The content must read like a senior practitioner wrote it — specific, tool-anchored, zero filler.

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

TASK: Design an in-depth, lab-heavy curriculum for this course. It will be APPENDED to the course's existing content, so cover the full arc of the domain — do not assume other modules exist.

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
- Lessons must teach SPECIFIC techniques with REAL tools — e.g. "Nmap SYN scan & service fingerprinting", not "Introduction to scanning".
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

TASK: Expand ONE lesson into full teaching-grade content that a student can learn from standalone.

COURSE CONTEXT: "${ctx.title}" (${ctx.category}, ${ctx.level}, ${ctx.durationHours}h)
MODULE: "${moduleTitle}"
LESSON: "${lesson.title}" (type: ${lesson.type})
CURRENT CONTENT (may be sparse — deepen, keep any correct specifics it already teaches):
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
// Course context loader + access control
// ---------------------------------------------------------------------------

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

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`ai-architect:${user.id}`, { max: 10, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Architect cooling down — try again in a few minutes." }, { status: 429 })
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
    const zai = await ZAI.create()
    const res = await zai.chat.completions.create({
      messages: [{ role: "user", content: blueprintPrompt(ctx) }],
      thinking: { type: "disabled" },
    })
    try {
      const data = extractJson(res.choices[0]?.message?.content || "")
      return NextResponse.json({ ok: true, blueprint: data })
    } catch (e: any) {
      return NextResponse.json({ error: "Architect returned malformed JSON: " + e.message }, { status: 502 })
    }
  }

  // --------------------------- curriculum ---------------------------
  if (action === "curriculum") {
    const moduleCount = Math.min(Math.max(parseInt(body.moduleCount, 10) || 6, 3), 10)
    const depth = body.depth === "deep" ? "deep" : "standard"
    const focusNotes = String(body.focusNotes || "").slice(0, 2000)
    const ctx: CourseContext = course
    const zai = await ZAI.create()
    const res = await zai.chat.completions.create({
      messages: [{ role: "user", content: curriculumPrompt(ctx, moduleCount, depth, focusNotes) }],
      thinking: { type: "disabled" },
    })
    try {
      const data = extractJson(res.choices[0]?.message?.content || "")
      const modules = Array.isArray(data?.modules) ? data.modules : []
      if (!modules.length) throw new Error("no modules in response")
      return NextResponse.json({ ok: true, modules })
    } catch (e: any) {
      return NextResponse.json({ error: "Architect returned malformed JSON: " + e.message }, { status: 502 })
    }
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
    const zai = await ZAI.create()
    const res = await zai.chat.completions.create({
      messages: [{
        role: "user",
        content: lessonPrompt(ctx, lesson.module.title, {
          title: lesson.title, type: lesson.type, content: lesson.content,
        }),
      }],
      thinking: { type: "disabled" },
    })
    try {
      const data = extractJson(res.choices[0]?.message?.content || "")
      return NextResponse.json({
        ok: true,
        lesson: {
          title: String(data.title || lesson.title),
          durationMin: Math.max(1, parseInt(data.durationMin, 10) || lesson.durationMin),
          content: String(data.content || ""),
        },
      })
    } catch (e: any) {
      return NextResponse.json({ error: "Architect returned malformed JSON: " + e.message }, { status: 502 })
    }
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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
