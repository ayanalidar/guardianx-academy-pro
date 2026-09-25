import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, readJsonBody, rateLimit } from "@/lib/session"

export const runtime = "nodejs"

/**
 * GET /api/career/path - current user's saved career plan (or null).
 * POST /api/career/path - create/update the user's career plan (upsert).
 *
 * Backs the Career Planner view (src/views/career-planner.tsx), which
 * previously called this route when it did not exist (404 → silent failure).
 *
 * Body (POST): {
 *   targetRole, currentRole?, targetSalary?,
 *   recommendedCourses?: string[], recommendedCerts?: string[],
 *   recommendedLabs?: string[], estimatedWeeks?: number
 * }
 */

export const GET = withErrorHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const path = await db.careerPath.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ path: path ? decodeLists(path) : null })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Save actions are cheap but still bounded
  if (!rateLimit(`career-path:${user.id}`, { max: 30, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const parsed = await readJsonBody<{
    targetRole?: string
    currentRole?: string
    targetSalary?: string
    recommendedCourses?: string[]
    recommendedCerts?: string[]
    recommendedLabs?: string[]
    estimatedWeeks?: number
  }>(req)
  if (parsed.error || !parsed.data) return parsed.error ?? NextResponse.json({ error: "Invalid body" }, { status: 400 })
  const body = parsed.data

  if (!body.targetRole?.trim()) {
    return NextResponse.json({ error: "targetRole is required" }, { status: 400 })
  }

  const data = {
    targetRole: body.targetRole.trim().slice(0, 120),
    currentRole: (body.currentRole || "").slice(0, 120),
    targetSalary: (body.targetSalary || "").slice(0, 60),
    recommendedCourses: JSON.stringify((body.recommendedCourses || []).slice(0, 24)),
    recommendedCerts: JSON.stringify((body.recommendedCerts || []).slice(0, 24)),
    recommendedLabs: JSON.stringify((body.recommendedLabs || []).slice(0, 24)),
    estimatedWeeks: Math.min(Math.max(Number(body.estimatedWeeks) || 12, 1), 104),
  }

  const existing = await db.careerPath.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  })

  const path = existing
    ? await db.careerPath.update({ where: { id: existing.id }, data })
    : await db.careerPath.create({ data: { ...data, userId: user.id } })

  return NextResponse.json({ path: decodeLists(path) })
})

/** Model stores arrays as JSON strings - decode for the client shape the
 *  view already expects (it JSON.parses defensively too). */
function decodeLists(p: {
  id: string; userId: string; targetRole: string; currentRole: string;
  targetSalary: string; recommendedCourses: string; recommendedCerts: string;
  recommendedLabs: string; estimatedWeeks: number; progress: number;
  createdAt: Date; updatedAt: Date;
}) {
  const parse = (s: string, fb: string) => { try { return JSON.parse(s || fb) } catch { return JSON.parse(fb) } }
  return {
    ...p,
    recommendedCourses: parse(p.recommendedCourses, "[]"),
    recommendedCerts: parse(p.recommendedCerts, "[]"),
    recommendedLabs: parse(p.recommendedLabs, "[]"),
  }
}
