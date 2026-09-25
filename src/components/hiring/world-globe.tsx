"use client"

/**
 * WorldGlobe - rotating dotted world globe rendered on a plain 2D canvas
 * (no WebGL / three.js dependency). Land dots come from a compact RLE
 * landmask (96x48 equirect grid, generated from public-domain GeoJSON).
 * Pulsing emerald markers mark live hiring locations passed via
 * `locations` (strings like "Dubai, UAE" - the country part is matched).
 *
 * Balanced motion: slow rotation (~30fps steps), pauses on hover and
 * fully respects prefers-reduced-motion (static globe, markers still
 * pulse gently via time-based draw).
 */

import * as React from "react"

const MASK_W = 96
const MASK_H = 48
const LANDMASK =
  "z0z0q0.z0z0q0.m07110e1g021b011m0.g0115011103120e19011m021j0.f0311011105110115091k01160b11011e0.4071104110511011101120214071c0417011101110s1.2110m13021404140217031102120z121.40j140216021c04110z121103110.601150b14041k01130v1401150.d0d11061e011201110x1501150.e0i1f0z131b0.f0g1g0z131b0.f0e1h03120111021402110m1102190.f0d1h03120111021106110k13011a0.g0c1i011103170m120111011b0.h091j071102120n1g0.i0414011i0g110i1g0.j031m0d1105130e1g0.k02120112011g0e1105130412031k0.l031k0e11031602130413011f0.p011i0f190115031j0.s041c0h1702190111011e0.r071b03110c1i011g0.r081g091e0212011h0.q0a1e091g01110214011c0.q0d1c071r02190.r0c1c081s01180.s0a1d081o011c0.t091d0712011k041101190.t081f0513011i09180.t061h0513011h0b170.t061h051l0b170.t051j031n031106170.t041z0h031601110.s031z0s01110.t021z0r01120.s021z0v0.s021z0v0.t011z0v0.z0z0q0.z0z0q0.z0z0q0.u011q011108120l160.k02120114031c0z1e130.80j1d0z1h140.90k12011202140z1g150.11101150z1z1h110.z0z0q0"

const LAND: Uint8Array = (() => {
  const out = new Uint8Array(MASK_W * MASK_H)
  const rows = LANDMASK.split(".")
  for (let r = 0; r < MASK_H && r < rows.length; r++) {
    let col = 0
    for (let k = 0; k + 1 < rows[r].length; k += 2) {
      const run = parseInt(rows[r][k], 36)
      const bit = rows[r][k + 1] === "1" ? 1 : 0
      for (let n = 0; n < run && col < MASK_W; n++, col++) out[r * MASK_W + col] = bit
    }
  }
  return out
})()

function isLand(lat: number, lon: number): boolean {
  const col = Math.min(MASK_W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * MASK_W)))
  const row = Math.min(MASK_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_H)))
  return LAND[row * MASK_W + col] === 1
}

/** Country/region name (lowercased) -> [lat, lon]. Cities resolve first
 *  ("Mumbai, India" -> Mumbai pin) since the location tail is tried first. */
