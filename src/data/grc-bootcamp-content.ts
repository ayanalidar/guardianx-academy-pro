// GRC BOOTCAMP — IT GRC PROFESSIONAL · Complete Course Structure
// Transcribed 1:1 from the official curriculum PDF supplied by the program owner.
// Header: 26 Modules • 9 Phases • 8 Capstone Projects • Company Simulation • AI Governance Bonus.
// The PDF details modules MOD 1–5, 7–8, 9, 14, 15–17, 21, 22, 24 plus the capstone
// projects and the TechNova Inc. simulation — all are represented here. The phase
// table and module numbering are kept exactly as printed in the source PDF.

import type { SyncCourseContent } from "./grc-content-types"

export const GRC_BOOTCAMP_CONTENT: SyncCourseContent = {
  slug: "grc-bootcamp",
  courseId: "cmuup49zj0005jx046441y9n0",
  fields: {
    description:
      "A practical, job-ready curriculum covering every framework, tool, and skill employers ask for. Built for career-switchers and professionals deepening their GRC expertise — 26 modules across 9 phases, 8 mandatory capstone projects, a 6-week company simulation and an AI governance bonus.",
    longDescription: `**IT GRC PROFESSIONAL — Complete Course Structure**
*26 Modules • 9 Phases • 8 Capstone Projects • Company Simulation • AI Governance Bonus*

### Course Overview
A practical, job-ready curriculum covering every framework, tool, and skill employers ask for. Built for career-switchers and professionals deepening their GRC expertise.

| Phase | Modules | Focus |
| --- | --- | --- |
| 1 — Foundation | 1–3 | GRC fundamentals, cybersecurity basics, IT risk management |
| 2 — Risk & Controls | 4–6 | Understanding controls, ITGC, IT application controls |
| 3 — Audit | 7–8 | IT audit lifecycle, evidence, findings, reporting |
| 4 — Frameworks | 9–13 | ISO, NIST, SOC, SOX, PCI DSS |
| 5 — Privacy | 14 | GDPR, DPDP Act, CCPA, privacy assessments |
| 6 — Specialised GRC | 15–17 | TPRM, IAM, CM & IR, BCM |
| 7 — Enterprise GRC | 18–20 | Regulations, GRC platforms, analytics, documentation |
| 8 — Capstone | Projects | 8 projects |

### TechNova Inc. — 6-Week Company Simulation
Students become the GRC team of TechNova Inc. and work from a full company dossier — org chart, network diagram, asset inventory, cloud architecture, vendor list, policies, SOC 2 report, ISO certificate, vulnerability report, pen-test report, access listing, change tickets, incident report, BCP, DR plan and privacy documentation.

**End goal:** students graduate with a full portfolio of real GRC deliverables — not just a certificate.`,
    tags:
      "GRC, IT GRC, Governance, Risk, Compliance, ITGC, ISO 27001, NIST, SOC 2, SOX, PCI DSS, GDPR, DPDP Act, TPRM, IAM, BCM, AuditBoard, ServiceNow, Archer, Vanta, Capstone Projects",
    whatYouWillLearn: [
      "Phase 1 — Foundation: GRC fundamentals, cybersecurity basics, IT risk management",
      "Phase 2 — Risk & Controls: understanding controls, ITGC, IT application controls",
      "Phase 3 — Audit: IT audit lifecycle, evidence, findings, reporting",
      "Phase 4 — Frameworks & Standards: ISO, NIST, COBIT, SOC, SOX, PCI DSS",
      "Phase 5 — Privacy: GDPR, DPDP Act, CCPA, privacy assessments",
      "Phase 6 — Specialised GRC: TPRM, IAM, CM & IR, BCM",
      "Phase 7 — Enterprise GRC: regulations, GRC platforms, analytics, documentation",
      "Phase 8 — Capstone: 8 mandatory projects, each producing a real portfolio artifact you can show a hiring manager",
      "TechNova Inc. 6-week company simulation — graduate with a full portfolio of real GRC deliverables, not just a certificate",
    ],
    whoShouldAttend: [
      "Career-switchers building a practical, job-ready path into GRC",
      "Professionals deepening their GRC expertise",
    ],
    toolsCovered: [
      "ServiceNow GRC / IRM",
      "RSA Archer",
      "AuditBoard",
      "OneTrust",
      "Drata",
      "LogicGate",
      "IBM OpenPages",
      "Diligent",
      "Workiva",
      "Vanta",
      "Advanced Excel — executive GRC risk dashboard",
    ],
    careerOutcomes: [
      "GRC Analyst",
      "Information Security Auditor",
      "Risk Management Specialist",
      "Compliance Analyst",
      "Third-Party Risk Management (TPRM) Analyst",
      "Information Security Policy Writer / Specialist",
      "Graduate with a full portfolio of real GRC deliverables — 8 capstone projects plus the TechNova Inc. company simulation",
    ],
  },
  modules: [
    {
      title: "Phase 1 — Foundation (Modules 1–3)",
      description: "GRC fundamentals, cybersecurity basics, IT risk management.",
      lessons: [
        {
          title: "MOD 1 — Introduction to IT GRC",
          durationMin: 40,
          content: `### MOD 1 — Introduction to IT GRC

**TOPICS**

- What is GRC?
- Governance vs Risk vs Compliance
- IT GRC vs Cybersecurity GRC
- IT Risk vs Information Security Risk
- Technology Risk
- Operational Risk
- Enterprise Risk Management
- IT Audit vs GRC
- Compliance vs Security
- 3 Lines of Defense
- Role of C-Suite / Internal Audit / Compliance / Legal / IT / Security
- GRC career paths

> 🛠 **PRACTICAL**
> Build your first GRC program for a fictional company.`,
        },
        {
          title: "MOD 2 — Cybersecurity Fundamentals",
          durationMin: 40,
          content: `### MOD 2 — Cybersecurity Fundamentals

**CORE CONCEPTS**

- CIA Triad
- Threat
- Vulnerability
- Risk
- Asset
- Control
- Attack / Incident / Breach
- Threat actor
- Security monitoring: SIEM / DLP
- IDS/IPS
- Vulnerability management
- Penetration testing

> 🛠 **PRACTICAL**
> Fictional security incident — identify: Asset → Threat → Vulnerability → Risk → Control → Residual Risk.`,
        },
        {
          title: "MOD 3 — IT Risk Management ⭐Core Module",
          durationMin: 45,
          content: `### MOD 3 — IT Risk Management ⭐Core Module

**RISK CONCEPTS**

- Risk identification
- Risk assessment
- Risk analysis
- Risk evaluation
- Risk treatment
- Risk acceptance
- Risk avoidance
- Risk mitigation
- Risk transfer
- Risk register
- Inherent risk
- Residual risk

**RISK MEASUREMENT**

- Control risk
- Likelihood
- Impact
- Risk scoring
- Risk appetite
- Risk tolerance
- Risk criteria
- Risk owners
- Control owners
- Qualitative assessment
- Quantitative assessment

**RISK MANAGEMENT TOOLS**

- Risk treatment plans
- Risk exceptions
- Risk acceptance forms
- Risk remediation

> 🛠 **PRACTICAL**
> Create: Risk assessment · Risk matrix · Risk register · Risk treatment plan · Risk acceptance form.`,
        },
      ],
    },
    {
      title: "Phase 2 — Risk & Controls (Modules 4–6)",
      description: "Understanding controls, ITGC, IT application controls.",
      lessons: [
        {
          title: "MOD 4 — Understanding Controls",
          durationMin: 40,
          content: `### MOD 4 — Understanding Controls

**CONTROL TYPES**

- Preventive
- Detective
- Corrective
- Compensating
- Key vs Non-key controls
- Physical
- Technical
- Administrative

**CRITICAL CONCEPTS**

- Design effectiveness
- Operating effectiveness
- Control owner vs Process owner
- Control frequency
- Control population
- Evidence
- Exceptions

> 🛠 **PRACTICAL**
> Classify 10 controls by type, nature, and key/non-key status.`,
        },
        {
          title: "MOD 5 — ITGC — IT General Controls ⭐Core Module",
          durationMin: 50,
          content: `### MOD 5 — ITGC — IT General Controls ⭐Core Module

**ACCESS MANAGEMENT**

- User provisioning
- Modification
- Deprovisioning
- Privileged access
- MFA
- Password controls
- Access reviews
- Recertification
- Segregation of Duties

**CHANGE MANAGEMENT**

**IT OPERATIONS**

**BACKUP & RECOVERY**

- Backup frequency
- Retention
- Encryption
- Restoration testing
- RPO RTO
- ITGC vs ITAC

> 🛠 **PRACTICAL**
> Full ITGC test: 25 users, 10 terminated employees, 15 changes, 1 backup process. Produce an audit workpaper.

> 🛠 **PRACTICAL**
> Scenario: System prevents invoices above $50,000 without manager approval. Define: Control objective · Risk · Evidence · Test procedure · Result.`,
        },
      ],
    },
    {
      title: "Phase 3 — Audit (Modules 7–8)",
      description: "IT audit lifecycle from planning to reporting.",
      lessons: [
        {
          title: "MOD 7–8 — IT Audit & Assurance",
          durationMin: 45,
          content: `### MOD 7–8 — IT Audit & Assurance

**AUDIT TYPES**

- Internal vs external audit
- Regulatory audit
- Compliance assessment
- SOC audit
- Certification audit
- Readiness assessment

**AUDIT LIFECYCLE**

- Audit planning
- Scoping
- Walkthroughs
- Evidence collection
- Sampling
- Test procedures
- Evidence evaluation
- Findings
- Root cause analysis
- Corrective action
- Remediation
- Audit report

**EVIDENCE QUALITY**

- Sufficient vs appropriate evidence
- Reliable vs unreliable evidence
- Exceptions

> 🛠 **PRACTICAL**
> Mini IT audit end-to-end: Planning → Request List → Evidence → Testing → Findings → Report.`,
        },
      ],
    },
    {
      title: "Phase 4 — Frameworks & Standards (Modules 9–13)",
      description: "ISO, NIST, COBIT, SOC, SOX, PCI DSS.",
      lessons: [
        {
          title: "MOD 9 — GRC Framework Landscape",
          durationMin: 45,
          content: `### MOD 9 — GRC Framework Landscape

**ISO FAMILY & OTHER STANDARD**

**NIST**

**ISACA & OTHERS**

**PCI DSS**

**SOC & SOX**

**ISMS STRUCTURE (CLAUSES 4–10)**

- Context of organization
- Interested parties
- Scope
- Leadership
- Information security policy
- Risk assessment
- Risk treatment
- Statement of Applicability
- Internal audit
- Management review
- Corrective action
- Continual improvement
- Certification process

> 🛠 **PRACTICAL**
> Build: ISO 27001 Gap Assessment + Statement of Applicability + Risk Register.`,
        },
      ],
    },
    {
      title: "Phase 5 — Privacy & Data Protection (Module 14)",
      description: "GDPR, DPDP Act, CCPA, privacy assessments.",
      lessons: [
        {
          title: "MOD 14 — Privacy for GRC Professionals",
          durationMin: 40,
          content: `### MOD 14 — Privacy for GRC Professionals

**CORE CONCEPTS**

- Personal data
- Sensitive data
- Data subject
- Controller
- Processor
- Purpose limitation
- Data minimization
- Retention
- Data lifecycle

**INDIA & GLOBAL REGULATIONS**

- DPDP Act (India)
- Data fiduciary
- GDPR
- CCPA/CPRA
- HIPAA
- GLBA
- LGPD
- PIPEDA`,
        },
      ],
    },
    {
      title: "Phase 6 — Specialised GRC (Modules 15–17)",
      description: "TPRM, IAM, CM & IR, BCM.",
      lessons: [
        {
          title: "MOD 15 — Third-Party Risk Management (TPRM)",
          durationMin: 40,
          content: `### MOD 15 — Third-Party Risk Management (TPRM)

**PROGRAM FOUNDATIONS**

- Vendor vs supplier vs third party
- Onboarding

**DUE DILIGENCE**

**CONTRACTING & MONITORING**

> 🛠 **PRACTICAL**
> Full vendor risk assessment: Onboarding → Questionnaire → Evidence → Risk rating → Remediation → Approval.`,
        },
        {
          title: "MOD 16 — Governance",
          durationMin: 35,
          content: `### MOD 16 — Governance

- Access certification
- SoD
- User Access Reviews

> 🛠 **PRACTICAL**
> Perform a User Access Review with 100 fictional users — identify exceptions and document findings.`,
        },
        {
          title: "MOD 17 — Change Management & Incident Management",
          durationMin: 40,
          content: `### MOD 17 — Change Management & Incident Management

**INCIDENT RESPONSE**

**CHANGE MANAGEMENT CONCEPTS**

**BCM CONCEPTS**

**TESTING & STANDARDS**

> 🛠 **PRACTICAL**
> Build: BIA + BCP + DR scenario for a fictional company.`,
        },
      ],
    },
    {
      title: "Phase 7 — Enterprise GRC (Modules 18–20)",
      description: "Regulations, GRC platforms, analytics, documentation.",
      lessons: [
        {
          title: "MOD 21 — Regulatory Compliance (Overview)",
          durationMin: 40,
          content: `### MOD 21 — Regulatory Compliance (Overview)

**COMPLIANCE MANAGEMENT**

- Regulatory obligations
- Compliance mapping
- Regulatory change management
- Control mapping
- Compliance monitoring

**FINANCIAL SERVICES**

- SOX
- GLBA
- PCI DSS
- RBI expectations

**HEALTHCARE & PRIVACY**

- HIPAA
- DPDP
- GDPR
- CCPA/CPRA

**TECHNOLOGY & EMERGING**

- DORA
- NIS2
- EU AI Act`,
        },
        {
          title: "MOD 22 — GRC Platforms & Automation",
          durationMin: 45,
          content: `### MOD 22 — GRC Platforms & Automation

**GRC PLATFORMS**

- ServiceNow GRC / IRM
- RSA Archer
- AuditBoard
- OneTrust
- Drata
- LogicGate
- IBM OpenPages
- Diligent
- Workiva
- Vanta

**WHAT TO MANAGE IN A GRC PLATFORM**

- Risk register
- Control library
- Compliance library
- Policy management
- Audit management
- Issue management
- TPRM
- Evidence
- Workflow
- Dashboards
- Reporting

**DASHBOARDS & REPORTING**

- Risk dashboards
- Compliance dashboards
- Audit findings tracker
- Vendor risk
- Control effectiveness
- Remediation aging

> 🛠 **PRACTICAL**
> Build an Executive GRC Risk Dashboard Excel.`,
        },
        {
          title: "MOD 24 — Professional GRC Documentation",
          durationMin: 40,
          content: `### MOD 24 — Professional GRC Documentation

**DOCUMENTS YOU MUST BE ABLE TO PRODUCE**

- Policies & Standards
- Procedures
- Control narratives
- Risk registers
- Control matrices
- RCM
- Audit workpapers
- Evidence requests
- Evidence trackers
- Gap assessments
- Findings
- CAPA
- Remediation plans
- Risk acceptance
- Exception forms
- Management reports
- Executive summaries
- Security questionnaires
- Vendor assessments
- Audit reports`,
        },
      ],
    },
    {
      title: "Phase 8 — Capstone Projects (8 Mandatory Deliverables)",
      description:
        "Projects are mandatory, not optional. Each produces a real portfolio artifact you can show a hiring manager.",
      lessons: [
        {
          title: "Project 1 · IT Risk Assessment",
          durationMin: 45,
          content: `### Project 1 · IT Risk Assessment

- Asset inventory
- Threats & vulnerabilities
- Risk register
- Risk rating
- Treatment plan`,
        },
        {
          title: "Project 2 · ITGC Audit",
          durationMin: 45,
          content: `### Project 2 · ITGC Audit

- Access testing
- Change management testing
- Backup testing
- Evidence review
- Exception identification
- Finding creation`,
        },
        {
          title: "Project 3 · ISO 27001 Gap Assessment",
          durationMin: 45,
          content: `### Project 3 · ISO 27001 Gap Assessment

- Current state
- Requirement mapping
- Gap identification
- Risk
- Recommendation`,
        },
        {
          title: "Project 4 · SOC 2 Report Review",
          durationMin: 45,
          content: `### Project 4 · SOC 2 Report Review

- Scope & period
- Exceptions
- Complementary controls
- Subservice organizations
- Risk implications`,
        },
        {
          title: "Project 5 · TPRM Assessment",
          durationMin: 45,
          content: `### Project 5 · TPRM Assessment

- Onboarding
- Questionnaire
- Evidence review
- Risk rating
- Remediation
- Approval`,
        },
        {
          title: "Project 6 · Cloud Risk Assessment",
          durationMin: 45,
          content: `### Project 6 · Cloud Risk Assessment

- AWS/Azure environment
- Shared responsibility
- IAM controls
- Logging & monitoring
- Risk findings`,
        },
        {
          title: "Project 7 · Privacy Assessment",
          durationMin: 45,
          content: `### Project 7 · Privacy Assessment

- PIA / DPIA
- Data flow mapping
- Risks
- Controls
- Residual risk`,
        },
        {
          title: "Project 8 · Executive GRC Dashboard",
          durationMin: 45,
          content: `### Project 8 · Executive GRC Dashboard

- Overall risk
- High risks
- Open findings
- Overdue remediation
- Vendor risk
- Control effectiveness`,
        },
        {
          title: "TechNova Inc. — 6-Week Company Simulation",
          durationMin: 45,
          content: `### TechNova Inc. — 6-Week Company Simulation

Students become the GRC team of TechNova Inc. and receive a full company dossier: org chart, network diagram, asset inventory, cloud architecture, vendor list, policies, SOC 2 report, ISO certificate, vulnerability report, pen-test report, access listing, change tickets, incident report, BCP, DR plan, and privacy documentation.

| Week | Deliverable |
| --- | --- |
| Week 1 | Perform full IT risk assessment across TechNova's environment. |
| Week 2 | Build a unified control library mapped to ISO 27001, NIST CSF, and SOC 2. |
| Week 3 | Perform ITGC testing across access management, change management, and backup controls. |
| Week 4 | Complete a vendor risk assessment for TechNova's three critical suppliers. |
| Week 5 | Perform ISO 27001 / SOC 2 gap assessment and produce a remediation roadmap. |
| Week 6 | Prepare and present the executive GRC report to the simulated board. |

> 🛠 **PRACTICAL**
> End goal: students graduate with a full portfolio of real GRC deliverables — not just a certificate.`,
        },
      ],
    },
  ],
}
