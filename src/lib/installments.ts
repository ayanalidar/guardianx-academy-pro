import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"

/* ============================================================
   EMI / installment plans - platform-managed "Pay in N"
   ------------------------------------------------------------
   Two plans ship out of the box: Pay in 2 (50/50) and
   Pay in 3 (40/30/30). Everything is admin-editable via
   Platform Settings (Admin → Settings → Payments):

     EMI_ENABLED          - master toggle (default on)
     EMI_MIN_AMOUNT       - hide plans below this final ₹ price
     EMI_PLAN_2_SPLIT     - "50,50"
     EMI_PLAN_3_SPLIT     - "40,30,30"
     EMI_DUE_GAP_DAYS     - days between installments (default 30)
     EMI_REMINDERS_ENABLED - daily cron reminder emails

   Zero-migration mechanics: each installment is its own Order
   row. The `purpose` field carries the marker
   "COURSE_EMI_<i>_OF_<N>" (nothing checks exact COURSE values;
   the quiz flow only rejects non-QUIZ_CERT). Due dates derive
   from createdAt + i * EMI_DUE_GAP_DAYS - no new columns.

   Access policy: paying installment 1 creates the paid order
   that unlocks enrollment (existing enroll gate). Later
   installments are paid from the dashboard banner.
   ============================================================ */

export const EMI_PURPOSE_PREFIX = "COURSE_EMI"

export interface EmiPlan {
  installments: number
  /** Normalized percentage weights, e.g. [50, 50] */
  split: number[]
  /** Due offsets in days from purchase for installments 2..N */
  dueDays: number[]
}

export interface EmiConfig {
  enabled: boolean
  minAmount: number
  plans: EmiPlan[]
}

const DEFAULTS = {
  enabled: true,
  minAmount: 1000,
  plan2: [50, 50],
  plan3: [40, 30, 30],
  gapDays: 30,
  reminders: true,
}

function parseSplit(raw: string | null | undefined, fallback: number[]): number[] {
  if (!raw?.trim()) return fallback
  const parts = raw.split(",").map((s) => Number.parseFloat(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
  if (parts.length < 2) return fallback
  const sum = parts.reduce((a, b) => a + b, 0)
  if (sum <= 0) return fallback
  return parts.map((p) => (p / sum) * 100) // normalize to percentages
}

export async function getEmiConfig(): Promise<EmiConfig> {
  const s = await getSettings([
    "EMI_ENABLED", "EMI_MIN_AMOUNT", "EMI_PLAN_2_SPLIT", "EMI_PLAN_3_SPLIT", "EMI_DUE_GAP_DAYS",
  ])

  const enabled = s.EMI_ENABLED == null || s.EMI_ENABLED.trim() === ""
    ? DEFAULTS.enabled
    : ["true", "1", "yes", "on"].includes(s.EMI_ENABLED.trim().toLowerCase())

  const parsedMin = Number.parseFloat(s.EMI_MIN_AMOUNT || "")
  const minAmount = Number.isFinite(parsedMin) && parsedMin >= 0 ? parsedMin : DEFAULTS.minAmount

  const parsedGap = Number.parseInt(s.EMI_DUE_GAP_DAYS || "", 10)
  const gapDays = Number.isFinite(parsedGap) && parsedGap >= 1 ? parsedGap : DEFAULTS.gapDays

  const plan2Split = parseSplit(s.EMI_PLAN_2_SPLIT, DEFAULTS.plan2)
  const plan3Split = parseSplit(s.EMI_PLAN_3_SPLIT, DEFAULTS.plan3)

  return {
    enabled,
    minAmount,
    plans: [
      { installments: 2, split: plan2Split, dueDays: Array.from({ length: 1 }, (_, i) => (i + 1) * gapDays) },
      { installments: 3, split: plan3Split, dueDays: Array.from({ length: 2 }, (_, i) => (i + 1) * gapDays) },
    ],
  }
}

export async function isEmiRemindersEnabled(): Promise<boolean> {
  const s = await getSettings(["EMI_REMINDERS_ENABLED"])
  if (s.EMI_REMINDERS_ENABLED == null || s.EMI_REMINDERS_ENABLED.trim() === "") return DEFAULTS.reminders
  return ["true", "1", "yes", "on"].includes(s.EMI_REMINDERS_ENABLED.trim().toLowerCase())
}

/**
 * Split a total into installment shares (2dp) using plan weights.
 * The remainder lands on the LAST share so shares sum exactly to
 * the total (no missing paisa).
 */
export function computeShares(total: number, plan: EmiPlan): number[] {
  const shares = plan.split.map((w) => Math.round(((total * w) / 100) * 100) / 100)
  const drift = Math.round((total - shares.reduce((a, b) => a + b, 0)) * 100) / 100
  shares[shares.length - 1] = Math.round((shares[shares.length - 1] + drift) * 100) / 100
  return shares
}

/** purpose marker for installment i (1-based) of N */
export function emiPurposeOf(index: number, total: number): string {
  return `${EMI_PURPOSE_PREFIX}_${index}_OF_${total}`
}

/** Parse "COURSE_EMI_2_OF_3" → { index: 2, total: 3 }; null when not EMI */
export function parseEmiPurpose(purpose: string | null | undefined): { index: number; total: number } | null {
  if (!purpose || !purpose.startsWith(EMI_PURPOSE_PREFIX)) return null
  const m = purpose.match(/^COURSE_EMI_(\d+)_OF_(\d+)$/)
  if (!m) return null
  const index = Number.parseInt(m[1], 10)
  const total = Number.parseInt(m[2], 10)
  if (!Number.isFinite(index) || !Number.isFinite(total) || index < 1 || total < 2 || index > total) return null
  return { index, total }
}

/** Due date for installment i (1-based) of a plan purchased at `purchasedAt`.
 *  Installment 1 is due immediately; installment i is due (i-1) * gapDays
 *  after purchase (2nd at day 30, 3rd at day 60 with the 30-day gap). */
export function emiDueDate(purchasedAt: Date, index: number, gapDays: number): Date | null {
  if (index <= 1) return null // first installment is due immediately
  return new Date(purchasedAt.getTime() + (index - 1) * gapDays * 24 * 60 * 60 * 1000)
}

/**
 * Guard against overlapping plans: a user may only have one active
 * (unpaid) installment plan per course. Keeps sibling grouping
 * unambiguous without a plan-id column.
 */
export async function hasPendingEmiPlan(userId: string, courseId: string): Promise<boolean> {
  const count = await db.order.count({
    where: { userId, courseId, status: "created", purpose: { startsWith: EMI_PURPOSE_PREFIX } },
  })
  return count > 0
}
