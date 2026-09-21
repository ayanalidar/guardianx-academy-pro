/**
 * GuardianX AI Course Architect - Cybersecurity Domain Knowledge Base.
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
      "Run a tabletop: ransomware destroys primary DC - walk BIA→RTO/RPO→comms plan→lessons-learned artifact",
      "Draft the evidence pack for one SOC 2 criterion (access reviews): sampling logic, screenshots, tickets, retention",
    ],
    certs: ["ISO 27001 Lead Implementer / Lead Auditor", "CISSP", "CISM", "CRISC", "CISA"],
    roles: ["GRC Analyst", "Compliance Manager", "ISMS Manager", "Risk Manager", "Internal IT Auditor"],
  },

  "Identity & Access": {
    key: "Identity & Access",
    name: "Identity & Access Management (IAM)",
    summary:
      "Identity as the new perimeter: directory services, SSO, federation, MFA, privileged access and identity governance - with attack perspective (kerberoasting, token theft, MFA fatigue) because IAM is both the control plane and the top breach vector.",
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
    certs: ["AWS Certified Security-Specialty", "AZ-500", "CCSP", "CCSK", "GCP Professional Cloud Security Engineer"],
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
      "Build a Kyverno policy pack: verify image signatures, block latest tags, require resource limits - then test bypass attempts",
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
      "Tabletop: business-email-compromise leads to fraudulent payment - decide containment, recovery, legal notification steps under time pressure",
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
      "Anti-forensics: encryption, wiping patterns, timestomping, alternate data streams - and counter-techniques",
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
      "From triage to deep RE: safely detonating samples, static analysis, disassembly and decompilation, unpacking, behavior analysis and IoC/YARA authoring - turning malware into detections and threat intel.",
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
      "The security canon every specialist needs: the CIA triad and beyond, core control families, crypto basics, network/app/cloud exposure surfaces, and how attackers and defenders operate - the vocabulary on which every GuardianX course builds.",
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
      "Crypto that engineers can reason about: primitives, protocol construction, PKI operations, and the failure classes (padding oracles, nonce reuse, misconfigured TLS) seen in real breaches - implementation-aware, not math-paper-deep.",
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

  "Mobile Security": {
    key: "Mobile Security",
    name: "Mobile Application & Device Security",
    summary:
      "Securing Android and iOS platforms across the full stack: application binaries, transport, storage, platform services and the enterprise device fleet (MDM/MTD). Modern mobile work maps OWASP MASVS/MASTG, reverse-engineers app binaries with objection/Frida, hardens device fleets and treats mobile malware as a first-class threat.",
    coreTopics: [
      "Platform security architecture: Android sandbox/SELinux/keystore vs iOS sandbox/Secure Enclave/Keychain",
      "OWASP MASVS/MASTG methodology: static (MASVS-RESILIENCE) and dynamic analysis of mobile apps",
      "Reverse engineering: apktool/jadx bytecode decompilation, class dumps, Hopper/Ghidra on native libs",
      "Runtime instrumentation: Frida hooks, objection patching, SSL-pinning bypass, root/jailbreak detection evasion",
      "Insecure data storage: shared preferences, SQLite dumps, Keychain/Keystore misuse, logs leaking PII",
      "Mobile network attack surface: certificate pinning, MITM with mitmproxy on device traffic, API abuse",
      "IPC attack surface: exported activities/services/receivers/content providers, deeplink hijacking",
      "Mobile malware families: Android trojan droppers, spyware (stalkerware), banking fraud kits, tripwire detection",
      "MDM/MAM/MTD: enrollment, app shielding, policy enforcement, BYOD vs COPE trade-offs",
      "Hardening: ProGuard/R8 obfuscation, attestation (Play Integrity / DeviceCheck), secure CI signing",
    ],
    tools: ["MobSF", "jadx", "apktool", "Frida", "objection", "mitmproxy", "Burp Suite", "Drozer", "Android Studio / ADB", "Ghidra"],
    frameworks: ["OWASP MASVS/MASTG", "OWASP Mobile Top 10", "NIST SP 800-124", "MITRE ATT&CK (Mobile)"],
    labs: [
      "Uncover hardcoded secrets and insecure storage in a deliberately vulnerable Android app with MobSF + jadx, then write the fix plan",
      "Bypass certificate pinning and root detection with Frida/objection, capture the hidden API traffic with mitmproxy",
      "Exploit an exported Android component (IPC abuse) with Drozer, then patch the manifest and re-verify",
      "Stand up an MDM policy baseline for a fictional fleet: encryption, kiosk mode, app allowlists, jailbreak response",
    ],
    certs: ["eMAPT", "Mobile Security+ (Mobile+)", "CRTMA", "CompTIA Security+ (mobile domain)", "GMOB"],
    roles: ["Mobile AppSec Engineer", "Mobile Penetration Tester", "MDM/MTD Administrator", "Application Security Analyst"],
  },

  "Wireless Security": {
    key: "Wireless Security",
    name: "Wi-Fi, RF & Wireless Infrastructure Security",
    summary:
      "Offensive and defensive wireless: 802.11 attack and defense (WPA2/WPA3-Enterprise, PMKID, evil twin, rogue AP hunting), RF fundamentals (SDR, signal capture), Bluetooth/BLE weaknesses, and the enterprise controls that survive contact with real attackers - 802.1X, WPA3-SAE, wireless IDS/IPS and RF survey methodology.",
    coreTopics: [
      "802.11 protocol fundamentals: frames, beacons, association, 4-way handshake, PMK/PTK key hierarchy",
      "WPA2-PSK cracking: handshake capture with hcxdumptool, PMKID attack, Hashcat mask/rule attacks on captured hashes",
      "WPA3-SAE: dragonfly handshake, dragonblood downgrade considerations, transition-mode attacks",
      "WPA2/WPA3-Enterprise: EAP types (PEAP/TTLS/EAP-TLS), RADIUS, certificate validation, evil twin with hostapd-mana",
      "Rogue AP / evil twin operations and detection: karma attacks, captive portal phishing lab (defensive framing)",
      "Wireless reconnaissance: aircrack-ng suite, Kismet, spectrum analysis, heatmapping with Ekahau-style surveys",
      "Bluetooth/BLE: GATT enumeration, sniffing, pairing weaknesses, tracker/relay considerations",
      "SDR fundamentals: RTL-SDR capture, GSM/ADS-B/ISM band listening, signal demodulation basics",
      "Defensive architecture: 802.1X with EAP-TLS, RADIUS redundancy, WIPS/WIDS deployment, rogue containment",
      "Guest network segmentation, PSK enterprise alternatives (iPSK), and wireless NAC integration",
    ],
    tools: ["Aircrack-ng suite", "hcxdumptool/hcxtools", "Kismet", "hostapd-mana", "Wireshark", "Wifite", "hashcat", "RTL-SDR", "Alfa adapters", "Ekahau (survey)"],
    frameworks: ["OWASP Wireless Security Testing Guide", "NIST SP 800-153", "CIS Controls (network/ wireless)", "MITRE ATT&CK (wireless vectors)"],
    labs: [
      "Capture a WPA2 handshake/PMKID in the isolated RF lab, crack it with Hashcat rules, then deploy the WPA3/802.1X controls that stop it",
      "Stand up an evil-twin captive portal with hostapd-mana in the training range, harvest creds, then hunt it with Kismet + WIPS correlation",
      "Perform a full wireless site survey: map APs, rogue devices, channel overlap and produce the remediation heat-map report",
      "BLE GATT device enumeration and sniffing in the IoT corner of the range; document pairing weaknesses and mitigations",
    ],
    certs: ["OSWP", "WiFi-Challenge badges", "CompTIA Security+ / Pentest+ (wireless domain)", "CWSP", "GAWN"],
    roles: ["Wireless Penetration Tester", "Network Security Engineer", "RF/Red Team Operator", "NOC/Wireless Infrastructure Engineer"],
  },

  "Social Engineering": {
    key: "Social Engineering",
    name: "Human-Layer Security - Phishing, Vishing & Social Engineering Defense",
    summary:
      "The human attack surface: phishing/vishing/smishing operations run lawfully and defensively, pretext development, psychology of influence, assessment with GoPhish-style controlled simulations, and the defensive stack that actually moves the needle - email authentication (SPF/DKIM/DMARC), gateway tuning, phishing-resistant MFA (FIDO2), report-button culture and metrics that measure resilience rather than shame.",
    coreTopics: [
      "Influence psychology: Cialdini principles, urgency/authority triggers, and why training-only approaches fail",
      "Phishing operation lifecycle (authorized): target recon, pretext design, infrastructure (GoPhish, domains, tracking), execution, metrics",
      "Vishing/smishing/deepfake voice: pretexts, VOIP setup for authorized labs, AI voice-clone risk awareness",
      "Email authentication deep dive: SPF, DKIM, DMARC (p=none→quarantine→reject), BIMI, ARC - and how attackers abuse lookalikes",
      "Gateway & mailbox defenses: EOP/Proofpoint-style rules, attachment detonation, URL rewriting, impersonation protection",
      "Phishing-resistant MFA: FIDO2/WebAuthn vs push-bombing vs OTP - MFA fatigue attacks and number matching",
      "Detection & response: anomaly signals, report-button telemetry, automated containment of confirmed phish",
      "Security awareness program design: role-based scenarios, just-in-time coaching, measuring resilience (report rate, click trend, dwell time)",
      "Physical social engineering (authorized engagements): badge cloning awareness, tailgating, drop-box USBs - and the controls",
      "Insider-risk overlap: data exfiltration indicators, DLP touchpoints, HR/legal coordination",
    ],
    tools: ["GoPhish", "Mailcow/postfix (lab mail)", "SPF/DKIM/DMARC inspectors (dmarcian, MXToolbox)", "Evilginx-style proxies (awareness)", "VOIP lab stack (Asterisk)", "HaveIBeenPwned-style recon", "Modlishka (awareness)"],
    frameworks: ["MITRE ATT&CK (Initial Access)", "NIST SP 800-50r1 (awareness training)", "SANS Security Awareness Maturity Model", "CIS Controls 14"],
    labs: [
      "Run a full authorized phishing simulation with GoPhish in the isolated mail lab: template, landing page, campaign, click/report metrics, debrief",
      "Break and fix email authentication: deploy SPF+DKIM+DMARC for a lab domain, attempt a lookalike spoof, watch DMARC enforcement stop it",
      "Simulate an MFA fatigue/push-bombing campaign against a lab tenant, then roll out number-matching/FIDO2 and re-test",
      "Build the awareness playbook: convert campaign results into role-based micro-training and a resilience scorecard for executives",
    ],
    certs: ["SSEP (SANS Security Awareness)", "CompTIA Security+ (human layer)", "CEH (social engineering module)", "CPENT social engineering module"],
    roles: ["Security Awareness Manager", "Human Risk Analyst", "Red Team Operator (Social Engineering)", "Email Security Engineer"],
  },

  "OT/ICS Security": {
    key: "OT/ICS Security",
    name: "Operational Technology & ICS/SCADA Security",
    summary:
      "Securing industrial environments where availability outranks confidentiality: Purdue model segmentation, ICS protocols (Modbus, DNP3, S7, EtherNet/IP), OT-aware threat intelligence (ICS ATT&CK), passive monitoring, unidirectional gateways and the safety-first methodology that separates a plant assessment from an IT pentest.",
    coreTopics: [
      "IT vs OT fundamentals: availability-safety triangle, real-time constraints, legacy Windows/embedded estates",
      "Purdue Enterprise Reference Architecture: levels 0-3/DMZ, zone & conduit segmentation (IEC 62443)",
      "Industrial protocols on the wire: Modbus/TCP, DNP3, S7comm, EtherNet/IP, OPC UA - replay/injection realities",
      "Historic incidents as teaching cases: Stuxnet, Industroyer/CrashOverride, TRITON/TRISIS, Pipedream/Incontroller",
      "MITRE ATT&CK for ICS: techniques, data sources, detection engineering for OT protocols",
      "Passive OT monitoring: Deep Packet Inspection with Zeek ICS scripts, Nozomi/Claroty-style asset discovery concepts",
      "OT-safe assessment methodology: zero-intrusive recon, engineer-accompanied testing, no active scanning on PLCs without sign-off",
      "Network defense architecture: unidirectional gateways/data diodes, jump servers, DMZ historians, remote access hardening",
      "Asset inventory & baselining: vendor stacks, firmware currency, commissioning-to-retirement lifecycle risks",
      "Standards & governance: IEC 62443, NIST SP 800-82r3, NERC CIP mapping, ISA/IEC 62443 zones-with-conduits design",
    ],
    tools: ["Wireshark + ICS dissectors", "Zeek with ICS scripts", "Snort/Suricata ICS rulesets", "Modbus/S7 test utilities (lab PLC simulators, OpenPLC)", "GRASSMARLIN", "Claroty/Nozomi (concepts)", "Virtual PLC simulators"],
    frameworks: ["IEC 62443", "NIST SP 800-82r3", "MITRE ATT&CK for ICS", "NERC CIP", "ISA 99"],
    labs: [
      "Build a virtual OT range: OpenPLC + ScadaBR HMI on Modbus/TCP, capture baseline traffic, fingerprint every asset passively",
      "Replay and inject Modbus write commands in the sandboxed range, observe HMI impact, then engineer the Zeek/Suricata detection",
      "Design Purdue segmentation for a fictional water-utility: zones, conduits, DMZ historian, jump server, data diode for Historian-to-Cloud",
      "Tabletop a TRITON-style safety-instrumented-system incident: map to ATT&CK for ICS, produce the containment playbook that respects safety",
    ],
    certs: ["GICSP", "ISA/IEC 62443 Cybersecurity Certificates", "GridSec", "CAP", "CompTIA Security+ (OT awareness)"],
    roles: ["OT/ICS Security Engineer", "ICS Penetration Tester", "SCADA Security Analyst", "Plant Network Architect"],
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

/** Never-fail domain resolution - unknown categories get a synthesised entry. */
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
  return `DOMAIN EXPERTISE - ${d.name}
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

/* ============================================================
   Expert lens - the senior-practitioner layer.
   For each domain: HOW an expert approaches the work
   (methodology), the wrong ideas students bring
   (misconceptions the agent must actively correct), and the
   questions employers actually ask (interviewProbes).
   Injected into every architect prompt via domainExpertLens().
   ============================================================ */

export interface DomainExpertLens {
  methodology: string[]
  misconceptions: string[]
  interviewProbes: string[]
}

export const DOMAIN_EXPERT_LENS: Record<string, DomainExpertLens> = {
  "Ethical Hacking": {
    methodology: [
      "Evidence-first testing: every claimed finding carries a reproduction path, screenshot/output evidence and a severity rationale - an unproven finding is an opinion.",
      "Kill-chain ordered operations: recon → enumerate → prioritise (CVSS + business context) → exploit → post-exploit → report; each stage gates the next.",
      "Assume-detection mindset: for every action, note the telemetry it generates (EDR, Sysmon, NetFlow) so the report can also teach the defenders.",
    ],
    misconceptions: [
      "Thinking a tool run equals a pentest - tools enumerate; the engineer's chaining, context and report are the deliverable.",
      "Believing 'root on one box' ends the engagement: value is demonstrated by pivoting to tier-0 assets and business impact.",
      "Assuming exploits are plug-and-play: public PoCs frequently need safe modification and environment awareness.",
    ],
    interviewProbes: [
      "Walk me through your last full-scope engagement end-to-end, including the finding you were proudest of and why it mattered to the business.",
      "You get a shell on a workstation inside an enterprise network - what are your first five actions and why that order?",
      "How do you safely modify a public exploit, and how do you verify it will not take the target down?",
    ],
  },
  Networking: {
    methodology: [
      "Layered diagnosis: physical → L2 → L3 → L4 → application; never jump to 'restart the firewall' before the path is proven with tcpdump/traceroute evidence.",
      "Packet-level truth: if the logs disagree with the wire capture, the wire wins - teach students to read handshakes, TTLs and retransmissions.",
      "Design reviews start with trust boundaries: every interface, VLAN and tunnel is a policy question, not a config line.",
    ],
    misconceptions: [
      "Confusing NAT with a security control - it obscures addressing but is not a segmentation policy.",
      "Believing a VLAN tag implies isolation without an enforced ACL/L3 boundary behind it.",
      "Assuming TLS on the wire means the endpoint is trustworthy.",
    ],
    interviewProbes: [
      "A user says 'the network is slow' - walk me through your end-to-end diagnostic from the wall port to the application.",
      "Where exactly would you place a WAF, an IDS and a jump host in a segmented design, and what does each buy you?",
      "Explain what a TCP retransmission storm tells you that CPU graphs cannot.",
    ],
  },
  "Web Security": {
    methodology: [
      "Spec-driven testing: map every behaviour against the WSTG checklist and the application's own intended state machine - bugs hide where the two disagree.",
      "Exploit chains over single bugs: a self-XSS plus a login CSRF can outperform one lonely RCE; always hunt for combinable weaknesses.",
      "Fix-verification loop: every finding ends with a re-test that proves the remediation actually kills the exploit path.",
    ],
    misconceptions: [
      "Believing HTTPS means the site is secure - transport privacy has nothing to do with authorization logic.",
      "Equating a scanner's green board with safety: Burp/ZAP miss logic flaws, IDOR chains and business-logic abuse by design.",
      "Trusting client-side validation as a control - the server is the only enforcement point that counts.",
    ],
    interviewProbes: [
      "A web app has MFA, HTTPS and a WAF - give me three realistic attack paths that still work.",
      "How do you test for IDOR methodically without spraying thousands of requests?",
      "Explain a time you chained two low-severity findings into something critical.",
    ],
  },
  "System Administration": {
    methodology: [
      "Baselines before tooling: a hardened image (CIS benchmark) beats any agent bolted onto a snowflake server.",
      "Infrastructure as code or it does not exist: every hardening step must be reproducible via Ansible/Packer/Terraform.",
      "Change is the risk window: patching cadences, rollback plans and maintenance windows are part of the security design, not overhead.",
    ],
    misconceptions: [
      "Assuming antivirus equals endpoint security - identity hygiene, local admin rights and patching move the needle far more.",
      "Believing servers 'drift randomly': drift comes from unmanaged change, which is a process failure, not a mystery.",
      "Treating the sudoers file or local admin group as set-and-forget when they are the crown jewels of privilege escalation.",
    ],
    interviewProbes: [
      "You inherit 200 unpatched servers with no inventory - what do you do in the first week?",
      "How would you harden a Linux web server that must run a legacy PHP 5 app?",
      "Explain your rollback plan when a Tuesday patch cycle breaks production.",
    ],
  },
  "Security Management": {
    methodology: [
      "Risk-led governance: inventory → risk register → treatment decisions → control mapping → evidence; frameworks (ISO 27001, NIST CSF) structure the conversation, they are not the goal.",
      "Metrics that change behaviour: mean-time-to-patch, phishing report rate, control coverage - vanity dashboards are compliance theatre.",
      "Policy without enforcement is fiction: every policy statement needs an owning control, a technical or procedural verification, and an audit trail.",
    ],
    misconceptions: [
      "Equating certification with security - an ISMS can pass audit while critical risks stay untreated.",
      "Believing zero risk is achievable: the job is informed risk acceptance at the right leadership level.",
      "Assuming awareness training alone prevents incidents - it shifts probabilities, controls decide outcomes.",
    ],
    interviewProbes: [
      "The board asks 'are we secure?' - what do you actually present and from which data?",
      "A critical risk has no budget: walk me through the acceptance and monitoring you would put around it.",
      "How do you keep an ISO 27001 ISMS alive between surveillance audits?",
    ],
  },
  "Identity & Access": {
    methodology: [
      "Identity is the new perimeter: map every service account, API key and federation trust as lovingly as you map user accounts.",
      "Least privilege as a lifecycle: JIT elevation, access reviews, joiner-mover-leaver automation - standing privileges are debt.",
      "Assume credential theft: design for phishing-resistant factors, conditional access and impossible-travel detection, not password rotation theatre.",
    ],
    misconceptions: [
      "Believing MFA solves everything: push-fatigue, SIM-swap and AiTM proxy kits defeat weak factors - FIDO2 or nothing for tier-0.",
      "Confusing authentication with authorization - who you are is not what you may do.",
      "Assuming service accounts 'are fine' because nobody logs into them interactively.",
    ],
    interviewProbes: [
      "Design the access model for a tier-0 admin: from workstation to domain controller, every hop and every control.",
      "You find a service account with domain admin from 2016 - what is your remediation and communication plan?",
      "How would you detect an AiTM phishing proxy stealing session tokens in your tenant?",
    ],
  },
  "Cloud Security": {
    methodology: [
      "Control-plane first: who can create/modify IAM, networking and compute defines the blast radius - review the control plane before chasing workloads.",
      "Guardrails over gates: SCPs/Azure Policy/Org policies make the insecure path impossible instead of auditing it afterwards.",
      "Assume public: every storage, queue and endpoint is internet-scannable until proven otherwise - continuously prove otherwise.",
    ],
    misconceptions: [
      "Believing the shared responsibility model ends at 'provider handles security' - IAM misconfig is always yours.",
      "Treating cloud like a virtual datacenter: identical VPCs and logs everywhere ignore managed-service identities and metadata APIs (SSRF → role theft).",
      "Assuming private subnets are unreachable - egress paths and VPC endpoints decide that.",
    ],
    interviewProbes: [
      "An S3 bucket with PII goes public - walk me from detection through containment to the permanent control that prevents recurrence.",
      "How does an SSRF in an EC2 app become a full account takeover, and what breaks that chain?",
      "What would your SCP/Policy guardrail set contain on day one in a new AWS org?",
    ],
  },
  DevSecOps: {
    methodology: [
      "Shift-left with teeth: SAST/DAST/SCA/IaC scanning in CI only counts when findings block merges or auto-file tickets with owners.",
      "Pipeline is production: CI runners, registries and deploy keys are tier-0 assets - protect them like domain controllers.",
      "Provenance and SBOM: signed images (cosign), attested builds and an SBOM you can query when the next log4j lands.",
    ],
    misconceptions: [
      "Believing a weekly SCA scan is supply-chain security - dependencies need SBOMs, signing and rapid-rebuild drills.",
      "Assuming developers will 'own security' because a dashboard exists - the platform team must make the secure path the default.",
      "Equating secrets in vaults with secrets hygiene: rotation, short-lived credentials and scan-for-drift matter more.",
    ],
    interviewProbes: [
      "Design the CI/CD security controls for a fintech deploying 50 times a day.",
      "log4shell hits at 9am - what does your SBOM/registry tooling let you do by noon?",
      "A developer needs a long-lived AWS key 'just for this one job' - what do you offer instead?",
    ],
  },
  "Incident Response": {
    methodology: [
      "Stabilise before you investigate: containment scope decisions are business decisions - document them live with timestamps.",
      "One evidence chain: acquire → hash → log → analyse, with write-blockers and copies; the case dies with a broken chain of custody.",
      "Hypothesis-driven hunting: every indicator suggests a story; attack the story until it breaks or completes.",
    ],
    misconceptions: [
      "Believing reimaging is containment: without root-cause, the same access path re-enters the next image.",
      "Assuming alerts equal incidents and incidents equal breaches - triage discipline exists to separate them.",
      "Treating the tabletop as a checkbox: the plan that survives contact is the one with contacts, authority and out-of-band comms rehearsed.",
    ],
    interviewProbes: [
      "Suspicious lsass access on a finance workstation at 2am - take me through your next 60 minutes.",
      "When do you pull the plug versus monitor, and who has authority to make that call?",
      "How do you keep IR comms working when you suspect the email tenant is compromised?",
    ],
  },
  "Digital Forensics": {
    methodology: [
      "Order of volatility: memory → network state → disk → backups; the first triage decision determines what exists to analyse.",
      "Artifact corroboration: a single registry key or log line is a hint; a timeline built from independent artifacts is evidence.",
      "Know the formats at byte level: parsing $MFT, hives, SQLite WAL or APFS yourself beats trusting a tool's summary.",
    ],
    misconceptions: [
      "Believing 'the logs are gone' means no evidence: memory, USN journal, SRUM, prefetch, cloud audit trails persist.",
      "Assuming tools like Autopsy output truth - parsers have bugs and anti-forensics plants artifacts.",
      "Treating timestamps as absolute - timezone and clock-skew errors invent or destroy alibis.",
    ],
    interviewProbes: [
      "You arrive on-site with a live, encrypted, powered-on laptop - what do you capture in what order and why?",
      "How would you prove (not speculate) that a USB device was attached and files copied?",
      "A suspect wiped browsers but the box kept running - where else does web activity live?",
    ],
  },
  "Malware Analysis": {
    methodology: [
      "Triage pyramid: hashes → static properties (imports, strings, entropy) → sandbox behaviour → interactive detonation → reverse engineering, stopping as soon as the question is answered.",
      "Isolation paranoia: analysis VMs are disposable, network-faked (INetSim/FakeNet), snapshotted and never domain-joined.",
      "Extract capability, not trivia: what the binary does to hosts, credentials and persistence matters more than every string it contains.",
    ],
    misconceptions: [
      "Believing packed/obfuscated means impossible: unpacking is a workflow (run, dump, rebuild imports), not black magic.",
      "Assuming a sandbox report is the full story: evasion-aware samples behave differently under monitoring.",
      "Treating malware analysis as IOC harvesting - capabilities and TTPs drive detections longer than hashes do.",
    ],
    interviewProbes: [
      "A sample refuses to run in any sandbox - how do you approach it?",
      "Walk me from a suspicious Word doc to YARA rules you would deploy enterprise-wide.",
      "What is the difference between staging, installation and C2 behaviours when you report to a SOC?",
    ],
  },
  "Threat Intelligence": {
    methodology: [
      "Intelligence answers questions: start from the consumer's decision (patch now? block? hunt?) and work backwards - collecting everything is collecting nothing.",
      "Finish the pyramid: map IOCs upward to TTPs and campaigns so detections outlive infrastructure rotation.",
      "Adversary emulation feedback loop: every intel product should end as a detection, a hunt package or an engineering ticket.",
    ],
    misconceptions: [
      "Equating feeds with intelligence - raw IOCs without context and confidence are noise with a API bill.",
      "Believing APT attribution matters to defenders more than TTPs: you cannot block a nation-state's name.",
      "Assuming intel is a SOC-only product - risk, fraud and executive teams are consumers too.",
    ],
    interviewProbes: [
      "A new ransomware crew targets your sector - what intelligence product do you deliver, to whom, by when?",
      "How do you measure whether your threat intel program is worth its cost?",
      "Take one ATT&CK technique and show how you would go from report to working detection.",
    ],
  },
  Cryptography: {
    methodology: [
      "Never roll your own: primitive selection comes from standards and libraries (libsodium, platform APIs); the engineering is in protocol and key management.",
      "Threat-model the key lifecycle: generation, storage, rotation, revocation - most real failures live there, not in the math.",
      "Prove implementations in tests: known-answer tests, fuzzing parsers, constant-time checks for anything touching secrets.",
    ],
    misconceptions: [
      "Believing 'AES-256' is a security claim - modes, nonces and key handling decide everything (GCM nonce reuse is catastrophic).",
      "Confusing encoding (base64) or hashing (SHA) with encryption.",
      "Assuming longer keys fix design flaws: ECB and MD5 stay broken at any length.",
    ],
    interviewProbes: [
      "You need encrypted search over user records - walk me through the trade-offs you would evaluate.",
      "Why is GCM nonce reuse worse than CBC IV reuse, and how do libraries prevent both?",
      "Design the key rotation plan for a service encrypting data at rest with customer-managed keys.",
    ],
  },
  "Mobile Security": {
    methodology: [
      "Test like the data flows: device → app binary → platform storage → network → backend API; the backend API is where business logic usually dies.",
      "Instrument before you read code: Frida hooks reveal runtime truth that static decompilation only hints at.",
      "Assess the fleet, not just the app: an MDM baseline review often finds higher risk than any single APK.",
    ],
    misconceptions: [
      "Believing app-store review means security - it is a malware scan and checklist, not a penetration test.",
      "Assuming iOS is 'safe by default': Keychain misuse, weak ATS exceptions and jailbroken fleets negate platform promises.",
      "Treating obfuscation (ProGuard) as encryption - the binary still runs on an attacker-controlled device.",
    ],
    interviewProbes: [
      "How would you test a banking app end-to-end with only a rooted device and a proxy?",
      "Where do mobile apps most often leak PII that a static scan would miss?",
      "Design the mobile device policy for a bring-your-own-device workforce handling customer data.",
    ],
  },
  "Wireless Security": {
    methodology: [
      "Survey before you attack: channel map, client inventory and AP fleet baseline turn wireless testing from noise into findings.",
      "Enterprise first: the WPA2/WPA3-Enterprise EAP negotiation is where real networks fail - certificate validation and rogue RADIUS.",
      "Pair every attack with its detection: a PMKID crack demo ends with the WIPS signature and 802.1X design that kills it.",
    ],
    misconceptions: [
      "Believing hiding SSIDs or MAC filtering adds meaningful security - both are trivia-level bypasses.",
      "Assuming WPA3 means done: transition mode re-enables downgrade games and enterprise deployment is where the risk lives.",
      "Treating guest Wi-Fi as isolated until proven: client-to-client forwarding and flat VLANs are the classic fail.",
    ],
    interviewProbes: [
      "You are asked to secure a conference venue Wi-Fi for 2000 attendees - design it.",
      "How does an evil twin defeat a validated enterprise EAP-TLS network, and what stops it?",
      "What wireless telemetry would you ship to your SIEM and what hunts would you run on it?",
    ],
  },
  "Social Engineering": {
    methodology: [
      "Metrics over fear: report rate, click-rate trend and time-to-report measure resilience - shaming users kills reporting culture.",
      "Control-pair every simulation: each authorized campaign must end with a technical control test (DMARC, gateway, MFA) not just a user test.",
      "Pretext realism with ethics: authorized scenarios only, no real credentials harvested, instant disclosure and data destruction.",
    ],
    misconceptions: [
      "Believing annual training prevents phishing - in-the-moment coaching and easy reporting beat annual slide decks.",
      "Assuming MFA stops phishing: OTP and push are phishable; FIDO2 and number matching are the bar.",
      "Treating users as the 'weakest link' instead of the sensors you armed badly.",
    ],
    interviewProbes: [
      "Click rate is down but credential compromises are up - what is actually happening and what do you change?",
      "Design the DMARC rollout for a company with marketing vendors sending on its behalf.",
      "How would you defend the CFO against a deepfake voice authorization request?",
    ],
  },
  "OT/ICS Security": {
    methodology: [
      "Safety outranks security findings: no active scans or writes against live PLCs without engineer sign-off - the lab simulates, the plant never experiments.",
      "Passive-first visibility: mirror SPAN ports and fingerprint assets with Zeek/GRASSMARLIN before anyone touches a device.",
      "Segment by zones and conduits: IEC 62443 design reviews beat scanning - most OT incidents are IT-side lateral movement into flat networks.",
    ],
    misconceptions: [
      "Believing air-gaps exist: vendor remote access, USB media and business-data historians connect everything.",
      "Assuming IT patching cadences apply: firmware cycles are shutdown-window events requiring compensating controls.",
      "Treating OT devices as unpatchable black boxes - monitoring, segmentation and egress control carry the load instead.",
    ],
    interviewProbes: [
      "IT detects ransomware spreading toward the plant floor - what are your first three moves and what must you NOT do?",
      "How do you build an OT asset inventory without active scanning?",
      "Walk me through zoning a mid-size food-plant network to IEC 62443 principles.",
    ],
  },
  General: {
    methodology: [
      "Fundamentals compound: CIA triad, least privilege, defense in depth and complete mediation solve most novel scenarios students will meet.",
      "Teach the transferable loop: model the threat → pick the control → verify it works → monitor for decay.",
      "Vocabulary precision: attack vs vulnerability vs threat vs risk - interviews and audits punish loose language.",
    ],
    misconceptions: [
      "Believing security is a product you buy rather than a property you engineer and operate.",
      "Assuming attackers are outside: insider risk and supply-chain compromise are core curriculum, not edge cases.",
      "Confusing compliance checkboxes with measurable resilience.",
    ],
    interviewProbes: [
      "Explain defense in depth with a concrete control stack for one realistic asset.",
      "What is the difference between a threat, a vulnerability and a risk - with an example of each?",
      "How do you decide between mitigating, transferring or accepting a risk?",
    ],
  },
}

/** Senior-practitioner lens block for prompts - empty string for unknown domains. */
export function domainExpertLens(category: string | null | undefined): string {
  const d = resolveDomain(category)
  const lens = DOMAIN_EXPERT_LENS[d.key]
  if (!lens) return ""
  const list = (arr: string[]) => arr.map((x) => `  - ${x}`).join("\n")
  return `
EXPERT LENS - how a senior ${d.key} practitioner works:
Methodology:
${list(lens.methodology)}
Misconceptions you must actively correct in learners:
${list(lens.misconceptions)}
Interview questions this domain actually gets asked:
${list(lens.interviewProbes)}`
}
