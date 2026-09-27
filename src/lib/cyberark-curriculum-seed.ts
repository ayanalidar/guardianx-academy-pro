/**
 * Authored curriculum seed for the CyberArk IAM & Privileged Access
 * Management course (GXA course id cmtg4favo0057mko8ymxbinkx).
 *
 * Source documents (user-provided):
 *   - "Executive Course Syllabus - CyberArk Privileged Access Management
 *     (PAM)" — 8 theory modules (Foundations & Core Architecture 1-4,
 *     Deployment, Integrations & Governance 5-8) + the CyberArk Component
 *     Responsibility Matrix.
 *   - "CyberArk PAM Lab Training (GXA-210, Facilitator Edition 2026)" —
 *     4 lab phases / 15 hands-on lab modules, from infrastructure build
 *     through Vault deployment, core components, and day-two operations.
 *
 * This module is imported by:
 *   - prisma/seed-cyberark-curriculum.ts  (CLI run with DATABASE_URL)
 *   - the one-time deploy-time apply route (temporary; removed after the
 *     production DB has been seeded once)
 *
 * Shape mirrors the Course/Module/Lesson schema: modules render on the
 * public curriculum timeline in array order (`order` index), lessons
 * render beneath them with type icons (reading | pdf | video | lab).
 */

export const CYBERARK_COURSE_ID = "cmtg4favo0057mko8ymxbinkx"
export const CYBERARK_COURSE_SLUG = "cyberark-iam-pam"

export type CyberArkSeedLesson = {
  title: string
  type: "reading" | "pdf" | "video" | "lab"
  /** Markdown rendered by the lesson viewer (ReactMarkdown + GFM tables). */
  content: string
  durationMin: number
  preview?: boolean
}

export type CyberArkSeedModule = {
  title: string
  description: string
  lessons: CyberArkSeedLesson[]
}

/** Shared markdown section builders keep every lesson consistent. */
const topics = (list: string[]) =>
  list.map((t) => `- ${t}`).join("\n")

const labDoc = (context: string, objectives: string[], steps: string[], outcome: string) => `## Context

${context}

## Lab Objectives

${topics(objectives)}

## Key Lab Steps

${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Expected Outcome

${outcome}`

