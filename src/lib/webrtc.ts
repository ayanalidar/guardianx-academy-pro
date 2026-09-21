"use client"

import { io, Socket } from "socket.io-client"

// WebRTC manager for GuardianX live sessions.
// Architecture:
//  - One presenter shares screen (+ optional mic). All viewers receive the presenter's stream.
//  - Voice: mesh among participants who enable their mic (each connects to other mic-on peers).
// Signaling goes through the socket.io server with XTransformPort=3003.

export interface PeerMeta {
  socketId: string
  userId: string
  userName: string
  role: string
  micOn: boolean
  camOn: boolean
  isPresenting: boolean
}

export class WebRTCSession {
  socket: Socket | null = null
  roomId: string
  userId: string
  userName: string
  role: "host" | "viewer"
  // peer connections: socketId -> RTCPeerConnection
  peers = new Map<string, RTCPeerConnection>()
  // remote streams: socketId -> MediaStream
  remoteStreams = new Map<string, MediaStream>()
  // local screen stream (presenter)
  screenStream: MediaStream | null = null
  // local mic stream
  micStream: MediaStream | null = null
  micOn = false
  isPresenting = false

  onPeersChange?: (peers: PeerMeta[]) => void
  onRemoteStream?: (socketId: string, stream: MediaStream, kind: "screen" | "voice") => void
  onStreamRemoved?: (socketId: string) => void
  onChat?: (msg: { userId: string; userName: string; message: string; timestamp: number }) => void
  onPresenterChange?: (socketId: string | null, userName?: string) => void
  onPresentRequest?: (from: { socketId: string; userId: string; userName: string }) => void

