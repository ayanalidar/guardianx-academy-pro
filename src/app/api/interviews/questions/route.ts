import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Mock Interview - list questions by role
// GET /api/interviews/questions?role=SOC+Analyst&difficulty=intermediate
// Auto-seeds 30 questions across multiple roles.
// ============================================================

const SEED_QUESTIONS = [
  // SOC Analyst
  { role: "SOC Analyst", difficulty: "beginner", question: "What is the difference between a vulnerability, a threat, and a risk?", expectedAnswer: "Vulnerability = weakness; Threat = potential harmful actor/event; Risk = likelihood × impact of a threat exploiting a vulnerability.", category: "technical", tags: "fundamentals,risk" },
  { role: "SOC Analyst", difficulty: "beginner", question: "Explain the CIA triad and give one example of each control.", expectedAnswer: "Confidentiality (encryption), Integrity (hashing/signatures), Availability (redundancy/backups).", category: "technical", tags: "fundamentals" },
  { role: "SOC Analyst", difficulty: "intermediate", question: "Walk me through how you triage a SIEM alert flagged as 'suspicious PowerShell execution'.", expectedAnswer: "Verify alert source + host; check user context; review full command line; check parent process; pivot to EDR telemetry; assess impact; escalate if malicious.", category: "scenario", tags: "siem,triage" },
  { role: "SOC Analyst", difficulty: "intermediate", question: "What is the MITRE ATT&CK framework and how do you use it day-to-day?", expectedAnswer: "Knowledge base of adversary tactics & techniques. Used to map detections, hunt hypotheses, and benchmark coverage.", category: "technical", tags: "mitre,threat-intel" },
  { role: "SOC Analyst", difficulty: "advanced", question: "Describe a false-positive rate reduction initiative you'd lead in a noisy SIEM.", expectedAnswer: "Tune rules; group correlated events; whitelist known-good admin activity; introduce risk scoring; closed-loop feedback with analysts.", category: "scenario", tags: "siem,automation" },

  // Pentester
  { role: "Pentester", difficulty: "beginner", question: "What is the OWASP Top 10 and why does it matter?", expectedAnswer: "A list of the 10 most critical web app security risks. Provides baseline awareness for developers and testers.", category: "technical", tags: "owasp,web" },
  { role: "Pentester", difficulty: "beginner", question: "Explain SQL injection and one mitigation.", expectedAnswer: "Malicious SQL via user input that manipulates backend queries. Mitigate with parameterized queries / prepared statements.", category: "technical", tags: "sqli,web" },
  { role: "Pentester", difficulty: "intermediate", question: "Walk through how you'd test a login form for auth flaws.", expectedAnswer: "Test default creds, brute force protection, SQLi/NoSQLi, auth bypass, session fixation, JWT weaknesses, MFA bypass, password reset abuse.", category: "scenario", tags: "auth,web" },
  { role: "Pentester", difficulty: "intermediate", question: "How does SSRF work and what's a high-impact target?", expectedAnswer: "Server makes outbound request to attacker-controlled URL. High-impact targets: cloud metadata endpoints (169.254.169.254).", category: "technical", tags: "ssrf,web" },
  { role: "Pentester", difficulty: "advanced", question: "Describe a privilege-escalation technique on Linux after initial foothold.", expectedAnswer: "Kernel exploits, SUID binaries, sudo misconfig, writable cron jobs, PATH hijacking, capabilities (cap_setuid), NFS no_root_squash.", category: "technical", tags: "privesc,linux" },

  // Security Engineer
  { role: "Security Engineer", difficulty: "beginner", question: "What is defense in depth?", expectedAnswer: "Layered security controls so failure of one doesn't compromise the system. Examples: firewall + IDS + EDR + hardening + training.", category: "technical", tags: "fundamentals,architecture" },
  { role: "Security Engineer", difficulty: "intermediate", question: "How do you harden an SSH server?", expectedAnswer: "Disable root login + password auth; restrict to key-based; use AllowGroups; change default port; enforce MaxAuthTries; enable fail2ban.", category: "technical", tags: "hardening,linux" },
  { role: "Security Engineer", difficulty: "intermediate", question: "Explain zero-trust architecture.", expectedAnswer: "Never trust, always verify. Every request is authenticated, authorized, and encrypted regardless of network location; micro-segmentation; least privilege.", category: "technical", tags: "zerotrust,architecture" },
  { role: "Security Engineer", difficulty: "advanced", question: "Design a SIEM use-case to detect lateral movement in an Active Directory environment.", expectedAnswer: "Correlate unusual logons (event 4624 type 3/10), pass-the-ticket patterns, anomalous service account usage, remote service creation (7045), PowerShell remoting bursts.", category: "scenario", tags: "siem,active-directory" },

  // CISO
  { role: "CISO", difficulty: "intermediate", question: "How do you communicate security risk to the board?", expectedAnswer: "Translate technical risk to business impact (revenue, reputation, regulatory). Use heatmaps, KPIs, and peer benchmarks. Avoid jargon.", category: "behavioral", tags: "communication,strategy" },
  { role: "CISO", difficulty: "advanced", question: "Walk me through your approach to building a security budget from scratch.", expectedAnswer: "Start with risk assessment; map to frameworks (NIST CSF); allocate across people/process/tech; reserve 10-15% for emerging threats; tie each line to a measurable outcome.", category: "scenario", tags: "budget,strategy" },
  { role: "CISO", difficulty: "advanced", question: "How do you decide between building vs buying a security capability?", expectedAnswer: "Total cost of ownership, time-to-value, strategic differentiator, available talent, integration cost, vendor risk.", category: "behavioral", tags: "strategy,vendor" },

  // Cloud Security Engineer
  { role: "Cloud Security Engineer", difficulty: "beginner", question: "What is the shared responsibility model in AWS?", expectedAnswer: "AWS secures the cloud (physical, host, network, virtualization); customer secures what's IN the cloud (data, IAM, OS, apps).", category: "technical", tags: "aws,cloud" },
  { role: "Cloud Security Engineer", difficulty: "intermediate", question: "How would you secure an S3 bucket?", expectedAnswer: "Block public access at account + bucket level; enforce TLS; use bucket policies + IAM least privilege; enable access logging; Macie for sensitive data; KMS encryption.", category: "technical", tags: "aws,s3" },
  { role: "Cloud Security Engineer", difficulty: "advanced", question: "Describe a Kubernetes pod security incident response.", expectedAnswer: "Quarantine pod; capture memory + logs; rotate credentials it touched; review audit logs; identify compromised image; rebuild from known-good base; tighten PSP/PSA.", category: "scenario", tags: "kubernetes,ir" },

  // DFIR / Incident Response
  { role: "Incident Response Specialist", difficulty: "intermediate", question: "Walk through the SANS PICERL incident response lifecycle.", expectedAnswer: "Preparation, Identification, Containment, Eradication, Recovery, Lessons learned.", category: "technical", tags: "ir,framework" },
  { role: "Incident Response Specialist", difficulty: "advanced", question: "How do you preserve volatile evidence on a live Windows host?", expectedAnswer: "Capture memory with Magnet RAM Capture / WinPMEM; collect network connections, processes, registry hives, event logs; hash everything; chain of custody.", category: "technical", tags: "forensics,windows" },
  { role: "Incident Response Specialist", difficulty: "advanced", question: "Suspected PowerShell Empire beacon - what do you look for?", expectedAnswer: "Anomalous powershell.exe child processes; long encoded -enc commands; System.Net.WebClient downloads; recurring beaconing to suspect domains; check AMSI logs.", category: "scenario", tags: "forensics,malware" },

  // IAM / PAM Specialist
  { role: "IAM Specialist", difficulty: "beginner", question: "What is the difference between authentication and authorization?", expectedAnswer: "Authentication verifies WHO you are (passwords, MFA). Authorization decides WHAT you can do (RBAC, ABAC).", category: "technical", tags: "iam,fundamentals" },
  { role: "IAM Specialist", difficulty: "intermediate", question: "Explain OAuth 2.0 authorization code flow with PKCE.", expectedAnswer: "Client generates code_verifier + challenge; redirects user to authz server; receives code after consent; exchanges code + verifier for tokens. PKCE prevents code interception.", category: "technical", tags: "oauth,pkce" },
  { role: "IAM Specialist", difficulty: "advanced", question: "How would you design a PAM rollout for a 5,000-employee org?", expectedAnswer: "Inventory privileged accounts; phase by risk (Domain Admins first); onboard to vault; enforce session recording + JIT access; rotate creds; integrate with ITSM for approvals; train admins.", category: "scenario", tags: "pam,cyberark" },

  // Behavioral (cross-role)
  { role: "SOC Analyst", difficulty: "intermediate", question: "Tell me about a time you disagreed with a teammate on a security decision.", expectedAnswer: "STAR format - Situation, Task, Action, Result. Demonstrate collaboration, evidence-based reasoning, willingness to be wrong.", category: "behavioral", tags: "soft-skills" },
  { role: "Pentester", difficulty: "intermediate", question: "Describe a finding a client pushed back on. How did you handle it?", expectedAnswer: "Reaffirm with evidence (PoC, impact), reference CWE/CVE, offer risk-rated remediation options, escalate to leadership if needed.", category: "behavioral", tags: "communication" },
  { role: "Security Engineer", difficulty: "intermediate", question: "How do you stay current with security threats?", expectedAnswer: "Podcasts, RSS feeds, CTF participation, vendor advisories, threat-intel reports, peer Slack/Discord communities, conference attendance.", category: "behavioral", tags: "learning" },
  { role: "Cloud Security Engineer", difficulty: "beginner", question: "Why do you want to work in cloud security specifically?", expectedAnswer: "Personalize: pace of innovation, blast radius, shared-responsibility nuances, automation-first mindset.", category: "behavioral", tags: "motivation" },
]

async function seedQuestionsIfEmpty() {
  const count = await db.interviewQuestion.count()
  if (count > 0) return
  await db.interviewQuestion.createMany({ data: SEED_QUESTIONS })
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await seedQuestionsIfEmpty()

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const difficulty = searchParams.get("difficulty")

    const where: any = {}
    if (role) where.role = role
    if (difficulty && difficulty !== "all") where.difficulty = difficulty

    const questions = await db.interviewQuestion.findMany({
      where,
      orderBy: [{ role: "asc" }, { difficulty: "asc" }],
    })

    // Group by role for the role picker
    const byRole: Record<string, number> = {}
    for (const q of questions) {
      byRole[q.role] = (byRole[q.role] || 0) + 1
    }

    return NextResponse.json({
      questions,
      roles: Object.keys(byRole).sort(),
      total: questions.length,
    })
  } catch (err: any) {
    console.error("[interviews/questions] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
