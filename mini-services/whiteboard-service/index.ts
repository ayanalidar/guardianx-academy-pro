// GuardianX Collaborative Whiteboard Service
// Real-time drawing relay for live sessions (instructor draws, students view).
// Runs on port 3006. Frontend connects via io("/?XTransformPort=3006").

import { createServer } from "http"
import { Server, Socket } from "socket.io"

interface Stroke {
  // stroke payload broadcast to other clients
  type: "stroke" | "point" | "erase" | "clear"
  x?: number
  y?: number
  color?: string
  size?: number
  strokeId?: string
  authorId?: string
}

interface BoardRoom {
  // store recent strokes for new-joiner sync
  strokes: Stroke[]
  authors: Set<string>
  lastClearedAt: number
}

const rooms = new Map<string, BoardRoom>()

function getRoom(roomId: string): BoardRoom {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { strokes: [], authors: new Set(), lastClearedAt: Date.now() })
  }
  return rooms.get(roomId)!
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", port: 3006 }))
    return
  }
  res.writeHead(404)
  res.end("Not found")
})
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on("connection", (socket: Socket) => {
  console.log(`[whiteboard] connected: ${socket.id}`)
  let currentRoom: string | null = null
  let currentUser: { userId: string; userName: string; role: string } | null = null

  socket.on("join-board", (data: { roomId: string; userId: string; userName: string; role: string }) => {
    const { roomId, userId, userName, role } = data
    // leave previous room
    if (currentRoom) {
      socket.leave(currentRoom)
      const prevRoom = getRoom(currentRoom)
      prevRoom.authors.delete(userId)
    }
    currentRoom = roomId
    currentUser = { userId, userName, role }
    socket.join(roomId)
    const room = getRoom(roomId)
    room.authors.add(userId)

    // sync current board state to the new joiner
    socket.emit("board-state", {
      strokes: room.strokes,
      lastClearedAt: room.lastClearedAt,
      authors: Array.from(room.authors),
    })

    // notify others that someone joined (for cursor/author list)
    socket.to(roomId).emit("board-joined", { userId, userName, role })
    console.log(`[whiteboard] ${userName} (${role}) joined ${roomId}. ${room.authors.size} authors.`)
  })

  // begin a new stroke (instructor creates a fresh stroke)
  socket.on("stroke-start", (data: { strokeId: string; color: string; size: number; x: number; y: number }) => {
    if (!currentRoom || !currentUser) return
    const room = getRoom(currentRoom)
    const stroke: Stroke = {
      type: "stroke",
      strokeId: data.strokeId,
      color: data.color,
      size: data.size,
      x: data.x,
      y: data.y,
      authorId: currentUser.userId,
    }
    room.strokes.push(stroke)
    // cap memory: keep most-recent 5000 strokes
    if (room.strokes.length > 5000) room.strokes.splice(0, room.strokes.length - 5000)
    socket.to(currentRoom).emit("stroke-start", { ...data, authorId: currentUser.userId })
  })

  // continue an existing stroke (a point added)
  socket.on("stroke-point", (data: { strokeId: string; x: number; y: number }) => {
    if (!currentRoom || !currentUser) return
    const room = getRoom(currentRoom)
    const stroke: Stroke = {
      type: "point",
      strokeId: data.strokeId,
      x: data.x,
      y: data.y,
      authorId: currentUser.userId,
    }
    room.strokes.push(stroke)
    if (room.strokes.length > 5000) room.strokes.splice(0, room.strokes.length - 5000)
    socket.to(currentRoom).emit("stroke-point", { ...data, authorId: currentUser.userId })
  })

  // eraser: same as a stroke but with destination-out blend on canvas — we just relay with a flag
  socket.on("erase", (data: { strokeId: string; size: number; x: number; y: number }) => {
    if (!currentRoom || !currentUser) return
    const room = getRoom(currentRoom)
    const stroke: Stroke = {
      type: "erase",
      strokeId: data.strokeId,
      size: data.size,
      x: data.x,
      y: data.y,
      authorId: currentUser.userId,
    }
    room.strokes.push(stroke)
    if (room.strokes.length > 5000) room.strokes.splice(0, room.strokes.length - 5000)
    socket.to(currentRoom).emit("erase", { ...data, authorId: currentUser.userId })
  })

  // clear the whole board (instructor only — but enforce on client as well)
  socket.on("clear", () => {
    if (!currentRoom || !currentUser) return
    if (currentUser.role !== "host" && currentUser.role !== "INSTRUCTOR" && currentUser.role !== "ADMIN") {
      return // only hosts/instructors can clear
    }
    const room = getRoom(currentRoom)
    room.strokes = []
    room.lastClearedAt = Date.now()
    io.to(currentRoom).emit("clear", { byUserId: currentUser.userId, ts: room.lastClearedAt })
    console.log(`[whiteboard] board cleared by ${currentUser.userName} in ${currentRoom}`)
  })

  // cursor position (optional, for showing other participants' cursors)
  socket.on("cursor", (data: { x: number; y: number }) => {
    if (!currentRoom || !currentUser) return
    socket.to(currentRoom).emit("cursor", { userId: currentUser.userId, userName: currentUser.userName, x: data.x, y: data.y })
  })

  socket.on("leave-board", () => {
    cleanup()
  })

  socket.on("disconnect", () => {
    cleanup()
    console.log(`[whiteboard] disconnected: ${socket.id}`)
  })

  function cleanup() {
    if (!currentRoom || !currentUser) return
    const room = getRoom(currentRoom)
    room.authors.delete(currentUser.userId)
    socket.to(currentRoom).emit("board-left", { userId: currentUser.userId })
    if (room.authors.size === 0) {
      // free memory when room empties
      rooms.delete(currentRoom)
    }
    currentRoom = null
    currentUser = null
  }
})

const PORT = 3006
httpServer.listen(PORT, () => {
  console.log(`GuardianX Whiteboard service running on port ${PORT}`)
})

process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)) })
process.on("SIGINT", () => { httpServer.close(() => process.exit(0)) })
