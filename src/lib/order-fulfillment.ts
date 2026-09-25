import { db } from "@/lib/db"

/* ============================================================
   Order fulfillment helpers - shared post-payment pipeline
   ------------------------------------------------------------
   Used by /api/payment/paypal/* routes. The Razorpay verify
   route keeps its own inline copy (deliberately untouched -
   it is the proven live money path); new payment providers
   should use these helpers instead of duplicating again.
   ============================================================ */

export interface CourseAndCoupon {
  amount: number // original course price (INR)
  courseTitle: string
  discount: number
  finalAmount: number
  appliedCouponCode: string | null
}

/**
 * Validate a coupon against a course price.
 * Mirrors the logic in /api/payment/create-order (Razorpay path).
 * Returns either { ok: true, ...pricing } or { ok: false, error }.
 */
export async function resolveCourseAndCoupon(
  courseId: string | undefined,
  couponCode: string | undefined | null,
): Promise<{ ok: false; error: string; status?: number } | { ok: true; data: CourseAndCoupon }> {
  let amount = 0
  let courseTitle = "Course Enrollment"

  if (courseId) {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, shortName: true, price: true },
    })
    if (!course) return { ok: false, error: "Course not found", status: 404 }
    amount = course.price ?? 0
    courseTitle = course.title
  }

  if (amount <= 0) {
    return { ok: false, error: "This course is free - no payment required", status: 400 }
  }

  let discount = 0
  let finalAmount = amount
  let appliedCouponCode: string | null = null

  if (couponCode && couponCode.trim()) {
    const code = couponCode.trim()
    const coupon = await db.coupon.findUnique({ where: { code } })
    if (!coupon) return { ok: false, error: "Invalid coupon code", status: 400 }
    if (!coupon.active) return { ok: false, error: "Coupon is no longer active", status: 400 }
    if (coupon.usedCount >= coupon.maxUses) {
      return { ok: false, error: "Coupon usage limit reached", status: 400 }
    }
    const now = new Date()
    if (now < coupon.validFrom) return { ok: false, error: "Coupon is not yet valid", status: 400 }
    if (coupon.validUntil && now > coupon.validUntil) {
      return { ok: false, error: "Coupon has expired", status: 400 }
    }
    if (coupon.courseId && coupon.courseId !== courseId) {
      return { ok: false, error: "Coupon not valid for this course", status: 400 }
    }

    if (coupon.type === "percentage") {
      discount = Math.round((amount * coupon.value) / 100 * 100) / 100
    } else {
      discount = Math.min(coupon.value, amount)
    }
    finalAmount = Math.max(0, Math.round((amount - discount) * 100) / 100)
    appliedCouponCode = code
  }

  return { ok: true, data: { amount, courseTitle, discount, finalAmount, appliedCouponCode } }
}

/**
 * Post-payment fulfillment: coupon usage increment, enrollment,
 * XP + FIRST_STEP achievement, welcome email. Best-effort on the
 * peripheral steps - the enrollment itself is the critical part.
 * Idempotent: re-running for an already-enrolled user is a no-op.
 */
export async function fulfillOrderAfterPayment(
  order: { id: string; userId: string; courseId: string | null; couponCode: string | null; currency: string; finalAmount: number },
  user: { id: string; name?: string | null; email?: string | null },
): Promise<{ enrollment: unknown }> {
  // Increment coupon usage (if a coupon was applied)
  if (order.couponCode) {
    try {
      await db.coupon.update({
        where: { code: order.couponCode },
        data: { usedCount: { increment: 1 } },
      })
    } catch {
      // ignore - best effort
    }
  }

  // Enroll the student if the order has a course attached
  let enrollment: unknown = null
  if (order.courseId) {
    const existing = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: order.courseId } },
    })
    if (existing) {
      enrollment = existing
    } else {
      enrollment = await db.enrollment.create({
        data: {
          userId: user.id,
          courseId: order.courseId,
          lastAccessed: new Date(),
        },
      })
      await db.course.update({
        where: { id: order.courseId },
        data: { studentsCount: { increment: 1 } },
      })

      // Award XP for course_enrolled
      try {
        const { awardXp, awardSpecificAchievement } = await import("@/lib/gamification")
        await awardXp(user.id, "course_enrolled", 25, order.courseId)
        // Spec-mandated: award FIRST_STEP on the user's first paid enrollment
        try {
          await awardSpecificAchievement(user.id, "FIRST_STEP")
        } catch (e) {
          console.error("[fulfillment] FIRST_STEP award failed:", e)
        }
      } catch (e) {
        console.error("[fulfillment] awardXp failed:", e)
      }

      // Send welcome email (best-effort)
      try {
        const { sendEmail } = await import("@/lib/email")
        const enrollUser = await db.user.findUnique({
          where: { id: user.id },
          select: { email: true, name: true },
        })
        const course = await db.course.findUnique({
          where: { id: order.courseId },
          select: { title: true },
        })
        if (enrollUser && course) {
          await sendEmail({
            to: enrollUser.email,
            subject: `📚 Enrolled - ${course.title}`,
            body: `Hi ${enrollUser.name},\n\nYou've successfully enrolled in "${course.title}" on GuardianX Academy.\n\nDive in and start learning. Your journey to becoming a cyber guardian starts now!\n\nThe GuardianX Team`,
            type: "notification",
            userId: user.id,
          })
        }
      } catch (e) {
        console.error("[fulfillment] sendEmail failed:", e)
      }
    }
  }

  return { enrollment }
}
