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

import { resolveDomain, DOMAIN_EXPERT_LENS, type CyberDomainKnowledge } from "@/lib/cyber-knowledge"

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

/* ============================================================
   Syllabus Audit (coverage gap analysis — no LLM required)
   ============================================================ */

export interface AuditCourseCtx {
  title: string
  category: string
  level: string
}

export interface AuditModuleInput {
  title: string
  lessons: { title: string; type: string; content: string }[]
}

export interface LocalAuditResult {
  scores: { coverage: number; depth: number; practicality: number; overall: number }
  strengths: string[]
  gaps: string[]
  recommendations: { title: string; detail: string; severity: "high" | "medium" | "low" }[]
  coverageMap: { topic: string; covered: boolean; evidence: string }[]
}

/** Deterministic keyword-vs-coreTopics gap analysis over the course inventory. */
export function localAudit(ctx: AuditCourseCtx, modules: AuditModuleInput[]): LocalAuditResult {
  const d = resolveDomain(ctx.category)

  // Build one lowercase haystack from the whole inventory.
  const parts: string[] = []
  for (const m of modules) {
    parts.push(m.title)
    for (const l of m.lessons) {
      parts.push(l.title, (l.content || "").slice(0, 600))
    }
  }
  const haystack = parts.join(" ").toLowerCase()

  const tokenPresent = (needle: string) => {
    const words = needle
      .toLowerCase()
      .replace(/[^a-z0-9+ ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "for", "with", "vs", "into", "from"].includes(w))
    if (!words.length) return haystack.includes(needle.toLowerCase())
    // Topic counts as covered when ≥40% of its significant words appear.
    const hits = words.filter((w) => haystack.includes(w)).length
    return hits / words.length >= 0.4
  }

  // 1) Topic coverage
  const coverageMap = d.coreTopics.map((t) => {
    const [head] = splitTopic(t)
    const covered = tokenPresent(head || t)
    const evidence = covered
      ? (modules.find((m) => (m.title + " " + m.lessons.map((l) => l.title).join(" ")).toLowerCase().includes((head || t).split(/[ :,]/)[0]!.toLowerCase()))?.title ?? "covered in lesson content")
      : "not found in module or lesson titles/content"
    return { topic: head || t, covered, evidence }
  })
  const coveredCount = coverageMap.filter((c) => c.covered).length
  const coverage = d.coreTopics.length ? Math.round((coveredCount / d.coreTopics.length) * 100) : 100

  // 2) Depth heuristic — average teaching content per reading lesson
  const readingLessons = modules.flatMap((m) => m.lessons.filter((l) => l.type === "reading" || l.type === "pdf"))
  const avgContent = readingLessons.length
    ? readingLessons.reduce((a, l) => a + (l.content || "").length, 0) / readingLessons.length
    : 0
  const depth = Math.max(0, Math.min(100, Math.round((avgContent / 1800) * 100)))

  // 3) Practicality — lab share + tool mentions
  const allLessons = modules.flatMap((m) => m.lessons)
  const labShare = allLessons.length ? allLessons.filter((l) => l.type === "lab").length / allLessons.length : 0
  const toolsHit = d.tools.filter((t) => haystack.includes(t.toLowerCase().split(/[\s(/]/)[0]!)).length
  const toolCoverage = d.tools.length ? toolsHit / d.tools.length : 0
  const practicality = Math.min(100, Math.round(labShare * 250 + toolCoverage * 50))

  const overall = Math.round(coverage * 0.45 + depth * 0.25 + practicality * 0.3)

  // 4) Strengths / gaps / recommendations
  const coveredTopics = coverageMap.filter((c) => c.covered)
  const strengths: string[] = []
  if (coveredTopics.length) {
    strengths.push(`Solid coverage of ${coveredTopics.slice(0, 3).map((c) => c.topic).join(", ")}${coveredTopics.length > 3 ? " and more" : ""}.`)
  }
  if (labShare >= 0.25) strengths.push(`Healthy hands-on ratio — ${Math.round(labShare * 100)}% of lessons are labs.`)
  if (toolsHit >= 3) strengths.push(`Learners practise with ${toolsHit} domain-standard tools (e.g. ${d.tools.filter((t) => haystack.includes(t.toLowerCase().split(/[\s(/]/)[0]!)).slice(0, 3).join(", ")}).`)
  if (!strengths.length) strengths.push("A curriculum skeleton exists to build on — the domain map below gives the build order.")

  const missingTopics = coverageMap.filter((c) => !c.covered)
  const gaps: string[] = missingTopics.map((c) => `${c.topic} — ${c.evidence}`)
  const missingTools = d.tools.filter((t) => !haystack.includes(t.toLowerCase().split(/[\s(/]/)[0]!))
  if (missingTools.length && allLessons.length) {
    gaps.push(`Tooling not yet hands-on: ${missingTools.slice(0, 5).join(", ")}${missingTools.length > 5 ? "…" : ""}`)
  }
  if (labShare < 0.2 && allLessons.length) gaps.push(`Lab intensity low (${Math.round(labShare * 100)}% of lessons) — ${d.name} is learned by doing.`)
  if (avgContent < 800 && readingLessons.length) gaps.push(`Reading lessons average only ~${Math.round(avgContent)} characters of teaching content — below teachable depth.`)

  const recommendations: LocalAuditResult["recommendations"] = []
  for (const t of missingTopics.slice(0, 4)) {
    recommendations.push({
      title: `Add a module (or lessons) covering ${t.topic}`,
      detail: `Generate a targeted module on "${t.topic}" — the curriculum generator honours focus notes, so feed it this gap. Anchor it to ${d.frameworks[0] ?? "the relevant framework"} and include a lab from the domain playbook (${d.labs[0] ?? "guided hands-on scenario"}).`,
      severity: recommendations.length < 2 ? "high" : "medium",
    })
  }
  if (labShare < 0.2) {
    recommendations.push({
      title: "Raise the lab ratio to ~1 lab per 2 reading lessons",
      detail: `Add scenario labs from the domain playbook: ${d.labs.slice(0, 2).join(" / ")}. Every lab needs Objective, Environment, Steps and Deliverable.`,
      severity: "high",
    })
  }
  if (avgContent < 800 && readingLessons.length) {
    recommendations.push({
      title: "Deepen existing reading lessons to teachable grade",
      detail: "Use the Lesson Deep-Dive action on the thinnest lessons — target 450-800 words of mechanism-level teaching with real commands, pitfalls and takeaways.",
      severity: "medium",
    })
  }
  if (missingTools.length >= 3) {
    recommendations.push({
      title: `Put learners hands-on with ${missingTools.slice(0, 3).join(", ")}`,
      detail: `These domain-standard tools appear in no lesson yet. Employers probe for them by name — fold them into existing labs or add short tool-walkthrough lessons.`,
      severity: "medium",
    })
  }
  if (!recommendations.length) {
    recommendations.push({
      title: "Curriculum covers the domain map well",
      detail: "Consider an exam-prep/capstone polish: a timed integrative scenario, a professional reporting lesson and a certification-readiness checkpoint.",
      severity: "low",
    })
  }

  return { scores: { coverage, depth, practicality, overall }, strengths, gaps, recommendations, coverageMap }
}

/* ============================================================
   Assessment bank (exam-grade MCQs — no LLM required)
   ============================================================ */

export interface LocalQuestion {
  text: string
  options: string[]
  answerIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  domain: string
}

export interface LocalAssessmentCtx {
  category: string
  moduleTitle: string
  count: number
}

type QuestionStem = { text: string; correct: string; explanation: string }

const QUESTION_STEMS: [
  (topic: string, tool: string) => QuestionStem,
  (topic: string) => QuestionStem,
  (topic: string, tool: string, misconception: string) => QuestionStem,
] = [
  (topic: string, tool: string) => ({
    text: `Which tool is the practitioner standard for working with ${topic.toLowerCase()}?`,
    correct: tool,
    explanation: `${tool} is the domain-standard tool for this task — interviews and real operations expect hands-on fluency with it.`,
  }),
  (topic: string) => ({
    text: `When planning work involving ${topic.toLowerCase()}, which framing do senior practitioners apply FIRST?`,
    correct: "Map the activity to the governing framework and scope/authorisation boundaries",
    explanation: `Scoping and framework mapping come before tooling — it is what separates professional operations from ad-hoc hacking.`,
  }),
  (topic: string, _tool: string, misconception: string) => ({
    text: `A teammate says: "${misconception}" What is the strongest correction?`,
    correct: "The premise is wrong — apply the domain methodology: evidence first, then controls",
    explanation: `This is a known misconception in the field; the expert workflow (scope → evidence → control → verify) is the reliable correction.`,
  }),
]

/** Deterministic exam-grade question bank composed from the domain knowledge base. */
export function localAssessment(ctx: LocalAssessmentCtx): { questions: LocalQuestion[] } {
  const d = resolveDomain(ctx.category)
  const lens = DOMAIN_EXPERT_LENS[d.key]
  const count = Math.min(Math.max(Math.round(ctx.count) || 8, 4), 15)
  const questions: LocalQuestion[] = []

  const topics = d.coreTopics.map((t) => splitTopic(t)[0]!)
  const difficulties: LocalQuestion["difficulty"][] = ["easy", "easy", "medium", "medium", "hard"]

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length]!
    const tool = d.tools[i % d.tools.length]!
    const otherTools = d.tools.filter((t) => t !== tool)
    const difficulty = difficulties[i % difficulties.length]!
    const stemKind = i % 3

    let text: string
    let options: string[]
    let answerIndex: number
    let explanation: string

    if (stemKind === 0) {
      const q = QUESTION_STEMS[0]!(topic, tool)
      text = q.text
      explanation = q.explanation
      options = [tool, ...otherTools.slice(0, 3).map((t) => t.split(/[\s(/]/)[0]!)]
      answerIndex = 0
      // Rotate the correct answer position so keys do not pattern.
      const rot = i % options.length
      ;[options[0], options[rot]] = [options[rot]!, options[0]!]
      answerIndex = rot
    } else if (stemKind === 1) {
      const q = QUESTION_STEMS[1]!(topic)
      text = q.text
      explanation = q.explanation
      const fw = d.frameworks
      options = [
        q.correct,
        "Jump straight to tooling — speed beats documentation",
        "Copy the approach from an unrelated domain",
        "Skip scoping; authorisation is a formality",
      ]
      answerIndex = 0
      const rot = i % options.length
      ;[options[0], options[rot]] = [options[rot]!, options[0]!]
      answerIndex = rot
    } else {
      const mis = lens?.misconceptions[i % (lens?.misconceptions.length || 1)] ?? "Security is mainly about buying the right tools"
      const q = QUESTION_STEMS[2]!(topic, tool, mis)
      text = q.text
      explanation = lens?.methodology[i % (lens?.methodology.length || 1)] ?? q.explanation
      options = [
        q.correct,
        "The teammate is right — accept the premise",
        "Escalate to management without technical analysis",
        "The premise is true for this domain only",
      ]
      answerIndex = 0
      const rot = i % options.length
      ;[options[0], options[rot]] = [options[rot]!, options[0]!]
      answerIndex = rot
    }

    questions.push({
      text: text.slice(0, 400),
      options: options.map((o) => o.slice(0, 160)),
      answerIndex,
      explanation: explanation.slice(0, 400),
      difficulty,
      domain: d.key,
    })
  }

  return { questions }
}
