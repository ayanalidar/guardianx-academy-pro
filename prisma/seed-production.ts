/**
 * GuardianX Production Seed — Phase PROD-DB
 *
 * Seeds database-driven content for the public marketing/learning surfaces:
 *  - LearningPath     (6 guided career journeys)
 *  - SkillCategory    (7 branches)
 *  - Skill            (35 nodes, 5 per branch)
 *  - Rank             (8 tiers: Recruit → Elite Guardian)
 *  - CareerPathRole   (6 roles with skill weights for the matching engine)
 *  - PlatformStat     (6 platform stats; some auto-calculated)
 *  - TechnologyPartner (12 real OSS tools used in GuardianX labs)
 *
 * NOTE: The task spec named this model `CareerRole`, but a pre-existing
 *       `CareerRole` model is already used by /api/career/roles. To stay
 *       strictly additive we added the new model under the name
 *       `CareerPathRole`. The public API route /api/career-roles still maps
 *       to it, so the front-end contract is unchanged.
 *
 * Run:
 *   DATABASE_URL="postgresql://..." bunx tsx prisma/seed-production.ts
 */
import bcrypt from "bcryptjs"
import { db } from "../src/lib/db"

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const j = (v: unknown) => JSON.stringify(v)

async function upsertLearningPaths() {
  console.log("→ LearningPaths")
  const paths = [
    {
      slug: "beginner-cybersecurity",
      title: "Beginner Cybersecurity",
      subtitle: "Start from zero — build the security fundamentals",
      description:
        "A 12-week on-ramp into cyber security. Covers computing fundamentals, networking basics, Linux command line, and the core defensive mindset. Perfect for career switchers and CS students.",
      icon: "Route",
      color: "text-emerald-300",
      tint: "bg-emerald-500/10",
      difficulty: "Beginner",
      duration: "12 weeks",
      skillsCount: 8,
      labsCount: 5,
      xpReward: 5000,
      careerOutcome: "Junior Security Analyst / Help-desk with security focus",
      skills: [
        "Computing Fundamentals",
        "Linux Command Line",
        "TCP/IP Basics",
        "OWASP Top 10 Awareness",
        "Threat Detection",
        "Log Analysis",
        "Cryptography Basics",
        "Security Mindset",
      ],
      order: 1,
      featured: true,
    },
    {
      slug: "soc-analyst",
      title: "SOC Analyst",
      subtitle: "Defend the perimeter — monitor, triage, and respond",
      description:
        "Become a Security Operations Center analyst. Master SIEM, log triage, MITRE ATT&CK, and incident response playbooks. Includes 8 hands-on labs using Splunk, ELK, and Wazuh.",
      icon: "ShieldAlert",
      color: "text-cyan-300",
      tint: "bg-cyan-500/10",
      difficulty: "Intermediate",
      duration: "16 weeks",
      skillsCount: 12,
      labsCount: 8,
      xpReward: 8000,
      careerOutcome: "SOC Analyst (Tier 1/2) — $65k–$95k",
      skills: [
        "SIEM",
        "Threat Detection",
        "Incident Response",
        "Log Analysis",
        "IDS/IPS",
        "MITRE ATT&CK",
        "Network Scanning",
        "Firewalls",
        "TCP/IP",
        "Threat Intelligence",
        "EDR Operations",
        "Reporting",
      ],
      order: 2,
      featured: true,
    },
    {
      slug: "penetration-tester",
      title: "Penetration Tester",
      subtitle: "Break things ethically — find the holes before attackers do",
      description:
        "The full offensive path. Recon, scanning, exploitation, post-exploitation, and reporting. Aligned with OSCP, CEH Practical, and PNPT. Includes 12 advanced labs and a capstone engagement.",
      icon: "Swords",
      color: "text-rose-300",
      tint: "bg-rose-500/10",
      difficulty: "Advanced",
      duration: "20 weeks",
      skillsCount: 15,
      labsCount: 12,
      xpReward: 12000,
      careerOutcome: "Junior/Associate Penetration Tester — $90k–$130k",
      skills: [
        "Reconnaissance",
        "Scanning",
        "Enumeration",
        "Web Exploitation",
        "Privilege Escalation",
        "Buffer Overflows",
        "Active Directory",
        "Metasploit",
        "Burp Suite",
        "SQL Injection",
        "XSS",
        "API Security",
        "Social Engineering",
        "Report Writing",
        "OPSEC",
      ],
      order: 3,
      featured: true,
    },
    {
      slug: "cloud-security",
      title: "Cloud Security",
      subtitle: "Secure AWS, Azure, and Kubernetes workloads",
      description:
        "Cloud-native security from the ground up. IAM hardening, CSPM, container security, Kubernetes RBAC, and cloud incident response. Aligned with AWS Security Specialty and AZ-500.",
      icon: "CloudShield",
      color: "text-violet-300",
      tint: "bg-violet-500/10",
      difficulty: "Advanced",
      duration: "18 weeks",
      skillsCount: 10,
      labsCount: 7,
      xpReward: 10000,
      careerOutcome: "Cloud Security Engineer — $120k–$170k",
      skills: [
        "AWS Security",
        "Azure Security",
        "IAM",
        "Containers",
        "Kubernetes",
        "CSPM",
        "DevSecOps",
        "Cloud Forensics",
        "Zero Trust",
        "Terraform Security",
      ],
      order: 4,
      featured: false,
    },
    {
      slug: "web-security-specialist",
      title: "Web Security Specialist",
      subtitle: "OWASP, APIs, and modern web app exploitation",
      description:
        "Deep dive into web application security. Master the OWASP Top 10, advanced SQLi/XSS, SSRF, JWT attacks, and API security. Heavy Burp Suite lab work.",
      icon: "Globe",
      color: "text-amber-300",
      tint: "bg-amber-500/10",
      difficulty: "Intermediate",
      duration: "14 weeks",
      skillsCount: 10,
      labsCount: 8,
      xpReward: 7000,
      careerOutcome: "Web Application Tester — $85k–$125k",
      skills: [
        "OWASP Top 10",
        "SQL Injection",
        "XSS",
        "CSRF",
        "API Security",
        "SSRF",
        "JWT Attacks",
        "Burp Suite",
        "Authentication Bypass",
        "Session Management",
      ],
      order: 5,
      featured: false,
    },
    {
      slug: "security-engineer",
      title: "Security Engineer",
      subtitle: "Design, build, and operate defensive infrastructure",
      description:
        "End-to-end defensive engineering. Network segmentation, EDR deployment, IAM architecture, DevSecOps pipelines, and threat modeling. Bridge between blue team and DevOps.",
      icon: "Wrench",
      color: "text-blue-300",
      tint: "bg-blue-500/10",
      difficulty: "Advanced",
      duration: "22 weeks",
      skillsCount: 14,
      labsCount: 10,
      xpReward: 11000,
      careerOutcome: "Security Engineer — $110k–$155k",
      skills: [
        "Secure Coding",
        "Threat Modeling",
        "Cryptography",
        "DevSecOps",
        "Architecture",
        "Network Segmentation",
        "EDR Deployment",
        "IAM Architecture",
        "Firewalls",
        "VPN",
        "Hardening",
        "SIEM Engineering",
        "Automation",
        "Incident Response",
      ],
      order: 6,
      featured: false,
    },
  ]

  for (const p of paths) {
    await db.learningPath.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        subtitle: p.subtitle,
        description: p.description,
        icon: p.icon,
        color: p.color,
        tint: p.tint,
        difficulty: p.difficulty,
        duration: p.duration,
        skillsCount: p.skillsCount,
        labsCount: p.labsCount,
        xpReward: p.xpReward,
        careerOutcome: p.careerOutcome,
        skills: j(p.skills),
        courses: j([]),
        order: p.order,
        published: true,
        featured: p.featured,
      },
      create: {
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        description: p.description,
        icon: p.icon,
        color: p.color,
        tint: p.tint,
        difficulty: p.difficulty,
        duration: p.duration,
        skillsCount: p.skillsCount,
        labsCount: p.labsCount,
        xpReward: p.xpReward,
        careerOutcome: p.careerOutcome,
        skills: j(p.skills),
        courses: j([]),
        order: p.order,
        published: true,
        featured: p.featured,
      },
    })
  }
  console.log(`  ✓ ${paths.length} learning paths`)
}

