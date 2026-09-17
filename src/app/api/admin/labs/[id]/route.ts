import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

// PATCH /api/admin/labs/[id] — update any lab field
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    const existing = await db.lab.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Lab not found" }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const {
      title, slug, description, longDescription,
      category, difficulty, durationMin, points, tags,
      scenario, objectives, hints, flag, commands,
      virtualEnv, color, published, autoGrade, xpReward, passingScore,
    } = body as Record<string, unknown>

    // slug uniqueness check
    let finalSlug: string | undefined
    if (slug && slug !== existing.slug) {
      const conflict = await db.lab.findUnique({ where: { slug: String(slug) } })
      if (conflict && conflict.id !== id) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 400 })
      }
      finalSlug = String(slug)
    }

    const updated = await db.lab.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(finalSlug !== undefined && { slug: finalSlug }),
        ...(description !== undefined && { description: String(description) }),
        ...(longDescription !== undefined && { longDescription: String(longDescription) }),
        ...(category !== undefined && { category: String(category) }),
        ...(difficulty !== undefined && { difficulty: String(difficulty) }),
        ...(durationMin !== undefined && { durationMin: Number(durationMin) }),
        ...(points !== undefined && { points: Number(points) }),
        ...(tags !== undefined && { tags: String(tags) }),
        ...(scenario !== undefined && { scenario: String(scenario) }),
        ...(objectives !== undefined && { objectives: String(objectives) }),
        ...(hints !== undefined && { hints: String(hints) }),
        ...(flag !== undefined && { flag: String(flag) }),
        ...(commands !== undefined && { commands: String(commands) }),
        ...(virtualEnv !== undefined && { virtualEnv: String(virtualEnv) }),
        ...(color !== undefined && { color: String(color) }),
        ...(published !== undefined && { published: !!published }),
        ...(autoGrade !== undefined && { autoGrade: !!autoGrade }),
        ...(xpReward !== undefined && { xpReward: Number(xpReward) }),
        ...(passingScore !== undefined && { passingScore: Number(passingScore) }),
      },
    })

    return NextResponse.json({ lab: updated })
  },
)

// DELETE /api/admin/labs/[id]
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const user = await requireAdmin()
    if (user instanceof NextResponse) return user

    const existing = await db.lab.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Lab not found" }, { status: 404 })

    await db.lab.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
)
