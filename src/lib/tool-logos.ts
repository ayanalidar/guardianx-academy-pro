/**
 * Tool logo mapping for the course page "Tools you'll use" strip.
 *
 * Maps a tool name (as authored in Course Studio → toolsCovered) to a
 * lucide icon + brand accent color, so every tool renders as a
 * recognizable tile instead of a plain text chip. Unknown tools fall
 * back to a neutral Code icon tile.
 *
 * Zero external assets — icons come from lucide-react (already bundled),
 * so there is no network dependency and no bundle-size penalty beyond
 * the icon components this file references.
 */
import {
  Terminal,
  Activity,
  Bug,
  Radar,
  Container,
  Cloud,
  CloudCog,
  Blocks,
  Code2,
  GitBranch,
  BarChart3,
  Shield,
  Network,
  Database,
  Lock,
  Cpu,
  FileSearch,
  Globe,
  KeyRound,
  Server,
  Braces,
  HardDrive,
  Wifi,
  Eye,
  Flame,
  type LucideIcon,
} from "lucide-react"

export interface ToolLogo {
  icon: LucideIcon
  /** Tailwind classes for the icon stroke */
  color: string
  /** Tailwind classes for the tile background */
  bg: string
}

const T = (
  icon: LucideIcon,
  color: string,
  bg: string,
): ToolLogo => ({ icon, color, bg })

/**
 * Matching is case-insensitive on a lowercase key; the lookup tries exact
 * name first, then substring containment (e.g. "Burp Suite Professional"
 * matches "burp suite").
 */
const TOOL_MAP: Record<string, ToolLogo> = {
  // --- Offensive / pentest ---
  "kali": T(Terminal, "text-cyan-300", "bg-cyan-500/10 border-cyan-500/30"),
  "kali linux": T(Terminal, "text-cyan-300", "bg-cyan-500/10 border-cyan-500/30"),
  "metasploit": T(Bug, "text-rose-300", "bg-rose-500/10 border-rose-500/30"),
  "burp suite": T(Globe, "text-orange-300", "bg-orange-500/10 border-orange-500/30"),
  "burp": T(Globe, "text-orange-300", "bg-orange-500/10 border-orange-500/30"),
  "nmap": T(Radar, "text-emerald-300", "bg-emerald-500/10 border-emerald-500/30"),
  "hydra": T(KeyRound, "text-rose-300", "bg-rose-500/10 border-rose-500/30"),
  "john the ripper": T(KeyRound, "text-amber-300", "bg-amber-500/10 border-amber-500/30"),
  "hashcat": T(Flame, "text-rose-300", "bg-rose-500/10 border-rose-500/30"),
  "sqlmap": T(Database, "text-violet-300", "bg-violet-500/10 border-violet-500/30"),
  "gobuster": T(FileSearch, "text-emerald-300", "bg-emerald-500/10 border-emerald-500/30"),
  "nikto": T(Bug, "text-amber-300", "bg-amber-500/10 border-amber-500/30"),
  "nessus": T(Radar, "text-cyan-300", "bg-cyan-500/10 border-cyan-500/30"),
  "wireshark": T(Network, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),
  "aircrack": T(Wifi, "text-cyan-300", "bg-cyan-500/10 border-cyan-500/30"),

  // --- Defensive / SOC ---
  "splunk": T(BarChart3, "text-emerald-300", "bg-emerald-500/10 border-emerald-500/30"),
  "wireshark soc": T(Network, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),
  "osquery": T(HardDrive, "text-violet-300", "bg-violet-500/10 border-violet-500/30"),
  "volatility": T(Cpu, "text-violet-300", "bg-violet-500/10 border-violet-500/30"),
  "autopsy": T(FileSearch, "text-amber-300", "bg-amber-500/10 border-amber-500/30"),
  "yara": T(Eye, "text-rose-300", "bg-rose-500/10 border-rose-500/30"),
  "snort": T(Shield, "text-emerald-300", "bg-emerald-500/10 border-emerald-500/30"),
  "suricata": T(Shield, "text-cyan-300", "bg-cyan-500/10 border-cyan-500/30"),
  "pfsense": T(Server, "text-blue-300", "bg-blue-500/10 border-blue-500/30"),
  "elastic": T(BarChart3, "text-amber-300", "bg-amber-500/10 border-amber-500/30"),
  "qradar": T(BarChart3, "text-cyan-300", "bg-cyan-500/10 border-cyan-500/30"),
  "sentinel": T(Eye, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),

  // --- Cloud & DevOps ---
  "aws": T(Cloud, "text-orange-300", "bg-orange-500/10 border-orange-500/30"),
  "amazon web services": T(Cloud, "text-orange-300", "bg-orange-500/10 border-orange-500/30"),
  "azure": T(Cloud, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),
  "microsoft azure": T(Cloud, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),
  "gcp": T(Cloud, "text-blue-300", "bg-blue-500/10 border-blue-500/30"),
  "google cloud": T(Cloud, "text-blue-300", "bg-blue-500/10 border-blue-500/30"),
  "docker": T(Container, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),
  "kubernetes": T(Container, "text-indigo-300", "bg-indigo-500/10 border-indigo-500/30"),
  "terraform": T(Blocks, "text-violet-300", "bg-violet-500/10 border-violet-500/30"),
  "ansible": T(Server, "text-rose-300", "bg-rose-500/10 border-rose-500/30"),
  "jenkins": T(Code2, "text-rose-300", "bg-rose-500/10 border-rose-500/30"),

  // --- Languages & general ---
  "python": T(Braces, "text-amber-300", "bg-amber-500/10 border-amber-500/30"),
  "bash": T(Terminal, "text-emerald-300", "bg-emerald-500/10 border-emerald-500/30"),
  "powershell": T(Terminal, "text-sky-300", "bg-sky-500/10 border-sky-500/30"),
  "linux": T(Terminal, "text-amber-300", "bg-amber-500/10 border-amber-500/30"),
  "git": T(GitBranch, "text-orange-300", "bg-orange-500/10 border-orange-500/30"),
  "postman": T(Globe, "text-orange-300", "bg-orange-500/10 border-orange-500/30"),
  "owasp zap": T(Bug, "text-emerald-300", "bg-emerald-500/10 border-emerald-500/30"),
  "activity": T(Activity, "text-violet-300", "bg-violet-500/10 border-violet-500/30"),
}

/** Fallback for any tool not in the map. */
export const FALLBACK_TOOL_LOGO: ToolLogo = T(
  Code2,
  "text-muted-foreground",
  "bg-muted/40 border-border/50",
)

/** Look up a logo by tool name (exact, then substring, then fallback). */
export function getToolLogo(name: string): ToolLogo {
  const key = (name || "").trim().toLowerCase()
  if (!key) return FALLBACK_TOOL_LOGO
  if (TOOL_MAP[key]) return TOOL_MAP[key]
  for (const k of Object.keys(TOOL_MAP)) {
    if (key.includes(k) || k.includes(key)) return TOOL_MAP[k]
  }
  return FALLBACK_TOOL_LOGO
}
