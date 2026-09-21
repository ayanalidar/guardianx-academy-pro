import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Job Board
// GET: list jobs (with filters), auto-seeds ~12 jobs if empty
// POST: create job (admin/instructor only)
// ============================================================

const SEED_JOBS = [
  {
    title: "Junior SOC Analyst (Night Shift)",
    company: "Sentinel Defense Corp",
    location: "Bengaluru, India",
    remote: false,
    type: "full-time",
    salary: "₹6-9 LPA",
    description:
      "Join our 24/7 Security Operations Center as a Tier-1 analyst. Monitor SIEM alerts, triage events, escalate true positives, and write initial incident reports. Excellent entry-point into cybersecurity.",
    requirements: "Basic networking & Linux; familiarity with SIEM concepts; strong written English; willing to work night shifts on rotation.",
    requiredCerts: JSON.stringify(["CompTIA Security+", "CEH (preferred)"]),
    requiredSkills: JSON.stringify(["SIEM", "Log analysis", "Networking", "Incident response"]),
  },
  {
    title: "Penetration Tester (Mid-level)",
    company: "RedThread Security",
    location: "Remote (India)",
    remote: true,
    type: "full-time",
    salary: "₹14-22 LPA",
    description:
      "Conduct network, web application, and red-team engagements for Fortune 500 clients. Write detailed reports, present findings to technical and executive audiences, and mentor junior testers.",
    requirements: "2+ years pentesting; OSCP or equivalent; deep knowledge of OWASP Top 10; comfortable with Burp, Nmap, Metasploit, and custom scripts.",
    requiredCerts: JSON.stringify(["OSCP", "CEH"]),
    requiredSkills: JSON.stringify(["Burp Suite", "Nmap", "Metasploit", "Bash", "Python", "Report writing"]),
  },
  {
    title: "Cloud Security Engineer (AWS)",
    company: "NimbusScale",
    location: "Hyderabad, India",
    remote: false,
    type: "full-time",
    salary: "₹22-32 LPA",
    description:
      "Architect and operate AWS security controls at scale. Implement CSPM, harden Kubernetes clusters, design zero-trust access patterns, and embed security into CI/CD pipelines.",
    requirements: "3+ years AWS security; deep IAM, KMS, GuardDuty experience; Terraform; CKS or AWS Security Specialty preferred.",
    requiredCerts: JSON.stringify(["AWS Security Specialty", "CCSP"]),
    requiredSkills: JSON.stringify(["AWS", "Kubernetes", "Terraform", "IAM", "DevSecOps"]),
  },
  {
    title: "Application Security Engineer",
    company: "VaultPay Financial",
    location: "Mumbai, India",
    remote: false,
    type: "full-time",
    salary: "₹18-28 LPA",
    description:
      "Embed security into our fintech SDLC. Perform code review, SAST/DAST, threat modeling, and partner with engineering teams to fix vulnerabilities early.",
    requirements: "3+ years AppSec; deep understanding of OAuth/OIDC; experience with SAST/DAST tools; CI/CD integration.",
    requiredCerts: JSON.stringify(["OSCP", "CSSLP"]),
    requiredSkills: JSON.stringify(["Secure code review", "Threat modeling", "SAST", "OAuth", "CI/CD"]),
  },
  {
    title: "IAM / CyberArk Administrator",
    company: "EdgeBank Global",
    location: "Pune, India",
    remote: false,
    type: "full-time",
    salary: "₹14-20 LPA",
    description:
      "Own the CyberArk PAM platform end-to-end: onboarding privileged accounts, rotating credentials, configuring session recordings, and supporting audit requests.",
    requirements: "2+ years CyberArk administration; Defender+ or CyberArk Defender certified; familiarity with Active Directory.",
    requiredCerts: JSON.stringify(["CyberArk Defender", "CyberArk Sentry"]),
    requiredSkills: JSON.stringify(["CyberArk", "Active Directory", "PAM", "Windows Server"]),
  },
  {
    title: "Incident Response Consultant",
    company: "BlueGrid DFIR",
    location: "Remote (India)",
    remote: true,
    type: "contract",
    salary: "₹35-50 LPA",
    description:
      "Lead forensic investigations during active breaches. Perform disk and memory forensics, attribute threat actors, and guide clients through containment, eradication, and recovery.",
    requirements: "5+ years DFIR; GCFA or GCFE; deep Volatility/EnCase experience; willing to be on-call.",
    requiredCerts: JSON.stringify(["GCFA", "GREM"]),
    requiredSkills: JSON.stringify(["Digital forensics", "Volatility", "Memory analysis", "IR frameworks"]),
  },
  {
    title: "Security Architecture Lead",
    company: "HelixCloud Systems",
    location: "Bengaluru, India",
    remote: false,
    type: "full-time",
    salary: "₹40-55 LPA",
    description:
      "Define enterprise security architecture across cloud + on-prem. Author reference architectures, lead threat modeling, and influence security strategy at the CISO level.",
    requirements: "8+ years security; CISSP required; SABSA/TOGAF familiarity; strong written + presentation skills.",
    requiredCerts: JSON.stringify(["CISSP", "TOGAF"]),
    requiredSkills: JSON.stringify(["Enterprise architecture", "Risk frameworks", "Cloud security", "Cryptography"]),
  },
  {
    title: "DevSecOps Engineer (Internship)",
    company: "StreamForge",
    location: "Remote (India)",
    remote: true,
    type: "internship",
    salary: "₹35,000/month",
    description:
      "6-month internship integrating security into CI/CD pipelines. Build SAST/DAST automation, manage container scanning, and contribute to internal security tooling.",
    requirements: "Final-year CS student or recent grad; basic Python/Go; familiarity with Docker & GitHub Actions; curiosity for security.",
    requiredCerts: JSON.stringify([]),
    requiredSkills: JSON.stringify(["Python", "Docker", "GitHub Actions", "Linux"]),
  },
  {
    title: "Threat Intelligence Analyst",
    company: "ObsidianWatch",
    location: "Remote (Global)",
    remote: true,
    type: "full-time",
    salary: "$70,000-$95,000",
    description:
      "Produce finished threat intelligence reports on APT groups, ransomware ecosystems, and emerging TTPs. Source from open, deep, and dark-web collection.",
    requirements: "3+ years threat intel; strong OSINT skills; familiarity with MITRE ATT&CK and STIX/TAXII.",
    requiredCerts: JSON.stringify(["GCTI", "CTIA"]),
    requiredSkills: JSON.stringify(["OSINT", "MITRE ATT&CK", "STIX/TAXII", "Report writing"]),
  },
  {
    title: "GRC Analyst (SOC 2 / ISO 27001)",
    company: "CompliaWorks",
    location: "Gurugram, India",
    remote: false,
    type: "full-time",
    salary: "₹10-16 LPA",
    description:
      "Own SOC 2 Type II and ISO 27001 programs. Write policies, conduct risk assessments, coordinate audits, and translate technical controls for non-technical stakeholders.",
    requirements: "2+ years GRC; ISO 27001 LA; familiarity with SOC 2; strong written English.",
    requiredCerts: JSON.stringify(["ISO 27001 LA", "CISA"]),
    requiredSkills: JSON.stringify(["SOC 2", "ISO 27001", "Risk assessment", "Policy writing"]),
  },
  {
    title: "Red Team Operator",
    company: "CrimsonOps",
    location: "Remote (India)",
    remote: true,
    type: "full-time",
    salary: "₹28-42 LPA",
    description:
      "Conduct adversary-emulation engagements against mature blue teams. Bypass EDR, perform lateral movement, and document full attack chains. Opportunity to publish research.",
    requirements: "5+ years offensive security; OSEP/CRTO preferred; deep Active Directory and EDR-evasion experience.",
    requiredCerts: JSON.stringify(["OSEP", "CRTO"]),
    requiredSkills: JSON.stringify(["Active Directory", "EDR evasion", "C2 frameworks", "Kerberos"]),
  },
  {
    title: "Security Engineering Intern",
    company: "Sentinel Defense Corp",
    location: "Bengaluru, India",
    remote: false,
    type: "internship",
    salary: "₹30,000/month",
    description:
      "3-6 month internship working alongside our SecEng team. Help build detection rules, automate IR playbooks, and tune SIEM content. Mentorship and conversion opportunities available.",
    requirements: "Penultimate-year CS/IS student; Python scripting; basic networking; passion for blue team work.",
    requiredCerts: JSON.stringify([]),
    requiredSkills: JSON.stringify(["Python", "Splunk", "Networking"]),
  },
]

