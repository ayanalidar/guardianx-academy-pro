// GuardianX Live Signaling Server
// WebRTC signaling relay for screen-sharing + two-way voice sessions.
import { createServer } from "http"
import { Server, Socket } from "socket.io"

interface RoomMember {
  socketId: string
  userId: string
  userName: string
  role: "host" | "viewer"
  micOn: boolean
  camOn: boolean
  isPresenting: boolean
  joinedAt: number
}

const rooms = new Map<string, Map<string, RoomMember>>() // roomId -> socketId -> member

function getRoom(roomId: string) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map())
  return rooms.get(roomId)!
}

function broadcastRoomState(io: Server, roomId: string) {
  const members = Array.from(getRoom(roomId).values()).map((m) => ({
    userId: m.userId,
    userName: m.userName,
    role: m.role,
    micOn: m.micOn,
    camOn: m.camOn,
    isPresenting: m.isPresenting,
  }))
  io.to(roomId).emit("room-state", { members })
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", port: 3003 }))
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
  console.log(`[signaling] connected: ${socket.id}`)
  let currentRoom: string | null = null
  let currentUser: { userId: string; userName: string } | null = null

  socket.on("join-room", (data: { roomId: string; userId: string; userName: string; role: "host" | "viewer" }) => {
    const { roomId, userId, userName, role } = data
    // leave previous room
    if (currentRoom) {
      getRoom(currentRoom).delete(socket.id)
      io.to(currentRoom).emit("user-left", { userId: currentUser?.userId, socketId: socket.id })
      broadcastRoomState(io, currentRoom)
    }
    currentRoom = roomId
    currentUser = { userId, userName }
    socket.join(roomId)
    const member: RoomMember = {
      socketId: socket.id,
      userId,
      userName,
      role,
      micOn: false,
      camOn: false,
      isPresenting: role === "host",
      joinedAt: Date.now(),
    }
    getRoom(roomId).set(socket.id, member)

    // tell others
    socket.to(roomId).emit("user-joined", {
      userId,
      userName,
      role,
      socketId: socket.id,
    })
    // tell the joiner who's already here
    const existing = Array.from(getRoom(roomId).values())
      .filter((m) => m.socketId !== socket.id)
      .map((m) => ({ socketId: m.socketId, userId: m.userId, userName: m.userName, role: m.role, isPresenting: m.isPresenting }))
    socket.emit("existing-peers", { peers: existing })
    broadcastRoomState(io, roomId)
    console.log(`[signaling] ${userName} joined room ${roomId} (${role}). ${getRoom(roomId).size} members.`)
  })

  // WebRTC signaling relay
  socket.on("signal", (data: { to: string; type: string; sdp?: string; candidate?: any }) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      type: data.type,
      sdp: data.sdp,
      candidate: data.candidate,
    })
  })

  // media state updates
  socket.on("media-state", (data: { micOn?: boolean; camOn?: boolean; isPresenting?: boolean }) => {
    if (!currentRoom) return
    const member = getRoom(currentRoom).get(socket.id)
    if (!member) return
    if (data.micOn !== undefined) member.micOn = data.micOn
    if (data.camOn !== undefined) member.camOn = data.camOn
    if (data.isPresenting !== undefined) member.isPresenting = data.isPresenting
    io.to(currentRoom).emit("media-state", {
      socketId: socket.id,
      userId: member.userId,
      micOn: member.micOn,
      camOn: member.camOn,
      isPresenting: member.isPresenting,
    })
    broadcastRoomState(io, currentRoom)
  })

  // chat
  socket.on("chat", (data: { message: string }) => {
    if (!currentRoom || !currentUser) return
    io.to(currentRoom).emit("chat", {
      userId: currentUser.userId,
      userName: currentUser.userName,
      message: data.message,
      timestamp: Date.now(),
    })
  })

  // hand-raise / request to present
  socket.on("request-present", () => {
    if (!currentRoom) return
    const host = Array.from(getRoom(currentRoom).values()).find((m) => m.role === "host")
    if (host) {
      io.to(host.socketId).emit("present-request", { from: socket.id, userId: currentUser?.userId, userName: currentUser?.userName })
    }
  })

  socket.on("grant-present", (data: { to: string }) => {
    if (!currentRoom) return
    // clear all presenters first
    for (const m of getRoom(currentRoom).values()) m.isPresenting = false
    const target = getRoom(currentRoom).get(data.to)
    if (target) target.isPresenting = true
    io.to(currentRoom).emit("presenter-changed", { socketId: data.to, userId: target?.userId, userName: target?.userName })
    broadcastRoomState(io, currentRoom)
  })

  socket.on("leave-room", () => {
    cleanup()
  })

  socket.on("disconnect", () => {
    cleanup()
    console.log(`[signaling] disconnected: ${socket.id}`)
  })

  function cleanup() {
    if (!currentRoom) return
    getRoom(currentRoom).delete(socket.id)
    io.to(currentRoom).emit("user-left", { userId: currentUser?.userId, socketId: socket.id })
    broadcastRoomState(io, currentRoom)
    if (getRoom(currentRoom).size === 0) rooms.delete(currentRoom)
    currentRoom = null
    currentUser = null
  }
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`GuardianX Live Signaling server running on port ${PORT}`)
})

process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)) })
process.on("SIGINT", () => { httpServer.close(() => process.exit(0)) })
