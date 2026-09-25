/**
 * Course extras backfill — fills the 5 "course page sections" fields
 * (whatYouWillLearn, prerequisites, whoShouldAttend, toolsCovered,
 * careerOutcomes) for every known seeded course, matched by shortName.
 *
 * WHY A SEPARATE SCRIPT
 * The production seed (prisma/seed-production.ts) does not create Course
 * rows, so there is no single seed to extend. This script is idempotent
 * and safe to run repeatedly against ANY environment — it only touches
 * the five extras columns and never creates/deletes courses.
 *
 * Run (local):  npx tsx scripts/seed-course-extras.ts
 * Run (prod):   DATABASE_URL="<prod-url>" npx tsx scripts/seed-course-extras.ts
 *
 * Courses NOT in this map are left untouched (admins author them via
 * Course Studio → Course Details).
 */

import { db } from "../src/lib/db"
import { encodeCourseList } from "../src/lib/course-lists"

type Extras = {
  whatYouWillLearn: string[]
  prerequisites: string[]
  whoShouldAttend: string[]
  toolsCovered: string[]
  careerOutcomes: string[]
}

const COURSE_EXTRAS: Record<string, Extras> = {
  CEH: {
    whatYouWillLearn: [
      "Perform footprinting and reconnaissance using OSINT frameworks and advanced Google dorking",
      "Scan and enumerate networks with Nmap, Nessus and custom scripts",
      "Exploit vulnerable systems end-to-end in a controlled lab environment",
      "Hijack web sessions, escalate privileges and cover tracks the way attackers do",
      "Hone your skills against 219+ attack techniques across 20+ security domains",
      "Write professional vulnerability reports that map to CVEs",
    ],
    prerequisites: [
      "Basic understanding of networking (TCP/IP, DNS, HTTP)",
      "Comfortable working with the Windows and Linux command line",
      "No prior hacking experience required — we start from first principles",
    ],
    whoShouldAttend: [
      "IT professionals moving into a dedicated security role",
      "SOC / network administrators who want offensive perspective",
      "Students preparing for the CEH 312-50 certification exam",
    ],
    toolsCovered: ["Nmap", "Metasploit", "Burp Suite", "Wireshark", "Nessus", "Maltego", "Hydra"],
    careerOutcomes: [
      "Penetration Tester (entry to mid-level)",
      "Security Analyst (SOC Tier 1/2)",
      "Vulnerability Assessment Engineer",
    ],
  },
  OSCP: {
    whatYouWillLearn: [
      "Enumerate and compromise multiple machines in a 24-hour exam-style environment",
      "Chain exploits across Windows and Linux targets with privilege escalation",
      "Pivot through networks and attack multi-layered infrastructure",
      "Bypass common AV and endpoint protections using custom payloads",
      "Write a professional penetration-test report accepted by the OSCP graders",
    ],
    prerequisites: [
      "Solid networking and Linux fundamentals",
      "Experience with basic exploitation (CEH-level or equivalent)",
      "Comfortable reading documentation and scripting in Bash or Python",
    ],
    whoShouldAttend: [
      "Penetration testers preparing for the OSCP certification",
      "Security professionals who want rigorous hands-on practice",
      "Bug bounty hunters formalizing their methodology",
    ],
    toolsCovered: ["Kali Linux", "Metasploit", "Burp Suite", "Impacket", "Mimikatz", "CrackMapExec"],
    careerOutcomes: [
      "Offensive Security Consultant",
      "Red Team Operator",
      "Senior Penetration Tester",
    ],
  },
  OSEP: {
    whatYouWillLearn: [
      "Evade AV and EDR with custom shellcode loaders and obfuscation",
      "Exploit Active Directory at scale — delegation attacks, ACL abuse, domain dominance",
      "Perform lateral movement and network pivoting in hardened environments",
      "Bypass application whitelisting and modern endpoint controls",
    ],
    prerequisites: [
      "OSCP-level penetration testing skills",
      "Deep familiarity with Active Directory internals",
      "Scripting ability in Python or PowerShell",
    ],
    whoShouldAttend: [
      "Experienced penetration testers moving to advanced adversary simulation",
      "Red teamers who need EDR-evasion techniques",
      "OSCP holders preparing for OSEP",
    ],
    toolsCovered: ["PowerShell", "Impacket", "BloodHound", "Covenant", "Custom loaders"],
    careerOutcomes: ["Senior Red Team Operator", "Adversary Emulation Lead", "Offensive Security Researcher"],
  },
  CRTO: {
    whatYouWillLearn: [
      "Operate Cobalt Strike-like C2 frameworks against a mature SOC",
      "Execute adversary tradecraft while evading EDR and telemetry",
      "Conduct red team engagements with operational security (OPSEC) discipline",
      "Build infrastructure and plan engagements the way real teams do",
    ],
    prerequisites: [
      "Comfortable with Windows internals and Active Directory",
      "Basic red team or pentest experience",
    ],
    whoShouldAttend: [
      "Red teamers formalizing C2 tradecraft",
      "Penetration testers transitioning into threat emulation",
    ],
    toolsCovered: ["Cobalt Strike", "Mythic C2", "SharpStrike", "Sysinternals"],
    careerOutcomes: ["Red Team Operator", "Threat Emulation Specialist", "C2 Infrastructure Engineer"],
  },
  BTL1: {
    whatYouWillLearn: [
      "Triage phishing emails and analyze malicious attachments safely",
      "Hunt threats in SIEM dashboards and write effective detection queries",
      "Respond to incidents end-to-end — containment, eradication, recovery",
      "Perform disk and memory forensics with industry tooling",
      "Map findings to MITRE ATT&CK and produce a professional incident report",
    ],
    prerequisites: [
      "Basic networking and Windows/Linux fundamentals",
      "An interest in defensive security — no SOC experience needed",
    ],
    whoShouldAttend: [
      "Aspiring SOC analysts starting a blue-team career",
      "IT support staff transitioning into security operations",
      "Students preparing for the BTL1 exam",
    ],
    toolsCovered: ["Splunk", "Brim", "Volatility", "Autopsy", "CyberChef", "MITRE ATT&CK Navigator"],
    careerOutcomes: ["SOC Analyst (Tier 1)", "Incident Responder (entry)", "Threat Hunter (junior)"],
  },
  CISM: {
    whatYouWillLearn: [
      "Design and govern an information security program aligned to business goals",
      "Manage security risk using industry frameworks (ISO 27001, NIST CSF)",
      "Develop and run incident response and business continuity programs",
      "Lead security compliance, audits and board-level reporting",
    ],
    prerequisites: [
      "5 years of information security experience (recommended by ISACA)",
      "Working knowledge of security governance concepts",
    ],
    whoShouldAttend: [
      "Security managers and aspiring CISOs",
      "GRC professionals deepening their program knowledge",
      "Candidates preparing for the CISM exam",
    ],
    toolsCovered: ["ISO 27001", "NIST CSF", "COBIT", "Risk registers & KRI/KPI frameworks"],
    careerOutcomes: ["Information Security Manager", "GRC Lead", "CISO track roles"],
  },
  CISA: {
    whatYouWillLearn: [
      "Plan and execute IS audits to professional standards",
      "Assess IT governance, system acquisition and development controls",
      "Evaluate IT service delivery, resilience and business continuity",
      "Protect information assets through control design and testing",
    ],
    prerequisites: ["Basic audit or IT assurance exposure", "Familiarity with enterprise IT environments"],
    whoShouldAttend: ["IT auditors preparing for CISA", "Compliance and assurance professionals"],
    toolsCovered: ["Audit planning frameworks", "COBIT", "ITIL", "Control test matrices"],
    careerOutcomes: ["IT Auditor", "Compliance Analyst", "Assurance Consultant"],
  },
  "AWS-Sec": {
    whatYouWillLearn: [
      "Harden IAM with least privilege, SCPs and permission boundaries",
      "Secure workloads across EC2, S3, Lambda, RDS and containers",
      "Detect threats with GuardDuty, CloudTrail and Security Hub",
      "Encrypt data with KMS and enforce network segmentation",
    ],
    prerequisites: ["AWS Cloud Practitioner / Solutions Architect-level familiarity", "Basic Linux administration"],
    whoShouldAttend: ["Cloud engineers specializing in AWS security", "DevOps engineers adding security depth"],
    toolsCovered: ["IAM", "GuardDuty", "AWS Security Hub", "KMS", "CloudTrail", "Terraform"],
    careerOutcomes: ["AWS Security Engineer", "Cloud Security Architect", "DevSecOps Engineer"],
  },
  "AZ-500": {
    whatYouWillLearn: [
      "Manage identity and access with Entra ID, RBAC and PIM",
      "Secure Azure compute, storage and networking resources",
      "Implement Microsoft Defender for Cloud policies",
      "Manage security operations with Sentinel and KQL",
    ],
    prerequisites: ["Azure administration fundamentals (AZ-104 level helps)", "Basic scripting in PowerShell or CLI"],
    whoShouldAttend: ["Azure engineers moving into security", "Security admins preparing for AZ-500"],
    toolsCovered: ["Microsoft Entra ID", "Defender for Cloud", "Microsoft Sentinel", "Azure Key Vault"],
    careerOutcomes: ["Azure Security Engineer", "Cloud Security Analyst", "Identity & Access Engineer"],
  },
  CCSK: {
    whatYouWillLearn: [
      "Apply the CSA Cloud Controls Matrix and CCM guidance",
      "Secure cloud infrastructure across SaaS, PaaS and IaaS",
      "Understand shared responsibility models in depth",
      "Manage cloud governance, compliance and risk",
    ],
    prerequisites: ["General cloud computing awareness", "Basic security fundamentals"],
    whoShouldAttend: ["Security professionals validating cloud knowledge", "Anyone starting a cloud security career"],
    toolsCovered: ["CSA CCM", "CAIQ", "Cloud security baselines"],
    careerOutcomes: ["Cloud Security Analyst", "GRC Specialist (cloud)", "Security Consultant"],
  },
  GCFA: {
    whatYouWillLearn: [
      "Perform advanced Windows and memory forensics",
      "Analyze attacker artifacts and build incident timelines",
      "Hunt threats across endpoints using forensic evidence",
      "Present findings that stand up in a legal or HR context",
    ],
    prerequisites: ["Solid incident response fundamentals", "Experience with Windows internals helps"],
    whoShouldAttend: ["SOC analysts leveling up to forensics", "IR specialists preparing for GCFA"],
    toolsCovered: ["Volatility", "Plaso", "Timeline Explorer", "KAPE"],
    careerOutcomes: ["Forensics Analyst", "Incident Responder (mid/senior)", "Threat Hunter"],
  },
  GCIH: {
    whatYouWillLearn: [
      "Run the full incident handling lifecycle under pressure",
      "Detect and contain common attack vectors (web, malware, insider)",
      "Apply the ATT&CK framework to incident triage",
      "Build playbooks and improve organizational response capability",
    ],
    prerequisites: ["Networking and security fundamentals", "Some SOC or sysadmin exposure"],
    whoShouldAttend: ["Incident responders formalizing their skills", "SOC analysts preparing for GCIH"],
    toolsCovered: ["Wireshark", "Sysinternals", "Velociraptor", "SIEM workflows"],
    careerOutcomes: ["Incident Handler", "SOC Analyst (Tier 2)", "IR Team Lead (track)"],
  },
  eWPTX: {
    whatYouWillLearn: [
      "Exploit advanced web vulnerabilities beyond OWASP Top 10",
      "Bypass modern WAFs and input filters",
      "Attack authentication, session management and business logic",
      "Chain web exploits into full application compromise",
    ],
    prerequisites: ["Web application security basics (OWASP Top 10)", "Familiarity with Burp Suite"],
    whoShouldAttend: ["Web app pentesters advancing to expert level", "eWPT holders preparing for eWPTX"],
    toolsCovered: ["Burp Suite Pro", "ffuf", "sqlmap", "Custom Python payloads"],
    careerOutcomes: ["Senior Web Application Penetration Tester", "Application Security Engineer", "Security Researcher (appsec)"],
  },
  CCNA: {
    whatYouWillLearn: [
      "Configure and troubleshoot routers, switches and VLANs",
      "Design IPv4/IPv6 addressing and subnetting with confidence",
      "Implement routing protocols: OSPF, EIGRP and static routing",
      "Secure network access with ACLs, port security and basic firewalls",
    ],
    prerequisites: ["Basic computer literacy", "A willingness to lab everything hands-on"],
    whoShouldAttend: ["Aspiring network engineers", "IT generalists adding networking depth"],
    toolsCovered: ["Cisco IOS", "Packet Tracer", "GNS3", "Wireshark"],
    careerOutcomes: ["Network Engineer", "NOC Engineer", "Network Administrator"],
  },
  CCNP: {
    whatYouWillLearn: [
      "Architect enterprise routed and switched networks",
      "Deploy BGP, OSPF and EIGRP at enterprise scale",
      "Implement SD-WAN, wireless and network automation workflows",
      "Troubleshoot complex multi-protocol environments",
    ],
    prerequisites: ["CCNA-level knowledge or equivalent experience"],
    whoShouldAttend: ["Network engineers preparing for CCNP", "Senior NOC staff formalizing expertise"],
    toolsCovered: ["Cisco IOS-XE", "EVE-NG", "Python + Netmiko", "Ansible"],
    careerOutcomes: ["Senior Network Engineer", "Network Architect", "Infrastructure Consultant"],
  },
  RHCSA: {
    whatYouWillLearn: [
      "Administer RHEL systems from the command line with confidence",
      "Manage storage with LVM, Stratis and partitioning",
      "Configure SELinux, firewalls and system security",
      "Automate tasks with shell scripting and systemd units",
    ],
    prerequisites: ["Basic Linux familiarity", "Comfortable with the command line"],
    whoShouldAttend: ["Aspiring Linux system administrators", "DevOps engineers formalizing Linux skills"],
    toolsCovered: ["RHEL 9", "systemd", "SELinux", "podman", "LVM"],
    careerOutcomes: ["Linux System Administrator", "Site Reliability Engineer (track)", "Infrastructure Engineer"],
  },
  WAPT: {
    whatYouWillLearn: [
      "Assess web applications against the OWASP Top 10 and beyond",
      "Exploit SQLi, XSS, SSRF, IDOR and deserialization bugs hands-on",
      "Write reproducible findings with business-risk context",
      "Harden applications with developer-friendly remediation advice",
    ],
    prerequisites: ["HTTP fundamentals", "Basic HTML/JavaScript understanding"],
    whoShouldAttend: ["Developers moving into security", "Junior pentesters specializing in web"],
    toolsCovered: ["Burp Suite", "OWASP ZAP", "sqlmap", "Nikto", "Browser DevTools"],
    careerOutcomes: ["Web Application Penetration Tester", "AppSec Engineer", "Security Consultant"],
  },
  CISSP: {
    whatYouWillLearn: [
      "Master all 8 CISSP domains with exam-focused depth",
      "Design security architecture across enterprise environments",
      "Apply risk management, asset and compliance frameworks",
      "Think like a CISO — scenario-based decision making for the exam",
    ],
    prerequisites: ["5 years of cumulative paid security work experience (waivers possible)", "Broad security fundamentals"],
    whoShouldAttend: ["Senior security professionals pursuing CISSP", "Security leads and architects formalizing breadth"],
    toolsCovered: ["(ISC)² CBK domains", "NIST frameworks", "Risk assessment methodologies"],
    careerOutcomes: ["Security Architect", "Security Manager", "CISO track roles"],
  },
  CYBERARK: {
    whatYouWillLearn: [
      "Deploy and administer CyberArk Privilege Cloud / PAS",
      "Onboard accounts and manage privileged sessions safely",
      "Configure EPV, CPM and PSM components end-to-end",
      "Audit privileged access and produce compliance reports",
    ],
    prerequisites: ["Windows Server administration", "Directory services (AD) familiarity"],
    whoShouldAttend: ["IAM engineers specializing in PAM", "Security admins managing privileged access"],
    toolsCovered: ["CyberArk PVWA", "CPM", "PSM", "Vault"],
    careerOutcomes: ["PAM Engineer", "IAM Specialist", "Privileged Access Consultant"],
  },
}

async function main() {
  const courses = await db.course.findMany({ select: { id: true, shortName: true, title: true } })
  let matched = 0
  let skipped: string[] = []

  for (const course of courses) {
    const key = course.shortName.toUpperCase()
    const extras = COURSE_EXTRAS[key]
    if (!extras) {
      skipped.push(`${course.shortName} (${course.title})`)
      continue
    }
    await db.course.update({
      where: { id: course.id },
      data: {
        whatYouWillLearn: encodeCourseList(extras.whatYouWillLearn),
        prerequisites: encodeCourseList(extras.prerequisites),
        whoShouldAttend: encodeCourseList(extras.whoShouldAttend),
        toolsCovered: encodeCourseList(extras.toolsCovered),
        careerOutcomes: encodeCourseList(extras.careerOutcomes),
      },
    })
    matched++
    console.log(`  ✓ ${course.shortName} — ${course.title}`)
  }

  console.log(`\nExtras written for ${matched} course(s).`)
  if (skipped.length) {
    console.log(`No curated extras for (left untouched, author via Course Studio): ${skipped.join(", ")}`)
  }
}

main()
  .catch((e) => {
    console.error("seed-course-extras failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
