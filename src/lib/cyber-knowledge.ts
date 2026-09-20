/**
 * GuardianX AI Course Architect — Cybersecurity Domain Knowledge Base.
 *
 * Single source of domain expertise injected into the architect agent's
 * system prompt (see /api/ai/course-architect). For every category the
 * platform teaches, this file carries: an expert summary, core topics,
 * the hands-on tool landscape, governing frameworks/standards,
 * representative lab patterns, aligned certifications and the career
 * roles the training feeds into.
 *
 * Category keys mirror the Course Studio CATEGORIES list, plus extra
 * domains the platform can grow into. Fallback: `resolveDomain` returns
 * a synthesised entry for unknown categories so the agent never has
 * zero context.
 */

export interface CyberDomainKnowledge {
  key: string
  name: string
  summary: string
  coreTopics: string[]
  tools: string[]
  frameworks: string[]
  labs: string[]
  certs: string[]
  roles: string[]
}

export const CYBER_DOMAINS: Record<string, CyberDomainKnowledge> = {
  "Ethical Hacking": {
    key: "Ethical Hacking",
    name: "Ethical Hacking & Offensive Security",
    summary:
      "Authorized offensive operations: reconnaissance, enumeration, exploitation, post-exploitation and reporting across networks, systems and applications. Modern programs map every technique to MITRE ATT&CK and emphasize scoped, lawful, evidence-driven testing with professional deliverables.",
    coreTopics: [
      "Reconnaissance: passive OSINT, certificate transparency, Google dorking, Shodan, theHarvester, Maltego",
      "Scanning & enumeration: Nmap (SYN/UDP/script scans), service/version fingerprinting, SNMP/SMTP/LDAP/SMB enumeration",
      "Vulnerability analysis: Nessus, OpenVAS, Nuclei, cvetools, CVSS v3.1/v4.0 scoring and prioritisation",
      "Exploitation with Metasploit Framework, manual exploitation, searchsploit, public exploit triage and safe modification",
      "Password attacks: Hashcat, John the Ripper, AS-REP roast/Kerberoast, relay attacks (ntlmrelayx), credential spraying controls",
      "Privilege escalation on Linux (SUID, capabilities, cron, PATH abuse) and Windows (Potato family, unquoted paths, token impersonation)",
      "Active Directory attack paths: BloodHound, Kerberoasting, DCSync, ACL abuse, constrained delegation, ADCS attacks",
      "Post-exploitation: pivoting (chisel, ligolo-ng, ssh tunnels), persistence, credential dumping (Mimikatz, lsass dumps), lateral movement",
      "Web & network pivots into exploitation: proxychains, port forwarding, SOCKS-aware tooling",
      "Wireless attacks: WPA2-Enterprise evil twin, Wifite, hostapd-mana, PMKID capture",
      "Reporting: executive summary, risk ratings, remediation guidance, evidence handling and retest criteria",
      "Legal & operational safety: rules of engagement, scoping, authorisation letters, safe-exploit verification",
    ],
    tools: ["Kali Linux", "Nmap", "Metasploit Framework", "Burp Suite", "Wireshark", "Hashcat", "John the Ripper", "BloodHound", "Mimikatz", "NetExec (CrackMapExec successor)", "sqlmap", "searchsploit", "Impacket toolkit", "Ligolo-ng"],
    frameworks: ["MITRE ATT&CK", "OWASP Testing Guide (WSTG)", "PTES (Penetration Testing Execution Standard)", "OSSTMM", "CVSS v3.1/v4.0"],
    labs: [
      "Full-scope internal network pentest on a multi-host lab: enumerate, exploit, pivot, escalate, dump domain credentials, write findings",
      "Kerberoast a service account, crack offline with Hashcat rules, abuse SPN access to reach DA in a tiered lab",
      "Buffer-overflow or command-injection exploitation on a deliberately vulnerable host, from crash to controlled shell",
      "Build a phishing-awareness lab with GoPhish in an isolated mail domain (defensive detection focus)",
    ],
    certs: ["CEH", "OSCP", "PNPT", "eJPT / eCPPT", "CRTP"],
    roles: ["Penetration Tester", "Red Team Operator", "Vulnerability Analyst", "Offensive Security Engineer"],
  },

  "Networking": {
    key: "Networking",
    name: "Networking & Network Defense",
    summary:
      "Protocol-level fluency as the foundation of security work: routing, switching, VPNs and traffic analysis, then defending the perimeter and internal segments with firewalls, IDS/IPS and segmentation designs.",
    coreTopics: [
      "TCP/IP internals: three-way handshake, windowing, TTL behaviors, MTU/fragmentation, IPv6 coexistence",
      "Subnetting and CIDR design, VLSM, route summarisation",
      "Routing protocols: OSPF areas, BGP path attributes, static routing, route filtering",
      "Switching: VLANs, trunking (802.1Q), STP/RSTP, port security, DHCP snooping, dynamic ARP inspection",
      "NAT/PAT, ACL design on perimeter and internal borders",
      "VPNs: IPsec (IKE phases, SAs), WireGuard, site-to-site vs remote access, split tunneling risks",
      "Firewall architectures: stateful inspection, NGFW app-aware policies, zones, rulebase hygiene",
      "IDS/IPS: Snort/Suricata rules, signature vs anomaly detection, tuning false positives",
      "Network monitoring: Wireshark deep dives, tcpdump, SPAN/TAP placement, NetFlow/sFlow baselining",
      "Network segmentation for security: DMZ design, micro-segmentation, jump hosts, out-of-band management",
      "Name resolution security: DNS filtering, DNSSEC, DoH/DoT implications",
      "Wireless fundamentals: 802.11 frames, WPA2/WPA3-Enterprise vs PSK, rogue AP detection",
    ],
    tools: ["Wireshark", "tcpdump", "Nmap", "pfSense/OPNsense", "Cisco IOS", "Suricata", "Snort", "Zeek", "PacketFence", "NetFlow analyzers"],
    frameworks: ["NIST CSF (PR.AC/PR.PT)", "CIS Controls v8 (Controls 4, 9, 12)", "ISO 27001 Annex A.8.20-8.22", "MITRE ATT&CK (Network-related techniques)"],
    labs: [
      "Design and build a three-zone lab (WAN / DMZ / LAN) in GNS3 or Containerlab with pfSense, then write and audit the rulebase",
      "Capture and dissect a full TCP session + a TLS handshake in Wireshark, documenting every field that matters for security analysis",
      "Write custom Suricata rules to detect a simulated C2 beacon and port scan, then tune out the false positives",
      "Segment a flat network with VLANs + firewall zones and validate with nmap from each segment",
    ],
    certs: ["CompTIA Network+", "CCNA", "NSE 4 (Fortinet)", "PCNSE", "CCNP Security"],
    roles: ["Network Security Engineer", "NOC/SOC Network Analyst", "Firewall Administrator", "Network Architect"],
  },

  "Web Security": {
    key: "Web Security",
    name: "Web & API Application Security",
    summary:
      "Breaking and securing web applications and APIs: injection classes, auth/session flaws, access-control failures, and modern API threats, always mapped to the OWASP Top 10 and API Top 10 with secure-coding countermeasures in the stack the course targets.",
    coreTopics: [
      "OWASP Top 10 (2021) walkthrough with real exploit + fix for every category",
      "Injection: SQLi (union, boolean-blind, time-based), NoSQL injection, OS command injection, template injection (SSTI)",
      "Authentication attacks: credential stuffing, brute-force controls, MFA fatigue, OAuth 2.0 flows (implicit pitfalls, PKCE), JWT pitfalls (alg=none, kid injection, weak secrets)",
      "Session management: cookies (SameSite/Secure/HttpOnly), session fixation, JWT storage tradeoffs, logout invalidation",
      "Broken access control: IDOR/BOLA hunting, privilege escalation (horizontal→vertical), mass assignment",
      "XSS in depth: reflected/stored/DOM, context-aware escaping, CSP design and bypass reasoning, mutation XSS",
      "CSRF & SameSite, clickjacking, CORS misconfiguration exploitation",
      "File upload & path traversal: content-type bypasses, polyglot files, ZIP-slip, null-byte history",
      "XXE, SSRF (incl. cloud metadata 169.254.169.254), and deserialization (Java/PHP/Python gadget chains)",
      "API security: BOLA/BOPLA on REST, GraphQL introspection/depth attacks/batching abuse, rate-limit design, mass assignment",
      "Business-logic abuse: race conditions, negative/overflow values, workflow bypass, price tampering",
      "Secure remediation: parameterized queries, output encoding libraries, framework protections (CSRF tokens, ORMs, auto-escaping), dependency & SCA management",
    ],
    tools: ["Burp Suite Professional", "OWASP ZAP", "sqlmap", "ffuf / feroxbuster", "Nuclei", "httpx", "Postman / Bruno", "Semgrep", "Trivy", "JWT toolkit (jwt-cli)", "Caido"],
    frameworks: ["OWASP Top 10", "OWASP API Security Top 10", "OWASP ASVS 4.x", "OWASP WSTG", "OWASP Cheat Sheet Series"],
    labs: [
      "Exploit a deliberately vulnerable app (DVWA/Juice Shop) end-to-end: SQLi to RCE to data exfiltration, then write the finding with remediation",
      "Hunt and chain IDOR + mass assignment on a mock REST API to take over another user's account, then fix it in code",
      "Attack and defend JWTs: forge with alg=none, crack HS256 secret, then rebuild the service with short-lived tokens + rotation",
      "GraphQL deep-dive: introspection, depth-limit bypass, BOLA across nested queries; implement field-level authz",
    ],
    certs: ["eWPTX", "OSWE", "GWAPT", "CEH (module coverage)", "Burp Suite Practitioner"],
    roles: ["Web Application Penetration Tester", "AppSec Engineer", "Product Security Analyst", "Secure Code Reviewer"],
  },

  "System Administration": {
    key: "System Administration",
    name: "Secure System Administration (Linux & Windows)",
    summary:
      "Hardened administration of the two enterprise OS families: identity, patching, logging, least-privilege and configuration baselines, with the security-specific view (CIS Benchmarks, auditd, Sysmon, LAPS) that turns sysadmin work into defensive security engineering.",
    coreTopics: [
      "Linux fundamentals for security: filesystem permissions, ACLs, capabilities, systemd units & sandboxing options",
      "User/group management, sudoers design, PAM stack, SSH hardening (keys, ciphers, bastion patterns)",
      "Linux auditing: auditd rules, journald retention, log shipping, file integrity with AIDE/Tripwire",
      "Linux hardening to CIS Benchmarks: kernel sysctls, umask, removing legacy services, exposing only required ports",
      "Windows internals for admins: registry hives, services, scheduled tasks, UAC, token model",
      "Active Directory administration: OUs, GPO design & security filtering, delegated permissions, tiered admin models",
      "Windows auditing & telemetry: Sysmon config, Event Forwarding, PowerShell ScriptBlock logging, LAPS/Windows LAPS",
      "Patch & vulnerability management cycles: WSUS/Intune basics, SCCM/MECM, reporting and exception handling",
      "Automation with Bash and PowerShell for hardening baselines at fleet scale",
      "Container & service hygiene on hosts: Docker daemon security, service account isolation",
      "Backup integrity: 3-2-1 rule, immutable/offline copies, restore testing (ransomware resilience)",
      "Endpoint protection: EDR agent management, application allowlisting (AppLocker/WDAC, fapolicyd)",
    ],
    tools: ["Bash", "PowerShell 7", "Ansible", "auditd", "Sysmon", "CIS-CAT", "OpenSCAP", "Windows Admin Center", "Group Policy", "Lynis", "Docker", "WSL"],
    frameworks: ["CIS Benchmarks", "NIST SP 800-53 (CM/AC families)", "ISO 27001 Annex A.8.9", "CIS Controls v8 (Controls 4, 5, 7, 13)"],
    labs: [
      "Take a vulnerable Ubuntu VM from default install to CIS Level 1 compliant, scripted with Ansible, diffing scan output before/after",
      "Deploy Sysmon with a SwiftOnSecurity-style config on a Windows lab VM and map the telemetry to MITRE techniques",
      "Build a tiered AD admin model in a lab forest: separate admin accounts, GPOs for logon restrictions, LAPS rotation",
      "Write auditd rules to detect a simulated backdoor (new SUID binary + cron) and alert via a forwarded log pipeline",
    ],
    certs: ["RHCSA/RHCE", "CompTIA Linux+", "Microsoft AZ-104/AZ-800", "LPIC-1/2"],
    roles: ["System Administrator (Security-focused)", "Infrastructure Security Engineer", "Endpoint Engineer", "AD/Identity Administrator"],
  },

  "Security Management": {
    key: "Security Management",
    name: "Security Management, Governance, Risk & Compliance (GRC)",
    summary:
      "Running security as a business function: ISMS design, risk assessment and treatment, control frameworks, audit evidence and regulatory mapping (ISO 27001, SOC 2, GDPR, PCI DSS, NIST). Emphasis on pragmatic programs: policy hierarchies, risk registers, metrics and audit-readiness.",
    coreTopics: [
      "ISMS fundamentals: scope, context, leadership commitment, the Plan-Do-Check-Act cycle",
      "Risk management: asset inventory, threat/likelihood/impact modeling, risk matrices, treatment options (modify/retain/avoid/share), statements of applicability",
      "Policy architecture: tiered policies→standards→procedures, writing enforceable policy, exceptions process",
      "ISO 27001:2022 clause-by-clause + Annex A control themes, certification audit stages (stage 1 vs stage 2)",
      "SOC 2 Trust Services Criteria and the audit evidence lifecycle (policies, access reviews, change tickets)",
      "NIST CSF 2.0 functions (Govern/Identify/Protect/Detect/Respond/Recover) and SP 800-53 control mapping",
      "Regulatory landscape: GDPR (data mapping, DPIA, breach notification 72h), PCI DSS v4 scope and SAQ paths, DPDP Act (India) obligations",
      "Third-party risk: vendor tiering, due diligence questionnaires, contract security schedules, continuous monitoring",
      "Security awareness & human risk: program design, phishing simulation metrics, culture measurement",
      "Business continuity & disaster recovery: BIA, RTO/RPO, ISO 22301 alignment, tabletop exercise design",
      "Metrics & board reporting: KRI/KPI design, maturity scoring (CMMI-style), budget narrative",
      "Audit management: evidence collection systems, control testing samples, remediation tracking",
    ],
    tools: ["Excel/Sheets (risk registers)", "Vanta / Drata (compliance automation)", "ServiceNow GRC", "Jira (remediation tracking)", "Confluence/Notion (policy wikis)", "OneTrust", "OpenRMF / SimpleRisk"],
    frameworks: ["ISO/IEC 27001:2022 + 27002", "SOC 2 (TSC)", "NIST CSF 2.0", "NIST SP 800-53 Rev 5", "PCI DSS v4.0", "GDPR", "DPDP Act 2023"],
    labs: [
      "Build a complete mini-ISMS for a fictional SaaS: scope statement, asset register, risk register with 10+ assessed risks, and SoA",
      "Perform a gap assessment of a case-study company against ISO 27001 Annex A and produce a prioritised remediation roadmap",
      "Run a tabletop: ransomware destroys primary DC — walk BIA→RTO/RPO→comms plan→lessons-learned artifact",
      "Draft the evidence pack for one SOC 2 criterion (access reviews): sampling logic, screenshots, tickets, retention",
    ],
    certs: ["ISO 27001 Lead Implementer / Lead Auditor", "CISSP", "CISM", "CRISC", "CISA"],
    roles: ["GRC Analyst", "Compliance Manager", "ISMS Manager", "Risk Manager", "Internal IT Auditor"],
  },

  "Identity & Access": {
    key: "Identity & Access",
    name: "Identity & Access Management (IAM)",
    summary:
      "Identity as the new perimeter: directory services, SSO, federation, MFA, privileged access and identity governance — with attack perspective (kerberoasting, token theft, MFA fatigue) because IAM is both the control plane and the top breach vector.",
    coreTopics: [
      "Identity lifecycle: joiner-mover-leaver, authoritative sources, provisioning/deprovisioning automation",
      "Authentication primitives: passwords→passwordless (FIDO2/WebAuthn, passkeys), OTP (TOTP vs HOTP), push MFA and its fatigue/push-bombing risks",
      "Directory services: Active Directory internals (Kerberos, NTLM, LDAP, GPO), Entra ID (Azure AD) architecture, hybrid identity with Entra Connect",
      "SSO & federation: SAML 2.0 flows & XML signature pitfalls, OAuth 2.0 + OIDC (codes, PKCE, tokens), SCIM provisioning",
      "Authorization models: RBAC, ABAC, ReBAC; least privilege and segregation of duties",
      "Privileged Access Management (PAM): vaulting, just-in-time access, session recording, break-glass accounts",
      "Identity governance: access reviews/certifications, role mining, orphaned account hygiene",
      "Identity attacks: password spray, Kerberoast/AS-REP, Golden/Silver ticket, AiTM phishing (Evilginx-class), token theft & replay, consent phishing",
      "Conditional access & Zero Trust: risk-based policies, device compliance signals, continuous access evaluation",
      "CIAM concerns: credential stuffing defense, account recovery abuse, bot defense on signup/login",
      "Non-human identity: service accounts, workload identities, secrets rotation, OIDC federation for CI/CD",
      "IAM metrics: MFA coverage, privileged account ratio, orphan count, review completion",
    ],
    tools: ["Entra ID", "Active Directory", "Okta", "Keycloak", "FreeIPA", "CyberArk / HashiCorp Vault", "BloodHound", "PingFederate", "Duo", "YubiKey / FIDO2 keys"],
    frameworks: ["NIST SP 800-63B (Digital Identity Guidelines)", "Zero Trust Architecture (NIST SP 800-207)", "CIS Controls v8 Control 5-6", "ISO 27001 Annex A.5.15-5.18"],
    labs: [
      "Stand up Keycloak with SAML + OIDC apps, then attack your own SAML assertion (signature wrapping) and fix it",
      "Build a hybrid AD lab: kerberoast a weak service account, detect it via 4769 auditing, remediate with gMSA",
      "Design conditional-access policies for a fictional company: baseline MFA, risk-based step-up, legacy-auth block, then test with What If",
      "Implement passwordless FIDO2 login on a demo app and document the phishing-resistance argument vs OTP",
    ],
    certs: ["Certified Identity and Access Manager", "Okta Certified Professional", "Microsoft SC-300", "CIAM (IDPro)", "CRTP"],
    roles: ["IAM Engineer", "IAM Analyst", "Identity Architect", "Access Governance Analyst"],
  },

  "Cloud Security": {
    key: "Cloud Security",
    name: "Cloud Security (AWS, Azure & GCP)",
    summary:
      "Securing cloud estates under the shared responsibility model: identity and key management, network architecture, workload hardening, CSPM, and the attack paths unique to cloud (metadata SSRF, public buckets, over-privileged roles). Multi-cloud with AWS depth and Azure/GCP mapping.",
    coreTopics: [
      "Shared responsibility in practice: what breaks when teams assume the provider covers it",
      "AWS identity deep-dive: IAM users vs roles vs STS, policy evaluation logic (explicit deny, SCPs, permission boundaries, identity vs resource policies)",
      "Credential hygiene: access-key governance, OIDC federation for CI/CD instead of long-lived keys, secrets in Secrets Manager/KMS",
      "Cloud network security: VPC design, security groups vs NACLs, PrivateLink/VPC endpoints, flow logs, egress control",
      "Storage exposure: S3 bucket policies & ACLs, Block Public Access, encryption options (SSE-S3/KMS/DSSE), presigned URL risks; Azure Blob/GCP equivalents",
      "Metadata service attacks: SSRF→IMDSv2 role theft, GuardDuty exfil patterns, mitigation via IMDSv2 enforcement",
      "Detection & response in cloud: CloudTrail, GuardDuty, Security Hub, Detective; Azure Sentinel/Defender for Cloud; GCP SCC",
      "CSPM/CNAPP: misclass pipelines, IaC scanning (tfsec/Checkov), drift and remediation workflows",
      "Workload security: EC2/VM hardening, EKS/GKE/AKS security contexts, pod identity, admission control",
      "Serverless & data security: Lambda/IAM passrole risks, KMS key policies and grants, data classification & tokenization",
      "Cloud-native DDoS/WAF: CloudFront + WAF, Shield, rate-based rules, bot control",
      "Architecture patterns: multi-account landing zones, AWS Organizations SCPs, Azure management groups, hub-spoke",
    ],
    tools: ["AWS (IAM, KMS, GuardDuty, CloudTrail, Security Hub)", "Prowler", "ScoutSuite", "CloudSploit", "Checkov", "tfsec", "Azure Policy / Defender for Cloud", "GCP Security Command Center", "Pacu", "Steampipe"],
    frameworks: ["AWS Well-Architected Security Pillar", "CIS Benchmarks (AWS/Azure/GCP Foundations)", "NIST SP 800-210", "CSA CCM", "MITRE ATT&CK Cloud matrix"],
    labs: [
      "Build a deliberately misconfigured AWS sandbox (public S3, wildcards, IMDSv1) then find and fix with Prowler + ScoutSuite reports",
      "Simulate SSRF→metadata role theft in a lab VPC, show GuardDuty finding, remediate with IMDSv2 + tightened role",
      "Ship Terraform with 10 seeded issues, gate the pipeline with Checkov, then refactor to a clean plan",
      "Design a multi-account landing zone skeleton with SCP guardrails (region deny, root MFA enforce, CMK rotation)",
    ],
    certs: ["AWS Certified Security – Specialty", "AZ-500", "CCSP", "CCSK", "GCP Professional Cloud Security Engineer"],
    roles: ["Cloud Security Engineer", "Cloud Security Architect", "DevSecOps Engineer (Cloud)", "CSPM Analyst"],
  },

  "DevSecOps": {
    key: "DevSecOps",
    name: "DevSecOps & Supply Chain Security",
    summary:
      "Shifting security into the software delivery pipeline: secure CI/CD, IaC and container hardening, dependency and artifact integrity (SLSA, SBOM), secret management, and policy-as-code gates that fail fast without breaking developer flow.",
    coreTopics: [
      "Secure SDLC models and control placement: pre-commit, build, deploy, runtime",
      "CI/CD security: GitHub Actions/GitLab CI attack surface (pwn requests, runner isolation, OIDC federation instead of PATs), branch protection, provenance",
      "SAST/DAST/SCA in pipelines: Semgrep/CodeQL, DAST against ephemeral envs, dependency review, license compliance",
      "SBOM & artifact integrity: CycloneDX/SPDX, Sigstore cosign signing + verification admission, SLSA build levels",
      "Secrets management: detection (gitleaks/trufflehog), vaulting (Vault/cloud secret managers), rotation, short-lived credentials",
      "Container security: image minimalism (distroless), Dockerfile lints, image scanning (Trivy/Grype), registry hardening",
      "Kubernetes security: RBAC, Pod Security Standards, NetworkPolicies, admission controllers (Kyverno/OPA Gatekeeper), runtime (Falco)",
      "Infrastructure-as-Code security: Terraform/CloudFormation scanning and plan-time policies (Sentinel/OPA)",
      "Policy-as-code & gates: writing Org policies, severity tiers, exception workflow with expiry, developer experience tuning",
      "Runtime defense & drift: Falco rules, drift detection, immutable infrastructure patterns",
      "Threat modeling for pipelines: STRIDE on the build system itself, protecting the release path",
      "Metrics: change-failure rate vs security findings MTTR, coverage of repos in gating, escape-rate of critical vulns to prod",
    ],
    tools: ["GitHub Actions", "GitLab CI", "Jenkins", "Semgrep", "CodeQL", "Trivy", "Grype/Syft", "Cosign (Sigstore)", "HashiCorp Vault", "Gitleaks", "Checkov/tfsec", "Kyverno", "OPA/Gatekeeper", "Falco"],
    frameworks: ["SLSA v1.0", "NIST SP 800-218 (SSDF)", "CIS Software Supply Chain Security Guide", "OWASP DevSecOps Guideline", "CIS Controls v8 Control 16"],
    labs: [
      "Take a vulnerable repo from zero to gated pipeline: SAST + SCA + secret scan + signed image, with a policy dashboard",
      "Exploit a classic 'pwn request' on a forked Actions repo, then fix with OIDC + environment protection + workflow pinning",
      "Build a Kyverno policy pack: verify image signatures, block latest tags, require resource limits — then test bypass attempts",
      "Create a Falco rule to alert on a reverse shell inside a pod and route it to a Slack/ PagerDuty channel in the lab",
    ],
    certs: ["Certified DevSecOps Professional", "CKS (Certified Kubernetes Security Specialist)", "GitHub Advanced Security", "CSSLP"],
    roles: ["DevSecOps Engineer", "Platform Security Engineer", "Application Security Engineer (Pipeline)", "Supply Chain Security Analyst"],
  },

  "Incident Response": {
    key: "Incident Response",
    name: "Incident Response & SOC Operations",
    summary:
      "Detection-to-recovery operations: alert triage, investigation with SIEM/EDR telemetry, containment strategy, eradication and evidence-preserving recovery, run inside a repeatable IR process (NIST 800-61 / SANS PICERL) with tabletop-grade communication drills.",
    coreTopics: [
      "IR lifecycle: preparation, detection & analysis, containment/eradication/recovery, post-incident activity (NIST 800-61 + SANS PICERL)",
      "SOC tiering and triage: alert quality, severity matrix, escalation paths, shift handovers",
      "SIEM engineering: log source onboarding, parsing/normalisation, correlation rules, use-case backlog, tuning noise",
      "EDR investigation: process trees, persistence locations (run keys, services, WMI subs, scheduled tasks), living-off-the-land triage",
      "Phishing incident handling: header analysis, URL detonation safety, tenant-wide purge, user communication",
      "Malware triage basics: static triage (hashes, strings, imports), sandbox detonation, C2 extraction, IoC authoring",
      "Beacon hunting: KQL/SPL hunts for periodicity, odd user agents, DNS patterns, impossible travel",
      "Containment strategy: isolate vs monitor tradeoffs, host isolation, identity lockdown, network blocklists, kill-sessions",
      "Eradication & recovery: rebuild vs clean tradeoffs, credential reset waves, validation scanning, monitoring intensification",
      "Digital evidence & chain of custody: volatile data order of volatility, imaging, hash verification, legal hold",
      "Communication: severity-based comms plan, exec/legal/PR interfaces, regulator notification clocks (GDPR 72h, SEBI, RBI)",
      "Metrics & maturity: MTTD/MTTR, incident rate by category, purple-team validation of detections",
    ],
    tools: ["Splunk", "Microsoft Sentinel", "Elastic Security", "KQL", "Velociraptor", "KAPE", "TheHive / DFIR-IRIS", "MISP", "VirusTotal", "Any.Run / CAPE sandbox", "Wireshark", "Sysmon"],
    frameworks: ["NIST SP 800-61r2", "SANS PICERL", "MITRE ATT&CK (Detection & Response mapping)", "CIS Controls v8 Controls 8 & 17"],
    labs: [
      "Blue-team a simulated intrusion VM: triage Sysmon+auth logs, reconstruct the attack timeline, produce an IR report with IoCs",
      "Write 5 KQL/SPL detection rules for ATT&CK techniques (T1059, T1053, T1003, T1021, T1071) and validate with atomic red team",
      "Run a phishing response: analyze a live-style campaign sample, detonate safely, purge across a test tenant, close with comms artifacts",
      "Tabletop: business-email-compromise leads to fraudulent payment — decide containment, recovery, legal notification steps under time pressure",
    ],
    certs: ["GCIA", "GCIH", "CySA+", "BTL1", "E_CIrt"],
    roles: ["SOC Analyst (Tier 1/2)", "Incident Responder", "Detection Engineer", "Threat Hunter"],
  },

  "Digital Forensics": {
    key: "Digital Forensics",
    name: "Digital Forensics (DFIR)",
    summary:
      "Court-ready investigation: acquisition that preserves evidence, filesystem and memory analysis, artifact correlation (registry, browser, event logs), timeline building and reporting that stands up to legal scrutiny.",
    coreTopics: [
      "Evidence handling: order of volatility, write blockers, imaging (E01/AFF4), hashing and chain-of-custody documentation",
      "Disk forensics: partition structures, NTFS/EXT4 internals ($MFT, USN journal, inodes, superblocks), deleted-file recovery, carving",
      "Windows artifacts: registry hives (SAM, SYSTEM, SOFTWARE, NTUSER), shimcache, amcache, prefetch, shellbags, LNK files, jump lists",
      "Memory forensics: acquisition, Volatility 3 plugins (pslist vs psscan for hidden processes, malfind, netscan), hibernation files",
      "Browser & cloud artifacts: history databases, sync evidence, webcache, email headers and server logs",
      "Log forensics: Windows Event Log analysis, security 4624/4625/4672/4720 workflows, Linux auth.log/auditd, log tampering indicators",
      "Timeline building: plaso/log2timeline super-timelines, artifact correlation across sources, timestomping detection ($FN vs $SI)",
      "Mobile forensics overview: logical vs physical acquisition, iOS/Android key artifacts",
      "Network forensics: PCAP analysis, flow records, DNS tunneling detection, TLS fingerprint context",
      "Anti-forensics: encryption, wiping patterns, timestomping, alternate data streams — and counter-techniques",
      "Reporting: findings tied to artifacts, confidence levels, reproducibility, expert-witness basics",
    ],
    tools: ["Autopsy", "FTK Imager", "Volatility 3", "KAPE", "Plaso/log2timeline", "Timeline Explorer", "Registry Explorer", "Sleuth Kit", "X-Ways (overview)", "Cellebrite (overview)"],
    frameworks: ["NIST SP 800-86", "ISO/IEC 27037", "ACPO Principles of Digital Evidence", "SANS SIFT workflow"],
    labs: [
      "Image a compromised Windows VM, build a super-timeline with Plaso, and reconstruct the full intrusion story with timestamps",
      "Run Volatility 3 on a memory dump: find a hidden process, extract its network connections and injected code region",
      "Recover a deleted file from an NTFS image and prove its prior existence via MFT + USN journal evidence",
      "Detect timestomping on a planted binary by comparing $SI/$FN timestamps and prefetch vs shimcache evidence",
    ],
    certs: ["GCFE", "GCFA", "CFCE", "CHFI"],
    roles: ["Digital Forensic Analyst", "DFIR Consultant", "Forensic Technician (Law Enforcement)", "eDiscovery Analyst"],
  },

  "Malware Analysis": {
    key: "Malware Analysis",
    name: "Malware Analysis & Reverse Engineering",
    summary:
      "From triage to deep RE: safely detonating samples, static analysis, disassembly and decompilation, unpacking, behavior analysis and IoC/YARA authoring — turning malware into detections and threat intel.",
    coreTopics: [
      "Safe lab design: isolated VMs, snapshots, INetSim/FakeNet, no production leakage, malware opsec",
      "Triage workflow: hashes, fuzzy hashing (ssdeep/tlsh), packer/capability detection (DIE, CAPA), strings/imports triage",
      "Dynamic analysis: process/registry/file/network monitoring (Procmon, API Monitor), sandbox automation vs manual",
      "PE format internals: headers, sections, imports/exports, resources, TLS callbacks, signaturization",
      "x86/x64 assembly reading fluency: calling conventions, stack frames, common constructs",
      "Disassembly & decompilation with Ghidra/IDA: function identification, cross-references, data vs code, decompiler pitfalls",
      "Unpacking & deobfuscation: UPX and custom packers, OEP finding, dumping + imports reconstruction, script deobfuscation (PowerShell/JS/VBA)",
      "C2 protocol analysis: beacon structure extraction, config dumping (e.g. Emotet-class), traffic decryption with captured keys",
      "Document malware: macro analysis, DDE/remote template techniques, shellcode extraction from RTF/PDF",
      "YARA rule authoring: from strings to structural rules, performance, testing against corpora, avoiding false positives",
      "Rootkit concepts: userland hooks, SSDT, DKOM (conceptual + usermode detection), detection via cross-view",
      "Reporting: capability matrix, ATT&CK mapping, IoC package, detection engineering handoff",
    ],
    tools: ["Ghidra", "IDA Free", "x64dbg", "Procmon", "Process Hacker", "CAPA", "Detect It Easy", "PE-bear", "YARA", "INetSim", "FakeNet-NG", "Wireshark", "Any.Run / CAPE", "FLOSS"],
    frameworks: ["MITRE ATT&CK (Software entries)", "MAEC (overview)", "CybOX/Stix for IoC sharing"],
    labs: [
      "Triage a real-world-style RAT sample: static → sandbox → manual dynamic, produce a full capability report + IoCs",
      "Manually unpack a UPX/custom-packed binary in x64dbg, dump at OEP, rebuild imports with Scylla",
      "Reverse a C2 config extractor for a known family in Ghidra, then write a YARA rule that catches all variants in the test corpus",
      "Analyze a malicious macro document: deobfuscate the VBA, extract the shellcode, trace it to the final payload",
    ],
    certs: ["GREM", "GCTI", "Malware Analysis certifications (eLearnSecurity/McAfee Institute)"],
    roles: ["Malware Analyst", "Reverse Engineer", "Threat Intelligence Analyst", "Detection Engineer"],
  },

  "Threat Intelligence": {
    key: "Threat Intelligence",
    name: "Threat Intelligence & Threat Hunting",
    summary:
      "Producing and consuming intel that changes defensive outcomes: collection, enrichment, ATT&CK-mapped analysis, strategic vs tactical products, and hypothesis-driven hunts across telemetry.",
    coreTopics: [
      "Intel lifecycle: planning & direction, collection, processing, analysis, dissemination, feedback",
      "Strategic vs operational vs tactical intel: audiences, products, cadence",
      "IoC management: indicators of attack vs compromise, confidence scoring, aging/expiry, sharing (MISP, STIX/TAXII)",
      "APT landscape: naming issues (who-is-who), notable actors and their TTP evolution, sector/geo targeting",
      "ATT&CK-based analysis: mapping campaigns, heatmaps, detection gaps, navigator layers",
      "OSINT collection: infrastructure pivoting (certs, WHOIS, passive DNS), Shodan/Census, tracking C2 infrastructure",
      "Analyst tradecraft: structured analytic techniques (ACH, analysis of competing hypotheses), bias control, confidence language (Admiralty/words of estimative probability)",
      "Attribution: technical vs political attribution, why it's hard, what to claim and when",
      "Threat hunting: hypothesis types (ATT&CK-based, intel-based, anomaly-based), hunt matrices, PEAK framework",
      "Hunting data skills: KQL/SPL/SQL at intermediate fluency, statistical baselines, outlier investigation discipline",
      "Intel-driven detection engineering: turning reports into detections with validation (atomic red team)",
      "Reporting: flash reports, campaign trackers, exec risk briefs tied to business sectors",
    ],
    tools: ["MISP", "OpenCTI", "STIX/TAXII", "VirusTotal", "Shodan", "Censys", "Maltego", "Jupyter (pandas for hunts)", "MITRE ATT&CK Navigator", "Sigma", " Recorded Future (overview)"],
    frameworks: ["MITRE ATT&CK", "Diamond Model", "Kill Chain (Cyber Kill Chain)", "Admiralty Code", "PEAK Hunting Framework"],
    labs: [
      "Stand up MISP, ingest a public feed, enrich and triage 50 IoCs into actionable vs noise, share via TAXII to a lab SIEM",
      "Track one APT campaign across OSINT sources and produce a campaign report: TTPs, infra, detections, confidence levels",
      "Run an ATT&CK-driven hunt: pick T1053.005, write KQL/SPL queries over lab telemetry, document findings in a hunt record",
      "Convert a vendor threat report into 3 Sigma rules + ATT&CK Navigator layer, validate with atomic tests",
    ],
    certs: ["GCTI", "CTIA", "TH-TIP / threat hunting certs", "GCFA (adjacent)"],
    roles: ["Threat Intelligence Analyst", "Threat Hunter", "CTI Engineer", "Intel-Driven Detection Engineer"],
  },

  "General": {
    key: "General",
    name: "Cybersecurity Foundations",
    summary:
      "The security canon every specialist needs: the CIA triad and beyond, core control families, crypto basics, network/app/cloud exposure surfaces, and how attackers and defenders operate — the vocabulary on which every GuardianX course builds.",
    coreTopics: [
      "Security principles: CIA triad, AAA, least privilege, defense in depth, separation of duties, keep-it-simple",
      "Threat landscape: malware classes, phishing/social engineering, insider risk, supply chain, the modern breach lifecycle",
      "Cryptography essentials: symmetric vs asymmetric, hashing & integrity, TLS mechanics at a conceptual level, PKI & certificates, common failure modes",
      "Networking for security: TCP/IP fluency, common services and their abuse, segmentation, VPNs, wireless basics",
      "Operating system security: permissions models, logging sources, hardening concepts on Windows & Linux",
      "Web & application exposure: OWASP Top 10 orientation, secure development basics, database security concepts",
      "Cloud & virtualization: shared responsibility, identity in the cloud, storage exposure, monitoring sources",
      "Identity & access: authentication factors, MFA, SSO concepts, authorization models, privileged access",
      "Defensive operations: SOC/SIEM/EDR concepts, incident response lifecycle overview, backups & recovery",
      "Governance: risk management basics, policy vs standard vs procedure, major frameworks at awareness level (NIST CSF, ISO 27001, CIS Controls)",
      "Security tooling landscape: firewalls, antivirus vs EDR, vulnerability scanners, password managers, VPNs",
      "Career & practice: security roles map, home lab building blocks, bug bounty/CTF culture, continuous learning paths",
    ],
    tools: ["VirtualBox/VMware", "Kali Linux (tour)", "Wireshark", "Nmap", "TryHackMe/HackTheBox (platforms)", "VeraCrypt", "Password managers (Bitwarden)", "OpenSSL CLI"],
    frameworks: ["NIST Cybersecurity Framework", "CIS Controls v8 (Implementation Group 1 view)", "ISO/IEC 27001 awareness", "MITRE ATT&CK awareness"],
    labs: [
      "Build a home lab: hypervisor + Kali + Metasploitable/VulnHub VM, then run first recon scans and document findings",
      "Analyze a TLS handshake in Wireshark and explain every message in plain language, including where secrets live",
      "Break and fix: exploit a weak-password scenario, then implement the compensating controls (lockout, MFA, hashing parameters)",
      "Map a small business case study to CIS Controls IG1: pick 10 controls, justify each with threat scenarios",
    ],
    certs: ["CompTIA Security+", "ISC2 CC", "CEH (entry track)", "SSCP"],
    roles: ["IT Support with Security Duties", "Junior Security Analyst", "Security Awareness Champion", "Pathway to SOC/IAM/AppSec tracks"],
  },

  "Cryptography": {
    key: "Cryptography",
    name: "Applied Cryptography & PKI",
    summary:
      "Crypto that engineers can reason about: primitives, protocol construction, PKI operations, and the failure classes (padding oracles, nonce reuse, misconfigured TLS) seen in real breaches — implementation-aware, not math-paper-deep.",
    coreTopics: [
      "Symmetric primitives: AES modes (GCM vs CBC vs ECB failures), ChaCha20, block vs stream tradeoffs",
      "Hashing & integrity: SHA-2/3, HMAC, length-extension attacks, password storage (Argon2/bcrypt/scrypt parameters)",
      "Asymmetric crypto: RSA, ECC (X25519, Ed25519), key sizes and agility, hybrid encryption envelopes",
      "Randomness: CSPRNG requirements, nonce/IV discipline, famous failures (nonce reuse in GCM, Debian entropy bug)",
      "TLS in depth: handshake (TLS 1.2 vs 1.3), certificate chain validation, cipher suite selection, mTLS",
      "PKI operations: CA hierarchy, cert issuance/ACME, revocation (CRL/OCSP/OCSP stapling), certificate pinning tradeoffs",
      "Protocol construction: AEAD, key derivation (HKDF), key rotation, envelope encryption, token formats (PASETO vs JWT crypto)",
      "Applied failure classes: padding oracles, BEAST/Lucky13 history, downgrade attacks, JWT alg confusion, ECB penguins",
      "Storage & transit design: at-rest encryption layers, KMS/edge termination tradeoffs, key escrow and rotation practice",
      "Emerging exposure: post-quantum landscape (ML-KEM overview), crypto-agility planning",
      "Compliance view: FIPS 140-3, PCI DSS crypto requirements, key management policy",
      "Hands-on crypto engineering: OpenSSL/libraries, never-roll-your-own rules, crypto code review checklist",
    ],
    tools: ["OpenSSL", "Wireshark (TLS dissection)", "hashcat (crypto attacks)", "CyberChef", "SageMath (optional math)", "KMS consoles (AWS/HashiCorp Vault)", "testssl.sh", "sslyze"],
    frameworks: ["NIST FIPS 197/198/140-3", "NIST SP 800-57 (Key Management)", "CA/Browser Forum Baseline Requirements", "RFC 8446 (TLS 1.3)"],
    labs: [
      "Demonstrate ECB's structure leakage and GCM's nonce-reuse catastrophe on crafted inputs, then write the safe configuration",
      "Perform a padding-oracle attack against a deliberately vulnerable service, then fix it with AEAD and constant-time comparison",
      "Run a full PKI mini-lab: offline root, issuing intermediate, ACME issuance, revocation test, and document the CRL/OCSP behavior",
      "Audit a TLS deployment with testssl.sh/sslyze, remediate every finding (protocol, ciphers, chain, OCSP), re-scan clean",
    ],
    certs: ["CompTIA Security+ (crypto domain)", "CSSLP", "CISSP (domain 3 depth)", "Crypto engineering specializations"],
    roles: ["Security Engineer (Applied Crypto)", "PKI Administrator", "AppSec Engineer (Crypto focus)", "Protocol Implementation Reviewer"],
  },
}

