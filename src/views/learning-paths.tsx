"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { getCmsIcon } from "@/lib/cms-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  ShieldCheck,
  Swords,
  Cloud,
  Globe,
  Lock,
  Target,
  Clock,
  Zap,
  Trophy,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  Circle,
  BookOpen,
  Beaker,
  FileQuestion,
  Sparkles,
  Network,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/* ============================================================
   LearningPathsView - guided cybersecurity career paths
   ============================================================ */

type Difficulty = "Beginner" | "Intermediate" | "Advanced"

interface PathModule {
  name: string
  lessons: { title: string; type: "video" | "reading" | "lab" | "quiz" }[]
}

interface LearningPath {
  id: string
  name: string
  tagline: string
  icon: LucideIcon
  difficulty: Difficulty
  durationHours: number
  skillsCount: number
  labsCount: number
  xpReward: number
  color: string
  tint: string
  border: string
  gradient: string
  skills: string[]
  careerOutcome: string
  progressPercent: number
  modules: PathModule[]
  prerequisites: string[]
}

/* ---------------------------------------------------------------- *
 *  Shape returned by /api/learning-paths                          *
 * ---------------------------------------------------------------- */
interface LearningPathRow {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  description: string
  icon: string
  color: string
  tint: string
  difficulty: string
  duration: string
  skillsCount: number
  labsCount: number
  xpReward: number
  careerOutcome?: string | null
  skills: string[]
  courses: string[]
  order: number
  published: boolean
  featured: boolean
}

/* ---------------------------------------------------------------- *
 *  Color variants - Tailwind needs the literal class names on     *
 *  disk so JIT can include them; we cannot build these            *
 *  dynamically with template strings.                             *
 * ---------------------------------------------------------------- */
const COLOR_VARIANTS: Record<string, { border: string; gradient: string }> = {
  "text-emerald-300": {
    border: "border-emerald-500/40",
    gradient: "from-emerald-500/15 via-emerald-600/5 to-transparent",
  },
  "text-cyan-300": {
    border: "border-cyan-500/40",
    gradient: "from-cyan-500/15 via-cyan-600/5 to-transparent",
  },
  "text-rose-300": {
    border: "border-rose-500/40",
    gradient: "from-rose-500/15 via-rose-600/5 to-transparent",
  },
  "text-violet-300": {
    border: "border-violet-500/40",
    gradient: "from-violet-500/15 via-violet-600/5 to-transparent",
  },
  "text-amber-300": {
    border: "border-amber-500/40",
    gradient: "from-amber-500/15 via-amber-600/5 to-transparent",
  },
  "text-teal-300": {
    border: "border-teal-500/40",
    gradient: "from-teal-500/15 via-teal-600/5 to-transparent",
  },
  "text-blue-300": {
    border: "border-blue-500/40",
    gradient: "from-blue-500/15 via-blue-600/5 to-transparent",
  },
}

function deriveBorder(color: string): string {
  return COLOR_VARIANTS[color]?.border ?? "border-border/40"
}
function deriveGradient(color: string): string {
  return COLOR_VARIANTS[color]?.gradient ?? COLOR_VARIANTS["text-violet-300"].gradient
}

/** Parse "12 weeks" / "16 weeks" → hours (assume ~5 study hours per week). */
function weeksToHours(duration: string): number {
  const m = duration.match(/(\d+)\s*week/i)
  if (!m) return 40
  return Math.max(1, parseInt(m[1], 10)) * 5
}

function coerceDifficulty(d: string): Difficulty {
  const lower = (d || "").toLowerCase()
  if (lower.includes("adv")) return "Advanced"
  if (lower.includes("int") || lower.includes("med")) return "Intermediate"
  return "Beginner"
}

