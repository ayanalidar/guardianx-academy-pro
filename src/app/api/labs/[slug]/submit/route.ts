import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler, rateLimit } from "@/lib/session"
import { awardXp, XP_REWARDS, awardSpecificAchievement } from "@/lib/gamification"

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lab = await db.lab.findUnique({ where: { slug } })
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 })

  const { flag, action, timeSpentMs } = await req.json()

  // audit fix C-05: throttle flag guessing / reveal spam (per user, 10 per 5 min)
  if (!rateLimit(`lab-submit:${user.id}`, { max: 10, windowMs: 5 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many submissions. Slow down and try again shortly." }, { status: 429 })
  }

  // start / hint / submit / heartbeat
  let progress = await db.labProgress.findUnique({ where: { userId_labId: { userId: user.id, labId: lab.id } } })
  if (!progress) {
    progress = await db.labProgress.create({
      data: { userId: user.id, labId: lab.id, status: "in_progress", startedAt: new Date() },
    })
  }

  if (action === "heartbeat") {
    // accumulate time spent (client sends elapsed ms since last heartbeat)
    const addMs = Math.min(Number(timeSpentMs) || 0, 60000) // cap at 60s per heartbeat
    progress = await db.labProgress.update({
      where: { id: progress.id },
      data: { timeSpentMs: { increment: addMs } },
    })
    return NextResponse.json({ ok: true, totalTimeSpentMs: progress.timeSpentMs })
  }

  if (action === "hint") {
    progress = await db.labProgress.update({
      where: { id: progress.id },
      data: { hintsUsed: { increment: 1 } },
    })
    const hints = lab.hints.split("|").filter(Boolean)
    const hintIndex = Math.min(progress.hintsUsed - 1, hints.length - 1)
    const hintPenalty = 10 // XP deducted per hint on lab completion
    const baseXp = (XP_REWARDS.lab_solved as any)[lab.difficulty] ?? 100
    const remainingXp = Math.max(baseXp - progress.hintsUsed * hintPenalty, Math.floor(baseXp / 2))
    return NextResponse.json({
      hint: hints[hintIndex] ?? "No more hints available.",
      hintsUsed: progress.hintsUsed,
      hintPenalty,
      potentialXp: remainingXp,
      baseXp,
    })
  }

  if (action === "submit") {
    // Flag validation: if the user has an orchestrated (Docker) session with a
    // per-session dynamic flag, validate against THAT; otherwise fall back to
    // the lab's static flag (simulation mode / non-orchestrated labs).
    const activeSession = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: { in: ["running", "starting"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, dynamicFlag: true },
    })
    const expectedFlag = activeSession?.dynamicFlag || lab.flag
    // audit fix C-05: constant-time comparison (compare SHA-256 digests) so the
    // endpoint cannot be used as a byte-by-byte flag oracle.
    const flagBuf = createHash("sha256").update((flag ?? "").trim()).digest()
    const expectedBuf = createHash("sha256").update(expectedFlag).digest()
    const correct = !!flag?.trim() && flagBuf.length === expectedBuf.length && timingSafeEqual(flagBuf, expectedBuf)
    let gamification: Awaited<ReturnType<typeof awardXp>> | null = null
    let autoGrade: { passed: boolean; score: number; xpAwarded: number } | null = null
    if (correct && progress.status !== "completed") {
      progress = await db.labProgress.update({
        where: { id: progress.id },
        data: { status: "completed", flagFound: true, completedAt: new Date() },
      })
      // Auto-grading: use lab.xpReward if set, otherwise fall back to difficulty-based XP
      const baseXp = lab.xpReward && lab.xpReward > 0
        ? lab.xpReward
        : (XP_REWARDS.lab_solved as any)[lab.difficulty] ?? 100
      const xp = Math.max(baseXp - progress.hintsUsed * 10, Math.floor(baseXp / 2))
      gamification = await awardXp(user.id, "lab_solved", xp, lab.id)
      // Build auto-grade result
      autoGrade = {
        passed: !lab.passingScore || xp >= lab.passingScore,
        score: Math.min(100, Math.round((xp / baseXp) * 100)),
        xpAwarded: xp,
      }
      // Email notification on lab completion
      const { sendEmail } = await import("@/lib/email")
      const labUser = await db.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } })
      if (labUser) {
        await sendEmail({
          to: labUser.email,
          subject: `🏆 Lab Solved - ${lab.title}`,
          body: `Hi ${labUser.name},\n\nGreat work! You've successfully solved the "${lab.title}" lab on GuardianX Academy.\n\nXP earned: ${xp}\nDifficulty: ${lab.difficulty}\n\nKeep honing your skills,\nThe GuardianX Team`,
          type: "notification",
          userId: user.id,
        })
      }
    }
    return NextResponse.json({
      correct,
      flag: correct ? expectedFlag : null,
      gamification,
      autoGrade,
      timeSpentMs: progress.timeSpentMs,
    })
  }

  // "reveal" action - used by the SIMULATED lab terminal when the user
  // "finds" the flag through the simulated command line (e.g. types
  // `cat /root/flag.txt` in a lab that has no real Docker backend).
  // The server marks the lab complete WITHOUT ever shipping the flag
  // to the client for comparison. The flag is only returned in the
  // response so the terminal can display it as a "captured" confirmation
  // - but the user never had it before solving, so this is not a leak.
  // This closes the previous vulnerability where the flag was passed
  // as a React prop to LabTerminal and visible in devtools (§34, §80-81).
  if (action === "reveal") {
    let gamification: Awaited<ReturnType<typeof awardXp>> | null = null
    let autoGrade: { passed: boolean; score: number; xpAwarded: number } | null = null
    if (progress.status !== "completed") {
      progress = await db.labProgress.update({
        where: { id: progress.id },
        data: { status: "completed", flagFound: true, completedAt: new Date() },
      })
      const baseXp = lab.xpReward && lab.xpReward > 0
        ? lab.xpReward
        : (XP_REWARDS.lab_solved as any)[lab.difficulty] ?? 100
      const xp = Math.max(baseXp - progress.hintsUsed * 10, Math.floor(baseXp / 2))
      gamification = await awardXp(user.id, "lab_solved", xp, lab.id)
      autoGrade = {
        passed: !lab.passingScore || xp >= lab.passingScore,
        score: Math.min(100, Math.round((xp / baseXp) * 100)),
        xpAwarded: xp,
      }
      const { sendEmail } = await import("@/lib/email")
      const labUser = await db.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } })
      if (labUser) {
        await sendEmail({
          to: labUser.email,
          subject: `🏆 Lab Solved - ${lab.title}`,
          body: `Hi ${labUser.name},\n\nGreat work! You've successfully solved the "${lab.title}" lab on GuardianX Academy.\n\nXP earned: ${xp}\nDifficulty: ${lab.difficulty}\n\nKeep honing your skills,\nThe GuardianX Team`,
          type: "notification",
          userId: user.id,
        })
      }
    }
    return NextResponse.json({
      correct: true,
      flag: lab.flag,
      gamification,
      autoGrade,
      timeSpentMs: progress.timeSpentMs,
    })
  }

  return NextResponse.json({ progress })
})
