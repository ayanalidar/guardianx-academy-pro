"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CyberTerminal,
  type TerminalLine,
  LabCard,
  type LabDifficulty,
  StatusDot,
  StatTile,
} from "@/components/cyber"
import {
  Globe,
  Lock,
  Database,
  Shield,
  Network,
  Server,
  Cloud,
  Fingerprint,
  Swords,
  Terminal,
  Rocket,
  Plug,
  Flag,
  Users,
  Cpu,
  Beaker,
  Activity,
  ArrowRight,
  Crosshair,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/* ============================================================
   CyberRangeView - cinematic showcase of the cyber range
   Replaces the prior multiplayer-session management view with
   a marketing-style "what the range IS" experience.
   ============================================================ */

interface LabItem {
  id: string
  slug: string
  title: string
  description: string
  category: string
  difficulty: string
  durationMin: number
  points: number
  color: string
}

const NMAP_LINES: TerminalLine[] = [
  { type: "command", text: "nmap -sV 10.10.24.14" },
  { type: "output", text: "Starting Nmap 7.94 ( https://nmap.org ) at 03:14 UTC" },
  { type: "output", text: "Nmap scan report for target.dvwa.local (10.10.24.14)" },
  { type: "output", text: "Host is up (0.012s latency)." },
  { type: "output", text: "" },
  { type: "output", text: "PORT     STATE SERVICE   VERSION" },
  { type: "output", text: "22/tcp   open  ssh       OpenSSH 7.6p1 Ubuntu 4ubuntu0.3" },
  { type: "output", text: "80/tcp   open  http      Apache httpd 2.4.29 (DVWA)" },
  { type: "output", text: "3306/tcp open  mysql     MySQL 5.7.31-0ubuntu0.18.04.1" },
  { type: "output", text: "" },
  { type: "output", text: "Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel" },
  { type: "command", text: "nmap --script vuln 10.10.24.14" },
  { type: "output", text: "Starting Nmap with vuln script suite..." },
  { type: "output", text: "PORT     STATE SERVICE" },
  { type: "output", text: "80/tcp   open  http" },
  { type: "error", text: "http-enum: Potential vulnerability - /dvwa/login.php" },
  { type: "error", text: "http-sql-injection: SQLi found in 'id' parameter" },
  { type: "error", text: "mysql-empty-password: root account has no password" },
  { type: "success", text: "3 exploitable vulnerabilities discovered - start hacking." },
]

interface LabCategory {
  id: string
  name: string
  count: number
  description: string
  icon: LucideIcon
  color: string
  tint: string
  border: string
}

const LAB_CATEGORIES: LabCategory[] = [
  {
    id: "web",
    name: "Web Security",
    count: 9,
    description: "SQLi, XSS, SSRF, auth bypass, deserialization - OWASP-style attacks against live web apps.",
    icon: Globe,
    color: "text-amber-300",
    tint: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    id: "network",
    name: "Network Security",
    count: 6,
    description: "Sniffing, spoofing, pivoting, lateral movement across segmented enterprise LANs.",
    icon: Network,
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    id: "sysadmin",
    name: "System Admin",
    count: 5,
    description: "Linux privesc, Windows misconfigurations, cron abuse, SUID exploitation.",
    icon: Server,
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    id: "ad",
    name: "Active Directory",
    count: 4,
    description: "Kerberoasting, AS-REP roasting, GPP abuse, DCSync - full domain compromise.",
    icon: Shield,
    color: "text-rose-300",
    tint: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
  {
    id: "cloud",
    name: "Cloud Security",
    count: 4,
    description: "IAM privilege escalation, S3 bucket exposure, container escape, K8s attacks.",
    icon: Cloud,
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    id: "forensics",
    name: "Digital Forensics",
    count: 3,
    description: "Memory dumps, disk imaging, log carving, steganography, timeline reconstruction.",
    icon: Fingerprint,
    color: "text-teal-300",
    tint: "bg-teal-500/10",
    border: "border-teal-500/30",
  },
]

interface HowItWorksStep {
  id: number
  title: string
  description: string
  icon: LucideIcon
}

const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    id: 1,
    title: "Spin Up",
    description: "Choose a lab. A dedicated VM spins up in under 30 seconds with your own private network.",
    icon: Rocket,
  },
  {
    id: 2,
    title: "Connect",
    description: "Open the in-browser terminal or SSH from your machine. Targets are isolated to you.",
    icon: Plug,
  },
  {
    id: 3,
    title: "Exploit",
    description: "Recon, enumerate, attack. Use any tool - nmap, Burp, sqlmap, Metasploit, BloodHound.",
    icon: Swords,
  },
  {
    id: 4,
    title: "Submit Flag",
    description: "Capture the flag hidden inside the target. Auto-graded. XP awarded. Rank rises.",
    icon: Flag,
  },
]

