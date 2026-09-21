import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Job Board - apply for a job
// POST /api/jobs/[id]/apply - body: { coverLetter }
// ============================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const job = await db.job.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (job.status === "closed") {
      return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const coverLetter = (body?.coverLetter as string) || ""

    const existing = await db.jobApplication.findUnique({
      where: { jobId_userId: { jobId: id, userId: user.id } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this job", application: existing },
        { status: 409 }
      )
    }

    const application = await db.jobApplication.create({
      data: { jobId: id, userId: user.id, coverLetter },
    })

    return NextResponse.json({ application }, { status: 201 })
  } catch (err: any) {
    console.error("[jobs/[id]/apply] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