async function upsertSkillCategories() {
  console.log("→ SkillCategories")
  const cats = [
    { slug: "offensive-security", name: "Offensive Security", icon: "Swords", color: "text-rose-300", tint: "bg-rose-500/10", description: "Ethical hacking, exploitation, and red-team tradecraft.", order: 1 },
    { slug: "defensive-security", name: "Defensive Security", icon: "ShieldCheck", color: "text-emerald-300", tint: "bg-emerald-500/10", description: "Detection, response, and blue-team operations.", order: 2 },
    { slug: "network-security", name: "Network Security", icon: "Network", color: "text-cyan-300", tint: "bg-cyan-500/10", description: "Protocols, segmentation, and perimeter defense.", order: 3 },
    { slug: "web-security", name: "Web Security", icon: "Globe", color: "text-amber-300", tint: "bg-amber-500/10", description: "Web app vulnerabilities and modern API attacks.", order: 4 },
    { slug: "cloud-security", name: "Cloud Security", icon: "CloudShield", color: "text-violet-300", tint: "bg-violet-500/10", description: "Securing AWS, Azure, containers, and Kubernetes.", order: 5 },
    { slug: "digital-forensics", name: "Digital Forensics", icon: "Search", color: "text-blue-300", tint: "bg-blue-500/10", description: "Disk, memory, and network forensics for IR.", order: 6 },
    { slug: "security-engineering", name: "Security Engineering", icon: "Wrench", color: "text-teal-300", tint: "bg-teal-500/10", description: "Architecture, secure SDLC, and DevSecOps.", order: 7 },
  ]
  for (const c of cats) {
    await db.skillCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, color: c.color, tint: c.tint, description: c.description, order: c.order },
      create: c,
    })
  }
  console.log(`  ✓ ${cats.length} skill categories`)
  return cats
}

