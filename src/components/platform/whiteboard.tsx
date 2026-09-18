"use client"

import * as React from "react"
import { io, Socket } from "socket.io-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Pen, Eraser, Trash2, Users, ShieldCheck, Lock, Pencil, PenLine, Brush, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const PEN_COLORS = [
  { id: "emerald", hex: "#10b981" },
  { id: "cyan", hex: "#06b6d4" },
  { id: "amber", hex: "#f59e0b" },
  { id: "rose", hex: "#f43f5e" },
  { id: "violet", hex: "#8b5cf6" },
]

const PEN_SIZES = [
  { id: "sm", label: "S", value: 2, icon: Pen },
  { id: "md", label: "M", value: 5, icon: PenLine },
  { id: "lg", label: "L", value: 12, icon: Brush },
]

interface WhiteboardProps {
  roomId: string
  userId: string
  userName: string
  role: "host" | "viewer" | "INSTRUCTOR" | "ADMIN" | "STUDENT"
  className?: string
  height?: number
}

export function Whiteboard({
  roomId, userId, userName, role, className, height = 480,
}: WhiteboardProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const socketRef = React.useRef<Socket | null>(null)
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null)

  const isHost = role === "host" || role === "INSTRUCTOR" || role === "ADMIN"

  const [connected, setConnected] = React.useState(false)
  const [color, setColor] = React.useState(PEN_COLORS[0].hex)
  const [size, setSize] = React.useState(PEN_SIZES[1].value)
  const [tool, setTool] = React.useState<"pen" | "eraser">("pen")
  const [participantCount, setParticipantCount] = React.useState(1)

  // drawing state
  const drawingRef = React.useRef(false)
  const currentStrokeIdRef = React.useRef<string | null>(null)
  const lastPointRef = React.useRef<{ x: number; y: number } | null>(null)

  // initialize canvas context
  const initCtx = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctxRef.current = ctx
  }, [])

  // draw a line segment between two points
  const drawSegment = React.useCallback((from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number, erase: boolean) => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over"
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }, [])

  // replay a stroke list (used for board-state sync)
  const replayStrokes = React.useCallback((strokes: any[]) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const canvas = canvasRef.current
    if (!canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // group consecutive points by strokeId
    const grouped = new Map<string, { color: string; size: number; points: { x: number; y: number }[]; erase: boolean }>()
    for (const s of strokes) {
      if (s.type === "clear") {
        // clear accumulated strokes up to this point
        grouped.clear()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        continue
      }
      const id = s.strokeId
      if (!id) continue
      if (!grouped.has(id)) {
        grouped.set(id, {
          color: s.color || "#10b981",
          size: s.size || 5,
          points: [],
          erase: s.type === "erase",
        })
      }
      const g = grouped.get(id)!
      if (s.x !== undefined && s.y !== undefined) g.points.push({ x: s.x, y: s.y })
    }
    for (const g of grouped.values()) {
      for (let i = 1; i < g.points.length; i++) {
        drawSegment(g.points[i - 1], g.points[i], g.color, g.size, g.erase)
      }
      if (g.points.length === 1) {
        // single-point stroke - draw a dot
        const p = g.points[0]
        const ctx2 = ctx
        ctx2.globalCompositeOperation = g.erase ? "destination-out" : "source-over"
        ctx2.fillStyle = g.color
        ctx2.beginPath()
        ctx2.arc(p.x, p.y, g.size / 2, 0, Math.PI * 2)
        ctx2.fill()
      }
    }
  }, [drawSegment])

  // connect socket
  React.useEffect(() => {
    // Whiteboard service URL — configurable (XTransformPort proxy was removed)
    const WHITEBOARD_URL = process.env.NEXT_PUBLIC_WHITEBOARD_URL || "http://localhost:3006"
    const socket = io(WHITEBOARD_URL, { transports: ["websocket", "polling"] })
    socketRef.current = socket

    socket.on("connect", () => {
      setConnected(true)
      socket.emit("join-board", { roomId, userId, userName, role })
    })
    socket.on("disconnect", () => setConnected(false))

    socket.on("board-state", (data: { strokes: any[]; lastClearedAt: number; authors: string[] }) => {
      setParticipantCount(data.authors?.length || 1)
      // wait for canvas to be ready
      requestAnimationFrame(() => {
        initCtx()
        replayStrokes(data.strokes || [])
      })
    })

    socket.on("board-joined", () => {
      setParticipantCount((c) => c + 1)
    })
    socket.on("board-left", () => {
      setParticipantCount((c) => Math.max(1, c - 1))
    })

    socket.on("stroke-start", (data: { strokeId: string; color: string; size: number; x: number; y: number; authorId: string }) => {
      if (data.authorId === userId) return // skip own
      lastPointRef.current = { x: data.x, y: data.y }
      // draw a starting dot
      const ctx = ctxRef.current
      if (!ctx) return
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = data.color
      ctx.beginPath()
      ctx.arc(data.x, data.y, data.size / 2, 0, Math.PI * 2)
      ctx.fill()
    })

    socket.on("stroke-point", (data: { strokeId: string; x: number; y: number; authorId: string }) => {
      if (data.authorId === userId) return
      const last = lastPointRef.current
      if (!last) {
        lastPointRef.current = { x: data.x, y: data.y }
        return
      }
      // need color/size - we use a small default if we don't know it
      drawSegment(last, { x: data.x, y: data.y }, "#10b981", 5, false)
      lastPointRef.current = { x: data.x, y: data.y }
    })

    socket.on("erase", (data: { strokeId: string; size: number; x: number; y: number; authorId: string }) => {
      if (data.authorId === userId) return
      const ctx = ctxRef.current
      if (!ctx) return
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0,0,0,1)"
      ctx.beginPath()
      ctx.arc(data.x, data.y, data.size / 2, 0, Math.PI * 2)
      ctx.fill()
      lastPointRef.current = { x: data.x, y: data.y }
    })

    socket.on("clear", () => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      toast.info("Board cleared by instructor")
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, userId, userName, role])

  // resize handler
  React.useEffect(() => {
    const handleResize = () => {
      // Save current canvas content as image data, then re-init and redraw
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      const oldData = canvas.toDataURL()
      initCtx()
      const img = new Image()
      img.onload = () => {
        const rect = canvas.getBoundingClientRect()
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = oldData
    }
    window.addEventListener("resize", handleResize)
    // initial setup
    setTimeout(() => initCtx(), 50)
    return () => window.removeEventListener("resize", handleResize)
  }, [initCtx])

  // pointer handlers
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isHost || !connected) return
    e.preventDefault()
    const pos = getPos(e)
    drawingRef.current = true
    currentStrokeIdRef.current = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    lastPointRef.current = pos
    const erase = tool === "eraser"
    const socket = socketRef.current
    if (socket) {
      if (erase) {
        socket.emit("erase", { strokeId: currentStrokeIdRef.current, size: size * 2, x: pos.x, y: pos.y })
      } else {
        socket.emit("stroke-start", { strokeId: currentStrokeIdRef.current, color, size, x: pos.x, y: pos.y })
      }
    }
    // draw a starting dot locally
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over"
    if (!erase) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = "rgba(0,0,0,1)"
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isHost || !drawingRef.current || !connected) return
    e.preventDefault()
    const pos = getPos(e)
    const last = lastPointRef.current
    if (!last) {
      lastPointRef.current = pos
      return
    }
    const erase = tool === "eraser"
    drawSegment(last, pos, color, erase ? size * 2 : size, erase)
    const socket = socketRef.current
    if (socket) {
      if (erase) {
        socket.emit("erase", { strokeId: currentStrokeIdRef.current, size: size * 2, x: pos.x, y: pos.y })
      } else {
        socket.emit("stroke-point", { strokeId: currentStrokeIdRef.current, x: pos.x, y: pos.y })
      }
    }
    lastPointRef.current = pos
  }

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isHost) return
    e.preventDefault()
    drawingRef.current = false
    currentStrokeIdRef.current = null
    lastPointRef.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  const clearBoard = () => {
    if (!isHost) return
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    socketRef.current?.emit("clear")
    toast.success("Board cleared")
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/30 p-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">Tool</span>
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!isHost}
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!isHost}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">Color</span>
          {PEN_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setColor(c.hex); setTool("pen") }}
              disabled={!isHost}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                color === c.hex && tool === "pen" ? "border-foreground scale-110" : "border-transparent",
                isHost ? "hover:scale-110 cursor-pointer" : "opacity-50 cursor-not-allowed"
              )}
              style={{ backgroundColor: c.hex }}
              title={c.id}
              aria-label={`Pen color ${c.id}`}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Sizes */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">Size</span>
          {PEN_SIZES.map((s) => (
            <Button
              key={s.id}
              variant={size === s.value ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              disabled={!isHost}
              onClick={() => setSize(s.value)}
              title={`Size ${s.label}`}
            >
              <s.icon className={cn("h-3.5 w-3.5", s.id === "lg" && "h-4 w-4")} />
            </Button>
          ))}
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
          disabled={!isHost}
          onClick={clearBoard}
          title="Clear board"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {!isHost && (
            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Lock className="h-2.5 w-2.5 mr-1" /> View Only
            </Badge>
          )}
          {isHost && (
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Instructor
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            <Users className="h-2.5 w-2.5 mr-1" /> {participantCount}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px]", connected ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground")}>
            {connected ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-1 pulse-dot" /> : <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
            {connected ? "Synced" : "Connecting"}
          </Badge>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative bg-background" style={{ height }}>
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 w-full h-full touch-none",
            isHost && connected ? "cursor-crosshair" : "cursor-default"
          )}
          style={{ background: "var(--background)" }}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onPointerLeave={endDraw}
        />
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <p className="text-xs text-muted-foreground font-mono">Connecting to whiteboard...</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
