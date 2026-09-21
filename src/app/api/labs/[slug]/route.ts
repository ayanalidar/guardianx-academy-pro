import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { safeLab } from "@/lib/safe-lab"

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const lab = await db.lab.findUnique({ where: { slug } })
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 })

  const user = await getCurrentUser()
  let progress: Awaited<ReturnType<typeof db.labProgress.findUnique>> = null
  if (user) {
    progress = await db.labProgress.findUnique({ where: { userId_labId: { userId: user.id, labId: lab.id } } })
  }

  // SECURITY: the flag is NEVER shipped to the client - not even on the
  // lab detail page. The client submits a guess to /api/labs/[slug]/submit
  // and the server tells it whether the guess was correct. Only after a
  // correct submission does the submit route echo the flag back for
  // confirmation (master-prompt §34, §80-81). This was previously leaking
  // the full lab object including `flag` to every unauthenticated visitor.
  return NextResponse.json({ lab: safeLab(lab), progress })
})