async function upsertSkills(cats: { slug: string; name: string }[]) {
  console.log("→ Skills")
  const catMap = new Map(cats.map((c) => [c.slug, c.name]))

  // categorySlug -> [skillName, difficulty, xp][]
  const skillsByCat: Record<string, Array<{ name: string; difficulty: string; xp: number; prereqs?: string[] }>> = {
    "offensive-security": [
      { name: "Reconnaissance", difficulty: "Beginner", xp: 100 },
      { name: "Scanning", difficulty: "Beginner", xp: 120, prereqs: ["reconnaissance"] },
      { name: "Enumeration", difficulty: "Intermediate", xp: 180, prereqs: ["scanning"] },
      { name: "Web Exploitation", difficulty: "Advanced", xp: 280, prereqs: ["enumeration"] },
      { name: "Privilege Escalation", difficulty: "Advanced", xp: 320, prereqs: ["web-exploitation"] },
    ],
    "defensive-security": [
      { name: "Threat Detection", difficulty: "Beginner", xp: 120 },
      { name: "Incident Response", difficulty: "Intermediate", xp: 200, prereqs: ["threat-detection"] },
      { name: "Log Analysis", difficulty: "Beginner", xp: 100 },
      { name: "SIEM", difficulty: "Intermediate", xp: 220, prereqs: ["log-analysis"] },
      { name: "IDS/IPS", difficulty: "Intermediate", xp: 200, prereqs: ["threat-detection"] },
    ],
    "network-security": [
      { name: "TCP/IP", difficulty: "Beginner", xp: 100 },
      { name: "Routing", difficulty: "Beginner", xp: 120, prereqs: ["tcp-ip"] },
      { name: "Firewalls", difficulty: "Intermediate", xp: 180, prereqs: ["routing"] },
      { name: "VPN", difficulty: "Intermediate", xp: 180, prereqs: ["firewalls"] },
      { name: "Network Scanning", difficulty: "Beginner", xp: 140, prereqs: ["tcp-ip"] },
    ],
    "web-security": [
      { name: "OWASP Top 10", difficulty: "Beginner", xp: 140 },
      { name: "SQL Injection", difficulty: "Intermediate", xp: 220, prereqs: ["owasp-top-10"] },
      { name: "XSS", difficulty: "Intermediate", xp: 200, prereqs: ["owasp-top-10"] },
      { name: "CSRF", difficulty: "Intermediate", xp: 200, prereqs: ["owasp-top-10"] },
      { name: "API Security", difficulty: "Advanced", xp: 280, prereqs: ["sql-injection", "xss"] },
    ],
    "cloud-security": [
      { name: "AWS Security", difficulty: "Intermediate", xp: 220 },
      { name: "Azure Security", difficulty: "Intermediate", xp: 220 },
      { name: "IAM", difficulty: "Intermediate", xp: 200, prereqs: ["aws-security"] },
      { name: "Containers", difficulty: "Advanced", xp: 260, prereqs: ["iam"] },
      { name: "Kubernetes", difficulty: "Advanced", xp: 320, prereqs: ["containers"] },
    ],
    "digital-forensics": [
      { name: "Disk Forensics", difficulty: "Intermediate", xp: 200 },
      { name: "Memory Forensics", difficulty: "Advanced", xp: 280, prereqs: ["disk-forensics"] },
      { name: "Network Forensics", difficulty: "Intermediate", xp: 220 },
      { name: "Steganography", difficulty: "Intermediate", xp: 180 },
      { name: "Timeline Analysis", difficulty: "Advanced", xp: 260, prereqs: ["disk-forensics"] },
    ],
    "security-engineering": [
      { name: "Secure Coding", difficulty: "Intermediate", xp: 200 },
      { name: "Threat Modeling", difficulty: "Intermediate", xp: 220 },
      { name: "Cryptography", difficulty: "Advanced", xp: 280 },
      { name: "DevSecOps", difficulty: "Advanced", xp: 280, prereqs: ["secure-coding"] },
      { name: "Architecture", difficulty: "Advanced", xp: 320, prereqs: ["threat-modeling"] },
    ],
  }

  let total = 0
  for (const cat of cats) {
    const skills = skillsByCat[cat.slug] ?? []
    // find SkillCategory row to get its id
    const row = await db.skillCategory.findUnique({ where: { slug: cat.slug } })
    if (!row) {
      console.warn(`  ! category not found: ${cat.slug}`)
      continue
    }
    skills.forEach((s, i) => {
      const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      ;(s as any).slug = slug
      ;(s as any).order = i + 1
    })
    for (const s of skills) {
      const slug = (s as any).slug as string
      await db.skill.upsert({
        where: { slug },
        update: {
          name: s.name,
          categoryId: row.id,
          difficulty: s.difficulty,
          xp: s.xp,
          status: "available",
          prerequisites: j(s.prereqs ?? []),
          relatedCourses: j([]),
          relatedLabs: j([]),
          order: (s as any).order,
        },
        create: {
          slug,
          name: s.name,
          categoryId: row.id,
          difficulty: s.difficulty,
          xp: s.xp,
          status: "available",
          prerequisites: j(s.prereqs ?? []),
          relatedCourses: j([]),
          relatedLabs: j([]),
          order: (s as any).order,
        },
      })
      total++
    }
  }
  // descriptions for nicer UI
  console.log(`  ✓ ${total} skills across ${catMap.size} categories`)
}