export const CYBERARK_CURRICULUM: CyberArkSeedModule[] = [
  // ================================================================
  // PART 1 — FOUNDATIONS & CORE ARCHITECTURE (syllabus modules 1-4)
  // ================================================================
  {
    title: "Module 01 — Why Privileged Access Management Matters",
    description:
      "What counts as privileged access, why privileged credentials are the top breach route, and how PAM anchors Zero Trust and regulatory compliance.",
    lessons: [
      {
        title: "Why Privileged Access Management Matters",
        type: "reading",
        durationMin: 30,
        preview: true,
        content: `## Context

Privileged access is the highest-value target in any enterprise. This module establishes what privileged access really means, why privileged credentials sit at the top of virtually every breach route, and how Privileged Access Management becomes the anchoring control of a Zero Trust architecture and of regulatory compliance programs.

## Key Topics

${topics([
  "What counts as privileged access vs. standard access",
  "How privileged credentials become the top breach route",
  "Eliminating standing access & risk of lateral movement",
  "Securing machine, application, and service identities",
  "Session auditing, tamper-proof logs, and compliance",
  "Zero Trust architecture alignment and regulatory mandates",
])}

## Outcome Check

- Classify real enterprise accounts into privileged, standard, and non-human identities
- Explain to auditors and leadership why removing standing access shrinks the lateral-movement blast radius`,
      },
    ],
  },
  {
    title: "Module 02 — PAM Concepts & Core Terminology",
    description:
      "Least privilege, Just-In-Time elevation, session isolation, credential rotation, and human vs. machine secrets workflows — the working vocabulary of PAM.",
    lessons: [
      {
        title: "PAM Concepts & Core Terminology",
        type: "reading",
        durationMin: 30,
        content: `## Context

Every PAM design conversation runs on a shared vocabulary. This module fixes the terms you will use for the rest of the course — from account classes and least privilege through Just-In-Time elevation, bastion proxies, credential shielding, and the split between human and machine secrets workflows.

## Key Topics

${topics([
  "Privileged vs. standard vs. non-human service accounts",
  "Principle of Least Privilege and Just-In-Time (JIT) elevation",
  "Session isolation, bastion proxies, and credential shielding",
  "Automated credential rotation and lifecycle management",
  "Enterprise secrets management: human vs. machine workflows",
])}

## Outcome Check

- Use PAM terminology precisely when scoping safes, platforms, and policies
- Decide when a workflow calls for JIT elevation instead of a standing privilege`,
      },
    ],
  },
  {
    title: "Module 03 — CyberArk Core Component Architecture",
    description:
      "Inside the CyberArk suite: Digital Vault, PVWA, CPM, PSM & PSM for SSH, and ISI/PTA behavioral analytics — plus the component responsibility matrix.",
    lessons: [
      {
        title: "CyberArk Core Component Architecture",
        type: "reading",
        durationMin: 40,
        content: `## Context

This module dissects the CyberArk core: which component stores, brokers, rotates, records, and watches privileged access. Each component has a crisp security function and an operational role — knowing both is what separates an operator from an architect.

## Key Topics

${topics([
  "**Digital Vault** — encrypted key storage, secure protocol & auth",
  "**PVWA** — web portal for safe creation, accounts & policy control",
  "**CPM** — automatic credential rotation, verification & reconciliation",
  "**PSM & PSM for SSH** — live session brokering & Linux proxies",
  "**ISI / PTA** — behavioral analytics & anomaly detection",
])}

## CyberArk Component Responsibility Matrix

| Component | Core Security Function | Operational Role |
| --- | --- | --- |
| Digital Vault | Hardware-level / OS-hardened encrypted repository for all secrets and keys | Central data store & audit log retention |
| PVWA (Web UI) | Role-based management portal, safe allocation, and request approvals | Admin and auditor interactive interface |
| CPM | Automated credential verification, reconciliation, and password change runs | Enforces rotational security policies |
| PSM / PSM-SSH | Session proxy with keystroke recording, video capture, and credential isolation | Zero client installation on target servers |

## Outcome Check

- Map any privileged-access request to the components it traverses, end to end
- State each component's responsibility without notes (interview and design reviews)`,
      },
    ],
  },
  {
    title: "Module 04 — Securing Non-Human Identities (NHI)",
    description:
      "Machine accounts, scheduled tasks, and microservices — eliminating hardcoded secrets and centralizing machine credential retrieval via REST API & SDK.",
    lessons: [
      {
        title: "Securing Non-Human Identities (NHI)",
        type: "reading",
        durationMin: 30,
        content: `## Context

Machines now outnumber human users by an order of magnitude, and every hardcoded secret in a repo is a standing breach invitation. This module covers protecting machine identities end to end — from scheduled tasks and microservices to CI/CD runners, Kubernetes, and cloud API keys.

## Key Topics

${topics([
  "Protecting machine accounts, scheduled tasks & microservices",
  "Eliminating hardcoded credentials from repos and codebases",
  "Centralized REST API & SDK retrieval for distributed apps",
  "DevOps integration: CI/CD runners, Kubernetes, API keys, SSH & certs",
])}

## Outcome Check

- Audit a codebase for plaintext secrets and plan the migration to vaulted retrieval
- Design centralized credential retrieval for distributed applications via REST API / SDK`,
      },
    ],
  },
  // ================================================================
  // PART 2 — DEPLOYMENT, INTEGRATIONS & GOVERNANCE (syllabus modules 5-8)
  // ================================================================
  {
    title: "Module 05 — Enterprise Deployment Models",
    description:
      "Self-hosted vs. Privilege Cloud, High Availability & Disaster Recovery vaults, network prerequisites, and greenfield vs. brownfield rollout planning.",
    lessons: [
      {
        title: "Enterprise Deployment Models",
        type: "reading",
        durationMin: 35,
        content: `## Context

There is no single way to stand up CyberArk. This module compares self-hosted on-premises architecture with SaaS-delivered Privilege Cloud, walks through High Availability and Disaster Recovery vault design, and covers the network plumbing and rollout planning that decide whether a deployment goes live on schedule.

## Key Topics

${topics([
  "Self-hosted on-premises server architecture & prerequisites",
  "SaaS-delivered Privileged Access Management (Privilege Cloud)",
  "High Availability (HA) clusters and Disaster Recovery (DR) Vaults",
  "Network topology, port configurations & firewall rules",
  "Greenfield installation planning vs. brownfield upgrade paths",
])}

## Outcome Check

- Choose between self-hosted and Privilege Cloud for a given compliance and ops profile
- Plan HA/DR topology, ports, and firewall rules for an enterprise PAM rollout`,
      },
    ],
  },
  {
    title: "Module 06 — Integrations & Ecosystem Extension",
    description:
      "Directory, ITSM, cloud, and SIEM/SOAR integrations — plus building custom plugins and Universal Connectors for legacy targets.",
    lessons: [
      {
        title: "Integrations & Ecosystem Extension",
        type: "reading",
        durationMin: 35,
        content: `## Context

PAM delivers value only when it is wired into the ecosystem around it: directories for identity, ITSM for approvals, cloud platforms for workloads, and SIEM/SOAR for detection and response. This module covers the native integration surface and how to extend it when a target does not fit the box.

## Key Topics

${topics([
  "Directory integration: Active Directory, LDAP, Entra ID",
  "ITSM & ticketing: ServiceNow approvals and JIT workflows",
  "Extending PAM into AWS, Azure, and Google Cloud Platform",
  "Building custom plugins and Universal Connectors for legacy targets",
  "Connecting PAM to SIEM, SOAR, and central logging systems",
])}

## Outcome Check

- Design the integration map for a CyberArk deployment across directory, ITSM, cloud, and SIEM
- Decide when to build a custom plugin vs. deploy a Universal Connector for a legacy target`,
      },
    ],
  },
  {
    title: "Module 07 — Core IAM Alignment & Governance",
    description:
      "Where PAM meets IAM: identity lifecycle, RBAC/ABAC entitlements, access certification & attestations, and MFA/SSO integration principles.",
    lessons: [
      {
        title: "Core IAM Alignment & Governance",
        type: "reading",
        durationMin: 30,
        content: `## Context

PAM does not live in isolation — it is the privileged tier of a broader Identity and Access Management program. This module aligns CyberArk with IAM fundamentals: the joiner-mover-leaver lifecycle, RBAC and ABAC entitlement models, certification campaigns, and the MFA/SSO fabric users actually log in through.

## Key Topics

${topics([
  "Identity & Access Management fundamentals: how IAM relates to PAM",
  "User lifecycle: onboarding, role assignment, and offboarding",
  "Group and entitlement management via RBAC and ABAC policies",
  "Access certification, compliance attestations & periodic reviews",
  "MFA and Single Sign-On (SSO) integration principles",
])}

## Outcome Check

- Position PAM inside an enterprise IAM architecture and its governance cadence
- Run an access certification that covers privileged entitlements with evidence`,
      },
    ],
  },
  {
    title: "Module 08 — Operations, Monitoring & Maturation",
    description:
      "Running PAM day-to-day: target onboarding, audit reporting & forensic playback, health diagnostics, and building a PAM maturity roadmap with KPIs.",
    lessons: [
      {
        title: "Operations, Monitoring & Maturation",
        type: "reading",
        durationMin: 30,
        content: `## Context

Deploying CyberArk is the beginning, not the finish line. This module covers steady-state operations — onboarding targets, safes, and platforms; audit reporting and forensic playback; health diagnostics and CPM reconciliation triage — and closes with the enterprise PAM maturity roadmap that turns a live deployment into a maturing control.

## Key Topics

${topics([
  "Day-to-day administration: onboarding targets, safes, and platforms",
  "Audit reporting, compliance dashboards, and forensic playback",
  "System health diagnostics, CPM reconciliation errors & resolution",
  "Building an enterprise PAM maturity roadmap and KPI framework",
])}

## Outcome Check

- Operate CyberArk day-to-day: health checks, reconciliation triage, and audit reporting
- Draft a PAM maturity roadmap with KPIs an executive steering group can track

## GuardianX Competency Focus

Candidates gain practical command of the CyberArk suite — from isolating sessions on target infrastructure to eliminating plaintext secrets in automation pipelines.`,
      },
    ],
  },
  // ================================================================
  // PART 3 — GXA-210 HANDS-ON LAB TRACK (4 phases / 15 lab modules)
  // ================================================================
  {
    title: "Lab Phase 1 — Lab Infrastructure Foundation",
    description:
      "Virtualization, base operating systems, and the Active Directory domain that every other lab machine stands on.",
    lessons: [
      {
        title: "Lab 1.1 — VMware Installation",
        type: "lab",
        durationMin: 45,
        content: labDoc(
          "The lab begins with a virtualization layer so multiple Windows and Linux machines can run on a single physical host. This lab covers installing a hypervisor (ESXi or VMware Workstation/Player) and preparing it to host the virtual machines used throughout the rest of the training.",
          [
            "Understand hypervisor types (Type-1 vs Type-2) and when each is used",
            "Size CPU, memory, storage and networking for a multi-VM CyberArk lab",
            "Install VMware and configure a virtual network (NAT/bridged/host-only)",
          ],
          [
            "Install VMware Workstation/ESXi on the host machine",
            "Create a dedicated virtual switch/network for the lab",
            "Provision base VM shells for the domain controller, vault, component, and target servers",
            "Take a baseline snapshot before OS installation",
          ],
          "A working virtualization platform with the network and VM shells ready to receive guest operating systems."
        ),
      },
      {
        title: "Lab 1.2 — Windows Server Setup",
        type: "lab",
        durationMin: 45,
        content: labDoc(
          "Most CyberArk components (Vault, PVWA, CPM, PSM) run on Windows Server. This lab walks through installing and hardening the base Windows Server OS that will later host these components.",
          [
            "Install Windows Server (2019/2022) on a VM from ISO",
            "Configure hostname, static IP, time sync, and Windows updates",
            "Apply baseline hardening appropriate for a PAM component host",
          ],
          [
            "Mount ISO and complete Windows Server setup wizard",
            "Set static IP addressing and DNS pointing to the lab domain controller",
            "Rename the server and join it to the domain (post-DC setup)",
            "Disable unnecessary services and enable Windows Firewall rules for CyberArk ports",
          ],
          "A patched, network-ready Windows Server instance suitable for installing CyberArk Vault, PVWA, CPM, or PSM."
        ),
      },
      {
        title: "Lab 1.3 — Linux Server Setup",
        type: "lab",
        durationMin: 45,
        content: labDoc(
          "PSMP and many privileged Unix/Linux targets require a Linux host. This lab covers building a base Linux server that will later be configured as a PSMP server or as a managed target.",
          [
            "Install a supported Linux distribution (RHEL/CentOS/Ubuntu per CyberArk compatibility matrix)",
            "Configure networking, hostname resolution, and SSH access",
            "Prepare OS prerequisites CyberArk components expect (packages, kernel parameters)",
          ],
          [
            "Install the Linux OS on a VM and configure a static IP",
            "Set the hostname and update /etc/hosts or DNS records",
            "Enable and test SSH access",
            "Install prerequisite packages ahead of PSMP installation",
          ],
          "A ready Linux host that can be configured as a PSMP server or added as a CyberArk-managed target machine."
        ),
      },
      {
        title: "Lab 1.4 — Promoting a Windows Server to Domain Controller",
        type: "lab",
        durationMin: 50,
        content: labDoc(
          "CyberArk PAM relies heavily on Active Directory for authentication and account management. This lab builds the lab's own domain so LDAP integration and domain account onboarding can be demonstrated later.",
          [
            "Understand the role of Active Directory Domain Services (AD DS) in a PAM lab",
            "Promote a Windows Server to a domain controller",
            "Create test organizational units, groups, and user/service accounts",
          ],
          [
            "Install the AD DS server role",
            "Run the Active Directory Domain Services Configuration Wizard to create a new forest/domain",
            "Verify DNS is installed and functioning alongside AD",
            "Create OUs and sample privileged/service accounts for later CyberArk onboarding",
          ],
          "A functioning domain controller providing DNS and Active Directory services for every other VM in the lab."
        ),
      },
    ],
  },
  {
    title: "Lab Phase 2 — CyberArk Vault Deployment",
    description:
      "Deploying and initializing the Digital Vault — the encrypted core of the CyberArk platform.",
    lessons: [
      {
        title: "Lab 2.1 — CyberArk Vault Install",
        type: "lab",
        durationMin: 60,
        content: labDoc(
          "The Digital Vault is the encrypted core of the CyberArk platform, storing all privileged credentials, session recordings, and audit data. This lab covers a self-hosted Vault installation on the Windows Server built in Phase 1.",
          [
            "Understand Vault architecture: Safes, Server Keys, and the Vault database",
            "Install the CyberArk Vault software and initialize the Vault",
            "Configure the Server Key, license, and initial administrative access",
          ],
          [
            "Review hardware/OS prerequisites and apply the CyberArk hardening baseline",
            "Run the Vault installation wizard and set the Master/Recovery passwords",
            "Import the license file and verify PrivateArk Server service is running",
            "Connect using PrivateArk Client to confirm the Vault is reachable",
            "Create the first built-in safes and an initial administrative user",
          ],
          "A running, licensed CyberArk Vault accessible via PrivateArk Client, ready to host PVWA, CPM, and PSM connections."
        ),
      },
    ],
  },
  {
    title: "Lab Phase 3 — Core PAM Components",
    description:
      "PVWA, CPM, PSM, PSMP, and LDAP integration — connecting the Vault to people, policies, and targets.",
    lessons: [
      {
        title: "Lab 3.1 — PVWA (Password Vault Web Access)",
        type: "lab",
        durationMin: 50,
        content: labDoc(
          "PVWA is the browser-based interface end users, application owners, and administrators use to request, view, and manage privileged accounts and sessions. This lab installs PVWA and connects it to the Vault.",
          [
            "Understand PVWA's role as the web front-end to the Vault",
            "Install PVWA on IIS and connect it to the Vault server",
            "Configure basic authentication and verify end-to-end login",
          ],
          [
            "Install IIS and required .NET prerequisites on the PVWA server",
            "Run the PVWA installation wizard, pointing it to the Vault IP/port",
            "Configure the vault.ini and generate/verify the connection to the Vault",
            "Log in to PVWA as an administrative user and confirm Safes are visible",
          ],
          "A working PVWA portal where users can log in and see the safes/accounts they are entitled to."
        ),
      },
      {
        title: "Lab 3.2 — CPM (Central Policy Manager)",
        type: "lab",
        durationMin: 50,
        content: labDoc(
          "CPM is the engine that automatically changes, verifies, and reconciles privileged account passwords according to configured policies. This lab installs CPM and runs a first password change on a lab account.",
          [
            "Understand CPM's role in automated password rotation and verification",
            "Install and register the CPM with the Vault",
            "Configure a platform policy and trigger a manual password change",
          ],
          [
            "Install the CPM component and register the CPM user with the Vault",
            "Assign the CPM to a Safe containing a test account",
            "Configure or select a platform (e.g., Windows Domain Account) with a rotation policy",
            "Trigger a manual 'Change' and confirm the new password syncs to the target",
          ],
          "A functioning CPM that successfully changes and verifies the password of a test privileged account."
        ),
      },
      {
        title: "Lab 3.3 — PSM (Privileged Session Manager)",
        type: "lab",
        durationMin: 55,
        content: labDoc(
          "PSM provides isolated, monitored, and recorded access to Windows targets without ever exposing the underlying password to the end user. This lab installs PSM and walks through launching a recorded session.",
          [
            "Understand PSM's role in session isolation and recording for Windows targets",
            "Install PSM and register it with the Vault and PVWA",
            "Launch a live PSM session and review the resulting recording",
          ],
          [
            "Install the PSM component on a dedicated Windows server",
            "Register the PSM with the Vault and link it in PVWA's configuration",
            "Configure a platform to require PSM for connections",
            "Connect to a target account through PVWA via PSM and confirm the session is recorded",
          ],
          "A recorded, isolated Windows session accessible and reviewable from PVWA, with no direct credential exposure to the end user."
        ),
      },
      {
        title: "Lab 3.4 — PSMP (Privileged Session Manager for SSH)",
        type: "lab",
        durationMin: 55,
        content: labDoc(
          "PSMP extends the same isolation and recording model to SSH-based access on Unix/Linux targets. This lab installs PSMP on the Linux server built in Phase 1 and validates an end-to-end SSH session.",
          [
            "Understand PSMP's role for SSH session isolation and recording",
            "Install and configure PSMP on a Linux host",
            "Connect to a Unix/Linux target through PSMP and verify recording",
          ],
          [
            "Confirm Linux prerequisites (packages, PAM modules) are in place",
            "Install the PSMP RPM/package and register it with the Vault",
            "Configure the connection component and a Unix platform to route through PSMP",
            "Connect via SSH client using the PSMP connection string and validate the session",
          ],
          "A working PSMP setup that brokers and records SSH sessions to Linux targets, mirroring PSM's function on the Windows side."
        ),
      },
      {
        title: "Lab 3.5 — LDAP Integration",
        type: "lab",
        durationMin: 45,
        content: labDoc(
          "Rather than maintaining separate CyberArk-only users, most deployments authenticate against Active Directory. This lab integrates the lab's AD domain with CyberArk for authentication and group-based authorization.",
          [
            "Understand how CyberArk maps LDAP/AD groups to Vault authorizations",
            "Configure an LDAP directory mapping in the CyberArk Vault",
            "Test login using a domain account and confirm group-based permissions",
          ],
          [
            "Gather LDAP bind account, base DN, and directory server details from the lab DC",
            "Add and configure the LDAP integration in PrivateArk / PVWA administration",
            "Create directory mappings linking AD groups to Vault authorizations",
            "Log in to PVWA with a domain user and confirm the expected access level",
          ],
          "Domain users can authenticate to CyberArk with their AD credentials and receive access based on their group membership."
        ),
      },
    ],
  },
  {
    title: "Lab Phase 4 — Day-Two Operations & Governance",
    description:
      "Account lifecycle, password policies, session oversight, platform administration, and audit evidence.",
    lessons: [
      {
        title: "Lab 4.1 — Account Management",
        type: "lab",
        durationMin: 50,
        content: labDoc(
          "This lab covers the full lifecycle of a privileged account inside CyberArk — from onboarding through ownership and eventual removal — using both manual and automated (discovery) methods.",
          [
            "Onboard privileged accounts manually and via Accounts Discovery",
            "Assign accounts to appropriate Safes and platforms",
            "Understand account ownership, ACLs, and access workflows (request/approve)",
          ],
          [
            "Manually onboard a local and a domain privileged account into a Safe",
            "Run an Accounts Discovery scan against a target and review pending accounts",
            "Assign safe members and configure a dual-control (request/approve) workflow",
            "Retire/remove a test account and confirm it is no longer manageable",
          ],
          "A clear, repeatable process for bringing privileged accounts under CyberArk management and controlling who can access them."
        ),
      },
      {
        title: "Lab 4.2 — Password Management",
        type: "lab",
        durationMin: 50,
        content: labDoc(
          "This lab focuses on the policies that govern how passwords are generated, rotated, verified, and reconciled — the core value proposition of the CPM covered earlier.",
          [
            "Configure password complexity and rotation policies on a platform",
            "Differentiate automatic change, verify, and reconcile operations",
            "Handle a simulated 'password out of sync' scenario",
          ],
          [
            "Edit a platform's password policy (length, complexity, change frequency)",
            "Run Verify on an account and interpret success/failure results",
            "Manually change a target's password out-of-band, then run Reconcile from CyberArk",
            "Review the account's password change history in PVWA",
          ],
          "Confidence configuring and troubleshooting the automated password lifecycle for a managed account."
        ),
      },
      {
        title: "Lab 4.3 — Session Management",
        type: "lab",
        durationMin: 45,
        content: labDoc(
          "Beyond individual PSM/PSMP sessions, this lab covers the operational side of session oversight: live monitoring, recording review, and session controls available to security teams.",
          [
            "Locate and play back a recorded PSM/PSMP session",
            "Understand live session monitoring and suspend/terminate controls",
            "Configure session recording and universal keystroke logging (UKL) settings",
          ],
          [
            "Launch a test session and immediately locate it under Active Sessions in PVWA",
            "Practice suspending and terminating a live session",
            "Open the completed recording from Monitoring and Recordings",
            "Review/adjust the platform's session recording and UKL settings",
          ],
          "Practical familiarity with monitoring privileged sessions in real time and auditing them after the fact."
        ),
      },
      {
        title: "Lab 4.4 — CyberArk Administration",
        type: "lab",
        durationMin: 50,
        content: labDoc(
          "This lab steps back from individual components to day-to-day platform administration: Safe design, platform management, user/group administration, and basic health checks.",
          [
            "Design a Safe structure aligned to teams/applications",
            "Create and manage platforms, and adjust component (CPM/PSM) assignments",
            "Perform routine health checks across Vault, PVWA, CPM, and PSM",
          ],
          [
            "Create a new Safe with defined ownership and member permissions",
            "Duplicate and customize a platform for a new use case",
            "Review PVWA System Health to confirm all components report as active",
            "Walk through basic troubleshooting steps for a component reporting unhealthy",
          ],
          "Working knowledge of the routine administrative tasks needed to keep a CyberArk environment organized and healthy."
        ),
      },
      {
        title: "Lab 4.5 — Audit Controls",
        type: "lab",
        durationMin: 45,
        content: labDoc(
          "The final lab ties the whole environment together by focusing on the audit trail CyberArk produces — essential for compliance, investigations, and demonstrating control effectiveness.",
          [
            "Locate and interpret the Vault's audit/activity log",
            "Correlate an account action (change/access) with its audit entry and any session recording",
            "Understand available reporting options for compliance evidence",
          ],
          [
            "Perform a sample account action, then locate the corresponding entry in the audit log",
            "Cross-reference an activity log entry with its linked session recording",
            "Generate a built-in report (e.g., Privileged Accounts Inventory or Activity Report)",
            "Discuss retention settings for logs and recordings",
          ],
          "The ability to trace any privileged action end-to-end, from the audit log back to the underlying session recording, for compliance and investigation purposes."
        ),
      },
    ],
  },
]