  private iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]

  constructor(roomId: string, userId: string, userName: string, role: "host" | "viewer") {
    this.roomId = roomId
    this.userId = userId
    this.userName = userName
    this.role = role
    this.isPresenting = role === "host"
  }

  async connect() {
    // Signaling server URL - configurable so deployments can point at a
    // dedicated host (the old /?XTransformPort= proxy path was removed from
    // Caddy as an SSRF risk). Falls back to the local dev default.
    const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3003"
    this.socket = io(SIGNALING_URL, { transports: ["websocket"], path: "/" })
    this.socket.on("connect", () => {
      this.socket?.emit("join-room", { roomId: this.roomId, userId: this.userId, userName: this.userName, role: this.role })
    })
    this.socket.on("existing-peers", (data: { peers: any[] }) => {
      // For each existing peer, we initiate a connection (we are the newcomer)
      for (const p of data.peers) {
        this.createPeer(p.socketId, p.userId, p.userName, p.role, /*initiator=*/ true)
      }
    })
    this.socket.on("user-joined", (data: { socketId: string; userId: string; userName: string; role: string }) => {
      // The newcomer doesn't initiate; we wait for their offer. But to avoid glare,
      // only the peer with the smaller socketId initiates. Here we let the newcomer initiate (handled by existing-peers).
      // So existing peers just prepare to receive.
      this.createPeer(data.socketId, data.userId, data.userName, data.role, /*initiator=*/ false)
    })
    this.socket.on("signal", async (data: { from: string; type: string; sdp?: string; candidate?: any }) => {
      let pc = this.peers.get(data.from)
      if (!pc) {
        pc = this.createPeer(data.from, "", "", "viewer", false)
      }
      try {
        if (data.type === "offer" && data.sdp) {
          await pc.setRemoteDescription({ type: "offer", sdp: data.sdp })
          // If we're the presenter, add our screen stream to the answer
          if (this.isPresenting && this.screenStream) {
            this.screenStream.getTracks().forEach((t) => pc!.addTrack(t, this.screenStream!))
          }
          if (this.micOn && this.micStream) {
            this.micStream.getAudioTracks().forEach((t) => pc!.addTrack(t, this.micStream!))
          }
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          this.socket?.emit("signal", { to: data.from, type: "answer", sdp: answer.sdp })
        } else if (data.type === "answer" && data.sdp) {
          await pc.setRemoteDescription({ type: "answer", sdp: data.sdp })
        } else if (data.type === "ice" && data.candidate) {
          await pc.addIceCandidate(data.candidate)
        }
      } catch (e) {
        console.error("[webrtc] signal error", e)
      }
    })
    this.socket.on("user-left", (data: { socketId: string }) => {
      this.removePeer(data.socketId)
    })
    this.socket.on("room-state", (data: { members: PeerMeta[] }) => {
      this.onPeersChange?.(data.members)
    })
    this.socket.on("media-state", (data: any) => {
      // handled via room-state refresh
    })
    this.socket.on("chat", (msg: any) => {
      this.onChat?.(msg)
    })
    this.socket.on("presenter-changed", (data: { socketId: string; userId: string; userName: string }) => {
      // update presenting state
      if (data.socketId === this.socket?.id) {
        this.isPresenting = true
      } else {
        this.isPresenting = false
      }
      this.onPresenterChange?.(data.socketId, data.userName)
    })
    this.socket.on("present-request", (data: any) => {
      this.onPresentRequest?.(data)
    })
  }

  private createPeer(socketId: string, userId: string, userName: string, role: string, initiator: boolean): RTCPeerConnection {
    if (this.peers.has(socketId)) return this.peers.get(socketId)!
    const pc = new RTCPeerConnection({ iceServers: this.iceServers })
    this.peers.set(socketId, pc)

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket?.emit("signal", { to: socketId, type: "ice", candidate: e.candidate })
      }
    }
    pc.ontrack = (e) => {
      let stream = this.remoteStreams.get(socketId)
      if (!stream) {
        stream = new MediaStream()
        this.remoteStreams.set(socketId, stream)
      }
      stream.addTrack(e.track)
      const kind = e.track.kind === "video" ? "screen" : "voice"
      this.onRemoteStream?.(socketId, stream, kind)
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.removePeer(socketId)
      }
    }

    if (initiator) {
      // Add local tracks if we have them
      if (this.isPresenting && this.screenStream) {
        const s1 = this.screenStream
        s1.getTracks().forEach((t) => pc.addTrack(t, s1))
      }
      if (this.micOn && this.micStream) {
        const s2 = this.micStream
        s2.getAudioTracks().forEach((t) => pc.addTrack(t, s2))
      }
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          this.socket?.emit("signal", { to: socketId, type: "offer", sdp: offer.sdp })
        } catch (e) {
          console.error("[webrtc] offer error", e)
        }
      }
    }
    return pc
  }

  private removePeer(socketId: string) {
    const pc = this.peers.get(socketId)
    if (pc) {
      pc.close()
      this.peers.delete(socketId)
    }
    this.remoteStreams.delete(socketId)
    this.onStreamRemoved?.(socketId)
  }

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      this.isPresenting = true
      this.socket?.emit("media-state", { isPresenting: true })
      // add tracks to all existing peers (renegotiate)
      for (const [sid, pc] of this.peers) {
        this.screenStream.getTracks().forEach((t) => pc.addTrack(t, this.screenStream!))
      }
      // when user stops sharing via browser UI
      this.screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare()
      }
      return true
    } catch (e) {
      console.error("[webrtc] screen share error", e)
      return false
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop())
      this.screenStream = null
    }
    this.isPresenting = false
    this.socket?.emit("media-state", { isPresenting: false })
    // recreate peers without screen tracks
    this.renegotiateAll()
  }

  async toggleMic(on: boolean) {
    if (on) {
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      this.micStream.getAudioTracks().forEach((t) => (t.enabled = true))
      this.micOn = true
    } else {
      if (this.micStream) {
        this.micStream.getAudioTracks().forEach((t) => (t.enabled = false))
      }
      this.micOn = false
    }
    this.socket?.emit("media-state", { micOn: this.micOn })
    // add mic track to peers if newly on
    if (on) {
      for (const [, pc] of this.peers) {
        const senders = pc.getSenders()
        const hasAudio = senders.some((s) => s.track?.kind === "audio")
        if (!hasAudio && this.micStream) {
          this.micStream.getAudioTracks().forEach((t) => pc.addTrack(t, this.micStream!))
        }
      }
      this.renegotiateAll()
    }
  }

  private async renegotiateAll() {
    for (const [sid, pc] of this.peers) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        await pc.setLocalDescription(offer)
        this.socket?.emit("signal", { to: sid, type: "offer", sdp: offer.sdp })
      } catch (e) {
        console.error("[webrtc] renegotiate error", e)
      }
    }
  }

  requestPresent() {
    this.socket?.emit("request-present")
  }

  grantPresent(socketId: string) {
    // stop our own screen share first if presenting
    if (this.isPresenting) this.stopScreenShare()
    this.socket?.emit("grant-present", { to: socketId })
  }

  sendChat(message: string) {
    this.socket?.emit("chat", { message })
  }

  disconnect() {
    this.socket?.emit("leave-room")
    for (const [, pc] of this.peers) pc.close()
    this.peers.clear()
    this.remoteStreams.clear()
    if (this.screenStream) this.screenStream.getTracks().forEach((t) => t.stop())
    if (this.micStream) this.micStream.getAudioTracks().forEach((t) => t.stop())
    this.socket?.disconnect()
    this.socket = null
  }
}