async function upsertRanks() {
  console.log("→ Ranks")
  const ranks = [
    { name: "RECRUIT", displayName: "Recruit", level: 1, xpThreshold: 0, color: "text-gray-400", icon: "Shield", description: "Just joined GuardianX. The journey begins." },
    { name: "ANALYST", displayName: "Analyst", level: 2, xpThreshold: 1000, color: "text-cyan-400", icon: "Shield", description: "Comfortable with fundamentals and basic tooling." },
    { name: "HUNTER", displayName: "Hunter", level: 3, xpThreshold: 3000, color: "text-blue-400", icon: "Crosshair", description: "Hunts threats and vulnerabilities with intent." },
    { name: "OPERATOR", displayName: "Operator", level: 4, xpThreshold: 7000, color: "text-violet-400", icon: "Terminal", description: "Runs operations end-to-end with confidence." },
    { name: "SPECIALIST", displayName: "Specialist", level: 5, xpThreshold: 15000, color: "text-amber-400", icon: "Award", description: "Domain specialist — sought out by peers." },
    { name: "SENTINEL", displayName: "Sentinel", level: 6, xpThreshold: 30000, color: "text-emerald-400", icon: "ShieldCheck", description: "Stands guard over complex environments." },
    { name: "GUARDIAN", displayName: "Guardian", level: 7, xpThreshold: 60000, color: "text-rose-400", icon: "Crown", description: "Mentors others and shapes the platform." },
    { name: "ELITE_GUARDIAN", displayName: "Elite Guardian", level: 8, xpThreshold: 100000, color: "text-fuchsia-400", icon: "Sparkles", description: "Top 1% — the elite of the GuardianX cohort." },
  ]
  for (const r of ranks) {
    await db.rank.upsert({
      where: { name: r.name },
      update: {
        displayName: r.displayName,
        level: r.level,
        xpThreshold: r.xpThreshold,
        color: r.color,
        description: r.description,
        icon: r.icon,
        order: r.level,
      },
      create: { ...r, order: r.level },
    })
  }
  console.log(`  ✓ ${ranks.length} ranks`)
}

