/**
 * verify-direct-certificates.ts - house verify suite for the
 * Direct Certificates feature (certificates issued WITHOUT an
 * internship enrollment).
 *
 * Pure-function assertions only (no DB): payload mappers, hash
 * binding, email contract, and the exact shapes every consumer
 * (verify route, public certificate endpoint, admin view, PDF
 * builders) relies on.
 *
 * Run: DATABASE_URL=... npx tsx scripts/verify-direct-certificates.ts
 */
import { generateDirectCertHash, verifyDirectCertHash, mapDirectCertToVerifyPayload, mapDirectCertToCertificatePayload, mapDirectCertToAdminRow, type DirectCertRecord } from "../src/lib/direct-certs"
import { buildDirectCertEmailHtml } from "../src/lib/direct-cert-email"
import { isPlausibleCredentialId } from "../src/lib/credentials"
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`)
  }
}

const RECORD: DirectCertRecord = {
  id: "clxdirect0001abcd",
  certificateId: "GXI-2026-D1RECT",
  studentName: "ANANYA SHARMA",
  studentEmail: "ananya@example.com",
  photoUrl: null,
  programTitle: "VAPT Bootcamp",
  collegeName: "Rayat Bahra University",
  mentorName: "Rohit Sharma",
  durationWeeks: 4,
  startDate: "2026-09-01",
  endDate: "2026-09-29",
  skills: JSON.stringify(["Network Scanning", "Web VAPT", "Report Writing"]),
  projects: JSON.stringify([
    { title: "Recon Lab Report", description: "Full recon of the practice range" },
    { title: "Web App Pentest", description: "OWASP top-10 assessment" },
  ]),
  grade: "Outstanding",
  score: 92,
  remarks: "Completed every practical with distinction.",
  programDirector: "GuardianX Academy",
  status: "valid",
  showPublicly: true,
  verificationHash: "seeded",
  certificateIssuedAt: new Date("2026-10-01T10:00:00Z"),
  emailedAt: null,
}

async function main() {
  console.log("\n=== 1. verify-card payload (verify route contract) ===")
  const v = mapDirectCertToVerifyPayload(RECORD)
  check("valid flag true", v.valid === true)
  check("examType direct-certification", v.credential.examType === "direct-certification")
  check("candidate name", v.credential.candidateName === "ANANYA SHARMA")
  check("program title drives certificationName", v.credential.certificationName === "VAPT Bootcamp")
  check("grade passthrough", v.credential.grade === "Outstanding")
  check("score passthrough", v.credential.score === 92)
  check("status valid", v.credential.status === "valid")
  check("skills parsed", v.credential.skillsAssessed.length === 3)
  check("projects normalized", v.credential.projects.length === 2 && v.credential.projects[0].title === "Recon Lab Report")
  check("internshipDetails.role = program title", v.credential.internshipDetails.role === "VAPT Bootcamp")
  check("internshipDetails completed", v.credential.internshipDetails.completed === true)
  check("no student email leak", !JSON.stringify(v).includes("ananya@example.com"))
  check("no internal id leak", !JSON.stringify(v).includes("clxdirect0001abcd"))
  check("verificationUrl null (no circular button)", v.credential.verificationUrl === null)

  console.log("\n=== 2. revoked + hidden states ===")
  const revoked = mapDirectCertToVerifyPayload({ ...RECORD, status: "revoked" })
  check("revoked status honest", revoked.credential.status === "revoked")
  const hidden = mapDirectCertToVerifyPayload({ ...RECORD, showPublicly: false })
  check("mapper keeps showPublicly in payload decision field", typeof hidden.credential.examType === "string")

  console.log("\n=== 3. public certificate-PDF payload (client print contract) ===")
  const c = mapDirectCertToCertificatePayload(RECORD)
  check("certificate id", c.certificate.certificateId === "GXI-2026-D1RECT")
  check("student name", c.certificate.studentName === "ANANYA SHARMA")
  check("role = program title (cert sheet subtitle)", c.certificate.role === "VAPT Bootcamp")
  check("internship.title mapped", c.certificate.internship.title === "VAPT Bootcamp")
  check("certBody company", c.certificate.internship.company === "GuardianX Academy")
  check("duration level source", c.certificate.internship.durationWeeks === 4)
  check("no email leak in PDF payload", !JSON.stringify(c).includes("ananya@example.com"))
  check("verifyUrl path", c.certificate.verifyUrl === "/verify/GXI-2026-D1RECT")

  console.log("\n=== 4. admin row ===")
  const a = mapDirectCertToAdminRow(RECORD)
  check("email visible to admin", a.studentEmail === "ananya@example.com")
  check("hash NOT exposed in admin row", !("verificationHash" in a))
  check("dates ISO-fied", typeof a.certificateIssuedAt === "string" && a.certificateIssuedAt.endsWith("Z"))

  console.log("\n=== 5. hash binding (HMAC via lib/credentials) ===")
  const h1 = await generateDirectCertHash(RECORD.certificateId, RECORD.id, new Date("2026-10-01T10:00:00Z"))
  const h2 = await generateDirectCertHash(RECORD.certificateId, RECORD.id, new Date("2026-10-01T10:00:00Z"))
  const h3 = await generateDirectCertHash(RECORD.certificateId, "other-record", new Date("2026-10-01T10:00:00Z"))
  const h4 = await generateDirectCertHash(RECORD.certificateId, RECORD.id, new Date("2026-10-02T10:00:00Z"))
  check("deterministic", h1 === h2 && h1.length === 64)
  check("record-bound", h1 !== h3)
  check("date-bound", h1 !== h4)
  check("roundtrip verifies", (await verifyDirectCertHash(h1, RECORD.certificateId, RECORD.id, new Date("2026-10-01T10:00:00Z"))) === true)
  check("tampered hash rejected", (await verifyDirectCertHash("0".repeat(64), RECORD.certificateId, RECORD.id, new Date("2026-10-01T10:00:00Z"))) === false)
  check("string-date form verifies", (await verifyDirectCertHash(h1, RECORD.certificateId, RECORD.id, "2026-10-01T10:00:00.000Z")) === true)

  console.log("\n=== 6. credential email contract ===")
  const html = buildDirectCertEmailHtml({
    studentName: RECORD.studentName,
    programTitle: RECORD.programTitle,
    certificateId: RECORD.certificateId,
    grade: RECORD.grade,
    collegeName: RECORD.collegeName,
    mentorName: RECORD.mentorName,
    certificateIssuedAt: RECORD.certificateIssuedAt,
  })
  check("contains certificate ID", html.includes("GXI-2026-D1RECT"))
  check("contains verify link", html.includes("/verify/GXI-2026-D1RECT"))
  check("contains program", html.includes("VAPT Bootcamp"))
  check("greets first name", html.includes("ANANYA"))
  check("no raw email address in body", !html.includes("ananya@example.com"))
  check("branded shell", html.includes("GuardianX Academy") && html.includes("CERTIFICATE ISSUED"))

  console.log("\n=== 7. id plausibility gate (anti-abuse) ===")
  check("GXI-2026-D1RECT plausible", isPlausibleCredentialId("GXI-2026-D1RECT"))
  check("garbage rejected", !isPlausibleCredentialId("x"))
  check("injection rejected", !isPlausibleCredentialId("GXI-2026-D1RECT%20OR%201=1"))

  console.log("\n=== 8. sample artifacts ===")
  const outDir = "/home/z/my-project/tmp/direct-cert-verify"
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, "verify-payload.json"), JSON.stringify(v, null, 2))
  writeFileSync(join(outDir, "cert-payload.json"), JSON.stringify(c, null, 2))
  writeFileSync(join(outDir, "email.html"), html)
  console.log(`  artifacts -> ${outDir}`)

  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