/**
 * Extra domains reachable through free-text categories that are not in
 * the Course Studio CATEGORIES list but appear in the wild.
 */
export const EXTRA_DOMAIN_KEYS = [
  "Digital Forensics",
  "Malware Analysis",
  "Threat Intelligence",
  "Cryptography",
] as const

/** Never-fail domain resolution — unknown categories get a synthesised entry. */
export function resolveDomain(category: string | null | undefined): CyberDomainKnowledge {
  const key = (category || "").trim()
  if (key && CYBER_DOMAINS[key]) return CYBER_DOMAINS[key]

  // Fuzzy match: "Cloud  security", "cloud-security", etc.
  const normalized = key.toLowerCase().replace(/[^a-z]/g, "")
  for (const d of Object.values(CYBER_DOMAINS)) {
    if (d.name.toLowerCase().replace(/[^a-z]/g, "").includes(normalized) && normalized.length > 3) {
      return d
    }
  }

  return {
    key: key || "General",
    name: key ? `${key} (Cybersecurity Domain)` : "Cybersecurity Foundations",
    summary:
      "A specialised cybersecurity domain. Apply universal security engineering principles: threat modeling, least privilege, defense in depth, hands-on labs, framework mapping (MITRE ATT&CK, NIST CSF, CIS Controls) and industry certification alignment.",
    coreTopics: [
      "Domain fundamentals and the threat landscape specific to this domain",
      "Core defensive controls and hardening baselines",
      "Hands-on tooling and operational workflows professionals use daily",
      "Common attack techniques mapped to MITRE ATT&CK where applicable",
      "Detection, monitoring and incident considerations",
      "Architecture patterns and secure design principles",
      "Compliance and framework obligations relevant to the domain",
      "Career applications and adjacent skill areas",
    ],
    tools: ["Domain-standard tooling", "Open-source security tools", "Vendor consoles relevant to the domain"],
    frameworks: ["MITRE ATT&CK", "NIST CSF", "CIS Controls v8", "ISO/IEC 27001"],
    labs: [
      "Build a safe isolated lab environment representing the domain's core technology",
      "Execute a guided hands-on scenario that mirrors a real operational task",
      "Break a deliberately weak configuration, then remediate and verify",
    ],
    certs: ["Relevant vendor and industry certifications for this domain"],
    roles: ["Security Engineer", "Security Analyst", "Domain Specialist"],
  }
}

/** Short taxonomy blurb used in the agent system prompt. */
export function domainKnowledgeBlock(category: string | null | undefined): string {
  const d = resolveDomain(category)
  const list = (arr: string[]) => arr.map((x) => `  - ${x}`).join("\n")
  return `DOMAIN EXPERTISE — ${d.name}
${d.summary}

Core topics you teach fluently in this domain:
${list(d.coreTopics)}

Tool landscape: ${d.tools.join(", ")}
Frameworks/standards to reference: ${d.frameworks.join(", ")}
Representative lab patterns: ${d.labs.map((l) => `(${l})`).join(" ")}
Aligned certifications: ${d.certs.join(", ")}
Career roles this domain feeds: ${d.roles.join(", ")}`
}

/** Compact list of all domains the architect can draw from (for prompts). */
export function domainCatalog(): string {
  return Object.values(CYBER_DOMAINS)
    .map((d) => `- ${d.name}`)
    .join("\n")
}
