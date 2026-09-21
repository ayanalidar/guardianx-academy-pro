import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Skill Assessments - list
// GET: list assessments (auto-seeds 5 if empty)
// ============================================================

async function seedAssessments() {
  const defs = [
    {
      title: "Web Application Security Fundamentals",
      description: "Tests your understanding of OWASP Top 10, common web vulnerabilities, and mitigation strategies.",
      category: "web",
      difficulty: "intermediate",
      duration: 30,
      questions: [
        {
          question: "Which of the following is the most effective mitigation against SQL injection?",
          options: JSON.stringify(["Client-side input validation", "Parameterized queries / prepared statements", "Hiding database error messages", "Disabling SELECT statements"]),
          correctAnswer: 1,
          explanation: "Parameterized queries separate code from data, preventing user input from being interpreted as SQL.",
          skillTag: "sql-injection",
          points: 10,
        },
        {
          question: "What does the 'Same-Origin Policy' primarily prevent?",
          options: JSON.stringify(["CSRF attacks", "XSS attacks from malicious sites reading your origin's data", "SQL injection", "Brute-force attacks"]),
          correctAnswer: 1,
          explanation: "SOP prevents scripts from one origin reading data from another, mitigating cross-site data theft.",
          skillTag: "browser-security",
          points: 10,
        },
        {
          question: "Which header best mitigates reflected XSS by restricting script sources?",
          options: JSON.stringify(["X-Frame-Options", "Content-Security-Policy", "Strict-Transport-Security", "X-Powered-By"]),
          correctAnswer: 1,
          explanation: "CSP restricts which scripts can execute, blocking inline injected scripts.",
          skillTag: "xss",
          points: 10,
        },
        {
          question: "In a JWT, where is the algorithm (alg) header typically abused during algorithm confusion attacks?",
          options: JSON.stringify(["Payload", "Signature", "Header", "Cookie"]),
          correctAnswer: 2,
          explanation: "Attackers downgrade the alg header from RS256 to HS256, signing with the server's public key as the HMAC secret.",
          skillTag: "jwt",
          points: 15,
        },
        {
          question: "Which vulnerability class does IDOR (Insecure Direct Object Reference) belong to?",
          options: JSON.stringify(["Injection", "Broken Access Control", "Cryptographic Failure", "Security Misconfiguration"]),
          correctAnswer: 1,
          explanation: "IDOR is a canonical Broken Access Control flaw - authorization is not enforced on object access.",
          skillTag: "access-control",
          points: 10,
        },
      ],
    },
    {
      title: "Network Defense Essentials",
      description: "Validates knowledge of TCP/IP, firewalls, IDS/IPS, and network segmentation.",
      category: "network",
      difficulty: "beginner",
      duration: 25,
      questions: [
        {
          question: "At which OSI layer does a stateful firewall primarily inspect traffic?",
          options: JSON.stringify(["Layer 2 (Data Link)", "Layer 3 (Network) and Layer 4 (Transport)", "Layer 7 (Application)", "Layer 1 (Physical)"]),
          correctAnswer: 1,
          explanation: "Stateful firewalls track connections using L3/L4 state tables.",
          skillTag: "firewalls",
          points: 10,
        },
        {
          question: "What is the primary purpose of network segmentation?",
          options: JSON.stringify(["Improve performance", "Limit lateral movement of attackers", "Reduce IP address usage", "Encrypt traffic"]),
          correctAnswer: 1,
          explanation: "Segmentation contains breaches by blocking attacker pivoting across zones.",
          skillTag: "segmentation",
          points: 10,
        },
        {
          question: "Which protocol is most appropriate for securely authenticating users to network devices centrally?",
          options: JSON.stringify(["TACACS+", "Telnet", "HTTP", "FTP"]),
          correctAnswer: 0,
          explanation: "TACACS+ provides centralized AAA with full packet encryption.",
          skillTag: "aaa",
          points: 15,
        },
        {
          question: "An IDS that compares traffic against known signatures is called:",
          options: JSON.stringify(["Anomaly-based", "Heuristic-based", "Signature-based", "Behavioral"]),
          correctAnswer: 2,
          explanation: "Signature-based detection matches known attack patterns.",
          skillTag: "ids",
          points: 10,
        },
      ],
    },
    {
      title: "Cryptography & PKI Deep Dive",
      description: "Assesses symmetric/asymmetric crypto, hashing, and PKI concepts.",
      category: "crypto",
      difficulty: "advanced",
      duration: 40,
      questions: [
        {
          question: "Which property of a cryptographic hash ensures that a small input change produces a vastly different output?",
          options: JSON.stringify(["One-way", "Avalanche effect", "Collision resistance", "Pre-image resistance"]),
          correctAnswer: 1,
          explanation: "The avalanche effect describes how small input changes cascade into large output changes.",
          skillTag: "hashing",
          points: 10,
        },
        {
          question: "In RSA, which key is used to sign a message?",
          options: JSON.stringify(["Sender's public key", "Sender's private key", "Receiver's public key", "Receiver's private key"]),
          correctAnswer: 1,
          explanation: "Signing uses the sender's private key; verification uses the public key.",
          skillTag: "asymmetric",
          points: 10,
        },
        {
          question: "What is the main advantage of Elliptic Curve Cryptography over RSA at equivalent security?",
          options: JSON.stringify(["Larger key sizes", "Smaller key sizes and faster operations", "No need for random numbers", "Quantum-resistance"]),
          correctAnswer: 1,
          explanation: "ECC provides equivalent security with much smaller keys, saving bandwidth and CPU.",
          skillTag: "ecc",
          points: 15,
        },
        {
          question: "A digital certificate binds a public key to what?",
          options: JSON.stringify(["A symmetric key", "An identity (e.g. domain, organization)", "A private key", "A hash algorithm"]),
          correctAnswer: 1,
          explanation: "X.509 certificates bind public keys to identities, signed by a CA.",
          skillTag: "pki",
          points: 10,
        },
        {
          question: "Which attack exploits weak random number generation to predict keys?",
          options: JSON.stringify(["Birthday attack", "Predictable PRNG seed attack", "Downgrade attack", "Replay attack"]),
          correctAnswer: 1,
          explanation: "Predictable PRNG outputs let attackers reconstruct keys generated from them.",
          skillTag: "randomness",
          points: 15,
        },
      ],
    },
    {
      title: "Digital Forensics & Incident Response",
      description: "Tests DFIR concepts: evidence handling, memory analysis, and incident lifecycle.",
      category: "forensics",
      difficulty: "intermediate",
      duration: 35,
      questions: [
        {
          question: "What is the correct order of the incident response lifecycle?",
          options: JSON.stringify(["Detection → Response → Recovery → Preparation", "Preparation → Detection & Analysis → Containment, Eradication & Recovery → Post-Incident", "Recovery → Detection → Preparation → Response", "Preparation → Recovery → Detection → Response"]),
          correctAnswer: 1,
          explanation: "NIST SP 800-61 defines four phases starting with Preparation.",
          skillTag: "ir-lifecycle",
          points: 10,
        },
        {
          question: "Which artifact is most useful for determining whether a process was injecting into another process?",
          options: JSON.stringify(["Browser history", "VAD tree in a memory dump", "Firewall logs", "DNS cache"]),
          correctAnswer: 1,
          explanation: "Memory analysis with VAD/malfind reveals injected code regions.",
          skillTag: "memory-forensics",
          points: 15,
        },
        {
          question: "What does the 'order of volatility' guide?",
          options: JSON.stringify(["Which evidence to collect first", "How long to retain logs", "Which analysts can view evidence", "When to call law enforcement"]),
          correctAnswer: 0,
          explanation: "Collect most-volatile evidence (RAM, network state) before disk to avoid loss.",
          skillTag: "evidence-handling",
          points: 10,
        },
        {
          question: "A 'chain of custody' is used to:",
          options: JSON.stringify(["Encrypt evidence", "Document evidence handling from collection to court", "Compress evidence files", "Predict attacker behavior"]),
          correctAnswer: 1,
          explanation: "Chain of custody establishes that evidence hasn't been tampered with.",
          skillTag: "evidence-handling",
          points: 10,
        },
      ],
    },
    {
      title: "Security Governance, Risk & Compliance",
      description: "Validates understanding of GRC frameworks, risk management, and compliance.",
      category: "governance",
      difficulty: "intermediate",
      duration: 30,
      questions: [
        {
          question: "In risk management, 'residual risk' refers to:",
          options: JSON.stringify(["Risk before controls", "Risk remaining after controls are applied", "Risk transferred to insurer", "Risk accepted by default"]),
          correctAnswer: 1,
          explanation: "Residual risk is what's left after mitigations are in place.",
          skillTag: "risk",
          points: 10,
        },
        {
          question: "Which framework is most aligned with cybersecurity program maturity?",
          options: JSON.stringify(["NIST CSF", "PCI-DSS", "GDPR", "HIPAA"]),
          correctAnswer: 0,
          explanation: "NIST CSF provides a maturity-based program framework (Identify-Protect-Detect-Respond-Recover).",
          skillTag: "frameworks",
          points: 10,
        },
        {
          question: "The 'principle of least privilege' requires that:",
          options: JSON.stringify(["All users are admins", "Users have only the access needed for their role", "Privileges are never audited", "Privileges are public knowledge"]),
          correctAnswer: 1,
          explanation: "Least privilege minimizes attack surface by granting minimal necessary access.",
          skillTag: "access-control",
          points: 10,
        },
        {
          question: "A 'Data Loss Prevention' (DLP) system primarily prevents:",
          options: JSON.stringify(["Unauthorized data exfiltration", "Disk failures", "Network latency", "Password reuse"]),
          correctAnswer: 0,
          explanation: "DLP systems detect and block sensitive data leaving organizational boundaries.",
          skillTag: "dlp",
          points: 15,
        },
      ],
    },
  ]

  for (const d of defs) {
    const a = await db.skillAssessment.create({
      data: {
        title: d.title,
        description: d.description,
        category: d.category,
        difficulty: d.difficulty,
        duration: d.duration,
      },
    })
    for (let i = 0; i < d.questions.length; i++) {
      const q = d.questions[i]
      await db.skillAssessmentQuestion.create({
        data: {
          assessmentId: a.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          skillTag: q.skillTag,
          points: q.points,
        },
      })
    }
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const count = await db.skillAssessment.count()
  if (count === 0) await seedAssessments()

  const assessments = await db.skillAssessment.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { questions: true } },
      results: {
        where: { userId: user.id },
        orderBy: { takenAt: "desc" },
        take: 1,
      },
    },
  })

  return NextResponse.json({
    assessments: assessments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      difficulty: a.difficulty,
      duration: a.duration,
      questionCount: a._count.questions,
      bestScore: a.results[0]?.score ?? null,
      passed: a.results[0]?.passed ?? false,
      lastTaken: a.results[0]?.takenAt ?? null,
    })),
  })
}