/** Convert a DB LearningPathRow into the local LearningPath shape. */
function mapRowToPath(row: LearningPathRow): LearningPath {
  const skillList = Array.isArray(row.skills) ? row.skills : []
  const difficulty = coerceDifficulty(row.difficulty)
  // Split skills into ~3 modules of equal size so the curriculum panel
  // still has structured content even when the API doesn't return modules.
  const moduleCount = 3
  const perModule = Math.ceil(skillList.length / moduleCount)
  const moduleNames = ["Foundations", "Core Skills", "Advanced Topics"] as const
  const lessonTypes = ["video", "lab", "reading"] as const
  const modules: PathModule[] = Array.from({ length: moduleCount }, (_, i) => {
    const slice = skillList.slice(i * perModule, (i + 1) * perModule)
    return {
      name: moduleNames[i] ?? `Module ${i + 1}`,
      lessons: slice.map((s, idx) => ({
        title: s,
        type: lessonTypes[idx % lessonTypes.length],
      })),
    }
  }).filter((m) => m.lessons.length > 0)

  return {
    id: row.id,
    name: row.title,
    tagline: row.subtitle || row.description,
    icon: getCmsIcon(row.icon),
    difficulty,
    durationHours: weeksToHours(row.duration),
    skillsCount: row.skillsCount || skillList.length,
    labsCount: row.labsCount,
    xpReward: row.xpReward,
    color: row.color,
    tint: row.tint,
    border: deriveBorder(row.color),
    gradient: deriveGradient(row.color),
    skills: skillList,
    careerOutcome: row.careerOutcome || "Cybersecurity role aligned with this path",
    progressPercent: 0,
    modules,
    prerequisites:
      difficulty === "Beginner"
        ? ["Basic computer literacy", "Comfort with the command line (or willingness to learn)"]
        : difficulty === "Intermediate"
        ? ["Beginner Cybersecurity path (or equivalent)", "Networking fundamentals"]
        : ["Intermediate networking knowledge", "Linux command-line fluency", "Scripting (Python or Bash)"],
  }
}

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/10 text-rose-300 border-rose-500/30",
}

/**
 * Hardcoded fallback - only shown if /api/learning-paths is unreachable.
 * Mirrors the production DB rows seeded by prisma/seed-production.ts.
 */
