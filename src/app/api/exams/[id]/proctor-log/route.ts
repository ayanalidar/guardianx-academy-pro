import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, readJsonBody } from "@/lib/session"

export const runtime = "nodejs"

/**
 * POST /api/exams/[id]/proctor-log — live anti-cheat event ingest.
 *
 * The exam runner (exam-view.tsx) posts every proctoring violation here the
 * moment it happens: tab_switch, fullscreen_exit, copy, paste, right_click,
 * keyboard_violation. Events are appended to the attempt's ProctoringSession
 * flags (JSON), the violation counters are incremented, and when the incident
 * count crosses the threshold the attempt is VOIDED server-side — the client
 * reads `voided` / `voidReason` from the response and ends the exam.
 *
 * Previously this route did not exist, so every proctor event 404'd and was
 * silently swallowed: ProctoringSession stayed empty during the exam and
 * server-side voiding never happened.
 *
 * Body: { attemptId: string, eventType: string, detail?: string }
 *       { attemptId: string, action: "void", reason?: string }  — explicit
 *       void from the runner's "Exit & Void" path.
 * Resp: { ok: true, incidentCount }  or  { voided: true, voidReason }
 */

const MAX_FLAGS = 500          // hard cap so the JSON column can't balloon
const VOID_THRESHOLD = 6       // incidents before the attempt is voided
const MAX_DETAIL_LEN = 300

const VALID_EVENT_TYPES = new Set([
  "tab_switch",
  "fullscreen_exit",
  "right_click",
  "copy",
  "paste",
  "keyboard_violation",
  "window_blur",
  "devtools_attempt",
])

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: examId } = await params

  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await readJsonBody<{
    attemptId?: string
    eventType?: string
    detail?: string
    action?: string
    reason?: string
  }>(req, { maxBytes: 16 * 1024 })
  if (error) return error
  if (!data?.attemptId) {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 })
  }

  // ----- Explicit void ("Exit & Void" button) -----
  if (data.action === "void") {
    const voidAttempt = await db.examAttempt.findUnique({
      where: { id: data.attemptId },
      select: { id: true, examId: true, userId: true, status: true },
    })
    if (!voidAttempt || voidAttempt.examId !== examId) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
    }
    if (voidAttempt.userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (voidAttempt.status === "in-progress") {
      await db.examAttempt.update({
        where: { id: voidAttempt.id },
        data: { status: "voided", submittedAt: new Date() },
      })
      // Log the voluntary exit as a flag for the proctoring report.
      const ps = await db.proctoringSession.findUnique({ where: { examAttemptId: voidAttempt.id } })
      if (ps) {
        const flags = appendFlag(ps.flags, "tab_switch", data.reason || "Attempt voided by student (Exit & Void)")
        await db.proctoringSession.update({
          where: { id: ps.id },
          data: { flags: JSON.stringify(flags), incidentCount: { increment: 1 } },
        })
      }
    }
    return NextResponse.json({ ok: true, voided: true, voidReason: "Attempt voided by student." })
  }

  if (!data?.eventType) {
    return NextResponse.json({ error: "attemptId and eventType are required" }, { status: 400 })
  }

  const eventType = String(data.eventType)
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 })
  }

  // Load the attempt and verify: exam match + ownership + still in progress
  const attempt = await db.examAttempt.findUnique({
    where: { id: data.attemptId },
    select: { id: true, examId: true, userId: true, status: true },
  })
  if (!attempt || attempt.examId !== examId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
  }
  if (attempt.userId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (attempt.status === "voided") {
    // Already voided — mirror the terminal response so the client exits.
    return NextResponse.json({
      voided: true,
      voidReason: "This attempt was voided due to proctoring violations.",
    })
  }
  if (attempt.status !== "in-progress") {
    return NextResponse.json({ error: "Attempt is no longer in progress" }, { status: 409 })
  }

  // Load (or defensively recreate) the proctoring session — it should always
  // exist since /start creates it, but events must never be lost.
  let proctoring = await db.proctoringSession.findUnique({
    where: { examAttemptId: attempt.id },
  })
  if (!proctoring) {
    proctoring = await db.proctoringSession.create({
      data: { examAttemptId: attempt.id, userId: currentUser.id },
    })
  }

  // Append the flag (capped) and bump the counters.
  const flags = appendFlag(proctoring.flags, eventType, data.detail)
  const updated = await db.proctoringSession.update({
    where: { id: proctoring.id },
    data: {
      flags: JSON.stringify(flags),
      incidentCount: { increment: 1 },
      ...(eventType === "tab_switch" ? { tabSwitches: { increment: 1 } } : {}),
      ...(eventType === "fullscreen_exit" ? { fullscreenMode: false } : {}),
    },
    select: { incidentCount: true },
  })

  // Void the attempt when the incident threshold is crossed.
  if (updated.incidentCount >= VOID_THRESHOLD) {
    await db.examAttempt.updateMany({
      where: { id: attempt.id, status: "in-progress" },
      data: { status: "voided" },
    })
    return NextResponse.json({
      voided: true,
      voidReason: `Too many proctoring violations (${updated.incidentCount}). Your exam has been voided.`,
      incidentCount: updated.incidentCount,
    })
  }

  return NextResponse.json({ ok: true, incidentCount: updated.incidentCount })
})

/** Parse the stored flags JSON, append the new event, cap the array. */
function appendFlag(existing: string, eventType: string, detail?: string) {
  let arr: any[] = []
  try {
    const parsed = JSON.parse(existing || "[]")
    if (Array.isArray(parsed)) arr = parsed
  } catch {
    arr = []
  }
  if (arr.length >= MAX_FLAGS) arr = arr.slice(-Math.floor(MAX_FLAGS / 2))
  arr.push({
    type: eventType,
    timestamp: Date.now(),
    severity: eventType === "tab_switch" || eventType === "fullscreen_exit" ? "high" : "medium",
    detail: typeof detail === "string" ? detail.slice(0, MAX_DETAIL_LEN) : undefined,
  })
  return arr
}
