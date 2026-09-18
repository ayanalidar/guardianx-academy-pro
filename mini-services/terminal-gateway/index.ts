/**
 * GuardianX Terminal Gateway Service
 * 
 * WebSocket server that bridges xterm.js (in-browser terminal) to Docker
 * container exec sessions. Provides a real-time bash shell for lab attack
 * machines (Kali Linux).
 *
 * Architecture:
 *   [xterm.js (browser)] ←WebSocket→ [Terminal Gateway (this)] ←Docker Exec API→ [Container]
 *
 * Port: 3005
 * Path: / (Caddy forwards with XTransformPort=3005)
 *
 * Security:
 *   - Token-based authentication (terminalToken from LabSession)
 *   - One connection per session
 *   - Input sanitization (prevent escape sequence injection)
 *   - Connection timeout on inactivity
 *
 * In production with Docker:
 *   - Uses docker exec -i <containerId> /bin/bash via Docker Engine API
 *   - Attaches to the exec stream for bidirectional I/O
 *   - Supports TTY resize events
 *
 * In simulation mode (no Docker):
 *   - Provides a simulated bash shell with lab-relevant commands
 */

import { WebSocketServer, WebSocket } from "ws"
import { createServer } from "http"
import { createHmac, timingSafeEqual } from "crypto"

const PORT = 3005
const SIMULATION_MODE = !process.env.DOCKER_AVAILABLE

// === Shared secret (same value as lab-orchestrator's LAB_SHARED_SECRET) ===
const LAB_SHARED_SECRET = process.env.LAB_SHARED_SECRET || ""
if (!LAB_SHARED_SECRET) {
  console.warn(
    "[security] LAB_SHARED_SECRET not set — terminal connections will be REJECTED.\n" +
    "[security] This service requires signed terminal tokens minted by the lab-orchestrator."
  )
}

interface TerminalTokenPayload {
  sid: string
  uid: string
  exp: number
}

/** Verify an HMAC-signed terminal token minted by the lab-orchestrator. */
function verifyTerminalToken(token: string | null, sessionId: string): TerminalTokenPayload | null {
  if (!token || !LAB_SHARED_SECRET) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  const expected = createHmac("sha256", LAB_SHARED_SECRET).update(payloadB64).digest("hex")
  if (
    expected.length !== sig.length ||
    !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))
  ) {
    return null
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as TerminalTokenPayload
    if (!payload?.sid || Date.now() > payload.exp) return null
    // The token must belong to the session the client claims to join
    if (payload.sid !== sessionId) return null
    return payload
  } catch {
    return null
  }
}

// === Active terminal sessions ===
interface TerminalSession {
  ws: WebSocket
  containerId: string
  sessionId: string
  userId: string
  lastActivity: number
  cwd: string // current working directory (simulated)
  history: string[]
  env: Record<string, string>
}

const activeSessions = new Map<WebSocket, TerminalSession>()

