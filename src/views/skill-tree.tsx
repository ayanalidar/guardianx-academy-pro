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
  SkillNode,
  type SkillNodeStatus,
  RankBadge,
} from "@/components/cyber"
import {
  Swords,
  Shield,
  Network as NetworkIcon,
  Globe,
  Cloud,
  Fingerprint,
  Lock,
  Check,
  Star,
  Zap,
  X,
  ArrowRight,
  BookOpen,
  Beaker,
  FileQuestion,
  Target,
  Filter,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/* ============================================================
   SkillTreeView - interactive radial skill tree visualization
   ============================================================ */

type SkillStatus = SkillNodeStatus

interface SkillNodeData {
  id: string
  label: string
  description: string
  status: SkillStatus
  xp: number
  prerequisites: string[] // skill ids
  relatedCourses: string[]
  relatedLabs: string[]
  assessments: string[]
}

interface SkillBranch {
  id: string
  name: string
  icon: LucideIcon
  color: string // text color class
  tint: string // bg tint class
  stroke: string // svg stroke color
  skills: SkillNodeData[]
}

/* ---------------------------------------------------------------- *
 *  Shape returned by /api/skills                                   *
 * ---------------------------------------------------------------- */
interface SkillRow {
  id: string
  slug: string
  name: string
  description?: string | null
  categoryId: string
  difficulty: string
  xp: number
  status: string
  prerequisites: string[]
  relatedCourses: string[]
  relatedLabs: string[]
  order: number
}

interface SkillCategoryRow {
  id: string
  slug: string
  name: string
  icon: string
  color: string
  tint: string
  description?: string | null
  order: number
  skills: SkillRow[]
}

/** Maps the branch color class to the SVG stroke color used for the
 *  connection lines. Kept literal so Tailwind/PostCSS can see them. */
const COLOR_TO_STROKE: Record<string, string> = {
  "text-rose-300": "oklch(0.6 0.2 25 / 0.7)",
  "text-cyan-300": "oklch(0.65 0.12 200 / 0.7)",
  "text-violet-300": "oklch(0.6 0.2 295 / 0.7)",
  "text-amber-300": "oklch(0.7 0.15 85 / 0.7)",
  "text-emerald-300": "oklch(0.7 0.15 155 / 0.7)",
  "text-teal-300": "oklch(0.7 0.12 180 / 0.7)",
  "text-fuchsia-300": "oklch(0.6 0.18 320 / 0.7)",
}

function deriveStroke(color: string): string {
  return COLOR_TO_STROKE[color] ?? "oklch(0.6 0.2 295 / 0.7)"
}

/** Shorten long skill names to a label that fits inside a skill node. */
function toLabel(name: string): string {
  if (!name) return ""
  // Use the first word (or first 10 chars) as the on-node label
  const words = name.split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 12)
  // For multi-word names, prefer the first meaningful word
  const first = words[0]
  if (first.length <= 10) return first
  return first.slice(0, 10)
}

function coerceStatus(s: string): SkillStatus {
  switch (s) {
    case "completed":
    case "in-progress":
    case "available":
    case "locked":
      return s
    default:
      return "available"
  }
}

/** Convert a DB SkillCategoryRow + nested Skill rows into the local
 *  SkillBranch shape used by the radial tree layout. */
function mapCategoryToBranch(cat: SkillCategoryRow): SkillBranch {
  return {
    id: cat.slug,
    name: cat.name,
    icon: getCmsIcon(cat.icon),
    color: cat.color,
    tint: cat.tint,
    stroke: deriveStroke(cat.color),
    skills: (cat.skills ?? []).map((s) => ({
      id: s.slug,
      label: toLabel(s.name),
      description: s.description ?? `Master ${s.name} - ${s.difficulty} level skill worth ${s.xp} XP.`,
      status: coerceStatus(s.status),
      xp: s.xp,
      prerequisites: Array.isArray(s.prerequisites) ? s.prerequisites : [],
      relatedCourses: Array.isArray(s.relatedCourses) ? s.relatedCourses : [],
      relatedLabs: Array.isArray(s.relatedLabs) ? s.relatedLabs : [],
      assessments: [],
    })),
  }
}

/**
 * Hardcoded fallback - only shown if /api/skills is unreachable.
 * Mirrors the production DB rows seeded by prisma/seed-production.ts.
 */
