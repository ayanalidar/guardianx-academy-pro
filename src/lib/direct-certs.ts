import { generateCredentialId, generateVerificationHash } from "@/lib/credentials"
import { db } from "@/lib/db"
import { normalizeProjectEntries } from "@/lib/internship-projects"

/* ============================================================
 * Direct-certificate shared helpers (server + client safe maps).
 *
 * Direct certificates are minted WITHOUT an internship enrollment:
 * the admin fills a form, presses "Issue certificate", and the
 * record is created WITH its GXI- certificateId + tamper-evident
 * hash in one transaction. Same certificate family, same verify
 * flow, same PHANTOM certificate sheet + progress report as the
 * internship certificates - just no Internship/InternshipRecord
 * behind it.
 * ============================================================ */

/** Shape of a DirectCertificate row as the API returns it. */
export interface DirectCertRecord {
  id: string
  certificateId: string
  studentName: string
  studentEmail: string | null
  photoUrl: string | null
  programTitle: string
  collegeName: string | null
  mentorName: string | null
  durationWeeks: number | null
  startDate: Date | string | null
  endDate: Date | string | null
  skills: string // JSON array
  projects: string // JSON array of {title, description}
  grade: string | null
  score: number | null
  remarks: string | null
  programDirector: string | null
  status: string // valid | revoked
  showPublicly: boolean
  verificationHash: string | null
  certificateIssuedAt: Date | string
  emailedAt: Date | string | null
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean).slice(0, 25) : []
  } catch {
    return []
  }
}

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  return isNaN(dt.getTime()) ? null : dt.toISOString()
}

/**
 * Mint a GXI- certificate id that is unique across BOTH certificate
 * tables (DirectCertificate AND InternshipRecord share the GXI family,
 * and the verify route checks internship records first). Collisions are
 * astronomically unlikely (48-bit random suffix) - this is belt and
 * braces so a colliding id can never shadow another certificate.
 */
export async function mintUniqueDirectCertificateId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCredentialId("GXI")
    const [directHit, internHit] = await Promise.all([
      db.directCertificate.findUnique({ where: { certificateId: candidate }, select: { id: true } }),
      db.internshipRecord.findUnique({ where: { certificateId: candidate }, select: { id: true } }),
    ]).catch(() => [null, null] as const)
    if (!directHit && !internHit) return candidate
  }
  // Practically unreachable; still a deterministic honest failure.
  throw new Error("Could not mint a unique certificate ID - try again")
}

/** Hash binding for a direct certificate (domain tag: "direct-certificate"). */
export async function generateDirectCertHash(
  certificateId: string,
  recordId: string,
  issuedAt: Date
): Promise<string> {
  return generateVerificationHash(certificateId, recordId, "direct-certificate", issuedAt)
}

/** Re-verify an existing hash (same binding as generateDirectCertHash). */
export async function verifyDirectCertHash(
  hash: string,
  certificateId: string,
  recordId: string,
  issuedAt: Date | string
): Promise<boolean> {
  const { verifyVerificationHash } = await import("@/lib/credentials")
  return verifyVerificationHash(hash, certificateId, recordId, "direct-certificate", issuedAt)
}

/* ============================================================
 * Payload mappers - shared by the verify route, the public
 * certificate endpoint and the admin view so every surface
 * renders the SAME honest data.
 * ============================================================ */

/** Verify-card payload (examType "direct-certification"). */
export function mapDirectCertToVerifyPayload(r: DirectCertRecord) {
  return {
    valid: true,
    credential: {
      credentialId: r.certificateId,
      candidateName: r.studentName,
      certificationName: r.programTitle,
      certificationSlug: "direct-certification",
      certificationLevel: r.grade ? `Grade: ${r.grade}` : "Direct Certification",
      score: r.score ?? null,
      grade: r.grade,
      issueDate: iso(r.certificateIssuedAt),
      expiryDate: null,
      status: r.status === "revoked" ? "revoked" : "valid",
      skillsAssessed: safeParseArray(r.skills),
      examType: "direct-certification",
      projects: normalizeProjectEntries(r.projects),
      remarks: r.remarks ?? null,
      // Same shape the internship cards consume - the verify view renders
      // direct certifications with the identical report experience.
      internshipDetails: {
        role: r.programTitle,
        mentorName: r.mentorName,
        programDirector: r.programDirector ?? null,
        company: "GuardianX Academy",
        collegeName: r.collegeName,
        collegeCity: null,
        durationWeeks: r.durationWeeks,
        startDate: iso(r.startDate),
        endDate: iso(r.endDate),
        completed: true,
      },
      // No public cert page behind direct certificates - the verify card
      // itself offers the PDF downloads (verificationUrl omitted on purpose).
      verificationUrl: null,
    },
  }
}

/** Public certificate-PDF payload (same shape /api/internships/certificate/[id] returns). */
export function mapDirectCertToCertificatePayload(r: DirectCertRecord) {
  return {
    certificate: {
      certificateId: r.certificateId,
      issuedAt: iso(r.certificateIssuedAt) ?? new Date().toISOString(),
      studentName: r.studentName,
      role: r.programTitle,
      grade: r.grade,
      mentorName: r.mentorName,
      startDate: iso(r.startDate),
      endDate: iso(r.endDate),
      programDirector: r.programDirector,
      nameSize: null,
      projects: normalizeProjectEntries(r.projects),
      skills: safeParseArray(r.skills),
      internship: {
        title: r.programTitle,
        company: "GuardianX Academy",
        // No forced "Direct Certification" domain on the printable sheet -
        // the program title (what the admin typed) is the only label.
        domain: null,
        durationWeeks: r.durationWeeks,
        collegeName: r.collegeName,
        collegeCity: null,
      },
      verifyUrl: `/verify/${r.certificateId}`,
      hashValid: true, // computed by the route before mapping
    },
  }
}

/** Admin-list row (never leaks the student email to non-admin surfaces). */
export function mapDirectCertToAdminRow(r: DirectCertRecord) {
  return {
    id: r.id,
    certificateId: r.certificateId,
    studentName: r.studentName,
    studentEmail: r.studentEmail,
    programTitle: r.programTitle,
    collegeName: r.collegeName,
    mentorName: r.mentorName,
    durationWeeks: r.durationWeeks,
    startDate: iso(r.startDate),
    endDate: iso(r.endDate),
    skills: safeParseArray(r.skills),
    projects: normalizeProjectEntries(r.projects),
    grade: r.grade,
    score: r.score,
    remarks: r.remarks,
    programDirector: r.programDirector,
    status: r.status,
    showPublicly: r.showPublicly,
    certificateIssuedAt: iso(r.certificateIssuedAt),
    emailedAt: iso(r.emailedAt),
  }
}
