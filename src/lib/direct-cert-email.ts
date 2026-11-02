import { db } from "@/lib/db"
import { sendEmailDetailed, emailSocialLinksHtml } from "@/lib/email"

/* ============================================================
 * Direct-certificate credential email.
 *
 * Mirrors the offer-email flow (dual-transport mailer, branded
 * BLACKOPS-toned body, never throws into the admin's flow) - but
 * WITHOUT a PDF attachment: certificate + progress-report PDFs are
 * generated client-side by the same vector/print engine used on
 * /verify (house-wide behaviour). The email therefore carries the
 * certificate ID + the verify link where both PDFs are one click
 * away for the student.
 *
 * Honesty rule: the email never promises anything beyond the
 * credential itself - what the admin entered is exactly what the
 * student sees.
 * ============================================================ */

const SITE_ORIGIN = "https://academy.guardianx.cloud"

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function buildDirectCertEmailHtml(r: {
  studentName: string
  programTitle: string
  certificateId: string
  grade?: string | null
  collegeName?: string | null
  mentorName?: string | null
  certificateIssuedAt?: string | Date | null
}): string {
  const firstName = r.studentName.split(/\s+/)[0] || "student"
  const verifyUrl = `${SITE_ORIGIN}/verify/${encodeURIComponent(r.certificateId)}`

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#8e8598;white-space:nowrap;padding-right:14px;">${esc(label)}</td>
      <td style="padding:6px 0;font-size:13px;color:#faf7f5;font-weight:600;">${esc(value)}</td>
    </tr>`

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0507;border-radius:12px;border:1px solid #3a1218;">
  <div style="text-align:center;padding:30px 40px 0;">
    <h1 style="color:#ffffff;font-size:24px;margin:0;">Guardian<span style="color:#e11d2e;">X</span> Academy</h1>
    <p style="color:#8e8598;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;margin-top:5px;">Cyber Defense Institute</p>
    <div style="height:2px;width:64px;background:linear-gradient(90deg,#e11d2e,#f59e0b,#ff5a4e);margin:18px auto 0;border-radius:2px;"></div>
  </div>
  <div style="padding:22px 40px 8px;">
    <p style="color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:0.28em;margin:0 0 10px;">CERTIFICATE ISSUED</p>
    <h2 style="color:#ffffff;font-size:19px;margin:0 0 14px;">Congratulations, ${esc(firstName)} - your certificate is ready.</h2>
    <p style="color:#c2b9bd;font-size:13.5px;line-height:1.7;margin:0 0 18px;">
      GuardianX Academy has issued you a verifiable certificate for the program below. Open the verification
      page to view the credential, download the certificate PDF and your progress report - anyone can confirm
      its authenticity using the same link.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#150709;border:1px solid #3a1218;border-radius:10px;padding:14px 18px;">
      ${row("CANDIDATE", r.studentName)}
      ${row("PROGRAM", r.programTitle)}
      ${r.collegeName ? row("INSTITUTION", r.collegeName) : ""}
      ${r.mentorName ? row("MENTOR", r.mentorName) : ""}
      ${r.grade ? row("GRADE", r.grade) : ""}
      ${row("ISSUED", fmtDate(r.certificateIssuedAt))}
      ${row("CERTIFICATE ID", r.certificateId)}
    </table>
    <div style="margin:18px 0 0;padding:12px 16px;background:#1a0b0e;border:1px solid #e11d2e40;border-radius:10px;">
      <p style="margin:0;font-size:12px;color:#d8a0a8;line-height:1.6;">
        <strong style="color:#ff6b5e;">Keep your ID safe:</strong>
        <strong style="color:#faf7f5;">${esc(r.certificateId)}</strong> - share it with employers along with the
        verification link. A revoked or hidden certificate will honestly show its status on the same page.
      </p>
    </div>
    <div style="text-align:center;margin:22px 0 4px;">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#e11d2e,#b3141f);color:#ffffff;font-size:14px;font-weight:700;padding:13px 30px;border-radius:8px;text-decoration:none;letter-spacing:0.04em;">View &amp; download your certificate</a>
    </div>
  </div>
  <hr style="border:none;border-top:1px solid #2a0f13;margin:16px 0 0;" />
  <div style="padding:14px 40px 22px;text-align:center;">
    <p style="color:#6d6266;font-size:11px;margin:0 0 4px;">GuardianX Academy · Cyber Security Training in India · <a href="${SITE_ORIGIN}" style="color:#8e8598;text-decoration:none;">academy.guardianx.cloud</a></p>
    ${emailSocialLinksHtml("dark")}
  </div>
</div>`
}

/**
 * Email the credential to the student on a direct-certificate record.
 * Best-effort: a mail outage returns { ok:false, error } and NEVER
 * blocks the admin's issue flow. Idempotent on resend (same call).
 */
export async function emailDirectCertificate(
  recordId: string
): Promise<{ ok: boolean; error?: string; transport?: string; skipped?: string }> {
  const record = await db.directCertificate.findUnique({ where: { id: recordId } })
  if (!record) return { ok: false, error: "Certificate record not found" }
  if (!record.studentEmail || !record.studentEmail.trim()) {
    return { ok: false, skipped: "no-email", error: "This student has no email on the record - add one first." }
  }

  const html = buildDirectCertEmailHtml({
    studentName: record.studentName,
    programTitle: record.programTitle,
    certificateId: record.certificateId,
    grade: record.grade,
    collegeName: record.collegeName,
    mentorName: record.mentorName,
    certificateIssuedAt: record.certificateIssuedAt,
  })

  const result = await sendEmailDetailed({
    to: record.studentEmail.trim(),
    subject: `Your GuardianX Certificate - ${record.programTitle} (${record.certificateId})`,
    html,
  })

  if (result.ok) {
    await db.directCertificate
      .update({ where: { id: record.id }, data: { emailedAt: new Date() } })
      .catch(() => null)
  }
  console.log(
    `[direct-cert-email] ${record.certificateId} for ${record.studentName}: ok=${result.ok} transport=${result.transport ?? "none"}`
  )
  return result
}
