import { db } from "../src/lib/db"
import bcrypt from "bcryptjs"

const hash = (s: string) => bcrypt.hashSync(s, 10)

async function main() {
  console.log("Seeding GuardianX database...")

  // ---- Users ----
  // NOTE: Dummy instructors (Dr. Sarah Chen, Raj Patel) have been removed.
  // Real instructors are added via the admin panel (/admin-instructor-assignment).
  // The seed script only creates admin + student accounts for testing.

  const admin = await db.user.upsert({
    where: { email: "admin@guardianx.io" },
    update: {},
    create: {
      email: "admin@guardianx.io",
      name: "Alex Mercer",
      passwordHash: hash("admin123"),
      role: "ADMIN",
      title: "Platform Administrator",
      bio: "GuardianX platform administrator and lead security architect.",
    },
  })

  // Instructors referenced by the course seeds below (were removed with the
  // dummy-user cleanup but still referenced — this caused
  // "ReferenceError: instructor is not defined").
  const instructor = await db.user.upsert({
    where: { email: "sarah.chen@guardianx.io" },
    update: {},
    create: {
      email: "sarah.chen@guardianx.io",
      name: "Dr. Sarah Chen",
      passwordHash: hash("instructor123"),
      role: "INSTRUCTOR",
      title: "Principal Security Instructor",
      bio: "15 years in offensive security; OSCP, OSCE and CEH Master certified.",
    },
  })
  const instructor2 = await db.user.upsert({
    where: { email: "raj.patel@guardianx.io" },
    update: {},
    create: {
      email: "raj.patel@guardianx.io",
      name: "Raj Patel",
      passwordHash: hash("instructor123"),
      role: "INSTRUCTOR",
      title: "Senior Instructor — Cloud & DFIR",
      bio: "Cloud security architect turned educator; CISSP, CCSP, GCFE.",
    },
  })

  const student = await db.user.upsert({
    where: { email: "student@guardianx.io" },
    update: {},
    create: {
      email: "student@guardianx.io",
      name: "Jamie Rivera",
      passwordHash: hash("student123"),
      role: "STUDENT",
      title: "Aspiring Security Analyst",
      bio: "Career switcher from finance to cyber security. Currently grinding CEH.",
    },
  })

  // ---- Helper to build course ----
  type ModuleInput = {
    title: string
    description?: string
    lessons: {
      title: string
      type: string
      content: string
      pdfPages?: number
      durationMin?: number
      preview?: boolean
      quiz?: { title: string; questions: { text: string; options: string[]; answerIndex: number; explanation?: string }[] }
    }[]
  }

  async function buildCourse(data: {
    slug: string
    title: string
    shortName: string
    description: string
    longDescription: string
    category: string
    level: string
    durationHours: number
    price: number
    rating: number
    studentsCount: number
    color: string
    tags: string
    certBody: string
    instructorId: string
    modules: ModuleInput[]
  }) {
    const existing = await db.course.findUnique({ where: { slug: data.slug } })
    if (existing) {
      // update meta only
      return db.course.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          shortName: data.shortName,
          description: data.description,
          longDescription: data.longDescription,
          category: data.category,
          level: data.level,
          durationHours: data.durationHours,
          price: data.price,
          rating: data.rating,
          studentsCount: data.studentsCount,
          color: data.color,
          tags: data.tags,
          certBody: data.certBody,
          instructorId: data.instructorId,
        },
      })
    }
    const course = await db.course.create({
      data: {
        slug: data.slug,
        title: data.title,
        shortName: data.shortName,
        description: data.description,
        longDescription: data.longDescription,
        category: data.category,
        level: data.level,
        durationHours: data.durationHours,
        price: data.price,
        rating: data.rating,
        studentsCount: data.studentsCount,
        color: data.color,
        tags: data.tags,
        certBody: data.certBody,
        instructorId: data.instructorId,
      },
    })
    for (let mi = 0; mi < data.modules.length; mi++) {
      const m = data.modules[mi]
      const module_ = await db.module.create({
        data: { courseId: course.id, title: m.title, description: m.description, order: mi },
      })
      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li]
        const lesson = await db.lesson.create({
          data: {
            moduleId: module_.id,
            title: l.title,
            type: l.type,
            content: l.content,
            pdfPages: l.pdfPages ?? 0,
            durationMin: l.durationMin ?? 15,
            order: li,
            preview: l.preview ?? false,
          },
        })
        if (l.quiz) {
          const quiz = await db.quiz.create({
            data: { lessonId: lesson.id, title: l.quiz.title, description: "Test your knowledge" },
          })
          for (const q of l.quiz.questions) {
            await db.question.create({
              data: {
                quizId: quiz.id,
                text: q.text,
                options: q.options.join("|"),
                answerIndex: q.answerIndex,
                explanation: q.explanation,
              },
            })
          }
        }
      }
    }
    return course
  }

  // ============ CEH ============
  await buildCourse({
    slug: "ceh",
    title: "Certified Ethical Hacker",
    shortName: "CEH",
    description: "Master the art of ethical hacking and penetration testing with EC-Council's flagship certification.",
    longDescription:
      "The Certified Ethical Hacker (CEH) program is the pinnacle of ethical hacking training. Learn the same techniques malicious hackers use, but in a lawful and legitimate way to secure systems. Covers footprinting, scanning, enumeration, system hacking, malware, sniffing, social engineering, and more across 20 domains.",
    category: "Ethical Hacking",
    level: "Intermediate",
    durationHours: 40,
    price: 199,
    rating: 4.7,
    studentsCount: 12840,
    color: "emerald",
    tags: "ethical-hacking,penetration-testing,recon,exploitation",
    certBody: "EC-Council",
    instructorId: instructor.id,
    modules: [
      {
        title: "Module 01 — Introduction to Ethical Hacking",
        description: "Understand the hacker mindset, phases of hacking, and ethics.",
        lessons: [
          {
            title: "InfoSec Fundamentals & The Hacker Mindset",
            type: "reading",
            durationMin: 25,
            preview: true,
            content:
              "# InfoSec Fundamentals\n\nInformation Security (InfoSec) protects the **CIA Triad**:\n\n- **Confidentiality** — data is only accessible to authorized parties\n- **Integrity** — data is accurate and unaltered\n- **Availability** — data and systems are accessible when needed\n\n## The Hacker Mindset\nEthical hackers think like attackers. They ask: *How can I break this?* then *How can I fix it?*\n\n## Types of Hackers\n- **Black Hat** — malicious, illegal\n- **White Hat** — ethical, authorized\n- **Gray Hat** — operates in between\n\n## Phases of Hacking\n1. Reconnaissance\n2. Scanning\n3. Gaining Access\n4. Maintaining Access\n5. Covering Tracks",
          },
          {
            title: "Phases of Hacking Deep-Dive",
            type: "pdf",
            pdfPages: 18,
            durationMin: 30,
            content:
              "Comprehensive guide to the 5 phases of ethical hacking. Each phase is broken down with real-world examples and tool demonstrations.",
          },
          {
            title: "Quiz: Hacking Fundamentals",
            type: "reading",
            durationMin: 10,
            content: "Test your understanding of core ethical hacking concepts.",
            quiz: {
              title: "Hacking Fundamentals",
              questions: [
                {
                  text: "Which component of the CIA Triad ensures data is not altered improperly?",
                  options: ["Confidentiality", "Integrity", "Availability", "Authentication"],
                  answerIndex: 1,
                  explanation: "Integrity ensures data accuracy and has not been tampered with.",
                },
                {
                  text: "What is the first phase of ethical hacking?",
                  options: ["Scanning", "Gaining Access", "Reconnaissance", "Covering Tracks"],
                  answerIndex: 2,
                  explanation: "Reconnaissance (information gathering) is always the first phase.",
                },
                {
                  text: "A hacker who has permission to test systems is a:",
                  options: ["Black Hat", "White Hat", "Script Kiddie", "Hacktivist"],
                  answerIndex: 1,
                  explanation: "White Hat hackers operate with explicit authorization.",
                },
              ],
            },
          },
        ],
      },
      {
        title: "Module 02 — Footprinting & Reconnaissance",
        description: "Gather intelligence on targets using OSINT.",
        lessons: [
          {
            title: "OSINT & Passive Recon",
            type: "reading",
            durationMin: 28,
            content:
              "# Footprinting\n\nFootprinting is the **passive and active** gathering of information about a target.\n\n## Passive Techniques\n- Search engine dorking (`site:`, `filetype:`)\n- WHOIS lookups\n- DNS records\n- Social media profiling\n- Job postings (tech stack leaks)\n\n## Tools\n- `whois`, `dig`, `nslookup`\n- Maltego\n- theHarvester\n- Shodan\n\n## Google Dorking Examples\n```\nsite:target.com filetype:pdf\nintitle:\"index of\" /backup\ninurl:admin\n```",
          },
          {
            title: "Active Recon with theHarvester",
            type: "pdf",
            pdfPages: 12,
            durationMin: 20,
            content: "Hands-on lab: enumerate emails, subdomains, and hosts using theHarvester and amass.",
          },
        ],
      },
      {
        title: "Module 03 — Scanning & Enumeration",
        description: "Discover live hosts, open ports, and services.",
        lessons: [
          {
            title: "Nmap Mastery",
            type: "reading",
            durationMin: 35,
            preview: true,
            content:
              "# Nmap — Network Mapper\n\nNmap is the de-facto network scanning tool.\n\n## Common Scans\n```bash\n# Ping sweep\nnmap -sn 192.168.1.0/24\n\n# SYN scan (default, stealthy)\nnmap -sS 192.168.1.10\n\n# Service/version detection\nnmap -sV 192.168.1.10\n\n# OS detection\nnmap -O 192.168.1.10\n\n# Aggressive scan (all in one)\nnmap -A 192.168.1.10\n\n# Script scan\nnmap --script vuln 192.168.1.10\n```\n\n## Scan Types\n- `-sS` SYN scan (half-open)\n- `-sT` TCP connect\n- `-sU` UDP scan\n- `-sA` ACK scan (firewall detection)",
          },
          {
            title: "Service Enumeration",
            type: "reading",
            durationMin: 30,
            content:
              "# Enumeration\n\nAfter scanning, **enumerate** each service for detailed info.\n\n## SMB (445)\n```bash\nenum4linux-ng -A 192.168.1.10\nsmbclient -L //192.168.1.10\n```\n\n## HTTP (80/443)\n- Check robots.txt, source code\n- `gobuster dir -u http://target -w wordlist.txt`\n- `nikto -h http://target`\n\n## SSH (22)\n- Banner grab: `nc 192.168.1.10 22`\n- Check for weak configs",
          },
          {
            title: "Quiz: Scanning & Enumeration",
            type: "reading",
            durationMin: 10,
            content: "Test your Nmap and enumeration knowledge.",
            quiz: {
              title: "Scanning & Enumeration",
              questions: [
                {
                  text: "Which Nmap flag performs a SYN (stealth) scan?",
                  options: ["-sT", "-sS", "-sU", "-sV"],
                  answerIndex: 1,
                  explanation: "-sS performs a SYN half-open scan, the default for privileged users.",
                },
                {
                  text: "Which tool is best for enumerating SMB shares?",
                  options: ["gobuster", "enum4linux", "nikto", "sqlmap"],
                  answerIndex: 1,
                  explanation: "enum4linux enumerates SMB/NetBIOS information.",
                },
              ],
            },
          },
        ],
      },
      {
        title: "Module 04 — System Hacking",
        description: "Exploit vulnerabilities to gain and maintain access.",
        lessons: [
          {
            title: "Vulnerability Research & Exploitation",
            type: "reading",
            durationMin: 32,
            content:
              "# System Hacking\n\nGain access by exploiting vulnerabilities found in scanning.\n\n## Exploitation Frameworks\n- **Metasploit Framework** — `msfconsole`\n- **SearchSploit** — offline exploit-db\n\n## Metasploit Workflow\n```\nmsf6 > search eternal_blue\nmsf6 > use exploit/windows/smb/ms17_010_eternalblue\nmsf6 > set RHOSTS 192.168.1.10\nmsf6 > exploit\n```\n\n## Privilege Escalation\n- Linux: `linpeas.sh`, check SUID binaries, sudo -l\n- Windows: `winPEAS`, kernel exploits, unquoted service paths",
          },
          {
            title: "Privilege Escalation Techniques",
            type: "pdf",
            pdfPages: 24,
            durationMin: 40,
            content: "Deep dive into Linux and Windows privilege escalation: SUID, sudo misconfigurations, kernel exploits, token impersonation.",
          },
        ],
      },
      {
        title: "Module 05 — Malware & Sniffing",
        description: "Understand malware threats and network sniffing.",
        lessons: [
          {
            title: "Malware Analysis Basics",
            type: "reading",
            durationMin: 25,
            content:
              "# Malware Threats\n\nMalware types: Virus, Worm, Trojan, Ransomware, Spyware, Rootkit, Bootkit.\n\n## Analysis\n- **Static** — disassemble without running (IDA, Ghidra, strings)\n- **Dynamic** — run in sandbox (Cuckoo, Any.Run)\n\n## Indicators of Compromise (IOC)\n- File hashes\n- Suspicious domains/IPs\n- Registry keys\n- Mutex names",
          },
          {
            title: "Network Sniffing with Wireshark",
            type: "pdf",
            pdfPages: 16,
            durationMin: 30,
            content: "Capture and analyze packets. Detect plaintext credentials, ARP spoofing, and MITM attacks.",
          },
        ],
      },
    ],
  })

  // ============ CCNA ============
  await buildCourse({
    slug: "ccna",
    title: "Cisco Certified Network Associate",
    shortName: "CCNA",
    description: "Build a solid foundation in networking, routing, switching, and Cisco IOS.",
    longDescription:
      "The CCNA 200-301 certification validates your ability to install, configure, operate, and troubleshoot medium-size routed and switched networks. Covers network fundamentals, IP connectivity, IP services, security fundamentals, automation, and programmability.",
    category: "Networking",
    level: "Beginner",
    durationHours: 35,
    price: 149,
    rating: 4.6,
    studentsCount: 28910,
    color: "cyan",
    tags: "networking,cisco,routing,switching,subnetting",
    certBody: "Cisco",
    instructorId: instructor2.id,
    modules: [
      {
        title: "Module 01 — Network Fundamentals",
        lessons: [
          {
            title: "The OSI & TCP/IP Models",
            type: "reading",
            durationMin: 30,
            preview: true,
            content:
              "# OSI Model (7 Layers)\n\n| Layer | Name | Example |\n|------|------|--------|\n| 7 | Application | HTTP, DNS |\n| 6 | Presentation | TLS, JPEG |\n| 5 | Session | NetBIOS |\n| 4 | Transport | TCP, UDP |\n| 3 | Network | IP, ICMP |\n| 2 | Data Link | Ethernet, MAC |\n| 1 | Physical | Cables, signals |\n\n## TCP/IP Model (4 Layers)\nApplication, Transport, Internet, Network Access\n\n## Mnemonic\n**P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way (Physical→Application)",
          },
          {
            title: "Subnetting Made Easy",
            type: "reading",
            durationMin: 45,
            content:
              "# Subnetting\n\nIPv4 = 32 bits, 4 octets.\n\n## CIDR Examples\n- `/24` = 256 addresses (254 usable)\n- `/25` = 128 addresses (126 usable)\n- `/30` = 4 addresses (2 usable) — perfect for point-to-point\n\n## Formula\nUsable hosts = 2^(32-prefix) - 2\n\n## Example\n`192.168.1.0/26` → 64 addresses, 62 usable\nSubnet mask: `255.255.255.192`\nRange: `192.168.1.1` – `192.168.1.62`",
          },
          {
            title: "Quiz: Network Fundamentals",
            type: "reading",
            durationMin: 10,
            content: "Verify your networking basics.",
            quiz: {
              title: "Network Fundamentals",
              questions: [
                {
                  text: "Which OSI layer is responsible for routing between networks?",
                  options: ["Layer 2", "Layer 3", "Layer 4", "Layer 7"],
                  answerIndex: 1,
                  explanation: "Layer 3 (Network) handles logical addressing and routing (IP).",
                },
                {
                  text: "How many usable host addresses are in a /28 subnet?",
                  options: ["16", "14", "30", "62"],
                  answerIndex: 1,
                  explanation: "2^(32-28) - 2 = 16 - 2 = 14 usable hosts.",
                },
                {
                  text: "Which protocol is connectionless and at Layer 4?",
                  options: ["TCP", "UDP", "ICMP", "ARP"],
                  answerIndex: 1,
                  explanation: "UDP is connectionless; TCP is connection-oriented.",
                },
              ],
            },
          },
        ],
      },
      {
        title: "Module 02 — IP Connectivity (Routing)",
        lessons: [
          {
            title: "Static & Dynamic Routing",
            type: "reading",
            durationMin: 35,
            content:
              "# Routing\n\n## Static Routing\nManually configured. Best for small, stable networks.\n```\nRouter(config)# ip route 10.0.0.0 255.0.0.0 192.168.1.1\n```\n\n## Dynamic Routing Protocols\n- **RIP** — distance vector, max 15 hops\n- **OSPF** — link-state, SPF algorithm, fast convergence\n- **EIGRP** — Cisco proprietary, hybrid\n- **BGP** — internet routing, path vector\n\n## Administrative Distance (lower = trusted)\n- Directly connected: 0\n- Static: 1\n- EIGRP: 90\n- OSPF: 110\n- RIP: 120",
          },
          {
            title: "Cisco IOS Basics & CLI",
            type: "pdf",
            pdfPages: 20,
            durationMin: 30,
            content: "Navigate Cisco IOS: user EXEC, privileged EXEC, global config modes. Configure interfaces, hostname, passwords.",
          },
        ],
      },
      {
        title: "Module 03 — Switching & VLANs",
        lessons: [
          {
            title: "VLANs & Trunking (802.1Q)",
            type: "reading",
            durationMin: 32,
            content:
              "# VLANs\n\nVLANs segment broadcast domains at Layer 2.\n\n## Configure\n```\nSwitch(config)# vlan 10\nSwitch(config-vlan)# name SALES\nSwitch(config)# interface fa0/1\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10\n```\n\n## Trunk (carries multiple VLANs)\n```\nSwitch(config-if)# switchport mode trunk\nSwitch(config-if)# switchport trunk allowed vlan 10,20,30\n```\n\n## DTP (Dynamic Trunking Protocol)\nNegotiation modes: `dynamic desirable`, `dynamic auto`, `trunk`, `access`.",
          },
          {
            title: "STP — Spanning Tree Protocol",
            type: "pdf",
            pdfPages: 14,
            durationMin: 25,
            content: "Prevent switching loops. Understand BPDUs, root bridge election, port states, and RSTP improvements.",
          },
        ],
      },
      {
        title: "Module 04 — Security & Automation Fundamentals",
        lessons: [
          {
            title: "Network Security Basics",
            type: "reading",
            durationMin: 28,
            content:
              "# Network Security\n\n## ACLs (Access Control Lists)\nFilter traffic at Layer 3/4.\n```\nRouter(config)# access-list 101 permit tcp any host 10.0.0.1 eq 443\nRouter(config)# interface fa0/0\nRouter(config-if)# ip access-group 101 in\n```\n\n## Port Security\n```\nSwitch(config-if)# switchport port-security\nSwitch(config-if)# switchport port-security maximum 2\nSwitch(config-if)# switchport port-security violation restrict\n```\n\n## AAA\nAuthentication, Authorization, Accounting — via TACACS+ or RADIUS.",
          },
          {
            title: "Network Automation & REST APIs",
            type: "pdf",
            pdfPages: 16,
            durationMin: 30,
            content: "Intro to NETCONF, RESTCONF, YANG models, and Python network automation with Netmiko/NAPALM.",
          },
        ],
      },
    ],
  })

  // ============ CCNP ============
  await buildCourse({
    slug: "ccnp-enterprise",
    title: "CCNP Enterprise — Advanced Routing & Switching",
    shortName: "CCNP",
    description: "Advance to enterprise-grade networking: ENCOR & ENSDNI deep dives.",
    longDescription:
      "CCNP Enterprise validates advanced knowledge of enterprise networking: dual IPv4/IPv6, virtualization, infrastructure, network assurance, security, and automation. Includes the ENCOR core exam plus a concentration.",
    category: "Networking",
    level: "Advanced",
    durationHours: 60,
    price: 249,
    rating: 4.7,
    studentsCount: 9120,
    color: "teal",
    tags: "networking,enterprise,ospf,bgp,vpn,sdn",
    certBody: "Cisco",
    instructorId: instructor2.id,
    modules: [
      {
        title: "Module 01 — Advanced OSPF & BGP",
        lessons: [
          {
            title: "OSPF Multi-Area Design",
            type: "reading",
            durationMin: 40,
            content:
              "# OSPF Areas\n\n- **Area 0 (Backbone)** — all areas must connect here\n- **Stub Area** — no external LSAs, default route injected\n- **NSSA** — allows limited external LSAs (type 7)\n- **Totally Stubby** — only default route\n\n## LSA Types\n1. Router LSA\n2. Network LSA\n3. Network Summary LSA (ABR)\n4. ASBR Summary LSA (ABR)\n5. AS External LSA (ASBR)\n7. NSSA External LSA",
          },
          {
            title: "BGP for Enterprises",
            type: "pdf",
            pdfPages: 28,
            durationMin: 45,
            content: "eBGP/iBGP, path attributes (AS_PATH, LOCAL_PREF, MED, weight), route reflectors, MP-BGP for IPv6.",
          },
        ],
      },
      {
        title: "Module 02 — SD-WAN & Network Virtualization",
        lessons: [
          {
            title: "Cisco SD-WAN Architecture",
            type: "reading",
            durationMin: 35,
            content:
              "# SD-WAN\n\nSeparates **data plane** (vEdge routers) from **control plane** (vSmart controllers) and **management plane** (vManage).\n\n## Key Benefits\n- Transport independence (MPLS, Internet, LTE)\n- Application-aware routing\n- Zero-touch provisioning\n- End-to-end segmentation (VPN/labels)\n\n## OMP (Overlay Management Protocol)\nExchanges routes/TLOCs between vSmart and vEdge.",
          },
          {
            title: "SD-Access & Cisco DNA Center",
            type: "pdf",
            pdfPages: 18,
            durationMin: 30,
            content: "Campus fabric: edge, border, control-plane nodes. LISP + VXLAN underlay. DNA Center automation.",
          },
        ],
      },
    ],
  })

  // ============ RHCSA ============
  await buildCourse({
    slug: "rhcsa",
    title: "Red Hat Certified System Administrator",
    shortName: "RHCSA",
    description: "Administer Red Hat Enterprise Linux: users, storage, services, SELinux.",
    longDescription:
      "RHCSA (EX200) is the entry-level Red Hat certification covering essential Linux administration: understand and use essential tools, operate running systems, configure local storage, create filesystems, deploy/configure systems, manage users/groups, and manage SELinux.",
    category: "System Administration",
    level: "Beginner",
    durationHours: 30,
    price: 129,
    rating: 4.8,
    studentsCount: 15630,
    color: "red",
    tags: "linux,redhat,rhel,system-administration,selinux",
    certBody: "Red Hat",
    instructorId: instructor.id,
    modules: [
      {
        title: "Module 01 — Linux Essentials & the Shell",
        lessons: [
          {
            title: "Command-Line Mastery",
            type: "reading",
            durationMin: 35,
            preview: true,
            content:
              "# Essential Commands\n\n## File Operations\n```bash\nls -la          # list all with details\ncp -r src dst   # recursive copy\nmv old new      # move/rename\nrm -rf dir/     # force recursive delete\nfind / -name '*.conf' -type f\ntar czf backup.tar.gz /etc\n```\n\n## Text Processing\n```bash\ngrep -rni 'password' /etc\nsed -i 's/foo/bar/g' file.txt\nawk '{print $1}' access.log\nsort | uniq -c | sort -rn   # top items\n```\n\n## Permissions\n```\nchmod 755 script.sh\nchown user:group file\numask 022\nsetfacl -m u:alice:rwx file  # ACLs\n```",
          },
          {
            title: "Users, Groups & sudo",
            type: "reading",
            durationMin: 30,
            content:
              "# User Management\n\n```bash\nuseradd -m -s /bin/bash alice\npasswd alice\nusermod -aG wheel alice   # add to sudo group\nuserdel -r alice\n```\n\n## /etc/sudoers\nUse `visudo` to edit safely.\n```\nalice ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx\n```\n\n## Password Policies\n`/etc/login.defs` controls defaults (PASS_MIN_DAYS, PASS_MAX_DAYS).",
          },
        ],
      },
      {
        title: "Module 02 — Storage & Filesystems",
        lessons: [
          {
            title: "Partitioning, LVM & Filesystems",
            type: "reading",
            durationMin: 40,
            content:
              "# LVM (Logical Volume Manager)\n\n```\nPV -> VG -> LV -> filesystem\n```\n\n## Commands\n```bash\npvcreate /dev/sdb\nvgcreate vg_data /dev/sdb\nlvcreate -L 10G -n lv_data vg_data\nmkfs.xfs /dev/vg_data/lv_data\nmkdir /data\nmount /dev/vg_data/lv_data /data\n```\n\n## Persistent mount in /etc/fstab\n```\n/dev/vg_data/lv_data  /data  xfs  defaults  0 0\n```\n\n## Grow a volume\n```bash\nlvextend -L +5G /dev/vg_data/lv_data\nxfs_growfs /data   # xfs\nresize2fs /dev/vg_data/lv_data  # ext4\n```",
          },
          {
            title: "SELinux Fundamentals",
            type: "pdf",
            pdfPages: 22,
            durationMin: 35,
            content: "Mandatory Access Control. Modes (enforcing/permissive/disabled), contexts, booleans, audit logs.",
          },
        ],
      },
      {
        title: "Module 03 — Services, Networking & Boot",
        lessons: [
          {
            title: "systemd & Service Management",
            type: "reading",
            durationMin: 30,
            content:
              "# systemd\n\n```bash\nsystemctl status nginx\nsystemctl enable --now httpd\nsystemctl mask firewalld\njournalctl -u sshd -f   # follow logs\n```\n\n## Targets (runlevels)\n- `graphical.target` (runlevel 5)\n- `multi-user.target` (runlevel 3)\n\n```bash\nsystemctl set-default multi-user.target\n```\n\n## Timers (replace cron)\n```bash\nsystemctl list-timers\n```",
          },
          {
            title: "Quiz: RHCSA Essentials",
            type: "reading",
            durationMin: 10,
            content: "Quick check on RHEL admin basics.",
            quiz: {
              title: "RHCSA Essentials",
              questions: [
                {
                  text: "Which command grows an XFS filesystem after extending the LV?",
                  options: ["resize2fs", "xfs_growfs", "lvextend --fs", "fsck"],
                  answerIndex: 1,
                  explanation: "xfs_growfs grows XFS. resize2fs is for ext4.",
                },
                {
                  text: "What is the correct order of LVM layers?",
                  options: ["LV → VG → PV", "PV → VG → LV", "VG → PV → LV", "PV → LV → VG"],
                  answerIndex: 1,
                  explanation: "Physical Volume → Volume Group → Logical Volume.",
                },
                {
                  text: "Which tool safely edits /etc/sudoers?",
                  options: ["vim", "visudo", "sudoedit", "nano"],
                  answerIndex: 1,
                  explanation: "visudo validates syntax before saving.",
                },
              ],
            },
          },
        ],
      },
    ],
  })

  // ============ WAPT ============
  await buildCourse({
    slug: "wapt",
    title: "Web Application Penetration Testing",
    shortName: "WAPT",
    description: "Hack and secure modern web apps: OWASP Top 10, Burp Suite, and real exploits.",
    longDescription:
      "Master web application penetration testing end-to-end. Covers the OWASP Top 10, Burp Suite mastery, authentication attacks, SQL injection, XSS, SSRF, file upload vulnerabilities, business logic flaws, and API security (REST/GraphQL).",
    category: "Web Security",
    level: "Intermediate",
    durationHours: 45,
    price: 179,
    rating: 4.9,
    studentsCount: 18750,
    color: "violet",
    tags: "web-security,owasp,burp,sqli,xss,api-security",
    certBody: "GuardianX",
    instructorId: instructor.id,
    modules: [
      {
        title: "Module 01 — OWASP Top 10 Deep Dive",
        lessons: [
          {
            title: "Injection Attacks (SQLi, NoSQLi, Command)",
            type: "reading",
            durationMin: 40,
            preview: true,
            content:
              "# SQL Injection\n\nUntrusted input concatenated into SQL queries.\n\n## Classic Example\n```sql\nSELECT * FROM users WHERE username='$user' AND password='$pass'\n```\nPayload: `admin' OR '1'='1' --`\n\n## UNION-based\n```sql\n' UNION SELECT username,password FROM users --\n```\n\n## Blind (Boolean)\n`' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a' --`\n\n## Tools\n- **sqlmap**: `sqlmap -u 'http://target/item?id=1' --batch --dbs`\n\n## Prevention\n- **Parameterized queries / prepared statements**\n- ORM with parameter binding\n- Input validation + output encoding",
          },
          {
            title: "Cross-Site Scripting (XSS)",
            type: "reading",
            durationMin: 35,
            content:
              "# XSS\n\nInject JavaScript executed in victim's browser.\n\n## Types\n- **Reflected** — payload in URL, executed immediately\n- **Stored** — payload stored in DB (comment), hits every viewer\n- **DOM-based** — client-side JS sinks (`innerHTML`, `eval`)\n\n## Payloads\n```html\n<script>alert(document.cookie)</script>\n<img src=x onerror=alert(1)>\n<svg onload=alert(1)>\n```\n\n## Filter Bypasses\n- `<scr<script>ipt>`\n- Case: `<ScRiPt>`\n- Encoding: `&#60;script&#62;`\n\n## Prevention\n- **Context-aware output encoding**\n- **CSP (Content-Security-Policy)** header\n- `HttpOnly` cookies\n- Frameworks (React) auto-escape",
          },
          {
            title: "Quiz: OWASP Top 10",
            type: "reading",
            durationMin: 10,
            content: "Test your OWASP knowledge.",
            quiz: {
              title: "OWASP Top 10",
              questions: [
                {
                  text: "Which is the BEST defense against SQL injection?",
                  options: ["Blacklisting keywords", "Parameterized queries", "WAF only", "Hiding error messages"],
                  answerIndex: 1,
                  explanation: "Parameterized/prepared statements separate code from data.",
                },
                {
                  text: "An XSS payload stored in a comment field that affects all viewers is:",
                  options: ["Reflected XSS", "Stored XSS", "DOM XSS", "CSRF"],
                  answerIndex: 1,
                  explanation: "Stored XSS persists server-side and hits every viewer.",
                },
                {
                  text: "Which HTTP header helps mitigate XSS by restricting script sources?",
                  options: ["X-Frame-Options", "Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options"],
                  answerIndex: 1,
                  explanation: "CSP restricts which scripts may execute.",
                },
              ],
            },
          },
        ],
      },
      {
        title: "Module 02 — Burp Suite Mastery",
        lessons: [
          {
            title: "Proxy, Repeater & Intruder",
            type: "pdf",
            pdfPages: 26,
            durationMin: 40,
            content: "Configure the Burp proxy, intercept requests, send to Repeater for manual testing, and run Intruder for fuzzing/brute-force.",
          },
          {
            title: "Authentication & Session Attacks",
            type: "reading",
            durationMin: 32,
            content:
              "# Auth Attacks\n\n- **Brute force / credential stuffing** — use wordlists (SecLists)\n- **JWT attacks** — `alg:none`, weak HMAC secret, kid injection\n- **Session fixation** — force a known session ID\n- **OAuth misconfig** — redirect_uri validation flaws\n\n## Password Policies\n- Rate limiting\n- Lockout (beware user enumeration)\n- MFA/2FA\n- Breached password checks (HaveIBeenPwned API)",
          },
        ],
      },
      {
        title: "Module 03 — Advanced Web Attacks",
        lessons: [
          {
            title: "SSRF, XXE & File Upload",
            type: "reading",
            durationMin: 38,
            content:
              "# SSRF (Server-Side Request Forgery)\nForce server to make requests to internal resources.\n```\nhttp://app.com/fetch?url=http://169.254.169.254/latest/meta-data/\n```\nCloud metadata = IAM creds leak.\n\n# XXE (XML External Entity)\n```xml\n<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>\n<data>&xxe;</data>\n```\n\n# File Upload\n- Upload `.php` webshell disguised as image\n- Bypass via double extension, magic bytes, `.phtml`\n- Path traversal in filename: `../../var/www/shell.php`\n\n## Defenses\n- Allowlist file types, verify magic bytes, store outside webroot, randomize names.",
          },
          {
            title: "API Security (REST & GraphQL)",
            type: "pdf",
            pdfPages: 20,
            durationMin: 35,
            content: "OWASP API Top 10: BOLA, broken auth, mass assignment, rate limiting, GraphQL introspection & batching attacks.",
          },
        ],
      },
    ],
  })

  // ============ CISSP ============
  await buildCourse({
    slug: "cissp",
    title: "Certified Information Systems Security Professional",
    shortName: "CISSP",
    description: "The gold standard for security leadership — 8 domains of the CBK.",
    longDescription:
      "CISSP validates deep technical and managerial competence to design, engineer, and manage an organization's overall security posture. Covers 8 domains of the Common Body of Knowledge (CBK): Security & Risk Management, Asset Security, Security Architecture, Communication Security, Identity & Access, Security Assessment, Security Operations, Software Development Security.",
    category: "Security Management",
    level: "Advanced",
    durationHours: 80,
    price: 299,
    rating: 4.8,
    studentsCount: 21040,
    color: "amber",
    tags: "management,governance,risk,architecture,iam,operations",
    certBody: "ISC2",
    instructorId: instructor.id,
    modules: [
      {
        title: "Domain 1 — Security & Risk Management",
        lessons: [
          {
            title: "Confidentiality, Integrity & Availability (CIA)",
            type: "reading",
            durationMin: 30,
            preview: true,
            content:
              "# CIA Triad (CISSP depth)\n\n## Confidentiality\n- Encryption, access controls, data classification\n- Counter: TLS, RBAC, DLP\n\n## Integrity\n- Hashing, digital signatures, version control\n- Counter: SHA-256, HMAC, checksums\n\n## Availability\n- Redundancy, backups, failover, DoS protection\n- Counter: HA clusters, RAID, CDN, rate limiting\n\n## Other Principles\n- **DAD** — Disclosure, Alteration, Destruction (opposite of CIA)\n- **AAA** — Authentication, Authorization, Accounting\n- **Non-repudiation** — proof of origin (digital signatures)",
          },
          {
            title: "Risk Management & Frameworks",
            type: "reading",
            durationMin: 40,
            content:
              "# Risk Management\n\nRisk = Threat × Vulnerability × Asset Value\n\n## Risk Responses\n- **Mitigate** — reduce likelihood/impact\n- **Transfer** — insurance, outsourced\n- **Accept** — consciously accept residual risk\n- **Avoid** — stop the activity\n\n## Frameworks\n- **NIST RMF** — Categorize → Select → Implement → Assess → Authorize → Monitor\n- **ISO 27001/27005** — ISMS + risk management\n- **COBIT** — IT governance\n- **ITIL** — IT service management\n\n## BCP/DRP\n- **RTO** (Recovery Time Objective)\n- **RPO** (Recovery Point Objective)\n- **MTD** (Maximum Tolerable Downtime)",
          },
          {
            title: "Quiz: Risk Management",
            type: "reading",
            durationMin: 10,
            content: "Test risk & governance knowledge.",
            quiz: {
              title: "Risk Management",
              questions: [
                {
                  text: "Buying cyber-insurance is an example of which risk response?",
                  options: ["Mitigate", "Transfer", "Accept", "Avoid"],
                  answerIndex: 1,
                  explanation: "Insurance transfers the financial risk to a third party.",
                },
                {
                  text: "Which metric defines maximum acceptable data loss measured in time?",
                  options: ["RTO", "RPO", "MTD", "MTBF"],
                  answerIndex: 1,
                  explanation: "RPO = Recovery Point Objective, max tolerable data loss.",
                },
                {
                  text: "Which framework defines the Categorize→Select→Implement→Assess→Authorize→Monitor cycle?",
                  options: ["ISO 27001", "NIST RMF", "COBIT", "ITIL"],
                  answerIndex: 1,
                  explanation: "NIST Risk Management Framework uses this 6-step cycle.",
                },
              ],
            },
          },
        ],
      },
      {
        title: "Domain 5 — Identity & Access Management (IAM)",
        lessons: [
          {
            title: "Authentication, Authorization & Accountability",
            type: "reading",
            durationMin: 35,
            content:
              "# IAM\n\n## Authentication Factors\n1. **Something you know** — password, PIN\n2. **Something you have** — token, smart card\n3. **Something you are** — biometric\n4. **Somewhere you are** — location\n5. **Something you do** — behavior\n\n## Access Control Models\n- **MAC** — Mandatory (labels, clearance) — military\n- **DAC** — Discretionary (owner decides) — file ACLs\n- **RBAC** — Role-Based\n- **ABAC** — Attribute-Based (most flexible)\n\n## SSO Protocols\n- **SAML** — XML-based, enterprise SSO\n- **OAuth 2.0** — authorization delegation\n- **OIDC** — identity layer on OAuth2\n- **Kerberos** — ticket-based, AD",
          },
          {
            title: "Federation & Privileged Access",
            type: "pdf",
            pdfPages: 24,
            durationMin: 38,
            content: "Federated identity, SAML trust relationships, PAM vaulting, just-in-time access, session recording.",
          },
        ],
      },
    ],
  })

  // ============ CyberArk IAM & PAM ============
  await buildCourse({
    slug: "cyberark-iam-pam",
    title: "CyberArk IAM & Privileged Access Management",
    shortName: "CYBERARK",
    description: "Implement CyberArk PAM: vaulting, EPV, PSMP, session recording, and just-in-time access.",
    longDescription:
      "Learn CyberArk's Privileged Access Management suite end-to-end. Covers Enterprise Password Vault (EPV), Central Policy Manager (CPM), Password Vault Web Access (PVWA), Privileged Session Manager (PSM), and PSMP for SSH. Includes onboarding accounts, safe design, dual control, and threat detection.",
    category: "Identity & Access",
    level: "Advanced",
    durationHours: 35,
    price: 219,
    rating: 4.6,
    studentsCount: 6430,
    color: "orange",
    tags: "pam,iam,secrets-management,vaulting,privileged-access,cyberark",
    certBody: "CyberArk",
    instructorId: instructor.id,
    modules: [
      {
        title: "Module 01 — PAM Foundations",
        lessons: [
          {
            title: "Why Privileged Access Management?",
            type: "reading",
            durationMin: 28,
            preview: true,
            content:
              "# The PAM Problem\n\nPrivileged accounts (root, admin, service accounts) are the **#1 target** for attackers.\n\n## Risks Without PAM\n- Shared, never-rotated passwords\n- No audit trail of who did what\n- Standing privileges (always-on admin)\n- Hardcoded credentials in scripts/CI\n\n## PAM Pillars (CyberArk)\n1. **Vault** — encrypted secrets store\n2. **Credential rotation** — CPM auto-rotates\n3. **Session isolation** — PSM/PSMP brokers sessions\n4. **Just-in-time access** — temporary elevation\n5. **Threat detection** — anomalous behavior alerts\n6. **Secrets management** — Conjur for apps/CI",
          },
          {
            title: "CyberArk Architecture",
            type: "reading",
            durationMin: 32,
            content:
              "# Components\n\n- **EPV (Enterprise Password Vault)** — the secure vault (hardened Windows server)\n- **CPM (Central Policy Manager)** — rotates passwords on schedule/on-checkout\n- **PVWA (Password Vault Web Access)** — web UI\n- **PSM (Privileged Session Manager)** — RDP/SSH brokering + recording\n- **PSMP (PSM for SSH)** — native SSH, no jump host friction\n- **PTA (Privileged Threat Analytics)** — anomaly detection\n\n## Safe Model\nA **Safe** is a logical container. Access via **Safe permissions** (use, retrieve, admin, audit).\n\n## Dual Control\nRequire two people to approve sensitive password retrieval.",
          },
        ],
      },
      {
        title: "Module 02 — Vaulting & Password Rotation",
        lessons: [
          {
            title: "Onboarding Accounts & Safe Design",
            type: "pdf",
            pdfPages: 22,
            durationMin: 35,
            content: "Design safes by risk tier, onboard Windows/Linux/cloud accounts, configure CPM platforms and reconcile rules.",
          },
          {
            title: "Quiz: CyberArk PAM",
            type: "reading",
            durationMin: 10,
            content: "Test your PAM knowledge.",
            quiz: {
              title: "CyberArk PAM",
              questions: [
                {
                  text: "Which CyberArk component auto-rotates privileged credentials?",
                  options: ["EPV", "CPM", "PSM", "PVWA"],
                  answerIndex: 1,
                  explanation: "Central Policy Manager (CPM) rotates passwords per policy.",
                },
                {
                  text: "Which component brokers SSH sessions without a jump-host friction?",
                  options: ["PSM", "PSMP", "PTA", "CPM"],
                  answerIndex: 1,
                  explanation: "PSM for SSH (PSMP) provides native SSH proxying.",
                },
                {
                  text: "Requiring two approvers to retrieve a password is called:",
                  options: ["MFA", "Dual control", "Rotation", "Reconciliation"],
                  answerIndex: 1,
                  explanation: "Dual control requires two authorized users.",
                },
              ],
            },
          },
        ],
      },
      {
        title: "Module 03 — Session Brokering & Threat Detection",
        lessons: [
          {
            title: "PSM Session Recording & Just-in-Time",
            type: "reading",
            durationMin: 34,
            content:
              "# Session Isolation\n\nPSM/PSMP broker the connection:\n- User authenticates to PVWA → PSM connects to target as the privileged account\n- **Keystroke logging + video recording** of session\n- **Command filtering** — block dangerous commands\n\n## Just-in-Time (JIT)\n- Grant access for a **time-boxed window**\n- Auto-revoke after expiry\n- Reduces standing privilege\n\n## Threat Analytics (PTA)\n- ML-based anomaly detection\n- Flags: unusual time, geo, commands, data exfil",
          },
        ],
      },
    ],
  })

  // ============ LABS ============
  const labs = [
    {
      title: "SQLi Lab — Login Bypass",
      slug: "sqli-login-bypass",
      category: "Web Security",
      difficulty: "Easy",
      durationMin: 20,
      points: 100,
      description: "Bypass a vulnerable login form using classic SQL injection.",
      longDescription:
        "A poorly-coded login page concatenates user input directly into a SQL query. Your goal is to bypass authentication and retrieve the admin flag from the users table.",
      scenario:
        "## Mission Briefing\n\nTarget: `http://vulnlab.local/login`\n\nThe login endpoint runs:\n```sql\nSELECT * FROM users WHERE username='$user' AND password='$pass'\n```\n\nYour objective: log in as `admin` **without knowing the password**.",
      objectives: "Bypass login as admin|Find the FLAG in the users table",
      hints: "Try ' OR '1'='1' --|Use a UNION SELECT to read other columns|The flag column is named `flag`",
      flag: "FLAG{sql1_1nj3ct10n_m4st3r}",
      commands: "whoami|ls|cat|curl|sqlmap|help",
      color: "violet",
    },
    {
      title: "Nmap Recon Challenge",
      slug: "nmap-recon",
      category: "Network",
      difficulty: "Easy",
      durationMin: 25,
      points: 100,
      description: "Discover open ports and services on a target using Nmap.",
      longDescription:
        "You are given a single target IP. Use Nmap to enumerate all open ports, identify services and versions, then answer questions to find the flag.",
      scenario:
        "## Mission Briefing\n\nTarget: `10.10.10.5`\n\n1. Run a full TCP port scan\n2. Identify the service running on port 8080\n3. The flag is the service banner version string",
      objectives: "Scan all TCP ports|Identify service on 8080|Find the version flag",
      hints: "Use -sV for version detection|Use -p- for all ports|Use --script banner",
      flag: "FLAG{nmap_v3rs10n_d3t3ct}",
      commands: "nmap|whoami|help",
      color: "cyan",
    },
    {
      title: "Linux Privilege Escalation — SUID",
      slug: "linux-privesc-suid",
      category: "Privilege Escalation",
      difficulty: "Medium",
      durationMin: 35,
      points: 200,
      description: "Escalate from a low-privilege shell to root via a misconfigured SUID binary.",
      longDescription:
        "You have a shell as user `www-data`. Find a SUID binary that can be abused (per GTFOBins) to read the root flag.",
      scenario:
        "## Mission Briefing\n\nYou are `www-data` on a Linux box.\n\n1. Enumerate SUID binaries: `find / -perm -4000 2>/dev/null`\n2. Notice `/usr/bin/find` is SUID\n3. Abuse it to read `/root/flag.txt`",
      objectives: "Enumerate SUID binaries|Abuse /usr/bin/find|Read /root/flag.txt",
      hints: "Check GTFOBins for find|Command: find . -exec cat /root/flag.txt \\;|SUID = -rwsr-xr-x",
      flag: "FLAG{suid_f1nd_gtFOb1ns}",
      commands: "whoami|id|find|cat|ls|sudo|help",
      color: "emerald",
    },
    {
      title: "XSS Steal the Cookie",
      slug: "xss-cookie-steal",
      category: "Web Security",
      difficulty: "Medium",
      durationMin: 30,
      points: 200,
      description: "Craft a stored XSS payload to exfiltrate a victim's session cookie.",
      longDescription:
        "A comment field is vulnerable to stored XSS. Plant a payload that sends the admin's cookie to your collector and capture the flag (which is the cookie value).",
      scenario:
        "## Mission Briefing\n\nComment box at `http://vulnlab.local/comment` renders HTML unsanitized.\n\nInject a payload that exfiltrates `document.cookie` to your listener.",
      objectives: "Craft an XSS payload|Exfiltrate document.cookie|Capture the flag cookie",
      hints: "Use <img src=x onerror=...>|Fetch to your collector URL|The flag cookie name is 'session'",
      flag: "FLAG{xss_c00k13_th3ft}",
      commands: "whoami|curl|nc|help",
      color: "violet",
    },
    {
      title: "Hash Cracking — Identify & Crack",
      slug: "hash-crack",
      category: "Cryptography",
      difficulty: "Medium",
      durationMin: 30,
      points: 200,
      description: "Identify hash types and crack them with hashcat/john.",
      longDescription:
        "You intercepted a password dump. Identify the hash format, then crack it against a wordlist to reveal the flag.",
      scenario:
        "## Mission Briefing\n\nHash: `5f4dcc3b5aa765d61d8327deb882cf99`\n\n1. Identify the algorithm\n2. Crack against /usr/share/wordlists/rockyou.txt\n3. The plaintext is the flag",
      objectives: "Identify hash type|Crack with hashcat or john|Submit plaintext as flag",
      hints: "It's 32 hex chars = MD5|hashcat -m 0|john --wordlist=rockyou.txt",
      flag: "FLAG{password_cracked}",
      commands: "whoami|hashid|hashcat|john|help",
      color: "amber",
    },
    {
      title: "Buffer Overflow — Control EIP",
      slug: "buffer-overflow-eip",
      category: "Reverse Engineering",
      difficulty: "Hard",
      durationMin: 60,
      points: 400,
      description: "Exploit a classic stack buffer overflow to hijack execution.",
      longDescription:
        "A vulnerable Windows service crashes on long input. Find the offset to EIP, identify bad chars, and redirect execution to read the flag.",
      scenario:
        "## Mission Briefing\n\nTarget: `10.10.10.20:9999` (vulnserver)\n\n1. Send pattern to crash & find EIP offset\n2. Identify bad characters\n3. Jump to shellcode / read flag\n\nUse Immunity Debugger + Mona.",
      objectives: "Crash the service|Find EIP offset|Redirect execution|Read the flag",
      hints: "Use msf-pattern_create/offset|Check for \\x00 \\x0a|JMP ESP gadgets",
      flag: "FLAG{b0f_3ip_c0ntr0ll3d}",
      commands: "whoami|msf-pattern_create|nc|help",
      color: "red",
    },
    {
      title: "Active Directory — Kerberoasting",
      slug: "ad-kerberoasting",
      category: "Active Directory",
      difficulty: "Hard",
      durationMin: 45,
      points: 400,
      description: "Kerberoast a service account and crack its ticket offline.",
      longDescription:
        "With valid domain creds, request TGS tickets for SPN-enabled accounts, export them, and crack offline to escalate privileges.",
      scenario:
        "## Mission Briefing\n\nDomain: `CORP.LOCAL`, you have user `svc_web:P@ssw0rd`\n\n1. Enumerate SPN accounts: `GetUserSPNs.py`\n2. Request TGS tickets\n3. Crack with hashcat -m 13100\n4. The cracked password is wrapped: FLAG{<password>}",
      objectives: "Enumerate SPN accounts|Request TGS tickets|Crack offline|Submit flag",
      hints: "impacket-GetUserSPNs.py -request|hashcat -m 13100|Look for svc_sql account",
      flag: "FLAG{k3rb3r0ast_w1n}",
      commands: "whoami|impacket-GetUserSPNs|hashcat|help",
      color: "orange",
    },
    {
      title: "Network Forensics — PCAP Analysis",
      slug: "pcap-analysis",
      category: "Forensics",
      difficulty: "Medium",
      durationMin: 35,
      points: 250,
      description: "Analyze a packet capture to reconstruct stolen data exfiltration.",
      longDescription:
        "A PCAP file shows suspicious traffic. Identify the exfil channel, extract the hidden data, and decode the flag.",
      scenario:
        "## Mission Briefing\n\nFile: `capture.pcap`\n\n1. Open in Wireshark / tshark\n2. Filter HTTP POST requests\n3. The flag is base64-encoded in a custom header `X-D`",
      objectives: "Open the PCAP|Find HTTP POST traffic|Decode the X-D header|Submit the flag",
      hints: "tshark -r capture.pcap -Y http.request.method==POST|Look at X-D header|base64 -d",
      flag: "FLAG{pc4p_f0r3ns1cs}",
      commands: "whoami|tshark|tcpdump|base64|help",
      color: "cyan",
    },
  ]

  for (const lab of labs) {
    const existing = await db.lab.findUnique({ where: { slug: lab.slug } })
    if (!existing) {
      await db.lab.create({ data: lab })
    }
  }

  // ---- Enroll demo student in CEH + WAPT ----
  const ceh = await db.course.findUnique({ where: { slug: "ceh" } })
  const wapt = await db.course.findUnique({ where: { slug: "wapt" } })
  const ccna = await db.course.findUnique({ where: { slug: "ccna" } })
  if (ceh && wapt && ccna) {
    for (const c of [ceh, wapt, ccna]) {
      const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: student.id, courseId: c.id } } })
      if (!existing) {
        await db.enrollment.create({ data: { userId: student.id, courseId: c.id, progress: c.slug === "ceh" ? 35 : c.slug === "wapt" ? 12 : 60 } })
      }
    }
  }

  // ---- Seed some notes for the student ----
  if (ceh) {
    const nmapLesson = await db.lesson.findFirst({ where: { title: "Nmap Mastery" } })
    if (nmapLesson) {
      const existing = await db.note.findFirst({ where: { userId: student.id, lessonId: nmapLesson.id } })
      if (!existing) {
        await db.note.create({
          data: {
            userId: student.id,
            lessonId: nmapLesson.id,
            courseId: ceh.id,
            title: "Nmap quick reference",
            content: "-sS = SYN stealth\n-sV = version\n-A = aggressive (OS+version+scripts+traceroute)\n-p- = all 65535 ports\n--script vuln = run vuln scripts\n\nRemember to add -T4 for speed!",
            color: "emerald",
          },
        })
      }
    }
  }

  // ---- Seed a live session ----
  const existingSession = await db.liveSession.findFirst({ where: { title: "Live: CEH Nmap Workshop" } })
  if (!existingSession) {
    await db.liveSession.create({
      data: {
        title: "Live: CEH Nmap Workshop",
        description: "Hands-on Nmap scanning workshop. I'll share my screen and walk through a real recon engagement. Bring questions!",
        hostId: instructor.id,
        roomId: "ceh-nmap-workshop",
        status: "live",
        scheduledAt: new Date(),
        startedAt: new Date(),
        maxStudents: 50,
      },
    })
  }

  console.log("Seed complete!")
  console.log("Users: admin@guardianx.io/admin123, instructor@guardianx.io/instructor123, student@guardianx.io/student123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
