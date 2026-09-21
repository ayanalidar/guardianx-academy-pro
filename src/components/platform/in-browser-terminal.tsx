"use client"

import * as React from "react"

// xterm.js must be loaded dynamically on the client (it uses `self` which is browser-only)
let XTerm: any = null
let FitAddon: any = null

async function loadXterm() {
  if (XTerm) return
  const xterm = await import("xterm")
  const fit = await import("xterm-addon-fit")
  // @ts-ignore
  await import("xterm/css/xterm.css")
  XTerm = xterm.Terminal
  FitAddon = fit.FitAddon
}

interface InBrowserTerminalProps {
  labSlug: string
  sessionData: {
    id: string
    targetIp: string | null
    attackIp: string | null
    terminalToken: string | null
    targetContainerId: string | null
    attackContainerId: string | null
  } | null
  onExit: () => void
}

/**
 * In-Browser Terminal - connects to the Terminal Gateway via WebSocket.
 * Uses xterm.js for a full-featured terminal experience.
 * 
 * WebSocket URL: /?XTransformPort=3005 (Caddy forwards to terminal-gateway on port 3005)
 * 
 * Protocol (JSON messages):
 *   Client → Server: { type: "input", data: "ls\r" }
 *   Client → Server: { type: "resize", cols: 80, rows: 24 }
 *   Server → Client: { type: "data", data: "output..." }
 *   Server → Client: { type: "error", message: "..." }
 */
export function InBrowserTerminal({ labSlug, sessionData, onExit }: InBrowserTerminalProps) {
  const termRef = React.useRef<HTMLDivElement>(null)
  const xtermRef = React.useRef<any>(null)
  const wsRef = React.useRef<WebSocket | null>(null)
  const fitRef = React.useRef<any>(null)
  const [connected, setConnected] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    loadXterm().then(() => setLoaded(true)).catch((e) => setError(`Failed to load xterm.js: ${e.message}`))
  }, [])

  React.useEffect(() => {
    if (!loaded || !sessionData?.terminalToken || !termRef.current) return

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: "#0a0f0d",
        foreground: "#e8f5ee",
        cursor: "#10b981",
        cursorAccent: "#0a0f0d",
        selection: "rgba(16, 185, 129, 0.2)",
        black: "#1a1a1a",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#06b6d4",
        magenta: "#8b5cf6",
        cyan: "#14b8a6",
        white: "#e8f5ee",
        brightBlack: "#4a4a4a",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#22d3ee",
        brightMagenta: "#a78bfa",
        brightCyan: "#2dd4bf",
        brightWhite: "#ffffff",
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitRef.current = fitAddon

    // Connect DIRECTLY to the terminal-gateway WebSocket service.
    // The old /?XTransformPort=3005 proxy path was removed from Caddy (SSRF
    // risk), so the gateway URL is now configurable via
    // NEXT_PUBLIC_TERMINAL_WS_URL (e.g. ws://lab.example.com:3005 or a
    // wss:// path behind your reverse proxy).
    const base = process.env.NEXT_PUBLIC_TERMINAL_WS_URL
      || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3005`
    const ws = new WebSocket(
      `${base}?token=${sessionData.terminalToken}&sessionId=${sessionData.id}&containerId=${sessionData.attackContainerId || ""}`
    )
    
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      term.focus()

      // Send initial resize
      ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "data") {
          term.write(msg.data)
        } else if (msg.type === "error") {
          term.write(`\r\n\x1b[31m[Error] ${msg.message}\x1b[0m\r\n`)
        }
      } catch {
        // Raw data
        term.write(event.data)
      }
    }

    ws.onerror = () => {
      setError("WebSocket connection failed. Terminal gateway may be offline.")
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
      term.write("\r\n\x1b[33m[Disconnected from lab terminal]\x1b[0m\r\n")
    }

    // Handle terminal input → send to WebSocket
    term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }))
      }
    })

    // Handle terminal resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
      }
    })
    resizeObserver.observe(termRef.current)

    return () => {
      resizeObserver.disconnect()
      ws.close()
      term.dispose()
    }
  }, [sessionData?.terminalToken, sessionData?.id, loaded])

  return (
    <div className="flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border rounded-t-lg">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/70" />
          <div className="h-3 w-3 rounded-full bg-amber-500/70" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-2">
          root@kali: ~/{labSlug}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {connected ? (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> CONNECTED
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> CONNECTING...
            </span>
          )}
          {sessionData?.targetIp && (
            <span className="text-[10px] font-mono text-cyan-400">
              Target: {sessionData.targetIp}
            </span>
          )}
          <button
            onClick={onExit}
            className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors px-2 py-0.5 rounded hover:bg-red-500/10"
          >
            Exit Lab
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div className="relative flex-1 bg-[#0a0f0d] rounded-b-lg overflow-hidden">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0f0d]/90">
            <div className="text-center p-6">
              <div className="text-red-400 text-sm font-mono mb-2">⚠ Terminal Connection Error</div>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <p className="text-[10px] text-muted-foreground/60">
                The terminal gateway service may not be running. Start it with:<br />
                <code className="text-emerald-400">cd mini-services/terminal-gateway && bun run dev</code>
              </p>
            </div>
          </div>
        )}
        <div ref={termRef} className="h-full p-2" style={{ minHeight: 400 }} />
      </div>
    </div>
  )
}
