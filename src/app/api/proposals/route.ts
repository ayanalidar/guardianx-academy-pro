import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler, readJsonBody, rateLimit } from "@/lib/session"

export const runtime = "nodejs"

/**
 * /api/proposals — persistence for the Proposal Maker (Admin → Proposal Maker).
 *
 * GET  — list saved proposals (id, title, clientName, updatedAt).
 * POST — create a saved proposal. Body: { title, clientName, config }.
 *        `config` is the full JSON snapshot of the slide deck. Capped at
 *        1 MB (the deck is text + small structures).
 *
 * Auth: ADMIN via requireAdmin().
 */

const MAX_CONFIG_BYTES = 1 * 1024 * 1024

export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const proposals = await db.proposal.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      clientName: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json({ proposals, count: proposals.length })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  // Basic per-user spam guard on create
  if (!rateLimit(`proposals-create:${user.id}`, { max: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { data: body, error: bodyError } = await readJsonBody<any>(req, { maxBytes: MAX_CONFIG_BYTES })
  if (bodyError) return bodyError

  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : ""
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim().slice(0, 200) : ""
  if (!title) return NextResponse.json({ error: "Proposal title is required" }, { status: 400 })

  // Config must be serialisable JSON (an object)
  let configJson: string
  try {
    const parsed = typeof body?.config === "string" ? JSON.parse(body.config) : body?.config
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "config must be a JSON object" }, { status: 400 })
    }
    configJson = JSON.stringify(parsed)
  } catch {
    return NextResponse.json({ error: "config must be valid JSON" }, { status: 400 })
  }

  const proposal = await db.proposal.create({
    data: {
      ownerId: user.id,
      title,
      clientName: clientName || "",
      config: configJson,
    },
    select: { id: true, title: true, clientName: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ proposal }, { status: 201 })
})
