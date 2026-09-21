"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatTile } from "@/components/cyber/stat-tile"
import { RankBadge } from "@/components/cyber/rank-badge"
import { cn } from "@/lib/utils"
import {
  ScrollReveal,
} from "@/components/platform/motion-system"
import {
  Briefcase,
  Target,
  TrendingUp,
  GraduationCap,
  Award,
  FlaskConical,
  Map,
  CheckCircle2,
  Circle,
  Rocket,
  Clock,
  Sparkles,
  Network as NetworkIcon,
  Terminal,
  Globe,
  ShieldAlert,
  Cloud,
  Cpu,
  ArrowRight,
  Trophy,
  Calendar,
  Zap,
  BriefcaseIcon,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   CareerPlannerView - Career Command Center
   Skill assessment, job readiness, paths, certs, timeline
   ============================================================ */

interface CareerRole {
  id: string
  title: string
  description: string
  avgSalary: string
  requiredSkills: string[]
  recommendedCourses: string[]
  growthRate: string
  category: string
}

/* ---------------------------------------------------------------- *
 *  Shape returned by /api/career-roles (new CareerPathRole model) *
 * ---------------------------------------------------------------- */
interface CareerPathRoleRow {
  id: string
  slug: string
  title: string
  description?: string | null
  icon: string
  color: string
  skillWeights: Record<string, number>
  minThreshold: number
  recommendedCerts: string[]
  recommendedCourses: string[]
  recommendedLabs: string[]
  salaryRange?: string | null
  demand: string
  published: boolean
  order: number
}

/** Humanize a skillWeights key like "pentesting" → "Pentesting". */
function humanizeSkill(key: string): string {
  if (!key) return ""
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** Map demand ("High" | "Medium" | "Low") → a growth-rate display string. */
function demandToGrowth(demand: string): string {
  const d = (demand || "").toLowerCase()
  if (d.startsWith("high")) return "↑ 18% / yr"
  if (d.startsWith("med")) return "↑ 9% / yr"
  if (d.startsWith("low")) return "↑ 2% / yr"
  return "↑ 5% / yr"
}

/** Pick a category ("security" | "cloud" | "governance" | "network") from
 *  the dominant skill weight in the row. Falls back to "security". */
function categoryFromWeights(weights: Record<string, number>): string {
  const entries = Object.entries(weights ?? {})
  if (entries.length === 0) return "security"
  entries.sort((a, b) => b[1] - a[1])
  const top = entries[0][0].toLowerCase()
  if (top.includes("cloud")) return "cloud"
  if (top.includes("govern") || top.includes("report")) return "governance"
  if (top.includes("network") || top.includes("tcp")) return "network"
  return "security"
}

/** Convert a DB CareerPathRoleRow into the local CareerRole shape. */
function mapRowToCareerRole(row: CareerPathRoleRow): CareerRole {
  const weights = row.skillWeights ?? {}
  const requiredSkills = Object.keys(weights).map(humanizeSkill)
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    avgSalary: row.salaryRange || "Competitive",
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["Cybersecurity Fundamentals"],
    recommendedCourses: row.recommendedCourses ?? [],
    growthRate: demandToGrowth(row.demand),
    category: categoryFromWeights(weights),
  }
}

/** Hardcoded fallback - used only if /api/career-roles is unreachable. */
const FALLBACK_ROLES: CareerRole[] = [
  {
    id: "fb-junior-pentester",
    title: "Junior Penetration Tester",
    description:
      "Entry-level offensive security role. Executes scoped penetration tests against networks and web apps, documents findings, and supports senior testers on engagements.",
    avgSalary: "$70,000-$100,000",
    requiredSkills: ["Networking", "Linux", "Web", "Pentesting", "Reporting"],
    recommendedCourses: [],
    growthRate: "↑ 18% / yr",
    category: "security",
  },
  {
    id: "fb-soc-analyst",
    title: "SOC Analyst",
    description:
      "Monitors SIEM, triages alerts, escalates true positives, and writes initial incident reports. The classic blue-team entry point.",
    avgSalary: "$65,000-$95,000",
    requiredSkills: ["Networking", "Linux", "Web", "Defensive", "Reporting"],
    recommendedCourses: [],
    growthRate: "↑ 18% / yr",
    category: "security",
  },
  {
    id: "fb-security-engineer",
    title: "Security Engineer",
    description:
      "Designs, deploys, and maintains defensive security infrastructure - firewalls, EDR, IAM, WAF. Bridges blue-team and DevOps.",
    avgSalary: "$110,000-$155,000",
    requiredSkills: ["Networking", "Linux", "Defensive", "Engineering", "Cloud"],
    recommendedCourses: [],
    growthRate: "↑ 18% / yr",
    category: "security",
  },
  {
    id: "fb-cloud-security-engineer",
    title: "Cloud Security Engineer",
    description:
      "Secures cloud-native workloads. Implements CSPM, CI/CD security, container hardening, and zero-trust across AWS/Azure/GCP.",
    avgSalary: "$130,000-$180,000",
    requiredSkills: ["Cloud", "Networking", "Linux", "Engineering", "Defensive"],
    recommendedCourses: [],
    growthRate: "↑ 18% / yr",
    category: "cloud",
  },
  {
    id: "fb-web-application-tester",
    title: "Web Application Tester",
    description:
      "Specializes in web app pentesting. Deep OWASP Top 10 knowledge, advanced SQLi/XSS, SSRF, JWT attacks, and API security testing.",
    avgSalary: "$95,000-$140,000",
    requiredSkills: ["Web", "Pentesting", "Networking", "Linux", "Reporting"],
    recommendedCourses: [],
    growthRate: "↑ 18% / yr",
    category: "security",
  },
  {
    id: "fb-security-consultant",
    title: "Security Consultant",
    description:
      "Advises clients on security strategy, risk, compliance, and architecture. Combines technical depth with strong communication.",
    avgSalary: "$120,000-$180,000",
    requiredSkills: ["Engineering", "Defensive", "Pentesting", "Governance", "Reporting"],
    recommendedCourses: [],
    growthRate: "↑ 9% / yr",
    category: "governance",
  },
]

interface CareerPath {
  id: string
  targetRole: string
  currentRole: string
  targetSalary: string
  recommendedCourses: string[]
  recommendedCerts: string[]
  recommendedLabs: string[]
  estimatedWeeks: number
  progress: number
}

interface CourseItem {
  id: string
  shortName: string
  title: string
}
interface LabItem {
  id: string
  title: string
  category: string
  difficulty: string
}

const DEFAULT_CERTS: Record<string, string[]> = {
  security: ["CompTIA Security+", "CEH", "CySA+", "OSCP"],
  cloud: ["CCSP", "AWS Security Specialty", "Azure SC-100"],
  governance: ["CISSP", "CISM", "ISO 27001 Lead Auditor"],
  network: ["CCNA", "CCNP Security", "Palo Alto PCNSE"],
}

const CATEGORY_LABEL: Record<string, string> = {
  security: "Security",
  cloud: "Cloud",
  governance: "Governance",
  network: "Network",
}

const CATEGORY_COLOR: Record<string, string> = {
  security: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  cloud: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  governance: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  network: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
}

// ============================================================
// Skill Assessment - 6 cyber skills with animated percentages
// ============================================================
interface SkillAssessment {
  name: string
  percentage: number
  icon: typeof NetworkIcon
  color: string
  barColor: string
}

const SKILL_ASSESSMENTS: SkillAssessment[] = [
  { name: "Networking", percentage: 78, icon: NetworkIcon, color: "text-cyan-300", barColor: "from-cyan-500 to-cyan-400" },
  { name: "Linux", percentage: 65, icon: Terminal, color: "text-amber-300", barColor: "from-amber-500 to-amber-400" },
  { name: "Web Security", percentage: 82, icon: Globe, color: "text-violet-300", barColor: "from-violet-500 to-violet-400" },
  { name: "Pentesting", percentage: 54, icon: ShieldAlert, color: "text-rose-300", barColor: "from-rose-500 to-rose-400" },
  { name: "SOC Analysis", percentage: 71, icon: Cpu, color: "text-emerald-300", barColor: "from-emerald-500 to-emerald-400" },
  { name: "Cloud Security", percentage: 38, icon: Cloud, color: "text-teal-300", barColor: "from-teal-500 to-teal-400" },
]

function getSkillStatus(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Expert", color: "text-emerald-300" }
  if (pct >= 60) return { label: "Proficient", color: "text-cyan-300" }
  if (pct >= 40) return { label: "Intermediate", color: "text-amber-300" }
  return { label: "Beginner", color: "text-rose-300" }
}

// ============================================================
// Job Readiness - 3 role cards
// ============================================================
interface JobReadiness {
  role: string
  readiness: number
  avgSalary: string
  matchingSkills: string[]
  missingSkills: string[]
  recommendedCourses: string[]
}

const JOB_READINESS: JobReadiness[] = [
  {
    role: "Junior Penetration Tester",
    readiness: 82,
    avgSalary: "$75K-$95K",
    matchingSkills: ["Web Security", "Networking", "Linux"],
    missingSkills: ["Burp Suite Pro", "Report Writing"],
    recommendedCourses: ["WAPT", "CEH"],
  },
  {
    role: "SOC Analyst (Tier 1)",
    readiness: 71,
    avgSalary: "$55K-$75K",
    matchingSkills: ["Networking", "Linux", "SOC Analysis"],
    missingSkills: ["SIEM (Splunk)", "Threat Intel"],
    recommendedCourses: ["CySA+", "CCNA"],
  },
  {
    role: "Security Engineer",
    readiness: 54,
    avgSalary: "$110K-$150K",
    matchingSkills: ["Networking", "Linux"],
    missingSkills: ["Cloud Security", "IAM/PAM", "Automation"],
    recommendedCourses: ["CISSP", "AWS Security"],
  },
]

// ============================================================
// Recommended Certifications
// ============================================================
interface RecommendedCert {
  name: string
  provider: string
  difficulty: "Foundation" | "Intermediate" | "Advanced" | "Expert"
  readiness: number
  weeks: number
  color: string
}

const RECOMMENDED_CERTS: RecommendedCert[] = [
  { name: "CEH", provider: "EC-Council", difficulty: "Intermediate", readiness: 86, weeks: 8, color: "text-violet-300" },
  { name: "OSCP", provider: "Offensive Security", difficulty: "Expert", readiness: 54, weeks: 16, color: "text-rose-300" },
  { name: "CISSP", provider: "ISC²", difficulty: "Advanced", readiness: 38, weeks: 24, color: "text-amber-300" },
  { name: "CompTIA Security+", provider: "CompTIA", difficulty: "Foundation", readiness: 92, weeks: 4, color: "text-emerald-300" },
]

const DIFFICULTY_COLOR: Record<RecommendedCert["difficulty"], string> = {
  Foundation: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  Intermediate: "border-cyan-500/30 text-cyan-300 bg-cyan-500/10",
  Advanced: "border-amber-500/30 text-amber-300 bg-amber-500/10",
  Expert: "border-rose-500/30 text-rose-300 bg-rose-500/10",
}

// ============================================================
// Career Timeline - Current → 3 months → 6 months → 1 year
// ============================================================
interface TimelineMilestone {
  period: string
  periodLabel: string
  skillTarget: string
  skillPct: number
  certTarget: string
  roleTarget: string
  status: "current" | "next" | "future" | "future"
}

const TIMELINE: TimelineMilestone[] = [
  { period: "now", periodLabel: "Current", skillTarget: "Avg 64%", skillPct: 64, certTarget: "Foundation", roleTarget: "Student", status: "current" },
  { period: "3mo", periodLabel: "3 Months", skillTarget: "Avg 75%", skillPct: 75, certTarget: "CEH", roleTarget: "Junior Pentester", status: "next" },
  { period: "6mo", periodLabel: "6 Months", skillTarget: "Avg 85%", skillPct: 85, certTarget: "OSCP", roleTarget: "Pentester", status: "future" },
  { period: "1yr", periodLabel: "1 Year", skillTarget: "Avg 92%", skillPct: 92, certTarget: "CISSP", roleTarget: "Security Engineer", status: "future" },
]

export function CareerPlannerView() {
  const qc = useQueryClient()
  const { navigate } = useAppStore()

  // Fetch real career roles from the database via /api/career-roles (the
  // new CareerPathRole schema). Falls back to FALLBACK_ROLES if the API
  // is unreachable.
  const { data: rolesData, isLoading: rolesLoading } = useQuery<{ careerRoles: CareerPathRoleRow[]; count: number } | null>({
    queryKey: ["career-roles-public"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/career-roles")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })

  const roles: CareerRole[] = React.useMemo(() => {
    const rows = rolesData?.careerRoles ?? []
    if (rows.length > 0) {
      return rows.map(mapRowToCareerRole)
    }
    return FALLBACK_ROLES
  }, [rolesData])

  const { data: coursesData } = useQuery<{ courses: CourseItem[] }>({
    queryKey: ["career-courses"],
    queryFn: () => api("/api/courses"),
  })
  const { data: labsData } = useQuery<{ labs: LabItem[] }>({
    queryKey: ["career-labs"],
    queryFn: () => api("/api/labs"),
  })

  const { data: pathData } = useQuery<{ path: CareerPath | null }>({
    queryKey: ["career-path"],
    queryFn: () => api("/api/career/path"),
  })

  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("")
  const [currentRole, setCurrentRole] = React.useState("")
  const [targetSalary, setTargetSalary] = React.useState("")
  const [estimatedWeeks, setEstimatedWeeks] = React.useState(12)

  // Pre-fill when path loads
  React.useEffect(() => {
    if (pathData?.path) {
      const role = roles.find((r) => r.title === pathData.path!.targetRole)
      if (role) setSelectedRoleId(role.id)
      setCurrentRole(pathData.path.currentRole)
      setTargetSalary(pathData.path.targetSalary)
      setEstimatedWeeks(pathData.path.estimatedWeeks)
    }
  }, [pathData, roles])

  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) throw new Error("Select a target role first")
      const courseIds = (coursesData?.courses ?? [])
        .slice(0, 4)
        .map((c) => c.id)
      const labIds = (labsData?.labs ?? []).slice(0, 3).map((l) => l.id)
      const certs = DEFAULT_CERTS[selectedRole.category] || DEFAULT_CERTS.security
      return api<{ path: CareerPath }>("/api/career/path", {
        method: "POST",
        body: JSON.stringify({
          targetRole: selectedRole.title,
          currentRole,
          targetSalary,
          recommendedCourses: courseIds,
          recommendedCerts: certs,
          recommendedLabs: labIds,
          estimatedWeeks,
        }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["career-path"] })
      toast.success("Career path saved")
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save career path"),
  })

  const path = pathData?.path ?? null
  const avgSkill = Math.round(
    SKILL_ASSESSMENTS.reduce((a, s) => a + s.percentage, 0) / SKILL_ASSESSMENTS.length
  )

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-12 lg:space-y-16">
        {/* ====================================================
            SECTION 1: HERO - "Turn skills into careers."
            ==================================================== */}
        <section>
          <ScrollReveal>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">
                CAREER COMMAND CENTER
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-4 text-balance">
              Turn skills into <span className="text-gradient-premium">careers.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-muted-foreground max-w-2xl mb-8 text-base lg:text-lg leading-relaxed">
              Your personalized cyber security career intelligence dashboard. Track your skills,
              see your job readiness score, follow curated career paths, and earn the certifications
              that move you from student to specialist.
            </p>
          </ScrollReveal>

          {/* Quick stats */}
          <ScrollReveal delay={0.3}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                icon={Zap}
                label="Avg Skill Score"
                value={avgSkill}
                suffix="%"
                color="text-violet-300"
                tint="bg-violet-500/10"
                trend={{ value: 12, direction: "up" }}
              />
              <StatTile
                icon={Trophy}
                label="Ready Roles"
                value={JOB_READINESS.length}
                color="text-amber-300"
                tint="bg-amber-500/10"
              />
              <StatTile
                icon={Award}
                label="Cert Recommendations"
                value={RECOMMENDED_CERTS.length}
                color="text-cyan-300"
                tint="bg-cyan-500/10"
              />
              <StatTile
                icon={BriefcaseIcon}
                label="Open Cyber Roles"
                value={"1.2K"}
                color="text-emerald-300"
                tint="bg-emerald-500/10"
                trend={{ value: 24, direction: "up" }}
              />
            </div>
          </ScrollReveal>
        </section>

        {/* ====================================================
            SECTION 2: SKILL ASSESSMENT DASHBOARD
            ==================================================== */}
        <section>
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-violet-300" />
                  <p className="text-[10px] font-mono text-violet-300/80 tracking-[0.25em]">
                    SKILL ASSESSMENT
                  </p>
                </div>
                <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">
                  Your cyber skill matrix.
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  Live proficiency scores across six core cyber security domains, computed from your
                  labs, courses, and quiz performance.
                </p>
              </div>
              <RankBadge rank="OPERATOR" level={4} size="lg" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-5 lg:p-7">
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                {SKILL_ASSESSMENTS.map((s, i) => {
                  const status = getSkillStatus(s.percentage)
                  return (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 * i }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("inline-flex items-center justify-center size-8 rounded-lg border border-border/60 bg-background/40", s.color)}>
                            <s.icon className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-medium">{s.name}</span>
                          <Badge variant="outline" className={cn("text-[9px] font-mono tracking-wider", status.color, "border-current/30 bg-transparent")}>
                            {status.label}
                          </Badge>
                        </div>
                        <span className={cn("font-mono text-sm font-bold tabular-nums", s.color)}>
                          {s.percentage}%
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full border border-border/60 bg-[oklch(0.1_0.008_270)]">
                        <motion.div
                          className={cn("relative h-full rounded-full bg-gradient-to-r", s.barColor)}
                          initial={{ width: 0 }}
                          animate={{ width: `${s.percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />
                        </motion.div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ====================================================
            SECTION 3: JOB READINESS SCORES
            ==================================================== */}
        <section>
          <ScrollReveal>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-emerald-300" />
              <p className="text-[10px] font-mono text-emerald-300/80 tracking-[0.25em]">
                JOB READINESS SCORES
              </p>
            </div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">
              You are ready for.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Based on your current skill matrix, these are the cyber security roles you qualify for today.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {JOB_READINESS.map((job, i) => {
                const status = getSkillStatus(job.readiness)
                const accent =
                  job.readiness >= 80
                    ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40"
                    : job.readiness >= 60
                    ? "from-cyan-500/20 to-cyan-500/5 border-cyan-500/40"
                    : "from-amber-500/20 to-amber-500/5 border-amber-500/40"
                return (
                  <motion.div
                    key={job.role}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * i }}
                  >
                    <div className={cn(
                      "relative h-full flex flex-col rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-sm",
                      "transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_oklch(0.6_0.2_295_/_0.25)]",
                      accent
                    )}>
                      {/* Header - role + readiness score */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">
                            Role
                          </p>
                          <h3 className="text-base font-semibold leading-tight">{job.role}</h3>
                          <p className="text-[11px] font-mono text-muted-foreground mt-1">{job.avgSalary}</p>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-3xl font-bold tabular-nums leading-none", status.color)}>
                            {job.readiness}%
                          </div>
                          <p className={cn("text-[9px] font-mono uppercase tracking-wider mt-1", status.color)}>
                            {status.label}
                          </p>
                        </div>
                      </div>

                      {/* Readiness bar */}
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted mb-5">
                        <motion.div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r",
                            job.readiness >= 80 ? "from-emerald-500 to-emerald-400"
                              : job.readiness >= 60 ? "from-cyan-500 to-cyan-400"
                              : "from-amber-500 to-amber-400"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${job.readiness}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>

                      {/* Matching skills */}
                      <div className="mb-3">
                        <p className="text-[10px] font-mono text-emerald-300/80 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Matching Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.matchingSkills.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/5 text-emerald-200">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Missing skills */}
                      <div className="mb-4">
                        <p className="text-[10px] font-mono text-rose-300/80 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                          <Circle className="h-3 w-3" /> Missing Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.missingSkills.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] border-rose-500/30 bg-rose-500/5 text-rose-200">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Recommended courses */}
                      <div className="mb-5">
                        <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1.5 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" /> Recommended Courses
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.recommendedCourses.map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px] border-border/60 bg-background/40">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-auto btn-premium"
                        onClick={() => navigate({ name: "job-board" })}
                      >
                        View Job Listings <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </ScrollReveal>
        </section>

        {/* ====================================================
            SECTION 4: YOUR CAREER PATH (existing path display)
            ==================================================== */}
        {path && (
          <section>
            <ScrollReveal>
              <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">
                      Your Career Path
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">{path.targetRole}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {path.currentRole ? `From: ${path.currentRole}` : "Set your current role"}{" "}
                      {path.targetSalary ? `→ Target: ${path.targetSalary}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                        Estimated
                      </p>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-violet-300" />
                        <span className="text-lg font-semibold">{path.estimatedWeeks}w</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Overall progress</span>
                  <span className="text-violet-300 font-mono">{path.progress}%</span>
                </div>
                <Progress value={path.progress} className="h-2" />
              </div>
            </ScrollReveal>
          </section>
        )}

        {/* ====================================================
            SECTION 5: RECOMMENDED CERTIFICATIONS
            ==================================================== */}
        <section>
          <ScrollReveal>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-amber-300" />
              <p className="text-[10px] font-mono text-amber-300/80 tracking-[0.25em]">
                RECOMMENDED CERTIFICATIONS
              </p>
            </div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">
              Certifications matched to your level.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Curated credential recommendations based on your current skill matrix and target roles.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
              {RECOMMENDED_CERTS.map((cert, i) => (
                <motion.div
                  key={cert.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * i }}
                >
                  <div className="relative h-full flex flex-col rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-5 transition-all duration-500 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.7_0.15_85_/_0.25)]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="inline-flex items-center justify-center size-10 rounded-lg border border-amber-500/30 bg-amber-500/10">
                        <Award className="h-5 w-5 text-amber-300" />
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] font-mono tracking-wider", DIFFICULTY_COLOR[cert.difficulty])}>
                        {cert.difficulty}
                      </Badge>
                    </div>

                    <h3 className={cn("text-xl font-bold tracking-tight mb-1", cert.color)}>{cert.name}</h3>
                    <p className="text-[11px] text-muted-foreground mb-4">{cert.provider}</p>

                    {/* Readiness */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                        <span className="text-muted-foreground uppercase tracking-wider">Your Readiness</span>
                        <span className="text-amber-200 font-bold">{cert.readiness}%</span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${cert.readiness}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mb-5">
                      <Clock className="h-3 w-3" />
                      <span className="uppercase tracking-wider">{cert.weeks} weeks prep</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-auto btn-premium border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                      onClick={() => navigate({ name: "catalog" })}
                    >
                      <Rocket className="h-3.5 w-3.5 mr-1.5" />
                      Start Prep
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ====================================================
            SECTION 6: CAREER TIMELINE
            ==================================================== */}
        <section>
          <ScrollReveal>
            <div className="flex items-center gap-2 mb-2">
              <Map className="h-4 w-4 text-cyan-300" />
              <p className="text-[10px] font-mono text-cyan-300/80 tracking-[0.25em]">
                CAREER TIMELINE
              </p>
            </div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">
              Your 12-month trajectory.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Where you are today, and where you&apos;ll be at 3, 6, and 12 months if you stay on the path.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 lg:p-8 mt-6">
              {/* Desktop horizontal timeline */}
              <div className="hidden md:block">
                {/* Track */}
                <div className="relative mb-8">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-border/60" />
                  <motion.div
                    className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                  />
                  <div className="relative flex justify-between">
                    {TIMELINE.map((m, i) => {
                      const color =
                        i === 0 ? "bg-cyan-500"
                          : i === 1 ? "bg-violet-500"
                          : i === 2 ? "bg-amber-500"
                          : "bg-rose-500"
                      const ringColor =
                        i === 0 ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
                          : i === 1 ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                          : i === 2 ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                          : "border-rose-500/60 bg-rose-500/10 text-rose-300"
                      return (
                        <motion.div
                          key={m.period}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
                          className="flex flex-col items-center"
                        >
                          <div className={cn(
                            "size-10 rounded-full border-2 flex items-center justify-center font-mono text-[10px] font-bold",
                            ringColor
                          )}>
                            {i + 1}
                          </div>
                          <span className={cn("absolute top-12 size-2 rounded-full", color)} aria-hidden />
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Milestone cards */}
                <div className="grid grid-cols-4 gap-4 mt-12">
                  {TIMELINE.map((m, i) => (
                    <motion.div
                      key={m.period}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.15 }}
                      className="rounded-xl border border-border/60 bg-background/40 p-4"
                    >
                      <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">
                        {m.period}
                      </p>
                      <h3 className="font-semibold text-sm mb-3">{m.periodLabel}</h3>

                      <div className="space-y-2.5">
                        {/* Skill target */}
                        <div>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Target className="h-2.5 w-2.5" /> Skill Target
                          </p>
                          <p className="text-xs font-medium mt-0.5">{m.skillTarget}</p>
                          <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted mt-1">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${m.skillPct}%` }}
                              transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                            />
                          </div>
                        </div>

                        {/* Cert target */}
                        <div>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Award className="h-2.5 w-2.5" /> Cert Target
                          </p>
                          <p className="text-xs font-medium mt-0.5">{m.certTarget}</p>
                        </div>

                        {/* Role target */}
                        <div>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Briefcase className="h-2.5 w-2.5" /> Role Target
                          </p>
                          <p className="text-xs font-medium mt-0.5">{m.roleTarget}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Mobile vertical timeline */}
              <div className="md:hidden space-y-4">
                {TIMELINE.map((m, i) => (
                  <motion.div
                    key={m.period}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * i }}
                    className="relative pl-8 pb-4 border-l-2 border-border/60"
                  >
                    <span className="absolute -left-2 top-1 size-4 rounded-full bg-violet-500 border-2 border-background" />
                    <p className="text-[10px] font-mono text-violet-300 tracking-wider uppercase mb-0.5">{m.period}</p>
                    <h3 className="font-semibold text-sm">{m.periodLabel}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Skill: <span className="text-foreground font-medium">{m.skillTarget}</span> · Cert: <span className="text-foreground font-medium">{m.certTarget}</span> · Role: <span className="text-foreground font-medium">{m.roleTarget}</span>
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ====================================================
            SECTION 7: TARGET ROLE PICKER (existing - kept)
            ==================================================== */}
        <section>
          <ScrollReveal>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-violet-300" />
              <h2 className="text-lg font-semibold">Choose your target role</h2>
            </div>
          </ScrollReveal>

          {rolesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map((r, i) => {
                const isSel = selectedRoleId === r.id
                return (
                  <ScrollReveal key={r.id} delay={0.3 + i * 0.04}>
                    <button
                      onClick={() => setSelectedRoleId(r.id)}
                      className={cn(
                        "w-full text-left rounded-xl border bg-card/30 backdrop-blur-sm p-5 transition-all hover:bg-card/50",
                        isSel
                          ? "border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                          : "border-border/60 hover:border-violet-500/30"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("inline-flex p-2 rounded-lg border", CATEGORY_COLOR[r.category] || CATEGORY_COLOR.security)}>
                          <Briefcase className="h-4 w-4" />
                        </div>
                        {isSel && (
                          <CheckCircle2 className="h-5 w-5 text-violet-300" />
                        )}
                      </div>
                      <h3 className="font-semibold mb-1.5 text-sm">{r.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{r.description}</p>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-violet-300/80">{r.avgSalary}</span>
                        <span className="text-emerald-300 flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          {r.growthRate}
                        </span>
                      </div>
                    </button>
                  </ScrollReveal>
                )
              })}
            </div>
          )}
        </section>

        {/* Selected role detail + roadmap form (existing - kept) */}
        {selectedRole && (
          <ScrollReveal>
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Role details + form */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-violet-300" />
                    <h3 className="font-semibold">{selectedRole.title}</h3>
                    <Badge variant="outline" className={cn("ml-auto text-[10px]", CATEGORY_COLOR[selectedRole.category] || CATEGORY_COLOR.security)}>
                      {CATEGORY_LABEL[selectedRole.category] || selectedRole.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {selectedRole.description}
                  </p>

                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-2">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRole.requiredSkills.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Avg Salary</p>
                      <p className="text-sm font-semibold text-violet-300">{selectedRole.avgSalary}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Growth</p>
                      <p className="text-sm font-semibold text-emerald-300">{selectedRole.growthRate}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Category</p>
                      <p className="text-sm font-semibold">{CATEGORY_LABEL[selectedRole.category]}</p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border/60 pt-4">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">
                        Current role
                      </label>
                      <Input
                        value={currentRole}
                        onChange={(e) => setCurrentRole(e.target.value)}
                        placeholder="e.g. Junior Developer"
                        className="bg-card border-border/60 text-sm h-9"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">
                          Target salary
                        </label>
                        <Input
                          value={targetSalary}
                          onChange={(e) => setTargetSalary(e.target.value)}
                          placeholder="$120,000"
                          className="bg-card border-border/60 text-sm h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">
                          Estimated weeks
                        </label>
                        <Input
                          type="number"
                          value={estimatedWeeks}
                          onChange={(e) => setEstimatedWeeks(Number(e.target.value) || 12)}
                          className="bg-card border-border/60 text-sm h-9"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="w-full bg-violet-600 hover:bg-violet-500 btn-premium"
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      {saveMutation.isPending ? "Saving..." : "Save Career Path"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recommended roadmap */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 sticky top-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Map className="h-4 w-4 text-violet-300" />
                    <h3 className="font-semibold">Recommended Roadmap</h3>
                  </div>
                  <ScrollArea className="max-h-[520px]">
                    <div className="space-y-4 pr-2">
                      <RoadmapSection
                        icon={GraduationCap}
                        title="Recommended Courses"
                        items={(coursesData?.courses ?? []).slice(0, 4).map((c) => ({
                          id: c.id,
                          label: c.shortName,
                          sub: c.title,
                        }))}
                      />
                      <RoadmapSection
                        icon={Award}
                        title="Certifications to Pursue"
                        items={(DEFAULT_CERTS[selectedRole.category] || DEFAULT_CERTS.security).map((c, i) => ({
                          id: String(i),
                          label: c,
                          sub: "",
                        }))}
                      />
                      <RoadmapSection
                        icon={FlaskConical}
                        title="Hands-on Labs"
                        items={(labsData?.labs ?? []).slice(0, 3).map((l) => ({
                          id: l.id,
                          label: l.title,
                          sub: `${l.category} · ${l.difficulty}`,
                        }))}
                      />
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  )
}

function RoadmapSection({
  icon: Icon,
  title,
  items,
}: {
  icon: any
  title: string
  items: { id: string; label: string; sub: string }[]
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-violet-300" />
        <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
          {title}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/70">No items yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 p-2.5"
            >
              <Circle className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{it.label}</p>
                {it.sub && <p className="text-[10px] text-muted-foreground truncate">{it.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
