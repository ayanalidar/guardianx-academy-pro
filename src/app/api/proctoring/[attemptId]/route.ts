import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

/**
 * GET /api/proctoring/[attemptId]
 * AUTHENTICATED - read proctoring session for an attempt.
 *
 * POST /api/proctoring/[attemptId]
 * AUTHENTICATED - update proctoring session flags / counters.
 * Body:
 *   {
 *     flags?: Array<{ type: string; timestamp: number; severity?: string; detail: string }>,
 *     tabSwitches?: number,
 *     windowBlurs?: number,
 *     incidentCount?: number,
 *     cameraEnabled?: boolean,
 *     microphoneEnabled?: boolean,
 *     screenShared?: boolean,
 *     fullscreenMode?: boolean,
 *     identityVerified?: boolean,
 *     environmentChecked?: boolean,
 *   }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { attemptId } = await params
  const session = await db.proctoringSession.findUnique({
    where: { examAttemptId: attemptId },
  })
  if (!session) {
    return NextResponse.json(
      { error: "Proctoring session not found." },
      { status: 404 }
    )
  }
  if (session.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }
  return NextResponse.json({
    proctoring: {
      ...session,
      flags: safeParse(session.flags, []),
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { attemptId } = await params

  const session = await db.proctoringSession.findUnique({
    where: { examAttemptId: attemptId },
  })
  if (!session) {
    return NextResponse.json(
      { error: "Proctoring session not found." },
      { status: 404 }
    )
  }
  if (session.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  // Append new flags to the existing list
  const newFlags: any[] = Array.isArray(body?.flags) ? body.flags : []
  const existingFlags = safeParse<any[]>(session.flags, [])
  const mergedFlags = [...existingFlags, ...newFlags].slice(-200) // cap to last 200

  const updateData: any = {
    flags: JSON.stringify(mergedFlags),
    incidentCount:
      typeof body?.incidentCount === "number"
        ? body.incidentCount
        : session.incidentCount + newFlags.length,
  }
  if (typeof body?.tabSwitches === "number") {
    // We treat incoming as the new absolute count OR additive based on context.
    // Convention: if value > current, treat as absolute; otherwise add.
    updateData.tabSwitches = Math.max(session.tabSwitches, body.tabSwitches)
  }
  if (typeof body?.windowBlurs === "number") {
    updateData.windowBlurs = Math.max(session.windowBlurs, body.windowBlurs)
  }
  if (typeof body?.cameraEnabled === "boolean") {
    updateData.cameraEnabled = body.cameraEnabled
  }
  if (typeof body?.microphoneEnabled === "boolean") {
    updateData.microphoneEnabled = body.microphoneEnabled
  }
  if (typeof body?.screenShared === "boolean") {
    updateData.screenShared = body.screenShared
  }
  if (typeof body?.fullscreenMode === "boolean") {
    updateData.fullscreenMode = body.fullscreenMode
  }
  if (typeof body?.identityVerified === "boolean") {
    updateData.identityVerified = body.identityVerified
  }
  if (typeof body?.environmentChecked === "boolean") {
    updateData.environmentChecked = body.environmentChecked
  }

  const updated = await db.proctoringSession.update({
    where: { examAttemptId: attemptId },
    data: updateData,
  })

  return NextResponse.json({
    proctoring: {
      ...updated,
      flags: safeParse(updated.flags, []),
    },
  })
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
