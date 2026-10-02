import { db } from "@/lib/db"

/* ============================================================
 * Internships bootstrap - schema resilience + first-run seed.
 *
 * Mirrors src/lib/placements-bootstrap.ts exactly (house
 * pattern): the project deploys with `prisma generate && next
 * build` (no `db push` runs on Vercel), so every internships
 * route calls ensureInternshipTables() first:
 *
 *   1. Probe the tables with a cheap query (memoized per instance).
 *   2. If Prisma reports a table missing (P2021) or a column
 *      missing (P2022), run idempotent CREATE TABLE IF NOT EXISTS
 *      + ALTER ADD COLUMN IF NOT EXISTS DDL matching
 *      prisma/schema.prisma EXACTLY, then retry once.
 *
 * seedSampleInternshipsIfEmpty() inserts CLEARLY-MARKED sample
 * data the very first time the tables are empty (2 colleges ->
 * 4 internships -> 6 student records, every row isSample: true)
 * so /internships never launches as a blank page. The owner
 * replaces/deletes them from Admin -> Internships.
 * ============================================================ */

let tablesReady = false

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "Internship" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "collegeName" TEXT NOT NULL,
    "collegeCity" TEXT,
    "collegeLogo" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT 'GuardianX Academy',
    "domain" TEXT NOT NULL DEFAULT 'Cyber Security',
    "mode" TEXT NOT NULL DEFAULT 'remote',
    "durationWeeks" INTEGER NOT NULL DEFAULT 8,
    "stipend" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "description" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Internship_pkey" PRIMARY KEY ("id")
  )`,
  // --- column-drift insurance (Postgres 9.6+ ADD COLUMN IF NOT EXISTS) ---
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "collegeId" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "collegeCity" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "collegeLogo" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "stipend" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "description" TEXT`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Internship" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS "Internship_published_featured_order_idx" ON "Internship"("published", "featured", "order")`,
  `CREATE INDEX IF NOT EXISTS "Internship_collegeName_idx" ON "Internship"("collegeName")`,
  `CREATE TABLE IF NOT EXISTS "InternshipRecord" (
    "id" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "studentEmail" TEXT,
    "role" TEXT NOT NULL,
    "mentorName" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "projects" TEXT NOT NULL DEFAULT '[]',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "tools" TEXT NOT NULL DEFAULT '[]',
    "testimonial" TEXT,
    "grade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "certificateId" TEXT NOT NULL,
    "verificationHash" TEXT NOT NULL,
    "certificateIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "showPublicly" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternshipRecord_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "studentId" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "studentEmail" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "mentorName" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3)`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3)`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "projects" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "skills" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "tools" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "testimonial" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "grade" TEXT`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'completed'`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "showPublicly" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "InternshipRecord" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InternshipRecord_certificateId_key" ON "InternshipRecord"("certificateId")`,
  `CREATE INDEX IF NOT EXISTS "InternshipRecord_internshipId_idx" ON "InternshipRecord"("internshipId")`,
  `CREATE INDEX IF NOT EXISTS "InternshipRecord_showPublicly_isSample_sortOrder_idx" ON "InternshipRecord"("showPublicly", "isSample", "sortOrder")`,
]

/** True once both tables (and all their columns) are present. */
export async function ensureInternshipTables(): Promise<boolean> {
  if (tablesReady) return true

  // 1) Full-row probe on both tables - succeeds instantly once the tables
  // AND all their columns exist (P2021/P2022 both fall through to DDL).
  try {
    await db.internship.findFirst({ take: 1 })
    await db.internshipRecord.findFirst({ take: 1 })
    tablesReady = true
    return true
  } catch {
    /* fall through to DDL */
  }

  // 2) Idempotent DDL, then re-probe.
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt)
    await db.internship.findFirst({ take: 1 })
    await db.internshipRecord.findFirst({ take: 1 })
    tablesReady = true
    return true
  } catch (error) {
    console.error("[internships] ensureInternshipTables failed:", error)
    return false
  }
}

/* ============================================================
 * First-launch sample data - every row carries isSample: true.
 * The UI renders a visible "Sample" chip until the owner replaces
 * the rows with real colleges/internships/students from Admin.
 * ============================================================ */

type SampleInternshipSeed = {
  key: string
  collegeName: string
  collegeCity: string
  title: string
  company: string
  domain: string
  mode: string
  durationWeeks: number
  stipend: string
  seats: number
  status: string
  description: string
  skills: string[]
  featured: boolean
  order: number
}

