import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, withErrorHandler } from "@/lib/session"
import { randomBytes } from "crypto"
import { getSettings } from "@/lib/settings"

export const runtime = "nodejs"

const CERT_PRICE = 199 // INR
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+91[\-\s]?)?[6-9]\d{9}$/

/* POST /api/cyber-quiz/checkout
 * Called after a passed attempt. Captures candidate name + email, creates
 * an Order (purpose=QUIZ_CERT), returns mock Razorpay order details.
 * The verify-payment endpoint will issue the certificate after payment.
 *
 * Body: { attemptId, name, email, phone? }
 *
 * Returns: { orderId, amount, currency, razorpayOrderId, keyId, mock, attemptId, name, email }
 */
export const POST = withErrorHandler(async (req) => {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { attemptId, name, email, phone } = body ?? {}

  if (!attemptId || typeof attemptId !== "string") {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 })
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 400 })
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  if (phone && !PHONE_RE.test(String(phone).replace(/[\-\s]/g, ""))) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
  }

  // Load the attempt + verify it passed
  const attempt = await db.cyberQuizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true, passed: true, percentage: true, score: true,
      totalQuestions: true, difficulty: true, domainScores: true,
      certificateId: true, userId: true,
    },
  })

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
  }
  if (!attempt.passed) {
    return NextResponse.json({ error: "You can only get a certificate for a passed attempt" }, { status: 400 })
  }
  if (attempt.certificateId) {
    return NextResponse.json({ error: "A certificate has already been issued for this attempt", existingCertificateId: attempt.certificateId }, { status: 400 })
  }

  // Resolve the user (prefer logged-in; fall back to guest)
  const currentUser = await getCurrentUser().catch(() => null)
  let userId = currentUser?.id
  if (!userId) {
    // Auto-create a guest User account so we have a userId for the Order
    const existingUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existingUser) {
      userId = existingUser.id
    } else {
      const newUser = await db.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          passwordHash: "$2a$12$" + randomBytes(24).toString("hex"), // unusable random - login via Google/creds only
          role: "STUDENT",
          title: "Cyber Security Foundation - certificate holder",
        },
      })
      userId = newUser.id
    }
  }

  // Update the attempt with guest email/name + link the user
  await db.cyberQuizAttempt.update({
    where: { id: attemptId },
    data: {
      userId,
      guestEmail: email.trim().toLowerCase(),
      guestName: name.trim(),
    },
  })

  // --- Create the Razorpay order (real or mock) ---
  const s = await getSettings(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"])
  const keyId = s.RAZORPAY_KEY_ID
  const keySecret = s.RAZORPAY_KEY_SECRET
  const isMock = !keyId || !keySecret

  let razorpayOrderId: string

  if (isMock) {
    razorpayOrderId = "order_" + randomBytes(12).toString("hex")
  } else {
    // Real Razorpay - create order via REST API
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: CERT_PRICE * 100, // paise
        currency: "INR",
        receipt: `quiz_${attemptId.slice(-8)}_${Date.now()}`,
        notes: { attemptId, difficulty: attempt.difficulty },
      }),
    })
    if (!res.ok) {
      console.error("[quiz-checkout] Razorpay order creation failed:", await res.text())
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 })
    }
    const rzpOrder = await res.json()
    razorpayOrderId = rzpOrder.id
  }

  const order = await db.order.create({
    data: {
      userId,
      amount: CERT_PRICE,
      currency: "INR",
      status: "created",
      razorpayOrderId,
      finalAmount: CERT_PRICE,
      purpose: "QUIZ_CERT",
      quizAttemptId: attemptId,
    },
  })

  return NextResponse.json({
    orderId: order.id,
    amount: CERT_PRICE,
    currency: "INR",
    razorpayOrderId,
    keyId: keyId || "rzp_test_mock",
    mock: isMock,
    attemptId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
  })
})