async function upsertCareerPathRoles() {
  console.log("→ CareerPathRoles")
  const roles = [
    {
      slug: "junior-penetration-tester",
      title: "Junior Penetration Tester",
      description:
        "Entry-level offensive security role. Executes scoped penetration tests against networks and web apps, documents findings, and supports senior testers on engagements.",
      icon: "Swords",
      color: "text-rose-300",
      skillWeights: { networking: 20, linux: 20, web: 25, pentesting: 30, reporting: 5 },
      minThreshold: 60,
      recommendedCerts: ["OSCP", "CEH Practical", "PNPT"],
      salaryRange: "$70,000 – $100,000",
      demand: "High",
      order: 1,
    },
    {
      slug: "soc-analyst",
      title: "SOC Analyst",
      description:
        "Monitors SIEM, triages alerts, escalates true positives, and writes initial incident reports. The classic blue-team entry point.",
      icon: "ShieldAlert",
      color: "text-cyan-300",
      skillWeights: { networking: 25, linux: 10, web: 10, defensive: 40, reporting: 15 },
      minThreshold: 55,
      recommendedCerts: ["CompTIA Security+", "BTL1", "CySA+"],
      salaryRange: "$65,000 – $95,000",
      demand: "High",
      order: 2,
    },
    {
      slug: "security-engineer",
      title: "Security Engineer",
      description:
        "Designs, deploys, and maintains defensive security infrastructure — firewalls, EDR, IAM, WAF. Bridges blue-team and DevOps.",
      icon: "Wrench",
      color: "text-blue-300",
      skillWeights: { networking: 20, linux: 20, defensive: 25, engineering: 30, cloud: 5 },
      minThreshold: 65,
      recommendedCerts: ["CISSP", "GICSP", "CCSP"],
      salaryRange: "$110,000 – $155,000",
      demand: "High",
      order: 3,
    },
    {
      slug: "cloud-security-engineer",
      title: "Cloud Security Engineer",
      description:
        "Secures cloud-native workloads. Implements CSPM, CI/CD security, container hardening, and zero-trust across AWS/Azure/GCP.",
      icon: "CloudShield",
      color: "text-violet-300",
      skillWeights: { cloud: 40, networking: 15, linux: 15, engineering: 20, defensive: 10 },
      minThreshold: 65,
      recommendedCerts: ["AWS Security Specialty", "AZ-500", "CCSP"],
      salaryRange: "$130,000 – $180,000",
      demand: "High",
      order: 4,
    },
    {
      slug: "web-application-tester",
      title: "Web Application Tester",
      description:
        "Specializes in web app pentesting. Deep OWASP Top 10 knowledge, advanced SQLi/XSS, SSRF, JWT attacks, and API security testing.",
      icon: "Globe",
      color: "text-amber-300",
      skillWeights: { web: 50, pentesting: 25, networking: 10, linux: 10, reporting: 5 },
      minThreshold: 65,
      recommendedCerts: ["OSWE", "eWPT", "BurpSuite Certified"],
      salaryRange: "$95,000 – $140,000",
      demand: "High",
      order: 5,
    },
    {
      slug: "security-consultant",
      title: "Security Consultant",
      description:
        "Advises clients on security strategy, risk, compliance, and architecture. Combines technical depth with strong communication.",
      icon: "Briefcase",
      color: "text-emerald-300",
      skillWeights: { engineering: 20, defensive: 20, pentesting: 15, governance: 25, reporting: 20 },
      minThreshold: 70,
      recommendedCerts: ["CISSP", "CISM", "ISO 27001 Lead Auditor"],
      salaryRange: "$120,000 – $180,000",
      demand: "Medium",
      order: 6,
    },
  ]
  for (const r of roles) {
    await db.careerPathRole.upsert({
      where: { slug: r.slug },
      update: {
        title: r.title,
        description: r.description,
        icon: r.icon,
        color: r.color,
        skillWeights: j(r.skillWeights),
        minThreshold: r.minThreshold,
        recommendedCerts: j(r.recommendedCerts),
        recommendedCourses: j([]),
        recommendedLabs: j([]),
        salaryRange: r.salaryRange,
        demand: r.demand,
        published: true,
        order: r.order,
      },
      create: {
        slug: r.slug,
        title: r.title,
        description: r.description,
        icon: r.icon,
        color: r.color,
        skillWeights: j(r.skillWeights),
        minThreshold: r.minThreshold,
        recommendedCerts: j(r.recommendedCerts),
        recommendedCourses: j([]),
        recommendedLabs: j([]),
        salaryRange: r.salaryRange,
        demand: r.demand,
        published: true,
        order: r.order,
      },
    })
  }
  console.log(`  ✓ ${roles.length} career path roles`)
}

