import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { isEmiRemindersEnabled, EMI_PURPOSE_PREFIX, parseEmiPurpose } from "@/lib/installments"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* GET|POST /api/cron/emi-reminders
 * --------------------------------
 * Vercel Cron (daily) - see vercel.json "crons". Secured with the
 * CRON_SECRET env var: Vercel automatically sends
 *   Authorization: Bearer <CRON_SECRET>
 * Set CRON_SECRET in Vercel project env vars.
 *
 * State-free reminder policy (no reminder-sent column needed):
 *   - 3 days before due  -> "upcoming" reminder
 *   - 1 day before due   -> "final" reminder
 *   - 3 days after due   -> "overdue" notice
 * Each fires exactly once because the triggers are calendar-day
 * equations against the order's derived due date.
 */

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((b - a) / 86400000)
}

async function runReminders() {
  if (!(await isEmiRemindersEnabled())) {
    return { skipped: "EMI_REMINDERS_ENABLED is off", sent: 0 }
  }

  const orders = await db.order.findMany({
    where: { purpose: { startsWith: EMI_PURPOSE_PREFIX }, status: "created" },
    include: { user: { select: { id: true, name: true, email: true } }, course: { select: { title: true } } },
  })
  if (orders.length === 0) return { sent: 0, checked: 0 }

  // Gap days comes from the plan config (same default as installments lib)
  const { getEmiConfig } = await import("@/lib/installments")
  const emi = await getEmiConfig()
  const gapDays = emi.plans[0]?.dueDays?.[0] || 30

  const now = new Date()
  let sent = 0

  for (const order of orders) {
    const parsed = parseEmiPurpose(order.purpose)
    if (!parsed || !order.user?.email) continue
    if (parsed.index <= 1) continue // first installment is paid at checkout

    const dueAt = new Date(order.createdAt.getTime() + (parsed.index - 1) * gapDays * 86400000)
    const daysToDue = daysBetween(now, dueAt)

    let kind: "upcoming" | "final" | "overdue" | null = null
    if (daysToDue === 3) kind = "upcoming"
    else if (daysToDue === 1) kind = "final"
    else if (daysToDue === -3) kind = "overdue"
    if (!kind) continue

    const courseTitle = order.course?.title || "your course"
    const amount = `${order.currency === "USD" ? "$" : "₹"}${order.finalAmount.toLocaleString(order.currency === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const dueLabel = dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

    const subject =
      kind === "overdue"
        ? `Action needed: installment ${parsed.index} of ${parsed.total} for ${courseTitle} is overdue`
        : kind === "final"
          ? `Reminder: installment ${parsed.index} of ${parsed.total} for ${courseTitle} is due tomorrow`
          : `Reminder: installment ${parsed.index} of ${parsed.total} for ${courseTitle} due on ${dueLabel}`

    const body = [
      `Hi ${order.user.name || "there"},`,
      "",
      kind === "overdue"
        ? `Your installment ${parsed.index} of ${parsed.total} (${amount}) for "${courseTitle}" was due on ${dueLabel} and is still unpaid.`
        : `This is a friendly reminder that installment ${parsed.index} of ${parsed.total} (${amount}) for "${courseTitle}" is due on ${dueLabel}.`,
      "",
      "Pay it in under a minute from your dashboard - the Pending installments card accepts Razorpay (UPI/cards) and PayPal:",
      "https://academy.guardianx.cloud/dashboard",
      "",
      "A receipt is emailed automatically after every payment.",
      "",
      "The GuardianX Team",
    ].join("\n")

    try {
      const ok = await sendEmail({ to: order.user.email, subject, body, type: "notification", userId: order.user.id })
      if (ok) sent++
    } catch {
      // best-effort
    }
  }

  return { sent, checked: orders.length }
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // cron not configured - refuse to run unprotected
  const header = req.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await runReminders()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
