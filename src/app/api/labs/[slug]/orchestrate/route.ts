import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, rateLimit, getClientIp } from "@/lib/session"
import { awardXp, XP_REWARDS } from "@/lib/gamification"
import { ORCHESTRATOR_URL, signOrchestratorRequest } from "@/lib/orchestrator"

// Lab orchestration endpoint - connects to the lab-orchestrator mini-service.
// All requests are HMAC-signed with LAB_SHARED_SECRET (see src/lib/orchestrator.ts).
// SECURITY: session.dynamicFlag is NEVER returned to the browser - it is
// server-side data used only by /api/labs/[slug]/submit for validation.
// Handles: start, stop, extend, reset lab sessions

async function fetchOrchestrator(path: string, body: unknown): Promise<Response> {
  const raw = JSON.stringify(body)
  return fetch(`${ORCHESTRATOR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...signOrchestratorRequest(raw) },
    body: raw,
  })
}

/** Strip server-only fields before sending a session to the browser. */
function publicSession(s: {
  id: string; status: string; targetIp: string | null; attackIp: string | null;
  expiresAt: Date | null; terminalToken: string | null;
  targetContainerId: string | null; attackContainerId: string | null; networkName?: string | null;
}) {
  return {
    id: s.id,
    status: s.status,
    targetIp: s.targetIp,
    attackIp: s.attackIp,
    expiresAt: s.expiresAt,
    terminalToken: s.terminalToken,
    targetContainerId: s.targetContainerId,
    attackContainerId: s.attackContainerId,
    ...(s.networkName !== undefined ? { networkName: s.networkName } : {}),
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lab = await db.lab.findUnique({ where: { slug } })
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 })

  const { action, additionalMinutes } = await req.json()

  // === START: Create a new lab session with Docker containers ===
  if (action === "start") {
    // Rate limit lab starts (container exhaustion / cost control)
    if (!rateLimit(`lab-start:${getClientIp(req)}:${user.id}`, { max: 5, windowMs: 10 * 60 * 1000 })) {
      return NextResponse.json({ error: "Too many lab starts. Try again in a few minutes." }, { status: 429 })
    }
    // Check if user already has an active session
    const existing = await db.labSession.findFirst({
      where: { userId: user.id, labId: lab.id, status: { in: ["running", "starting"] } },
    })
    if (existing) {
      return NextResponse.json({ session: publicSession(existing), resumed: true })
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
      const orchestratorRes = await fetchOrchestrator("/start", {
        labSlug: slug,
        userId: user.id,
        ttlMinutes: ttl,
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

      return NextResponse.json({ session: publicSession(updated), resumed: false })
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
      await fetchOrchestrator("/stop", {
        sessionId: session.id,
        targetContainerId: session.targetContainerId,
        attackContainerId: session.attackContainerId,
        networkName: session.networkName,
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
      const resetRes = await fetchOrchestrator("/reset", {
        sessionId: session.id,
        targetContainerId: session.targetContainerId,
        dynamicFlag: session.dynamicFlag,
      })
      const resetData = await resetRes.json()

      await db.labSession.update({
        where: { id: session.id },
        data: { dynamicFlag: resetData.newFlag },
      })

      // SECURITY: the new flag is stored server-side only - it is never
      // echoed to the client.
      return NextResponse.json({ ok: true })
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
        ...publicSession(session),
        timeLeftMs: timeLeft,
        timeLeftMin: Math.floor(timeLeft / 60000),
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