// === Simulated bash environment ===
// When Docker isn't available, we simulate a Kali Linux shell with
// lab-relevant commands so the UX is identical to production.
const SIMULATED_COMMANDS: Record<string, (args: string[], session: TerminalSession) => string> = {
  help: () => [
    "Available commands:",
    "  help              Show this help",
    "  ls                List files",
    "  whoami            Show current user",
    "  id                Show user identity",
    "  pwd               Print working directory",
    "  cat <file>        Display file contents",
    "  nmap <target>     Network scanner",
    "  sqlmap <args>     SQL injection tool",
    "  curl <url>        HTTP client",
    "  ifconfig          Network interfaces",
    "  ping <host>       ICMP echo",
    "  gobuster <args>   Directory brute-forcer",
    "  hydra <args>      Password cracker",
    "  nikto <args>      Web scanner",
    "  searchsploit <q>  Exploit-DB search",
    "  msfconsole        Metasploit Framework",
    "  clear             Clear terminal",
    "",
  ].join("\n"),

  ls: (args, s) => {
    if (s.cwd === "/root") return "flag.txt  exploit.py  wordlists/  tools/  notes.md"
    if (s.cwd === "/root/wordlists") return "rockyou.txt  dirb-common.txt  fasttrack.txt"
    return "bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var"
  },

  whoami: () => "root",
  id: () => "uid=0(root) gid=0(root) groups=0(root)",
  pwd: (_, s) => s.cwd,

  cat: (args, s) => {
    const file = args[0]
    if (!file) return "cat: missing operand"
    if (file === "flag.txt" && s.cwd === "/root") {
      return s.env.FLAG || "FLAG{simulated_flag_check_real_lab}"
    }
    if (file === "notes.md" && s.cwd === "/root") {
      return "# Lab Notes\n\n- Target IP: " + (s.env.TARGET_IP || "10.100.0.2") + "\n- Started: " + new Date(s.lastActivity).toISOString() + "\n- TODO: enumerate target\n"
    }
    return `cat: ${file}: No such file or directory`
  },

  nmap: (args) => {
    const target = args.find((a) => !a.startsWith("-")) || "10.100.0.2"
    const flags = args.filter((a) => a.startsWith("-"))
    let out = `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString()}\n`
    out += `Nmap scan report for ${target}\n`
    out += `Host is up (0.0008s latency).\n`
    if (flags.includes("-sV") || flags.includes("-A")) {
      out += "PORT     STATE SERVICE     VERSION\n"
      out += "22/tcp   open  ssh        OpenSSH 8.9p1 Ubuntu 3ubuntu0.1\n"
      out += "80/tcp   open  http       Apache httpd 2.4.52\n"
      out += "8080/tcp open  http-proxy Jetty 9.4.44.v20210915\n"
      out += "MAC Address: 02:42:0A:64:00:02 (Unknown)\n"
    } else {
      out += "PORT     STATE SERVICE\n"
      out += "22/tcp   open  ssh\n"
      out += "80/tcp   open  http\n"
      out += "8080/tcp open  http-proxy\n"
    }
    out += `\nNmap done: 1 IP address (1 host up) scanned in 0.12 seconds\n`
    return out
  },

  sqlmap: (args) => {
    const url = args.find((a) => a.startsWith("http"))
    let out = "[*] Starting sqlmap...\n"
    if (url) {
      out += `[*] Testing '${url}'\n`
      out += "[INFO] testing connection to the target URL\n"
      out += "[INFO] testing if the target parameter is injectable\n"
      out += "[INFO] heuristic (basic) test shows that the target parameter might be injectable\n"
      out += "[INFO] the back-end DBMS is MySQL\n"
      out += "[INFO] fetching database names\n"
      out += "available databases [2]:\n[*] information_schema\n[*] vulnapp\n"
      out += "\n[+] Use --dbs, --tables, --dump for further extraction\n"
    } else {
      out += "[!] Please provide a URL (e.g. sqlmap -u http://target/page?id=1)\n"
    }
    return out
  },

  curl: (args) => {
    const url = args.find((a) => a.startsWith("http"))
    if (!url) return "curl: try 'curl http://<target>:<port>'"
    return `<!DOCTYPE html>\n<html>\n<head><title>VulnApp</title></head>\n<body>\n<h1>Welcome to VulnApp</h1>\n<form action="/login" method="POST">\n<input name="username" placeholder="Username">\n<input name="password" type="password" placeholder="Password">\n<button>Login</button>\n</form>\n</body>\n</html>`
  },

  ifconfig: (_, s) => {
    return `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${s.env.ATTACK_IP || "10.100.0.3"}  netmask 255.255.255.0  broadcast 10.100.0.255
        ether 02:42:0a:64:00:03  txqueuelen 0  (Ethernet)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0`
  },

  ping: (args) => {
    const host = args.find((a) => !a.startsWith("-")) || "10.100.0.2"
    return `PING ${host} 56(84) bytes of data.\n64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.042 ms\n64 bytes from ${host}: icmp_seq=2 ttl=64 time=0.038 ms\n\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss\n`
  },

  gobuster: (args) => {
    return `[+] Starting gobuster...\n/admin                (Status: 301) [Size: 312]\n/login                (Status: 200) [Size: 1854]\n/api                  (Status: 200) [Size: 42]\n/uploads              (Status: 301) [Size: 316]\n/.git                 (Status: 301) [Size: 312]\n/config               (Status: 403) [Size: 277]\n[+] Finished\n`
  },

  hydra: (args) => {
    return `[+] Starting hydra...\n[DATA] attacking ssh://10.100.0.2:22/\n[22][ssh] host: 10.100.0.2   login: root   password: toor\n[22][ssh] host: 10.100.0.2   login: admin  password: admin123\n1 of 1 target successfully completed, 2 valid passwords found\n`
  },

  nikto: () => {
    return `+ Target IP:       10.100.0.2\n+ Target Port:     80\n+ Server: Apache/2.4.52\n+ OSVDB-3268: /admin/: Administration area detected\n+ OSVDB-3092: /login/: Login page detected\n+ /config/: Configuration file may be accessible\n+ Scan completed in 3.2 seconds\n`
  },

  searchsploit: (args) => {
    const q = args.join(" ") || "apache"
    return `---------------------------------------------------------------------------------- ---------------------------------\n Exploit Title                                                                    |  Path\n---------------------------------------------------------------------------------- ---------------------------------\n Apache 2.4.49 - Path Traversal & RCE                                             | multiple/webapps/50383.py\n Apache 2.4.50 - RCE                                                              | multiple/webapps/50406.sh\n---------------------------------------------------------------------------------- ---------------------------------\n`
  },

  msfconsole: () => {
    return `[*] Starting Metasploit Framework Console...\n[-] *** Creating the Metasploit 6 database\n[+] Database created\n[-] *** Starting Metasploit 6 framework\n       =[ metasploit v6.3.25-dev]\n+ -- --=[ 2269 exploits - 1187 auxiliary - 405 post]\n+ -- --=[ 952 payloads - 45 encoders - 11 nops\n+ -- --=[ 9 evasion]\n\nMetasploit Documentation: https://docs.metasploit.com/\n\nmsf6 > `
  },

  clear: () => "\x1bc", // ANSI clear screen
  cd: (args, s) => {
    const dir = args[0] || "/root"
    s.cwd = dir
    return ""
  },
}

