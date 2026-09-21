import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

// GET /api/admin/labs - list all labs with progress counts
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() || undefined

  const where: { OR?: { title?: { contains: string }; slug?: { contains: string } }[] } = {}
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { slug: { contains: q } },
    ]
  }

  const labs = await db.lab.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      course: { select: { id: true, title: true, shortName: true } },
      _count: { select: { progress: true } },
    },
  })

  // Aggregate progress counts by status
  const labIds = labs.map((l) => l.id)
  const progressByStatus = await db.labProgress.groupBy({
    by: ["status", "labId"],
    where: { labId: { in: labIds } },
    _count: { _all: true },
  })

  const result = labs.map((l) => {
    let inProgress = 0
    let completed = 0
    let notStarted = 0
    for (const p of progressByStatus) {
      if (p.labId !== l.id) continue
      if (p.status === "in_progress") inProgress = p._count._all
      else if (p.status === "completed") completed = p._count._all
      else if (p.status === "not_started") notStarted = p._count._all
    }
    return {
      id: l.id,
      title: l.title,
      slug: l.slug,
      description: l.description,
      longDescription: l.longDescription,
      category: l.category,
      difficulty: l.difficulty,
      durationMin: l.durationMin,
      points: l.points,
      tags: l.tags,
      scenario: l.scenario,
      objectives: l.objectives,
      hints: l.hints,
      flag: l.flag,
      commands: l.commands,
      virtualEnv: l.virtualEnv,
      color: l.color,
      published: l.published,
      autoGrade: l.autoGrade,
      xpReward: l.xpReward,
      passingScore: l.passingScore,
      createdAt: l.createdAt,
      courseId: l.courseId,
      course: l.course,
      progressCount: l._count.progress,
      inProgressCount: inProgress,
      completedCount: completed,
      notStartedCount: notStarted,
    }
  })

  return NextResponse.json({ labs: result, total: result.length })
})

// POST /api/admin/labs - create a new lab (ADMIN only)
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const {
    title, slug, description, longDescription,
    category, difficulty, durationMin, points, tags,
    scenario, objectives, hints, flag, commands,
    virtualEnv, color, autoGrade, xpReward, passingScore,
  } = body as Record<string, any>

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  // Generate slug from title if not provided
  let finalSlug = (slug && String(slug).trim()) || String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  const existing = await db.lab.findUnique({ where: { slug: finalSlug } })
  if (existing) {
    finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`
  }

  const lab = await db.lab.create({
    data: {
      title: String(title).trim(),
      slug: finalSlug,
      description: String(description ?? ""),
      longDescription: String(longDescription ?? description ?? ""),
      category: String(category ?? "Web Security"),
      difficulty: String(difficulty ?? "Easy"),
      durationMin: Number(durationMin ?? 30),
      points: Number(points ?? 100),
      tags: String(tags ?? ""),
      scenario: String(scenario ?? ""),
      objectives: String(objectives ?? ""),
      hints: String(hints ?? ""),
      flag: String(flag ?? "FLAG{}"),
      commands: String(commands ?? ""),
      virtualEnv: String(virtualEnv ?? "linux"),
      color: String(color ?? "emerald"),
      published: true,
      autoGrade: autoGrade !== undefined ? !!autoGrade : true,
      xpReward: Number(xpReward ?? 100),
      passingScore: Number(passingScore ?? 100),
    },
  })

  return NextResponse.json({ lab }, { status: 201 })
})
