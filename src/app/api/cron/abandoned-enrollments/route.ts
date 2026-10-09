import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* GET|POST /api/cron/abandoned-enrollments
 * ----------------------------------------
 * Vercel Cron (daily, 18:00 IST) - see vercel.json "crons". Secured with
 * the CRON_SECRET env var (same pattern as emi-reminders/watchdog):
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; the endpoint refuses
 * to run unprotected (401 when CRON_SECRET is unset).
 *
 * Purpose: recover revenue from checkout drop-offs. A student who started
 * enrolling (Razorpay/PayPal order created) but never completed payment
 * gets ONE friendly "finish your enrollment" email per order.
 *
 * Exactly-once policy (no schema changes):
 *   - Only orders with status "created" (never paid/failed/refunded).
 *   - Only purpose COURSE (quiz-cert payments have their own flow/UI).
 *   - Window: created 6h..10d ago (6h = give the checkout session time;
 *     10d = stop nudging after that, the lead is cold).
 *   - Skip when the user is ALREADY enrolled in the course (paid via a
 *     different order / given access manually).
 *   - Skip when a NEWER order for the same user+course was already paid.
 *   - Dedup: one recovery email per order, tracked via EmailLog rows
 *     (type "recovery", the order id appears in the logged body).
 *   - Kill switch: PlatformSetting ABANDONED_RECOVERY_ENABLED = "false"
 *     disables the run (absent/anything else = enabled).
 *   - Hard cap 100 emails per run.
 */

const MIN_AGE_HOURS = 6
const MAX_AGE_DAYS = 10
const MAX_EMAILS_PER_RUN = 100

async function recoveryEnabled(): Promise<boolean> {
  try {
    const row = await db.platformSetting.findUnique({ where: { key: "ABANDONED_RECOVERY_ENABLED" } })
    if (row && row.value.trim().toLowerCase() === "false") return false
  } catch {
    // Settings table unavailable - default to enabled, the email loop has
    // its own try/catch per order.
  }
  return true
}

async function runRecovery() {
  if (!(await recoveryEnabled())) {
    return { skipped: "ABANDONED_RECOVERY_ENABLED is off", sent: 0, checked: 0 }
  }

  const now = Date.now()
  const createdBefore = new Date(now - MIN_AGE_HOURS * 3_600_000)
  const createdAfter = new Date(now - MAX_AGE_DAYS * 86_400_000)

  const orders = await db.order.findMany({
    where: { purpose: "COURSE", status: "created", createdAt: { gte: createdAfter, lt: createdBefore } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  })
  if (orders.length === 0) return { sent: 0, checked: 0 }

  let sent = 0
  let skipped = 0

  for (const order of orders) {
    if (sent >= MAX_EMAILS_PER_RUN) break
    try {
      const user = order.user
      const course = order.course
      if (!user?.email || !course) { skipped++; continue }

      // Already enrolled through some other path? Never nudge.
      const enrolled = await db.enrollment.findFirst({
        where: { userId: user.id, courseId: course.id },
        select: { id: true },
      })
      if (enrolled) { skipped++; continue }

      // A newer order for the same course already paid? This one is moot.
      const newerPaid = await db.order.findFirst({
        where: { userId: user.id, courseId: course.id, status: "paid", createdAt: { gt: order.createdAt } },
        select: { id: true },
      })
      if (newerPaid) { skipped++; continue }

      // Exactly-once: skip if this order already got its recovery email.
      const alreadySent = await db.emailLog.findFirst({
        where: { toEmail: user.email, type: "recovery", body: { contains: order.id } },
        select: { id: true },
      })
      if (alreadySent) { skipped++; continue }

      const firstName = (user.name || "there").split(" ")[0]
      const courseTitle = course.title
      const currency = order.currency === "USD"
      const amount = `${currency ? "$" : "₹"}${order.finalAmount.toLocaleString(currency ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const courseUrl = `https://academy.guardianx.cloud/course/${course.id}`

      const subject = `You're almost enrolled: ${courseTitle}`
      const body = [
        `Hi ${firstName},`,
        "",
        `Your enrollment for "${courseTitle}" is one step away from done - we saved your spot and your ${amount} order is still open.`,
        "",
        "Picking up where you left off takes under a minute: open the course page and complete the payment (Razorpay accepts UPI, cards and netbanking; PayPal is available for international cards):",
        courseUrl,
        "",
        "If something went wrong during checkout - a failed OTP, a dropped connection, a coupon that would not apply - just reply to this email and we will sort it out for you.",
        "",
        `Reference: ${order.id}`,
        "",
        "The GuardianX Team",
      ].join("\n")

      const ok = await sendEmail({ to: user.email, subject, body })
      await db.emailLog.create({
        data: {
          userId: user.id,
          toEmail: user.email,
          subject,
          body,
          type: "recovery",
          status: ok ? "sent" : "failed",
        },
      })
      if (ok) sent++; else skipped++
    } catch {
      // One bad order must never stop the run.
      skipped++
    }
  }

  return { sent, checked: orders.length, skipped }
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // cron not configured - refuse to run unprotected
  const header = req.headers.get("authorization") || ""
  const expected = `Bearer ${secret}`
  // Timing-safe compare so the secret cannot be recovered bit-by-bit
  // from response-time analysis.
  if (header.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await runRecovery()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
