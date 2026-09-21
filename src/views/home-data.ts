/**
 * Static demo / fallback data for the GuardianX homepage (`src/views/home.tsx`).
 *
 * This module is a pure data + types module (no React, no JSX). It exists so
 * the homepage view file stays small enough for Turbopack to compile reliably.
 *
 * Everything that was previously inlined at the bottom of `home.tsx` lives
 * here now. All consts are NAMED exports (`export const ...`).
 *
 * NOTE on `as const`:
 *   Several arrays use `as const` (either per-entry or at the array level).
 *   These assertions MUST be preserved verbatim - the home view relies on
 *   the narrowed literal types they produce (e.g. the `View` literal union
 *   used in `INSTITUTION_TYPES[].view.name`).
 */

import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Cloud,
  Crosshair,
  Database,
  Eye,
  FileCheck,
  FileQuestion,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Microscope,
  Moon,
  Network,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  Sun,
  SunMedium,
  Sunset,
  Swords,
  Terminal,
  Trophy,
  Users,
  Video,
} from "lucide-react"

/* ---------------------------------------------------------------- *
 *  Types for DB-driven content fetched from the public APIs.       *
 * ---------------------------------------------------------------- */
export interface TechnologyPartner {
  id: string
  name: string
  category: string
  description?: string | null
  url?: string | null
  icon: string
  order: number
  published: boolean
}

export interface PlatformStat {
  id: string
  key: string
  label: string
  value: string
  source: string // "manual" | "calculated"
  displayStatus: string
  suffix?: string | null
  icon: string
  color: string
  updatedAt: string
}

