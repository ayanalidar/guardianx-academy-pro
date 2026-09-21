import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// AI Code Review - GET user's code review history
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reviews = await db.codeReview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        language: true,
        score: true,
        code: true,
        feedback: true,
        issues: true,
        createdAt: true,
        courseId: true,
        labId: true,
      },
    })

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        ...r,
        issues: (() => {
          try {
            return JSON.parse(r.issues || "[]")
          } catch {
            return []
          }
        })(),
        // Truncate code for list preview
        codePreview: r.code.slice(0, 200),
      })),
    })
  } catch (err: any) {
    console.error("[code-review/history] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
