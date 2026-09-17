import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"
import { createHash, createHmac, timingSafeEqual, randomBytes } from "crypto"
import { getSetting } from "@/lib/settings"

export const runtime = "nodejs"

/* POST /api/cyber-quiz/verify-payment
 * Called after the candidate pays via Razorpay checkout. Verifies the payment
 * (mock mode accepts any non-empty paymentId), marks the Order as paid, and
 * auto-issues the CyberSecurityCertificate + verification hash + URL.
 *
 * Body: { orderId, razorpayPaymentId, razorpaySignature }
 *
 * Returns: { ok: true, credentialId, verificationUrl, certificate }
 */
export const POST = withErrorHandler(async (req) => {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { orderId, razorpayPaymentId, razorpaySignature } = body ?? {}

  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 })
  if (!razorpayPaymentId) return NextResponse.json({ error: "razorpayPaymentId is required" }, { status: 400 })
  if (!razorpaySignature) return NextResponse.json({ error: "razorpaySignature is required" }, { status: 400 })

  // Load the order
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (order.purpose !== "QUIZ_CERT") {
    return NextResponse.json({ error: "This order is not a quiz certificate order" }, { status: 400 })
  }
  if (order.status === "paid") {
    return NextResponse.json({ error: "Order already paid", alreadyPaid: true }, { status: 400 })
  }

  // --- Payment verification ---
  // Real HMAC SHA-256 verification when RAZORPAY_KEY_SECRET is set.
  // Mock mode (no secret) accepts any non-empty paymentId + signature.
  const keySecret = await getSetting("RAZORPAY_KEY_SECRET")
  if (keySecret) {
    const expected = createHmac("sha256", keySecret)
      .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex")
    const expectedBuf = Buffer.from(expected, "hex")
    const providedBuf = Buffer.from(razorpaySignature, "hex")
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 })
    }
  }

  // Mark order as paid
  await db.order.update({
    where: { id: orderId },
    data: {
      status: "paid",
      razorpayPaymentId,
      razorpaySignature,
    },
  })

  // Load the attempt
  const attempt = await db.cyberQuizAttempt.findUnique({
    where: { id: order.quizAttemptId || "" },
  })
  if (!attempt) {
    return NextResponse.json({ error: "Linked attempt not found" }, { status: 500 })
  }
  if (!attempt.passed) {
    return NextResponse.json({ error: "Attempt did not pass — cannot issue certificate" }, { status: 400 })
  }

  // Check if a cert already exists for this attempt (idempotency)
  const existing = await db.cyberQuizCertificate.findUnique({
    where: { attemptId: attempt.id },
  })
  if (existing) {
    return NextResponse.json({ ok: true, certificate: existing, alreadyExisted: true })
  }

  // Generate the credential ID: GX-QUIZ-YYYY-XXXX
  const year = new Date().getFullYear()
  const seq = randomBytes(2).toString("hex").toUpperCase().padStart(4, "0").slice(0, 4)
  const credentialId = `GX-QUIZ-${year}-${seq}`

  // Tamper-evident verification hash
  const verificationHash = createHash("sha256")
    .update(`${credentialId}|${attempt.id}|${order.id}|${attempt.guestEmail || order.user.email}|${attempt.percentage}`)
    .digest("hex")

  const verificationUrl = `https://academy.guardianx.cloud/verify?id=${credentialId}`

  // Auto-issue the certificate
  const cert = await db.cyberQuizCertificate.create({
    data: {
      credentialId,
      attemptId: attempt.id,
      orderId: order.id,
      candidateName: attempt.guestName || order.user.name,
      email: attempt.guestEmail || order.user.email,
      difficulty: attempt.difficulty,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      domainScores: attempt.domainScores || "{}",
      verificationHash,
      verificationUrl,
      status: "valid",
    },
  })

  // Link the cert back to the attempt
  await db.cyberQuizAttempt.update({
    where: { id: attempt.id },
    data: { certificateId: credentialId },
  })

  return NextResponse.json({ ok: true, certificate: cert, verificationUrl })
})