const BRANCHES: SkillBranch[] = [
  {
    id: "offensive",
    name: "Offensive Security",
    icon: Swords,
    color: "text-rose-300",
    tint: "bg-rose-500/10",
    stroke: "oklch(0.6 0.2 25 / 0.7)",
    skills: [
      { id: "recon", label: "Recon", description: "Passive & active reconnaissance, OSINT tooling, attack-surface mapping.", status: "completed", xp: 150, prerequisites: [], relatedCourses: ["Pentesting 101"], relatedLabs: ["External Recon"], assessments: ["Recon Fundamentals"] },
      { id: "exploit", label: "Exploit", description: "Identify vulnerabilities and weaponize exploits against vulnerable services.", status: "in-progress", xp: 280, prerequisites: ["recon"], relatedCourses: ["Metasploit Mastery"], relatedLabs: ["EternalBlue"], assessments: ["Exploit Dev Basics"] },
      { id: "privesc", label: "Privesc", description: "Linux & Windows privilege escalation through misconfig and kernel exploits.", status: "available", xp: 320, prerequisites: ["exploit"], relatedCourses: ["Linux Privesc"], relatedLabs: ["SUID Abuse"], assessments: ["Privesc Pathways"] },
      { id: "lateral", label: "Lateral", description: "Move laterally across networks with pass-the-hash, Kerberos, and SMB.", status: "locked", xp: 380, prerequisites: ["privesc"], relatedCourses: ["AD Attack Paths"], relatedLabs: ["Lateral Movement"], assessments: ["AD Lateral Quiz"] },
      { id: "exfil", label: "Exfil", description: "Exfiltrate data covertly and cover tracks without triggering detection.", status: "locked", xp: 420, prerequisites: ["lateral"], relatedCourses: ["Covert Channels"], relatedLabs: ["Data Exfil"], assessments: ["OPSEC for Red Teams"] },
    ],
  },
  {
    id: "defensive",
    name: "Defensive Security",
    icon: Shield,
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
    stroke: "oklch(0.65 0.12 200 / 0.7)",
    skills: [
      { id: "siem", label: "SIEM", description: "Operate Splunk / Elastic SIEM, write detection queries, build correlation rules.", status: "completed", xp: 220, prerequisites: [], relatedCourses: ["Splunk Fundamentals"], relatedLabs: ["Write a Detection"], assessments: ["SPL Basics"] },
      { id: "ir", label: "IR", description: "Run the incident-response lifecycle: detect, contain, eradicate, recover.", status: "in-progress", xp: 300, prerequisites: ["siem"], relatedCourses: ["Incident Response"], relatedLabs: ["Phishing IR"], assessments: ["IR Lifecycle"] },
      { id: "hunt", label: "Hunt", description: "Proactive threat hunting using MITRE ATT&CK hypotheses and telemetry.", status: "available", xp: 340, prerequisites: ["ir"], relatedCourses: ["Threat Hunting"], relatedLabs: ["Hunt for C2"], assessments: ["Hunt Methodology"] },
      { id: "forensics-ir", label: "Forensics", description: "Acquire and analyze disk and memory images for IOCs and timelines.", status: "locked", xp: 360, prerequisites: ["hunt"], relatedCourses: ["Digital Forensics"], relatedLabs: ["Memory Analysis"], assessments: ["Forensics 101"] },
      { id: "soar", label: "SOAR", description: "Automate response playbooks with SOAR platforms to reduce MTTR.", status: "locked", xp: 400, prerequisites: ["forensics-ir"], relatedCourses: ["SOAR Automation"], relatedLabs: ["Build a Playbook"], assessments: ["SOAR Patterns"] },
    ],
  },
  {
    id: "network",
    name: "Network Security",
    icon: NetworkIcon,
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    stroke: "oklch(0.6 0.2 295 / 0.7)",
    skills: [
      { id: "tcp", label: "TCP/IP", description: "Deep understanding of TCP/IP stack, packet structure, and routing.", status: "completed", xp: 180, prerequisites: [], relatedCourses: ["Networking Essentials"], relatedLabs: ["Packet Capture"], assessments: ["TCP/IP Quiz"] },
      { id: "sniff", label: "Sniffing", description: "Capture and analyze network traffic with Wireshark and tcpdump.", status: "completed", xp: 200, prerequisites: ["tcp"], relatedCourses: ["Wireshark Mastery"], relatedLabs: ["Analyze a Breach"], assessments: ["PCAP Analysis"] },
      { id: "firewall", label: "Firewalls", description: "Configure and bypass next-gen firewalls, IDS/IPS, and WAFs.", status: "in-progress", xp: 280, prerequisites: ["sniff"], relatedCourses: ["Firewall Engineering"], relatedLabs: ["IDS Evasion"], assessments: ["Firewall Rules Quiz"] },
      { id: "vpn", label: "VPN/Tunnel", description: "Build and attack VPN tunnels - IPsec, OpenVPN, and SSH tunnels.", status: "available", xp: 320, prerequisites: ["firewall"], relatedCourses: ["VPN Architecture"], relatedLabs: ["VPN Pivot"], assessments: ["Tunneling Concepts"] },
      { id: "zero-trust", label: "Zero Trust", description: "Design zero-trust networks with identity-based segmentation.", status: "locked", xp: 380, prerequisites: ["vpn"], relatedCourses: ["Zero Trust Design"], relatedLabs: ["Segment a Network"], assessments: ["ZTA Framework"] },
    ],
  },
  {
    id: "web",
    name: "Web Security",
    icon: Globe,
    color: "text-amber-300",
    tint: "bg-amber-500/10",
    stroke: "oklch(0.7 0.15 85 / 0.7)",
    skills: [
      { id: "owasp", label: "OWASP", description: "Master the OWASP Top 10 - injection, broken auth, XSS, SSRF, and more.", status: "completed", xp: 200, prerequisites: [], relatedCourses: ["Web Sec Fundamentals"], relatedLabs: ["DVWA Walkthrough"], assessments: ["OWASP Top 10"] },
      { id: "sqli", label: "SQLi", description: "Exploit SQL injection: union, boolean-blind, time-blind, and OOB.", status: "completed", xp: 260, prerequisites: ["owasp"], relatedCourses: ["SQLi Mastery"], relatedLabs: ["SQLi to RCE"], assessments: ["Injection Patterns"] },
      { id: "xss", label: "XSS", description: "Reflected, stored, and DOM-based XSS - bypass filters and CSP.", status: "in-progress", xp: 280, prerequisites: ["sqli"], relatedCourses: ["XSS Deep-Dive"], relatedLabs: ["Stored XSS Chain"], assessments: ["XSS Bypass Quiz"] },
      { id: "ssrf", label: "SSRF", description: "Server-side request forgery - pivot to cloud metadata and internal services.", status: "available", xp: 320, prerequisites: ["xss"], relatedCourses: ["Advanced Web Attacks"], relatedLabs: ["SSRF to IAM"], assessments: ["SSRF Scenarios"] },
      { id: "auth", label: "AuthBypass", description: "Bypass authentication: JWT manipulation, OAuth flaws, session hijacking.", status: "locked", xp: 360, prerequisites: ["ssrf"], relatedCourses: ["Auth & Identity"], relatedLabs: ["JWT Attack"], assessments: ["Auth Attacks"] },
    ],
  },
  {
    id: "cloud",
    name: "Cloud Security",
    icon: Cloud,
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    stroke: "oklch(0.7 0.15 155 / 0.7)",
    skills: [
      { id: "iam", label: "IAM", description: "AWS / Azure IAM - roles, policies, trust relationships, and privesc paths.", status: "available", xp: 260, prerequisites: [], relatedCourses: ["AWS Security"], relatedLabs: ["IAM Privesc"], assessments: ["IAM Policies"] },
      { id: "s3", label: "S3", description: "Identify and exploit misconfigured object storage (S3, GCS, Azure Blob).", status: "locked", xp: 220, prerequisites: ["iam"], relatedCourses: ["Cloud Storage Sec"], relatedLabs: ["S3 Bucket Hunt"], assessments: ["Storage Misconfig"] },
      { id: "k8s", label: "K8s", description: "Kubernetes attack surface - RBAC, pod escape, etcd theft, container breakouts.", status: "locked", xp: 360, prerequisites: ["iam"], relatedCourses: ["K8s Security"], relatedLabs: ["Container Escape"], assessments: ["K8s Threat Model"] },
      { id: "iac", label: "IaC", description: "Audit Terraform, CloudFormation, and Pulumi for security regressions.", status: "locked", xp: 300, prerequisites: ["s3", "k8s"], relatedCourses: ["Terraform Security"], relatedLabs: ["IaC Audit"], assessments: ["IaC Scanning"] },
      { id: "serverless", label: "FaaS", description: "Serverless security - Lambda exploits, event injection, and cold-start risks.", status: "locked", xp: 340, prerequisites: ["iac"], relatedCourses: ["Serverless Security"], relatedLabs: ["Lambda Injection"], assessments: ["FaaS Quiz"] },
    ],
  },
  {
    id: "forensics",
    name: "Digital Forensics",
    icon: Fingerprint,
    color: "text-teal-300",
    tint: "bg-teal-500/10",
    stroke: "oklch(0.7 0.12 180 / 0.7)",
    skills: [
      { id: "disk", label: "Disk", description: "Acquire, mount, and analyze disk images - partition tables, file systems.", status: "available", xp: 240, prerequisites: [], relatedCourses: ["Disk Forensics"], relatedLabs: ["Carve a Disk"], assessments: ["Disk Imaging"] },
      { id: "memory", label: "Memory", description: "Memory forensics with Volatility - processes, connections, injected code.", status: "locked", xp: 300, prerequisites: ["disk"], relatedCourses: ["Memory Forensics"], relatedLabs: ["RAM Analysis"], assessments: ["Volatility Basics"] },
      { id: "logs", label: "Logs", description: "Correlate Windows event logs, Linux syslog, and cloud trails into timelines.", status: "locked", xp: 280, prerequisites: ["disk"], relatedCourses: ["Log Analysis"], relatedLabs: ["Build a Timeline"], assessments: ["Log Forensics"] },
      { id: "stego", label: "Stego", description: "Detect and extract hidden data in images, audio, and network protocols.", status: "locked", xp: 260, prerequisites: ["logs"], relatedCourses: ["Steganography"], relatedLabs: ["Hidden Payload"], assessments: ["Stego Techniques"] },
      { id: "malware", label: "Malware", description: "Static and dynamic malware analysis - unpacking, sandboxing, IOCs.", status: "locked", xp: 380, prerequisites: ["memory", "stego"], relatedCourses: ["Malware Analysis"], relatedLabs: ["Analyze a Sample"], assessments: ["MA Fundamentals"] },
    ],
  },
  {
    id: "engineering",
    name: "Security Engineering",
    icon: Lock,
    color: "text-fuchsia-300",
    tint: "bg-fuchsia-500/10",
    stroke: "oklch(0.6 0.18 320 / 0.7)",
    skills: [
      { id: "arch", label: "Arch", description: "Design defensible system architecture with defense-in-depth principles.", status: "locked", xp: 320, prerequisites: [], relatedCourses: ["Security Architecture"], relatedLabs: ["Design Review"], assessments: ["Architecture Quiz"] },
      { id: "threat-model", label: "ThreatModel", description: "Threat model with STRIDE, PASTA, and attack trees - turn models into controls.", status: "locked", xp: 280, prerequisites: ["arch"], relatedCourses: ["Threat Modeling"], relatedLabs: ["STRIDE a Service"], assessments: ["STRIDE Patterns"] },
      { id: "sdlc", label: "SDLC", description: "Bake security into the SDLC - SAST, DAST, SCA, and secure code review.", status: "locked", xp: 340, prerequisites: ["threat-model"], relatedCourses: ["Secure SDLC"], relatedLabs: ["SAST Triangulation"], assessments: ["SDLC Gates"] },
      { id: "crypto", label: "Crypto", description: "Apply cryptographic primitives correctly - avoid the classic implementation pitfalls.", status: "locked", xp: 360, prerequisites: ["arch"], relatedCourses: ["Applied Cryptography"], relatedLabs: ["Crypto Failures"], assessments: ["Crypto Pitfalls"] },
      { id: "compliance", label: "Compliance", description: "Map technical controls to SOC 2, ISO 27001, PCI-DSS, and NIST 800-53.", status: "locked", xp: 300, prerequisites: ["sdlc"], relatedCourses: ["GRC Foundations"], relatedLabs: ["Map Controls"], assessments: ["Compliance 101"] },
    ],
  },
]

