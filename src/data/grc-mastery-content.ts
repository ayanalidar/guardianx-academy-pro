// GRC MASTERY (IT GRC 360⁰) — Complete Curriculum & Module Guide
// Transcribed 1:1 from the official curriculum PDF supplied by the program owner.
// 9 curriculum modules + the 2026 GRC Tools Landscape appendix.
// NOTE: the PDF cover reads "IT GRC 360⁰" (360 with superscript 0) — rendered
// here as "IT GRC 360". The PDF's own overview heading says "12 Modules at a
// Glance" but lists exactly 9 modules (matching the cover); heading normalized,
// all 9 rows kept verbatim.

import type { SyncCourseContent } from "./grc-content-types"

export const GRC_MASTERY_CONTENT: SyncCourseContent = {
  slug: "governance-risk-compliance",
  courseId: "cmthnfpt20001ju04ml81ahj3",
  fields: {
    description:
      "The complete IT GRC curriculum — 9 modules, 50+ topics and 100+ subtopics spanning governance frameworks, IT risk, compliance (SOX, ISO 27001, NIST CSF, PCI DSS), IT audit, TPRM, GRC platforms, security controls and operational resilience.",
    longDescription: `**IT GRC 360⁰ — GRC MASTERY COURSE**
*Complete Curriculum & Module Guide — 9 Modules • 50+ Topics • 100+ Subtopics*

### Who this course is for
Professionals switching into IT GRC from IT, finance, audit, or cybersecurity backgrounds — and existing GRC practitioners who want to deepen their knowledge, fill gaps, or prepare for senior roles and certifications.

### What employers in 2026 are asking for
Based on analysis of 2026 job postings across Big 4, banks, fintechs, insurers, and tech companies: SOX/ITGC expertise, NIST CSF, ISO 27001, PCI DSS v4.0, TPRM, GRC tool proficiency (AuditBoard, ServiceNow, Archer, Vanta), cloud risk (AWS/Azure), and emerging areas: AI governance, DORA, NIS2.

### Certification alignment
Every module is mapped to one or more professional certifications: CISA (ISACA) | CRISC (ISACA) | CISM (ISACA) | ISO 27001 LI/LA | CPISI (PCI-DSS) | CIPP/E | CIA (IIA) | CompTIA Security+ | ServiceNow CSA.

### Course Overview — Modules at a Glance

| Module | Title | Topics |
| --- | --- | --- |
| Module 01 | Foundations of IT GRC | 4 topics |
| Module 02 | IT Governance Frameworks | 4 topics |
| Module 03 | IT Risk Management | 4 topics |
| Module 04 | IT Compliance — Frameworks and Regulations | 6 topics |
| Module 05 | IT Audit and Assurance | 4 topics |
| Module 06 | Third-Party Risk Management (TPRM) | 4 topics |
| Module 07 | GRC Technology and Tools | 5 topics |
| Module 08 | Information Security Controls | 4 topics |
| Module 09 | Operational Resilience and Business Continuity | 3 topics |`,
    tags:
      "IT GRC, Governance, Risk, Compliance, SOX, ITGC, ISO 27001, NIST CSF, PCI DSS, TPRM, AuditBoard, ServiceNow, Archer, Vanta, DORA, NIS2, AI Governance, Cloud Risk",
    whatYouWillLearn: [
      "Foundations of IT GRC — what GRC is, why it exists, how the three pillars connect, and the control framework mindset",
      "IT Governance Frameworks — COBIT, ITIL, IT policy and standards governance, and security awareness programs",
      "IT Risk Management — NIST SP 800-30 / ISO 31000 assessments, risk registers, KRIs, control testing and assurance",
      "IT Compliance — SOX/ICFR, ISO 27001:2022, NIST CSF 2.0, PCI DSS v4.0, DORA, NIS2, GDPR, HIPAA and SOC 2",
      "IT Audit and Assurance — audit lifecycle, ITGC testing deep dive, and reading SOC 1 / SOC 2 reports",
      "Third-Party Risk Management — program design, vendor due diligence, TPRM platforms, ongoing monitoring and offboarding",
      "GRC Technology and Tools — hands-on AuditBoard (OpsAudit, RiskOversight, CrossComply, TPRM), ServiceNow and Archer",
      "Information Security Controls — IAM, network and infrastructure security, encryption and data protection, incident management",
      "Operational Resilience and Business Continuity — BCM/BIA, disaster recovery planning and testing, DORA introduction",
      "The 2026 GRC tools landscape — AuditBoard, ServiceNow IRM, RSA Archer, MetricStream, OneTrust, Vanta, Drata, IBM OpenPages, Power BI/Tableau and advanced Excel",
    ],
    whoShouldAttend: [
      "Professionals switching into IT GRC from IT, finance, audit, or cybersecurity backgrounds",
      "Existing GRC practitioners who want to deepen their knowledge, fill gaps, or prepare for senior roles and certifications",
    ],
    toolsCovered: [
      "AuditBoard — Big 4, large enterprises, SOX filers, internal audit teams (SOX HUB, OpsAudit, RiskOversight, CrossComply, TPRM modules)",
      "ServiceNow IRM — large enterprises, banks, telcos, government (Policy & Compliance, Risk, Audit, Vendor Risk modules)",
      "RSA Archer — financial services, defence, global enterprises (highly customisable legacy platform)",
      "MetricStream — global banks, healthcare, insurance (comprehensive IRM platform, strong in BFSI)",
      "OneTrust — privacy-first organisations, GDPR compliance teams (privacy management, TPRM, consent, data mapping)",
      "Vanta — SaaS companies, startups, tech companies needing SOC 2 (automated continuous compliance)",
      "Drata — mid-market SaaS, fintech startups (audit hub with direct auditor evidence access)",
      "IBM OpenPages — large financial institutions, IBM ecosystem organisations (model risk and operational risk)",
      "Power BI / Tableau — GRC analytics, risk heat maps, control coverage dashboards",
      "Excel (Advanced) — population analysis, sampling workpapers, control matrices, risk registers",
    ],
    careerOutcomes: [
      "GRC roles across Big 4, banks, fintechs, insurers, tech companies and healthcare",
      "The Big 4 GRC career track vs. the industry (in-house) GRC career track",
      "Senior GRC positions — deepen knowledge, fill gaps, prepare for senior roles and certifications",
      "Certification readiness: CISA, CRISC, CISM (ISACA) · ISO 27001 LI/LA · CPISI (PCI-DSS) · CIPP/E · CIA (IIA) · CompTIA Security+ · ServiceNow CSA",
    ],
  },
  modules: [
    {
      title: "Module 01 — Foundations of IT GRC",
      description:
        "What GRC is, why it exists, and how the three pillars connect — the essential base for everything that follows.",
      lessons: [
        {
          title: "Course Guide — Who This Is For · 2026 Employer Demand · Certification Alignment",
          durationMin: 25,
          content: `**IT GRC 360⁰ — GRC MASTERY COURSE**
*Complete Curriculum & Module Guide — 9 Modules • 50+ Topics • 100+ Subtopics*

### Who this course is for
Professionals switching into IT GRC from IT, finance, audit, or cybersecurity backgrounds — and existing GRC practitioners who want to deepen their knowledge, fill gaps, or prepare for senior roles and certifications.

### What employers in 2026 are asking for
Based on analysis of 2026 job postings across Big 4, banks, fintechs, insurers, and tech companies: SOX/ITGC expertise, NIST CSF, ISO 27001, PCI DSS v4.0, TPRM, GRC tool proficiency (AuditBoard, ServiceNow, Archer, Vanta), cloud risk (AWS/Azure), and emerging areas: AI governance, DORA, NIS2.

### Certification alignment
Every module is mapped to one or more professional certifications: CISA (ISACA) | CRISC (ISACA) | CISM (ISACA) | ISO 27001 LI/LA | CPISI (PCI-DSS) | CIPP/E | CIA (IIA) | CompTIA Security+ | ServiceNow CSA.

### Course Overview — Modules at a Glance

| Module | Title | Topics |
| --- | --- | --- |
| Module 01 | Foundations of IT GRC | 4 topics |
| Module 02 | IT Governance Frameworks | 4 topics |
| Module 03 | IT Risk Management | 4 topics |
| Module 04 | IT Compliance — Frameworks and Regulations | 6 topics |
| Module 05 | IT Audit and Assurance | 4 topics |
| Module 06 | Third-Party Risk Management (TPRM) | 4 topics |
| Module 07 | GRC Technology and Tools | 5 topics |
| Module 08 | Information Security Controls | 4 topics |
| Module 09 | Operational Resilience and Business Continuity | 3 topics |`,
        },
        {
          title: "01.1 What is IT GRC?",
          durationMin: 40,
          content: `### 01.1 What is IT GRC?

- Definition of Governance, Risk, and Compliance and how the three pillars interrelate
- Why organizations invest in GRC: regulatory pressure, stakeholder trust, operational resilience
- The difference between IT GRC, Cybersecurity GRC, and Enterprise Risk Management (ERM)
- GRC vs. Integrated Risk Management (IRM)`,
        },
        {
          title: "01.2 IT GRC Organizational Structure",
          durationMin: 40,
          content: `### 01.2 IT GRC Organizational Structure

- How GRC sits within organizations: first, second, and third lines of defence model
- GRC function within the CISO office vs. Internal Audit vs. Risk function
- Key stakeholders: Board, Audit Committee, C-suite, IT, Legal, External Auditors
- Working with Internal Audit, External Audit, and Regulators`,
        },
        {
          title: "01.3 The Control Framework Mindset",
          durationMin: 45,
          content: `### 01.3 The Control Framework Mindset

- What is a control? Preventive, detective, corrective, compensating
- Control design vs. control operating effectiveness — the two tests every auditor runs
- What makes a good control: specificity, ownership, evidence, frequency
- Building a controls library from scratch
- Control mapping across multiple frameworks: the unified control framework concept`,
        },
        {
          title: "01.4 GRC Industry Landscape 2026",
          durationMin: 40,
          content: `### 01.4 GRC Industry Landscape 2026

- Who hires GRC professionals: Big 4, banks, fintechs, insurers, tech companies, healthcare
- Salary benchmarks by level and geography (India, US, UK, Middle East)
- The Big 4 GRC career track vs. industry (in-house) GRC career track
- What makes a GRC CV stand out: certifications, tools, frameworks, sector experience
- Market trends: AI governance, continuous compliance, cloud risk, DORA, NIS2`,
        },
      ],
    },
    {
      title: "Module 02 — IT Governance Frameworks",
      lessons: [
        {
          title: "02.1 Introduction to COBIT Framework",
          durationMin: 30,
          content: `### 02.1 Introduction to COBIT Framework

Official curriculum topic of Module 02 — IT Governance Frameworks. Session material introduces the COBIT framework for enterprise IT governance and management.`,
        },
        {
          title: "02.2 ITIL for GRC Professionals",
          durationMin: 30,
          content: `### 02.2 ITIL for GRC Professionals

Official curriculum topic of Module 02 — IT Governance Frameworks. Session material covers ITIL service management from a GRC professional's perspective.`,
        },
        {
          title: "02.3 IT Policy and Standards Governance",
          durationMin: 45,
          content: `### 02.3 IT Policy and Standards Governance

- The policy hierarchy: policy → standard → procedure → guideline → work instruction
- Draft, review, approve, and publish IT policies
- Policy lifecycle management: review cadence, exception process, sunset clauses
- Policy gap analysis: mapping existing policies to framework requirements
- Common policies every GRC professional must know: Access Control, Change Management, Acceptable Use, Data Classification, Incident Response, BCP/DR`,
        },
        {
          title: "02.4 Security Awareness and Culture",
          durationMin: 40,
          content: `### 02.4 Security Awareness and Culture

- Why security culture is a governance priority — not just an HR function
- Designing and measuring a security awareness training program
- Phishing simulation programs: design, metrics, escalation
- Role-based training: tailoring content for IT, finance, HR, and executives
- Reporting awareness metrics to the board and senior leadership`,
        },
      ],
    },
    {
      title: "Module 03 — IT Risk Management",
      description:
        "Risk identification, assessment, treatment, and monitoring — the engine room of any GRC program.",
      lessons: [
        {
          title: "03.1 IT Risk Assessment Methodology",
          durationMin: 45,
          content: `### 03.1 IT Risk Assessment Methodology

- NIST SP 800-30 risk assessment methodology
- ISO 31000 risk management
- Qualitative vs. quantitative risk assessment
- Risk appetite, risk tolerance, and risk threshold
- Inherent risk vs. residual risk vs. target risk
- Risk scoring: likelihood × impact matrices, heat maps, and risk rating scales
- Documenting risk assessments: evidence, assumptions, and version control`,
        },
        {
          title: "03.2 IT Risk Register and Risk Monitoring",
          durationMin: 45,
          content: `### 03.2 IT Risk Register and Risk Monitoring

- What a risk register is, what it must contain, and what good looks like
- Risk register lifecycle: identification → assessment → treatment → monitoring → review
- Key Risk Indicators (KRIs): design, thresholds, and escalation triggers
- Risk reporting to senior management: executive dashboards and risk committee packs
- Continuous risk monitoring: automated controls monitoring vs. periodic assessment
- Emerging risk identification: horizon scanning and threat intelligence integration`,
        },
        {
          title: "03.3 Control Testing and Assurance",
          durationMin: 45,
          content: `### 03.3 Control Testing and Assurance

- Design effectiveness testing: walkthroughs, inquiry, inspection, observation
- Operating effectiveness testing: sampling methodology (statistical vs. judgmental)
- Sample size determination: PCAOB guidance, tolerable rate of deviation, expected rate
- Workpaper documentation standards: population, sample, evidence, conclusion
- Deficiency identification, classification, and escalation: control deficiency vs. significant deficiency vs. material weakness
- Writing audit findings: observation, root cause, impact, recommendation, management response
- Remediation tracking: from finding to closure, with evidence requirements`,
        },
      ],
    },
    {
      title: "Module 04 — IT Compliance — Frameworks and Regulations",
      description:
        "The full library of frameworks and regulations that employers require GRC professionals to know and apply.",
      lessons: [
        {
          title: "04.1 SOX and ICFR (Section 404)",
          durationMin: 30,
          content: `### 04.1 SOX and ICFR (Section 404)

Official curriculum topic of Module 04 — IT Compliance, Frameworks and Regulations. Session material covers the Sarbanes-Oxley Act and Internal Control over Financial Reporting (Section 404).`,
        },
        {
          title: "04.2 ISO 27001:2022 Information Security Management",
          durationMin: 45,
          content: `### 04.2 ISO 27001:2022 Information Security Management

- ISO 27001:2022 structure: clauses 4–10 (the ISMS requirements) and Annex A controls
- Key changes from 2013 to 2022: new controls, themes approach, updated requirements
- Implementing an ISMS: scope definition, risk assessment, Statement of Applicability (SoA)
- ISO 27001 certification process: Stage 1 and Stage 2 audits, surveillance audits, recertification
- Lead Implementer vs. Lead Auditor roles: career paths and exam preparation
- ISO 27001 Annex A controls walkthrough: all 93 controls across 4 themes
- Mapping ISO 27001 to NIST CSF, SOC 2, and COBIT`,
        },
        {
          title: "04.3 NIST Cybersecurity Framework (CSF 2.0)",
          durationMin: 35,
          content: `### 04.3 NIST Cybersecurity Framework (CSF 2.0)

- NIST CSF 2.0: what changed from 1.1 — the new Govern function (sixth pillar)
- Six functions: Govern, Identify, Protect, Detect, Respond, Recover
- Implementation tiers: Partial (1) to Adaptive (4) — assessing and reporting maturity`,
        },
        {
          title: "04.4 PCI DSS v4.0",
          durationMin: 35,
          content: `### 04.4 PCI DSS v4.0

- PCI DSS scope: what is cardholder data, what systems are in scope, network segmentation
- PCI DSS v4.0 vs. v3.2.1: key changes and new requirements effective 2025
- SAQ types: SAQ-A, SAQ-A-EP, SAQ-B, SAQ-D — understanding merchant levels and validation options
- QSA assessments vs. internal assessments: what a Qualified Security Assessor does`,
        },
        {
          title: "04.5 Cloud and Emerging Regulation",
          durationMin: 40,
          content: `### 04.5 Cloud and Emerging Regulation

- DORA (Digital Operational Resilience Act)
- NIS2 Directive: who is in scope, obligations, incident reporting, penalties up to €10M
- GDPR and data protection: data controller vs. processor, DPIAs, cross-border transfers
- India-specific: RBI IT governance guidelines, RBI DPSC
- HIPAA for healthcare GRC: the Security Rule, Risk Analysis requirement, safeguards
- SOC 2 Type II under the AICPA Trust Services Criteria: mapping your controls`,
        },
      ],
    },
    {
      title: "Module 05 — IT Audit and Assurance",
      description:
        "How to plan, execute, and report on IT audits — from ITGC testing to SOC reports to internal audit advisory.",
      lessons: [
        {
          title: "05.1 IT Audit Fundamentals",
          durationMin: 40,
          content: `### 05.1 IT Audit Fundamentals

- The audit lifecycle: planning → fieldwork → reporting → follow-up
- Risk-based audit planning: how to determine what to audit and when
- Audit universe and audit plan: building a multi-year rolling audit plan
- Internal audit vs. external audit vs. IT advisory: roles, independence requirements, outputs
- Using prior year findings to risk-rank current year audit scope`,
        },
        {
          title: "05.2 ITGC Testing Deep Dive",
          durationMin: 45,
          content: `### 05.2 ITGC Testing Deep Dive

- Change Management controls: scope, evidence types, sampling, common deficiencies
- Logical Access controls: provisioning, de-provisioning, UAR, privileged access, SoD
- Computer Operations: job scheduling, incident management, monitoring, backup controls
- Program Development: SDLC controls, user acceptance testing, production migration
- Data Backup and Recovery: backup logs, restoration testing, RTO/RPO validation`,
        },
        {
          title: "05.3 SOC 1 and SOC 2 Reports",
          durationMin: 40,
          content: `### 05.3 SOC 1 and SOC 2 Reports

- SOC 1 & SOC 2 types
- Reading a SOC report: opinion, control description, testing results, exceptions
- Bridge letters: when and how to request them for period gaps
- Relying on a SOC report in a SOX engagement: the evidence chain
- What to do when a critical vendor has no SOC report: alternatives and compensating controls`,
        },
      ],
    },
    {
      title: "Module 06 — Third-Party Risk Management (TPRM)",
      description:
        "Vendor risk from classification to continuous monitoring — one of the fastest-growing GRC disciplines in 2026.",
      lessons: [
        {
          title: "06.1 TPRM Program Design",
          durationMin: 45,
          content: `### 06.1 TPRM Program Design

- Why TPRM matters
- TPRM program components: governance, inventory, tiering, due diligence, contracting, monitoring, offboarding
- Vendor risk tiering: critical, high, medium, low — criteria and classification methodology
- Inherent risk assessment: data sensitivity, financial dependency, operational criticality, geographic risk
- Residual risk after controls: evaluating vendor's own controls and assurance documentation
- Building a TPRM policy and procedure framework
- TPRM metrics and KPIs: assessment completion rate, overdue remediations, critical vendor coverage`,
        },
        {
          title: "06.2 Vendor Due Diligence",
          durationMin: 40,
          content: `### 06.2 Vendor Due Diligence

- Pre-contract due diligence: security questionnaires, SIG / SIG Lite methodology
- Reviewing vendor SOC 2, ISO 27001, and PCI DSS compliance documentation
- Contractual requirements: right-to-audit, data processing agreements, incident notification, data return at termination
- Fourth-party risk: understanding your vendor's vendor ecosystem
- Subservice organization analysis in SOC reports`,
        },
        {
          title: "06.3 TPRM Technology: AuditBoard, Archer, ServiceNow",
          durationMin: 30,
          content: `### 06.3 TPRM Technology: AuditBoard, Archer, ServiceNow

Official curriculum topic of Module 06 — Third-Party Risk Management. Session material covers TPRM technology in AuditBoard, Archer, and ServiceNow (see also Module 07 — GRC Technology and Tools).`,
        },
        {
          title: "06.4 Ongoing Monitoring and Offboarding",
          durationMin: 40,
          content: `### 06.4 Ongoing Monitoring and Offboarding

- Annual vs. periodic vs. triggered reassessment: risk-based reassessment scheduling
- Incident response for third-party breaches: what to do when your vendor is compromised
- Concentration risk management: when too many critical processes sit with one vendor
- Vendor offboarding: data return, access revocation, evidence of deletion
- Building a vendor risk committee: governance structure and escalation paths
- Regulatory reporting of third-party incidents (DORA Article 19, CERT-In requirements)`,
        },
      ],
    },
    {
      title: "Module 07 — GRC Technology and Tools",
      description:
        "Hands-on skills for the platforms that employers require: AuditBoard, ServiceNow, Archer, Vanta, and beyond.",
      lessons: [
        {
          title: "07.1 AuditBoard — Complete Walkthrough",
          durationMin: 45,
          content: `### 07.1 AuditBoard — Complete Walkthrough

- AuditBoard architecture
- OpsAudit: audit universe, risk assessment, audit plan, fieldwork management, report generation
- RiskOversight: risk register configuration, heat maps, control linkage, reporting dashboards
- CrossComply: regulatory framework mapping, evidence requests, assessment tracking
- TPRM module: vendor inventory, tiering, assessment workflows, ongoing monitoring`,
        },
        {
          title: "07.2 ServiceNow",
          durationMin: 30,
          content: `### 07.2 ServiceNow

Official curriculum topic of Module 07 — GRC Technology and Tools. Session material covers the ServiceNow GRC/IRM platform (Policy & Compliance, Risk, Audit, Vendor Risk modules — see the GRC Tools Landscape module for the certification path: CSA + CIS-GRC).`,
        },
        {
          title: "07.3 Archer GRC Platform",
          durationMin: 30,
          content: `### 07.3 Archer GRC Platform

Official curriculum topic of Module 07 — GRC Technology and Tools. Session material covers the RSA Archer GRC platform (highly customisable legacy platform widely used in US banks and insurance — see the GRC Tools Landscape module for the certification path: Archer Administrator).`,
        },
      ],
    },
    {
      title: "Module 08 — Information Security Controls",
      description:
        "The technical security knowledge a GRC professional must have to assess, design, and communicate controls effectively.",
      lessons: [
        {
          title: "08.1 Identity and Access Management (IAM)",
          durationMin: 45,
          content: `### 08.1 Identity and Access Management (IAM)

- IAM fundamentals: authentication, authorization, access control models (DAC, MAC, RBAC, ABAC)
- Least privilege principle: design, enforcement, and audit testing
- Privileged Access Management (PAM): tools (CyberArk, BeyondTrust)
- Multi-Factor Authentication (MFA): types, implementation, bypass risks
- Single Sign-On (SSO) and SAML/OAuth/OIDC: how federated identity works and what to audit
- User Access Reviews (UAR): design, cadence, evidence, recertification workflows
- Joiner/Mover/Leaver process: HR-IT integration, orphaned accounts, SoD conflicts
- Directory services: Active Directory and Azure AD — what to test as a GRC auditor`,
        },
        {
          title: "08.2 Network and Infrastructure Security Controls",
          durationMin: 40,
          content: `### 08.2 Network and Infrastructure Security Controls

- Network segmentation and firewalls: GRC testing of firewall rule reviews
- Logging and monitoring: SIEM systems (Splunk, Microsoft Sentinel), log retention requirements, alert review
- Penetration testing: what a GRC professional needs to know about pen test scope, findings, and remediation tracking
- Vulnerability management programs: CVSS scoring, SLAs by severity, tracking to closure
- Data Loss Prevention (DLP): controls to prevent insider data exfiltration`,
        },
        {
          title: "08.3 Encryption and Data Protection",
          durationMin: 40,
          content: `### 08.3 Encryption and Data Protection

- Encryption fundamentals: symmetric vs. asymmetric, TLS, PKI, certificates
- Encryption at rest and in transit: what to test and what evidence to collect
- Data classification frameworks: public, internal, confidential, restricted — implementation and audit
- Data masking and tokenization in financial systems: PCI DSS and GDPR relevance
- Key management: key lifecycle, HSMs, rotation schedules — what to audit
- Privacy by design principles and their GRC implications`,
        },
        {
          title: "08.4 Security Incident Management and Response",
          durationMin: 35,
          content: `### 08.4 Security Incident Management and Response

- Incident management lifecycle: detect → contain → eradicate → recover → lessons learned
- GRC's role in incident response: regulatory notification obligations, evidence preservation, reporting
- Mandatory breach notification timelines: GDPR 72 hours, CERT-In 6 hours, DORA 4 hours initial notification
- Tabletop exercises: design, facilitation, and capturing outputs as GRC evidence`,
        },
      ],
    },
    {
      title: "Module 09 — Operational Resilience and Business Continuity",
      description:
        "BCM, DR, and operational resilience — increasingly central to GRC as DORA and regulators demand proof, not just documentation.",
      lessons: [
        {
          title: "09.1 Business Continuity Management (BCM)",
          durationMin: 40,
          content: `### 09.1 Business Continuity Management (BCM)

- Business Impact Analysis (BIA): identifying critical processes, MTD, MBCO, RTO, RPO
- Introduction to BCMS implementation and ISO 22301 certification pathway
- Conducting BCMS recertification assessments: scope review, document review, interview, evidence testing
- Common BCM gaps found in audit: untested plans, stale BIAs, no executive sign-off`,
        },
        {
          title: "09.2 Disaster Recovery Planning and Testing",
          durationMin: 35,
          content: `### 09.2 Disaster Recovery Planning and Testing

- DR strategy options: warm standby, cold standby, active-active, cloud-based DR
- RTO and RPO: setting realistic targets, testing against them, documenting results
- DR testing types: tabletop, functional test, full failover — when to use each`,
        },
        {
          title: "09.3 DORA Introduction",
          durationMin: 30,
          content: `### 09.3 DORA Introduction

Official curriculum topic of Module 09 — Operational Resilience and Business Continuity. Session material introduces the Digital Operational Resilience Act (see also 04.5 Cloud and Emerging Regulation and 06.4 regulatory reporting under DORA Article 19).`,
        },
      ],
    },
    {
      title: "GRC Tools Landscape — What Employers Require in 2026",
      description:
        "The platforms every GRC team uses, who uses them, and what to know about each — plus the analytics and spreadsheet skills every role requires.",
      lessons: [
        {
          title: "Tool: AuditBoard",
          durationMin: 15,
          content: `### AuditBoard

**Who uses it:** Big 4, large enterprises, SOX filers, internal audit teams

**What to know:** SOX HUB, OpsAudit, RiskOversight, CrossComply, TPRM modules. Certification: Core Admin + Module Admin.`,
        },
        {
          title: "Tool: ServiceNow IRM",
          durationMin: 15,
          content: `### ServiceNow IRM

**Who uses it:** Large enterprises, banks, telcos, government

**What to know:** Policy & Compliance, Risk, Audit, Vendor Risk modules. Integration-heavy. Certification: CSA + CIS-GRC.`,
        },
        {
          title: "Tool: RSA Archer",
          durationMin: 15,
          content: `### RSA Archer

**Who uses it:** Financial services, defence, global enterprises

**What to know:** Highly customisable legacy platform. Widely used in US banks and insurance. Certification: Archer Administrator.`,
        },
        {
          title: "Tool: MetricStream",
          durationMin: 15,
          content: `### MetricStream

**Who uses it:** Global banks, healthcare, insurance

**What to know:** Comprehensive IRM platform. Strong in BFSI sector. Less common in Big 4 but valued in-house.`,
        },
        {
          title: "Tool: OneTrust",
          durationMin: 15,
          content: `### OneTrust

**Who uses it:** Privacy-first organisations, GDPR compliance teams

**What to know:** Privacy management, TPRM, consent, data mapping. Strong for privacy-facing GRC roles.`,
        },
        {
          title: "Tool: Vanta",
          durationMin: 15,
          content: `### Vanta

**Who uses it:** SaaS companies, startups, tech companies needing SOC 2

**What to know:** Automated continuous compliance. Integrates with AWS, GCP, Azure, GitHub, Okta, etc.`,
        },
        {
          title: "Tool: Drata",
          durationMin: 15,
          content: `### Drata

**Who uses it:** Mid-market SaaS, fintech startups

**What to know:** Similar to Vanta. Audit hub allows direct auditor evidence access. Growing rapidly.`,
        },
        {
          title: "Tool: IBM OpenPages",
          durationMin: 15,
          content: `### IBM OpenPages

**Who uses it:** Large financial institutions, IBM ecosystem organisations

**What to know:** Strong for model risk and operational risk in banking. EY and Deloitte use it on engagements.`,
        },
        {
          title: "Tool: Power BI / Tableau",
          durationMin: 15,
          content: `### Power BI / Tableau

**Who uses it:** All GRC teams producing executive dashboards

**What to know:** Required for GRC analytics, risk heat maps, control coverage dashboards. Build this skill now.`,
        },
        {
          title: "Tool: Excel (Advanced)",
          durationMin: 15,
          content: `### Excel (Advanced)

**Who uses it:** Every GRC role at every level

**What to know:** Population analysis, sampling workpapers, control matrices, risk registers. Non-negotiable foundational skill.`,
        },
      ],
    },
  ],
}
