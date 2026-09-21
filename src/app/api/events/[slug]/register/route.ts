import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/**
 * POST /api/events/[slug]/register - register the signed-in user for an
 * event. Increments the Event.registered counter (the Event model has a
 * `registered` field per the spec - we use it directly rather than creating
 * a separate registration row, since there is no EventRegistration model).
 *
 * Auth: required (any logged-in user). Returns:
 *   { success: true, message, registered: <newCount> }
 *
 * Idempotent: if the user has already registered (we track by a cookie),
 * the count is NOT incremented again and a friendly message is returned.
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const event = await db.event.findUnique({ where: { slug } })
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    if (!event.published) {
      return NextResponse.json({ error: "Event not available" }, { status: 410 })
    }

    // Optional body may carry an explicit eventId (per spec); we use the
    // slug from the URL as the source of truth and ignore mismatches.
    let bodyEventId: string | undefined
    try {
      const body = await req.json()
      bodyEventId = body?.eventId
    } catch {
      // No body / invalid JSON - fine, slug in URL is canonical.
    }
    if (bodyEventId && bodyEventId !== event.id) {
      // Tolerate - don't 400. The URL slug wins.
    }

    // Capacity check
    if (event.registered >= event.capacity && event.capacity > 0) {
      return NextResponse.json(
        { success: false, message: "This event is sold out.", soldOut: true },
        { status: 409 },
      )
    }

    // Use a cookie to make registration idempotent per browser. The cookie
    // name is `gx-event-reg-<slug>` and lives for 30 days. This prevents the
    // same user from inflating the count by clicking "Register" multiple
    // times without us having to introduce a join table.
    const cookieName = `gx-event-reg-${slug}`
    const alreadyRegistered = req.cookies.get(cookieName)?.value === "1"

    let newCount = event.registered
    if (!alreadyRegistered) {
      newCount = event.registered + 1
      await db.event.update({
        where: { id: event.id },
        data: { registered: newCount },
      })
    }

    const res = NextResponse.json({
      success: true,
      message: alreadyRegistered
        ? "You're already registered - see you there!"
        : `You're registered for ${event.title}.`,
      registered: newCount,
      alreadyRegistered,
    })

    if (!alreadyRegistered) {
      res.cookies.set(cookieName, "1", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      })
    }

    return res
  },
)
