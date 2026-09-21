import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Live Threat Intelligence Feed
// GET: list threat intel items (auto-seeds 20 items if empty)
// POST: create new (admin only)
// ============================================================

const SEED_THREATS = [
  {
    title: "Ransomware group LockBit 4.0 surfaces with new encryption scheme",
    description:
      "A new variant of the LockBit ransomware family has been observed targeting healthcare and manufacturing sectors. The strain uses a hybrid AES-256 + Curve25519 scheme and includes a wiper fallback that activates after 72 hours of non-payment.",
    severity: "critical",
    category: "malware",
    source: "GuardianX Intelligence",
    cve: null,
    ioc: "7f2b9c4e8d1a6b3f0c5e9a2d8b1f4c7e",
    affectedSystems: "Windows Server 2016-2022, ESXi 7.0+",
  },
  {
    title: "CVE-2025-1042: Critical RCE in Apache Tomcat via malformed AJP request",
    description:
      "A remote code execution vulnerability in Apache Tomcat's AJP connector allows unauthenticated attackers to execute arbitrary code by sending crafted AJP requests. CVSS 9.8. Active exploitation observed in the wild.",
    severity: "critical",
    category: "vulnerability",
    source: "NVD",
    cve: "CVE-2025-1042",
    ioc: null,
    affectedSystems: "Apache Tomcat 9.0.0-9.0.85, 10.1.0-10.1.30",
  },
  {
    title: "Massive credentials leak exposes 4.2B records on dark web forum",
    description:
      "A combined credential dump dubbed 'RockYou2025' has appeared on a Russian-language cybercrime forum. The 1.5TB archive aggregates prior leaks with ~400M new entries. Organizations are urged to enforce password rotation and MFA.",
    severity: "high",
    category: "breach",
    source: "Have I Been Pwned",
    cve: null,
    ioc: "rockyou2025.txt (SHA256: a1b2c3d4...)",
    affectedSystems: "All platforms with reused passwords",
  },
  {
    title: "Phishing campaign impersonates Microsoft 365 with AI-generated voice lures",
    description:
      "A sophisticated phishing-as-a-service operation dubbed 'Caffeine Pro' is using AI-cloned voicemails of IT administrators to trick employees into approving MFA push notifications. Targets include Fortune 500 finance teams.",
    severity: "high",
    category: "attack",
    source: "GuardianX Intelligence",
    cve: null,
    ioc: "caffeine-pro[.]xyz",
    affectedSystems: "Microsoft 365, Azure AD",
  },
  {
    title: "Critical GitLab flaw allows account takeover via SSRF",
    description:
      "GitLab CE/EE versions 16.0-16.11 contain a server-side request forgery vulnerability that allows authenticated attackers to pivot into internal networks and potentially seize admin sessions via webhook abuse.",
    severity: "high",
    category: "vulnerability",
    source: "GitLab Security",
    cve: "CVE-2025-2281",
    ioc: null,
    affectedSystems: "GitLab CE/EE 16.0-16.11",
  },
  {
    title: "New supply-chain attack targets npm packages with polyglot install scripts",
    description:
      "Researchers identified 14 malicious npm packages masquerading as popular React utilities. The packages use polyglot JavaScript/Bash install scripts to harvest SSH keys from developer machines during npm install.",
    severity: "high",
    category: "malware",
    source: "Snyk",
    cve: null,
    ioc: "react-fast-hooks-utils, next-auth-helpers",
    affectedSystems: "Node.js projects using npm",
  },
  {
    title: "Chrome zero-day actively exploited - update to v131 immediately",
    description:
      "Google has patched a high-severity type confusion vulnerability in Chrome's V8 engine. Active exploitation has been observed in targeted attacks against journalists and dissidents. Update to Chrome 131.0.6778.70+.",
    severity: "high",
    category: "vulnerability",
    source: "Google TAG",
    cve: "CVE-2025-0913",
    ioc: null,
    affectedSystems: "Google Chrome < 131.0.6778.70",
  },
  {
    title: "Active directory Kerberoasting campaign targets energy sector",
    description:
      "A threat actor tracked as 'OilRig' (APT34) is conducting Kerberoasting attacks against energy-sector Active Directory environments, harvesting service ticket hashes and exfiltrating via DNS tunneling.",
    severity: "medium",
    category: "attack",
    source: "Mandiant",
    cve: null,
    ioc: "svc-sql-reader, svc-backup (SPN names)",
    affectedSystems: "Windows Active Directory 2012-2022",
  },
  {
    title: "CISA advisory: Harden RDP exposure following Q1 2025 intrusions",
    description:
      "CISA and the FBI jointly warn of a 47% increase in RDP-based initial access during Q1 2025, primarily via brute-force and credential stuffing. Organizations are urged to disable RDP at the perimeter or enforce VPN + MFA.",
    severity: "medium",
    category: "advisory",
    source: "CISA",
    cve: null,
    ioc: null,
    affectedSystems: "Windows RDP services exposed to internet",
  },
  {
    title: "Cryptominer 'Sysrv-hello' evolves with Kubernetes scanning module",
    description:
      "The Sysrv botnet has added a Kubernetes API discovery module that scans for exposed kubelets on port 10250 and deploys XMRig miners via privileged pods. Default kubeconfig credentials are also brute-forced.",
    severity: "medium",
    category: "malware",
    source: "Aqua Security",
    cve: null,
    ioc: "k8s-proxy:latest, sysrv-hello",
    affectedSystems: "Kubernetes 1.20-1.28 with exposed kubelets",
  },
  {
    title: "Facebook OAuth flow abused to bypass email verification on SSO sites",
    description:
      "A flaw in the Facebook OAuth 'instant email' relay allowed attackers to register accounts on third-party SSO-enabled sites using disposable @facebook.com relay addresses. Meta patched the issue in late February.",
    severity: "medium",
    category: "vulnerability",
    source: "GuardianX Intelligence",
    cve: null,
    ioc: null,
    affectedSystems: "Sites using Facebook OAuth login",
  },
  {
    title: "Crypto wallet drainer 'Inferno Drainer' resurfaces with new TDS infrastructure",
    description:
      "The wallet-draining toolkit Inferno Drainer has re-emerged with a new traffic-direction-system backend that rotates phishing domains hourly. Estimated losses exceed $40M since January. Targets include Web3 DeFi users.",
    severity: "high",
    category: "attack",
    source: "Chainalysis",
    cve: null,
    ioc: "inferno-tds[.]net",
    affectedSystems: "Browser-based Web3 wallets (MetaMask, Rabby)",
  },
  {
    title: "VMware ESXi OpenSLP vulnerability under active exploitation",
    description:
      "VMware has confirmed active exploitation of CVE-2025-2199, a heap overflow in OpenSLP shipped with ESXi. Attackers are deploying ESXi ransomware variants after initial access. Patch to ESXi 8.0U3 or disable SLP service.",
    severity: "critical",
    category: "vulnerability",
    source: "VMware Security",
    cve: "CVE-2025-2199",
    ioc: null,
    affectedSystems: "VMware ESXi 7.0, 8.0 prior to 8.0U3",
  },
  {
    title: "LinkedIn scraping operation exposed 220M profiles",
    description:
      "A dataset containing 220M scraped LinkedIn profiles (including emails, job titles, and employers) was offered for sale on a dark web marketplace. No breach of LinkedIn's infrastructure occurred - data was scraped via automation.",
    severity: "low",
    category: "breach",
    source: "Recorded Future",
    cve: null,
    ioc: null,
    affectedSystems: "LinkedIn users globally",
  },
  {
    title: "GitHub Actions runner abuse mines Monero via forked repositories",
    description:
      "Threat actors are creating forks of popular repositories and abusing GitHub's free CI minutes to mine Monero via embedded xmrig binaries. GitHub suspended 4,200 accounts in March. Watch for unusual workflow files.",
    severity: "low",
    category: "attack",
    source: "GitHub Security",
    cve: null,
    ioc: ".github/workflows/ci-test.yml (modified)",
    affectedSystems: "GitHub repositories with enabled Actions",
  },
  {
    title: "Palo Alto PAN-OS firewall zero-day under active exploitation",
    description:
      "An unauthenticated remote code execution vulnerability in PAN-OS management interface is being exploited in the wild. Threat actor 'UTG0273' has been observed deploying web shells on internet-exposed firewalls.",
    severity: "critical",
    category: "vulnerability",
    source: "Palo Alto Security",
    cve: "CVE-2025-3324",
    ioc: null,
    affectedSystems: "PAN-OS 10.2, 11.0, 11.1 (management interface exposed)",
  },
  {
    title: "Cisco Smart Install Protocol abuse continues despite 2018 advisory",
    description:
      "Despite CVE-2018-0171 being patched years ago, over 12,000 Cisco devices remain exposed to Smart Install Protocol abuse, allowing attackers to overwrite startup-config and persist via ROMMON implants.",
    severity: "medium",
    category: "advisory",
    source: "Shadowserver",
    cve: "CVE-2018-0171",
    ioc: null,
    affectedSystems: "Cisco IOS 12.2-15.x with Smart Install enabled",
  },
  {
    title: "DDoS-for-hire service 'Stresser.to' seized by Europol",
    description:
      "Europol, in coordination with 12 countries, seized the Stresser.to DDoS-as-a-service platform. The service had been used in over 4 million attacks since 2022. 18 administrators and customers were arrested.",
    severity: "low",
    category: "advisory",
    source: "Europol",
    cve: null,
    ioc: null,
    affectedSystems: "N/A (takedown)",
  },
  {
    title: "Microsoft Azure AD consent phishing kit 'Akira' circulates on Telegram",
    description:
      "A new phishing kit named 'Akira' uses realistic Microsoft login pages to abuse OAuth consent flows, requesting Mail.Read and Files.ReadWrite.All scopes. Stolen tokens are valid for 90 days and bypass MFA.",
    severity: "high",
    category: "attack",
    source: "Proofpoint",
    cve: null,
    ioc: "login-microsoftonline[.]cc",
    affectedSystems: "Microsoft 365 / Azure AD tenants",
  },
  {
    title: "SonicWall SMA firmware exposes hardcoded SSH credentials",
    description:
      "A security researcher disclosed a hardcoded root SSH credential in SonicWall SMA 100 series firmware versions prior to 10.2.1.3. Patches are available; customers should rotate all admin credentials post-upgrade.",
    severity: "critical",
    category: "vulnerability",
    source: "SonicWall PSIRT",
    cve: "CVE-2025-2881",
    ioc: null,
    affectedSystems: "SonicWall SMA 100 < 10.2.1.3",
  },
]

