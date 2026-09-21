import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Team-Based Lab Missions
// GET:  list missions (auto-seeds 4 if empty)
// POST: { missionId } → create session (caller = leader)
// ============================================================

async function seedMissions() {
  const missions = [
    {
      title: "Active Directory Compromise",
      description:
        "A multi-host AD lab where your team pivots from a kiosk account through Kerberoasting to Domain Admin.",
      scenario:
        "Your team has been contracted to assess the security posture of CORP.local. You start with low-privilege access on a single workstation and must enumerate, escalate, and pivot to compromise the Domain Controller.",
      maxTeamSize: 4,
      duration: 90,
      difficulty: "hard",
      objectives:
        '["Enumerate the domain using PowerView","Kerberoast service accounts and crack hashes","Lateral-move to a SQL server","Seize Domain Admin via DCSync"]',
    },
    {
      title: "Web App Breach & Forensics",
      description:
        "Compromise a vulnerable e-commerce platform, exfiltrate data, then perform forensics on the captured traffic.",
      scenario:
        "A red-team engagement against ShopGuard - a fictional online store. Your team must identify the vulnerability chain, gain code execution, then pivot to forensics on the attacker footprint you leave behind.",
      maxTeamSize: 3,
      duration: 60,
      difficulty: "medium",
      objectives:
        '["Discover an IDOR vulnerability","Chain to a blind SQL injection","Achieve RCE via file upload","Analyze the resulting web shell traffic"]',
    },
    {
      title: "Cloud Container Escape",
      description:
        "Compromise a pod in a Kubernetes cluster and escape to the host, escalating to cluster-admin.",
      scenario:
        "Your team operates as cloud red-teamers. Initial access is granted to a misconfigured web-app pod. Pivot through the Kubernetes API, escape the container, and seize cluster-admin.",
      maxTeamSize: 4,
      duration: 120,
      difficulty: "insane",
      objectives:
        '["Discover overly-permissive service-account tokens","Enumerate the Kubernetes API","Escape the container via privileged mount","Create a malicious ClusterRoleBinding"]',
    },
    {
      title: "Incident Response Triage",
      description:
        "Defenders triage a live intrusion: identify the entry point, scope the compromise, and contain the threat.",
      scenario:
        "As the on-call SOC team, you receive a SIEM alert suggesting lateral movement. Investigate the affected hosts, identify the malware family, and execute the containment playbook within the time limit.",
      maxTeamSize: 5,
      duration: 75,
      difficulty: "medium",
      objectives:
        '["Triage the initial SIEM alert","Identify the malicious process and its parent","Locate the persistence mechanism","Write a containment report and Isolate hosts"]',
    },
  ]

  for (const m of missions) {
    await db.teamMission.create({ data: m })
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const count = await db.teamMission.count()
  if (count === 0) await seedMissions()

  const missions = await db.teamMission.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
    include: {
      sessions: {
        where: { status: { in: ["waiting", "active"] } },
        include: {
          members: {
            select: { userId: true, role: true, user: { select: { id: true, name: true, avatar: true } } },
          },
        },
      },
    },
  })

  return NextResponse.json({
    missions: missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      scenario: m.scenario,
      maxTeamSize: m.maxTeamSize,
      duration: m.duration,
      difficulty: m.difficulty,
      objectives: JSON.parse(m.objectives || "[]"),
      activeSessions: m.sessions.map((s) => ({
        id: s.id,
        status: s.status,
        memberCount: s.members.length,
        isMember: s.members.some((mem) => mem.userId === user.id),
      })),
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { missionId } = body
  if (!missionId) return NextResponse.json({ error: "missionId required" }, { status: 400 })

  const mission = await db.teamMission.findUnique({ where: { id: missionId } })
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 })

  // Prevent user creating a duplicate "waiting" session for the same mission
  const existing = await db.teamMissionMember.findFirst({
    where: { userId: user.id, session: { missionId, status: { in: ["waiting", "active"] } } },
  })
  if (existing) {
    return NextResponse.json({ error: "You already have an active session for this mission", sessionId: existing.sessionId }, { status: 400 })
  }

  const session = await db.teamMissionSession.create({
    data: {
      missionId,
      leaderId: user.id,
      status: "waiting",
      members: {
        create: { userId: user.id, role: "leader" },
      },
    },
    include: {
      mission: true,
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  })

  return NextResponse.json({ session }, { status: 201 })
}