const COUNTRY_COORDS: Record<string, [number, number]> = {
  // major cities
  "delhi": [28.6, 77.2], "new delhi": [28.6, 77.2], "mumbai": [19.1, 72.9],
  "bangalore": [13.0, 77.6], "bengaluru": [13.0, 77.6], "hyderabad": [17.4, 78.5],
  "chennai": [13.1, 80.3], "pune": [18.5, 73.9], "kolkata": [22.6, 88.4],
  "gurugram": [28.5, 77.1], "gurgaon": [28.5, 77.1], "noida": [28.5, 77.4],
  "abu dhabi": [24.5, 54.4], "sharjah": [25.3, 55.4],
  "london": [51.5, -0.13], "new york": [40.7, -74.0], "san francisco": [37.8, -122.4],
  "austin": [30.3, -97.7], "seattle": [47.6, -122.3], "boston": [42.4, -71.1], "chicago": [41.9, -87.6],
  "berlin": [52.5, 13.4], "paris": [48.9, 2.35], "amsterdam": [52.4, 4.9],
  "madrid": [40.4, -3.7], "lisbon": [38.7, -9.1], "warsaw": [52.2, 21.0],
  "dublin": [53.3, -6.3], "zurich": [47.4, 8.5],
  "sydney": [-33.9, 151.2], "melbourne": [-37.8, 145.0],
  "toronto": [43.7, -79.4], "vancouver": [49.3, -123.1],
  "tokyo": [35.7, 139.7], "seoul": [37.6, 127.0], "hong kong": [22.3, 114.2],
  "lagos": [6.5, 3.4], "nairobi": [-1.3, 36.8], "cairo": [30.0, 31.2],
  "cape town": [-33.9, 18.4], "johannesburg": [-26.2, 28.0],
  "sao paulo": [-23.6, -46.6], "mexico city": [19.4, -99.1], "buenos aires": [-34.6, -58.4],
  "tel aviv": [32.1, 34.8], "riyadh": [24.7, 46.7], "doha": [25.3, 51.5],
  "manama": [26.2, 50.6], "muscat": [23.6, 58.5], "amman": [31.9, 35.9], "istanbul": [41.0, 28.9],
  // countries / regions
  "uae": [24.5, 54.5], "united arab emirates": [24.5, 54.5], "dubai": [25.2, 55.3],
  "india": [21.5, 78.9], "usa": [39, -98], "united states": [39, -98],
  "uk": [54, -2], "united kingdom": [54, -2], "england": [52.5, -1.8],
  "germany": [51.1, 10.4], "singapore": [1.35, 103.8], "australia": [-25.3, 133.8],
  "canada": [56.1, -106.3], "nigeria": [9.1, 8.7], "brazil": [-10.8, -52.9],
  "japan": [36.2, 138.3], "netherlands": [52.2, 5.3], "ireland": [53.4, -8.2],
  "poland": [52.1, 19.4], "france": [46.6, 2.4], "spain": [40.2, -3.7],
  "portugal": [39.6, -8.2], "italy": [42.8, 12.6], "switzerland": [46.8, 8.2],
  "israel": [31.4, 35], "saudi arabia": [24, 45], "qatar": [25.3, 51.2],
  "kenya": [-0.5, 37.9], "south africa": [-29, 24.7], "egypt": [26.8, 30.8],
  "philippines": [12.9, 122.9], "indonesia": [-2.5, 118], "malaysia": [4.2, 102],
  "vietnam": [14.1, 108.3], "pakistan": [29.5, 68.5], "bangladesh": [23.7, 90.4],
  "mexico": [23.9, -102.5], "argentina": [-35.4, -65.2], "chile": [-33.5, -70.7],
  "colombia": [4.6, -74.1], "romania": [45.9, 25], "ukraine": [48.4, 31.2],
  "turkey": [39, 35.2], "greece": [39.1, 21.8], "sweden": [60.1, 18.6],
  "norway": [64.6, 11.5], "finland": [64.5, 26], "denmark": [56.1, 9.5],
  "new zealand": [-41.5, 172.8], "jordan": [31.3, 36.4], "kuwait": [29.3, 47.6],
  "bahrain": [26, 50.5], "oman": [21.5, 57], "ghana": [7.9, -1.2],
  "morocco": [31.8, -7.1], "tanzania": [-6.4, 34.9], "sri lanka": [7.9, 80.8],
}

interface Marker { lat: number; lon: number; label: string }