const SAMPLE_INTERNSHIPS: SampleInternshipSeed[] = [
  {
    key: "sample-college-1-vapt",
    collegeName: "Sample Institute of Technology",
    collegeCity: "Bengaluru",
    title: "Cyber Security Internship - VAPT Track",
    company: "GuardianX Academy",
    domain: "VAPT",
    mode: "hybrid",
    durationWeeks: 8,
    stipend: "Performance-based stipend",
    seats: 15,
    status: "completed",
    description:
      "Sample internship - replace me from Admin -> Internships. Hands-on vulnerability assessment and penetration testing internship: web/network VAPT methodology, Burp Suite and Nmap labs, real report writing and a client-style debrief.",
    skills: ["VAPT", "Burp Suite", "Nmap", "OWASP Top 10", "Report Writing"],
    featured: true,
    order: 0,
  },
  {
    key: "sample-college-1-soc",
    collegeName: "Sample Institute of Technology",
    collegeCity: "Bengaluru",
    title: "SOC Analyst Internship - Blue Team",
    company: "GuardianX Academy",
    domain: "SOC",
    mode: "remote",
    durationWeeks: 6,
    stipend: "Certificate + LOR",
    seats: 20,
    status: "ongoing",
    description:
      "Sample internship - replace me from Admin -> Internships. Security Operations Center rotation: SIEM triage, alert investigation, incident documentation and threat-hunting drills on a live-range SOC.",
    skills: ["SIEM", "Splunk", "Incident Response", "Threat Hunting"],
    featured: false,
    order: 1,
  },
  {
    key: "sample-college-2-grc",
    collegeName: "Demo University",
    collegeCity: "Pune",
    title: "GRC Internship - ISO 27001 Track",
    company: "GuardianX Academy",
    domain: "GRC",
    mode: "onsite",
    durationWeeks: 8,
    stipend: "Performance-based stipend",
    seats: 12,
    status: "upcoming",
    description:
      "Sample internship - replace me from Admin -> Internships. Governance, risk and compliance internship: ISO 27001 annex controls, risk registers, internal audit simulation and policy drafting.",
    skills: ["ISO 27001", "Risk Assessment", "Internal Audit", "Policy Writing"],
    featured: false,
    order: 2,
  },
  {
    key: "sample-college-2-cloud",
    collegeName: "Demo University",
    collegeCity: "Pune",
    title: "Cloud Security Internship - AWS Track",
    company: "GuardianX Academy",
    domain: "Cloud Security",
    mode: "remote",
    durationWeeks: 6,
    stipend: "Certificate + LOR",
    seats: 15,
    status: "upcoming",
    description:
      "Sample internship - replace me from Admin -> Internships. Cloud security internship on AWS: IAM hardening, guardrails, misconfiguration scanning and a capstone secure-architecture review.",
    skills: ["AWS IAM", "Cloud Security", "CIS Benchmarks", "Terraform"],
    featured: false,
    order: 3,
  },
]

type SampleRecordSeed = {
  internshipKey: string
  studentName: string
  role: string
  mentorName: string
  weeksAgo: number // start date = N weeks ago, end = start + internship duration
  projects: { title: string; description: string }[]
  skills: string[]
  tools: string[]
  testimonial: string
  grade: string
  status: string
}

const SAMPLE_RECORDS: SampleRecordSeed[] = [
  {
    internshipKey: "sample-college-1-vapt",
    studentName: "Sample Student 01",
    role: "VAPT Intern",
    mentorName: "Naveed Khan",
    weeksAgo: 28,
    projects: [
      { title: "Web App VAPT Capstone", description: "Sample project - end-to-end vulnerability assessment of a deliberately vulnerable e-commerce lab, OWASP Top 10 coverage with a client-style report." },
      { title: "Network Pentest Drill", description: "Sample project - internal network segment enumeration, privilege escalation path discovery and remediation advice." },
    ],
    skills: ["VAPT", "Burp Suite", "Nmap", "OWASP Top 10", "Report Writing"],
    tools: ["Burp Suite", "Nmap", "Metasploit", "Wireshark"],
    testimonial: "Sample record - the mentorship and live-range labs made report writing feel like real client work.",
    grade: "Outstanding",
    status: "completed",
  },
  {
    internshipKey: "sample-college-1-vapt",
    studentName: "Sample Student 02",
    role: "VAPT Intern",
    mentorName: "Naveed Khan",
    weeksAgo: 28,
    projects: [
      { title: "API Security Review", description: "Sample project - authorized API assessment covering auth flaws, BOLA and rate-limit gaps with fix recommendations." },
    ],
    skills: ["API Security", "VAPT", "Postman", "OWASP API Top 10"],
    tools: ["Burp Suite", "Postman", "ffuf"],
    testimonial: "Sample record - I found my first real bug class here and learned to document it properly.",
    grade: "Excellent",
    status: "completed",
  },
  {
    internshipKey: "sample-college-1-soc",
    studentName: "Sample Student 03",
    role: "SOC Analyst Intern (Tier 1)",
    mentorName: "Aaryan S",
    weeksAgo: 10,
    projects: [
      { title: "SIEM Triage Rotation", description: "Sample project - 200+ simulated alerts triaged across a live-range SIEM with escalation notes reviewed by mentors." },
    ],
    skills: ["SIEM", "Splunk", "Incident Response", "MITRE ATT&CK"],
    tools: ["Splunk", "TheHive", "VirusTotal"],
    testimonial: "Sample record - the alert-to-report pipeline mirrors a real SOC shift.",
    grade: "Excellent",
    status: "completed",
  },
  {
    internshipKey: "sample-college-2-grc",
    studentName: "Sample Student 04",
    role: "GRC Intern",
    mentorName: "S Reddy",
    weeksAgo: 16,
    projects: [
      { title: "ISO 27001 Internal Audit Sim", description: "Sample project - full internal-audit simulation: scope, evidence sampling, non-conformity report and management summary." },
    ],
    skills: ["ISO 27001", "Risk Assessment", "Internal Audit"],
    tools: ["Excel GRC Toolkit", "Vanta (demo)"],
    testimonial: "Sample record - I can walk into an audit conversation with confidence now.",
    grade: "Outstanding",
    status: "completed",
  },
  {
    internshipKey: "sample-college-2-grc",
    studentName: "Sample Student 05",
    role: "GRC Intern",
    mentorName: "S Reddy",
    weeksAgo: 4,
    projects: [
      { title: "Policy Drafting Sprint", description: "Sample project - drafted the information-security policy pack for a simulated startup under mentor review." },
    ],
    skills: ["Policy Writing", "ISO 27001", "DPDPA Basics"],
    tools: ["Notion", "Excel GRC Toolkit"],
    testimonial: "Sample record - drafting real policies beats theory every single time.",
    grade: "Very Good",
    status: "ongoing",
  },
  {
    internshipKey: "sample-college-2-cloud",
    studentName: "Sample Student 06",
    role: "Cloud Security Intern",
    mentorName: "Akaash",
    weeksAgo: 2,
    projects: [
      { title: "Secure Landing Zone Review", description: "Sample project - hardened a demo AWS landing zone: IAM least-privilege, guardrails and CIS-benchmark scanning." },
    ],
    skills: ["AWS IAM", "Cloud Security", "CIS Benchmarks"],
    tools: ["AWS Console", "Terraform", "Prowler"],
    testimonial: "Sample record - the guardrails lab finally made IAM click for me.",
    grade: "Excellent",
    status: "ongoing",
  },
]