async function upsertPlatformStats() {
  console.log("→ PlatformStats")
  const learnerCount = await db.user.count()
  const courseCount = await db.course.count()
  const labCount = await db.lab.count()
  const certCount = await db.certificate.count()

  const stats = [
    { key: "learner_count", label: "Active Learners", value: String(learnerCount), source: "calculated", suffix: "+", icon: "Users", color: "text-emerald-300" },
    { key: "course_count", label: "Courses", value: String(courseCount), source: "calculated", suffix: "", icon: "BookOpen", color: "text-violet-300" },
    { key: "lab_count", label: "Hands-on Labs", value: String(labCount || 31), source: labCount > 0 ? "calculated" : "manual", suffix: "", icon: "FlaskConical", color: "text-cyan-300" },
    { key: "cert_count", label: "Certificates Issued", value: String(certCount), source: "calculated", suffix: "+", icon: "Award", color: "text-amber-300" },
    { key: "partner_count", label: "Partner Institutions", value: "150", source: "manual", suffix: "+", icon: "Building2", color: "text-rose-300" },
    { key: "ctf_count", label: "CTF Challenges", value: "48", source: "manual", suffix: "", icon: "Flag", color: "text-blue-300" },
  ]
  for (const s of stats) {
    const existing = await db.platformStat.findUnique({ where: { key: s.key } })
    if (existing) {
      // For calculated stats, always refresh the value; for manual stats, keep existing manual value if set
      const nextValue = s.source === "calculated" ? s.value : existing.value
      await db.platformStat.update({
        where: { key: s.key },
        data: {
          label: s.label,
          value: nextValue,
          source: s.source,
          displayStatus: "visible",
          suffix: s.suffix,
          icon: s.icon,
          color: s.color,
        },
      })
    } else {
      await db.platformStat.create({
        data: {
          key: s.key,
          label: s.label,
          value: s.value,
          source: s.source,
          displayStatus: "visible",
          suffix: s.suffix,
          icon: s.icon,
          color: s.color,
        },
      })
    }
  }
  console.log(`  ✓ ${stats.length} platform stats (learner=${learnerCount}, course=${courseCount}, lab=${labCount}, cert=${certCount})`)
}