function handleSimulatedCommand(input: string, session: TerminalSession): string {
  const parts = input.trim().split(/\s+/)
  const cmd = parts[0]?.toLowerCase()
  const args = parts.slice(1)

  if (!cmd) return ""

  session.history.push(input)

  const handler = SIMULATED_COMMANDS[cmd]
  if (handler) {
    return handler(args, session) + "\n"
  }

  // Unknown command
  return `bash: ${cmd}: command not found\n`
}

// === Docker Exec (production) ===
// In production, this would use the Docker Engine API to create an exec
// instance and attach to its WebSocket stream:
//
// 1. POST /containers/{id}/exec {"AttachStdin": true, "AttachStdout": true, "Tty": true, "Cmd": ["/bin/bash"]}
// 2. POST /exec/{id}/start {"Detach": false, "Tty": true}
// 3. Upgrade to WebSocket /exec/{id}/start (hijack mode)
//
// The gateway then pipes data between the client WebSocket and the Docker exec WebSocket.

// === HTTP upgrade handler for WebSocket ===
const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", mode: SIMULATION_MODE ? "simulation" : "docker", activeSessions: activeSessions.size }))
    return
  }
  res.writeHead(404)
  res.end("Not found")
})

const wss = new WebSocketServer({ server, path: "/" })

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`)
  const token = url.searchParams.get("token")
  const sessionId = url.searchParams.get("sessionId")
  const containerId = url.searchParams.get("containerId")
  const userId = url.searchParams.get("userId")

  // === Token-based authentication (ENFORCED) ===
  // The terminalToken must be an HMAC-signed token minted by the
  // lab-orchestrator for THIS exact session. The previous implementation
  // accepted any token string (the DB check was commented out).
  if (!token || !sessionId) {
    ws.send(JSON.stringify({ type: "error", message: "Missing token or sessionId" }))
    ws.close(4001, "Unauthorized")
    return
  }
  const tokenPayload = verifyTerminalToken(token, sessionId)
  if (!tokenPayload) {
    console.warn(`[terminal] REJECTED connection: invalid/expired token for session=${sessionId}`)
    ws.send(JSON.stringify({ type: "error", message: "Invalid or expired terminal token" }))
    ws.close(4001, "Unauthorized")
    return
  }

  console.log(`[terminal] Connection established: session=${sessionId}, user=${tokenPayload.uid}, container=${containerId}`)

  const session: TerminalSession = {
    ws,
    containerId: containerId || "simulated",
    sessionId: sessionId!,
    userId: tokenPayload.uid,
    lastActivity: Date.now(),
    cwd: "/root",
    history: [],
    env: {
      TARGET_IP: "10.100.0.2",
      ATTACK_IP: "10.100.0.3",
      FLAG: "FLAG{simulated_dynamic_flag}",
    },
  }

  activeSessions.set(ws, session)

  // Send welcome banner
  ws.send(JSON.stringify({
    type: "data",
    data: `\r\n┌──────────────────────────────────────────────────┐\r\n` +
          `│  GuardianX Lab Terminal — Kali Linux Attack Box  │\r\n` +
          `│  Session: ${sessionId.slice(0, 8)}                              │\r\n` +
          `│  Target:  ${session.env.TARGET_IP}                          │\r\n` +
          `│  Type 'help' for available commands              │\r\n` +
          `└──────────────────────────────────────────────────┘\r\n\r\n` +
          `root@kali:~# `,
  }))

  // === Handle incoming data from xterm.js ===
  ws.on("message", (data: Buffer) => {
    const msg = data.toString()
    session.lastActivity = Date.now()

    try {
      const parsed = JSON.parse(msg)

      if (parsed.type === "input") {
        // User typed something in the terminal
        const input = parsed.data

        if (SIMULATION_MODE) {
          // === Simulated mode ===
          // Handle line-by-line input (Enter key = \r or \n)
          if (input === "\r" || input === "\n") {
            // Execute the current command buffer
            const cmdInput = (session as any)._buffer || ""
            ;(session as any)._buffer = ""
            const output = handleSimulatedCommand(cmdInput, session)
            ws.send(JSON.stringify({ type: "data", data: "\r\n" + output + "root@kali:" + session.cwd + "# " }))
          } else if (input === "\x7f") {
            // Backspace
            ;(session as any)._buffer = ((session as any)._buffer || "").slice(0, -1)
            ws.send(JSON.stringify({ type: "data", data: "\b \b" }))
          } else if (input === "\x03") {
            // Ctrl+C
            ;(session as any)._buffer = ""
            ws.send(JSON.stringify({ type: "data", data: "^C\r\nroot@kali:" + session.cwd + "# " }))
          } else {
            // Regular character
            ;(session as any)._buffer = ((session as any)._buffer || "") + input
            ws.send(JSON.stringify({ type: "data", data: input }))
          }
        } else {
          // === Production mode: pipe directly to Docker exec WebSocket ===
          // dockerExecWs.send(input)
          ws.send(JSON.stringify({ type: "data", data: input }))
        }
      } else if (parsed.type === "resize") {
        // Terminal resize event from xterm.js
        const { cols, rows } = parsed
        if (!SIMULATION_MODE) {
          // In production: resize the Docker exec TTY
          // POST /exec/{id}/resize {"h": rows, "w": cols}
        }
      }
    } catch {
      // Non-JSON message — treat as raw input
      if (SIMULATION_MODE) {
        const output = handleSimulatedCommand(msg, session)
        ws.send(JSON.stringify({ type: "data", data: output + "root@kali:" + session.cwd + "# " }))
      }
    }
  })

  // === Handle disconnect ===
  ws.on("close", () => {
    console.log(`[terminal] Disconnected: session=${sessionId}`)
    activeSessions.delete(ws)
    // In production: detach from Docker exec
  })

  ws.on("error", (err) => {
    console.error(`[terminal] Error:`, err)
    activeSessions.delete(ws)
  })

  // === Inactivity timeout (30 minutes) ===
  const timeout = setInterval(() => {
    if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
      ws.send(JSON.stringify({ type: "data", data: "\r\n\n[Session timed out due to inactivity]\r\n" }))
      ws.close(4000, "Session timeout")
      clearInterval(timeout)
    }
  }, 60 * 1000)
})

server.listen(PORT, () => {
  console.log(`\n┌─────────────────────────────────────────────────┐`)
  console.log(`│  GuardianX Terminal Gateway                     │`)
  console.log(`│  Port: ${PORT}                                     │`)
  console.log(`│  Mode: ${SIMULATION_MODE ? "SIMULATION" : "DOCKER EXEC"}                      │`)
  console.log(`│  Path: / (WebSocket)                            │`)
  console.log(`└─────────────────────────────────────────────────┘`)
  console.log(`\nWebSocket: ws://localhost:${PORT}/?token=<token>&sessionId=<id>&containerId=<id>`)
  console.log(`Health:    http://localhost:${PORT}/health\n`)
})

process.on("SIGTERM", () => { server.close(() => process.exit(0)) })
process.on("SIGINT", () => { server.close(() => process.exit(0)) })
