import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { ensureTable } from "@/lib/db-safe"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


// Rate limiting - prevent spam abuse
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 3 // 3 messages per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(3).max(200),
  category: z.string().max(50).optional(),
  message: z.string().min(10).max(5000),
})

/**
 * Public contact form endpoint.
 * Saves the message as an EmailLog (type: "notification") and
 * sends a confirmation email back to the submitter.
 *
 * No auth required - this is a public form. Rate limited to prevent abuse.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a minute before trying again." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      )
    }
    const { name, email, subject, category, message } = parsed.data

    const validCategories = ["general", "partnership", "courses", "technical", "careers"]
    const safeCategory = validCategories.includes(category ?? "") ? category : "general"

    const fullSubject = `[Contact: ${safeCategory}] ${subject}`
    const fullBody = `Name: ${name}\nEmail: ${email}\nCategory: ${safeCategory}\nSubject: ${subject}\n\nMessage:\n${message}`

    // Log to EmailLog table (so admins can see all contact submissions)
    await db.emailLog.create({
      data: {
        toEmail: "academy@guardianx.in",
        subject: fullSubject,
        body: fullBody,
        type: "notification",
        status: "sent",
      },
    })

    // Also create a Lead in the CRM so the sales team can follow up.
    // Self-heal the CRM tables first (LeadStatusHistory arrived late - on a
    // drifted prod DB the old nested history create threw and a swallowing
    // .catch(() => null) silently DROPPED the lead while the form still
    // reported success). The lead itself is the critical record: create it
    // standalone, then write history best-effort with LOUD logging so a
    // failure can never again happen invisibly.
    let leadCaptured = false
    try {
      await ensureTable("Lead")
      await ensureTable("LeadStatusHistory")
      const lead = await db.lead.create({
        data: {
          name,
          email,
          organization: safeCategory,
          type: "Individual",
          source: "Contact Form",
          score: 20,
        },
      })
      leadCaptured = true
      try {
        await db.leadStatusHistory.create({
          data: { leadId: lead.id, fromStatus: null, toStatus: "New" },
        })
      } catch (histErr) {
        console.error("[contact] LeadStatusHistory write failed (lead still captured):", histErr)
      }
    } catch (leadErr) {
      // Never break the contact form UX, but NEVER let a lost enquiry be
      // invisible: the EmailLog above still holds the full message.
      console.error(`[contact] LEAD NOT CAPTURED (leadCaptured=${leadCaptured}) - enquiry from ${email} lost to CRM:`, leadErr)
    }

    // Send confirmation email to the submitter
    await sendEmail({
      to: email,
      subject: `✓ We received your message - GuardianX Academy`,
      body: `Hi ${name},\n\nThank you for reaching out to GuardianX Academy! We've received your message:\n\n"${subject}"\n\nOur team will review your inquiry and respond within 24 hours.\n\nCategory: ${safeCategory}\n\nBest regards,\nThe GuardianX Team\n\nacademy.guardianx.cloud`,
      type: "notification",
    })

    return NextResponse.json({ ok: true, message: "Message sent successfully" })
  } catch (err: any) {
    console.error("Contact form error:", err)
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    )
  }
}