async function upsertTechnologyPartners() {
  console.log("→ TechnologyPartners")
  const partners = [
    { name: "Kali Linux", icon: "Terminal", description: "Penetration testing OS used across GuardianX offensive labs.", url: "https://www.kali.org/" },
    { name: "Nmap", icon: "Radar", description: "Network mapper for discovery and security auditing.", url: "https://nmap.org/" },
    { name: "Burp Suite", icon: "Bug", description: "Web vulnerability scanner and interception proxy.", url: "https://portswigger.net/burp" },
    { name: "Metasploit", icon: "Swords", description: "Exploitation framework for penetration testing.", url: "https://www.metasploit.com/" },
    { name: "Wireshark", icon: "Activity", description: "Network protocol analyzer for traffic inspection.", url: "https://www.wireshark.org/" },
    { name: "Docker", icon: "Container", description: "Container runtime powering our cyber range.", url: "https://www.docker.com/" },
    { name: "Hashcat", icon: "Key", description: "Advanced password recovery utility.", url: "https://hashcat.net/hashcat/" },
    { name: "John the Ripper", icon: "KeyRound", description: "Password cracker for offline hash analysis.", url: "https://www.openwall.com/john/" },
    { name: "Nikto", icon: "ScanLine", description: "Web server scanner for known vulnerabilities.", url: "https://cirt.net/Nikto2" },
    { name: "SQLMap", icon: "Database", description: "Automatic SQL injection and database takeover tool.", url: "https://sqlmap.org/" },
    { name: "Hydra", icon: "Fingerprint", description: "Fast network logon cracker supporting many protocols.", url: "https://github.com/vanhauser-thc/thc-hydra" },
    { name: "Gobuster", icon: "FolderSearch", description: "Directory/file/DNS brute-forcer used in recon labs.", url: "https://github.com/OJ/gobuster" },
  ]
  let i = 0
  for (const p of partners) {
    i++
    const existing = await db.technologyPartner.findUnique({ where: { name: p.name } })
    if (existing) {
      await db.technologyPartner.update({
        where: { name: p.name },
        data: {
          category: "tool",
          description: p.description,
          url: p.url,
          icon: p.icon,
          order: i,
          published: true,
        },
      })
    } else {
      await db.technologyPartner.create({
        data: {
          name: p.name,
          category: "tool",
          description: p.description,
          url: p.url,
          icon: p.icon,
          order: i,
          published: true,
        },
      })
    }
  }
  console.log(`  ✓ ${partners.length} technology partners`)
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
/**
 * Ensure the platform ADMIN account always exists.
 *
 * Why: `npm run db:seed` runs THIS script (not prisma/seed.ts), so any
 * production database seeded the normal way previously had NO admin user —
 * logging in with admin@guardianx.io then failed with "invalid login
 * credentials". This upsert is idempotent: it creates the admin on first
 * run and, by default, leaves an existing account untouched (so runtime
 * password/profile changes are never clobbered).
 *
 * Override via env:
 *   ADMIN_EMAIL    (default admin@guardianx.io)
 *   ADMIN_PASSWORD (default admin123 — only used when creating or when
 *                   ADMIN_RESET_PASSWORD=1 is set)
 *   ADMIN_RESET_PASSWORD=1  → also reset the password hash on existing row
 */
async function upsertAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@guardianx.io").toLowerCase()
  const password = process.env.ADMIN_PASSWORD || "admin123"
  const reset = process.env.ADMIN_RESET_PASSWORD === "1"

  console.log("→ Admin user")
  const passwordHash = bcrypt.hashSync(password, 10)

  const existing = await db.user.findUnique({ where: { email } })
  if (!existing) {
    await db.user.create({
      data: {
        email,
        name: "Alex Mercer",
        passwordHash,
        role: "ADMIN",
        title: "Platform Administrator",
        bio: "GuardianX platform administrator and lead security architect.",
      },
    })
    console.log(`  ✓ created admin ${email}`)
  } else if (reset) {
    await db.user.update({ where: { email }, data: { passwordHash, role: "ADMIN" } })
    console.log(`  ✓ password reset for admin ${email}`)
  } else {
    console.log(`  • admin ${email} already exists (set ADMIN_RESET_PASSWORD=1 to reset password)`)
  }
}

async function main() {
  console.log("== GuardianX Production Seed (PROD-DB) ==")
  await upsertAdminUser()
  await upsertLearningPaths()
  const cats = await upsertSkillCategories()
  await upsertSkills(cats)
  await upsertRanks()
  await upsertCareerPathRoles()
  await upsertPlatformStats()
  await upsertTechnologyPartners()
  console.log("== Done. ==")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
