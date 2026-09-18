import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyAdmins, leadNotificationEmailTemplate, sendEmail } from "@/lib/email"
import { getSetting } from "@/lib/settings"

export const runtime = "nodejs"

/* POST /api/crm/batch-webhook
 *
 * Google Apps Script webhook receiver for per-batch Google Forms.
 * When a batch's Google Form is submitted, the per-batch Apps Script
 * sends the response here with the batchId baked in.
 *
 * Expected body (from the per-batch Apps Script):
 * {
 *   "token": "<CRM_WEBHOOK_SECRET>",
 *   "formId": "form-id-from-google",
 *   "lead": {
 *     "batchId": "cmt...",        // baked into the script
 *     "batchName": "CEH Weekend",  // baked into the script
 *     "certification": "CEH",       // baked into the script
 *     "name": "John Doe",
 *     "whatsappNumber": "+91 98765 43210",
 *     "linkedinProfile": "https://linkedin.com/in/johndoe",
 *     "professionalStatus": "Working Professional",
 *     "jobRole": "Software Engineer"
 *   }
 * }
 *
 * Creates a BatchLead record linked to the correct batch.
 * No auth — the webhook URL + token provide security.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    // SECURITY: verify the webhook secret. There is NO hardcoded fallback —
    // the previous default ("guardianx-crm-webhook-2025") was shipped in a
    // public file and let anyone inject leads / email-bomb admins.
    // Set CRM_WEBHOOK_SECRET (env or Platform Settings) and share it with
    // the Google Apps Script out-of-band.
    const { timingSafeEqual } = await import("crypto")
    const webhookSecret = await getSetting("CRM_WEBHOOK_SECRET")
    if (!webhookSecret) {
      console.error("[crm/webhook] CRM_WEBHOOK_SECRET not configured — rejecting webhook")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }
    const provided = typeof body.token === "string" ? body.token : ""
    const a = Buffer.from(webhookSecret)
    const b = Buffer.from(provided)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 })
    }
    // Rate limit per IP (spam/DoS protection on an unauthenticated endpoint)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { rateLimit } = await import("@/lib/session")
    if (!rateLimit(`crm-webhook:${ip}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const lead = body.lead || {}
    if (!lead.batchId) {
      return NextResponse.json({ error: "batchId is required (use the per-batch Apps Script)" }, { status: 400 })
    }
    if (!lead.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!lead.whatsappNumber) {
      return NextResponse.json({ error: "WhatsApp number is required" }, { status: 400 })
    }

    // Verify the batch exists
    const batch = await db.trainingBatch.findUnique({
      where: { id: lead.batchId },
      select: { id: true, name: true, certification: true, schedule: true, startDate: true, mode: true },
    })
    if (!batch) {
      return NextResponse.json({ error: "Batch not found for batchId: " + lead.batchId }, { status: 404 })
    }

    // Create the BatchLead
    const batchLead = await db.batchLead.create({
      data: {
        batchId: batch.id,
        name: String(lead.name).trim(),
        whatsappNumber: String(lead.whatsappNumber).trim(),
        linkedinProfile: lead.linkedinProfile ? String(lead.linkedinProfile).trim() : null,
        professionalStatus: lead.professionalStatus ? String(lead.professionalStatus).trim() : null,
        jobRole: lead.jobRole ? String(lead.jobRole).trim() : null,
        source: "Google Form",
      },
    })

    // --- email notification to admins ---
    await notifyAdmins(
      `New Batch Lead — ${batch.name} (${batch.certification}) — ${lead.name}`,
      leadNotificationEmailTemplate(`Batch Lead — ${batch.name}`, [
        { label: "Name", value: String(lead.name).trim() },
        { label: "WhatsApp", value: String(lead.whatsappNumber).trim() },
        { label: "LinkedIn", value: lead.linkedinProfile ? String(lead.linkedinProfile).trim() : "—" },
        { label: "Status", value: lead.professionalStatus ? String(lead.professionalStatus).trim() : "—" },
        { label: "Job role", value: lead.jobRole ? String(lead.jobRole).trim() : "—" },
        { label: "Batch", value: `${batch.name} (${batch.certification})` },
      ])
    )

    // --- send confirmation email to the candidate ---
    // The candidate's email isn't collected in the 5-question form (only WhatsApp),
    // so we can't send them an email directly. But if we add email to the form
    // later, this will work. For now, the admin notification is sufficient.
    // If the lead has a linkedinProfile with an email-like value, try sending.
    const candidateEmail = lead.email as string | undefined
    if (candidateEmail && candidateEmail.includes("@")) {
      await sendEmail({
        to: candidateEmail,
        subject: `Registration received — ${batch.name} | GuardianX Academy`,
        html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; padding: 40px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Guardian<span style="color: #a78bfa;">X</span> Academy</h1>
  </div>
  <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 16px;">Registration Received ✅</h2>
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">Hi ${String(lead.name).trim()},</p>
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">We've received your registration for <strong style="color: #a78bfa;">${batch.name}</strong> (${batch.certification}). Our team will contact you on WhatsApp within 24 hours to complete the enrollment process.</p>
  <div style="background: #11111a; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">Batch details:</p>
    <p style="color: #ffffff; font-size: 14px; margin: 4px 0 0 0;">${batch.name}</p>
    <p style="color: #9ca3af; font-size: 12px; margin: 2px 0 0 0;">${batch.schedule || ""} · ${batch.startDate || ""} · ${batch.mode}</p>
  </div>
  <p style="color: #6b7280; font-size: 12px;">If you have questions, WhatsApp us or email hello@guardianx.in</p>
  <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;" />
  <p style="color: #4b5563; font-size: 11px;">GuardianX Academy · academy.guardianx.cloud</p>
</div>
`,
      })
    }

    return NextResponse.json({ ok: true, id: batchLead.id }, { status: 201 })
  } catch (error: any) {
    // If it's a unique constraint (duplicate submission), return a friendly error
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate lead — this form has already been submitted" }, { status: 409 })
    }
    console.error("[batch-webhook] Error:", error?.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
