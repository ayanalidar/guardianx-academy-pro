/**
 * verify-certificates.ts — regression harness for the unified phantom
 * certificate system. Asserts the shared document builder produces the
 * correct auto-adjusted wording per document kind (course / internship /
 * quiz), the top-right chip overlap fix, the institute reg no top-left,
 * and that the score card contains the full domain breakdown.
 *
 * Usage: npx tsx scripts/verify-certificates.ts
 * Output: HTML documents in /home/z/my-project/tmp/cert-verify/
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { buildCertificateHTML, buildScoreCardHTML, buildVerifyReportHTML } from "../src/lib/certificate-pdf"

const OUT = "/home/z/my-project/tmp/cert-verify"
mkdirSync(OUT, { recursive: true })

const logo = null // vector mark fallback is fine for structural checks
const qr = null // QR placeholder is fine for structural checks
const dots = null // watermark fallback; the dots SVG needs the browser

const base = {
  logoPngDataUrl: logo,
  qrPngDataUrl: qr,
  verifyUrl: "https://academy.guardianx.cloud/verify/GX-TEST",
}

let failures = 0
function check(name: string, doc: string, expect: string | RegExp, must = true) {
  const ok = typeof expect === "string" ? doc.includes(expect) : expect.test(doc)
  if (ok === must) {
    console.log(`PASS  ${name}`)
  } else {
    failures++
    console.log(`FAIL  ${name}  (expected ${must ? "presence" : "absence"}: ${JSON.stringify(expect)})`)
  }
}

// ---------------------------------------------------------------------------
// 1. COURSE certificate (phantom) - the shared design every course gets
// ---------------------------------------------------------------------------
const courseDoc = buildCertificateHTML(
  {
    certificateId: "GXC-TEST-COURSE-01",
    issuedAt: "2026-10-03T00:00:00.000Z",
    score: 87,
    user: { name: "Sample Student 01" },
    course: {
      title: "Advanced Web Application Penetration Testing",
      certBody: "GuardianX Academy",
      category: "Offensive Security",
      level: "Advanced",
      instructor: { name: "Test Instructor" },
    },
  },
  { ...base, theme: "phantom", logoDotsSvg: dots },
)
writeFileSync(`${OUT}/course-phantom.html`, courseDoc)

check("course: reg no top-left", courseDoc, "reg. no. UDYAM-JK-03-0034470")
check("course: completion kicker", courseDoc, "of completion")
check("course: course body wording", courseDoc, "for successfully completing the professional course")
check("course: Course Instructor role", courseDoc, "Course Instructor")
check("course: terminal score flag", courseDoc, "--score 87%")
check("course: distinction line", courseDoc, "with distinction")
check("course: chips present", courseDoc, "gx blackops clearance")

// ---------------------------------------------------------------------------
// 2. INTERNSHIP certificate (phantom) - auto-adjusted wording
// ---------------------------------------------------------------------------
const internDoc = buildCertificateHTML(
  {
    certificateId: "GXI-TEST-01",
    issuedAt: "2026-10-03T00:00:00.000Z",
    score: null,
    grade: "Outstanding",
    user: { name: "Sample Student 01" },
    course: {
      title: "Cyber Security Internship - VAPT Track",
      certBody: "GuardianX Academy",
      category: "VAPT",
      level: "8-Week",
      instructor: { name: "Test Mentor" },
    },
  },
  { ...base, theme: "phantom", logoDotsSvg: dots },
)
writeFileSync(`${OUT}/internship-phantom.html`, internDoc)

check("internship: internship kicker", internDoc, "of internship completion")
check("internship: internship body wording", internDoc, "for successfully completing the internship program")
check("internship: Program Mentor role", internDoc, "Program Mentor")
check("internship: no Course Instructor role", internDoc, "Course Instructor", false)
check("internship: terminal grade flag", internDoc, "--grade Outstanding")
check("internship: grade line", internDoc, "awarded Outstanding")

// ---------------------------------------------------------------------------
// 3. QUIZ certificate (phantom) - the old raster design replaced by this one
// ---------------------------------------------------------------------------
const quizDoc = buildCertificateHTML(
  {
    certificateId: "GXQ-TEST-01",
    issuedAt: "2026-10-03T00:00:00.000Z",
    score: 87,
    isQuiz: true,
    user: { name: "Sample Student 01" },
    course: {
      title: "Cyber Security Foundation",
      certBody: "GuardianX Academy",
      category: "Cyber Awareness Quiz",
      level: "Foundational",
      instructor: { name: "GuardianX Academy" },
    },
  },
  { ...base, theme: "phantom", logoDotsSvg: dots },
)
writeFileSync(`${OUT}/quiz-phantom.html`, quizDoc)

check("quiz: awareness assessment wording", quizDoc, "for successfully completing the cyber security awareness assessment")
check("quiz: Assessment Lead role", quizDoc, "Assessment Lead")
check("quiz: no Course Instructor role", quizDoc, "Course Instructor", false)
check("quiz: completion kicker (not internship)", quizDoc, "of internship completion", false)

// ---------------------------------------------------------------------------
// 4. OVERLAP FIX - chips must sit clear of the HUD bracket + corner diamond
// ---------------------------------------------------------------------------
for (const [name, doc] of [["course", courseDoc], ["internship", internDoc], ["quiz", quizDoc]] as const) {
  check(`${name}: chiprow anchored clear (right: 27mm)`, doc, "position: absolute; top: 16mm; right: 27mm;")
  check(`${name}: old overlapping anchor removed`, doc, "top: 15mm; right: 16mm", false)
  check(`${name}: regno anchored clear (left: 27mm)`, doc, "position: absolute; top: 16.5mm; left: 27mm;")
}

// ---------------------------------------------------------------------------
// 5. SCORE CARD (portrait phantom) - the redesigned progress report
// ---------------------------------------------------------------------------
const scoreCard = buildScoreCardHTML(
  {
    recipient: "Sample Student 01",
    title: "Cyber Security Foundation",
    level: "Foundational",
    score: 35,
    total: 40,
    percentage: 87,
    issuedAt: "2026-10-03T00:00:00.000Z",
    credentialId: "GXQ-TEST-01",
    domains: [
      { name: "Phishing", correct: 5, total: 5, pct: 100 },
      { name: "Passwords", correct: 5, total: 5, pct: 100 },
      { name: "Social Engineering", correct: 4, total: 5, pct: 80 },
      { name: "Web Safety", correct: 4, total: 5, pct: 80 },
      { name: "Mobile Security", correct: 3, total: 5, pct: 60 },
      { name: "Data Privacy", correct: 5, total: 5, pct: 100 },
      { name: "Malware", correct: 5, total: 5, pct: 100 },
      { name: "Wi-Fi Safety", correct: 4, total: 5, pct: 80 },
    ],
    verifyUrl: "https://academy.guardianx.cloud/verify?id=GXQ-TEST-01",
  },
  { logoPngDataUrl: logo, qrPngDataUrl: qr, logoDotsSvg: dots },
)
writeFileSync(`${OUT}/score-card.html`, scoreCard)

check("score card: portrait @page", scoreCard, "@page { size: A4 portrait; margin: 0; }")
check("score card: wordmark", scoreCard, "SCORE CARD")
check("score card: big percentage", scoreCard, ">87%</div>")
check("score card: correct-count line", scoreCard, "35 / 40 correct")
check("score card: reg no", scoreCard, "reg. no. UDYAM-JK-03-0034470")
check("score card: chips clear of border", scoreCard, "position: absolute; top: 16mm; right: 27mm;")
check("score card: domain rows (8)", scoreCard, /class="drow"/, true)
check("score card: strongest domain", scoreCard, "strongest domain")
check("score card: focus area", scoreCard, "focus area")
check("score card: verification strip", scoreCard, "Credential ID")
check("score card: performance report kicker", scoreCard, "performance report")

// ---------------------------------------------------------------------------
// 6. VERIFY PROGRESS REPORT (portrait phantom) - the /verify page download
// ---------------------------------------------------------------------------
const reportDoc = buildVerifyReportHTML(
  {
    credentialId: "GXI-TEST-REPORT-01",
    candidateName: "Sample Intern 01",
    grade: "Outstanding A+",
    issueDate: "2026-10-03T00:00:00.000Z",
    verifyUrl: "https://academy.guardianx.cloud/verify/GXI-TEST-REPORT-01",
    skills: ["Network Penetration Testing", "Vulnerability Assessment", "Reporting"],
    projects: Array.from({ length: 8 }, (_, i) => ({
      title: `Sample Project ${i + 1}`,
      description: "Detailed project description repeated to exercise the line clamp. ".repeat(6),
    })),
    program: {
      title: "Offensive Security",
      role: "Offensive Security Intern",
      domain: "Cyber Security",
      company: "GuardianX Academy",
      collegeName: "Test College",
      collegeCity: "France",
      durationWeeks: 8,
      startDate: "2025-06-05T00:00:00.000Z",
      endDate: "2025-08-04T00:00:00.000Z",
      mentorName: "Test Mentor",
      programDirector: "Test Director",
      completed: true,
    },
  },
  { logoPngDataUrl: logo, qrPngDataUrl: qr, logoDotsSvg: dots },
)
writeFileSync(`${OUT}/verify-report.html`, reportDoc)

check("report: portrait @page", reportDoc, "@page { size: A4 portrait; margin: 0; }")
check("report: wordmark", reportDoc, "PROGRESS REPORT")
check("report: grade rendered", reportDoc, "Outstanding A+")
check("report: grade sub-line", reportDoc, "final grade")
check("report: program director cell", reportDoc, "Test Director")
check("report: mentor cell", reportDoc, "Test Mentor")
check("report: timeline cell", reportDoc, "Jun 2025 - Aug 2025")
check("report: projects kicker", reportDoc, "progress report \u00b7 projects delivered")
check("report: project rows capped at 4", reportDoc, `Sample Project 4`)
check("report: fifth project not rendered", reportDoc, "Sample Project 5", false)
check("report: truncation note", reportDoc, "+ 4 more projects")
check("report: line clamp on descriptions", reportDoc, "-webkit-line-clamp: 2")
check("report: skills chips", reportDoc, "Network Penetration Testing")
check("report: reg no", reportDoc, "reg. no. UDYAM-JK-03-0034470")
check("report: verification strip", reportDoc, "Credential ID")
check("report: no fabricated numeric score", reportDoc, /final score/, false)

// short report (<= 6 projects) must NOT show the truncation note
const shortReport = buildVerifyReportHTML(
  {
    credentialId: "GXI-TEST-REPORT-02",
    candidateName: "Sample Intern 02",
    grade: "A",
    issueDate: "2026-10-03T00:00:00.000Z",
    verifyUrl: "https://academy.guardianx.cloud/verify/GXI-TEST-REPORT-02",
    skills: ["Recon"],
    projects: [{ title: "Only Project", description: "Short description." }],
    program: { title: "SOC Analyst", durationWeeks: 4, completed: true },
  },
  { logoPngDataUrl: logo, qrPngDataUrl: qr, logoDotsSvg: dots },
)
writeFileSync(`${OUT}/verify-report-short.html`, shortReport)
check("short report: single project row", shortReport, "Only Project")
check("short report: no truncation note", shortReport, "more project", false)
check("short report: minimal program grid", shortReport, "4 weeks")

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
