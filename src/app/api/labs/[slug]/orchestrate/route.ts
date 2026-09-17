import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { awardXp, XP_REWARDS } from "@/lib/gamification"

// Lab orchestration endpoint — connects to the lab-orchestrator mini-service (port 3004)
// Handles: start, stop, extend, reset lab sessions

const ORCHESTRATOR_URL = "http://localhost:3004"

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lab = await db.lab.findUnique({ where: { slug } })
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 })

  const { action, additionalMinutes } = await req.json()

  // === START: Create a new lab session with Docker containers ===
  if (action === "start") {
    // Check if user already has an active session
    const existing = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: { in: ["running", "starting"] } },
    })
    if (existing) {
      return NextResponse.json({
        session: {
          id: existing.id,
          status: existing.status,
          targetIp: existing.targetIp,
          attackIp: existing.attackIp,
          dynamicFlag: existing.dynamicFlag,
          expiresAt: existing.expiresAt,
          terminalToken: existing.terminalToken,
          targetContainerId: existing.targetContainerId,
          attackContainerId: existing.attackContainerId,
          networkName: existing.networkName,
        },
        resumed: true,
      })
    }

    // Create session record (requesting state)
    const ttl = 60 // 60 minutes default
    const session = await db.labSession.create({
      data: {
        userId: user.id,
        labId: lab.id,
        status: "starting",
        ttlMinutes: ttl,
        expiresAt: new Date(Date.now() + ttl * 60 * 1000),
      },
    })

    try {
      // Call the orchestrator service to spin up Docker containers
      const orchestratorRes = await fetch(`${ORCHESTRATOR_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labSlug: slug,
          userId: user.id,
          ttlMinutes: ttl,
        }),
      })

      if (!orchestratorRes.ok) {
        throw new Error(`Orchestrator returned ${orchestratorRes.status}`)
      }

      const orchData = await orchestratorRes.json()

      // Update session with container info
      const updated = await db.labSession.update({
        where: { id: session.id },
        data: {
          status: "running",
          targetContainerId: orchData.sessionId ? `target-${orchData.sessionId.slice(0, 12)}` : null,
          attackContainerId: orchData.sessionId ? `attack-${orchData.sessionId.slice(0, 12)}` : null,
          targetIp: orchData.targetIp,
          attackIp: orchData.attackIp,
          networkName: orchData.networkName,
          dynamicFlag: orchData.dynamicFlag,
          terminalToken: orchData.terminalToken,
          expiresAt: new Date(orchData.expiresAt),
        },
      })

      // Update lab progress to in_progress
      await db.labProgress.upsert({
        where: { userId_labId: { userId: user.id, labId: lab.id } },
        update: { status: "in_progress", startedAt: new Date() },
        create: { userId: user.id, labId: lab.id, status: "in_progress", startedAt: new Date() },
      })

      return NextResponse.json({
        session: {
          id: updated.id,
          status: updated.status,
          targetIp: updated.targetIp,
          attackIp: updated.attackIp,
          dynamicFlag: updated.dynamicFlag,
          expiresAt: updated.expiresAt,
          terminalToken: updated.terminalToken,
          targetContainerId: updated.targetContainerId,
          attackContainerId: updated.attackContainerId,
          networkName: updated.networkName,
        },
        resumed: false,
      })
    } catch (err: any) {
      // Mark session as error
      await db.labSession.update({
        where: { id: session.id },
        data: { status: "error" },
      })
      return NextResponse.json({ error: `Failed to start lab: ${err.message}` }, { status: 500 })
    }
  }

  // === STOP: Destroy containers and clean up ===
  if (action === "stop") {
    const session = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: "running" },
    })
    if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 })

    try {
      await fetch(`${ORCHESTRATOR_URL}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          targetContainerId: session.targetContainerId,
          attackContainerId: session.attackContainerId,
          networkName: session.networkName,
        }),
      })
    } catch {}

    await db.labSession.update({
      where: { id: session.id },
      data: { status: "stopped", endedAt: new Date() },
    })

    return NextResponse.json({ ok: true, status: "stopped" })
  }

  // === EXTEND: Add more time to the session ===
  if (action === "extend") {
    const session = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: "running" },
    })
    if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 })

    const mins = additionalMinutes || 30
    const newExpiry = new Date(Date.now() + mins * 60 * 1000)

    await db.labSession.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    })

    return NextResponse.json({ ok: true, newExpiry: newExpiry.toISOString() })
  }

  // === RESET: Regenerate flag and reset target state ===
  if (action === "reset") {
    const session = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: "running" },
    })
    if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 })

    try {
      const resetRes = await fetch(`${ORCHESTRATOR_URL}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          targetContainerId: session.targetContainerId,
          dynamicFlag: session.dynamicFlag,
        }),
      })
      const resetData = await resetRes.json()

      await db.labSession.update({
        where: { id: session.id },
        data: { dynamicFlag: resetData.newFlag },
      })

      return NextResponse.json({ ok: true, newFlag: resetData.newFlag })
    } catch (err: any) {
      return NextResponse.json({ error: `Reset failed: ${err.message}` }, { status: 500 })
    }
  }

  // === STATUS: Get current session info ===
  if (action === "status") {
    const session = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: "running" },
      orderBy: { createdAt: "desc" },
    })
    if (!session) return NextResponse.json({ session: null })

    const timeLeft = session.expiresAt ? Math.max(0, new Date(session.expiresAt).getTime() - Date.now()) : 0

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        targetIp: session.targetIp,
        attackIp: session.attackIp,
        dynamicFlag: session.dynamicFlag,
        expiresAt: session.expiresAt,
        timeLeftMs: timeLeft,
        timeLeftMin: Math.floor(timeLeft / 60000),
        terminalToken: session.terminalToken,
        targetContainerId: session.targetContainerId,
        attackContainerId: session.attackContainerId,
      },
    })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

// Flag submission with dynamic flag validation
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check for active session
  const session = await db.labSession.findFirst({
    where: { userId: user.id, labId: (await db.lab.findUnique({ where: { slug } }))?.id, status: "running" },
    orderBy: { createdAt: "desc" },
  })

  if (session) {
    const timeLeft = session.expiresAt ? Math.max(0, new Date(session.expiresAt).getTime() - Date.now()) : 0
    return NextResponse.json({
      hasActiveSession: true,
      session: {
        id: session.id,
        targetIp: session.targetIp,
        attackIp: session.attackIp,
        timeLeftMin: Math.floor(timeLeft / 60000),
        terminalToken: session.terminalToken,
        targetContainerId: session.targetContainerId,
      },
    })
  }

  return NextResponse.json({ hasActiveSession: false })
}