export interface LearningPathRow {
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

export interface RankRow {
  id: string
  name: string
  displayName: string
  level: number
  xpThreshold: number
  color: string
  description?: string | null
  icon: string
  order: number
}

/* ---------------------------------------------------------------- *
 *  Static demo data - clearly marked placeholders                  *
 * ---------------------------------------------------------------- */

export const PILLARS = [
  {
    icon: BookOpen,
    title: "LEARN",
    desc: "Structured certification courses with video lessons, notes, and quizzes.",
    color: "text-violet-300",
    tint: "bg-violet-500/10",
  },
  {
    icon: FlaskConical,
    title: "PRACTICE",
    desc: "Hands-on labs with real targets, isolated environments, and live terminals.",
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
  },
  {
    icon: Trophy,
    title: "COMPETE",
    desc: "CTF competitions, weekly challenges, and team missions against peers.",
    color: "text-amber-300",
    tint: "bg-amber-500/10",
  },
  {
    icon: Award,
    title: "PROVE",
    desc: "Tamper-evident, publicly verifiable credentials with cryptographic signatures.",
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
  },
  {
    icon: Briefcase,
    title: "CAREER",
    desc: "Resume builder, mock interviews, job board, and role-matched skill analysis.",
    color: "text-rose-300",
    tint: "bg-rose-500/10",
  },
  {
    icon: Building2,
    title: "INSTITUTIONS",
    desc: "Multi-tenant dashboards for schools, colleges, and universities.",
    color: "text-teal-300",
    tint: "bg-teal-500/10",
  },
] as const

export const RANGE_SERVICES = [
  { port: "22", name: "SSH", icon: Terminal, color: "text-cyan-300" },
  { port: "80", name: "HTTP", icon: Globe, color: "text-emerald-300" },
  { port: "3306", name: "MYSQL", icon: Database, color: "text-amber-300" },
] as const

export const LEARNING_PATHS = [
  {
    icon: BookOpen,
    title: "Beginner",
    desc: "Networking, Linux, and security fundamentals from absolute zero.",
    duration: "3 months",
    skills: "12 skills",
    difficulty: "BEGINNER",
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
  },
  {
    icon: Eye,
    title: "SOC Analyst",
    desc: "Log analysis, threat hunting, SIEM, and incident response.",
    duration: "4 months",
    skills: "18 skills",
    difficulty: "INTERMEDIATE",
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
  },
  {
    icon: Crosshair,
    title: "Penetration Tester",
    desc: "Recon, exploitation, privilege escalation, and reporting.",
    duration: "6 months",
    skills: "24 skills",
    difficulty: "ADVANCED",
    color: "text-violet-300",
    tint: "bg-violet-500/10",
  },
  {
    icon: Cloud,
    title: "Cloud Security",
    desc: "AWS, Azure, GCP security - containers, Kubernetes, IAM hardening.",
    duration: "5 months",
    skills: "20 skills",
    difficulty: "ADVANCED",
    color: "text-amber-300",
    tint: "bg-amber-500/10",
  },
  {
    icon: Briefcase,
    title: "Job Ready",
    desc: "Mock interviews, resume builder, and real-world projects portfolio.",
    duration: "2 months",
    skills: "10 skills",
    difficulty: "PRACTICAL",
    color: "text-rose-300",
    tint: "bg-rose-500/10",
  },
  {
    icon: GraduationCap,
    title: "CISSP Track",
    desc: "Certified Information Systems Security Professional prep - full domain coverage.",
    duration: "5 months",
    skills: "8 domains",
    difficulty: "ADVANCED",
    color: "text-teal-300",
    tint: "bg-teal-500/10",
  },
] as const

// Skill tree branch angles (in degrees, 0 = right, going clockwise)
export const BRANCH_ANGLES = [-90, -30, 30, 90, 150, 210] as const

export const BRANCHES = [
  { label: "OFFENSIVE", status: "completed" as const, xp: 850 },
  { label: "DEFENSIVE", status: "in-progress" as const, xp: 420 },
  { label: "NETWORK", status: "completed" as const, xp: 620 },
  { label: "WEB", status: "available" as const, xp: 0 },
  { label: "CLOUD", status: "locked" as const, xp: 0 },
  { label: "FORENSICS", status: "locked" as const, xp: 0 },
] as const

/* Advanced Skill Map data - 7 domains with sub-skills */
export const SKILL_DOMAINS = [
  { name: "Offensive", icon: Swords, color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", barColor: "bg-violet-500", progress: 85, skills: 15 },
  { name: "Defensive", icon: ShieldCheck, color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", barColor: "bg-cyan-500", progress: 60, skills: 12 },
  { name: "Network", icon: Network, color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", barColor: "bg-amber-500", progress: 72, skills: 10 },
  { name: "Web", icon: Globe, color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", barColor: "bg-emerald-500", progress: 45, skills: 8 },
  { name: "Cloud", icon: Cloud, color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", barColor: "bg-rose-500", progress: 20, skills: 7 },
  { name: "Forensics", icon: Search, color: "text-teal-300", bg: "bg-teal-500/10", border: "border-teal-500/30", barColor: "bg-teal-500", progress: 30, skills: 6 },
  { name: "GRC", icon: Scale, color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", barColor: "bg-blue-500", progress: 15, skills: 5 },
]

/* Sub-skills for the interactive map (5 per domain) */
export const SKILL_MAP_DATA = [
  { domain: "Offensive", angle: -90, color: "#a78bfa", skills: ["Reconnaissance", "Scanning", "Enumeration", "Web Exploitation", "Privilege Escalation"] },
  { domain: "Defensive", angle: -38, color: "#22d3ee", skills: ["Threat Detection", "Incident Response", "Log Analysis", "SIEM", "IDS/IPS"] },
  { domain: "Network", angle: 13, color: "#fbbf24", skills: ["TCP/IP", "Routing", "Firewalls", "VPN", "Network Scanning"] },
  { domain: "Web", angle: 64, color: "#34d399", skills: ["OWASP Top 10", "SQL Injection", "XSS", "CSRF", "API Security"] },
  { domain: "Cloud", angle: 116, color: "#fb7185", skills: ["AWS Security", "Azure Security", "IAM", "Containers", "Kubernetes"] },
  { domain: "Forensics", angle: 167, color: "#2dd4bf", skills: ["Disk Forensics", "Memory Forensics", "Network Forensics", "Steganography", "Timeline Analysis"] },
  { domain: "GRC", angle: 218, color: "#60a5fa", skills: ["ISO 27001", "NIST", "SOC 2", "Risk Assessment", "Compliance"] },
]

export const DAILY_OBJECTIVES = [
  { label: "Complete 1 lab module", xp: 50, done: true },
  { label: "Submit 1 CTF flag", xp: 100, done: true },
  { label: "Pass a quiz with 80%+", xp: 75, done: false },
  { label: "Spend 30 min in the cyber range", xp: 30, done: false },
] as const

export const RANK_LADDER = [
  { name: "RECRUIT", level: 1 },
  { name: "ANALYST", level: 2 },
  { name: "HUNTER", level: 3 },
  { name: "OPERATOR", level: 4 },
  { name: "SPECIALIST", level: 5 },
  { name: "SENTINEL", level: 6 },
  { name: "GUARDIAN", level: 7 },
  { name: "ELITE GUARDIAN", level: 8 },
] as const

export const CAREER_SKILLS = [
  { label: "Networking", value: 92, barClass: "bg-gradient-to-r from-cyan-500 to-cyan-400" },
  { label: "Linux", value: 81, barClass: "bg-gradient-to-r from-violet-500 to-violet-400" },
  { label: "Web Security", value: 87, barClass: "bg-gradient-to-r from-emerald-500 to-emerald-400" },
  { label: "Pentesting", value: 64, barClass: "bg-gradient-to-r from-amber-500 to-amber-400" },
  { label: "SOC", value: 42, barClass: "bg-gradient-to-r from-rose-500 to-rose-400" },
  { label: "Cloud", value: 23, barClass: "bg-gradient-to-r from-teal-500 to-teal-400" },
] as const

export const CAREER_ROLES = [
  { role: "Junior Pentester", match: 82 },
  { role: "SOC Analyst", match: 71 },
  { role: "Security Engineer", match: 54 },
] as const

export const INSTITUTION_TYPES = [
  {
    type: "Schools",
    icon: Building2,
    desc: "Comprehensive cyber security programs for school students. Complimentary school management system for MoU partners.",
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    view: { name: "institutions-schools" as const },
  },
  {
    type: "Colleges",
    icon: BookOpen,
    desc: "Industry-aligned certification courses integrated into college curriculum with hands-on labs and instructor-led training.",
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
    view: { name: "institutions-colleges" as const },
  },
  {
    type: "Universities",
    icon: Award,
    desc: "Advanced research-grade cyber security labs, degree integration, and PhD-level coursework for universities.",
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    view: { name: "institutions-universities" as const },
  },
] as const

export const STORY_STAGES = [
  {
    label: "START",
    icon: Rocket,
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    border: "border-violet-500/40",
  },
  {
    label: "LEARNING",
    icon: BookOpen,
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
    border: "border-cyan-500/40",
  },
  {
    label: "LABS",
    icon: FlaskConical,
    color: "text-amber-300",
    tint: "bg-amber-500/10",
    border: "border-amber-500/40",
  },
  {
    label: "CERTIFICATION",
    icon: FileCheck,
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    border: "border-emerald-500/40",
  },
  {
    label: "CAREER",
    icon: Briefcase,
    color: "text-rose-300",
    tint: "bg-rose-500/10",
    border: "border-rose-500/40",
  },
] as const

export const STORIES = [
  {
    name: "Aarav S.",
    role: "Aspirant → SOC Analyst",
    path: "Beginner Path → SOC Analyst → CEH Practical",
    position: "SOC Analyst L1 · FinTech startup",
  },
  {
    name: "Maya R.",
    role: "Fresher → Junior Pentester",
    path: "Beginner → Penetration Tester → OSCP",
    position: "Junior Pentester · Security consultancy",
  },
  {
    name: "Karthik V.",
    role: "Working Pro → Cloud Security Engineer",
    path: "Cloud Security Path → CISSP",
    position: "Cloud Security Engineer · SaaS company",
  },
] as const

export const TRUST_STATS = [
  { icon: Users, value: "12,000+", label: "Learners", color: "text-violet-300", tint: "bg-violet-500/10" },
  { icon: FlaskConical, value: "31", label: "Labs", color: "text-cyan-300", tint: "bg-cyan-500/10" },
  { icon: BookOpen, value: "28+", label: "Courses", color: "text-amber-300", tint: "bg-amber-500/10" },
  { icon: Building2, value: "150+", label: "Partners", color: "text-emerald-300", tint: "bg-emerald-500/10" },
] as const

/**
 * Fallback list of real OSS technology partners - used only if the
 * `/api/technology-partners` route fails. Replaces the previous fake
 * "Trusted by Google / Microsoft / Amazon" strip with the real tools
 * GuardianX labs are built around.
 */
export const FALLBACK_PARTNERS: TechnologyPartner[] = [
  { id: "fb-kali", name: "Kali Linux", category: "tool", description: "Penetration testing OS used across GuardianX offensive labs.", url: "https://www.kali.org/", icon: "Terminal", order: 1, published: true },
  { id: "fb-nmap", name: "Nmap", category: "tool", description: "Network mapper for discovery and security auditing.", url: "https://nmap.org/", icon: "Radar", order: 2, published: true },
  { id: "fb-burp", name: "Burp Suite", category: "tool", description: "Web vulnerability scanner and interception proxy.", url: "https://portswigger.net/burp", icon: "Bug", order: 3, published: true },
  { id: "fb-metasploit", name: "Metasploit", category: "tool", description: "Exploitation framework for penetration testing.", url: "https://www.metasploit.com/", icon: "Swords", order: 4, published: true },
  { id: "fb-wireshark", name: "Wireshark", category: "tool", description: "Network protocol analyzer for traffic inspection.", url: "https://www.wireshark.org/", icon: "Activity", order: 5, published: true },
  { id: "fb-docker", name: "Docker", category: "platform", description: "Container runtime powering our cyber range.", url: "https://www.docker.com/", icon: "Container", order: 6, published: true },
  { id: "fb-hashcat", name: "Hashcat", category: "tool", description: "Advanced password recovery utility.", url: "https://hashcat.net/hashcat/", icon: "Key", order: 7, published: true },
  { id: "fb-john", name: "John the Ripper", category: "tool", description: "Password cracker for offline hash analysis.", url: "https://www.openwall.com/john/", icon: "KeyRound", order: 8, published: true },
  { id: "fb-nikto", name: "Nikto", category: "tool", description: "Web server scanner for known vulnerabilities.", url: "https://cirt.net/Nikto2", icon: "ScanLine", order: 9, published: true },
  { id: "fb-sqlmap", name: "SQLMap", category: "tool", description: "Automatic SQL injection and database takeover tool.", url: "https://sqlmap.org/", icon: "Database", order: 10, published: true },
  { id: "fb-hydra", name: "Hydra", category: "tool", description: "Fast network logon cracker supporting many protocols.", url: "https://github.com/vanhauser-thc/thc-hydra", icon: "Fingerprint", order: 11, published: true },
  { id: "fb-gobuster", name: "Gobuster", category: "tool", description: "Directory/file/DNS brute-forcer used in recon labs.", url: "https://github.com/OJ/gobuster", icon: "FolderSearch", order: 12, published: true },
]

/* ---------------------------------------------------------------- *
 *  New training-restructure sections - static demo data.           *
 *  These arrays back the WHO WE TRAIN, UPCOMING BATCHES,           *
 *  FLEXIBLE SCHEDULES, TRAINING METHODOLOGY, and EXPERT            *
 *  INSTRUCTORS sections. Will be DB-driven in a later task.        *
 * ---------------------------------------------------------------- */

export const AUDIENCES = [
  {
    icon: GraduationCap,
    title: "Aspirants",
    desc: "Preparing for certifications or entering cybersecurity.",
    color: "text-violet-300",
    tint: "bg-violet-500/10",
  },
  {
    icon: Rocket,
    title: "Freshers",
    desc: "Beginning their cybersecurity careers.",
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
  },
  {
    icon: Briefcase,
    title: "Working Professionals",
    desc: "Upskilling around work schedules.",
    color: "text-amber-300",
    tint: "bg-amber-500/10",
  },
  {
    icon: Building2,
    title: "Institutions",
    desc: "Schools, colleges, universities, organizations.",
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
  },
] as const

/**
 * Upcoming live instructor-led certification batches.
 *
 * Level → color coding:
 *   Beginner     → emerald (easy, green)
 *   Intermediate → amber   (medium)
 *   Advanced     → rose    (hard)
 */
export const UPCOMING_BATCHES = [
  {
    certification: "CompTIA Security+",
    name: "Security+ Weekend Batch",
    schedule: "Sat + Sun, 7:00 PM-9:00 PM IST",
    startDate: "October 12",
    mode: "Live Online",
    instructor: "Senior Cybersecurity Instructor",
    seats: 12,
    almostFull: false,
    level: "Beginner",
    certColor: "text-emerald-300",
    certTint: "bg-emerald-500/15",
    certBorder: "border-emerald-500/30",
    levelColor: "text-emerald-300",
    levelTint: "bg-emerald-500/10",
    levelBorder: "border-emerald-500/30",
    borderColor: "border-border/60 hover:border-emerald-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.15_155_/_0.25)]",
    btnClass: "bg-emerald-600 hover:bg-emerald-500",
  },
  {
    certification: "CEH (Certified Ethical Hacker)",
    name: "CEH Weekday Evening",
    schedule: "Mon-Wed-Fri, 8:00 PM-10:00 PM IST",
    startDate: "October 20",
    mode: "Live Online",
    instructor: "Dr. Sarah Chen",
    seats: 8,
    almostFull: false,
    level: "Intermediate",
    certColor: "text-amber-300",
    certTint: "bg-amber-500/15",
    certBorder: "border-amber-500/30",
    levelColor: "text-amber-300",
    levelTint: "bg-amber-500/10",
    levelBorder: "border-amber-500/30",
    borderColor: "border-border/60 hover:border-amber-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.7_0.15_70_/_0.25)]",
    btnClass: "bg-amber-600 hover:bg-amber-500",
  },
  {
    certification: "CCNA",
    name: "CCNA Morning Batch",
    schedule: "Tue-Thu, 7:00 AM-9:00 AM IST",
    startDate: "November 03",
    mode: "Live Online",
    instructor: "Raj Patel",
    seats: 15,
    almostFull: false,
    level: "Beginner",
    certColor: "text-cyan-300",
    certTint: "bg-cyan-500/15",
    certBorder: "border-cyan-500/30",
    levelColor: "text-emerald-300",
    levelTint: "bg-emerald-500/10",
    levelBorder: "border-emerald-500/30",
    borderColor: "border-border/60 hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.7_0.15_220_/_0.25)]",
    btnClass: "bg-cyan-600 hover:bg-cyan-500",
  },
  {
    certification: "CISSP",
    name: "CISSP Weekend Intensive",
    schedule: "Sat-Sun, 10:00 AM-1:00 PM IST",
    startDate: "November 09",
    mode: "Live Online",
    instructor: "Alex Mercer",
    seats: 5,
    almostFull: true,
    level: "Advanced",
    certColor: "text-rose-300",
    certTint: "bg-rose-500/15",
    certBorder: "border-rose-500/30",
    levelColor: "text-rose-300",
    levelTint: "bg-rose-500/10",
    levelBorder: "border-rose-500/30",
    borderColor: "border-border/60 hover:border-rose-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.2_15_/_0.25)]",
    btnClass: "bg-rose-600 hover:bg-rose-500",
  },
] as const

export const SCHEDULES = [
  {
    icon: CalendarDays,
    type: "WEEKDAY",
    example: "Mon-Wed-Fri · 8:00 PM-10:00 PM",
    color: "text-violet-300",
    tint: "bg-violet-500/10",
  },
  {
    icon: CalendarCheck,
    type: "WEEKEND",
    example: "Sat + Sun · 10:00 AM-1:00 PM",
    color: "text-cyan-300",
    tint: "bg-cyan-500/10",
  },
  {
    icon: Sun,
    type: "MORNING",
    example: "Tue-Thu · 7:00 AM-9:00 AM",
    color: "text-amber-300",
    tint: "bg-amber-500/10",
  },
  {
    icon: SunMedium,
    type: "AFTERNOON",
    example: "Mon-Wed · 2:00 PM-4:00 PM",
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
  },
  {
    icon: Sunset,
    type: "EVENING",
    example: "Mon-Fri · 7:00 PM-9:00 PM",
    color: "text-rose-300",
    tint: "bg-rose-500/10",
  },
  {
    icon: Moon,
    type: "LATE NIGHT",
    example: "Mon-Thu · 10:00 PM-12:00 AM",
    color: "text-teal-300",
    tint: "bg-teal-500/10",
  },
] as const

/**
 * 7-step training methodology - the GuardianX framework that every
 * certification batch follows end-to-end. This sequence is one of the
 * platform's defining visual elements.
 */
export const METHODOLOGY_STEPS = [
  {
    num: "01",
    icon: Video,
    title: "LIVE LECTURE",
    desc: "Instructor-led live sessions covering theory, real-world cases, and exam blueprints.",
  },
  {
    num: "02",
    icon: Microscope,
    title: "IN-DEPTH ANALYSIS",
    desc: "Break down each topic with worked examples, threat models, and lab walkthroughs.",
  },
  {
    num: "03",
    icon: FileText,
    title: "STUDY MATERIAL",
    desc: "Downloadable PDFs, on-the-go notes, and structured reference material for every lesson.",
  },
  {
    num: "04",
    icon: FlaskConical,
    title: "HANDS-ON LAB",
    desc: "Spin up isolated targets and apply every concept in a real cyber range environment.",
  },
  {
    num: "05",
    icon: ClipboardList,
    title: "ASSIGNMENT",
    desc: "Practical assignments graded by instructors with personalized written feedback.",
  },
  {
    num: "06",
    icon: FileQuestion,
    title: "MOCK TEST",
    desc: "Full-length mock exams that mirror the real certification format and timing.",
  },
  {
    num: "07",
    icon: Award,
    title: "EXAM PREPARATION",
    desc: "Final revision, exam strategy, and confidence drills to walk into test day ready.",
  },
] as const

/**
 * Verified instructor profiles - these are real instructor records from
 * the GuardianX DB. Shown here as a static showcase; will be wired to
 * /api/instructors in a later task.
 */
