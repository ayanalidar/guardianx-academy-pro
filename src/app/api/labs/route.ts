import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { safeLabs } from "@/lib/safe-lab"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const difficulty = searchParams.get("difficulty")
  const q = searchParams.get("q")

  const where: any = { published: true }
  if (category && category !== "All") where.category = category
  if (difficulty && difficulty !== "All") where.difficulty = difficulty
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { tags: { contains: q } },
    ]
  }

  const user = await getCurrentUser()
  const labs = await db.lab.findMany({
    where,
    orderBy: [{ difficulty: "asc" }, { points: "asc" }],
  })

  let progressMap: Record<string, any> = {}
  if (user) {
    const progress = await db.labProgress.findMany({ where: { userId: user.id } })
    progressMap = Object.fromEntries(progress.map((p) => [p.labId, p]))
  }

  // SECURITY: `safeLabs()` strips the `flag` field so CTF answers are
  // never exposed in the public listing. Flags are only revealed by
  // /api/labs/[slug]/submit after a correct submission (master-prompt §34, §80-81).
  return NextResponse.json({
    labs: safeLabs(labs).map((l) => ({
      ...l,
      progress: progressMap[l.id] ?? null,
    })),
  })
})