/* ---------- Layout constants ---------- */
const CANVAS_W = 1200
const CANVAS_H = 1000
const CENTER = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
const BRANCH_RADIUS = 250
const SKILL_RADIUS = 450
const CENTER_NODE_SIZE = 110
const HUB_NODE_SIZE = 92
const SKILL_NODE_SIZE = 76

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Compute branch angle starting at top (-90deg) going clockwise. */
function branchAngle(count: number, i: number): number {
  return -90 + i * (360 / Math.max(1, count))
}

interface PositionedBranch extends SkillBranch {
  angle: number
  hub: { x: number; y: number }
  skillsWithPos: (SkillNodeData & { x: number; y: number })[]
}

/** A skill that has been positioned in the radial layout AND annotated
 *  with its parent branch metadata (used by the detail panel and
 *  prerequisite resolver). */
interface PositionedSkill extends SkillNodeData {
  x: number
  y: number
  branchId: string
  branchName: string
  branchColor: string
}

function buildLayout(branches: SkillBranch[]): PositionedBranch[] {
  return branches.map((branch, i) => {
    const angle = branchAngle(branches.length, i)
    const hub = polarToCartesian(CENTER.x, CENTER.y, BRANCH_RADIUS, angle)
    const skillsWithPos = branch.skills.map((skill, j) => {
      const count = branch.skills.length
      const spread = 32 // degrees total spread per branch
      const offset = (j - (count - 1) / 2) * (spread / Math.max(1, count - 1))
      const skillAngle = angle + offset
      const pos = polarToCartesian(CENTER.x, CENTER.y, SKILL_RADIUS, skillAngle)
      return { ...skill, x: pos.x, y: pos.y }
    })
    return { ...branch, angle, hub, skillsWithPos }
  })
}