/** Resolve location strings ("Dubai, UAE") to markers, deduped. */
function resolveMarkers(locations: string[]): Marker[] {
  const out: Marker[] = []
  const seen = new Set<string>()
  for (const loc of locations) {
    const tail = (loc.split(",").pop() || loc).trim().toLowerCase()
    const candidates = [tail, tail.replace(/^remote\s*[- ]?\s*/i, "").trim(), loc.trim().toLowerCase()]
    let coord: [number, number] | undefined
    for (const c of candidates) {
      if (COUNTRY_COORDS[c]) { coord = COUNTRY_COORDS[c]; break }
    }
    if (!coord) continue
    const key = `${coord[0]}:${coord[1]}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ lat: coord[0], lon: coord[1], label: loc })
  }
  return out
}

export function WorldGlobe({ locations, className }: { locations: string[]; className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const reducedRef = React.useRef(false)
  const markerKey = locations.join("|")
  const markersRef = React.useRef<Marker[]>([])
  const hoverRef = React.useRef(false)

  React.useEffect(() => {
    markersRef.current = resolveMarkers(locations)
  }, [markerKey]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedRef.current = mq.matches
    const fn = (e: MediaQueryListEvent) => { reducedRef.current = e.matches }
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let rotation = 0
    let lastStep = 0
    const TILT = -0.42
    const tiltCos = Math.cos(TILT)
    const tiltSin = Math.sin(TILT)

    // Dot cloud: fibonacci sphere, land-filtered, pre-tilted.
    const dots: { x: number; y: number; z: number }[] = []
    const N = 3800
    const ga = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = ga * i
      const x = Math.cos(th) * r
      const z = Math.sin(th) * r
      const lat = (Math.asin(y) * 180) / Math.PI
      const lon = (Math.atan2(z, x) * 180) / Math.PI
      if (!isLand(lat, lon)) continue
      const y2 = y * tiltCos - z * tiltSin
      const z2 = y * tiltSin + z * tiltCos
      dots.push({ x, y: y2, z: z2 })
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = Math.max(1, Math.round(rect.width * dpr))
      canvas!.height = Math.max(1, Math.round(rect.height * dpr))
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas!)

    function project(latDeg: number, lonDeg: number, rot: number) {
      const latR = (latDeg * Math.PI) / 180
      const lonR = (lonDeg * Math.PI) / 180
      const x = Math.cos(latR) * Math.cos(lonR)
      const y = Math.sin(latR)
      const z = Math.cos(latR) * Math.sin(lonR)
      const y2 = y * tiltCos - z * tiltSin
      const z2 = y * tiltSin + z * tiltCos
      const xr = x * Math.cos(rot) - z2 * Math.sin(rot)
      const zr = x * Math.sin(rot) + z2 * Math.cos(rot)
      return { x: xr, y: y2, z: zr }
    }

    function draw(time: number) {
      const rect = canvas!.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      if (w < 4 || h < 4) return
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) / 2 - 8
      const cosR = Math.cos(rotation)
      const sinR = Math.sin(rotation)
      ctx!.clearRect(0, 0, w, h)

      // ocean sphere + rim
      const g = ctx!.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R)
      g.addColorStop(0, "rgba(139,92,246,0.13)")
      g.addColorStop(0.7, "rgba(88,28,135,0.05)")
      g.addColorStop(1, "rgba(15,17,21,0)")
      ctx!.fillStyle = g
      ctx!.beginPath()
      ctx!.arc(cx, cy, R, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.strokeStyle = "rgba(167,139,250,0.30)"
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.arc(cx, cy, R, 0, Math.PI * 2)
      ctx!.stroke()

      // land dots
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        const x = d.x * cosR - d.z * sinR
        const z = d.x * sinR + d.z * cosR
        const depth = (z + 1) / 2
        const alpha = z >= 0 ? 0.14 + depth * 0.62 : 0.05
        const size = 0.75 + depth * 0.85
        ctx!.fillStyle = `rgba(196,181,253,${alpha.toFixed(3)})`
        ctx!.beginPath()
        ctx!.arc(cx + x * R, cy - d.y * R, size, 0, Math.PI * 2)
        ctx!.fill()
      }

      // hiring-location markers: only front-facing, gentle pulse
      const t = time / 1000
      for (const m of markersRef.current) {
        const p = project(m.lat, m.lon, rotation)
        if (p.z < 0.03) continue
        const depth = (p.z + 1) / 2
        const px = cx + p.x * R
        const py = cy - p.y * R
        const pulse = (t % 1.8) / 1.8
        ctx!.strokeStyle = `rgba(52,211,153,${(0.65 * (1 - pulse) * (0.4 + depth * 0.6)).toFixed(3)})`
        ctx!.lineWidth = 1.2
        ctx!.beginPath()
        ctx!.arc(px, py, 3 + pulse * 9, 0, Math.PI * 2)
        ctx!.stroke()
        ctx!.fillStyle = `rgba(52,211,153,${(0.5 + depth * 0.5).toFixed(3)})`
        ctx!.beginPath()
        ctx!.arc(px, py, 2.1, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function loop(ts: number) {
      // ~30fps rotation steps; pause on hover / reduced motion.
      if (!reducedRef.current && !hoverRef.current && ts - lastStep > 33) {
        rotation += 0.0021
        lastStep = ts
      }
      draw(ts)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onEnter = () => { hoverRef.current = true }
    const onLeave = () => { hoverRef.current = false }
    canvas.addEventListener("mouseenter", onEnter)
    canvas.addEventListener("mouseleave", onLeave)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener("mouseenter", onEnter)
      canvas.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="h-full w-full" aria-label="Globe showing live hiring locations" role="img" />
    </div>
  )
}