const LEARNING_PATHS: LearningPath[] = [
  {
    id: "beginner-cyber",
    name: "Beginner Cybersecurity",
    tagline: "From zero to your first security cert.",
    icon: Shield,
    difficulty: "Beginner",
    durationHours: 40,
    skillsCount: 8,
    labsCount: 12,
    xpReward: 1500,
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    gradient: "from-emerald-500/15 via-emerald-600/5 to-transparent",
    skills: ["Networking Basics", "Linux Fundamentals", "Windows Admin", "Cryptography 101", "Threat Modeling", "OSINT", "Wireshark", "Nmap"],
    careerOutcome: "Junior Security Analyst · IT Support Specialist",
    progressPercent: 0,
    prerequisites: ["Basic computer literacy", "Comfort with the command line (or willingness to learn)"],
    modules: [
      {
        name: "Foundations",
        lessons: [
          { title: "What is cybersecurity?", type: "video" },
          { title: "The CIA Triad", type: "reading" },
          { title: "Threat actors & motives", type: "video" },
        ],
      },
      {
        name: "Systems & Networks",
        lessons: [
          { title: "Linux fundamentals", type: "video" },
          { title: "Windows administration", type: "video" },
          { title: "TCP/IP deep-dive", type: "reading" },
          { title: "Lab: Network reconnaissance", type: "lab" },
        ],
      },
      {
        name: "Tools of the Trade",
        lessons: [
          { title: "Nmap essentials", type: "video" },
          { title: "Wireshark packet analysis", type: "video" },
          { title: "Lab: Scan and identify services", type: "lab" },
          { title: "Module quiz", type: "quiz" },
        ],
      },
    ],
  },
  {
    id: "soc-analyst",
    name: "SOC Analyst",
    tagline: "Detect, triage, and respond to live threats.",
    icon: ShieldCheck,
    difficulty: "Intermediate",
    durationHours: 60,
    skillsCount: 10,
    labsCount: 18,
    xpReward: 2200,
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
    border: "border-cyan-500/40",
    gradient: "from-cyan-500/15 via-cyan-600/5 to-transparent",
    skills: ["SIEM (Splunk)", "Log Analysis", "Incident Response", "MITRE ATT&CK", "Threat Hunting", "IDS/IPS", "Endpoint Detection", "Phishing Analysis", "Forensics Basics", "Vulnerability Scanning"],
    careerOutcome: "SOC Analyst Tier 1 · Detection Engineer",
    progressPercent: 35,
    prerequisites: ["Beginner Cybersecurity path (or equivalent)", "Networking fundamentals"],
    modules: [
      {
        name: "SOC Fundamentals",
        lessons: [
          { title: "Anatomy of a SOC", type: "video" },
          { title: "The incident response lifecycle", type: "video" },
          { title: "MITRE ATT&CK framework", type: "reading" },
        ],
      },
      {
        name: "Detection & Analysis",
        lessons: [
          { title: "Splunk queries & SPL", type: "video" },
          { title: "Writing detection rules", type: "video" },
          { title: "Lab: Investigate a phishing email", type: "lab" },
          { title: "Lab: Trace a brute-force attack", type: "lab" },
        ],
      },
      {
        name: "Response & Reporting",
        lessons: [
          { title: "Containment strategies", type: "video" },
          { title: "Writing an incident report", type: "reading" },
          { title: "Lab: Full IR scenario", type: "lab" },
          { title: "Module quiz", type: "quiz" },
        ],
      },
    ],
  },
  {
    id: "pentester",
    name: "Penetration Tester",
    tagline: "Break into systems before the bad guys do.",
    icon: Swords,
    difficulty: "Advanced",
    durationHours: 90,
    skillsCount: 14,
    labsCount: 24,
    xpReward: 3500,
    color: "text-rose-300",
    tint: "bg-rose-500/10",
    border: "border-rose-500/40",
    gradient: "from-rose-500/15 via-rose-600/5 to-transparent",
    skills: ["Recon & OSINT", "Burp Suite", "Metasploit", "Privilege Escalation", "Lateral Movement", "Web App Pentesting", "Network Pentesting", "AD Attacks", "SQL Injection", "XSS", "SSRF", "File Upload Bypass", "Pivoting", "Report Writing"],
    careerOutcome: "Junior Pentester · Red Team Operator",
    progressPercent: 12,
    prerequisites: ["Intermediate networking knowledge", "Linux command-line fluency", "Scripting (Python or Bash)"],
    modules: [
      {
        name: "Reconnaissance",
        lessons: [
          { title: "Passive vs active recon", type: "video" },
          { title: "OSINT toolchain", type: "video" },
          { title: "Lab: Map an external attack surface", type: "lab" },
        ],
      },
      {
        name: "Exploitation",
        lessons: [
          { title: "Metasploit framework", type: "video" },
          { title: "Web app attack methodology", type: "video" },
          { title: "Lab: SQL injection against DVWA", type: "lab" },
          { title: "Lab: Burp Suite XSS chain", type: "lab" },
        ],
      },
      {
        name: "Post-Exploitation",
        lessons: [
          { title: "Linux privesc techniques", type: "video" },
          { title: "Active Directory attacks", type: "video" },
          { title: "Lab: Kerberoast a domain", type: "lab" },
          { title: "Module quiz", type: "quiz" },
        ],
      },
    ],
  },
  {
    id: "cloud-sec",
    name: "Cloud Security",
    tagline: "Secure AWS, Azure, and Kubernetes at scale.",
    icon: Cloud,
    difficulty: "Intermediate",
    durationHours: 70,
    skillsCount: 12,
    labsCount: 20,
    xpReward: 2800,
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    border: "border-violet-500/40",
    gradient: "from-violet-500/15 via-violet-600/5 to-transparent",
    skills: ["AWS IAM", "S3 Security", "Azure AD", "Kubernetes Hardening", "Container Security", "Terraform Security", "Cloud Logging", "CSPM", "Secrets Management", "Serverless Security", "Cloud Networking", "Zero Trust"],
    careerOutcome: "Cloud Security Engineer · DevSecOps Engineer",
    progressPercent: 0,
    prerequisites: ["AWS or Azure fundamentals", "Containerization basics (Docker)"],
    modules: [
      {
        name: "Cloud Foundations",
        lessons: [
          { title: "Shared responsibility model", type: "video" },
          { title: "AWS IAM deep-dive", type: "video" },
          { title: "Lab: Audit an AWS account", type: "lab" },
        ],
      },
      {
        name: "Container & K8s Security",
        lessons: [
          { title: "Docker security best practices", type: "video" },
          { title: "Kubernetes attack surface", type: "video" },
          { title: "Lab: Escape a misconfigured container", type: "lab" },
        ],
      },
      {
        name: "DevSecOps",
        lessons: [
          { title: "IaC security with Terraform", type: "video" },
          { title: "CI/CD pipeline scanning", type: "video" },
          { title: "Lab: Secure a Terraform project", type: "lab" },
          { title: "Module quiz", type: "quiz" },
        ],
      },
    ],
  },
  {
    id: "web-sec-specialist",
    name: "Web Security Specialist",
    tagline: "Hunt bugs in modern web applications.",
    icon: Globe,
    difficulty: "Intermediate",
    durationHours: 65,
    skillsCount: 11,
    labsCount: 22,
    xpReward: 2600,
    color: "text-amber-300",
    tint: "bg-amber-500/10",
    border: "border-amber-500/40",
    gradient: "from-amber-500/15 via-amber-600/5 to-transparent",
    skills: ["OWASP Top 10", "Burp Suite Pro", "SQL Injection", "XSS", "SSRF", "CSRF", "JWT Attacks", "GraphQL Security", "API Security", "Business Logic Flaws", "Bug Bounty Hunting"],
    careerOutcome: "Web App Security Tester · Bug Bounty Hunter",
    progressPercent: 48,
    prerequisites: ["HTTP & REST API basics", "JavaScript fundamentals"],
    modules: [
      {
        name: "Web App Foundations",
        lessons: [
          { title: "OWASP Top 10 walkthrough", type: "video" },
          { title: "Burp Suite mastery", type: "video" },
          { title: "Lab: Proxy and modify requests", type: "lab" },
        ],
      },
      {
        name: "Injection Attacks",
        lessons: [
          { title: "SQL injection playbook", type: "video" },
          { title: "XSS exploitation", type: "video" },
          { title: "Lab: SQLi to data exfil", type: "lab" },
          { title: "Lab: Stored XSS to admin takeover", type: "lab" },
        ],
      },
      {
        name: "Modern Web Attacks",
        lessons: [
          { title: "JWT manipulation", type: "video" },
          { title: "GraphQL & API abuse", type: "video" },
          { title: "Lab: SSRF to cloud metadata", type: "lab" },
          { title: "Module quiz", type: "quiz" },
        ],
      },
    ],
  },
  {
    id: "sec-engineer",
    name: "Security Engineer",
    tagline: "Design and build defensible systems.",
    icon: Lock,
    difficulty: "Advanced",
    durationHours: 100,
    skillsCount: 16,
    labsCount: 26,
    xpReward: 3800,
    color: "text-teal-300",
    tint: "bg-teal-500/10",
    border: "border-teal-500/40",
    gradient: "from-teal-500/15 via-teal-600/5 to-transparent",
    skills: ["Secure Architecture", "Threat Modeling", "Zero Trust Networks", "PKI & Cryptography", "IAM Design", "SIEM Engineering", "SOAR Automation", "Endpoint Hardening", "Cloud Security Architecture", "Secure SDLC", "Container Security", "Network Segmentation", "Incident Response", "Compliance (SOC2/ISO27001)", "Vulnerability Management", "Security Automation"],
    careerOutcome: "Security Engineer · Security Architect",
    progressPercent: 5,
    prerequisites: ["3+ years in IT, ops, or dev", "Intermediate networking & OS knowledge"],
    modules: [
      {
        name: "Architecture & Design",
        lessons: [
          { title: "Threat modeling with STRIDE", type: "video" },
          { title: "Zero trust architecture", type: "video" },
          { title: "Lab: Design a segmented network", type: "lab" },
        ],
      },
      {
        name: "Detection Engineering",
        lessons: [
          { title: "Building a SIEM pipeline", type: "video" },
          { title: "SOAR automation playbooks", type: "video" },
          { title: "Lab: Write a detection rule", type: "lab" },
        ],
      },
      {
        name: "Secure Operations",
        lessons: [
          { title: "Hardening endpoints at scale", type: "video" },
          { title: "Compliance & audit readiness", type: "video" },
          { title: "Lab: Run a tabletop exercise", type: "lab" },
          { title: "Module quiz", type: "quiz" },
        ],
      },
    ],
  },
]

