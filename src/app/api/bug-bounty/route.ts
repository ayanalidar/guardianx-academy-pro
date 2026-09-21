import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Bug Bounty Integration
// GET:  ?mine=true → user's submissions; default → list programs
// POST: submit a finding
// ============================================================

async function seedPrograms() {
  const programs = [
    {
      name: "Acme Bank Responsible Disclosure",
      platform: "GuardianX",
      url: "https://labs.academy.guardianx.cloud/bb/acme-bank",
      description:
        "Acme Bank invites ethical hackers to test their online banking platform, mobile app, and partner APIs. Reports must follow CVSS scoring.",
      scope: "*.acme-bank.com, mobile API, partner integrations",
      rewardRange: "$250 - $15,000",
      difficulty: "medium",
      tags: "web,mobile,banking",
    },
    {
      name: "CloudDrive Public Bug Bounty",
      platform: "HackerOne",
      url: "https://hackerone.com/clouddrive",
      description:
        "CloudDrive's public program covers their storage APIs, web client, and desktop sync apps. Looking for auth bypasses, IDORs, and RCE.",
      scope: "*.clouddrive.io, desktop apps, sync protocol",
      rewardRange: "$100 - $10,000",
      difficulty: "medium",
      tags: "web,api,desktop",
    },
    {
      name: "MediHealth Patient Portal",
      platform: "Bugcrowd",
      url: "https://bugcrowd.com/medihealth",
      description:
        "Test MediHealth's patient portal for HIPAA-impacting vulnerabilities. Strict scope - read the policy carefully before testing.",
      scope: "portal.medihealth.com, appointments API",
      rewardRange: "$500 - $20,000",
      difficulty: "hard",
      tags: "web,healthcare,api",
    },
    {
      name: "ShopVerse E-Commerce",
      platform: "GuardianX",
      url: "https://labs.academy.guardianx.cloud/bb/shopverse",
      description:
        "Multi-vendor marketplace. Focused on payment tampering, account takeover, and inventory manipulation.",
      scope: "*.shopverse.com, seller API",
      rewardRange: "$150 - $7,500",
      difficulty: "medium",
      tags: "web,api,e-commerce",
    },
    {
      name: "GreenGrid Energy SCADA",
      platform: "GuardianX",
      url: "https://labs.academy.guardianx.cloud/bb/greengrid",
      description:
        "Energy-sector ICS/OT bug bounty program. Looking for OT protocol abuse, HMI bypasses, and unsafe telemetry handling.",
      scope: "hmi.greengrid.energy, telemetry API (read-only)",
      rewardRange: "$1,000 - $50,000",
      difficulty: "insane",
      tags: "ics,ot,scada",
    },
    {
      name: "EduConnect LMS",
      platform: "HackerOne",
      url: "https://hackerone.com/educonnect",
      description:
        "Ed-tech platform with student records, assignments, and grading. Focus on FERPA-protected data exposure.",
      scope: "*.educonnect.io, mobile API",
      rewardRange: "$100 - $5,000",
      difficulty: "easy",
      tags: "web,education,api",
    },
    {
      name: "PayFlow Gateway",
      platform: "Bugcrowd",
      url: "https://bugcrowd.com/payflow",
      description:
        "Payment gateway. Strict scope: web hooks, 3DS implementation, and fraud-detection bypasses only.",
      scope: "api.payflow.com, webhook endpoints",
      rewardRange: "$500 - $25,000",
      difficulty: "hard",
      tags: "web,api,fintech",
    },
    {
      name: "SmartHome Hub Firmware",
      platform: "GuardianX",
      url: "https://labs.academy.guardianx.cloud/bb/smarthome",
      description:
        "IoT firmware bounty - looking for memory corruption, hardcoded creds, and insecure OTA update mechanisms.",
      scope: "firmware binary, OTA endpoints",
      rewardRange: "$300 - $12,000",
      difficulty: "hard",
      tags: "iot,firmware,embedded",
    },
  ]

  for (const p of programs) {
    await db.bugBountyProgram.create({ data: p })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mine = searchParams.get("mine") === "true"
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (mine) {
    const subs = await db.bugBountySubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { program: { select: { id: true, name: true, platform: true, rewardRange: true } } },
    })

    return NextResponse.json({
      submissions: subs.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        severity: s.severity,
        status: s.status,
        bounty: s.bounty,
        createdAt: s.createdAt,
        program: s.program
          ? {
              id: s.program.id,
              name: s.program.name,
              platform: s.program.platform,
              rewardRange: s.program.rewardRange,
            }
          : null,
      })),
    })
  }

  const count = await db.bugBountyProgram.count()
  if (count === 0) await seedPrograms()

  const programs = await db.bugBountyProgram.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { submissions: true } },
      submissions: {
        where: { userId: user.id },
        select: { id: true, status: true, severity: true },
      },
    },
  })

  return NextResponse.json({
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      platform: p.platform,
      url: p.url,
      description: p.description,
      scope: p.scope,
      rewardRange: p.rewardRange,
      difficulty: p.difficulty,
      tags: p.tags,
      submissionsCount: p._count.submissions,
      mySubmission: p.submissions[0] ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { programId, title, description, severity } = body
  if (!programId || !title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "programId, title, and description required" }, { status: 400 })
  }

  const program = await db.bugBountyProgram.findUnique({ where: { id: programId } })
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 })

  const submission = await db.bugBountySubmission.create({
    data: {
      userId: user.id,
      programId,
      title: title.trim(),
      description: description.trim(),
      severity: severity ?? "medium",
      status: "submitted",
      bounty: "",
    },
    include: { program: { select: { name: true, platform: true } } },
  })

  return NextResponse.json({ submission }, { status: 201 })
}
