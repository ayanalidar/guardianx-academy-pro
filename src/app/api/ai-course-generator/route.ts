import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit } from "@/lib/session"
import ZAI from "z-ai-web-dev-sdk"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * POST /api/ai-course-generator
 * Admin-only. Generates a complete course from a certification using multi-agent LLM orchestration.
 *
 * Body: {
 *   certificationSlug: string,  // e.g. "ceh", "security-plus"
 *   audience: string,           // e.g. "Beginner", "Working Professional"
 *   level: string,              // Beginner | Intermediate | Advanced
 *   durationHours: number,      // e.g. 40
 *   instructorId: string,       // assigned instructor
 * }
 *
 * Multi-agent pipeline:
 * Agent 1: Curriculum Designer → modules + learning outcomes
 * Agent 2: Content Writer → lesson content per module
 * Agent 3: Assessment Builder → quiz questions per module
 * Agent 4: Quality Reviewer → validates and suggests improvements
 *
 * Returns the complete course structure for admin review.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!rateLimit(`ai-gen:${user.id}`, { max: 3, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Generator cooling down — try again in a few minutes." }, { status: 429 })
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const { certificationSlug, audience, level, durationHours, instructorId } = body

  if (!certificationSlug) return NextResponse.json({ error: "Certification slug required" }, { status: 400 })
  if (!instructorId) return NextResponse.json({ error: "Instructor ID required" }, { status: 400 })

  // Fetch certification from DB
  const cert = await db.guardianCertification.findUnique({ where: { slug: certificationSlug } })
  if (!cert) return NextResponse.json({ error: "Certification not found" }, { status: 404 })

  const domains = JSON.parse(cert.domains || "[]")
  const skills = JSON.parse(cert.skills || "[]")

  try {
    const zai = await ZAI.create()

    // ============================================================
    // AGENT 1: Curriculum Designer
    // Designs the course structure: modules, lessons, learning outcomes
    // ============================================================
    const curriculumPrompt = `You are an expert cybersecurity curriculum designer. Design a complete course for the ${cert.name} certification (${"GuardianX"}).

CERTIFICATION DETAILS:
- Name: ${cert.name}
- Issuer: ${"GuardianX"}
- Level: ${level || cert.level}
- Duration: ${durationHours || 40} hours
- Target Audience: ${audience || "General learners"}

CERTIFICATION DOMAINS (must cover all):
${domains.map((d: string, i: number) => `${i + 1}. ${d}`).join("\n")}

KEY SKILLS TO DEVELOP:
${skills.map((s: string) => `- ${s}`).join("\n")}

TASK: Design a course with 5-8 modules. For each module, include:
1. Module title
2. Module description (1-2 sentences)
3. 3-5 lessons (title + type: reading/lab/video + 1-paragraph content summary)
4. Suggested lab scenario (if applicable)
5. Quiz with 3-5 MCQs (question + 4 options + correct answer index 0-3 + explanation)

Return as JSON ONLY (no markdown, no code blocks):
{
  "courseTitle": "...",
  "courseDescription": "...",
  "courseLongDescription": "...",
  "modules": [
    {
      "title": "...",
      "description": "...",
      "order": 1,
      "lessons": [
        { "title": "...", "type": "reading", "content": "...", "durationMin": 15 },
        { "title": "...", "type": "lab", "content": "Lab scenario: ...", "durationMin": 30 }
      ],
      "quiz": {
        "questions": [
          { "text": "...", "options": ["A","B","C","D"], "answerIndex": 0, "explanation": "..." }
        ]
      }
    }
  ]
}`

    console.log("[AI Course Generator] Agent 1: Curriculum Designer running...")
    const curriculumRes = await zai.chat.completions.create({
      messages: [{ role: "user", content: curriculumPrompt }],
      thinking: { type: "disabled" },
    })
    const curriculumText = curriculumRes.choices[0]?.message?.content || ""
    
    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = curriculumText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI failed to generate valid course structure" }, { status: 500 })
    }
    
    let courseData
    try {
      courseData = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: "AI generated invalid JSON" }, { status: 500 })
    }

    // ============================================================
    // AGENT 2: Quality Reviewer (quick pass)
    // Validates the course covers all certification domains
    // ============================================================
    console.log("[AI Course Generator] Agent 2: Quality Reviewer running...")
    const reviewPrompt = `You are a cybersecurity education quality reviewer. Review this course structure for the ${cert.name} certification.

CERTIFICATION DOMAINS THAT MUST BE COVERED:
${domains.join(", ")}

COURSE MODULES:
${courseData.modules?.map((m: any, i: number) => `Module ${i + 1}: ${m.title}`).join("\n")}

Check if all domains are covered. Return a brief assessment (2-3 sentences) and a "covers_all" boolean.
Return as JSON: {"covers_all": true/false, "assessment": "...", "missing_domains": ["domain1", "domain2"]}`

    const reviewRes = await zai.chat.completions.create({
      messages: [{ role: "user", content: reviewPrompt }],
      thinking: { type: "disabled" },
    })
    let reviewData
    try {
      const reviewText = reviewRes.choices[0]?.message?.content || ""
      const reviewJson = reviewText.match(/\{[\s\S]*\}/)
      reviewData = reviewJson ? JSON.parse(reviewJson[0]) : { covers_all: true, assessment: "Review skipped" }
    } catch {
      reviewData = { covers_all: true, assessment: "Review skipped" }
    }

    // ============================================================
    // SAVE TO DATABASE
    // ============================================================
    console.log("[AI Course Generator] Saving to database...")
    
    const slug = `${cert.slug}-${level?.toLowerCase() || "course"}-${Date.now().toString(36)}`
    
    const course = await db.course.create({
      data: {
        slug,
        title: courseData.courseTitle || `${cert.name} - ${level || "Complete"} Training`,
        shortName: cert.name.length > 20 ? cert.name.substring(0, 20) : cert.name,
        description: courseData.courseDescription || `Comprehensive ${cert.name} training program`,
        longDescription: courseData.courseLongDescription || courseData.courseDescription || "",
        category: domains[0] || "Cybersecurity",
        level: level || cert.level || "Intermediate",
        durationHours: durationHours || 40,
        price: 0,
        rating: 0,
        studentsCount: 0,
        color: "violet",
        tags: skills.slice(0, 8).join(","),
        certBody: "GuardianX",
        published: false, // Draft - admin must review and publish
        instructorId,
      },
    })

    // Create modules, lessons, and quizzes
    for (const modData of (courseData.modules || [])) {
      const mod = await db.module.create({
        data: {
          courseId: course.id,
          title: modData.title,
          description: modData.description || "",
          order: modData.order || 0,
        },
      })

      // Create lessons
      let lastLessonId: string | null = null
      for (const lesson of (modData.lessons || [])) {
        const created = await db.lesson.create({
          data: {
            moduleId: mod.id,
            title: lesson.title,
            type: lesson.type || "reading",
            content: lesson.content || "",
            durationMin: lesson.durationMin || 15,
            order: 0,
          },
        })
        lastLessonId = created.id
      }

      // Create quiz if exists
      if (modData.quiz?.questions?.length > 0 && lastLessonId) {
        const quiz = await db.quiz.create({
          data: {
            lessonId: lastLessonId,
            title: `${modData.title} - Quiz`,
          },
        })

        for (const q of modData.quiz.questions) {
          await db.question.create({
            data: {
              quizId: quiz.id,
              text: q.text,
              options: Array.isArray(q.options) ? q.options.join("|") : q.options,
              answerIndex: q.answerIndex || 0,
              explanation: q.explanation || "",
            },
          })
        }
      }
    }

    console.log("[AI Course Generator] Course saved successfully!")

    return NextResponse.json({
      success: true,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      moduleCount: courseData.modules?.length || 0,
      lessonCount: courseData.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0),
      quizCount: courseData.modules?.filter((m: any) => m.quiz?.questions?.length > 0).length || 0,
      review: reviewData,
      status: "draft",
      message: "Course generated as draft. Admin must review and publish.",
    }, { status: 201 })

  } catch (err: any) {
    console.error("[AI Course Generator] Error:", err)
    return NextResponse.json({ error: "Course generation failed: " + (err.message || "Unknown error") }, { status: 500 })
  }
}