const LESSON_ICONS: Record<PathModule["lessons"][number]["type"], LucideIcon> = {
  video: BookOpen,
  reading: BookOpen,
  lab: Beaker,
  quiz: FileQuestion,
}

const LESSON_COLORS: Record<PathModule["lessons"][number]["type"], string> = {
  video: "text-cyan-300",
  reading: "text-violet-300",
  lab: "text-amber-300",
  quiz: "text-rose-300",
}

export function LearningPathsView() {
  const { navigate } = useAppStore()
  const [expandedPathId, setExpandedPathId] = React.useState<string | null>(null)

  // Fetch real learning paths from the database. Falls back to the
  // hardcoded LEARNING_PATHS array below if the API is unreachable.
  const { data: pathsData } = useQuery<{ learningPaths: LearningPathRow[]; count: number } | null>({
    queryKey: ["learning-paths-view"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/learning-paths")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })

  const paths: LearningPath[] = React.useMemo(() => {
    const rows = pathsData?.learningPaths ?? []
    if (rows.length > 0) {
      return rows.map(mapRowToPath)
    }
    return LEARNING_PATHS
  }, [pathsData])

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ====================================================
            HERO
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">
              CAREER PATHS · BEGINNER TO JOB-READY
            </span>
          </div>

          <h1 className="text-[clamp(2.25rem,7vw,5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-5 text-balance">
            Choose your <span className="text-gradient-premium">mission.</span>
          </h1>

          <p className="text-muted-foreground max-w-2xl text-base lg:text-lg text-balance">
            Guided cybersecurity career paths from beginner to job-ready. Pick a destination, follow the curriculum, and ship with the skills recruiters actually screen for.
          </p>
        </motion.section>

        {/* ====================================================
            PATH CARDS
            ==================================================== */}
        <section aria-labelledby="paths-heading" className="mb-12">
          <h2 id="paths-heading" className="sr-only">Learning paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paths.map((path, i) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <PathCard
                  path={path}
                  isExpanded={expandedPathId === path.id}
                  onToggle={() =>
                    setExpandedPathId((prev) => (prev === path.id ? null : path.id))
                  }
                  onStart={() => navigate({ name: "login" })}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ====================================================
            COMPARISON TABLE
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
          aria-labelledby="compare-heading"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[10px] font-mono text-cyan-300 tracking-[0.3em]">
              SIDE-BY-SIDE COMPARISON
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-transparent" />
          </div>
          <h2 id="compare-heading" className="text-2xl lg:text-3xl font-bold tracking-tight mb-6">
            Weigh them up against each other.
          </h2>

          <div className="card-premium rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4 py-3">Path</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4 py-3">Duration</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4 py-3">Difficulty</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4 py-3">Skills</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4 py-3 hidden md:table-cell">Career outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {paths.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("flex size-7 items-center justify-center rounded-md border", p.tint, p.border, p.color)}>
                            <p.icon className="size-3.5" />
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.durationHours}h</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded border px-2 py-0.5 text-[10px] font-mono", DIFFICULTY_BADGE[p.difficulty])}>
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.skillsCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{p.careerOutcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* ====================================================
            FINAL CTA
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-card/60 backdrop-blur-sm p-8 lg:p-12 text-center"
        >
          <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-cyan-600/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <Sparkles className="h-10 w-10 text-cyan-300 mx-auto mb-4" />
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
              Not sure which path?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Take the 10-minute skill assessment. We&apos;ll match you to the path that closes your biggest gaps fastest.
            </p>
            <Button
              size="lg"
              onClick={() => navigate({ name: "skill-assessments" })}
              className="bg-cyan-600 hover:bg-cyan-500 btn-premium group"
            >
              <Target className="mr-2 h-4 w-4" />
              TAKE SKILL ASSESSMENT
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

/* ============================================================
   PathCard - rich path card with expand/collapse
   ============================================================ */

interface PathCardProps {
  path: LearningPath
  isExpanded: boolean
  onToggle: () => void
  onStart: () => void
}

function PathCard({ path, isExpanded, onToggle, onStart }: PathCardProps) {
  return (
    <div className="card-premium rounded-xl h-full flex flex-col overflow-hidden">
      {/* Header banner */}
      <div className={cn("relative bg-gradient-to-br p-5", path.gradient)}>
        <div className="flex items-start justify-between mb-3">
          <span className={cn("flex size-12 items-center justify-center rounded-xl border backdrop-blur-sm", path.tint, path.border, path.color)}>
            <path.icon className="size-6" />
          </span>
          <span className={cn("inline-flex rounded border px-2 py-0.5 text-[10px] font-mono font-semibold", DIFFICULTY_BADGE[path.difficulty])}>
            {path.difficulty}
          </span>
        </div>
        <h3 className="text-xl font-bold tracking-tight mb-1">{path.name}</h3>
        <p className="text-sm text-muted-foreground">{path.tagline}</p>
      </div>

      {/* Meta row */}
      <div className="px-5 pt-4 grid grid-cols-4 gap-2 text-center">
        <MetaStat icon={Clock} value={`${path.durationHours}h`} label="Duration" />
        <MetaStat icon={Network} value={path.skillsCount} label="Skills" />
        <MetaStat icon={Beaker} value={path.labsCount} label="Labs" />
        <MetaStat icon={Zap} value={path.xpReward.toLocaleString()} label="XP" />
      </div>

      {/* Skills chips */}
      <div className="px-5 pt-4">
        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-2">SKILLS YOU&apos;LL GAIN</p>
        <div className="flex flex-wrap gap-1.5">
          {path.skills.slice(0, isExpanded ? path.skills.length : 5).map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono",
                path.tint,
                path.border,
                path.color
              )}
            >
              {s}
            </span>
          ))}
          {!isExpanded && path.skills.length > 5 && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              +{path.skills.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Career outcome */}
      <div className="px-5 pt-4">
        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-2">CAREER OUTCOME</p>
        <div className="flex items-center gap-2 text-sm">
          <Trophy className={cn("size-4 shrink-0", path.color)} />
          <span className="text-foreground/90">{path.careerOutcome}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">PROGRESS</span>
          <span className={cn("text-xs font-mono font-semibold", path.color)}>{path.progressPercent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", path.color.replace("text-", "bg-"))}
            initial={{ width: 0 }}
            animate={{ width: `${path.progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-5 pt-5 pb-5 mt-auto flex gap-2">
        <Button
          onClick={onStart}
          className={cn("flex-1 btn-premium", path.color.replace("text-", "bg-").replace("300", "600"), "hover:opacity-90")}
        >
          <GraduationCap className="mr-1.5 h-4 w-4" />
          START PATH
        </Button>
        <Button
          variant="outline"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`path-detail-${path.id}`}
          className="border-border/60"
        >
          {isExpanded ? <ArrowLeft className="h-4 w-4 mr-1.5" /> : null}
          {isExpanded ? "Hide" : "Curriculum"}
        </Button>
      </div>

      {/* Expandable curriculum */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="detail"
            id={`path-detail-${path.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/40"
          >
            <PathCurriculum path={path} onEnroll={onStart} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MetaStat({ icon: Icon, value, label }: { icon: LucideIcon; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="font-mono text-xs font-semibold">{value}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  )
}

/* ============================================================
   PathCurriculum - expanded panel inside a path card
   ============================================================ */

function PathCurriculum({ path, onEnroll }: { path: LearningPath; onEnroll: () => void }) {
  return (
    <div className="p-5 bg-muted/20 space-y-5">
      {/* Prerequisites */}
      <div>
        <p className="text-[10px] font-mono text-amber-300 tracking-[0.2em] mb-2">PREREQUISITES</p>
        <ul className="space-y-1.5">
          {path.prerequisites.map((p) => (
            <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Circle className="size-3 mt-0.5 shrink-0 text-muted-foreground/60" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Modules */}
      <div>
        <p className="text-[10px] font-mono text-cyan-300 tracking-[0.2em] mb-3">CURRICULUM · {path.modules.length} MODULES</p>
        <div className="space-y-4">
          {path.modules.map((mod, mi) => (
            <div key={mod.name} className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("flex size-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold", path.tint, path.border, path.color)}>
                  {mi + 1}
                </span>
                <h4 className="text-sm font-semibold">{mod.name}</h4>
              </div>
              <ul className="ml-8 space-y-1.5 border-l border-border/40 pl-4">
                {mod.lessons.map((lesson) => {
                  const Icon = LESSON_ICONS[lesson.type]
                  const color = LESSON_COLORS[lesson.type]
                  return (
                    <li key={lesson.title} className="flex items-center gap-2 text-xs">
                      <Icon className={cn("size-3.5 shrink-0", color)} />
                      <span className="text-foreground/80">{lesson.title}</span>
                      <span className={cn("ml-auto font-mono text-[9px] uppercase tracking-wider", color)}>
                        {lesson.type}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Career outcome detail */}
      <div>
        <p className="text-[10px] font-mono text-emerald-300 tracking-[0.2em] mb-2">CAREER OUTCOMES</p>
        <ul className="space-y-1.5">
          {path.careerOutcome.split(" · ").map((role) => (
            <li key={role} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span className="text-foreground/90">{role}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Estimated time + enroll */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground">
          <Clock className="inline size-3 mr-1" />
          Est. <span className="font-mono text-foreground/90">{path.durationHours}h</span> · {path.modules.length} modules · {path.labsCount} labs
        </div>
        <Button
          size="sm"
          onClick={onEnroll}
          className={cn("btn-premium", path.color.replace("text-", "bg-").replace("300", "600"), "hover:opacity-90")}
        >
          ENROLL NOW
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
