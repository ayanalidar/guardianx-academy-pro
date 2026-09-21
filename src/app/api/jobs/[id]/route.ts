import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Job Board - GET job detail / DELETE job (owner or admin)
// ============================================================

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
    const job = await db.job.findUnique({
      where: { id },
      include: {
        postedBy: { select: { id: true, name: true, title: true, avatar: true } },
        _count: { select: { applications: true } },
        applications: {
          where: { userId: user.id },
          select: { id: true, status: true, createdAt: true },
          take: 1,
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json({
      job: {
        ...job,
        requiredCerts: (() => {
          try {
            return JSON.parse(job.requiredCerts || "[]")
          } catch {
            return []
          }
        })(),
        requiredSkills: (() => {
          try {
            return JSON.parse(job.requiredSkills || "[]")
          } catch {
            return []
          }
        })(),
        applicationsCount: job._count.applications,
        myApplication: job.applications[0] ?? null,
      },
    })
  } catch (err: any) {
    console.error("[jobs/[id]] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const job = await db.job.findUnique({ where: { id }, select: { postedById: true } })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const isOwner = job.postedById === user.id
    const isAdmin = user.role === "ADMIN"
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.job.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[jobs/[id]] DELETE error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