async function seedJobsIfEmpty() {
  const count = await db.job.count()
  if (count > 0) return
  // Find any instructor/admin to attribute the seeded jobs to
  let poster = await db.user.findFirst({
    where: { role: { in: ["ADMIN", "INSTRUCTOR"] } },
    select: { id: true },
  })
  if (!poster) {
    poster = await db.user.findFirst({ select: { id: true } })
  }
  if (!poster) return

  await db.job.createMany({
    data: SEED_JOBS.map((j) => ({ ...j, postedById: poster!.id })),
  })
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await seedJobsIfEmpty()

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")
    const type = searchParams.get("type")
    const remoteOnly = searchParams.get("remote") === "true"

    const where: any = { status: "active" }
    if (type && type !== "all") where.type = type
    if (remoteOnly) where.remote = true
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { company: { contains: q } },
        { location: { contains: q } },
        { description: { contains: q } },
      ]
    }

    const jobs = await db.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true } },
        applications: {
          where: { userId: user.id },
          select: { id: true, status: true },
          take: 1,
        },
      },
      take: 60,
    })

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        companyLogo: j.companyLogo,
        location: j.location,
        remote: j.remote,
        type: j.type,
        salary: j.salary,
        description: j.description,
        requirements: j.requirements,
        requiredCerts: (() => {
          try {
            return JSON.parse(j.requiredCerts || "[]")
          } catch {
            return []
          }
        })(),
        requiredSkills: (() => {
          try {
            return JSON.parse(j.requiredSkills || "[]")
          } catch {
            return []
          }
        })(),
        createdAt: j.createdAt,
        applicationsCount: j._count.applications,
        myApplication: j.applications[0] ?? null,
      })),
    })
  } catch (err: any) {
    console.error("[jobs] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")) {
      return NextResponse.json(
        { error: "Forbidden - admin/instructor only" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      title,
      company,
      location,
      remote,
      type,
      salary,
      description,
      requirements,
      requiredCerts,
      requiredSkills,
    } = body as {
      title?: string
      company?: string
      location?: string
      remote?: boolean
      type?: string
      salary?: string
      description?: string
      requirements?: string
      requiredCerts?: string[]
      requiredSkills?: string[]
    }

    if (!title || !company || !description) {
      return NextResponse.json(
        { error: "title, company, and description are required" },
        { status: 400 }
      )
    }

    const job = await db.job.create({
      data: {
        title,
        company,
        location: location || "Remote",
        remote: !!remote,
        type: type || "full-time",
        salary: salary || "",
        description,
        requirements: requirements || "",
        requiredCerts: JSON.stringify(requiredCerts || []),
        requiredSkills: JSON.stringify(requiredSkills || []),
        postedById: user.id,
      },
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (err: any) {
    console.error("[jobs] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