/**
 * Inserts the clearly-marked sample dataset the first time the tables are
 * empty. Returns the number of internships created (0 when data exists).
 * Certificates for sample records use deterministic IDs (GXI-SAMPLE-XX)
 * with real HMAC hashes so verification + PDF download work out of the box.
 */
export async function seedSampleInternshipsIfEmpty(): Promise<number> {
  const existing = await db.internship.findFirst({ take: 1 })
  if (existing) return 0

  const { generateVerificationHash } = await import("@/lib/credentials")

  const internshipIdByKey = new Map<string, string>()
  let created = 0

  for (const s of SAMPLE_INTERNSHIPS) {
    const weeks = s.durationWeeks
    const startsAt = new Date(Date.now() - (s.status === "upcoming" ? -14 : 8) * 7 * 24 * 3600 * 1000)
    const endsAt = new Date(startsAt.getTime() + weeks * 7 * 24 * 3600 * 1000)
    const row = await db.internship.create({
      data: {
        collegeName: s.collegeName,
        collegeCity: s.collegeCity,
        title: s.title,
        company: s.company,
        domain: s.domain,
        mode: s.mode,
        durationWeeks: weeks,
        stipend: s.stipend,
        seats: s.seats,
        status: s.status,
        startsAt,
        endsAt,
        description: s.description,
        skills: JSON.stringify(s.skills),
        featured: s.featured,
        published: true,
        isSample: true,
        order: s.order,
      },
      select: { id: true },
    })
    internshipIdByKey.set(s.key, row.id)
    created++
  }

  let sampleIdx = 0
  for (const r of SAMPLE_RECORDS) {
    sampleIdx++
    const internshipId = internshipIdByKey.get(r.internshipKey)
    if (!internshipId) continue
    const internship = SAMPLE_INTERNSHIPS.find((s) => s.key === r.internshipKey)!
    const startDate = new Date(Date.now() - r.weeksAgo * 7 * 24 * 3600 * 1000)
    const endDate = new Date(startDate.getTime() + internship.durationWeeks * 7 * 24 * 3600 * 1000)
    // Deterministic, obviously-sample certificate id; the tamper-evident
    // hash is computed against the REAL record id after the row exists
    // (create with placeholder -> hash -> update), so verification and
    // PDF download work out of the box.
    const certificateId = `GXI-SAMPLE-${String(sampleIdx).padStart(2, "0")}`
    const issuedAt = new Date()
    const rec = await db.internshipRecord.create({
      data: {
        internshipId,
        studentName: r.studentName,
        role: r.role,
        mentorName: r.mentorName,
        startDate,
        endDate,
        projects: JSON.stringify(r.projects),
        skills: JSON.stringify(r.skills),
        tools: JSON.stringify(r.tools),
        testimonial: r.testimonial,
        grade: r.grade,
        status: r.status,
        certificateId,
        verificationHash: "pending",
        certificateIssuedAt: issuedAt,
        showPublicly: true,
        isSample: true,
        sortOrder: sampleIdx,
      },
      select: { id: true },
    })
    const verificationHash = await generateVerificationHash(certificateId, rec.id, internshipId, issuedAt)
    await db.internshipRecord.update({ where: { id: rec.id }, data: { verificationHash } })
  }

  return created
}
