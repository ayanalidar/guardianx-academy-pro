/**
 * GuardianX — Built-in Course Content Generator (no external AI required).
 *
 * When the ZAI LLM client is unavailable (e.g. Vercel deployment without
 * ZAI_BASE_URL/ZAI_API_KEY), the Course Architect falls back to this
 * deterministic generator. It composes the SAME response shapes the LLM
 * path returns — blueprint sections and module/lesson curricula — from the
 * curated cybersecurity domain knowledge base (src/lib/cyber-knowledge.ts),
 * so the Studio experience never 500s and always produces usable,
 * reviewable, domain-specific content.
 */

import { resolveDomain, type CyberDomainKnowledge } from "@/lib/cyber-knowledge"

export interface BlueprintCtx {
  title: string
  category: string
  level: string
  durationHours: number
  description?: string | null
  certBody?: string | null
  tags?: string | null
}

export interface CurriculumCtx extends BlueprintCtx {
  moduleCount: number
  depth: "standard" | "deep"
  focusNotes?: string
}

/* ============================================================
   Helpers
   ============================================================ */

/** "Reconnaissance: passive OSINT, Shodan, theHarvester" → ["Reconnaissance", "passive OSINT…"] */
function splitTopic(t: string): [string, string[]] {
  const idx = t.indexOf(":")
  if (idx === -1) return [t.trim(), []]
  const head = t.slice(0, idx).trim()
  const rest = t.slice(idx + 1).trim()
  const parts = rest
    .split(/[,;](?![^(]*\))/) // split on commas not inside parens
    .map((s) => s.trim())
    .filter(Boolean)
  return [head, parts]
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

function chunk<T>(arr: T[], groups: number): T[][] {
  // Contiguous chunks preserve pedagogical ordering (foundational → advanced).
  const per = Math.ceil(arr.length / groups)
  return Array.from({ length: groups }, (_, g) => arr.slice(g * per, (g + 1) * per)).filter((c) => c.length > 0)
}

const LEVEL_PREREQS: Record<string, string[]> = {
  Beginner: [
    "Comfortable using Windows or Linux as a daily operating system",
    "Basic networking vocabulary (IP address, port, DNS, firewall)",
    "No prior security experience required — foundations are built in-course",
    "Curiosity and the discipline to practise in lawful lab environments only",
  ],
  Intermediate: [
    "Solid TCP/IP and networking fundamentals (subnets, routing, common services)",
    "Working comfort with the Linux command line and basic Bash/Python scripting",
    "Familiarity with core security concepts (CIA triad, authN vs authZ, encryption at rest vs in transit)",
    "A home lab or willingness to run the provided virtualised labs",
  ],
  Advanced: [
    "Several years of hands-on security operations or engineering experience",
    "Deep OS internals knowledge (Windows authentication, Linux privileges) and Active Directory",
    "Scripting/automation fluency (Python, PowerShell, or Bash) for tooling and detection work",
    "Experience with enterprise security tooling and incident workflows",
  ],
}

/* ============================================================
   Blueprint (course-page content)
   ============================================================ */

export function localBlueprint(ctx: BlueprintCtx) {
  const d: CyberDomainKnowledge = resolveDomain(ctx.category)
  const level = (ctx.level || "Beginner").trim()

  const para1 = `${ctx.title} is a ${level.toLowerCase()}-level, lab-driven program in ${d.name.toLowerCase()} delivered the GuardianX way: every concept is anchored to what practitioners actually do with real tooling, then immediately rehearsed in safe, isolated ranges. ${d.summary}`
  const para2 = `Across ${ctx.durationHours || 40} hours you will work through ${d.coreTopics.length} core topic areas — from ${splitTopic(d.coreTopics[0]!)[0].toLowerCase()} to ${splitTopic(d.coreTopics[d.coreTopics.length - 1]!)[0].toLowerCase()} — using ${d.tools.slice(0, 6).join(", ")}, and more. Instruction maps each technique to ${d.frameworks.slice(0, 2).join(" and ")} so your skills translate directly to industry expectations and interview scenarios.`
  const para3 = `The curriculum culminates in integrative capstone labs where you combine reconnaissance, execution and reporting into professional deliverables. Graduates leave with verifiable artifacts, mapped frameworks, and a portfolio of evidence — aligned toward ${d.certs.slice(0, 3).join(", ")} and roles such as ${d.roles.slice(0, 2).join(" or ")}.`

  const learn = d.coreTopics.slice(0, 10).map((t) => {
    const [head] = splitTopic(t)
    const verbMap: Record<string, string> = {
      Reconnaissance: "Perform", Scanning: "Execute", Vulnerability: "Analyze",
      Exploitation: "Conduct", Password: "Execute", Privilege: "Achieve",
      Detection: "Build", Monitoring: "Operate", Reporting: "Produce",
      Wireless: "Assess", Cloud: "Secure", Governance: "Apply", Identity: "Implement",
      Incident: "Lead", Threat: "Operationalize", Cryptography: "Apply",
      Malware: "Analyze", Forensics: "Conduct", Network: "Design", Web: "Assess",
      OSINT: "Conduct", Compliance: "Apply",
    }
    const verb = verbMap[head.split(" ")[0]!] ?? "Master"
    // Keep the head's original casing (acronyms like ISMS/OWASP must survive)
    const headPhrase = t.includes(":") ? t.slice(0, t.indexOf(":")).trim() : t
    return `${verb} ${headPhrase} — ${t.includes(":") ? t.slice(t.indexOf(":") + 1).trim() : "in depth"}`
  })

  return {
    longDescription: [para1, para2, para3].join("\n\n"),
    whatYouWillLearn: learn,
    prerequisites: LEVEL_PREREQS[level] ?? LEVEL_PREREQS.Beginner,
    whoShouldAttend: [
      ...(level === "Beginner"
        ? ["Students and career-switchers entering cybersecurity", "IT professionals adding a security specialization"]
        : level === "Advanced"
          ? ["Experienced SOC engineers, pentesters and security architects", "Senior practitioners preparing for expert-level certification"]
          : ["SOC analysts and system administrators moving into security engineering", "Junior security staff formalizing and deepening their skills"]),
      `Aspiring ${d.roles[0] ?? "security professionals"} seeking structured, lab-first preparation`,
      "Teams upskilling for the certification paths this course maps to",
      ...(level === "Beginner" ? [] : ["Not suited for absolute beginners with zero IT exposure"]),
    ],
    toolsCovered: d.tools,
    careerOutcomes: [...d.roles, `Preparation for ${d.certs.slice(0, 2).join(" and ")} exam tracks`],
    tags: [d.key, ...d.tools.slice(0, 5).map((t) => t.toLowerCase().split(/[\s/(]/)[0]!), "hands-on labs", "guardianx"].join(", "),
  }
}

/* ============================================================
   Curriculum (modules + lessons)
   ============================================================ */

function lessonContent(topic: string, d: CyberDomainKnowledge, deep: boolean, isLab: boolean, labPattern: string): string {
  if (isLab) {
    const steps = [
      "Provision the isolated lab range and verify network reachability to the target hosts",
      "Execute the guided scenario end-to-end, capturing evidence (screenshots, command output) at each stage",
      "Apply the technique against the deliberately vulnerable target under scoped, lawful conditions",
      "Document findings, artifacts and the remediation path in your lab report",
    ]
    return [
      `## Objective`,
      `${labPattern.split(":")[0]}. You will rehearse a real operational workflow used by ${d.roles[0] ?? "security teams"} daily.`,
      ``,
      `## Environment`,
      `GuardianX isolated lab range with deliberately vulnerable targets. Primary tooling: ${d.tools.slice(0, 4).join(", ")}.`,
      ``,
      `## Steps`,
      steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      ``,
      `## Deliverable`,
      `A completed lab report: commands used, evidence of each stage, findings rated against ${d.frameworks[0] ?? "industry standards"}, and the verified remediation.`,
      ...(deep
        ? [``, `## Extension Challenges`,
           `1. Repeat the scenario with detection enabled — identify the telemetry your actions generated (Sysmon/EDR/NetFlow).`,
           `2. Harden the target and re-attempt to validate the control actually stops the technique.`]
        : []),
    ].join("\n")
  }

  const [head, parts] = splitTopic(topic)
  const detail = parts.length ? parts : [topic]
  return [
    `## Overview`,
    `${head} is a core discipline of ${d.name.toLowerCase()}. This lesson teaches the mechanism — how it actually works at the protocol, OS or application level — not just the vocabulary.`,
    ``,
    `## Key Concepts`,
    detail.slice(0, deep ? 6 : 4).map((p) => `- ${titleCase(p)}`).join("\n"),
    ``,
    `## Framework Mapping`,
    `Practitioners reference this technique through ${d.frameworks.slice(0, 2).join(" and ")}. Understanding where it sits in those frameworks is what interviews and audits probe for.`,
    ``,
    `## Hands-On`,
    `You will use ${d.tools.slice(0, 3).join(", ")} against the lab range to put each concept into practice. Every command and decision point is walked through with expected output so you can self-verify.`,
    ``,
    `## Key Takeaways`,
    `- ${head}: mechanism, tooling and detection/remediation angle\n- Where this maps inside ${d.frameworks[0] ?? "the relevant frameworks"}\n- The operational workflow professionals follow`,
    ...(deep
      ? [``, `## Common Pitfalls`,
         `- Treating the tool output as truth without validating against a second source\n- Skipping scoping/authorisation checks before touching a target\n- Confusing the exploit technique with the misconfiguration that enables it`]
      : []),
  ].join("\n")
}

export function localCurriculum(ctx: CurriculumCtx) {
  const d: CyberDomainKnowledge = resolveDomain(ctx.category)
  const deep = ctx.depth === "deep"
  const moduleCount = Math.min(Math.max(Math.round(ctx.moduleCount) || 6, 3), 10)

  const topics = [...d.coreTopics]
  // Reserve the last module for the capstone; spread the rest round-robin-stable.
  const teachModules = Math.max(2, moduleCount - 1)
  const groups = chunk(topics, teachModules)

  const modules: {
    title: string
    description: string
    lessons: { title: string; type: string; durationMin: number; preview: boolean; content: string }[]
  }[] = []

  // ---- Orientation (module 1, lesson 1 — free preview) ----
  const orientation = {
    title: "Course Orientation — How This Program Works",
    type: "reading",
    durationMin: 15,
    preview: true,
    content: [
      `## Welcome to ${ctx.title}`,
      `This ${ctx.level?.toLowerCase() ?? "foundational"} program covers ${d.name} through ${teachModules} teaching modules plus an integrative capstone. Every module pairs concept lessons with graded hands-on labs — cybersecurity is learned by doing.`,
      ``,
      `## How to Succeed`,
      `- Do the labs. Reading alone will not build the reflexes this field demands.`,
      `- Map every technique you learn to ${d.frameworks[0] ?? "the relevant frameworks"} — that is the language of employers and auditors.`,
      `- Keep an evidence folder: screenshots and command output from every lab become your portfolio.`,
      ``,
      `## Tools You Will Master`,
      d.tools.map((t) => `- ${t}`).join("\n"),
      ``,
      `## Where This Leads`,
      `Aligned certifications: ${d.certs.join(", ")}. Career paths: ${d.roles.join(", ")}.`,
    ].join("\n"),
  }

  groups.forEach((group, gi) => {
    const [firstTopic] = splitTopic(group[0]!)
    const theme = titleCase(firstTopic.split(" ").slice(0, 3).join(" "))
    const isLast = gi === groups.length - 1
    const moduleTitle = gi === 0
      ? `${theme} — Foundations & First Blood`
      : isLast && groups.length > 2
        ? `${theme} — Advanced Operations`
        : `${theme} — Applied Practice`

    const lessons: { title: string; type: string; durationMin: number; preview: boolean; content: string }[] = []
    if (gi === 0) lessons.push(orientation)

    group.forEach((topic, ti) => {
      const [head, parts] = splitTopic(topic)
      const specific = parts.length ? ` — ${parts[0]!}` : ""
      lessons.push({
        title: `${head}${specific}`.slice(0, 120),
        type: "reading",
        durationMin: deep ? 25 : 20,
        preview: false,
        content: lessonContent(topic, d, deep, false, ""),
      })
      // Interleave a lab after every 2 reading lessons (or at depth end)
      if ((ti + 1) % 2 === 0 || ti === group.length - 1) {
        const labPattern = d.labs[(gi + ti) % d.labs.length]!
        lessons.push({
          title: `Lab: ${titleCase(labPattern.split(/[:.]/)[0]!.slice(0, 70))}`,
          type: "lab",
          durationMin: deep ? 75 : 60,
          preview: false,
          content: lessonContent(topic, d, deep, true, labPattern),
        })
      }
    })

    modules.push({
      title: moduleTitle,
      description: `Covers ${group.map((t) => splitTopic(t)[0].toLowerCase()).slice(0, 3).join(", ")}${group.length > 3 ? " and more" : ""} — concepts immediately rehearsed in labs mapped to ${d.frameworks[0] ?? "industry frameworks"}.`,
      lessons,
    })
  })

  // ---- Capstone ----
  modules.push({
    title: "Capstone — Integrative Scenario & Professional Reporting",
    description: `A full end-to-end scenario combining every skill from the program, finished with a professional report built on ${d.frameworks[0] ?? "industry frameworks"}.`,
    lessons: [
      {
        title: "Capstone Scenario Brief & Scoping",
        type: "reading",
        durationMin: deep ? 30 : 20,
        preview: false,
        content: [
          `## The Mission`,
          `You receive an engagement brief mirroring real work: scope, rules of engagement, target environment and the deliverables the "client" expects. ${ctx.focusNotes ? `Your instructor added these focus requirements: ${ctx.focusNotes}` : ""}`,
          ``,
          `## Rules of Engagement`,
          `- Operate only inside the provided range boundaries`,
          `- Document every action with timestamps (your report depends on it)`,
          `- Treat evidence handling as if the report will be read by executives and auditors`,
          ``,
          `## Success Criteria`,
          `All objectives completed, evidence collected, findings mapped to ${d.frameworks.slice(0, 2).join(" and ")}.`,
        ].join("\n"),
      },
      {
        title: "Capstone Lab — Full Execution",
        type: "lab",
        durationMin: deep ? 120 : 90,
        preview: false,
        content: [
          `## Objective`,
          `Execute the complete operational scenario: ${d.labs[0]}`,
          ``,
          `## Environment`,
          `Full GuardianX capstone range. Tooling: ${d.tools.join(", ")}.`,
          ``,
          `## Steps`,
          `1. Reconnaissance and enumeration of the target estate\n2. Execute the core technique chain for ${d.key.toLowerCase()} objectives\n3. Escalate/expand until every objective is met\n4. Capture verification evidence at each stage\n5. Restore/clean the environment (professional etiquette)`,
          ``,
          `## Deliverable`,
          `Complete engagement artifacts: methodology log, raw evidence, findings register with severity ratings.`,
        ].join("\n"),
      },
      {
        title: "Professional Reporting & Certification Readiness",
        type: "reading",
        durationMin: deep ? 30 : 25,
        preview: false,
        content: [
          `## Writing the Deliverable`,
          `Executive summary first: what was tested, what was found, business impact. Then the technical appendix: reproduction steps, evidence, remediation with verification criteria.`,
          ``,
          `## Certification Alignment`,
          `This program maps to ${d.certs.join(", ")}. The capstone doubles as exam rehearsal: time-boxed objectives, evidence-based scoring, framework-anchored reporting.`,
          ``,
          `## Your Next Step`,
          `Roles this prepares you for: ${d.roles.join(", ")}. Keep your evidence folder — it is your interview portfolio.`,
        ].join("\n"),
      },
    ],
  })

  return { modules: modules.slice(0, moduleCount) }
}

/** Compose a single deep lesson (used by the "lesson" action fallback). */
export function localLesson(ctx: { title: string; category: string; lesson: { title: string; type: string; content: string } }) {
  const d = resolveDomain(ctx.category)
  const isLab = ctx.lesson.type === "lab"
  return {
    title: ctx.lesson.title,
    durationMin: isLab ? 60 : 30,
    content: isLab
      ? lessonContent(`Lab: ${ctx.lesson.title}`, d, true, true, ctx.lesson.content || d.labs[0]!)
      : lessonContent(`${ctx.lesson.title}: ${ctx.lesson.content ? ctx.lesson.content.slice(0, 300) : d.coreTopics[0]}`, d, true, false, ""),
  }
}