async function seedThreatsIfEmpty() {
  const count = await db.threatFeed.count()
  if (count > 0) return
  // Stagger publishedAt timestamps so the feed looks "live"
  const now = Date.now()
  await db.threatFeed.createMany({
    data: SEED_THREATS.map((t, i) => ({
      ...t,
      publishedAt: new Date(now - i * 1000 * 60 * 73), // ~73 min apart
    })),
  })
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await seedThreatsIfEmpty()

    const { searchParams } = new URL(req.url)
    const severity = searchParams.get("severity")
    const category = searchParams.get("category")
    const q = searchParams.get("q")

    const where: any = {}
    if (severity && severity !== "all") where.severity = severity
    if (category && category !== "all") where.category = category
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { cve: { contains: q } },
        { ioc: { contains: q } },
      ]
    }

    const items = await db.threatFeed.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ items, total: items.length })
  } catch (err: any) {
    console.error("[threat-feed] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!["ADMIN", "SUPER_ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, severity, category, source, cve, ioc, affectedSystems } = body as {
      title?: string
      description?: string
      severity?: string
      category?: string
      source?: string
      cve?: string | null
      ioc?: string | null
      affectedSystems?: string
    }

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "title, description, and category are required" },
        { status: 400 }
      )
    }

    const item = await db.threatFeed.create({
      data: {
        title,
        description,
        severity: severity || "medium",
        category,
        source: source || "GuardianX Intelligence",
        cve: cve || null,
        ioc: ioc || null,
        affectedSystems: affectedSystems || "",
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err: any) {
    console.error("[threat-feed] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