const DIFFICULTY_MAP: Record<string, LabDifficulty> = {
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard",
  Insane: "Insane",
}

export function CyberRangeView() {
  const { navigate } = useAppStore()

  const { data, isLoading } = useQuery<{ labs: LabItem[] }>({
    queryKey: ["cyber-range-featured"],
    queryFn: () => api("/api/labs"),
  })

  const featuredLabs = (data?.labs ?? []).slice(0, 6)

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
          className="mb-12 lg:mb-16"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">
              CYBER RANGE · LIVE TARGETS · NO SIMULATIONS
            </span>
          </div>

          <h1 className="text-[clamp(2.25rem,7vw,5rem)] font-bold leading-[0.92] tracking-[-0.04em] mb-5 text-balance">
            Don&apos;t watch someone hack.
            <br />
            <span className="text-gradient-premium">Hack it yourself.</span>
          </h1>

          <p className="text-muted-foreground max-w-2xl text-base lg:text-lg mb-8 text-balance">
            Spin up a real vulnerable machine, attack it with the same tools the pros use, and capture the flag to prove you did it. No videos. No multiple-choice quizzes. Just you vs. the target.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => navigate({ name: "labs" })}
              className="bg-violet-600 hover:bg-violet-500 btn-premium group"
            >
              <Terminal className="mr-2 h-4 w-4" />
              ENTER CYBER RANGE
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ name: "skill-tree" })}
              className="border-border/60 bg-card/40 backdrop-blur-sm hover:bg-card/80"
            >
              <Crosshair className="mr-2 h-4 w-4 text-cyan-300" />
              VIEW SKILL TREE
            </Button>
          </div>
        </motion.section>

        {/* ====================================================
            LIVE TARGET DEMO - split layout
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 lg:mb-16"
          aria-labelledby="live-target-heading"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[10px] font-mono text-cyan-300 tracking-[0.3em]">
              01 · LIVE TARGET DEMO
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-transparent" />
          </div>
          <h2 id="live-target-heading" className="text-2xl lg:text-3xl font-bold tracking-tight mb-8">
            What it looks like the moment you start a lab.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Target info card */}
            <div className="space-y-4">
              <TargetInfoCard />
              <div className="grid grid-cols-2 gap-3">
                <ServiceChip icon={Lock} label="22" sublabel="SSH" />
                <ServiceChip icon={Globe} label="80" sublabel="HTTP" />
                <ServiceChip icon={Database} label="3306" sublabel="MYSQL" />
                <ServiceChip icon={Activity} label="8080" sublabel="HTTP-ALT" />
              </div>
            </div>

            {/* Right: Automated terminal */}
            <div>
              <CyberTerminal
                lines={NMAP_LINES}
                speed={14}
                className="h-full min-h-[420px]"
              />
              <p className="mt-3 text-xs text-muted-foreground font-mono">
                <span className="text-emerald-300">●</span> LIVE - automated demo replays every 60s.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ====================================================
            LAB CATEGORIES
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 lg:mb-16"
          aria-labelledby="categories-heading"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[10px] font-mono text-violet-300 tracking-[0.3em]">
              02 · LAB CATEGORIES
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-violet-500/40 to-transparent" />
          </div>
          <h2 id="categories-heading" className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
            Six disciplines. Endless attack paths.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            From web app pentesting to Active Directory compromise - every category ships with beginner-friendly entry points and insane-mode nightmares.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAB_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 + i * 0.05, ease: "easeOut" }}
                className="card-premium rounded-xl p-5 group cursor-default"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border",
                      cat.tint,
                      cat.border,
                      cat.color
                    )}
                  >
                    <cat.icon className="size-5" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {cat.count} labs
                  </span>
                </div>
                <h3 className="font-semibold mb-1.5">{cat.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {cat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ====================================================
            FEATURED LABS - real data from /api/labs
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 lg:mb-16"
          aria-labelledby="featured-heading"
        >
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-emerald-300 tracking-[0.3em]">
                  03 · FEATURED LABS
                </span>
              </div>
              <h2 id="featured-heading" className="text-2xl lg:text-3xl font-bold tracking-tight">
                Live in the range right now.
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ name: "labs" })}
              className="text-muted-foreground hover:text-foreground"
            >
              View all labs <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : featuredLabs.length === 0 ? (
            <div className="card-premium rounded-xl p-12 text-center">
              <Beaker className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Labs are still being seeded in the database. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredLabs.map((lab, i) => (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 + i * 0.05, ease: "easeOut" }}
                >
                  <LabCard
                    title={lab.title}
                    category={lab.category}
                    difficulty={DIFFICULTY_MAP[lab.difficulty] ?? "Medium"}
                    xp={lab.points}
                    status="online"
                    ip={`10.10.24.${10 + i}`}
                    services={["SSH", "HTTP", "MySQL"]}
                    onClick={() => navigate({ name: "lab", labSlug: lab.slug })}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ====================================================
            HOW IT WORKS - 4-step process
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 lg:mb-16"
          aria-labelledby="how-heading"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[10px] font-mono text-amber-300 tracking-[0.3em]">
              04 · HOW IT WORKS
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
          </div>
          <h2 id="how-heading" className="text-2xl lg:text-3xl font-bold tracking-tight mb-8">
            From zero to flag in four steps.
          </h2>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Connecting line - hidden on mobile */}
            <div
              aria-hidden
              className="hidden lg:block absolute top-[34px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0"
            />
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.08, ease: "easeOut" }}
                className="relative"
              >
                <div className="card-premium rounded-xl p-5 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex size-10 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-mono text-3xl font-bold text-amber-300/30">
                      {String(step.id).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1.5">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ====================================================
            STATS
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 lg:mb-16"
          aria-labelledby="stats-heading"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[10px] font-mono text-cyan-300 tracking-[0.3em]">
              05 · RANGE BY THE NUMBERS
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-transparent" />
          </div>
          <h2 id="stats-heading" className="sr-only">Range statistics</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              icon={Beaker}
              label="Labs in range"
              value={31}
              color="text-violet-300"
              tint="bg-violet-500/10"
            />
            <StatTile
              icon={Network}
              label="Categories"
              value={5}
              color="text-cyan-300"
              tint="bg-cyan-500/10"
            />
            <StatTile
              icon={Flag}
              label="Flags captured"
              value="12.4K"
              color="text-emerald-300"
              tint="bg-emerald-500/10"
            />
            <StatTile
              icon={Users}
              label="Students practicing"
              value="3,217"
              color="text-amber-300"
              tint="bg-amber-500/10"
            />
          </div>
        </motion.section>

        {/* ====================================================
            FINAL CTA
            ==================================================== */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-card/60 backdrop-blur-sm p-8 lg:p-12 text-center"
        >
          <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-violet-600/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <Cpu className="h-10 w-10 text-violet-300 mx-auto mb-4" />
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
              Ready to hack?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Pick your first target. The range is online 24/7 and your first flag is one nmap scan away.
            </p>
            <Button
              size="lg"
              onClick={() => navigate({ name: "labs" })}
              className="bg-violet-600 hover:bg-violet-500 btn-premium group"
            >
              <Terminal className="mr-2 h-4 w-4" />
              START A LAB
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function TargetInfoCard() {
  return (
    <div className="card-premium rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono text-cyan-300 tracking-[0.25em]">
          TARGET INFORMATION
        </span>
        <StatusDot status="online" pulse label="ONLINE" size="xs" />
      </div>

      <div className="space-y-3">
        <Row label="TARGET">
          <span className="font-mono text-violet-200">DVWA - Damn Vulnerable Web App</span>
        </Row>
        <Row label="IP ADDR">
          <span className="font-mono text-cyan-200">10.10.24.14</span>
        </Row>
        <Row label="OS">
          <span className="font-mono text-foreground/90">Ubuntu 18.04 LTS</span>
        </Row>
        <Row label="DIFFICULTY">
          <span className="font-mono text-amber-300">Medium</span>
        </Row>
        <Row label="EST. TIME">
          <span className="font-mono text-foreground/90">45 minutes</span>
        </Row>
      </div>

      <div className="mt-4 pt-4 border-t border-border/40">
        <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-2">
          EXPOSED SERVICES
        </p>
        <p className="text-xs text-muted-foreground">
          4 open ports detected during initial nmap sweep. Two services running outdated software with known CVEs.
        </p>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
        {label}
      </span>
      <span className="text-sm text-right truncate">{children}</span>
    </div>
  )
}

function ServiceChip({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: LucideIcon
  label: string
  sublabel: string
}) {
  return (
    <div className="card-premium rounded-lg p-3 flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold leading-none">{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
          {sublabel}
        </p>
      </div>
    </div>
  )
}