/* Compute rank from completed-skill count */
function rankFromCompletion(completed: number, total: number): { name: string; level: number } {
  if (total <= 0) return { name: "RECRUIT", level: 1 }
  const pct = completed / total
  if (pct >= 0.85) return { name: "ELITE GUARDIAN", level: 8 }
  if (pct >= 0.7) return { name: "GUARDIAN", level: 7 }
  if (pct >= 0.55) return { name: "SENTINEL", level: 6 }
  if (pct >= 0.4) return { name: "SPECIALIST", level: 5 }
  if (pct >= 0.25) return { name: "OPERATOR", level: 4 }
  if (pct >= 0.15) return { name: "HUNTER", level: 3 }
  if (pct >= 0.05) return { name: "ANALYST", level: 2 }
  return { name: "RECRUIT", level: 1 }
}

const LEGEND: { status: SkillStatus; label: string; color: string }[] = [
  { status: "completed", label: "Completed", color: "bg-emerald-400" },
  { status: "in-progress", label: "In Progress", color: "bg-violet-400" },
  { status: "available", label: "Available", color: "bg-cyan-400" },
  { status: "locked", label: "Locked", color: "bg-slate-500" },
]

export function SkillTreeView() {
  const { navigate } = useAppStore()
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(null)
  const [filterBranch, setFilterBranch] = React.useState<string>("all")

  // Fetch real skill tree from the database. Falls back to the hardcoded
  // BRANCHES array if the API is unreachable.
  const { data: skillsData } = useQuery<{
    categories: SkillCategoryRow[]
    count: number
    skillCount: number
  } | null>({
    queryKey: ["skills-view"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/skills")
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })

  const { layout, allSkills, completedCount, inProgressCount, totalXp, completionPct, rank } =
    React.useMemo(() => {
      const rows = skillsData?.categories ?? []
      const branches: SkillBranch[] =
        rows.length > 0 ? rows.map(mapCategoryToBranch) : BRANCHES
      const built = buildLayout(branches)
      const skills: PositionedSkill[] = built.flatMap((b) =>
        b.skillsWithPos.map((s) => ({
          ...s,
          branchId: b.id,
          branchName: b.name,
          branchColor: b.color,
        }))
      )
      const completed = skills.filter((s) => s.status === "completed").length
      const inProgress = skills.filter((s) => s.status === "in-progress").length
      const xp = skills
        .filter((s) => s.status === "completed")
        .reduce((a, s) => a + s.xp, 0)
      const pct = skills.length > 0 ? Math.round((completed / skills.length) * 100) : 0
      const r = rankFromCompletion(completed, skills.length)
      return {
        layout: built,
        allSkills: skills,
        completedCount: completed,
        inProgressCount: inProgress,
        totalXp: xp,
        completionPct: pct,
        rank: r,
      }
    }, [skillsData])

  const selectedSkill = allSkills.find((s) => s.id === selectedSkillId) ?? null

  // Build SVG connection paths
  const connections: { d: string; branch: PositionedBranch; key: string }[] = []
  for (const branch of layout) {
    // center -> hub
    connections.push({
      d: `M ${CENTER.x} ${CENTER.y} L ${branch.hub.x} ${branch.hub.y}`,
      branch,
      key: `c-${branch.id}`,
    })
    // hub -> each skill (curved)
    for (const skill of branch.skillsWithPos) {
      // Quadratic bezier through midpoint pulled slightly outward
      const midX = (branch.hub.x + skill.x) / 2
      const midY = (branch.hub.y + skill.y) / 2
      const dx = midX - CENTER.x
      const dy = midY - CENTER.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const pull = 18
      const ctrlX = midX + (dx / len) * pull
      const ctrlY = midY + (dy / len) * pull
      connections.push({
        d: `M ${branch.hub.x} ${branch.hub.y} Q ${ctrlX} ${ctrlY} ${skill.x} ${skill.y}`,
        branch,
        key: `s-${skill.id}`,
      })
    }
  }

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
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] font-mono text-emerald-300 tracking-[0.3em]">
              SKILL TREE · KNOWLEDGE GRAPH
            </span>
          </div>

          <h1 className="text-[clamp(2.25rem,7vw,5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-5 text-balance">
            Map your <span className="text-gradient-premium">skills.</span>
          </h1>

          <p className="text-muted-foreground max-w-2xl text-base lg:text-lg text-balance">
            Visualize your cybersecurity knowledge graph. Every skill unlocks the next - completed nodes glow, available ones pulse, locked ones wait.
          </p>
        </motion.section>

        {/* ====================================================
            SUMMARY STRIP
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <SummaryStat
            icon={Target}
            color="text-emerald-300"
            tint="bg-emerald-500/10"
            label="Completion"
            value={`${completionPct}%`}
            sub={`${completedCount} / ${allSkills.length} skills`}
          />
          <SummaryStat
            icon={Zap}
            color="text-amber-300"
            tint="bg-amber-500/10"
            label="Total XP"
            value={totalXp.toLocaleString()}
            sub="From completed skills"
          />
          <SummaryStat
            icon={Star}
            color="text-violet-300"
            tint="bg-violet-500/10"
            label="In Progress"
            value={inProgressCount.toString()}
            sub="Currently being learned"
          />
          <div className="card-premium rounded-xl p-4 flex flex-col gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Rank</span>
            <div className="flex items-center gap-2">
              <RankBadge rank={rank.name} level={rank.level} size="md" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Reach {Math.ceil(allSkills.length * 0.85)} skills to unlock Elite Guardian.
            </p>
          </div>
        </motion.section>

        {/* ====================================================
            FILTER + LEGEND
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mr-1">FILTER</span>
            <FilterChip
              active={filterBranch === "all"}
              onClick={() => setFilterBranch("all")}
              label="All branches"
            />
            {layout.map((b) => (
              <FilterChip
                key={b.id}
                active={filterBranch === b.id}
                onClick={() => setFilterBranch(b.id)}
                label={b.name}
                colorClass={b.color}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">LEGEND</span>
            {LEGEND.map((l) => (
              <span key={l.status} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", l.color)} />
                <span className="text-[10px] font-mono text-muted-foreground">{l.label}</span>
              </span>
            ))}
          </div>
        </motion.section>

        {/* ====================================================
            TREE + DETAIL PANEL
            ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Tree visualization */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium rounded-2xl p-3 sm:p-4 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <div
                className="relative mx-auto"
                style={{ width: CANVAS_W, height: CANVAS_H }}
              >
                {/* SVG connection layer */}
                <svg
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  width={CANVAS_W}
                  height={CANVAS_H}
                  viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                >
                  {/* Subtle radial backdrop */}
                  <defs>
                    <radialGradient id="skill-tree-bg" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="oklch(0.6 0.2 295 / 0.06)" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                  <circle cx={CENTER.x} cy={CENTER.y} r={SKILL_RADIUS + 80} fill="url(#skill-tree-bg)" />

                  {connections.map((c) => {
                    const isFilteredOut =
                      filterBranch !== "all" && c.branch.id !== filterBranch
                    return (
                      <path
                        key={c.key}
                        d={c.d}
                        fill="none"
                        stroke={c.branch.stroke}
                        strokeWidth={1.2}
                        strokeDasharray={isFilteredOut ? "2 6" : "0"}
                        opacity={isFilteredOut ? 0.15 : 0.5}
                      />
                    )
                  })}
                </svg>

                {/* Central node */}
                <div
                  className="absolute z-10"
                  style={{
                    left: CENTER.x - CENTER_NODE_SIZE / 2,
                    top: CENTER.y - CENTER_NODE_SIZE / 2,
                    width: CENTER_NODE_SIZE,
                    height: CENTER_NODE_SIZE,
                  }}
                >
                  <div className="relative size-full">
                    {/* Pulsing rings */}
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2 border-violet-400/40"
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border border-cyan-400/30"
                      animate={{ scale: [1, 1.55], opacity: [0.4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                    />
                    <div className="relative size-full rounded-full border-2 border-violet-400/70 bg-violet-500/20 flex flex-col items-center justify-center shadow-[0_0_36px_-6px_oklch(0.6_0.2_295_/_0.7)]">
                      <Shield className="size-6 text-violet-200" aria-hidden />
                      <span className="mt-1 font-mono text-[9px] font-bold uppercase tracking-wider text-violet-100">
                        CYBER
                      </span>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-violet-100">
                        SECURITY
                      </span>
                    </div>
                  </div>
                </div>

                {/* Branch hubs + skill nodes */}
                {layout.map((branch) => {
                  const isFilteredOut =
                    filterBranch !== "all" && branch.id !== filterBranch
                  return (
                    <React.Fragment key={branch.id}>
                      {/* Branch hub */}
                      <div
                        className="absolute z-10"
                        style={{
                          left: branch.hub.x - HUB_NODE_SIZE / 2,
                          top: branch.hub.y - HUB_NODE_SIZE / 2,
                          width: HUB_NODE_SIZE,
                          height: HUB_NODE_SIZE + 20,
                          opacity: isFilteredOut ? 0.3 : 1,
                          transition: "opacity 0.3s ease",
                        }}
                      >
                        <div
                          className={cn(
                            "size-full rounded-full border-2 backdrop-blur-sm flex flex-col items-center justify-center",
                            branch.tint,
                            branch.color,
                            "border-current/40"
                          )}
                        >
                          <branch.icon className="size-6" aria-hidden />
                          <span className="mt-1 px-1 text-center font-mono text-[8px] font-bold uppercase tracking-wider leading-tight">
                            {branch.name.split(" ").map((w) => w[0]).join("")}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-center font-mono text-[10px] uppercase tracking-wider",
                            branch.color
                          )}
                        >
                          {branch.name}
                        </p>
                      </div>

                      {/* Skill nodes */}
                      {branch.skillsWithPos.map((skill) => (
                        <SkillNode
                          key={skill.id}
                          label={skill.label}
                          status={skill.status}
                          xp={skill.xp}
                          size={SKILL_NODE_SIZE}
                          position={{
                            x: skill.x - SKILL_NODE_SIZE / 2,
                            y: skill.y - SKILL_NODE_SIZE / 2,
                          }}
                          onClick={() => setSelectedSkillId(skill.id)}
                          className={cn(
                            isFilteredOut && "opacity-30 pointer-events-none"
                          )}
                        />
                      ))}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Detail panel */}
          <div className="lg:sticky lg:top-6">
            <AnimatePresence mode="wait">
              {selectedSkill ? (
                <SkillDetailPanel
                  key={selectedSkill.id}
                  skill={selectedSkill}
                  allSkills={allSkills}
                  onClose={() => setSelectedSkillId(null)}
                  onStartLearning={() => navigate({ name: "labs" })}
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="card-premium rounded-2xl p-6 text-center"
                >
                  <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click any skill node to view details, prerequisites, and related learning material.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Helpful note for mobile users */}
        <p className="mt-6 text-xs text-muted-foreground text-center lg:hidden">
          <ArrowRight className="inline h-3 w-3 mr-1 -rotate-90" />
          Scroll horizontally to explore the full skill tree.
        </p>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function SummaryStat({
  icon: Icon,
  color,
  tint,
  label,
  value,
  sub,
}: {
  icon: LucideIcon
  color: string
  tint: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="card-premium rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={cn("flex size-9 items-center justify-center rounded-lg border border-border/50", tint, color)}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  colorClass,
}: {
  active: boolean
  onClick: () => void
  label: string
  colorClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-mono transition-colors",
        active
          ? cn("border-border/60 bg-card", colorClass ?? "text-foreground")
          : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60"
      )}
    >
      {label}
    </button>
  )
}

function SkillDetailPanel({
  skill,
  allSkills,
  onClose,
  onStartLearning,
}: {
  skill: PositionedSkill
  allSkills: PositionedSkill[]
  onClose: () => void
  onStartLearning: () => void
}) {
  const STATUS_LABEL: Record<SkillStatus, string> = {
    completed: "Completed",
    "in-progress": "In Progress",
    available: "Available",
    locked: "Locked",
  }

  const STATUS_COLOR: Record<SkillStatus, string> = {
    completed: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    "in-progress": "text-violet-300 border-violet-500/40 bg-violet-500/10",
    available: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
    locked: "text-slate-400 border-slate-500/40 bg-slate-500/10",
  }

  const prereqSkills = skill.prerequisites
    .map((id) => allSkills.find((s) => s.id === id))
    .filter(Boolean) as PositionedSkill[]

  return (
    <motion.div
      key={skill.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium rounded-2xl p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1">
            {skill.branchName.toUpperCase()}
          </p>
          <h3 className="text-xl font-bold tracking-tight">{skill.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <span
        className={cn(
          "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider mb-4",
          STATUS_COLOR[skill.status]
        )}
      >
        {STATUS_LABEL[skill.status]}
      </span>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{skill.description}</p>

      <div className="flex items-center gap-2 mb-5">
        <Zap className="size-4 text-amber-300" />
        <span className="font-mono text-sm font-semibold text-amber-300">{skill.xp} XP</span>
        <span className="text-xs text-muted-foreground">on completion</span>
      </div>

      {/* Prerequisites */}
      {prereqSkills.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-2">PREREQUISITES</p>
          <ul className="space-y-1.5">
            {prereqSkills.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs">
                {p.status === "completed" ? (
                  <Check className="size-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={cn(p.status === "completed" ? "text-foreground/90" : "text-muted-foreground")}>
                  {p.label}
                </span>
                <span className={cn("ml-auto text-[9px] font-mono uppercase", p.branchColor)}>
                  {p.branchName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related material */}
      <div className="space-y-3 mb-5">
        <RelatedGroup
          title="Related Courses"
          icon={BookOpen}
          color="text-cyan-300"
          items={skill.relatedCourses}
          emptyLabel="No linked courses yet"
        />
        <RelatedGroup
          title="Related Labs"
          icon={Beaker}
          color="text-amber-300"
          items={skill.relatedLabs}
          emptyLabel="No linked labs yet"
        />
        <RelatedGroup
          title="Assessments"
          icon={FileQuestion}
          color="text-rose-300"
          items={skill.assessments}
          emptyLabel="No linked assessments yet"
        />
      </div>

      <Button
        onClick={onStartLearning}
        disabled={skill.status === "locked"}
        className={cn(
          "w-full btn-premium",
          skill.status === "locked"
            ? "opacity-50 cursor-not-allowed bg-slate-600"
            : "bg-violet-600 hover:bg-violet-500"
        )}
      >
        {skill.status === "locked" ? (
          <>
            <Lock className="mr-2 h-4 w-4" /> LOCKED
          </>
        ) : skill.status === "completed" ? (
          <>
            <Check className="mr-2 h-4 w-4" /> REVIEW MATERIAL
          </>
        ) : (
          <>
            <ArrowRight className="mr-2 h-4 w-4" /> START LEARNING
          </>
        )}
      </Button>
    </motion.div>
  )
}

function RelatedGroup({
  title,
  icon: Icon,
  color,
  items,
  emptyLabel,
}: {
  title: string
  icon: LucideIcon
  color: string
  items: string[]
  emptyLabel: string
}) {
  return (
    <div>
      <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
        <Icon className={cn("size-3", color)} />
        {title}
      </p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className={cn("text-[10px] font-mono", color, "border-current/30")}
            >
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">{emptyLabel}</p>
      )}
    </div>
  )
}
