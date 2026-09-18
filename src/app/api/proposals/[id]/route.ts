import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody } from "@/lib/session"

export const runtime = "nodejs"

/**
 * /api/proposals/[id] — single saved proposal (Admin → Proposal Maker).
 *
 * GET    — fetch the full proposal (config JSON included) for loading.
 * PATCH  — update title/clientName/config.
 * DELETE — remove the saved proposal.
 *
 * Auth: ADMIN via requireAdmin().
 */

const MAX_CONFIG_BYTES = 1 * 1024 * 1024

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const proposal = await db.proposal.findUnique({ where: { id } })
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 })

  let config: unknown = {}
  try {
    config = JSON.parse(proposal.config)
  } catch {
    config = {}
  }
  return NextResponse.json({
    proposal: {
      id: proposal.id,
      title: proposal.title,
      clientName: proposal.clientName,
      config,
      updatedAt: proposal.updatedAt,
    },
  })
})

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const existing = await db.proposal.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Proposal not found" }, { status: 404 })

  const { data: body, error: bodyError } = await readJsonBody<any>(req, { maxBytes: MAX_CONFIG_BYTES })
  if (bodyError) return bodyError

  const data: { title?: string; clientName?: string; config?: string } = {}
  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 200)
  if (body?.clientName !== undefined) {
    data.clientName = typeof body.clientName === "string" && body.clientName.trim()
      ? body.clientName.trim().slice(0, 200)
      : ""
  }
  if (body?.config !== undefined) {
    try {
      const parsed = typeof body.config === "string" ? JSON.parse(body.config) : body.config
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "config must be a JSON object" }, { status: 400 })
      }
      data.config = JSON.stringify(parsed)
    } catch {
      return NextResponse.json({ error: "config must be valid JSON" }, { status: 400 })
    }
  }

  const proposal = await db.proposal.update({
    where: { id },
    data,
    select: { id: true, title: true, clientName: true, updatedAt: true },
  })
  return NextResponse.json({ proposal })
})

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const existing = await db.proposal.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
  await db.proposal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
